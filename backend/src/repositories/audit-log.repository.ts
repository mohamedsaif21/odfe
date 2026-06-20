import prisma from "../database";

export const createAuditLog = async (data: {
  userId: string;
  action: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> => {
  await prisma.auditLog.create({
    data: {
      userId: data.userId,
      action: data.action,
      details: data.details as any,
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent ?? null,
    },
  });
};
