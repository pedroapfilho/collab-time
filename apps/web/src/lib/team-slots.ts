import type { TeamMember, TeamRecord } from "@/types";

import { MAX_MEMBERS_PER_TEAM } from "./limits";
import { applyTeamContents, newTeamMember } from "./team-store";
import type { TeamContentsFailureReason } from "./team-store";

type SlotClaim = { memberId?: string; name: string; userId: string };
type SlotValue = { created: boolean; memberId: string };
export type SlotClaimResult =
  | ({ ok: true } & SlotValue)
  | { error: string; ok: false; reason: TeamContentsFailureReason };
export const planSlotClaim = (
  team: TeamRecord,
  claim: SlotClaim,
  createMember = newTeamMember,
): { error: string; ok: false } | { ok: true; team: TeamRecord | null; value: SlotValue } => {
  const owned = team.members.find((member) => member.userId === claim.userId);
  if (owned) {
    return { ok: true, team: null, value: { created: false, memberId: owned.id } };
  }
  const target = team.members.find((member) => member.id === claim.memberId);
  if (target && (target.userId === undefined || target.userId === "")) {
    target.userId = claim.userId;
    return { ok: true, team, value: { created: false, memberId: target.id } };
  }
  if (team.members.length >= MAX_MEMBERS_PER_TEAM) {
    return { error: `A workspace can have up to ${MAX_MEMBERS_PER_TEAM} members`, ok: false };
  }
  const member: TeamMember = createMember({
    name: claim.name,
    order: team.members.length,
    userId: claim.userId,
  });
  team.members.push(member);
  return { ok: true, team, value: { created: true, memberId: member.id } };
};
export const claimOrCreateMemberSlot = async (
  teamId: string,
  claim: SlotClaim,
  apply = applyTeamContents,
): Promise<SlotClaimResult> => {
  const result = await apply(teamId, (team) =>
    team === null ? { error: "Team not found", ok: false } : planSlotClaim(team, claim),
  );
  return result.ok ? { ...result.value, ok: true } : result;
};
