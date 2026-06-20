import prisma from "../database";
import { JWT_REFRESH_EXPIRES_IN } from "../constants";
import ms from "ms";

export const createRefreshToken = async (tokenHash: string, userId: string): Promise<void> => {
  const expiresInMs = ms(JWT_REFRESH_EXPIRES_IN);
  const expiresAt = new Date(Date.now() + expiresInMs);

  await prisma.refreshToken.create({
    data: {
      tokenHash,
      userId,
      expiresAt,
    },
  });
};

export const findRefreshTokenByHash = async (tokenHash: string) => {
  return prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
};

export const revokeRefreshToken = async (id: string): Promise<void> => {
  await prisma.refreshToken.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
};

export const revokeAllUserRefreshTokens = async (userId: string): Promise<void> => {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
};

export const cleanExpiredRefreshTokens = async (): Promise<void> => {
  await prisma.refreshToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { revokedAt: { not: null } },
      ],
    },
  });
};
