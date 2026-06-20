import { Router } from "express";
import * as orderController from "../controllers/order.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.post("/", authenticate, orderController.createOrder);
router.get("/", authenticate, orderController.getOrders);
router.put("/:id/status", authenticate, orderController.updateOrderStatus);

export default router;
