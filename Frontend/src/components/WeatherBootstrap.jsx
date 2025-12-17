import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { loadWeather } from "../features/weatherSlice";
import { useAuth } from "../context/AuthContext";

const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

function WeatherBootstrap() {
  const dispatch = useDispatch();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    // Only load weather if user is authenticated and not loading
    // This prevents errors on landing page
    if (!isAuthenticated || loading) {
      return undefined;
    }

    try {
      dispatch(loadWeather());
      const intervalId = setInterval(() => {
        try {
          dispatch(loadWeather());
        } catch (error) {
          console.error("Error loading weather:", error);
        }
      }, REFRESH_INTERVAL_MS);
      return () => clearInterval(intervalId);
    } catch (error) {
      console.error("Error initializing weather:", error);
      return undefined;
    }
  }, [dispatch, isAuthenticated, loading]);

  return null;
}

export default WeatherBootstrap;
