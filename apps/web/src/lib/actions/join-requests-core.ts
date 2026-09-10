import type { requireAuth, requireTeamAdmin } from "@/lib/team-auth";

import { displayName } from "../display-name";
import type { SlotClaimResult } from "../team-slots";
import { UUIDSchema } from "../validation";

import type { ActionErrorEvent, ActionResult } from "./types";

type JoinRequestRecord = {
  id: string;
  status: string;
  teamId: string;
  user: { email: string; name: string | null };
  userId: string;
};

type PendingJoinRequest = JoinRequestRecord & { createdAt: Date };

type PendingJoinRequestView = {
  createdAt: Date;
  id: string;
  userEmail: string;
  userId: string;
  userName: string;
};

type JoinRequestDeps = {
  approveMembership: (requestId: string, teamId: string, userId: string) => Promise<void>;
  denyRequest: (requestId: string) => Promise<void>;
  ensureMemberSlot: (teamId: string, userId: string, name: string) => Promise<SlotClaimResult>;
  findRequest: (requestId: string) => Promise<JoinRequestRecord | null>;
  listPending: (
    teamId: string,
  ) => Promise<{ memberUserIds: Array<string>; requests: Array<PendingJoinRequest> }>;
  loadJoinContext: (
    teamId: string,
    userId: string,
  ) => Promise<{
    existingMembership: boolean;
    existingRequest: { status: string } | null;
    teamExists: boolean;
  }>;
  notifyAdmins: (teamId: string, user: { email: string; name: string | null }) => void;
  notifyRequester: (request: JoinRequestRecord, decision: "approved" | "denied") => void;
  reportError: (event: ActionErrorEvent) => void;
  requireAuth: typeof requireAuth;
  requireTeamAdmin: typeof requireTeamAdmin;
  upsertRequest: (teamId: string, userId: string) => Promise<{ id: string }>;
};

const createJoinRequestActions = (deps: JoinRequestDeps) => {
  const requestToJoin = async (teamId: string): Promise<ActionResult<{ requestId: string }>> => {
    try {
      const session = await deps.requireAuth();
      const uuidResult = UUIDSchema.safeParse(teamId);
      if (!uuidResult.success) {
        return { error: "Invalid team ID", success: false };
      }

      const context = await deps.loadJoinContext(teamId, session.user.id);
      if (!context.teamExists) {
        return { error: "Team not found", success: false };
      }
      if (context.existingMembership) {
        return { error: "You are already a member of this team", success: false };
      }
      if (context.existingRequest?.status === "PENDING") {
        return { error: "You already have a pending request for this team", success: false };
      }

      const joinRequest = await deps.upsertRequest(teamId, session.user.id);
      deps.notifyAdmins(teamId, session.user);
      return { data: { requestId: joinRequest.id }, success: true };
    } catch (error) {
      deps.reportError({
        error,
        message: "Failed to request to join",
        route: "actions/join-requests",
      });
      return { error: "Failed to submit join request", success: false };
    }
  };

  const approveJoinRequest = async (
    requestId: string,
  ): Promise<ActionResult<{ memberId: string }>> => {
    try {
      const joinRequest = await deps.findRequest(requestId);
      if (!joinRequest) {
        return { error: "Join request not found", success: false };
      }
      if (joinRequest.status !== "PENDING") {
        return { error: "Join request is no longer pending", success: false };
      }

      await deps.requireTeamAdmin(joinRequest.teamId);

      const memberName = displayName(joinRequest.user.name, joinRequest.user.email);
      const applied = await deps.ensureMemberSlot(
        joinRequest.teamId,
        joinRequest.userId,
        memberName,
      );
      if (!applied.ok) {
        return { error: applied.error, success: false };
      }
      await deps.approveMembership(requestId, joinRequest.teamId, joinRequest.userId);
      deps.notifyRequester(joinRequest, "approved");

      return { data: { memberId: applied.memberId }, success: true };
    } catch (error) {
      deps.reportError({
        error,
        message: "Failed to approve join request",
        route: "actions/join-requests",
      });
      return { error: "Failed to approve join request", success: false };
    }
  };

  const denyJoinRequest = async (requestId: string): Promise<ActionResult<void>> => {
    try {
      const joinRequest = await deps.findRequest(requestId);
      if (!joinRequest) {
        return { error: "Join request not found", success: false };
      }
      if (joinRequest.status !== "PENDING") {
        return { error: "Join request is no longer pending", success: false };
      }

      await deps.requireTeamAdmin(joinRequest.teamId);
      await deps.denyRequest(requestId);
      deps.notifyRequester(joinRequest, "denied");
      return { data: undefined, success: true };
    } catch (error) {
      deps.reportError({
        error,
        message: "Failed to deny join request",
        route: "actions/join-requests",
      });
      return { error: "Failed to deny join request", success: false };
    }
  };

  const getPendingJoinRequests = async (
    teamId: string,
  ): Promise<ActionResult<Array<PendingJoinRequestView>>> => {
    try {
      const uuidResult = UUIDSchema.safeParse(teamId);
      if (!uuidResult.success) {
        return { error: "Invalid team ID", success: false };
      }

      await deps.requireTeamAdmin(teamId);
      const { memberUserIds, requests } = await deps.listPending(teamId);
      const existingMembers = new Set(memberUserIds);
      const data: Array<PendingJoinRequestView> = [];
      for (const request of requests) {
        if (!existingMembers.has(request.userId)) {
          data.push({
            createdAt: request.createdAt,
            id: request.id,
            userEmail: request.user.email,
            userId: request.userId,
            userName: displayName(request.user.name, request.user.email),
          });
        }
      }

      return { data, success: true };
    } catch (error) {
      deps.reportError({
        error,
        message: "Failed to get pending join requests",
        route: "actions/join-requests",
      });
      return { error: "Failed to get join requests", success: false };
    }
  };

  return { approveJoinRequest, denyJoinRequest, getPendingJoinRequests, requestToJoin };
};

export { createJoinRequestActions };
