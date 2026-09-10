import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { queryKeys } from "./query-keys";
import { createTeamQueryInvalidator, teamMutationKey } from "./team-query-sync";

const setup = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  const queryKey = queryKeys.teams.detail("team-1");
  const queryFn = vi.fn<() => Promise<string>>().mockResolvedValue("latest");
  queryClient.setQueryData(queryKey, "initial");
  const observer = new QueryObserver(queryClient, { queryFn, queryKey });
  const unsubscribe = observer.subscribe(() => undefined);
  const invalidator = createTeamQueryInvalidator(queryClient, "team-1");
  const dispose = () => {
    invalidator.dispose();
    unsubscribe();
    queryClient.clear();
  };
  return { dispose, invalidator, queryClient, queryFn, queryKey };
};

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("live query invalidation", () => {
  it("coalesces a notification burst into one fetch", async () => {
    const state = setup();
    state.invalidator.notify();
    state.invalidator.notify();
    state.invalidator.notify();
    await vi.advanceTimersByTimeAsync(249);
    expect(state.queryFn).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(state.queryFn).toHaveBeenCalledTimes(1);
    expect(state.queryClient.getQueryData(state.queryKey)).toBe("latest");
    state.dispose();
  });

  it("keeps optimistic data until every pending team mutation settles", async () => {
    const state = setup();
    const first = Promise.withResolvers<undefined>();
    const second = Promise.withResolvers<undefined>();
    const makeMutation = (pending: Promise<undefined>) =>
      state.queryClient
        .getMutationCache()
        .build(state.queryClient, {
          mutationFn: () => pending,
          mutationKey: teamMutationKey("team-1"),
        })
        .execute(undefined);
    const mutatingFirst = makeMutation(first.promise);
    const mutatingSecond = makeMutation(second.promise);
    state.queryClient.setQueryData(state.queryKey, "optimistic");
    state.invalidator.notify();
    await vi.advanceTimersByTimeAsync(250);
    expect(state.queryClient.getQueryData(state.queryKey)).toBe("optimistic");
    expect(state.queryClient.getQueryState(state.queryKey)?.isInvalidated).toBe(true);
    expect(state.queryFn).not.toHaveBeenCalled();
    first.resolve(undefined);
    await mutatingFirst;
    await vi.advanceTimersByTimeAsync(0);
    expect(state.queryFn).not.toHaveBeenCalled();
    second.resolve(undefined);
    await mutatingSecond;
    await vi.advanceTimersByTimeAsync(0);
    expect(state.queryFn).toHaveBeenCalledTimes(1);
    state.dispose();
  });

  it("fetches again when a change arrives during an existing fetch", async () => {
    const state = setup();
    const first = Promise.withResolvers<string>();
    state.queryFn.mockReturnValueOnce(first.promise);
    const fetching = state.queryClient.refetchQueries({ queryKey: state.queryKey });
    state.invalidator.notify();
    await vi.advanceTimersByTimeAsync(250);
    expect(state.queryFn).toHaveBeenCalledTimes(1);
    first.resolve("before-remote-edit");
    await fetching;
    await vi.advanceTimersByTimeAsync(0);
    expect(state.queryFn).toHaveBeenCalledTimes(2);
    expect(state.queryClient.getQueryData(state.queryKey)).toBe("latest");
    state.dispose();
  });

  it("cancels pending invalidation on unmount", async () => {
    const state = setup();
    state.invalidator.notify();
    state.dispose();
    await vi.advanceTimersByTimeAsync(250);
    expect(state.queryFn).not.toHaveBeenCalled();
  });
});
