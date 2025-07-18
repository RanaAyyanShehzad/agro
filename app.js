import express from "express";
import adminRoutes from "./routes/admin.js";
import farmerRoutes from "./routes/farmer.js";
import orderRoutes from "./routes/order.js";
import buyerRoutes from "./routes/buyer.js";
import supplierRoutes from "./routes/supplier.js";
import productRoutes from "./routes/product.js";
import cartRoutes from "./routes/cart.js";
import wishlistRoutes from "./routes/wishlist.js";
import reviewRoutes from "./routes/review.js";
import cors from "cors";
import { config } from "dotenv";
import cookieParser from "cookie-parser";
import { errorMiddleware } from "./middlewares/error.js";

import { connectDB } from "./data/database.js";
import { setupCartCleanupJob } from './jobs/cartCleanup.js';


// Initialize Express app
export const app = express();

// Load environment variables
config({
    path: "./data/config.env",
});
 

// Middlewares
app.use(express.json());
app.use(cookieParser());

let allowedOrigins = process.env.ALLOWED_ORIGINS;

if (allowedOrigins) {
  allowedOrigins = allowedOrigins.split(',');
} else {
  allowedOrigins = ['http://localhost:3000']; // or your default origin(s)
}

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// Routes
app.get('/', (req, res) => {
  res.send('Welcome to the Agro Backend API');
});

app.use('/api/v1/admin', adminRoutes);
app.use("/api/farmers", farmerRoutes);
app.use("/api/buyers", buyerRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/products", productRoutes);
app.use("/api/v1/order", orderRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/review",reviewRoutes);

// Error handling middleware
app.use(errorMiddleware);

// Export the handler for serverless environment

