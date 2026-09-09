"use client";

import { toast } from "@repo/ui/components/sonner";
import { Clock, FolderKanban, Users } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AddGroupDialog } from "@/components/add-group-dialog";
import { AddMemberDialog } from "@/components/add-member-dialog";
import { DeleteWorkspaceDialog } from "@/components/delete-workspace-dialog";
import { ImportMembersDialog } from "@/components/import-members-dialog";
import { JoinRequestsPanel } from "@/components/join-requests-panel";
import { Nav } from "@/components/nav";
import {
  SectionCard,
  SectionCardContent,
  SectionCardCount,
  SectionCardFooter,
  SectionCardHeader,
  SectionCardTitle,
} from "@/components/section-card";
import { TeamInsights } from "@/components/team-insights";
import { TimezoneVisualizer } from "@/components/timezone-visualizer";
import { WorkspaceVisibilityDialog } from "@/components/workspace-visibility-dialog";
import { useTeamMutation, useTeamQuery } from "@/hooks/use-team-query";
import type { TeamStatus } from "@/types";

import { GroupsGrid } from "./client/groups-grid";
import { JoinPrompt } from "./client/join-prompt";
import { MembersGrid } from "./client/members-grid";
import { useCollapsedGroups } from "./client/use-collapsed-groups";
import { useDragEnd } from "./client/use-drag-end";
import { useTeamMembership } from "./client/use-team-membership";
import { useTeamNameEdit } from "./client/use-team-name-edit";
import Loading from "./loading";
import { TeamUnavailable } from "./team-unavailable";

const DndWrapper = dynamic(
  async () => {
    const { DndWrapper: Component } = await import("./dnd-wrapper");
    return Component;
  },
  { ssr: false },
);

type TeamPageClientProps = {
  hasPassword?: boolean;
  invitationId?: string;
  isArchived: boolean;
  isAuthenticated: boolean;
  isPrivate: boolean;
  spaceId: string | null;
  teamId: string;
  teamStatus: TeamStatus;
  userId?: string;
};

type MembershipActionsProps = {
  invitationId?: string;
  isAdmin: boolean;
  isAuthenticated: boolean;
  isMember: boolean;
  isRequestingJoin: boolean;
  onRequestJoin: () => void;
  teamId: string;
  teamStatus: TeamStatus;
};

const MembershipActions = ({ isAdmin, isMember, ...props }: MembershipActionsProps) => {
  if (isAdmin) {
    return <JoinRequestsPanel teamId={props.teamId} />;
  }
  if (isMember) {
    return (
      <p className="text-center text-sm text-muted-foreground">You are a member of this team</p>
    );
  }
  return <JoinPrompt {...props} />;
};

const TeamPageClient = ({
  hasPassword = false,
  invitationId,
  isArchived,
  isAuthenticated,
  isPrivate,
  spaceId,
  teamId,
  teamStatus: initialStatus,
  userId,
}: TeamPageClientProps) => {
  const { push, refresh } = useRouter();
  const [isVisibilityOpen, setIsVisibilityOpen] = useState(false);
  const [savedVisibility, setSavedVisibility] = useState<{
    hasPassword: boolean;
    isPrivate: boolean;
  } | null>(null);
  const visibility = savedVisibility ?? { hasPassword, isPrivate };
  const [activeDragType, setActiveDragType] = useState<"group" | "member" | null>(null);
  const [isDeleteWorkspaceOpen, setIsDeleteWorkspaceOpen] = useState(false);

  const { data: teamData, error: teamError, isFetching, refetch } = useTeamQuery({ teamId });

  const teamMutation = useTeamMutation(teamId);

  useEffect(() => {
    if (teamError) {
      toast.error(teamError.message, { id: "team-query-error" });
      return;
    }
    toast.dismiss("team-query-error");
  }, [teamError]);

  const members = teamData?.team?.members ?? [];
  const groups = teamData?.team?.groups ?? [];

  const {
    currentUserId,
    handleRequestJoin,
    hasClaimedProfile,
    isAdmin,
    isMember,
    isRequestingJoin,
    teamStatus,
  } = useTeamMembership({ initialStatus, members, teamId, userId });

  const teamName = teamData?.team?.name ?? "";

  const {
    displayName,
    handleCancelEditName,
    handleSaveName,
    handleStartEditName,
    isEditingName,
    setEditingTeamName,
  } = useTeamNameEdit({ isAdmin, teamId, teamName });

  const { collapsedGroupIds, toggleGroupCollapse } = useCollapsedGroups(members);

  const orderedMembers = [...members].toSorted((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const orderedGroups = [...groups].toSorted((a, b) => a.order - b.order);

  const { handleDragEnd } = useDragEnd({
    groups,
    isAdmin,
    members,
    orderedGroups,
    orderedMembers,
    teamId,
    teamMutation,
  });

  const handleDragTypeChange = (dragType: "group" | "member" | null) => {
    setActiveDragType(dragType);
  };

  const isLoaded = Boolean(teamData?.team);

  const mainContent = (
    <div className="min-h-dvh w-full px-4 py-6 sm:px-6 lg:px-8 xl:px-12">
      <main className="mx-auto flex w-full max-w-450 flex-col gap-10" id="main">
        <Nav
          canDeleteWorkspace={spaceId !== null}
          isAdmin={isAdmin}
          isArchived={isArchived}
          isAuthenticated={isAuthenticated}
          isEditingName={isEditingName}
          isPrivate={visibility.isPrivate}
          onCancelEdit={handleCancelEditName}
          onDeleteWorkspace={() => {
            setIsDeleteWorkspaceOpen(true);
          }}
          onEditName={handleStartEditName}
          onEditVisibility={() => {
            setIsVisibilityOpen(true);
          }}
          onNameChange={setEditingTeamName}
          onSaveName={handleSaveName}
          teamName={displayName}
          variant="team"
        />

        {members.length > 0 && (
          <SectionCard>
            <SectionCardHeader bordered>
              <SectionCardTitle description="Times shown in your local timezone" icon={Clock}>
                Working hours
              </SectionCardTitle>
            </SectionCardHeader>
            <SectionCardContent>
              <TimezoneVisualizer
                collapsedGroupIds={collapsedGroupIds}
                groups={groups}
                members={orderedMembers}
                onToggleGroupCollapse={toggleGroupCollapse}
              />
            </SectionCardContent>
          </SectionCard>
        )}

        {members.length > 0 && <TeamInsights groups={groups} members={orderedMembers} />}

        <div className="grid grid-cols-1 items-start gap-10 xl:grid-cols-[1.4fr_0.6fr] [&>*]:min-w-0">
          <SectionCard>
            <SectionCardHeader>
              <SectionCardTitle icon={Users}>Team Members</SectionCardTitle>
              <SectionCardCount>{members.length}</SectionCardCount>
            </SectionCardHeader>
            <SectionCardContent className="flex flex-col gap-4">
              <MembersGrid
                currentUserId={currentUserId}
                groups={groups}
                hasClaimedProfile={hasClaimedProfile}
                isAdmin={isAdmin}
                orderedMembers={orderedMembers}
                teamId={teamId}
              />

              <MembershipActions
                invitationId={invitationId}
                isAdmin={isAdmin}
                isAuthenticated={isAuthenticated}
                isMember={isMember}
                isRequestingJoin={isRequestingJoin}
                onRequestJoin={() => {
                  void handleRequestJoin();
                }}
                teamId={teamId}
                teamStatus={teamStatus}
              />
            </SectionCardContent>
            {isAdmin && (
              <SectionCardFooter bordered className="justify-end">
                <ImportMembersDialog teamId={teamId} />
                <AddMemberDialog
                  groups={groups}
                  isFirstMember={members.length === 0}
                  teamId={teamId}
                />
              </SectionCardFooter>
            )}
          </SectionCard>

          <SectionCard>
            <SectionCardHeader>
              <SectionCardTitle icon={FolderKanban}>Groups</SectionCardTitle>
              <SectionCardCount>{groups.length}</SectionCardCount>
            </SectionCardHeader>
            <SectionCardContent>
              <GroupsGrid
                activeDragType={activeDragType}
                isAdmin={isAdmin}
                members={members}
                orderedGroups={orderedGroups}
                teamId={teamId}
              />
            </SectionCardContent>
            {isAdmin && (
              <SectionCardFooter bordered className="justify-end">
                <AddGroupDialog teamId={teamId} />
              </SectionCardFooter>
            )}
          </SectionCard>
        </div>
      </main>

      {spaceId !== null && isVisibilityOpen && (
        <WorkspaceVisibilityDialog
          hasPassword={visibility.hasPassword}
          isPrivate={visibility.isPrivate}
          onOpenChange={setIsVisibilityOpen}
          onSaved={(saved) => {
            setSavedVisibility(saved);
            refresh();
          }}
          open={isVisibilityOpen}
          spaceId={spaceId}
        />
      )}
      {spaceId !== null && (
        <DeleteWorkspaceDialog
          onDeleted={() => {
            push("/");
          }}
          onOpenChange={setIsDeleteWorkspaceOpen}
          open={isDeleteWorkspaceOpen}
          spaceId={spaceId}
          teamName={displayName}
        />
      )}
    </div>
  );

  if (teamError && !isLoaded) {
    return (
      <TeamUnavailable
        isRetrying={isFetching}
        message={teamError.message}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  if (!isLoaded) {
    return <Loading />;
  }

  if (!isAdmin) {
    return mainContent;
  }

  return (
    <DndWrapper
      groups={groups}
      hasClaimedProfile={hasClaimedProfile}
      members={members}
      onDragEnd={handleDragEnd}
      onDragTypeChange={handleDragTypeChange}
      teamId={teamId}
    >
      {mainContent}
    </DndWrapper>
  );
};

export { TeamPageClient };
