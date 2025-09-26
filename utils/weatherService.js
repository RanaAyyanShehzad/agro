import axios from "axios";

export const fetchWeather = async (city) => {
  try {
    const apiKey = process.env.OPENWEATHER_API_KEY; // from .env
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;

    const { data } = await axios.get(url);

    const temperature = data.main.temp;
    const description = data.weather[0].description;

    // Define dangerous conditions
    let alert = null;
    if (
      temperature > 42 || // extreme heat
      temperature < 2 ||  // extreme cold
      description.includes("storm") ||
      description.includes("rain") ||
      description.includes("flood") ||
      description.includes("snow")
    ) {
      alert = `⚠️ Dangerous weather: ${description}, Temp: ${temperature}°C`;
    }

    return { temperature, description, alert };
  } catch (error) {
    console.error("❌ Weather API error:", error.message);
    throw new Error("Unable to fetch weather data");
  }
};
