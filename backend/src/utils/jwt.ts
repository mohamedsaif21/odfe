import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { IJWTPayload } from "../interfaces";
import { config } from "../config";
import { JWT_ACCESS_EXPIRES_IN } from "../constants";

type SignOptionsExpiry = Exclude<jwt.SignOptions["expiresIn"], undefined>;

export const generateAccessToken = (payload: Omit<IJWTPayload, "sessionId" | "iat" | "exp">): string => {
  const tokenPayload: IJWTPayload = {
    ...payload,
    sessionId: uuidv4(),
    iat: Math.floor(Date.now() / 1000),
  };

  return jwt.sign(
    { ...tokenPayload, iat: undefined },
    config.jwtSecret,
    { expiresIn: (config.jwtAccessExpiresIn || JWT_ACCESS_EXPIRES_IN) as SignOptionsExpiry }
  );
};

export const generateRefreshToken = (): string => {
  return uuidv4() + "-" + uuidv4() + "-" + uuidv4();
};

export const verifyAccessToken = (token: string): IJWTPayload => {
  return jwt.verify(token, config.jwtSecret) as IJWTPayload;
};

export const verifyToken = verifyAccessToken;
