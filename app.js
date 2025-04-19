import express from "express"
import farmerRoutes from "./routes/farmer.js";
import buyerRoutes from "./routes/buyer.js";
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
//error handling
app.use(errorMiddleware);
