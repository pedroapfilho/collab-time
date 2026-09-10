"use server";

import { prisma } from "@repo/db";
import { updateTag } from "next/cache";
import { v4 as uuidv4 } from "uuid";

import { log } from "@/lib/observability";
import { requireAuth, requireTeamMember } from "@/lib/team-auth";
import { teamNameTag } from "@/lib/team-meta";
import type { Team } from "@/types";

import { claimOrCreateMemberSlot } from "../team-slots";
import { readTeamRecord } from "../team-store";

import { mutateTeam } from "./helpers";
import { createMemberActions } from "./member-actions-core";
import type { ActionResult } from "./types";

const memberActions = createMemberActions({
  claimOrCreateSlot: claimOrCreateMemberSlot,
  createId: uuidv4,
  mutateTeam,
  readTeam: readTeamRecord,
  removeMembershipForSlot: async (teamId, userId, callerUserId) => {
    if (userId !== callerUserId) {
      await prisma.membership.deleteMany({ where: { role: "MEMBER", teamId, userId } });
    }
  },
  reportError: log.error,
  requireAuth,
  requireTeamMember,
  revokeInvitationsForMember: async (teamId, memberId) => {
    await prisma.invitation.updateMany({
      data: { status: "REVOKED" },
      where: { memberId, status: "PENDING", teamId },
    });
  },
});

const {
  addMember,
  createOwnMemberSlot,
  importMembers,
  removeMember,
  reorderMembers,
  updateMember,
  updateOwnMember,
} = memberActions;

const updateTeamName = async (teamId: string, name: string): Promise<ActionResult<Team>> => {
  const result = await memberActions.updateTeamName(teamId, name);

  if (result.success) {
    updateTag(teamNameTag(teamId));
  }

  return result;
};

export {
  createOwnMemberSlot,
  addMember,
  importMembers,
  removeMember,
  reorderMembers,
  updateMember,
  updateOwnMember,
  updateTeamName,
};
