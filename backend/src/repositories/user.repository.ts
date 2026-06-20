import { User, Role } from "@prisma/client";
import prisma from "../database";
import { SignupDTO } from "../dto/auth.dto";

export const findUserByEmail = async (email: string): Promise<User | null> => {
  return prisma.user.findUnique({ where: { email } });
};

export const findUserById = async (id: string): Promise<User | null> => {
  return prisma.user.findUnique({ where: { id } });
};

export const createUser = async (
  data: SignupDTO,
  hashedPassword: string,
  role: Role = Role.ADMIN
): Promise<User> => {
  return prisma.user.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase().trim(),
      password: hashedPassword,
      role,
    },
  });
};

export const updateUser = async (
  id: string,
  data: Partial<Pick<User, "name" | "email" | "password" | "isActive" | "isArchived" | "emailVerified" | "failedLoginAttempts" | "lockedUntil" | "refreshTokenVersion" | "lastLogin">>
): Promise<User> => {
  return prisma.user.update({ where: { id }, data });
};

export const incrementFailedLoginAttempts = async (id: string): Promise<User> => {
  return prisma.user.update({
    where: { id },
    data: {
      failedLoginAttempts: { increment: 1 },
    },
  });
};

export const resetFailedLoginAttempts = async (id: string): Promise<User> => {
  return prisma.user.update({
    where: { id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });
};

export const lockUser = async (id: string, lockedUntil: Date): Promise<User> => {
  return prisma.user.update({
    where: { id },
    data: {
      lockedUntil,
    },
  });
};

export const updateLastLogin = async (id: string): Promise<User> => {
  return prisma.user.update({
    where: { id },
    data: {
      lastLogin: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });
};

export const incrementRefreshTokenVersion = async (id: string): Promise<User> => {
  return prisma.user.update({
    where: { id },
    data: {
      refreshTokenVersion: { increment: 1 },
    },
  });
};
