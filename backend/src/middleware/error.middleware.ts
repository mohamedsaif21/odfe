import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/errors";
import { HTTP_STATUS } from "../constants";
import { ApiResponse } from "../interfaces";

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    const response: ApiResponse = {
      success: false,
      message: err.message,
    };

    res.status(err.statusCode).json(response);
    return;
  }

  if (err instanceof ZodError) {
    const errors: Record<string, string[]> = {};
    err.errors.forEach((zodErr) => {
      const field = zodErr.path.join(".");
      if (!errors[field]) {
        errors[field] = [];
      }
      errors[field].push(zodErr.message);
    });

    res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json({
      success: false,
      message: "Validation failed",
      errors,
    });
    return;
  }

  console.error("Unhandled error:", err);

  const response: ApiResponse = {
    success: false,
    message: "Internal server error",
  };

  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(response);
};
