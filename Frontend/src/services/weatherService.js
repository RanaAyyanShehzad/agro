const WEATHER_BASE = "https://agrofarm-vd8i.onrender.com/api/weather";

export const detectCity = () =>
  new Promise((resolve) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      resolve("Multan");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const reverseResponse = await fetch(
            `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=9d2990de3238b8b057918969498b2447`
          );
          const data = await reverseResponse.json();
          const detected = data[0]?.name || data[0]?.state || "Multan";
          resolve(detected);
        } catch (err) {
          resolve("Multan");
        }
      },
      () => resolve("Multan"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

export async function fetchWeatherForCity(city) {
  const response = await fetch(`${WEATHER_BASE}/${encodeURIComponent(city)}`, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error("Failed to load weather");
  }

  const payload = await response.json();
  return payload.data;
}

export async function fetchUserAlerts() {
  const response = await fetch(`${WEATHER_BASE}/alerts/user`, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error("Failed to load alerts");
  }

  const payload = await response.json();
  return payload.alerts || [];
}
