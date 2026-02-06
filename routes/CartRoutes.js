import express from "express";
import Cart from "../models/CartM.js";
import Order from "../models/OrderM.js";
import Product from "../models/ProductsM.js"; // ✅ add this import

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { userId, items: selectedItems } = req.body;

    console.log(`[Checkout] Started for User: ${userId}`);

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const cart = await Cart.findOne({ userId }).populate("items.product");
    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    let itemsToProcess = [];
    if (selectedItems && selectedItems.length > 0) {
      itemsToProcess = cart.items.filter(item => {
        if (!item.product || !item.product._id) return false;
        return selectedItems.some(selected =>
          selected.productId === item.product._id.toString() &&
          selected.size === item.size
        );
      });
    } else {
      itemsToProcess = cart.items.filter(item => item.product && item.product._id);
    }

    if (itemsToProcess.length === 0) {
      return res.status(400).json({ message: "No valid items to checkout" });
    }

    console.log(`[Checkout] Processing ${itemsToProcess.length} items`);

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
        price: price
      });

      productsToUpdate.push({ productId: product._id, quantity: item.quantity });
    }

    const newOrder = new Order({
      userId: userId,
      items: orderItems,
      totalAmount: Math.max(0, totalAmount)
    });

    console.log("[Checkout] Saving Order...");
    const savedOrder = await newOrder.save();
    console.log(`[Checkout] Order Saved: ${savedOrder._id}`);

    // ✅ FIXED: update stock safely
    for (const p of productsToUpdate) {
      await Product.updateOne(
        { _id: p.productId },
        { $inc: { stock: -p.quantity } }
      );
    }

    if (selectedItems && selectedItems.length > 0) {
      const processedKeys = new Set(
        itemsToProcess.map(i => `${i.product._id.toString()}-${i.size}`)
      );
      cart.items = cart.items.filter(item => {
        if (!item.product) return false;
        const key = `${item.product._id.toString()}-${item.size}`;
        return !processedKeys.has(key);
      });
    } else {
      cart.items = [];
    }

    await cart.save();
    console.log("[Checkout] Cart updated");

    res.status(200).json({
      message: "Checkout successful",
      orderId: savedOrder._id,
      totalAmount
    });

  } catch (error) {
    console.error(`[Checkout Error] ${error.message}`);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(500).json({ message: `Validation Error: ${messages.join(', ')}` });
    }
    res.status(500).json({
      message: "Server error during checkout",
      error: error.message
    });
  }
});

// GET cart by userId
router.get("/:userId", async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.params.userId }).populate("items.product");

    if (!cart) {
      // ✅ return empty cart instead of error
      return res.json({ userId: req.params.userId, items: [] });
    }

    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;