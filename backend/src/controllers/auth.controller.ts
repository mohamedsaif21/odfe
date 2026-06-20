import { Request, Response, NextFunction } from "express";
import * as authService from "../services/auth.service";
import { HTTP_STATUS } from "../constants";
import { ApiResponse } from "../interfaces";

const getClientIp = (req: Request): string | undefined => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket.remoteAddress;
};

const getUserAgent = (req: Request): string | undefined => {
  return req.headers["user-agent"];
};

const setRefreshTokenCookie = (res: Response, refreshToken: string): void => {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export const signup = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await authService.signup(
      req.body,
      getClientIp(req),
      getUserAgent(req)
    );

    setRefreshTokenCookie(res, result.refreshToken);

    const response: ApiResponse = {
      success: true,
      message: "User registered successfully",
      data: result,
    };

    res.status(HTTP_STATUS.CREATED).json(response);
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await authService.login(
      req.body,
      getClientIp(req),
      getUserAgent(req)
    );

    setRefreshTokenCookie(res, result.refreshToken);

    const response: ApiResponse = {
      success: true,
      message: "Login successful",
      data: result,
    };

    res.status(HTTP_STATUS.OK).json(response);
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const body = {
      refreshToken: req.body.refreshToken || req.cookies?.refreshToken,
    };

    const result = await authService.refreshToken(
      body,
      getClientIp(req),
      getUserAgent(req)
    );

    setRefreshTokenCookie(res, result.refreshToken);

    const response: ApiResponse = {
      success: true,
      message: "Token refreshed successfully",
      data: result,
    };

    res.status(HTTP_STATUS.OK).json(response);
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;

    await authService.logout(
      userId,
      refreshToken,
      getClientIp(req),
      getUserAgent(req)
    );

    res.clearCookie("refreshToken", { path: "/api/auth" });

    const response: ApiResponse = {
      success: true,
      message: "Logged out successfully",
    };

    res.status(HTTP_STATUS.OK).json(response);
  } catch (error) {
    next(error);
  }
};

export const logoutAll = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;

    await authService.logoutAll(
      userId,
      getClientIp(req),
      getUserAgent(req)
    );

    res.clearCookie("refreshToken", { path: "/api/auth" });

    const response: ApiResponse = {
      success: true,
      message: "Logged out from all devices successfully",
    };

    res.status(HTTP_STATUS.OK).json(response);
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await authService.forgotPassword(
      req.body,
      getClientIp(req),
      getUserAgent(req)
    );

    const response: ApiResponse = {
      success: true,
      message: result.message,
    };

    res.status(HTTP_STATUS.OK).json(response);
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await authService.resetPassword(
      req.body,
      getClientIp(req),
      getUserAgent(req)
    );

    const response: ApiResponse = {
      success: true,
      message: result.message,
    };

    res.status(HTTP_STATUS.OK).json(response);
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;

    const result = await authService.changePassword(
      userId,
      req.body,
      getClientIp(req),
      getUserAgent(req)
    );

    const response: ApiResponse = {
      success: true,
      message: result.message,
    };

    res.status(HTTP_STATUS.OK).json(response);
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const profile = await authService.getProfile(userId);

    const response: ApiResponse = {
      success: true,
      message: "Profile retrieved successfully",
      data: profile,
    };

    res.status(HTTP_STATUS.OK).json(response);
  } catch (error) {
    next(error);
  }
};

export const customerToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await authService.customerToken(
      req.body,
      getClientIp(req),
      getUserAgent(req)
    );

    const response: ApiResponse = {
      success: true,
      message: "Customer session created",
      data: result,
    };

    res.status(HTTP_STATUS.OK).json(response);
  } catch (error) {
    next(error);
  }
};
