import express from "express";
import Cart from "../models/CartM.js";
import Product from "../models/ProductsM.js";

const router = express.Router();

/**
 * GET cart by userId
 */
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    let cart = await Cart.findOne({ userId }).populate("items.product");

    if (!cart) {
      cart = await Cart.create({ userId, items: [] });
      await cart.populate("items.product");
    }

    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * ADD product to cart
 */
router.post("/add", async (req, res) => {
  try {
    const { userId, productId, size, quantity } = req.body;

    if (!userId || !productId || !size || quantity < 1) {
      return res.status(400).json({ message: "Invalid data" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (quantity > product.stock) {
      return res.status(400).json({
        message: "Not enough stock",
        availableStock: product.stock,
      });
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) cart = await Cart.create({ userId, items: [] });

    const itemIndex = cart.items.findIndex(
      (i) =>
        i.product.toString() === productId &&
        i.size === size
    );

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += quantity;
    } else {
      cart.items.push({ product: productId, size, quantity });
    }

    await cart.save();
    await cart.populate("items.product");

    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * UPDATE quantity
 */
router.post("/update", async (req, res) => {
  try {
    const { userId, productId, size, quantity } = req.body;

    if (!userId || !productId || !size || quantity == null) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const itemIndex = cart.items.findIndex(
      (i) =>
        i.product.toString() === productId &&
        i.size === size
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: "Item not found" });
    }

    if (quantity === 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      const product = await Product.findById(productId);
      if (quantity > product.stock) {
        return res.status(400).json({
          message: "Not enough stock",
          availableStock: product.stock,
        });
      }
      cart.items[itemIndex].quantity = quantity;
    }

    await cart.save();
    await cart.populate("items.product");

    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * REMOVE product
 */
router.post("/remove", async (req, res) => {
  try {
    const { userId, productId, size } = req.body;

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = cart.items.filter(
      (i) =>
        !(i.product.toString() === productId && i.size === size)
    );

    await cart.save();
    await cart.populate("items.product");

    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
