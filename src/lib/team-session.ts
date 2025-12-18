"use server";

import { cookies } from "next/headers";
import type { TeamSession } from "@/types";

const TEAM_SESSION_PREFIX = "collab-time-session:";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const getTeamSessionKey = (teamId: string) => `${TEAM_SESSION_PREFIX}${teamId}`;

const isTeamSession = (value: unknown): value is TeamSession => {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.token === "string" &&
    (record.role === "admin" || record.role === "member")
  );
};

const readTeamSession = async (teamId: string): Promise<TeamSession | null> => {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(getTeamSessionKey(teamId))?.value;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isTeamSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const writeTeamSession = async (teamId: string, session: TeamSession) => {
  const cookieStore = await cookies();
  cookieStore.set(getTeamSessionKey(teamId), JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
};

const clearTeamSession = async (teamId: string) => {
  const cookieStore = await cookies();
  cookieStore.delete(getTeamSessionKey(teamId));
};

export { clearTeamSession, readTeamSession, writeTeamSession };
