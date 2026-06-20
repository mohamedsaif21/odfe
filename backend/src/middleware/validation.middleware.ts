import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { HTTP_STATUS } from "../constants";

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: Record<string, string[]> = {};
        error.errors.forEach((zodErr) => {
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
      next(error);
    }
  };
};
