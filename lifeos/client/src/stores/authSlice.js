import { createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null },
  reducers: {
    userLoaded(state, action) {
      state.user = action.payload;
    },
    sessionCleared(state) {
      state.user = null;
    },
  },
});

export const { userLoaded, sessionCleared } = authSlice.actions;
export default authSlice.reducer;
