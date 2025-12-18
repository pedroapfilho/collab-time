"use client";

import type { TeamSession } from "@/types";

const TEAM_SESSION_PREFIX = "collab-time-team-session:";

const getTeamSessionKey = (teamId: string) => `${TEAM_SESSION_PREFIX}${teamId}`;

const isTeamSession = (value: unknown): value is TeamSession => {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.token === "string" &&
    (record.role === "admin" || record.role === "member")
  );
};

const readTeamSession = (teamId: string): TeamSession | null => {
  try {
    const raw = sessionStorage.getItem(getTeamSessionKey(teamId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isTeamSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const writeTeamSession = (teamId: string, session: TeamSession) => {
  sessionStorage.setItem(getTeamSessionKey(teamId), JSON.stringify(session));
};

const clearTeamSession = (teamId: string) => {
  sessionStorage.removeItem(getTeamSessionKey(teamId));
};

export { clearTeamSession, readTeamSession, writeTeamSession };

