import { prisma } from "@repo/db";
import { cookies } from "next/headers";

import { SPACE_ACCESS_COOKIE_PREFIX, verifySpaceAccessToken } from "./space-access";

type SpaceAccess = {
  accessPassword: string | null;
  id: string;
  isPrivate: boolean;
  teamId: string;
};

type SpaceAccessStore = {
  getToken: (spaceId: string) => Promise<string | undefined>;
  isMember: (teamId: string, userId: string) => Promise<boolean>;
};

const spaceAccessStore: SpaceAccessStore = {
  getToken: async (spaceId) => {
    const cookieStore = await cookies();
    return cookieStore.get(`${SPACE_ACCESS_COOKIE_PREFIX}${spaceId}`)?.value;
  },
  isMember: async (teamId, userId) => {
    const membership = await prisma.membership.findUnique({
      where: { userId_teamId: { teamId, userId } },
    });
    return membership !== null;
  },
};

const canAccessSpace = async (
  space: SpaceAccess,
  userId: string | undefined,
  store: SpaceAccessStore = spaceAccessStore,
) => {
  if (!space.isPrivate) {
    return true;
  }
  const accessToken = await store.getToken(space.id);
  if (
    accessToken !== undefined &&
    accessToken !== "" &&
    verifySpaceAccessToken(accessToken, space.id, space.accessPassword).valid
  ) {
    return true;
  }
  if (userId === undefined) {
    return false;
  }
  return store.isMember(space.teamId, userId);
};

export { canAccessSpace };
export type { SpaceAccess, SpaceAccessStore };
