import prisma from "../database";
import { PASSWORD_RESET_EXPIRES_IN } from "../constants";

export const createPasswordResetToken = async (tokenHash: string, userId: string): Promise<void> => {
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRES_IN);

  await prisma.passwordResetToken.create({
    data: {
      tokenHash,
      userId,
      expiresAt,
    },
  });
};

export const findPasswordResetTokenByHash = async (tokenHash: string) => {
  return prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
};

export const markPasswordResetTokenAsUsed = async (id: string): Promise<void> => {
  await prisma.passwordResetToken.update({
    where: { id },
    data: { usedAt: new Date() },
  });
};

export const revokeAllUserPasswordResetTokens = async (userId: string): Promise<void> => {
  await prisma.passwordResetToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });
};
