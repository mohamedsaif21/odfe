import crypto from "crypto";

export const hashToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const generateSecureToken = (bytes: number = 48): string => {
  return crypto.randomBytes(bytes).toString("hex");
};

export const generateCsrfToken = (): string => {
  return crypto.randomBytes(32).toString("hex");
};
