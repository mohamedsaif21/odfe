import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { validate } from "../middleware/validation.middleware";
import { authenticate } from "../middleware/auth.middleware";
import { authRateLimiter } from "../middleware/rate-limit.middleware";
import {
  signupSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  customerTokenSchema,
} from "../validators/auth.validator";

const router = Router();

router.post("/signup", authRateLimiter, validate(signupSchema), authController.signup);
router.post("/login", authRateLimiter, validate(loginSchema), authController.login);
router.post("/refresh", authRateLimiter, validate(refreshTokenSchema), authController.refreshToken);
router.post("/logout", authenticate, authController.logout);
router.post("/logout-all", authenticate, authController.logoutAll);
router.post("/forgot-password", authRateLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post("/reset-password", authRateLimiter, validate(resetPasswordSchema), authController.resetPassword);
router.post("/change-password", authenticate, validate(changePasswordSchema), authController.changePassword);
router.get("/profile", authenticate, authController.getProfile);
router.post("/customer-token", authRateLimiter, validate(customerTokenSchema), authController.customerToken);

export default router;
