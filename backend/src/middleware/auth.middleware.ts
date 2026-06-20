import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { findUserById } from "../repositories/user.repository";
import { AppError } from "../utils/errors";
import { IJWTPayload, Role } from "../interfaces";

declare global {
  namespace Express {
    interface Request {
      user?: IJWTPayload;
    }
  }
}

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError(401, "Access denied. No token provided.");
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);

    const user = await findUserById(decoded.id);
    if (!user) {
      throw new AppError(401, "Invalid token. User not found.");
    }

    if (!user.isActive) {
      throw new AppError(403, "Account is deactivated.");
    }

    if (user.isArchived) {
      throw new AppError(403, "Account is archived.");
    }

    if (decoded.tokenVersion !== user.refreshTokenVersion) {
      throw new AppError(401, "Token has been revoked. Please login again.");
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError(401, "Invalid or expired token."));
    }
  }
};

export const authorize = (...roles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, "Access denied. No token provided."));
      return;
    }

    if (!roles.includes(req.user.role as Role)) {
      next(new AppError(403, "Access denied. Insufficient permissions."));
      return;
    }

    next();
  };
};

export const authorizeAdmin = authorize(Role.ADMIN);
export const authorizeEmployee = authorize(Role.EMPLOYEE);
export const authorizeCustomer = authorize(Role.CUSTOMER);

export const authorizeRoles = (...roles: Role[]) => authorize(...roles);
