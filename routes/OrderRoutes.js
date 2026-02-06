import express from "express";
import Order from "../models/OrderM.js";

const router = express.Router();

// GET /api/orders/:id - Public Track Order
router.get("/:id", async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate("items.product");

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        res.json(order);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
});

export default router;
