import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from '../api/base';
import uiReducer from './uiSlice';
import authReducer from './authSlice';

export const store = configureStore({
  reducer: { ui: uiReducer, auth: authReducer, api: baseApi.reducer },
  middleware: (getDefault) => getDefault().concat(baseApi.middleware),
});
