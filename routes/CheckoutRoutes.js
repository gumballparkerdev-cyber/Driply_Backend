import express from "express";
import Cart from "../models/CartM.js";
import Order from "../models/OrderM.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { userId, items: selectedItems } = req.body;

    console.log(`[Checkout] Started for User: ${userId}`);

    // 1. Validation
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // 2. Fetch Cart
    const cart = await Cart.findOne({ userId }).populate("items.product");
    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // 3. Filter Items
    let itemsToProcess = [];

    if (selectedItems && selectedItems.length > 0) {
      // Filter specific items
      itemsToProcess = cart.items.filter(item => {
        if (!item.product || !item.product._id) return false;

        // Match against selected items (String comparison for IDs)
        return selectedItems.some(selected =>
          selected.productId === item.product._id.toString() &&
          selected.size === item.size
        );
      });
    } else {
      // Process all valid items
      itemsToProcess = cart.items.filter(item => item.product && item.product._id);
    }

    if (itemsToProcess.length === 0) {
      return res.status(400).json({ message: "No valid items to checkout" });
    }

    console.log(`[Checkout] Processing ${itemsToProcess.length} items`);

    // 4. Build Order Data & Check Stock
    let totalAmount = 0;
    const orderItems = [];
    const productsToUpdate = [];

    for (const item of itemsToProcess) {
      const product = item.product;

      // Validation
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

      productsToUpdate.push({ product, quantity: item.quantity });
    }

    // 5. Create Order Object
    const newOrder = new Order({
      userId: userId,
      items: orderItems,
      totalAmount: Math.max(0, totalAmount)
    });

    // 6. Save Order (First, to ensure data capture)
    console.log("[Checkout] Saving Order...");
    const savedOrder = await newOrder.save();
    console.log(`[Checkout] Order Saved: ${savedOrder._id}`);

    // 7. Update Stock
    for (const p of productsToUpdate) {
      p.product.stock = Math.max(0, p.product.stock - p.quantity);
      await p.product.save();
    }

    // 8. Clear Cart
    // We use the same filter logic to remove ONLY what we processed
    if (selectedItems && selectedItems.length > 0) {
      const processedKeys = new Set(
        itemsToProcess.map(i => `${i.product._id.toString()}-${i.size}`)
      );

      cart.items = cart.items.filter(item => {
        if (!item.product) return false; // Clean up nulls
        const key = `${item.product._id.toString()}-${item.size}`;
        return !processedKeys.has(key);
      });
    } else {
      cart.items = []; // Clear all
    }

    await cart.save();
    console.log("[Checkout] Cart updated");

    // 9. Success Response
    res.status(200).json({
      message: "Checkout successful",
      orderId: savedOrder._id,
      totalAmount
    });

  } catch (error) {
    console.error(`[Checkout Error] ${error.message}`);
    // Check for Mongoose validation errors
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

export default router;
