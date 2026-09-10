import { INVITATION_EXPIRED_ERROR, isInvitationExpired } from "../invitations";
import { INVITES_PER_TEAM_PER_DAY, INVITES_PER_USER_PER_HOUR } from "../limits";
import { normalizeEmail } from "../validation";

import type { InvitationDeps, InvitationRecord } from "./invitation-deps";

export const checkInvitationRecipient = (
  invitation: InvitationRecord,
  email: string,
  now: Date,
): string | null => {
  if (normalizeEmail(invitation.email) !== normalizeEmail(email)) {
    return "This invitation is not for you";
  }
  if (invitation.status !== "PENDING") {
    return "This invitation is no longer pending";
  }
  if (isInvitationExpired(invitation, now)) {
    return INVITATION_EXPIRED_ERROR;
  }
  return null;
};
export const allowInvitationSend = async (
  deps: InvitationDeps,
  userId: string,
  teamId: string,
): Promise<boolean> => {
  const user = await deps.checkRateLimit(`invite:user:${userId}`, INVITES_PER_USER_PER_HOUR, 3600);
  if (!user.allowed) {
    return false;
  }
  const team = await deps.checkRateLimit(`invite:team:${teamId}`, INVITES_PER_TEAM_PER_DAY, 86_400);
  return team.allowed;
};
export const INVITATION_RATE_ERROR = "Too many invitations. Try again later.";
