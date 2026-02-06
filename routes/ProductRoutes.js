import express from "express";
import Product from "../models/ProductsM.js";
import apicache from "apicache";
const cache = apicache.middleware;

const router = express.Router();

// GET all products with filtering + Auto-Restock (Portfolio Mode)
// Cache product list for 60 seconds at server-side (safe, public)
router.get("/", cache('60 seconds'), async (req, res) => {
  try {
    // 1. Auto-Restock Logic (Portfolio Feature)
    // Check for out-of-stock items that haven't been updated in a while
    // Changed to 10 minutes as requested by user
    const RESTOCK_DELAY_MS = 10 * 60 * 1000; // 10 Minutes
    const RESTOCK_AMOUNT = 50; // Default stock level

    // Finding items that need restock could be optimized, but for a portfolio size this is fine.
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
    const { category, type, minPrice, maxPrice, search } = req.query;

    let filter = {};

    if (category) filter.category = category;
    if (type) filter.type = type; // "type" might be same as category in some schemas, check usage

    // Search logic (simple regex)
    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // Serve fast: limit fields and add index hint for faster reads
    const products = await Product.find(filter).select('name price image stock category').lean();
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
