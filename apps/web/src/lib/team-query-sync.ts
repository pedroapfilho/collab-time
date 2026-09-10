import type { QueryClient } from "@tanstack/react-query";

import { queryKeys } from "./query-keys";

const teamMutationKey = (teamId: string) => ["team-mutation", teamId] as const;

const createTeamQueryInvalidator = (queryClient: QueryClient, teamId: string) => {
  const queryKey = queryKeys.teams.detail(teamId);
  const mutationKey = teamMutationKey(teamId);
  let pending = false;
  let running = false;
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const flush = async () => {
    if (disposed || !pending || running || timer !== undefined) {
      return;
    }
    if (
      queryClient.isMutating({ mutationKey }) > 0 ||
      queryClient.isFetching({ exact: true, queryKey }) > 0
    ) {
      return;
    }
    pending = false;
    running = true;
    try {
      await queryClient.invalidateQueries({ exact: true, queryKey }, { cancelRefetch: false });
    } finally {
      running = false;
      void flush();
    }
  };
  const settled = () => {
    if (pending && !disposed) {
      queueMicrotask(() => {
        void flush();
      });
    }
  };
  const unsubscribeQuery = queryClient.getQueryCache().subscribe(settled);
  const unsubscribeMutation = queryClient.getMutationCache().subscribe(settled);

  return {
    dispose: () => {
      disposed = true;
      clearTimeout(timer);
      unsubscribeQuery();
      unsubscribeMutation();
    },
    notify: () => {
      if (disposed) {
        return;
      }
      pending = true;
      clearTimeout(timer);
      timer = setTimeout(() => {
        timer = undefined;
        if (queryClient.isMutating({ mutationKey }) > 0) {
          void queryClient.invalidateQueries({ exact: true, queryKey, refetchType: "none" });
        }
        void flush();
      }, 250);
    },
  };
};

export { createTeamQueryInvalidator, teamMutationKey };
