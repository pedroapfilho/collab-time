// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";

import { GET as getImage } from "./route";

vi.mock("@/lib/app-url", () => ({ getAppUrl: () => "https://collabtime.io" }));
vi.mock("@/lib/observability", () => ({ log: { warn: vi.fn() } }));

afterEach(() => {
  vi.unstubAllGlobals();
});

it("returns a cacheable PNG when remote fonts fail", async () => {
  vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockRejectedValue(new Error("Fonts blocked")));
  const response = await getImage();
  expect(response.headers.get("Content-Type")).toContain("image/png");
  expect(response.headers.get("Cache-Control")).toContain("max-age=86400");
  const bytes = new Uint8Array(await response.arrayBuffer());
  expect(bytes.slice(0, 8)).toEqual(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]));
});
