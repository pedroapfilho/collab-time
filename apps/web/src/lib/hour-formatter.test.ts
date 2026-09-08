import { describe, expect, it } from "vitest";

import { getHourFormatter } from "./hour-formatter";

describe("hour formatter", () => {
  it("reuses the formatter across renders and component instances", () => {
    expect(getHourFormatter("America/New_York")).toBe(getHourFormatter("America/New_York"));
  });

  it("keeps different timezones independent and honors daylight savings", () => {
    const newYork = getHourFormatter("America/New_York");
    const london = getHourFormatter("Europe/London");
    expect(newYork).not.toBe(london);
    expect(newYork.format(new Date("2026-01-15T15:00:00Z"))).toBe("10");
    expect(newYork.format(new Date("2026-07-15T15:00:00Z"))).toBe("11");
    expect(london.format(new Date("2026-07-15T15:00:00Z"))).toBe("16");
  });
});
