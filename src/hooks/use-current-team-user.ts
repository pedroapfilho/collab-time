import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { getUserTimezone } from "@/lib/timezones";
import type { TeamMember } from "@/types";

type CurrentTeamUserState = {
  memberId: string | null;
  source: "explicit" | "suggested" | null;
  dismissedSuggestions: string[];
};

const STORAGE_KEY_PREFIX = "collab-time-current-user-";

const getStorageKey = (teamId: string): string => `${STORAGE_KEY_PREFIX}${teamId}`;

const DEFAULT_STATE: CurrentTeamUserState = {
  memberId: null,
  source: null,
  dismissedSuggestions: [],
};

const useCurrentTeamUser = (teamId: string, members: TeamMember[]) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [state, setState, removeState] = useLocalStorage<CurrentTeamUserState>(
    getStorageKey(teamId),
    DEFAULT_STATE
  );

  // Hydration tracking
  useEffect(() => {
    const id = requestAnimationFrame(() => setIsHydrated(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Get the browser's timezone for suggestion matching
  const viewerTimezone = useMemo(() => {
    if (typeof window === "undefined") return "";
    return getUserTimezone();
  }, []);

  // Validate that stored memberId still exists in members array
  const currentUser = useMemo(() => {
    if (!state.memberId) return null;
    return members.find((m) => m.id === state.memberId) ?? null;
  }, [state.memberId, members]);

  // If stored member no longer exists, clear the selection
  useEffect(() => {
    if (state.memberId && !currentUser && members.length > 0) {
      setState((prev) => ({
        ...prev,
        memberId: null,
        source: null,
      }));
    }
  }, [state.memberId, currentUser, members.length, setState]);

  // Find suggested user based on timezone matching
  const suggestedUser = useMemo(() => {
    // Don't suggest if user already set
    if (state.memberId) return null;
    // Don't suggest if no viewer timezone available
    if (!viewerTimezone) return null;

    // Find members with exact timezone match
    const exactMatches = members.filter((m) => m.timezone === viewerTimezone);

    // Only suggest if exactly one match and not previously dismissed
    if (exactMatches.length === 1) {
      const match = exactMatches[0];
      if (!state.dismissedSuggestions.includes(match.id)) {
        return match;
      }
    }

    return null;
  }, [state.memberId, state.dismissedSuggestions, members, viewerTimezone]);

  // Set the current user
  const setCurrentUser = useCallback(
    (memberId: string | null, source: "explicit" | "suggested" = "explicit") => {
      setState((prev) => ({
        ...prev,
        memberId,
        source: memberId ? source : null,
      }));
    },
    [setState]
  );

  // Clear the current user selection
  const clearCurrentUser = useCallback(() => {
    setState((prev) => ({
      ...prev,
      memberId: null,
      source: null,
    }));
  }, [setState]);

  // Dismiss a suggestion (user said "No")
  const dismissSuggestion = useCallback(
    (memberId: string) => {
      setState((prev) => ({
        ...prev,
        dismissedSuggestions: [...prev.dismissedSuggestions, memberId],
      }));
    },
    [setState]
  );

  // Accept a suggestion (user said "Yes")
  const acceptSuggestion = useCallback(
    (memberId: string) => {
      setCurrentUser(memberId, "suggested");
    },
    [setCurrentUser]
  );

  // Check if a member is the current user
  const isCurrentUser = useCallback(
    (memberId: string): boolean => {
      return state.memberId === memberId;
    },
    [state.memberId]
  );

  return {
    currentUser,
    currentUserId: state.memberId,
    setCurrentUser,
    clearCurrentUser,
    suggestedUser,
    dismissSuggestion,
    acceptSuggestion,
    isCurrentUser,
    isHydrated,
  };
};

export { useCurrentTeamUser };
export type { CurrentTeamUserState };
