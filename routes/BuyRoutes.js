import express from "express";
import Product from "../models/ProductsM.js";

const router = express.Router();

// POST buy now

router.post("/buy-now", async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ message: "Insufficient stock" });
    }

    const totalAmount = product.price * quantity;

    product.stock -= quantity;
    await product.save();

    res.status(200).json({
      message: "Purchase successful",
      totalAmount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
