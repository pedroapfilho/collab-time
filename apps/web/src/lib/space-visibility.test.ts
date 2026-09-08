import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSpaceAccessToken } from "./space-access";
import { canAccessSpace } from "./space-visibility";

const getToken = vi.fn<(spaceId: string) => Promise<string | undefined>>();
const isMember = vi.fn<(teamId: string, userId: string) => Promise<boolean>>();
const store = { getToken, isMember };

const space = {
  accessPassword: "stored-password-hash",
  id: "space-1",
  isPrivate: true,
  teamId: "team-1",
};

describe("space visibility", () => {
  beforeEach(() => {
    vi.stubEnv("SPACE_ACCESS_SECRET", "test-space-secret-at-least-32-characters");
    getToken.mockReset();
    getToken.mockResolvedValue(undefined);
    isMember.mockReset();
    isMember.mockResolvedValue(false);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows public spaces without cookies or membership", async () => {
    expect(await canAccessSpace({ ...space, isPrivate: false }, undefined, store)).toBe(true);
    expect(getToken).not.toHaveBeenCalled();
    expect(isMember).not.toHaveBeenCalled();
  });

  it("denies unauthenticated guests without a valid access cookie", async () => {
    expect(await canAccessSpace(space, undefined, store)).toBe(false);
    expect(getToken).toHaveBeenCalledWith(space.id);
    expect(isMember).not.toHaveBeenCalled();
  });

  it("accepts a correctly signed space-scoped guest cookie", async () => {
    getToken.mockResolvedValue(createSpaceAccessToken(space.id, space.accessPassword));
    expect(await canAccessSpace(space, undefined, store)).toBe(true);
    expect(isMember).not.toHaveBeenCalled();
  });

  it("rejects cookies issued for another space or an old password", async () => {
    getToken.mockResolvedValue(createSpaceAccessToken("other-space", space.accessPassword));
    expect(await canAccessSpace(space, undefined, store)).toBe(false);
    getToken.mockResolvedValue(createSpaceAccessToken(space.id, "old-password-hash"));
    expect(await canAccessSpace(space, undefined, store)).toBe(false);
  });

  it("checks signed-in users against membership in the requested team", async () => {
    getToken.mockResolvedValue("invalid-token");
    expect(await canAccessSpace(space, "user-1", store)).toBe(false);
    expect(isMember).toHaveBeenCalledWith("team-1", "user-1");
    isMember.mockResolvedValue(true);
    expect(await canAccessSpace(space, "user-1", store)).toBe(true);
  });

  it("propagates membership failures instead of granting access", async () => {
    const failure = new Error("database unavailable");
    isMember.mockRejectedValue(failure);
    await expect(canAccessSpace(space, "user-1", store)).rejects.toBe(failure);
  });
});
