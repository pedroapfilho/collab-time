import { displayName } from "../display-name";
import { invitationExpiryFrom } from "../invitations";
import { CuidSchema, InvitationEmailSchema, normalizeEmail, UUIDSchema } from "../validation";

import type { InvitationDeps } from "./invitation-deps";
import {
  allowInvitationSend,
  checkInvitationRecipient,
  INVITATION_RATE_ERROR,
} from "./invitation-guards";
import type { ActionResult } from "./types";

export const createInvitationActions = (deps: InvitationDeps) => {
  const inviteMember = async (
    teamId: string,
    memberId: string,
    email: string,
  ): Promise<ActionResult<{ emailSent: boolean; invitationId: string }>> => {
    try {
      const session = await deps.requireAuth();
      if (!UUIDSchema.safeParse(teamId).success) {
        return { error: "Invalid team ID", success: false };
      }
      if (!UUIDSchema.safeParse(memberId).success) {
        return { error: "Invalid member ID", success: false };
      }
      await deps.requireTeamAdmin(teamId);
      const normalized = normalizeEmail(email);
      if (!InvitationEmailSchema.safeParse(normalized).success) {
        return { error: "Invalid email address", success: false };
      }
      const { existingMembership, team } = await deps.loadInviteContext(teamId, normalized);
      if (!team) {
        return { error: "Team not found", success: false };
      }
      const member = team.members.find((slot) => slot.id === memberId);
      if (!member) {
        return { error: "Member not found", success: false };
      }
      if (member.userId !== undefined && member.userId !== "") {
        return { error: "This member slot is already claimed", success: false };
      }
      if (existingMembership) {
        return { error: "This user is already a member of the team", success: false };
      }
      if (!(await allowInvitationSend(deps, session.user.id, teamId))) {
        return { error: INVITATION_RATE_ERROR, success: false };
      }
      const expiresAt = invitationExpiryFrom(deps.now());
      const invitation = await deps.upsertInvitation({
        email: normalized,
        expiresAt,
        invitedById: session.user.id,
        memberId,
        teamId,
      });
      const { sent } = await deps.sendEmail({
        expiresAt: expiresAt.toISOString(),
        inviterName: displayName(session.user.name, session.user.email),
        recipientEmail: normalized,
        teamId,
        teamName: team.name,
        teamUrl: deps.inviteLink(teamId, invitation.id),
        type: "invitation",
      });
      return { data: { emailSent: sent, invitationId: invitation.id }, success: true };
    } catch (error) {
      deps.reportError({ error, message: "Failed to invite member", route: "actions/invitation" });
      return { error: "Failed to send invitation", success: false };
    }
  };
  const decideInvitation = async (
    invitationId: string,
    decision: "accepted" | "declined",
  ): Promise<ActionResult<{ teamId: string }>> => {
    try {
      const session = await deps.requireAuth();
      if (!CuidSchema.safeParse(invitationId).success) {
        return { error: "Invalid invitation ID", success: false };
      }
      const invitation = await deps.findInvitation(invitationId);
      if (!invitation) {
        return { error: "Invitation not found", success: false };
      }
      const error = checkInvitationRecipient(invitation, session.user.email, deps.now());
      if (error !== null) {
        return { error, success: false };
      }
      if (decision === "accepted") {
        const result = await deps.claimOrCreateSlot(invitation.teamId, {
          memberId: invitation.memberId,
          name: displayName(session.user.name, session.user.email),
          userId: session.user.id,
        });
        if (!result.ok) {
          return { error: result.error, success: false };
        }
        await deps.commitAcceptance(invitation, result.memberId, session.user.id);
      } else {
        await deps.markDeclined(invitation);
      }
      deps.notifyInviter(invitation, session.user, decision);
      return { data: { teamId: invitation.teamId }, success: true };
    } catch (error) {
      deps.reportError({
        error,
        invitationId,
        message: "Failed to decide invitation",
        route: "actions/invitation",
      });
      return { error: "Could not update this invitation. Refresh and try again.", success: false };
    }
  };
  return {
    acceptInvitation: (id: string) => decideInvitation(id, "accepted"),
    declineInvitation: async (id: string): Promise<ActionResult<void>> => {
      const result = await decideInvitation(id, "declined");
      return result.success ? { data: undefined, success: true } : result;
    },
    inviteMember,
  };
};
