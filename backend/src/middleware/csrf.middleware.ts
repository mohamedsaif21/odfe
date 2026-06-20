import { Request, Response, NextFunction } from "express";
import { generateCsrfToken } from "../utils/crypto";
import { AppError } from "../utils/errors";

const CSRF_COOKIE_NAME = "csrf-token";
const CSRF_HEADER_NAME = "x-csrf-token";

const isCsrfSafeMethod = (method: string): boolean => {
  return ["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
};

export const csrfProtection = (req: Request, _res: Response, next: NextFunction): void => {
  if (isCsrfSafeMethod(req.method)) {
    next();
    return;
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME] as string;

  if (!cookieToken || !headerToken) {
    next(new AppError(403, "CSRF token missing."));
    return;
  }

  if (cookieToken !== headerToken) {
    next(new AppError(403, "CSRF token mismatch."));
    return;
  }

  next();
};

export const setCsrfCookie = (_req: Request, res: Response, next: NextFunction): void => {
  const token = generateCsrfToken();
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });
  next();
};
