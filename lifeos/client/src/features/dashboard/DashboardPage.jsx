import { useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { useGetMeQuery, useUpdatePreferencesMutation } from '../../api/auth.api';
import { pushToast } from '../../stores/uiSlice';
import GreetingWidget from './widgets/GreetingWidget.jsx';
import QuoteWidget from './widgets/QuoteWidget.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';

// Widget registry — modules register here as they land (phases 2–6).
const REGISTRY = [
  { id: 'greeting', title: 'Welcome', component: GreetingWidget, defaultOrder: 0, defaultHidden: false },
  { id: 'quote', title: 'Quote of the day', component: QuoteWidget, defaultOrder: 1, defaultHidden: false },
];

export default function DashboardPage() {
  const dispatch = useDispatch();
  const { data: me } = useGetMeQuery();
  const user = me?.user;
  const [updatePreferences] = useUpdatePreferencesMutation();

  const layout = useMemo(() => {
    const saved = new Map((user?.prefs?.dashboardLayout || []).map((w) => [w.widgetId, w]));
    return REGISTRY.map((w, i) => ({
      ...w,
      order: saved.get(w.id)?.order ?? w.defaultOrder ?? i,
      hidden: saved.get(w.id)?.hidden ?? w.defaultHidden ?? false,
    })).sort((a, b) => a.order - b.order);
  }, [user]);

  const visible = layout.filter((w) => !w.hidden);
  const hiddenOnes = layout.filter((w) => w.hidden);

  const saveLayout = (next) => {
    updatePreferences({ prefs: { dashboardLayout: next.map((w) => ({ widgetId: w.id, order: w.order, hidden: w.hidden })) } });
  };

  const notifySaved = () => dispatch(pushToast('Dashboard layout saved', 'success'));

  const move = (id, dir) => {
    const visibleSorted = [...visible];
    const idx = visibleSorted.findIndex((w) => w.id === id);
    const swapIdx = idx + dir;
    if (idx === -1 || swapIdx < 0 || swapIdx >= visibleSorted.length) return;

    const a = visibleSorted[idx];
    const b = visibleSorted[swapIdx];
    const next = visibleSorted.map((w) => {
      if (w.id === a.id) return { ...w, order: b.order };
      if (w.id === b.id) return { ...w, order: a.order };
      return w;
    });
    // hidden widgets keep their previous orders
    const merged = [...next, ...hiddenOnes];
    saveLayout(merged);
    notifySaved();
  };

  const toggleHidden = (id) => {
    const next = layout.map((w) => (w.id === id ? { ...w, hidden: !w.hidden } : w));
    saveLayout(next);
  };

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Dashboard</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        Your widgets — hide or reorder them (order is saved to your account).
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {visible.length === 0 && (
          <div className="sm:col-span-2">
            <Card>
              <p className="text-sm text-slate-500 dark:text-slate-400">All widgets are hidden — show them below.</p>
            </Card>
          </div>
        )}

        {visible.map((w, i) => (
          <Card key={w.id} className="sm:col-span-2" aria-label={w.title}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{w.title}</h2>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(w.id, -1)}
                  disabled={i === 0}
                  className="rounded px-1.5 py-1 text-xs text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                  aria-label={`Move ${w.title} up`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(w.id, 1)}
                  disabled={i === visible.length - 1}
                  className="rounded px-1.5 py-1 text-xs text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                  aria-label={`Move ${w.title} down`}
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => toggleHidden(w.id)}
                  className="rounded px-1.5 py-1 text-xs text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label={`Hide ${w.title}`}
                >
                  Hide
                </button>
              </div>
            </div>
            <w.component />
          </Card>
        ))}
      </div>

      {hiddenOnes.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 dark:text-slate-500">Hidden:</span>
          {hiddenOnes.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => toggleHidden(w.id)}
              className="rounded-full border border-slate-200 px-2.5 py-1 text-xs hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              {w.title} · show
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
