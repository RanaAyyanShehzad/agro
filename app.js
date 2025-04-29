import express from "express"
import farmerRoutes from "./routes/farmer.js";
import orderroutes from "./routes/order.js";
import buyerRoutes from "./routes/buyer.js";
import supplierRoutes from "./routes/supplier.js";
import productRoutes from "./routes/product.js";
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
//routes
app.use("/api/farmers",farmerRoutes);
app.use("/api/buyers",buyerRoutes);
app.use("/api/suppliers",supplierRoutes);
app.use("/api/products",productRoutes);
app.use("/api/order",orderroutes);
//error handling
app.use(errorMiddleware);
