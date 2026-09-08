import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMockSession } from "@/lib/actions/test-helpers";

import renderTeamPage from "./page";

const mocks = vi.hoisted(() => ({
  findInvitation: vi.fn(),
  findJoinRequest: vi.fn(),
  findMembership: vi.fn(),
  findSpace: vi.fn(),
  getPublicTeam: vi.fn(),
  getSession: vi.fn(),
  notFound: vi.fn(),
}));
vi.mock("@repo/db", () => ({
  prisma: {
    invitation: { findUnique: mocks.findInvitation },
    joinRequest: { findUnique: mocks.findJoinRequest },
    membership: { findUnique: mocks.findMembership },
    space: { findUnique: mocks.findSpace },
  },
}));
vi.mock("@/lib/auth-server", () => ({ getSession: mocks.getSession }));
vi.mock("@/lib/actions/team-read", () => ({ getPublicTeam: mocks.getPublicTeam }));
vi.mock("@/lib/team-meta", () => ({ getTeamName: vi.fn() }));
vi.mock("@/lib/space-access", () => ({
  SPACE_ACCESS_COOKIE_PREFIX: "space-",
  verifySpaceAccessToken: vi.fn(),
}));
vi.mock("next/headers", () => ({ cookies: () => Promise.resolve({ get: () => undefined }) }));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("@/providers/query-provider", () => ({
  QueryProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("./client", () => ({
  TeamPageClient: ({ teamStatus }: { teamStatus: string }) => <p>Workspace: {teamStatus}</p>,
}));
vi.mock("./private-space-gate", () => ({ PrivateSpaceGate: () => <p>Password gate</p> }));
vi.mock("@/components/accept-workspace-invitation", () => ({
  AcceptWorkspaceInvitation: () => <button type="button">Accept invitation</button>,
}));

const params = Promise.resolve({ teamId: "550e8400-e29b-41d4-a716-446655440000" });

beforeEach(() => {
  vi.resetAllMocks();
  mocks.findSpace.mockResolvedValue({
    accessPassword: "hash",
    id: "space-1",
    isPrivate: true,
    ownerId: "owner",
  });
  mocks.getSession.mockResolvedValue(createMockSession());
  mocks.getPublicTeam.mockResolvedValue({ error: "Unavailable", success: false });
  mocks.notFound.mockImplementation(() => {
    throw new Error("Not found");
  });
});

describe("workspace access", () => {
  it("shows private invitation acceptance without fetching or hydrating the roster", async () => {
    mocks.findInvitation.mockResolvedValue({ id: "invite-1", status: "PENDING" });
    render(await renderTeamPage({ params }));
    expect(screen.getByRole("button", { name: "Accept invitation" })).toBeVisible();
    expect(screen.queryByText("Password gate")).toBeNull();
    expect(mocks.getPublicTeam).not.toHaveBeenCalled();
    expect(mocks.findInvitation).toHaveBeenCalledWith({
      where: {
        email_teamId: { email: "test@example.com", teamId: "550e8400-e29b-41d4-a716-446655440000" },
      },
    });
  });

  it("does not expose private content to a signed-out visitor", async () => {
    mocks.getSession.mockResolvedValue(null);
    render(await renderTeamPage({ params }));
    expect(screen.getByText("Password gate")).toBeVisible();
    expect(mocks.findInvitation).not.toHaveBeenCalled();
    expect(mocks.getPublicTeam).not.toHaveBeenCalled();
  });

  it.each([undefined, { status: "DECLINED" }, { status: "ACCEPTED" }])(
    "keeps the gate when there is no pending invitation: %j",
    async (invitation) => {
      mocks.findInvitation.mockResolvedValue(invitation);
      render(await renderTeamPage({ params }));
      expect(screen.getByText("Password gate")).toBeVisible();
      expect(mocks.getPublicTeam).not.toHaveBeenCalled();
    },
  );

  it("prioritizes membership over a pending invitation", async () => {
    mocks.findMembership.mockResolvedValue({ archivedAt: null, role: "MEMBER" });
    mocks.findInvitation.mockResolvedValue({ id: "invite-1", status: "PENDING" });
    render(await renderTeamPage({ params }));
    expect(screen.getByText("Workspace: MEMBER")).toBeVisible();
    expect(mocks.getPublicTeam).toHaveBeenCalled();
  });

  it("passes invitation status to a public workspace before a pending join request", async () => {
    mocks.findSpace.mockResolvedValue({ id: "space-1", isPrivate: false, ownerId: "owner" });
    mocks.findInvitation.mockResolvedValue({ id: "invite-1", status: "PENDING" });
    mocks.findJoinRequest.mockResolvedValue({ status: "PENDING" });
    render(await renderTeamPage({ params }));
    expect(screen.getByText("Workspace: INVITED")).toBeVisible();
  });

  it("propagates storage failures to the error boundary instead of returning 404", async () => {
    mocks.findSpace.mockRejectedValue(new Error("Database unavailable"));
    await expect(renderTeamPage({ params })).rejects.toThrow("Database unavailable");
    expect(mocks.notFound).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing workspace", async () => {
    mocks.findSpace.mockResolvedValue(null);
    await expect(renderTeamPage({ params })).rejects.toThrow("Not found");
  });
});
