import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { detectCity, fetchWeatherForCity } from "../services/weatherService";

const initialState = {
  city: "Multan",
  data: null,
  status: "idle",
  error: null,
  lastUpdated: null,
};

export const loadWeather = createAsyncThunk(
  "weather/load",
  async (_, { rejectWithValue }) => {
    try {
      const city = await detectCity();
      const weather = await fetchWeatherForCity(city);
      return { city, weather, fetchedAt: Date.now() };
    } catch (error) {
      return rejectWithValue(error.message || "Unable to load weather");
    }
  }
);

const weatherSlice = createSlice({
  name: "weather",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadWeather.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loadWeather.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.city = action.payload.city;
        state.data = action.payload.weather;
        state.lastUpdated = action.payload.fetchedAt;
        state.error = null;
      })
      .addCase(loadWeather.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Failed to load weather";
      });
  },
});

export default weatherSlice.reducer;
