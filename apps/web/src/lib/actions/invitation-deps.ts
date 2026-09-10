import type { TransactionalEmail } from "@repo/transactional";

import type { TeamRecord } from "@/types";

import type { checkRateLimit } from "../space-rate-limit";
import type { requireAuth, requireTeamAdmin } from "../team-auth";
import type { claimOrCreateMemberSlot } from "../team-slots";

import type { ActionErrorEvent } from "./types";

export type InvitationRecord = {
  createdAt: Date;
  email: string;
  expiresAt: Date | null;
  id: string;
  invitedBy: { email: string; name: string | null };
  memberId: string;
  status: string;
  teamId: string;
  updatedAt: Date;
};
export type InvitationDeps = {
  checkRateLimit: typeof checkRateLimit;
  claimOrCreateSlot: typeof claimOrCreateMemberSlot;
  commitAcceptance: (
    invitation: InvitationRecord,
    memberId: string,
    userId: string,
  ) => Promise<void>;
  findInvitation: (id: string) => Promise<InvitationRecord | null>;
  inviteLink: (teamId: string, invitationId: string) => string;
  listPendingForTeam: (teamId: string) => Promise<Array<InvitationRecord>>;
  loadInviteContext: (
    teamId: string,
    email: string,
  ) => Promise<{ existingMembership: boolean; team: TeamRecord | null }>;
  markDeclined: (invitation: InvitationRecord) => Promise<void>;
  markRevoked: (invitation: InvitationRecord) => Promise<void>;
  notifyInviter: (
    invitation: InvitationRecord,
    user: { email: string; name: string | null },
    decision: "accepted" | "declined",
  ) => void;
  now: () => Date;
  refreshExpiry: (invitation: InvitationRecord, expiresAt: Date) => Promise<void>;
  reportError: (event: ActionErrorEvent) => void;
  requireAuth: typeof requireAuth;
  requireTeamAdmin: typeof requireTeamAdmin;
  sendEmail: (email: TransactionalEmail) => Promise<{ sent: boolean }>;
  upsertInvitation: (input: {
    email: string;
    expiresAt: Date;
    invitedById: string;
    memberId: string;
    teamId: string;
  }) => Promise<InvitationRecord>;
};
