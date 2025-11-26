import axios from "axios";
import ErrorHandler from "../middlewares/error.js";

// Normalize city names coming from frontend (e.g. "Sheikhupura Tehsil")
const normalizeCityName = (rawCity) => {
  if (!rawCity) return "";

  let city = rawCity.trim();

  // Remove common administrative suffixes that OpenWeather doesn't recognize
  city = city.replace(/\s+tehsil$/i, "");
  city = city.replace(/\s+district$/i, "");

  // If user passed something like "Lahore, Pakistan", keep it as is,
  // otherwise default to Pakistan country code for better accuracy
  if (!/,/i.test(city)) {
    city = `${city},PK`;
  }

  return city;
};

export const fetchWeather = async (city) => {
  try {
    const apiKey = process.env.OPENWEATHER_API_KEY; // from .env

    if (!apiKey) {
      throw new ErrorHandler(
        "Weather service is not configured. Please contact support.",
        500
      );
    }

    const normalizedCity = normalizeCityName(city);

    if (!normalizedCity) {
      throw new ErrorHandler("City name is required for weather lookup.", 400);
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
      normalizedCity
    )}&appid=${apiKey}&units=metric`;

    const { data } = await axios.get(url);

    const temperature = data.main.temp;
    const description = data.weather[0].description;

    // Define dangerous conditions
    let alert = null;
    if (
      temperature > 42 || // extreme heat
      temperature < 2 || // extreme cold
      description.includes("storm") ||
      description.includes("rain") ||
      description.includes("flood") ||
      description.includes("snow") ||
      description.includes("smoke")
    ) {
      alert = `⚠️ Dangerous weather: ${description}, Temp: ${temperature}°C`;
    }

    return { temperature, description, alert };
  } catch (error) {
    // Log more detailed information to help debugging
    console.error(
      "❌ Weather API error:",
      error.response?.data || error.message
    );

    // If OpenWeather returns 404 (city not found), send a clear message to frontend
    if (error.response?.status === 404) {
      throw new ErrorHandler(
        "City not found in weather service. Please try a nearby major city name (e.g. 'Sheikhupura' instead of 'Sheikhupura Tehsil').",
        404
      );
    }

    // Re-throw known ErrorHandler instances
    if (error instanceof ErrorHandler) {
      throw error;
    }

    throw new ErrorHandler(
      "Unable to fetch weather data from the weather service.",
      500
    );
  }
};
