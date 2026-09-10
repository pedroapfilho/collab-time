import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMockSession } from "@/lib/actions/test-helpers";

import renderTeamPage from "./page";

const mocks = vi.hoisted(() => ({
  clientProps: vi.fn(),
  findInvitation: vi.fn(),
  findJoinRequest: vi.fn(),
  findMembership: vi.fn(),
  findSpace: vi.fn(),
  gateProps: vi.fn(),
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
  TeamPageClient: (props: { teamStatus: string }) => {
    mocks.clientProps(props);
    return <p>Workspace: {props.teamStatus}</p>;
  },
}));
vi.mock("./private-space-gate", () => ({
  PrivateSpaceGate: (props: { returnTo: string }) => {
    mocks.gateProps(props);
    return <p>Password gate</p>;
  },
}));
vi.mock("@/components/accept-workspace-invitation", () => ({
  AcceptWorkspaceInvitation: () => <button type="button">Accept invitation</button>,
}));

const params = Promise.resolve({ teamId: "550e8400-e29b-41d4-a716-446655440000" });

beforeEach(() => {
  vi.resetAllMocks();
  mocks.findMembership.mockResolvedValue(null);
  mocks.findSpace.mockResolvedValue({
    accessPassword: "hash",
    id: "space-1",
    isPrivate: true,
    ownerId: "owner",
    teamId: "550e8400-e29b-41d4-a716-446655440000",
  });
  mocks.getSession.mockResolvedValue(createMockSession());
  mocks.getPublicTeam.mockResolvedValue({ error: "Unavailable", success: false });
  mocks.notFound.mockImplementation(() => {
    throw new Error("Not found");
  });
});

describe("workspace access", () => {
  it("shows private invitation acceptance without fetching or hydrating the roster", async () => {
    mocks.findInvitation.mockResolvedValue({
      expiresAt: null,
      id: "invite-1",
      invitedBy: { email: "owner@example.com", name: "Owner" },
      status: "PENDING",
    });
    render(await renderTeamPage({ params, searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("button", { name: "Accept invitation" })).toBeVisible();
    expect(screen.queryByText("Password gate")).toBeNull();
    expect(mocks.getPublicTeam).not.toHaveBeenCalled();
    expect(mocks.findInvitation).toHaveBeenCalledWith({
      include: { invitedBy: { select: { email: true, name: true } } },
      where: {
        email_teamId: { email: "test@example.com", teamId: "550e8400-e29b-41d4-a716-446655440000" },
      },
    });
  });

  it("does not expose private content to a signed-out visitor", async () => {
    mocks.getSession.mockResolvedValue(null);
    render(await renderTeamPage({ params, searchParams: Promise.resolve({}) }));
    expect(screen.getByText("Password gate")).toBeVisible();
    expect(mocks.findInvitation).not.toHaveBeenCalled();
    expect(mocks.getPublicTeam).not.toHaveBeenCalled();
  });

  it.each([undefined, { status: "DECLINED" }, { status: "ACCEPTED" }])(
    "keeps the gate when there is no pending invitation: %j",
    async (invitation) => {
      mocks.findInvitation.mockResolvedValue(invitation);
      render(await renderTeamPage({ params, searchParams: Promise.resolve({}) }));
      expect(screen.getByText("Password gate")).toBeVisible();
      expect(mocks.getPublicTeam).not.toHaveBeenCalled();
    },
  );

  it("prioritizes membership over a pending invitation", async () => {
    mocks.findMembership.mockResolvedValue({ archivedAt: null, role: "MEMBER" });
    mocks.findInvitation.mockResolvedValue({
      expiresAt: null,
      id: "invite-1",
      invitedBy: { email: "owner@example.com", name: "Owner" },
      status: "PENDING",
    });
    render(await renderTeamPage({ params, searchParams: Promise.resolve({}) }));
    expect(screen.getByText("Workspace: MEMBER")).toBeVisible();
    expect(mocks.getPublicTeam).toHaveBeenCalled();
  });

  it("passes invitation status to a public workspace before a pending join request", async () => {
    mocks.findSpace.mockResolvedValue({ id: "space-1", isPrivate: false, ownerId: "owner" });
    mocks.findInvitation.mockResolvedValue({
      expiresAt: null,
      id: "invite-1",
      invitedBy: { email: "owner@example.com", name: "Owner" },
      status: "PENDING",
    });
    mocks.findJoinRequest.mockResolvedValue({ status: "PENDING" });
    render(await renderTeamPage({ params, searchParams: Promise.resolve({}) }));
    expect(screen.getByText("Workspace: INVITED")).toBeVisible();
  });

  it("propagates storage failures to the error boundary instead of returning 404", async () => {
    mocks.findSpace.mockRejectedValue(new Error("Database unavailable"));
    await expect(renderTeamPage({ params, searchParams: Promise.resolve({}) })).rejects.toThrow(
      "Database unavailable",
    );
    expect(mocks.notFound).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing workspace", async () => {
    mocks.findSpace.mockResolvedValue(null);
    await expect(renderTeamPage({ params, searchParams: Promise.resolve({}) })).rejects.toThrow(
      "Not found",
    );
  });
});

const hintedInvitation = {
  email: "friend@example.com",
  expiresAt: null,
  id: "cmf12345678901234567890123",
  invitedBy: { email: "owner@example.com", name: "Owner" },
  status: "PENDING",
  teamId: "550e8400-e29b-41d4-a716-446655440000",
};
describe("invitation hints", () => {
  beforeEach(() => {
    mocks.findSpace.mockResolvedValue({ id: "space", isPrivate: false, ownerId: "owner" });
    mocks.findInvitation.mockImplementation(({ where }: { where: { id?: string } }) =>
      Promise.resolve(where.id === hintedInvitation.id ? hintedInvitation : null),
    );
  });
  it("shows a masked notice to a signed-in user with another email", async () => {
    render(
      await renderTeamPage({
        params,
        searchParams: Promise.resolve({ invite: hintedInvitation.id }),
      }),
    );
    expect(mocks.clientProps).toHaveBeenCalledWith(
      expect.objectContaining({
        inviteMismatch: { invitedEmailMasked: "f***@example.com" },
        returnTo: `/${hintedInvitation.teamId}?invite=${hintedInvitation.id}`,
      }),
    );
  });
  it.each([{ expiresAt: new Date(0) }, { teamId: "another-team" }, { status: "REVOKED" }])(
    "hides mismatches for a closed or unrelated invitation: %j",
    async (override) => {
      mocks.findInvitation.mockImplementation(({ where }: { where: { id?: string } }) =>
        Promise.resolve(
          where.id === hintedInvitation.id ? { ...hintedInvitation, ...override } : null,
        ),
      );
      render(
        await renderTeamPage({
          params,
          searchParams: Promise.resolve({ invite: hintedInvitation.id }),
        }),
      );
      expect(mocks.clientProps).toHaveBeenCalledWith(
        expect.objectContaining({ inviteMismatch: undefined }),
      );
    },
  );
  it("ignores malformed and repeated hint parameters", async () => {
    render(
      await renderTeamPage({
        params,
        searchParams: Promise.resolve({ invite: [hintedInvitation.id, hintedInvitation.id] }),
      }),
    );
    expect(mocks.clientProps).toHaveBeenCalledWith(
      expect.objectContaining({
        inviteMismatch: undefined,
        returnTo: `/${hintedInvitation.teamId}`,
      }),
    );
  });
  it("does not query the hint for members", async () => {
    mocks.findMembership.mockResolvedValue({ archivedAt: null, role: "MEMBER" });
    render(
      await renderTeamPage({
        params,
        searchParams: Promise.resolve({ invite: hintedInvitation.id }),
      }),
    );
    expect(mocks.findInvitation).toHaveBeenCalledTimes(1);
    expect(mocks.clientProps).toHaveBeenCalledWith(
      expect.objectContaining({ inviteMismatch: undefined }),
    );
  });
  it("recognizes mixed-case recipient emails without a mismatch", async () => {
    mocks.getSession.mockResolvedValue(createMockSession({ email: " FRIEND@EXAMPLE.COM " }));
    mocks.findInvitation.mockResolvedValue(hintedInvitation);
    render(
      await renderTeamPage({
        params,
        searchParams: Promise.resolve({ invite: hintedInvitation.id }),
      }),
    );
    expect(mocks.findInvitation).toHaveBeenCalledTimes(1);
    expect(mocks.clientProps).toHaveBeenCalledWith(
      expect.objectContaining({
        inviteMismatch: undefined,
        inviterName: "Owner",
        teamStatus: "INVITED",
      }),
    );
    expect(mocks.findInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email_teamId: { email: "friend@example.com", teamId: hintedInvitation.teamId } },
      }),
    );
  });
  it("preserves the hint for guests at the private gate without looking it up", async () => {
    mocks.getSession.mockResolvedValue(null);
    mocks.findSpace.mockResolvedValue({ id: "space", isPrivate: true, ownerId: "owner" });
    render(
      await renderTeamPage({
        params,
        searchParams: Promise.resolve({ invite: hintedInvitation.id }),
      }),
    );
    expect(mocks.gateProps).toHaveBeenCalledWith(
      expect.objectContaining({
        returnTo: `/${hintedInvitation.teamId}?invite=${hintedInvitation.id}`,
      }),
    );
    expect(mocks.findInvitation).not.toHaveBeenCalled();
  });
  it("does not treat expired pending rows as invited", async () => {
    mocks.findInvitation.mockResolvedValue({ ...hintedInvitation, expiresAt: new Date(0) });
    render(await renderTeamPage({ params, searchParams: Promise.resolve({}) }));
    expect(mocks.clientProps).toHaveBeenCalledWith(expect.objectContaining({ teamStatus: "none" }));
  });
});
