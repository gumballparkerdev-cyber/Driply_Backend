import express from "express";
import connectDB from "./config/db.js";
import productRoutes from "./routes/ProductRoutes.js";
import cartRoutes from "./routes/CartRoutes.js";
import checkoutRoutes from "./routes/CheckoutRoutes.js";
import buyRoutes from "./routes/BuyRoutes.js";
import authRoutes from "./routes/AuthRoutes.js";
import orderRoutes from "./routes/OrderRoutes.js";
import cors from "cors";
import compression from "compression";


const PORT = process.env.PORT || 5000;
const app = express();
// Connect to database
connectDB();

// CORS Middleware
app.use(cors());

// Compression middleware for faster responses
app.use(compression());

// Middleware (optional)
app.use(express.json());


// Routes
app.get("/", (req, res) => {
  res.send("Hello 🚀 — Express server is running!");
});


app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/buy", buyRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);



// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});