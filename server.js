import express from "express";

import { app } from "./app.js";
import { connectDB } from "./data/database.js";
import { setupCartCleanupJob } from './jobs/cartCleanup.js';

connectDB();
setupCartCleanupJob();
app.listen(process.env.PORT,()=>{console.log("Server is working ")});