import { Suspense, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useGetMeQuery, useLogoutMutation } from '../api/auth.api';
import { userLoaded } from '../stores/authSlice';
import { closePalette, pushToast, setQuickAddOpen, togglePalette } from '../stores/uiSlice';
import Logo from '../components/ui/Logo.jsx';
import ThemeToggle from '../components/ui/ThemeToggle.jsx';
import CommandPalette from '../features/shell/CommandPalette.jsx';
import NotificationsBell from '../features/shell/NotificationsBell.jsx';
import QuickAddModal from '../features/shell/QuickAddModal.jsx';
import Toaster from '../components/ui/Toaster.jsx';
import { useGlobalShortcut } from '../hooks/useGlobalShortcut';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '🏠', end: true, mobile: true },
  { to: '/areas', label: 'Wheel of Life', icon: '☸️', group: 'My Life', mobile: true },
  { to: '/vision', label: 'Vision', icon: '🌅', group: 'My Life', mobile: true },
  { to: '/vision/roadmap', label: '5-Year Roadmap', icon: '🗺️', group: 'My Life' },
  { to: '/decisions', label: 'Decision Journal', icon: '⚖️', group: 'My Life' },
  { to: '/goals', label: 'Goals', icon: '🎯', group: 'Goals', mobile: true },
  { to: '/goals/okr', label: 'OKR', icon: '📈', group: 'Goals' },
  { to: '/goals/bucket', label: 'Bucket List', icon: '🪣', group: 'Goals' },
  { to: '/goals/templates', label: 'Templates', icon: '📋', group: 'Goals' },
  { to: '/settings', label: 'Settings', icon: '⚙️', mobile: true },
];

function navClass({ isActive }) {
  return [
    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
    isActive
      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
  ].join(' ');
}

export default function AppLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);
  const { data } = useGetMeQuery();
  const [logout] = useLogoutMutation();

  useEffect(() => {
    if (data?.user) dispatch(userLoaded(data.user));
  }, [data?.user, dispatch]);

  useGlobalShortcut([
    { test: (e) => (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k', fn: () => dispatch(togglePalette()) },
    { test: (e) => e.key === 'Escape', fn: () => dispatch(closePalette()) },
  ]);

  const onLogout = async () => {
    try {
      await logout();
      dispatch(pushToast('Signed out', 'info'));
    } catch {
      dispatch(pushToast('Could not sign out — session already gone?', 'error'));
    } finally {
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-indigo-600 focus:px-3 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>

      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex dark:border-slate-800 dark:bg-slate-900">
        <div className="px-5 py-4">
          <Logo />
        </div>
        <nav aria-label="Main" className="flex-1 space-y-1 px-3 py-2">
          {NAV.map((item, index) => (
            <div key={item.to}>
              {item.group && item.group !== NAV[index - 1]?.group && (
                <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-600">
                  {item.group}
                </p>
              )}
              <NavLink to={item.to} end={item.end} className={navClass}>
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </NavLink>
            </div>
          ))}
        </nav>
        <p className="px-5 py-4 text-xs text-slate-400 dark:text-slate-500">LifeOS</p>
      </aside>

      <div className="flex min-h-dvh flex-col lg:pl-64">
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
          <div className="flex items-center gap-2 px-4 py-2">
            <span className="lg:hidden">
              <Logo className="text-base" />
            </span>

            <div className="grow" />

            <button
              type="button"
              onClick={() => dispatch(setQuickAddOpen(true))}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
              aria-label="Quick add"
            >
              <span aria-hidden="true">＋</span>
            </button>

            <button
              type="button"
              onClick={() => dispatch(togglePalette())}
              aria-label="Search (Ctrl+K)"
              title="Search (Ctrl+K)"
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              <span aria-hidden="true">🔍</span>
              <span className="hidden sm:inline text-slate-500 dark:text-slate-400">Search</span>
              <kbd className="hidden rounded border border-slate-200 px-1 text-[10px] text-slate-400 sm:inline dark:border-slate-700 dark:text-slate-500">
                ⌘K
              </kbd>
            </button>

            <ThemeToggle />
            <NotificationsBell />

            <Link
              to="/settings"
              aria-label="Your profile and settings"
              title={user?.name}
              className="grid h-9 w-9 place-items-center rounded-full bg-indigo-600 text-sm font-semibold text-white"
            >
              {user?.name?.[0] || 'L'}
            </Link>

            <button
              type="button"
              onClick={onLogout}
              className="rounded-lg px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Sign out
            </button>
          </div>
        </header>

        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 sm:pb-6">
          {user?.onboarding && !user.onboarding.done && (
            <Link
              to="/onboarding"
              className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200 dark:hover:bg-indigo-900/60"
            >
              <span>
                <b>Finish setting up LifeOS</b> — the 10-minute wizard sets your wheel scores, vision, and first goal.
              </span>
              <span className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white">Start guided setup →</span>
            </Link>
          )}
          <Suspense
            fallback={
              <div className="grid place-items-center py-24" role="status" aria-live="polite">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* Bottom nav (mobile) */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white sm:hidden dark:border-slate-800 dark:bg-slate-900"
      >
        {NAV.filter((item) => item.mobile).map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) =>
            ['flex flex-1 items-center justify-center gap-1 py-3 text-xs font-medium', isActive ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400'].join(' ')
          }>
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <CommandPalette />
      <QuickAddModal />
      <Toaster />
    </div>
  );
}
