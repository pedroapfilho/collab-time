const queryKeys = {
  invitations: ["my-invitations"] as const,
  joinRequests: (teamId: string) => ["join-requests", teamId] as const,
  myTeams: ["my-teams"] as const,
  teamInvitations: (teamId: string) => ["team-invitations", teamId] as const,
  teams: {
    all: ["teams"] as const,
    detail: (teamId: string) => ["teams", teamId] as const,
  },
};

export { queryKeys };
