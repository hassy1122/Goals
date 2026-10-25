import { useEffect } from 'react';
import { Provider, useSelector } from 'react-redux';
import { RouterProvider } from 'react-router-dom';
import { router } from './router.jsx';
import { store } from './stores/store';
import { THEME_KEY } from './stores/uiSlice';

function ThemeWatcher() {
  const theme = useSelector((s) => s.ui.theme);

  useEffect(() => {
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  return null;
}

export default function App() {
  return (
    <Provider store={store}>
      <ThemeWatcher />
      <RouterProvider router={router} />
    </Provider>
  );
}
