"use client";

import { AnimatePresence, motion, Reorder } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import type { Team, TeamMember } from "@/types";
import { AddMemberForm } from "@/components/add-member-form";
import { MemberCard } from "@/components/member-card";
import { TimezoneVisualizer } from "@/components/timezone-visualizer";
import { useVisitedTeams } from "@/hooks/use-visited-teams";
import { useRealtime } from "@/lib/realtime-client";
import { reorderMembers as reorderMembersAction } from "@/lib/actions";

type TeamPageClientProps = {
  team: Team;
};

const TeamPageClient = ({ team }: TeamPageClientProps) => {
  const [members, setMembers] = useState<TeamMember[]>(team.members);
  const [, startTransition] = useTransition();
  const [hasCopied, setHasCopied] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const { saveVisitedTeam, getTeamName, updateTeamName } = useVisitedTeams();
  const [teamName, setTeamName] = useState(() => getTeamName(team.id));
  const lastRemovalRef = useRef<{ id: string; ts: number }>({ id: "", ts: 0 });

  // Subscribe to realtime events for this team
  useRealtime({
    channels: [`team-${team.id}`],
    events: [
      "team.memberAdded",
      "team.memberRemoved",
      "team.memberUpdated",
      "team.membersReordered",
    ],
    onData({ event, data }) {
      if (event === "team.memberAdded") {
        const newMember = data as TeamMember;
        setMembers((prev) => {
          // Avoid duplicates (in case the current user added the member)
          if (prev.some((m) => m.id === newMember.id)) {
            return prev;
          }
          return [...prev, newMember];
        });
        toast.success(`${newMember.name} joined the team`);
      } else if (event === "team.memberRemoved") {
        const { memberId } = data as { memberId: string };

        // Dedupe rapid double-deliveries of the same removal event
        if (
          lastRemovalRef.current.id === memberId &&
          Date.now() - lastRemovalRef.current.ts < 1500
        ) {
          return;
        }

        setMembers((prev) => {
          const member = prev.find((m) => m.id === memberId);
          if (member) {
            lastRemovalRef.current = { id: memberId, ts: Date.now() };
            toast.success(`${member.name} left the team`);
          }
          return prev.filter((m) => m.id !== memberId);
        });
      } else if (event === "team.memberUpdated") {
        const updatedMember = data as TeamMember;
        setMembers((prev) =>
          prev.map((m) => (m.id === updatedMember.id ? updatedMember : m))
        );
      } else if (event === "team.membersReordered") {
        const { order } = data as { order: string[] };
        setMembers((prev) => {
          const map = new Map(prev.map((m) => [m.id, m]));
          return order.map((id) => map.get(id)).filter(Boolean) as TeamMember[];
        });
      }
    },
  });

  // Save team to visited teams on mount and when members change
  useEffect(() => {
    saveVisitedTeam(team.id, members.length);
  }, [team.id, members.length, saveVisitedTeam]);

  const handleSaveName = () => {
    updateTeamName(team.id, teamName.trim());
    setIsEditingName(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveName();
    } else if (e.key === "Escape") {
      setTeamName(getTeamName(team.id));
      setIsEditingName(false);
    }
  };

  // Members are already ordered from the server; derive array for UI
  const orderedMembers = useMemo(() => members, [members]);

  const handleReorder = (newOrder: TeamMember[]) => {
    const previous = members;
    const newOrderIds = newOrder.map((m) => m.id);
    setMembers(newOrder);
    startTransition(async () => {
      const result = await reorderMembersAction(team.id, newOrderIds);
      if (!result.success) {
        toast.error(result.error);
        // revert on failure
        setMembers(previous);
      }
    });
  };

  // Callbacks for local state updates (realtime handles cross-user sync)
  const handleMemberAdded = useCallback((newMember: TeamMember) => {
    setMembers((prev) => {
      if (prev.some((m) => m.id === newMember.id)) {
        return prev;
      }
      return [...prev, newMember];
    });
  }, []);

  const handleMemberRemoved = useCallback((memberId: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
  }, []);

  const handleMemberUpdated = useCallback((updatedMember: TeamMember) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === updatedMember.id ? updatedMember : m))
    );
  }, []);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setHasCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setHasCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <motion.main
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto flex w-full max-w-4xl flex-col gap-8"
      >
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 transition-opacity hover:opacity-80 dark:bg-neutral-100"
                aria-label="Go to homepage"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-white dark:text-neutral-900"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                  <path d="M2 12h20" />
                </svg>
              </Link>
              {isEditingName ? (
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  placeholder="Team name…"
                  className="h-9 w-48 rounded-lg border border-neutral-200 bg-white px-3 text-lg font-bold tracking-tight text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:border-neutral-400 dark:focus:ring-neutral-400/20"
                />
              ) : (
                <button
                  onClick={() => setIsEditingName(true)}
                  className="group flex items-center gap-2 text-2xl font-bold tracking-tight"
                >
                  {teamName || "Team Workspace"}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-neutral-400 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
                    <path d="m15 5 4 4" />
                  </svg>
                </button>
              )}
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Share this page with your team to collaborate across timezones
            </p>
          </div>

          <button
            onClick={handleCopyLink}
            className="flex h-10 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-700 shadow-sm transition-all hover:border-neutral-300 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-700 dark:hover:bg-neutral-800 dark:focus-visible:ring-neutral-100 dark:focus-visible:ring-offset-neutral-950"
          >
            <AnimatePresence mode="wait">
              {hasCopied ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="text-green-600 dark:text-green-400"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </motion.div>
              ) : (
                <motion.div
                  key="copy"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                  </svg>
                </motion.div>
              )}
            </AnimatePresence>
            {hasCopied ? "Copied!" : "Copy Link"}
          </button>
        </header>

        {/* Timezone Visualizer */}
        {members.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="border-b border-neutral-100 px-6 py-4 dark:border-neutral-800">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-neutral-500"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Working Hours Overview
              </h2>
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                Times shown in your local timezone
              </p>
            </div>
            <div className="p-6">
              <TimezoneVisualizer members={orderedMembers} />
            </div>
          </motion.section>
        )}

        {/* Team Members */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col gap-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-neutral-500"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Team Members
            </h2>
            <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium tabular-nums text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
              {members.length}
            </span>
          </div>

          {members.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50/50 px-6 py-12 text-center dark:border-neutral-800 dark:bg-neutral-900/50">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-neutral-500"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" x2="19" y1="8" y2="14" />
                  <line x1="22" x2="16" y1="11" y2="11" />
                </svg>
              </div>
              <h3 className="mt-4 font-semibold text-neutral-900 dark:text-neutral-100">
                No team members yet
              </h3>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                Add yourself to get started!
              </p>
            </div>
          ) : members.length === 1 ? (
            <div className="flex flex-col gap-3">
              <MemberCard
                member={members[0]}
                teamId={team.id}
                onMemberRemoved={handleMemberRemoved}
                onMemberUpdated={handleMemberUpdated}
              />
            </div>
          ) : (
            <Reorder.Group
              as="div"
              axis="y"
              values={orderedMembers}
              onReorder={handleReorder}
              className="flex flex-col gap-3"
            >
              {orderedMembers.map((member) => (
                <Reorder.Item
                  as="div"
                  key={member.id}
                  value={member}
                  layout="position"
                  className="cursor-grab active:cursor-grabbing"
                  whileDrag={{
                    scale: 1.02,
                    boxShadow:
                      "0 10px 40px -10px rgba(0,0,0,0.15), 0 4px 12px -4px rgba(0,0,0,0.1)",
                    zIndex: 50,
                  }}
                >
                  <MemberCard
                    member={member}
                    teamId={team.id}
                    onMemberRemoved={handleMemberRemoved}
                    onMemberUpdated={handleMemberUpdated}
                  />
                </Reorder.Item>
              ))}
            </Reorder.Group>
          )}

          <AddMemberForm
            teamId={team.id}
            onMemberAdded={handleMemberAdded}
            isFirstMember={team.members.length === 0}
          />
        </motion.section>
      </motion.main>
    </div>
  );
};

export { TeamPageClient };
