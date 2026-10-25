import { useDispatch, useSelector } from 'react-redux';
import { setTheme } from '../../stores/uiSlice';

const NEXT = { light: 'dark', dark: 'system', system: 'light' };
const ICON = { light: '☀️', dark: '🌙', system: '🖥️' };

export default function ThemeToggle() {
  const theme = useSelector((s) => s.ui.theme);
  const dispatch = useDispatch();

  return (
    <button
      type="button"
      onClick={() => dispatch(setTheme(NEXT[theme]))}
      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
      aria-label={`Theme: ${theme}. Select to change`}
      title={`Theme: ${theme} (click to change)`}
    >
      <span aria-hidden="true">{ICON[theme]}</span>
    </button>
  );
}
