import { prisma } from "@repo/db";
import { dehydrate } from "@tanstack/react-query";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AcceptWorkspaceInvitation } from "@/components/accept-workspace-invitation";
import { getPublicTeam } from "@/lib/actions/team-read";
import { getSession } from "@/lib/auth-server";
import { createQueryClient } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";
import { canAccessSpace } from "@/lib/space-visibility";
import { getTeamName } from "@/lib/team-meta";
import { QueryProvider } from "@/providers/query-provider";
import { isTeamRole } from "@/types";
import type { TeamStatus } from "@/types";

import { TeamPageClient } from "./client";
import { PrivateSpaceGate } from "./private-space-gate";

type TeamPageProps = {
  params: Promise<{ teamId: string }>;
};

export const generateMetadata = async ({ params }: TeamPageProps): Promise<Metadata> => {
  const { teamId } = await params;
  const teamName = await getTeamName(teamId);

  return {
    description: `Working hours and overlap view for ${teamName ?? "your team"}.`,
    robots: { follow: false, googleBot: { follow: false, index: false }, index: false },
    title: teamName ?? "Team Workspace",
  };
};

type TeamStatusResult = {
  invitationId?: string;
  isArchived: boolean;
  status: TeamStatus;
};

const GUEST_STATUS: TeamStatusResult = { isArchived: false, status: "none" };

/**
 * Promise.all, not allSettled: folding a rejected membership query into `null`
 * reported a real member as "none", which the client then papered over by
 * re-running the same query.
 */
const getTeamStatus = async (
  userId: string,
  email: string,
  teamId: string,
): Promise<TeamStatusResult> => {
  const [membership, invitation, joinRequest] = await Promise.all([
    prisma.membership.findUnique({
      where: { userId_teamId: { teamId, userId } },
    }),
    prisma.invitation.findUnique({
      where: { email_teamId: { email: email.toLowerCase(), teamId } },
    }),
    prisma.joinRequest.findUnique({
      where: { userId_teamId: { teamId, userId } },
    }),
  ]);

  if (membership && isTeamRole(membership.role)) {
    return { isArchived: membership.archivedAt !== null, status: membership.role };
  }

  if (invitation?.status === "PENDING") {
    return { invitationId: invitation.id, isArchived: false, status: "INVITED" };
  }

  if (joinRequest?.status === "PENDING") {
    return { isArchived: false, status: "PENDING" };
  }

  return { isArchived: false, status: "none" };
};

const TeamPage = async ({ params }: TeamPageProps) => {
  const { teamId } = await params;

  const [session, space] = await Promise.all([
    getSession(),
    prisma.space.findUnique({ where: { teamId } }),
  ]);

  if (!space) {
    notFound();
  }

  const {
    invitationId,
    isArchived,
    status: teamStatus,
  } = session ? await getTeamStatus(session.user.id, session.user.email, teamId) : GUEST_STATUS;

  if (space.isPrivate && teamStatus === "INVITED" && invitationId !== undefined) {
    return (
      <main
        className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-20"
        id="main"
      >
        <h1 className="font-display text-2xl font-semibold">Join this workspace</h1>
        <AcceptWorkspaceInvitation invitationId={invitationId} />
      </main>
    );
  }

  if (!(await canAccessSpace(space, session?.user.id))) {
    return (
      <PrivateSpaceGate isAuthenticated={Boolean(session)} spaceId={space.id} teamId={teamId} />
    );
  }

  const isSpaceOwner = Boolean(session && space.ownerId === session.user.id);
  const queryClient = createQueryClient();
  const teamResult = await getPublicTeam(teamId);

  if (teamResult.success) {
    queryClient.setQueryData(queryKeys.teams.detail(teamId), { team: teamResult.data.team });
  }

  return (
    <QueryProvider dehydratedState={dehydrate(queryClient)}>
      <TeamPageClient
        hasPassword={isSpaceOwner ? Boolean(space.accessPassword) : undefined}
        invitationId={invitationId}
        isArchived={isArchived}
        isAuthenticated={Boolean(session)}
        isPrivate={space.isPrivate}
        spaceId={isSpaceOwner ? space.id : null}
        teamId={teamId}
        teamStatus={teamStatus}
        userId={session?.user?.id}
      />
    </QueryProvider>
  );
};

/** @public Next.js app-router reads the instant segment config via the module loader */
export const instant = true;

export default TeamPage;
