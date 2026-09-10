import { describe, expect, it, vi } from "vitest";

import { createTestTeamRecord, VALID_UUID } from "./actions/test-helpers";
import { applyTeamContents, type TeamStoreDeps, writeTeamRecord } from "./team-store";

const setup = () => {
  const deps: TeamStoreDeps = {
    createId: () => VALID_UUID,
    isRedisConfigured: () => true,
    publishTeamEvent: vi.fn<TeamStoreDeps["publishTeamEvent"]>().mockResolvedValue(),
    readTeamJson: () => Promise.resolve(null),
    readTeamSummariesFromPostgres: () => Promise.resolve(new Map()),
    reportError: vi.fn<() => void>(),
    set: vi.fn<TeamStoreDeps["set"]>().mockResolvedValue(),
    writeTeamMirror: vi.fn<TeamStoreDeps["writeTeamMirror"]>().mockResolvedValue(),
  };
  return deps;
};

describe("team write notifications", () => {
  it("publishes after the Redis write, including when the mirror fails", async () => {
    const deps = setup();
    vi.mocked(deps.writeTeamMirror).mockRejectedValue(new Error("postgres unavailable"));
    await writeTeamRecord(VALID_UUID, createTestTeamRecord(), 100, deps);
    expect(deps.publishTeamEvent).toHaveBeenCalledExactlyOnceWith(VALID_UUID, "contents");
    expect(deps.set).toHaveBeenCalledBefore(vi.mocked(deps.publishTeamEvent));
    expect(deps.reportError).toHaveBeenCalledTimes(1);
  });

  it("never publishes for a failed write or no-op mutation", async () => {
    const deps = setup();
    vi.mocked(deps.set).mockRejectedValue(new Error("redis unavailable"));
    await expect(writeTeamRecord(VALID_UUID, createTestTeamRecord(), 100, deps)).rejects.toThrow(
      "redis unavailable",
    );
    await applyTeamContents(
      VALID_UUID,
      () => ({ ok: true, team: null, value: undefined }),
      100,
      deps,
    );
    expect(deps.publishTeamEvent).not.toHaveBeenCalled();
  });
});
