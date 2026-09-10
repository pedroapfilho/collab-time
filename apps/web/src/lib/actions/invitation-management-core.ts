import type { PendingTeamInvitation } from "@/types";

import { displayName } from "../display-name";
import { invitationExpiryFrom } from "../invitations";
import { CuidSchema, UUIDSchema } from "../validation";

import type { InvitationDeps } from "./invitation-deps";
import { allowInvitationSend, INVITATION_RATE_ERROR } from "./invitation-guards";
import type { ActionResult } from "./types";

export const createInvitationManagementActions = (deps: InvitationDeps) => {
  const getPendingTeamInvitations = async (
    teamId: string,
  ): Promise<ActionResult<Array<PendingTeamInvitation>>> => {
    try {
      if (!UUIDSchema.safeParse(teamId).success) {
        return { error: "Invalid team ID", success: false };
      }
      await deps.requireTeamAdmin(teamId);
      const invitations = await deps.listPendingForTeam(teamId);
      return {
        data: invitations.map(({ createdAt, email, expiresAt, id, memberId }) => ({
          createdAt: createdAt.toISOString(),
          email,
          expiresAt: expiresAt?.toISOString() ?? null,
          id,
          memberId,
        })),
        success: true,
      };
    } catch (error) {
      deps.reportError({
        error,
        message: "Failed to list invitations",
        route: "actions/invitation",
      });
      return { error: "Failed to get invitations", success: false };
    }
  };
  const manageInvitation = async (
    id: string,
    action: "resend" | "revoke",
  ): Promise<ActionResult<{ emailSent: boolean }>> => {
    try {
      const session = await deps.requireAuth();
      if (!CuidSchema.safeParse(id).success) {
        return { error: "Invalid invitation ID", success: false };
      }
      const invitation = await deps.findInvitation(id);
      if (!invitation) {
        return { error: "Invitation not found", success: false };
      }
      await deps.requireTeamAdmin(invitation.teamId);
      if (invitation.status !== "PENDING") {
        return { error: "This invitation is no longer pending", success: false };
      }
      if (action === "revoke") {
        await deps.markRevoked(invitation);
        return { data: { emailSent: false }, success: true };
      }
      const { team } = await deps.loadInviteContext(invitation.teamId, invitation.email);
      if (!team) {
        return { error: "Team not found", success: false };
      }
      if (!(await allowInvitationSend(deps, session.user.id, invitation.teamId))) {
        return { error: INVITATION_RATE_ERROR, success: false };
      }
      const expiresAt = invitationExpiryFrom(deps.now());
      await deps.refreshExpiry(invitation, expiresAt);
      const { sent } = await deps.sendEmail({
        expiresAt: expiresAt.toISOString(),
        inviterName: displayName(invitation.invitedBy.name, invitation.invitedBy.email),
        recipientEmail: invitation.email,
        teamId: invitation.teamId,
        teamName: team.name,
        teamUrl: deps.inviteLink(invitation.teamId, id),
        type: "invitation",
      });
      return { data: { emailSent: sent }, success: true };
    } catch (error) {
      deps.reportError({
        error,
        invitationId: id,
        message: "Failed to manage invitation",
        route: "actions/invitation",
      });
      return { error: "Could not update this invitation. Refresh and try again.", success: false };
    }
  };
  return {
    getPendingTeamInvitations,
    resendInvitation: (id: string) => manageInvitation(id, "resend"),
    revokeInvitation: async (id: string): Promise<ActionResult<void>> => {
      const result = await manageInvitation(id, "revoke");
      return result.success ? { data: undefined, success: true } : result;
    },
  };
};
