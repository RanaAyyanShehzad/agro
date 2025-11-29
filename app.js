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
import weatherRoutes from "./routes/weatherRoutes.js";
import chatbotRoutes from "./routes/chatbotRoutes.js";
import orderMultiVendorRoutes from "./routes/orderMultiVendor.js";
import notificationRoutes from "./routes/notifications.js";
import { checkAuth } from "./utils/verifyToken.js";

// Initialize Express app
export const app = express();

// Load environment variables
config({
    path: "./data/config.env",
});
 

// Middlewares
app.use(express.json());
app.use(cookieParser());

app.use(cors({
  origin: true, // Reflects the request origin
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
}));



// Routes
app.get('/', (req, res) => {
  res.send('Welcome to the Agro Backend API');
});
app.get("/api/auth/check",checkAuth);
app.use("/api/weather", weatherRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use("/api/farmers", farmerRoutes);
app.use("/api/buyers", buyerRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/products", productRoutes);
app.use("/api/v1/order", orderRoutes);
app.use("/api/v1", orderMultiVendorRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/review",reviewRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/notifications", notificationRoutes);
// Error handling middleware
app.use(errorMiddleware);

// Export the handler for serverless environment

