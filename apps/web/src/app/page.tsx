import { Skeleton } from "@repo/ui/components/skeleton";
import { dehydrate } from "@tanstack/react-query";
import type { Metadata } from "next";
import { Suspense } from "react";

import { LandingPage } from "@/components/landing";
import { getSession } from "@/lib/auth-server";
import { APP_DESCRIPTION_SHORT, APP_NAME, APP_TITLE } from "@/lib/constants";
import { getMyTeams, getPendingInvitations } from "@/lib/home-data";
import { log } from "@/lib/observability";
import { createQueryClient } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";
import { QueryProvider } from "@/providers/query-provider";

import { HomeShell } from "./home-client";
import { HomeLists } from "./home-client/lists";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: {
    description: APP_DESCRIPTION_SHORT,
    images: [{ alt: APP_TITLE, height: 630, url: "/og", width: 1200 }],
    locale: "en_US",
    siteName: APP_NAME,
    title: APP_TITLE,
    type: "website",
    url: "/",
  },
};

type HomeDataProps = {
  email: string;
  userId: string;
};

const HomeData = async ({ email, userId }: HomeDataProps) => {
  const queryClient = createQueryClient();
  const [teamsResult, invitationsResult] = await Promise.allSettled([
    getMyTeams(userId),
    getPendingInvitations(email),
  ]);

  if (teamsResult.status === "fulfilled") {
    queryClient.setQueryData(queryKeys.myTeams, teamsResult.value);
  } else {
    log.error({ error: teamsResult.reason, message: "Failed to preload teams", route: "/" });
  }

  if (invitationsResult.status === "fulfilled") {
    queryClient.setQueryData(queryKeys.invitations, invitationsResult.value);
  } else {
    log.error({
      error: invitationsResult.reason,
      message: "Failed to preload invitations",
      route: "/",
    });
  }

  return (
    <QueryProvider dehydratedState={dehydrate(queryClient)}>
      <HomeLists />
    </QueryProvider>
  );
};

const HomeDataSkeleton = () => (
  <div aria-busy="true" className="flex w-full flex-col">
    <div className="flex items-center justify-between border-b border-border pb-3">
      <Skeleton className="h-3.5 w-36 rounded-none" />
    </div>
    {["workspace-1", "workspace-2"].map((workspace) => (
      <div
        className="flex min-h-24 items-center justify-between gap-6 border-b border-border py-5"
        key={workspace}
      >
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-44 rounded-none sm:w-56" />
          <Skeleton className="h-3 w-20 rounded-none" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="size-4 rounded-none" />
          <Skeleton className="size-8" />
        </div>
      </div>
    ))}
  </div>
);

const HomeContent = async () => {
  const session = await getSession();

  if (!session) {
    return <LandingPage />;
  }

  return (
    <HomeShell>
      <Suspense fallback={<HomeDataSkeleton />}>
        <HomeData email={session.user.email} userId={session.user.id} />
      </Suspense>
    </HomeShell>
  );
};

const HomeSkeleton = () => (
  <div
    aria-busy="true"
    className="mx-auto flex w-full max-w-450 flex-1 flex-col gap-12 px-4 py-6 sm:px-6 lg:px-8 xl:px-12"
  >
    <div className="flex items-center justify-between">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="size-9" />
    </div>
    <main className="flex flex-col gap-4 py-12" id="main">
      <Skeleton className="h-10 w-full max-w-lg" />
      <Skeleton className="h-5 w-full max-w-sm" />
    </main>
  </div>
);

const Home = () => (
  <Suspense fallback={<HomeSkeleton />}>
    <HomeContent />
  </Suspense>
);

/** @public Next.js app-router reads the instant segment config via the module loader */
export const instant = true;

export default Home;
