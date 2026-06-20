import rateLimit from "express-rate-limit";
import { config } from "../config";
import { HTTP_STATUS } from "../constants";

export const authRateLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
  statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
});

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
  statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
});
