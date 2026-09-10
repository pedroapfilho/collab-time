import { describe, expect, it } from "vitest";

import {
  invitationExpiryFrom,
  inviteLink,
  isInvitationOpen,
  maskEmail,
  openInvitationWhere,
} from "./invitations";

const now = new Date("2026-09-10T12:00:00Z");
describe("invitation lifecycle", () => {
  it("opens pending legacy rows and future expiry only", () => {
    expect(isInvitationOpen({ expiresAt: null, status: "PENDING" }, now)).toBe(true);
    expect(isInvitationOpen({ expiresAt: now, status: "PENDING" }, now)).toBe(false);
    expect(isInvitationOpen({ expiresAt: invitationExpiryFrom(now), status: "REVOKED" }, now)).toBe(
      false,
    );
    expect(openInvitationWhere(now)).toEqual({
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      status: "PENDING",
    });
  });
  it("expires after exactly fourteen days", () => {
    expect(invitationExpiryFrom(now).toISOString()).toBe("2026-09-24T12:00:00.000Z");
  });
  it("masks recipient names and creates an invitation hint", () => {
    expect(maskEmail("pedro@x.io")).toBe("p***@x.io");
    expect(inviteLink("https://app.example.com/", "team", "invite")).toBe(
      "https://app.example.com/team?invite=invite",
    );
  });
});
