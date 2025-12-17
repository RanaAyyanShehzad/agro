import { useMemo } from "react";
import { useSelector } from "react-redux";

export function useWeatherDisplay() {
  const weatherState = useSelector((state) => state.weather);

  return useMemo(() => {
    const temperature =
      typeof weatherState?.data?.temperature === "number"
        ? `${Math.round(weatherState.data.temperature)}°C`
        : "--";

    return {
      city: weatherState?.city || "",
      description:
        weatherState?.data?.description || "Updating weather details...",
      temperature,
      rawTemperature: weatherState?.data?.temperature ?? null,
      status: weatherState?.status || "idle",
    };
  }, [weatherState]);
}
