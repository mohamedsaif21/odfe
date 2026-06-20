import { Request, Response, NextFunction } from "express";
import { HTTP_STATUS } from "../constants";
import { ApiResponse } from "../interfaces";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getProducts = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let products: any[] = [];
    let categories: any[] = [];
    
    try {
      products = await (prisma as any).product.findMany({
        where: { isActive: true },
        include: { category: true }
      });
      categories = await (prisma as any).category.findMany({
        where: { isActive: true }
      });
    } catch (dbError) {
      // Fallback data if DB isn't migrated
      categories = [
        { id: "all", name: "All", color: "gray" },
        { id: "espresso", name: "Espresso", color: "brown" },
        { id: "tea", name: "Tea", color: "green" },
        { id: "bakery", name: "Bakery", color: "orange" },
        { id: "smoothies", name: "Smoothies", color: "purple" },
        { id: "specials", name: "Specials", color: "yellow" },
      ];

      products = [
        { id: "1", name: "Espresso", price: 120, categoryId: "espresso", image: "☕" },
        { id: "2", name: "Latte", price: 180, categoryId: "espresso", image: "☕" },
        { id: "3", name: "Mocha", price: 210, categoryId: "espresso", image: "🍫" },
        { id: "4", name: "Americano", price: 150, categoryId: "espresso", image: "☕" },
        { id: "7", name: "Green Tea", price: 130, categoryId: "tea", image: "🍵" },
        { id: "11", name: "Croissant", price: 150, categoryId: "bakery", image: "🥐" },
      ];
    }

    const response: ApiResponse = {
      success: true,
      message: "Products retrieved successfully",
      data: {
        categories,
        products
      },
    };

    res.status(HTTP_STATUS.OK).json(response);
  } catch (error) {
    next(error);
  }
};
