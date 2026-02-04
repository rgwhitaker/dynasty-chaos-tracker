import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import dynastyReducer from './slices/dynastySlice';
import playerReducer from './slices/playerSlice';
import recruitingReducer from './slices/recruitingSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    dynasty: dynastyReducer,
    player: playerReducer,
    recruiting: recruitingReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});
