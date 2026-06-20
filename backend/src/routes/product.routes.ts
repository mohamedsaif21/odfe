import { Router } from "express";
import * as productController from "../controllers/product.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.get("/", authenticate, productController.getProducts);

export default router;
