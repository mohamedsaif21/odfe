import { Router } from "express";
import authRoutes from "./auth.routes";
import dashboardRoutes from "./dashboard.routes";
import productRoutes from "./product.routes";
import orderRoutes from "./order.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/products", productRoutes);
router.use("/orders", orderRoutes);

export default router;
