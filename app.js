import express from "express"
import farmerRoutes from "./routes/farmer.js";
import {config} from "dotenv";
import cookieParser from "cookie-parser";

export const app= express();
config({
    path:"./data/config.env",
});
//middlewares
app.use(express.json());
app.use(cookieParser());
//routes
app.use("/api/farmers",farmerRoutes);
