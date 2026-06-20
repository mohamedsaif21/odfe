import { Role } from "@prisma/client";
import {
  SignupDTO,
  LoginDTO,
  RefreshTokenDTO,
  ForgotPasswordDTO,
  ResetPasswordDTO,
  ChangePasswordDTO,
  CustomerTokenDTO,
} from "../dto/auth.dto";
import { IAuthResponse } from "../interfaces";
import * as userRepository from "../repositories/user.repository";
import * as refreshTokenRepository from "../repositories/refresh-token.repository";
import * as passwordResetTokenRepository from "../repositories/password-reset-token.repository";
import * as auditLogRepository from "../repositories/audit-log.repository";
import { hashPassword, comparePassword } from "../utils/password";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt";
import { hashToken, generateSecureToken } from "../utils/crypto";
import { AppError } from "../utils/errors";
import { config } from "../config";
import { AUDIT_ACTIONS } from "../constants";

const getRedirectForRole = (role: Role): string => {
  switch (role) {
    case Role.ADMIN:
      return "/dashboard";
    case Role.EMPLOYEE:
      return "/pos";
    case Role.CUSTOMER:
      return "/self-order";
    default:
      return "/login";
  }
};

const writeAuditLog = async (
  userId: string,
  action: string,
  details?: Record<string, unknown>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> => {
  try {
    await auditLogRepository.createAuditLog({
      userId,
      action,
      details,
      ipAddress,
      userAgent,
    });
  } catch {
    // Silently fail - audit logging should never break the main flow
  }
};

export const signup = async (
  data: SignupDTO,
  ipAddress?: string,
  userAgent?: string
): Promise<IAuthResponse> => {
  const existingUser = await userRepository.findUserByEmail(
    data.email.toLowerCase().trim()
  );

  if (existingUser) {
    throw new AppError(409, "Email already exists");
  }

  const hashedPassword = await hashPassword(data.password);
  const user = await userRepository.createUser(data, hashedPassword, Role.ADMIN);

  const accessToken = generateAccessToken({
    id: user.id,
    email: user.email,
    role: user.role as Role,
    tokenVersion: user.refreshTokenVersion,
  });

  const rawRefreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(rawRefreshToken);
  await refreshTokenRepository.createRefreshToken(refreshTokenHash, user.id);

  await writeAuditLog(
    user.id,
    AUDIT_ACTIONS.SIGNUP,
    { email: user.email, role: user.role },
    ipAddress,
    userAgent
  );

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    accessToken,
    refreshToken: rawRefreshToken,
    redirect: getRedirectForRole(user.role as Role),
  };
};

export const login = async (
  data: LoginDTO,
  ipAddress?: string,
  userAgent?: string
): Promise<IAuthResponse> => {
  const normalizedEmail = data.email.toLowerCase().trim();
  const user = await userRepository.findUserByEmail(normalizedEmail);

  if (!user) {
    throw new AppError(401, "Invalid email or password");
  }

  if (!user.isActive) {
    throw new AppError(403, "Account is deactivated. Contact an administrator.");
  }

  if (user.isArchived) {
    throw new AppError(403, "Account is archived.");
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const remainingMinutes = Math.ceil(
      (user.lockedUntil.getTime() - Date.now()) / 60000
    );
    throw new AppError(
      423,
      `Account is locked. Try again in ${remainingMinutes} minute(s).`
    );
  }

  const isPasswordValid = await comparePassword(data.password, user.password);

  if (!isPasswordValid) {
    const updatedUser = await userRepository.incrementFailedLoginAttempts(user.id);
    const maxAttempts = config.maxFailedLoginAttempts;

    await writeAuditLog(
      user.id,
      AUDIT_ACTIONS.FAILED_LOGIN,
      { attempt: updatedUser.failedLoginAttempts, maxAttempts },
      ipAddress,
      userAgent
    );

    if (updatedUser.failedLoginAttempts >= maxAttempts) {
      const lockDuration = config.lockDurationMinutes;
      const lockedUntil = new Date(Date.now() + lockDuration * 60 * 1000);
      await userRepository.lockUser(user.id, lockedUntil);

      await writeAuditLog(
        user.id,
        AUDIT_ACTIONS.ACCOUNT_LOCKED,
        { lockedUntil, failedAttempts: updatedUser.failedLoginAttempts },
        ipAddress,
        userAgent
      );

      throw new AppError(
        423,
        `Account locked due to ${maxAttempts} failed login attempts. Try again in ${lockDuration} minute(s).`
      );
    }

    throw new AppError(401, "Invalid email or password");
  }

  await userRepository.updateLastLogin(user.id);

  const accessToken = generateAccessToken({
    id: user.id,
    email: user.email,
    role: user.role as Role,
    tokenVersion: user.refreshTokenVersion,
  });

  const rawRefreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(rawRefreshToken);
  await refreshTokenRepository.createRefreshToken(refreshTokenHash, user.id);
  await refreshTokenRepository.cleanExpiredRefreshTokens();

  await writeAuditLog(
    user.id,
    AUDIT_ACTIONS.LOGIN,
    { email: user.email, role: user.role },
    ipAddress,
    userAgent
  );

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    accessToken,
    refreshToken: rawRefreshToken,
    redirect: getRedirectForRole(user.role as Role),
  };
};

export const refreshToken = async (
  data: RefreshTokenDTO,
  ipAddress?: string,
  userAgent?: string
): Promise<IAuthResponse> => {
  const tokenHash = hashToken(data.refreshToken);
  const storedToken = await refreshTokenRepository.findRefreshTokenByHash(tokenHash);

  if (!storedToken) {
    throw new AppError(401, "Invalid refresh token.");
  }

  if (storedToken.revokedAt) {
    await refreshTokenRepository.revokeAllUserRefreshTokens(storedToken.userId);
    await userRepository.incrementRefreshTokenVersion(storedToken.userId);
    throw new AppError(401, "Refresh token has been revoked. All sessions invalidated.");
  }

  if (storedToken.expiresAt < new Date()) {
    throw new AppError(401, "Refresh token has expired. Please login again.");
  }

  await refreshTokenRepository.revokeRefreshToken(storedToken.id);

  const user = storedToken.user;

  if (!user.isActive) {
    throw new AppError(403, "Account is deactivated.");
  }

  if (user.isArchived) {
    throw new AppError(403, "Account is archived.");
  }

  const accessToken = generateAccessToken({
    id: user.id,
    email: user.email,
    role: user.role as Role,
    tokenVersion: user.refreshTokenVersion,
  });

  const rawRefreshToken = generateRefreshToken();
  const newTokenHash = hashToken(rawRefreshToken);
  await refreshTokenRepository.createRefreshToken(newTokenHash, user.id);

  await writeAuditLog(
    user.id,
    AUDIT_ACTIONS.REFRESH_TOKEN,
    {},
    ipAddress,
    userAgent
  );

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    accessToken,
    refreshToken: rawRefreshToken,
    redirect: getRedirectForRole(user.role as Role),
  };
};

export const logout = async (
  userId: string,
  refreshToken?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> => {
  if (refreshToken) {
    const tokenHash = hashToken(refreshToken);
    const storedToken = await refreshTokenRepository.findRefreshTokenByHash(tokenHash);

    if (storedToken && !storedToken.revokedAt) {
      await refreshTokenRepository.revokeRefreshToken(storedToken.id);
    }
  }

  await writeAuditLog(
    userId,
    AUDIT_ACTIONS.LOGOUT,
    {},
    ipAddress,
    userAgent
  );
};

export const logoutAll = async (
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> => {
  await refreshTokenRepository.revokeAllUserRefreshTokens(userId);
  await userRepository.incrementRefreshTokenVersion(userId);

  await writeAuditLog(
    userId,
    AUDIT_ACTIONS.LOGOUT_ALL,
    {},
    ipAddress,
    userAgent
  );
};

export const forgotPassword = async (
  data: ForgotPasswordDTO,
  ipAddress?: string,
  userAgent?: string
): Promise<{ message: string }> => {
  const normalizedEmail = data.email.toLowerCase().trim();
  const user = await userRepository.findUserByEmail(normalizedEmail);

  if (!user) {
    return { message: "If an account with that email exists, a password reset link has been sent." };
  }

  const resetToken = generateSecureToken(48);
  const tokenHash = hashToken(resetToken);

  await passwordResetTokenRepository.revokeAllUserPasswordResetTokens(user.id);
  await passwordResetTokenRepository.createPasswordResetToken(tokenHash, user.id);

  await writeAuditLog(
    user.id,
    AUDIT_ACTIONS.FORGOT_PASSWORD,
    { email: user.email },
    ipAddress,
    userAgent
  );

  return { message: "If an account with that email exists, a password reset link has been sent." };
};

export const resetPassword = async (
  data: ResetPasswordDTO,
  ipAddress?: string,
  userAgent?: string
): Promise<{ message: string }> => {
  const tokenHash = hashToken(data.token);
  const storedToken = await passwordResetTokenRepository.findPasswordResetTokenByHash(tokenHash);

  if (!storedToken) {
    throw new AppError(400, "Invalid or expired reset token.");
  }

  if (storedToken.usedAt) {
    throw new AppError(400, "Reset token has already been used.");
  }

  if (storedToken.expiresAt < new Date()) {
    throw new AppError(400, "Reset token has expired. Please request a new one.");
  }

  const hashedPassword = await hashPassword(data.password);
  await userRepository.updateUser(storedToken.userId, { password: hashedPassword });
  await passwordResetTokenRepository.markPasswordResetTokenAsUsed(storedToken.id);
  await refreshTokenRepository.revokeAllUserRefreshTokens(storedToken.userId);
  await userRepository.incrementRefreshTokenVersion(storedToken.userId);

  await writeAuditLog(
    storedToken.userId,
    AUDIT_ACTIONS.RESET_PASSWORD,
    {},
    ipAddress,
    userAgent
  );

  return { message: "Password has been reset successfully. Please login with your new password." };
};

export const changePassword = async (
  userId: string,
  data: ChangePasswordDTO,
  ipAddress?: string,
  userAgent?: string
): Promise<{ message: string }> => {
  const user = await userRepository.findUserById(userId);

  if (!user) {
    throw new AppError(404, "User not found.");
  }

  const isCurrentPasswordValid = await comparePassword(data.currentPassword, user.password);

  if (!isCurrentPasswordValid) {
    throw new AppError(400, "Current password is incorrect.");
  }

  const hashedPassword = await hashPassword(data.newPassword);
  await userRepository.updateUser(userId, { password: hashedPassword });
  await refreshTokenRepository.revokeAllUserRefreshTokens(userId);
  await userRepository.incrementRefreshTokenVersion(userId);

  await writeAuditLog(
    userId,
    AUDIT_ACTIONS.CHANGE_PASSWORD,
    {},
    ipAddress,
    userAgent
  );

  return { message: "Password changed successfully. Please login again." };
};

export const getProfile = async (userId: string) => {
  const user = await userRepository.findUserById(userId);

  if (!user) {
    throw new AppError(404, "User not found.");
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    emailVerified: user.emailVerified,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
  };
};

export const customerToken = async (
  data: CustomerTokenDTO,
  _ipAddress?: string,
  _userAgent?: string
): Promise<{ accessToken: string; role: string; redirect: string }> => {
  if (!data.tableToken || data.tableToken.length < 8) {
    throw new AppError(400, "Invalid table token.");
  }

  const accessToken = generateAccessToken({
    id: `customer-${data.tableToken}`,
    email: `guest@table-${data.tableToken}`,
    role: Role.CUSTOMER,
    tokenVersion: 0,
  });

  return {
    accessToken,
    role: Role.CUSTOMER,
    redirect: "/self-order",
  };
};
