import { expect, it } from "vitest";

import { formatExpiresIn } from "./invitation-expiry";

it("formats null, expiry boundaries, hours and days", () => {
  const now = new Date("2026-09-10T12:00:00Z");
  expect(formatExpiresIn(null, now)).toBeNull();
  expect(formatExpiresIn(now.toISOString(), now)).toBe("Expired");
  expect(formatExpiresIn("2026-09-10T13:00:00Z", now)).toBe("Expires today");
  expect(formatExpiresIn("2026-09-12T12:00:00Z", now)).toBe("Expires in 2 days");
});
