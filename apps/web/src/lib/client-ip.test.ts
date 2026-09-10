import { expect, it } from "vitest";

import { getClientIp } from "./client-ip";

it.each([
  [" 192.0.2.1, 192.0.2.2", "192.0.2.1"],
  ["", "unknown"],
  [",192.0.2.1", "unknown"],
])("reads the first forwarded address from %s", (forwarded, expected) => {
  expect(
    getClientIp(new Request("http://localhost", { headers: { "x-forwarded-for": forwarded } })),
  ).toBe(expected);
});

it("handles a missing proxy header", () => {
  expect(getClientIp(new Request("http://localhost"))).toBe("unknown");
});
