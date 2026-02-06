import express from "express";
import Product from "../models/ProductsM.js";
import apicache from "apicache";
const cache = apicache.middleware;

const router = express.Router();

// GET all products with filtering + Auto-Restock (Portfolio Mode)
router.get("/", cache("60 seconds"), async (req, res) => {
  try {
    // 1. Auto-Restock Logic
    const RESTOCK_DELAY_MS = 10 * 60 * 1000; // 10 Minutes
    const RESTOCK_AMOUNT = 50;

    const outOfStockProducts = await Product.find({ stock: 0 });
    for (const product of outOfStockProducts) {
      const timeSinceLastUpdate = new Date() - new Date(product.updatedAt);
      if (timeSinceLastUpdate > RESTOCK_DELAY_MS) {
        product.stock = RESTOCK_AMOUNT;
        await product.save();
        console.log(`Auto-restocked product: ${product.name}`);
      }
    }

    // 2. Filtering Logic
    const { category, gender, season, minPrice, maxPrice, search } = req.query;
    let filter = {};

    if (category) {
      filter.category = Array.isArray(category) ? { $in: category } : category;
    }

    if (gender) {
      filter.gender = Array.isArray(gender) ? { $in: gender } : gender;
    }

    if (season) {
      filter.season = Array.isArray(season) ? { $in: season } : season;
    }

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // 3. Query DB
    const products = await Product.find(filter)
      .select("name price image stock category gender season")
      .lean();

    res.status(200).json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single product
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: "Invalid product ID" });
  }
});

export default router;