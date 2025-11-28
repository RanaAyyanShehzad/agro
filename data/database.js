import mongoose from "mongoose";
import { SystemConfig } from "../models/systemConfig.js";

export const connectDB = async () => {
   await mongoose.connect(process.env.MONGO_URI,{
    dbName:"farmConnect"
   });
   
   // Initialize system configuration defaults
   try {
     await SystemConfig.initializeDefaults();
     console.log("✅ System configuration initialized");
   } catch (error) {
     console.error("❌ Error initializing system configuration:", error);
   }
};
