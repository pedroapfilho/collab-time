"use client";

import { motion } from "motion/react";
import { useMemo, useState, useSyncExternalStore } from "react";
import type { TeamMember } from "@/types";
import { convertHourToTimezone, getUserTimezone } from "@/lib/timezones";
import { formatHour } from "@/lib/utils";

type TimezoneVisualizerProps = {
  members: TeamMember[];
};

const getCurrentTimePosition = (timezone: string): number => {
  const now = new Date();
  const timeString = now.toLocaleString("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const [hours, minutes] = timeString.split(":").map(Number);
  return ((hours + minutes / 60) / 24) * 100;
};

const emptySubscribe = () => () => {};

const useClientValue = <T,>(clientValue: () => T, serverValue: T): T => {
  return useSyncExternalStore(emptySubscribe, clientValue, () => serverValue);
};

const TimezoneVisualizer = ({ members }: TimezoneVisualizerProps) => {
  const [selectedAId, setSelectedAId] = useState<string | null>(
    () => members[0]?.id ?? null,
  );
  const [selectedBId, setSelectedBId] = useState<string | null>(() => {
    const first = members[0]?.id;
    return members.find((m) => m.id !== first)?.id ?? null;
  });

  const [activeAId, activeBId] = useMemo(() => {
    const ids = members.map((m) => m.id);
    const aValid =
      selectedAId && ids.includes(selectedAId) ? selectedAId : (ids[0] ?? null);
    let bValid =
      selectedBId && ids.includes(selectedBId) && selectedBId !== aValid
        ? selectedBId
        : (ids.find((id) => id !== aValid) ?? null);
    if (bValid === aValid) {
      bValid = ids.find((id) => id !== aValid) ?? null;
    }
    return [aValid, bValid];
  }, [members, selectedAId, selectedBId]);

  const viewerTimezone = useClientValue(() => getUserTimezone(), "");
  const tick = useSyncExternalStore(
    (callback) => {
      // Update every 30 seconds instead of every second
      const interval = setInterval(callback, 30000);
      return () => clearInterval(interval);
    },
    () => Date.now(),
    () => 0,
  );

  const nowPosition = useMemo(() => {
    if (!viewerTimezone) return null;
    void tick;
    return getCurrentTimePosition(viewerTimezone);
  }, [viewerTimezone, tick]);

  const memberRows = useMemo(() => {
    if (!viewerTimezone) return [];

    return members.map((member) => {
      const hours = new Array(24).fill(false);
      const startInViewerTz = convertHourToTimezone(
        member.workingHoursStart,
        member.timezone,
        viewerTimezone,
      );
      const endInViewerTz = convertHourToTimezone(
        member.workingHoursEnd,
        member.timezone,
        viewerTimezone,
      );

      if (startInViewerTz <= endInViewerTz) {
        for (let h = startInViewerTz; h < endInViewerTz; h++) {
          hours[h] = true;
        }
      } else {
        for (let h = startInViewerTz; h < 24; h++) {
          hours[h] = true;
        }
        for (let h = 0; h < endInViewerTz; h++) {
          hours[h] = true;
        }
      }

      return { member, hours };
    });
  }, [members, viewerTimezone]);

  const selectedRowA = useMemo(
    () => memberRows.find((row) => row.member.id === activeAId),
    [memberRows, activeAId],
  );

  const selectedRowB = useMemo(
    () => memberRows.find((row) => row.member.id === activeBId),
    [memberRows, activeBId],
  );

  const selectedAHours = selectedRowA?.hours ?? new Array(24).fill(false);
  const selectedBHours = selectedRowB?.hours ?? new Array(24).fill(false);

  // Calculate overlap hours between selected pair
  const overlapHours = useMemo(() => {
    if (!selectedRowA || !selectedRowB) return new Array(24).fill(false);
    return new Array(24)
      .fill(false)
      .map((_, hour) => selectedAHours[hour] && selectedBHours[hour]);
  }, [selectedRowA, selectedRowB, selectedAHours, selectedBHours]);

  if (members.length === 0 || !viewerTimezone) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Time labels */}
      <div className="mt-3 flex items-center gap-3">
        <div className="w-28 shrink-0" />
        <div className="flex flex-1 justify-between px-0.5">
          {[0, 6, 12, 18, 23].map((hour) => (
            <span
              key={hour}
              className="text-xs tabular-nums text-neutral-400 dark:text-neutral-500"
            >
              {formatHour(hour)}
            </span>
          ))}
        </div>
      </div>

      {/* Member rows */}
      <div className="flex flex-col gap-3">
        {memberRows.map(({ member, hours }, index) => (
          <motion.div
            key={member.id}
            layout
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 30,
              delay: index * 0.05,
            }}
            className="flex items-center gap-3"
          >
            <div className="flex w-28 shrink-0 items-center gap-2 overflow-hidden">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white dark:bg-neutral-100 dark:text-neutral-900">
                {member.name.charAt(0).toUpperCase()}
              </div>
              <span className="truncate text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {member.name}
              </span>
            </div>

            <div className="relative flex flex-1 gap-px overflow-hidden rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
              {/* Current time indicator */}
              {nowPosition !== null && (
                <div
                  className="absolute bottom-0 top-0 z-20 w-0.5 rounded-full bg-red-500 shadow-sm"
                  style={{ left: `calc(${nowPosition}% + 4px)` }}
                >
                  <div className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-red-500" />
                </div>
              )}

              {/* Hour blocks */}
              {hours.map((isWorking, hour) => {
                const overlapsWithSelected =
                  activeAId &&
                  activeBId &&
                  [activeAId, activeBId].includes(member.id) &&
                  overlapHours[hour];
                return (
                  <div
                    key={hour}
                    className={`relative h-6 flex-1 transition-colors ${
                      hour === 0 ? "rounded-l" : hour === 23 ? "rounded-r" : ""
                    } ${
                      isWorking
                        ? "bg-neutral-900 dark:bg-neutral-100"
                        : "bg-neutral-200/50 dark:bg-neutral-700/50"
                    }`}
                    title={`${formatHour(hour)} - ${isWorking ? "Working" : "Off"}${
                      overlapsWithSelected ? " (overlaps with selected)" : ""
                    }`}
                  >
                    {overlapsWithSelected && (
                      <span className="absolute inset-0 bg-emerald-400/50 mix-blend-screen dark:bg-emerald-300/40" />
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Overlap indicator */}
      {members.length > 1 && (
        <div className="flex flex-col gap-4 border-t border-neutral-100 pt-4 dark:border-neutral-800">
          <div className="flex flex-col gap-3 rounded-xl bg-white dark:border-neutral-800 dark:bg-neutral-900 sm:flex-row sm:items-center sm:justify-between">
             <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2 sm:min-w-[180px]">
                <select
                  value={activeAId ?? ""}
                  onChange={(e) => setSelectedAId(e.target.value)}
                  className="h-10 w-full appearance-none rounded-md border border-neutral-200 bg-white bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23737373%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-size-4 bg-position-[right_12px_center] bg-no-repeat px-2 pr-8 text-sm font-semibold text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:border-neutral-400 dark:focus:ring-neutral-400/20"
                >
                  {members
                    .filter(
                      (member) =>
                        member.id === activeAId || member.id !== activeBId,
                    )
                    .map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex items-center gap-2 sm:min-w-[180px]">
                <select
                  value={activeBId ?? ""}
                  onChange={(e) => setSelectedBId(e.target.value)}
                  className="h-10 w-full appearance-none rounded-md border border-neutral-200 bg-white bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23737373%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-size-4 bg-position-[right_12px_center] bg-no-repeat px-2 pr-8 text-sm font-semibold text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:border-neutral-400 dark:focus:ring-neutral-400/20"
                >
                  {members
                    .filter(
                      (member) =>
                        member.id === activeBId || member.id !== activeAId,
                    )
                    .map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="text-xs text-neutral-600 dark:text-neutral-300 sm:min-w-40">
                Overlap:{" "}
                {(() => {
                  const start = overlapHours.findIndex(Boolean);
                  const end = overlapHours.lastIndexOf(true);
                  if (start === -1 || end === -1)
                    return "No overlap in your time";
                  const endExclusive = end + 1;
                  return `${formatHour(start)} – ${formatHour(endExclusive % 24)}`;
                })()}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex w-28 shrink-0 items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
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
                  className="text-neutral-600 dark:text-neutral-400"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Overlap
              </span>
            </div>

            <div className="relative flex flex-1 gap-px overflow-hidden rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
              {overlapHours.map((isOverlap, hour) => (
                <div
                  key={hour}
                  className={`h-6 flex-1 transition-colors ${
                    hour === 0 ? "rounded-l" : hour === 23 ? "rounded-r" : ""
                  } ${
                    isOverlap
                      ? "bg-neutral-600 dark:bg-neutral-400"
                      : "bg-neutral-200/50 dark:bg-neutral-700/50"
                  }`}
                  title={`${formatHour(hour)} - ${isOverlap ? "Everyone available" : "Not everyone available"}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-neutral-900 dark:bg-neutral-100" />
          <span>Working hours</span>
        </div>
        {members.length > 1 && (
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-neutral-600 dark:bg-neutral-400" />
            <span>Overlap</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center">
            <div className="h-3 w-0.5 rounded-full bg-red-500" />
            <div className="-ml-px h-1.5 w-1.5 rounded-full bg-red-500" />
          </div>
          <span>Current time</span>
        </div>
      </div>
    </div>
  );
};

export { TimezoneVisualizer };
