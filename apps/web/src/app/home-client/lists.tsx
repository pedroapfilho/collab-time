"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { DeleteWorkspaceDialog } from "@/components/delete-workspace-dialog";
import { STEPS } from "@/components/landing/how-it-works";
import { queryKeys } from "@/lib/query-keys";

import { ArchivedTeamsList } from "./archived-teams-list";
import { InvitationsList } from "./invitations-list";
import { TeamsList } from "./teams-list";
import type { WorkspaceToDelete } from "./types";
import { useInvitations } from "./use-invitations";
import { useMyTeams } from "./use-my-teams";

const HomeLists = () => {
  const queryClient = useQueryClient();
  const [workspaceToDelete, setWorkspaceToDelete] = useState<WorkspaceToDelete | null>(null);

  const {
    handleAcceptInvitation,
    handleDeclineInvitation,
    hasLoadedInvitations,
    invitations,
    isInvitationPending,
  } = useInvitations();
  const { handleToggleArchive, hasLoadedTeams, isArchivePending, isLoadingTeams, myTeams } =
    useMyTeams();

  const handleWorkspaceDeleted = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.myTeams });
  };

  const activeTeams = myTeams.filter((team) => team.archivedAt === null);
  const archivedTeams = myTeams.filter((team) => team.archivedAt !== null);

  return (
    <>
      {hasLoadedTeams &&
        hasLoadedInvitations &&
        myTeams.length === 0 &&
        invitations.length === 0 && (
          <section className="border-y border-border py-10">
            <h2 className="font-display text-2xl font-semibold">No workspaces yet</h2>
            <ol className="mt-6 grid list-decimal gap-6 pl-5 sm:grid-cols-3">
              {STEPS.map(({ body, title }) => (
                <li className="pl-2" key={title}>
                  <h3 className="font-medium">{title}</h3>
                  <p className="mt-2 max-w-prose text-sm text-muted-foreground">{body}</p>
                </li>
              ))}
            </ol>
          </section>
        )}
      <InvitationsList
        invitations={invitations}
        isPending={isInvitationPending}
        onAccept={handleAcceptInvitation}
        onDecline={handleDeclineInvitation}
      />

      {!isLoadingTeams && (
        <TeamsList
          isArchivePending={isArchivePending}
          onArchive={(team) => {
            handleToggleArchive(team, true);
          }}
          onRequestDelete={setWorkspaceToDelete}
          teams={activeTeams}
        />
      )}

      {!isLoadingTeams && (
        <ArchivedTeamsList
          isArchivePending={isArchivePending}
          onRequestDelete={setWorkspaceToDelete}
          onUnarchive={(team) => {
            handleToggleArchive(team, false);
          }}
          teams={archivedTeams}
        />
      )}

      {workspaceToDelete && (
        <DeleteWorkspaceDialog
          onDeleted={handleWorkspaceDeleted}
          onOpenChange={(open) => {
            if (!open) {
              setWorkspaceToDelete(null);
            }
          }}
          open={workspaceToDelete !== null}
          spaceId={workspaceToDelete.spaceId}
          teamName={workspaceToDelete.teamName}
        />
      )}
    </>
  );
};

export { HomeLists };
