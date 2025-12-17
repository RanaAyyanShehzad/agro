import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loadWeather } from "../features/weatherSlice";
import { fetchUserAlerts } from "../services/weatherService";
import { useTranslation } from "../hooks/useTranslation";

function WeatherAlerts() {
  const dispatch = useDispatch();
  const {
    data: weatherData,
    city,
    status,
    error: weatherError,
  } = useSelector((state) => state.weather);

  const [alerts, setAlerts] = useState([]);
  const [alertsStatus, setAlertsStatus] = useState("idle");
  const [alertsError, setAlertsError] = useState(null);
  const [manualRefresh, setManualRefresh] = useState(false);
  const { t } = useTranslation();

  const loadAlerts = useCallback(async () => {
    setAlertsStatus("loading");
    setAlertsError(null);
    try {
      const userAlerts = await fetchUserAlerts();
      setAlerts(userAlerts);
      setAlertsStatus("succeeded");
    } catch (err) {
      setAlerts([]);
      setAlertsError(err.message || "Failed to load alerts");
      setAlertsStatus("failed");
    }
  }, []);

  const refreshAll = useCallback(
    async (manual = false) => {
      if (manual) setManualRefresh(true);
      await Promise.allSettled([dispatch(loadWeather()), loadAlerts()]);
      if (manual) setManualRefresh(false);
    },
    [dispatch, loadAlerts]
  );

  useEffect(() => {
    refreshAll(false);
  }, [refreshAll]);

  // ------------------------------------------
  // WEATHER ICON
  // ------------------------------------------
  const WeatherIcon = ({ description }) => {
    const map = {
      Clear: "☀️",
      Sunny: "☀️",
      Clouds: "⛅",
      Rain: "🌧️",
      Smoke: "🌫️",
      Haze: "🌫️",
      Mist: "🌫️",
    };

    return <div className="text-4xl">{map[description] || "🌤️"}</div>;
  };

  // ------------------------------------------
  // SKELETON LOADER
  // ------------------------------------------
  if (status === "loading" && alertsStatus === "loading") {
    return (
      <div className="animate-pulse space-y-4 p-4">
        <div className="h-8 w-40 bg-gray-200 rounded"></div>
        <div className="h-20 w-full bg-gray-200 rounded"></div>
        <div className="h-16 w-full bg-gray-200 rounded"></div>
        <div className="h-12 w-full bg-gray-200 rounded"></div>
      </div>
    );
  }

  // Show error state if something failed
  if (weatherError && !weatherData) {
    return (
      <div className="p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>{t("weather.errorTitle")}:</strong>
          <p>{weatherError}</p>
          <button
            onClick={() => refreshAll(true)}
            className="mt-2 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded"
          >
            {t("weather.retry")}
          </button>
        </div>
      </div>
    );
  }

  // Check if weatherData exists before rendering
  if (!weatherData) {
    return (
      <div className="p-4">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <p>{t("common.noData")}</p>
          <button
            onClick={() => refreshAll(true)}
            className="mt-2 bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded"
          >
            {t("weather.retry")}
          </button>
        </div>
      </div>
    );
  }

  console.log("🔹 Rendering main component with data:", {
    weatherData,
    alerts,
  });

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-green-700">
          {t("weather.pageTitle")}
        </h1>

        {/* Manual Refresh Button */}
        <button
          onClick={() => refreshAll(true)}
          className={`px-4 py-2 rounded-lg text-white shadow ${
            manualRefresh ? "bg-gray-500" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {manualRefresh ? t("common.loading") : t("common.refresh")}
        </button>
      </div>

      {/* Current Weather */}
      <div className="bg-white rounded-lg shadow-md p-6 mt-4 mb-6">
        <div className="flex items-center">
          <WeatherIcon description={weatherData.description} />

          <div className="ml-4">
            <h2 className="text-3xl font-bold text-gray-800">
              {weatherData.temperature?.toFixed(1)}°C
            </h2>
            <p className="text-gray-600 capitalize">
              {weatherData.description}
            </p>
            <p className="text-sm text-gray-500">{city}</p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-3">
          {t("weather.alerts")}
        </h2>

        {alerts.length === 0 && alertsStatus !== "loading" && (
          <p className="text-gray-500 text-sm">{t("weather.noAlerts")}</p>
        )}

        {alertsStatus === "loading" && (
          <p className="text-gray-500 text-sm">{t("weather.loadingAlerts")}</p>
        )}

        {alertsError && <p className="text-red-500 text-sm">{alertsError}</p>}

        {alerts.map((alert, index) => (
          <div
            key={index}
            className="bg-yellow-50 border-l-4 border-yellow-400 mb-3 p-4 rounded"
          >
            <h3 className="font-medium text-gray-800">{alert.alert}</h3>
            <p className="text-xs text-gray-500 mt-1">
              City: {alert.city} — {alert.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default WeatherAlerts;
