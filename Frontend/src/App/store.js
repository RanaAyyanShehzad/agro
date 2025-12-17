// store.js
import { configureStore } from "@reduxjs/toolkit";
import userReducer from "../features/userSlice";
import weatherReducer from "../features/weatherSlice";

export const store = configureStore({
  reducer: {
    user: userReducer,
    weather: weatherReducer,
  },
});
