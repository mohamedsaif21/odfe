import { Request, Response, NextFunction } from "express";

const xssPatterns = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /on\w+\s*=\s*["']?[^"'\s>]+["']?/gi,
  /javascript\s*:/gi,
  /vbscript\s*:/gi,
  /onload\s*=/gi,
  /onerror\s*=/gi,
];

const sanitizeValue = (value: unknown): unknown => {
  if (typeof value === "string") {
    let sanitized = value;
    for (const pattern of xssPatterns) {
      sanitized = sanitized.replace(pattern, "");
    }
    sanitized = sanitized.replace(/[<>]/g, (match) =>
      match === "<" ? "&lt;" : "&gt;"
    );
    return sanitized;
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value && typeof value === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      sanitized[key] = sanitizeValue(val);
    }
    return sanitized;
  }
  return value;
};

export const sanitizeInput = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body) {
    req.body = sanitizeValue(req.body) as typeof req.body;
  }
  if (req.query) {
    req.query = sanitizeValue(req.query) as typeof req.query;
  }
  if (req.params) {
    req.params = sanitizeValue(req.params) as typeof req.params;
  }
  next();
};
