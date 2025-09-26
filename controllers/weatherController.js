import { fetchWeather } from "../utils/weatherService.js";
import { WeatherAlert } from "../models/weatherAlert.js";
import ErrorHandler from "../middlewares/error.js";
import jwt from "jsonwebtoken";

// Extract userId from token
const getUserFromToken = (req) => {
  const { token } = req.cookies;
  if (!token) throw new ErrorHandler("Authentication token missing", 401);

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  return decoded._id; // must match what you used in jwt.sign
};

// 🌤 Get real-time weather for a city
export const getWeather = async (req, res, next) => {
  try {
    const { city } = req.params;
    const userId = getUserFromToken(req);

    const { temperature, description, alert } = await fetchWeather(city);

    // Save alert in DB only if dangerous
    if (alert) {
      await WeatherAlert.create({
        userId,
        city,
        temperature,
        description,
        alert,
      });
    }

    res.status(200).json({
      success: true,
      data: { city, temperature, description, alert },
    });
  } catch (error) {
    next(error);
  }
};

// 🔔 Get all weather alerts for logged-in user
export const getUserWeatherAlerts = async (req, res, next) => {
  try {
    const userId = getUserFromToken(req);
    const alerts = await WeatherAlert.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, alerts });
  } catch (error) {
    next(error);
  }
};
