import { createSlice } from '@reduxjs/toolkit';

export const THEME_KEY = 'lifeos:theme';

const getInitialTheme = () => {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return ['light', 'dark', 'system'].includes(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
};

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    theme: getInitialTheme(),
    paletteOpen: false,
    quickAddOpen: false,
    toasts: [],
  },
  reducers: {
    setTheme(state, action) {
      state.theme = action.payload;
      try {
        localStorage.setItem(THEME_KEY, action.payload);
      } catch {
        /* storage unavailable */
      }
    },
    togglePalette(state) {
      state.paletteOpen = !state.paletteOpen;
    },
    closePalette(state) {
      state.paletteOpen = false;
    },
    setQuickAddOpen(state, action) {
      state.quickAddOpen = Boolean(action.payload);
    },
    pushToast: {
      reducer(state, action) {
        state.toasts.push(action.payload);
      },
      prepare(message, type = 'info') {
        return { payload: { id: crypto.randomUUID(), type, message } };
      },
    },
    dismissToast(state, action) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
  },
});

export const { setTheme, togglePalette, closePalette, setQuickAddOpen, pushToast, dismissToast } =
  uiSlice.actions;

export default uiSlice.reducer;
