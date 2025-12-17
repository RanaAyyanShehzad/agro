// features/userSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  role: null, // 'Farmer', 'Buyer', or 'Supplier'
  name: "",
  email: "",
  phone: "",
  address: "",
  // imgURL: '',
  isAuthenticated: false,
  loading: false,
  error: null,
};

const usersSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    setUser: (state, action) => {
      return {
        ...state,
        ...action.payload,
        isAuthenticated: true,
      };
    },
    clearUser: () => initialState,
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
});
export const { setUser, clearUser, setLoading, setError } = usersSlice.actions;
export default usersSlice.reducer;
