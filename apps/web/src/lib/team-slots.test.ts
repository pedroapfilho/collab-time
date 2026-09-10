import { describe, expect, it, vi } from "vitest";

import { createTestMember, createTestTeamRecord } from "./actions/test-helpers";
import { planSlotClaim } from "./team-slots";

describe("slot claims", () => {
  it("claims an existing unowned slot preserving timezone and hours", () => {
    const team = createTestTeamRecord({ members: [createTestMember({ id: "slot" })] });
    const result = planSlotClaim(team, { memberId: "slot", name: "Bob", userId: "bob" });
    expect(result).toMatchObject({ ok: true, value: { created: false, memberId: "slot" } });
    expect(team.members[0]).toMatchObject({
      name: "Alice",
      timezone: "America/New_York",
      userId: "bob",
    });
  });
  it("retries as a no-write no-op even when the target changed", () => {
    const team = createTestTeamRecord({
      members: [createTestMember({ id: "owned", userId: "bob" })],
    });
    const create = vi.fn();
    expect(
      planSlotClaim(team, { memberId: "missing", name: "Bob", userId: "bob" }, create),
    ).toEqual({ ok: true, team: null, value: { created: false, memberId: "owned" } });
    expect(create).not.toHaveBeenCalled();
  });
  it.each([
    { members: [] },
    { members: [createTestMember({ id: "target", userId: "someone-else" })] },
  ])("creates a fallback without taking another profile", ({ members }) => {
    const team = createTestTeamRecord({ members: [...members] });
    const result = planSlotClaim(
      team,
      { memberId: "target", name: "Bob", userId: "bob" },
      (overrides) => createTestMember({ ...overrides, id: "replacement" }),
    );
    expect(result).toMatchObject({ ok: true, value: { created: true, memberId: "replacement" } });
    expect(team.members.at(-1)).toMatchObject({ name: "Bob", userId: "bob" });
  });
  it("enforces the cap on fallback creation while allowing an existing claim", () => {
    const team = createTestTeamRecord({
      members: Array.from({ length: 200 }, (_, index) => createTestMember({ id: String(index) })),
    });
    expect(planSlotClaim(team, { name: "Bob", userId: "bob" }).ok).toBe(false);
    expect(planSlotClaim(team, { memberId: "0", name: "Bob", userId: "bob" }).ok).toBe(true);
  });
});
