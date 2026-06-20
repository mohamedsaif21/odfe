import { Role } from "@prisma/client";

export { Role };

export interface IUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  isActive: boolean;
  isArchived: boolean;
  emailVerified: boolean;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  refreshTokenVersion: number;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserWithoutPassword extends Omit<IUser, "password"> { }

export interface IAuthResponse {
  id: string;
  name: string;
  email: string;
  role: Role;
  accessToken: string;
  refreshToken: string;
  redirect: string;
}

export interface ISignupRequest {
  name: string;
  email: string;
  password: string;
}

export interface ILoginRequest {
  email: string;
  password: string;
}

export interface IJWTPayload {
  id: string;
  email: string;
  role: Role;
  sessionId: string;
  tokenVersion: number;
  iat?: number;
  exp?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

export interface IRefreshTokenPayload {
  id: string;
  tokenVersion: number;
}

export interface ICustomerSession {
  tableToken: string;
  tableId: string;
  floorId: string;
}
