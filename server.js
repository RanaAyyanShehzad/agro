import express from "express";

import { app } from "./app.js"
import { connectDB } from "./data/database.js";
import { setupCartCleanupJob } from './jobs/cartCleanup.js';
import { startOrderAutoConfirmation } from './jobs/orderAutoConfirmation.js';

// Connect to database and start jobs
connectDB().then(() => {
  setupCartCleanupJob();
  startOrderAutoConfirmation();
  app.listen(process.env.PORT, () => {
    console.log(`Server is working on port ${process.env.PORT}`);
  });
}).catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});