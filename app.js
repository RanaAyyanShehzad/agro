import express from "express"
import adminRoutes from "./routes/admin.js";
import farmerRoutes from "./routes/farmer.js";
import orderroutes from "./routes/order.js";
import buyerRoutes from "./routes/buyer.js";
import supplierRoutes from "./routes/supplier.js";
import productRoutes from "./routes/product.js";
import cartRoutes from "./routes/cart.js";
import wishlistRoutes from "./routes/wishlist.js";
import cors from "cors";
import {config} from "dotenv";
import cookieParser from "cookie-parser";
import { errorMiddleware } from "./middlewares/error.js";



export const app= express();

config({
    path:"./data/config.env",
});
//middlewares
app.use(express.json());
app.use(cookieParser());
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));


//routes
app.use('/api/v1/admin',adminRoutes);
app.use("/api/farmers",farmerRoutes);
app.use("/api/buyers",buyerRoutes);
app.use("/api/suppliers",supplierRoutes);
app.use("/api/products",productRoutes);
app.use("/api/v1/order",orderroutes);
app.use("/api/cart",cartRoutes);
app.use("/api/wishlist",wishlistRoutes);
//error handling
app.use(errorMiddleware);
