import express from "express";
import { getWeather, getUserWeatherAlerts } from "../controllers/weatherController.js";

const router = express.Router();

// GET /api/weather/Lahore
router.get("/:city", getWeather);

// GET /api/weather/alerts/user
router.get("/alerts/user", getUserWeatherAlerts);

export default router;
