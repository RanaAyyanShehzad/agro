import mongoose from "mongoose";

const weatherAlertSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farmer",
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    temperature: Number,
    description: String,
    alert: String, // only filled if dangerous
  },
  { timestamps: true }
);

export const WeatherAlert = mongoose.model("WeatherAlert", weatherAlertSchema);
