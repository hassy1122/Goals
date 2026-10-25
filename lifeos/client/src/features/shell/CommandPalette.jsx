import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { closePalette, setTheme } from '../../stores/uiSlice';
import { useLogoutMutation } from '../../api/auth.api';

export default function CommandPalette() {
  const open = useSelector((s) => s.ui.paletteOpen);
  const dispatch = useDispatch();

  if (!open) return null;
  return <PaletteBody onClose={() => dispatch(closePalette())} />;
}

// Phase 1: page navigation + theme + sign out. Server-side data search (/search) lands in Phase 6.
function PaletteBody({ onClose }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [logout] = useLogoutMutation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const commands = useMemo(
    () => [
      { id: 'dashboard', label: 'Go to Dashboard', hint: 'page', run: () => navigate('/') },
      { id: 'areas', label: 'Go to Wheel of Life', hint: 'page', run: () => navigate('/areas') },
      { id: 'vision', label: 'Go to Vision', hint: 'page', run: () => navigate('/vision') },
      { id: 'roadmap', label: 'Go to 5-Year Roadmap', hint: 'page', run: () => navigate('/vision/roadmap') },
      { id: 'decisions', label: 'Go to Decision Journal', hint: 'page', run: () => navigate('/decisions') },
      { id: 'goals', label: 'Go to Goals', hint: 'page', run: () => navigate('/goals') },
      { id: 'okr', label: 'Go to OKR', hint: 'page', run: () => navigate('/goals/okr') },
      { id: 'bucket', label: 'Go to Bucket List', hint: 'page', run: () => navigate('/goals/bucket') },
      { id: 'templates', label: 'Go to Template Library', hint: 'page', run: () => navigate('/goals/templates') },
      { id: 'settings', label: 'Go to Settings', hint: 'page', run: () => navigate('/settings') },
      { id: 'theme-light', label: 'Theme: light', hint: 'action', run: () => dispatch(setTheme('light')) },
      { id: 'theme-dark', label: 'Theme: dark', hint: 'action', run: () => dispatch(setTheme('dark')) },
      { id: 'theme-system', label: 'Theme: system', hint: 'action', run: () => dispatch(setTheme('system')) },
      { id: 'logout', label: 'Sign out', hint: 'account', run: () => logout() },
    ],
    [navigate, dispatch, logout],
  );

  const filtered = commands.filter((c) => c.label.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    setActive(0);
  }, [query]);

  const runItem = (item) => {
    item.run();
    onClose();
  };

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-24" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="card w-full max-w-md p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, filtered.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              if (filtered[active]) runItem(filtered[active]);
            } else if (e.key === 'Escape') {
              onClose();
            }
          }}
          className="w-full rounded-t-2xl border-b border-slate-200 bg-transparent px-4 py-3 text-sm outline-none dark:border-slate-700"
          placeholder="Search commands…"
          aria-label="Search commands"
        />
        <ul className="max-h-64 overflow-y-auto p-2" role="listbox" aria-label="Commands">
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-400 dark:text-slate-500" aria-live="polite">
              No matching commands…
            </li>
          )}
          {filtered.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => runItem(c)}
                className={
                  i === active
                    ? 'w-full rounded-lg bg-slate-100 px-3 py-2 text-left text-sm dark:bg-slate-800'
                    : 'w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800'
                }
                aria-selected={i === active}
              >
                {c.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
