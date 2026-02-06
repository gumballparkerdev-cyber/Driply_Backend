import express from "express";
import Cart from "../models/CartM.js";
import Order from "../models/OrderM.js";
import Product from "../models/ProductsM.js";

const router = express.Router();

/* ---------------- ADD TO CART ---------------- */
router.post("/", async (req, res) => {
  try {
    const { userId, productId, size, quantity } = req.body;

    if (!userId || !productId) {
      return res.status(400).json({ message: "User ID and Product ID are required" });
    }

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({
        userId,
        items: [{ product: productId, size, quantity }]
      });
    } else {
      const existingItem = cart.items.find(
        i => i.product.toString() === productId && i.size === size
      );

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        cart.items.push({ product: productId, size, quantity });
      }
    }

    await cart.save();
    const populatedCart = await Cart.findOne({ userId }).populate("items.product");
    res.json(populatedCart);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ---------------- CHECKOUT ---------------- */
router.post("/checkout", async (req, res) => {
  try {
    const { userId, items: selectedItems } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const cart = await Cart.findOne({ userId }).populate("items.product");
    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    let itemsToProcess = [];
    if (selectedItems && selectedItems.length > 0) {
      itemsToProcess = cart.items.filter(item =>
        selectedItems.some(
          selected =>
            selected.productId === item.product._id.toString() &&
            selected.size === item.size
        )
      );
    } else {
      itemsToProcess = cart.items;
    }

    if (itemsToProcess.length === 0) {
      return res.status(400).json({ message: "No valid items to checkout" });
    }

    let totalAmount = 0;
    const orderItems = [];
    const productsToUpdate = [];

    for (const item of itemsToProcess) {
      const product = item.product;

      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
      }

      const price = Number(product.price);
      if (isNaN(price)) {
        throw new Error(`Invalid price for product ${product.name}`);
      }

      totalAmount += price * item.quantity;

      orderItems.push({
        product: product._id,
        size: item.size,
        quantity: item.quantity,
        price
      });

      productsToUpdate.push({ productId: product._id, quantity: item.quantity });
    }

    const newOrder = new Order({
      userId,
      items: orderItems,
      totalAmount: Math.max(0, totalAmount)
    });

    const savedOrder = await newOrder.save();

    for (const p of productsToUpdate) {
      await Product.updateOne({ _id: p.productId }, { $inc: { stock: -p.quantity } });
    }

    if (selectedItems && selectedItems.length > 0) {
      const processedKeys = new Set(
        itemsToProcess.map(i => `${i.product._id.toString()}-${i.size}`)
      );
      cart.items = cart.items.filter(item => {
        const key = `${item.product._id.toString()}-${item.size}`;
        return !processedKeys.has(key);
      });
    } else {
      cart.items = [];
    }

    await cart.save();

    res.status(200).json({
      message: "Checkout successful",
      orderId: savedOrder._id,
      totalAmount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ---------------- GET CART ---------------- */
router.get("/:userId", async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.params.userId }).populate("items.product");

    if (!cart) {
      return res.json({ userId: req.params.userId, items: [] });
    }

    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;