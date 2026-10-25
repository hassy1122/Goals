import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useGetVisionQuery, useUpdateVisionMutation } from '../../api/life.api';
import { useListGoalsQuery } from '../../api/goal.api';
import { getApiError } from '../../api/base';
import { pushToast } from '../../stores/uiSlice';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';

const HORIZONS = [
  { n: 1, label: '1 year', days: 365 },
  { n: 3, label: '3 years', days: 365 * 3 },
  { n: 5, label: '5 years', days: 365 * 5 },
  { n: 10, label: '10 years', days: 365 * 10 },
];

const EMPTY_ENTRY = { horizon: null, title: '', notes: '' };

export default function RoadmapPage() {
  const dispatch = useDispatch();
  const vision = useGetVisionQuery();
  const goals = useListGoalsQuery({ view: 'all' });
  const [updateVision, { isLoading: saving }] = useUpdateVisionMutation();

  const roadmap = vision.data?.vision?.roadmap || [];
  const [drafts, setDrafts] = useState({});
  useEffect(() => {
    const seeded = {};
    for (const { n } of HORIZONS) {
      seeded[n] = { ...EMPTY_ENTRY, ...(roadmap.find((entry) => entry.horizon === n) || {}) };
    }
    setDrafts(seeded);
  }, [vision.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveHorizon = async (horizon) => {
    const draft = drafts[horizon];
    if (!draft?.title?.trim()) return;
    const rest = roadmap.filter((e) => e.horizon !== horizon);
    try {
      await updateVision({ roadmap: [...rest, { horizon, title: draft.title.trim(), notes: draft.notes || '' }] }).unwrap();
      dispatch(pushToast(`${horizon}-year horizon saved`, 'success'));
    } catch (err) {
      dispatch(pushToast(getApiError(err), 'error'));
    }
  };

  // Goals whose target date falls within each horizon's window (supporting evidence).
  const withinDays = (goal, days) => {
    if (!goal.targetDate) return false;
    const delta = (new Date(goal.targetDate).getTime() - Date.now()) / 86400000;
    return delta <= days;
  };

  return (
    <div>
      <PageHeader
        eyebrow="My life"
        title="Roadmap"
        subtitle="The 1/3/5/10 line — what is true when you get there."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {HORIZONS.map(({ n, label, days }) => {
          const draft = drafts[n];
          const supports = (goals.data?.goals || []).filter((g) => withinDays(g, days) && !withinDays(g, HORIZONS.find((h) => h.n === n - 1)?.days ?? 0));
          return (
            <Card key={n} className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">{label}</p>
              {vision.isLoading ? (
                <p className="mt-3 text-sm text-slate-400">Loading…</p>
              ) : (
                <>
                  <textarea
                    className="input mt-2 min-h-16 text-sm"
                    maxLength={160}
                    placeholder="One north star for this horizon"
                    value={draft?.title ?? ''}
                    onChange={(e) => setDrafts((d) => ({ ...d, [n]: { ...d[n], title: e.target.value } }))}
                  />
                  <textarea
                    className="input mt-2 min-h-16 text-xs"
                    maxLength={1000}
                    placeholder="Notes"
                    value={draft?.notes ?? ''}
                    onChange={(e) => setDrafts((d) => ({ ...d, [n]: { ...d[n], notes: e.target.value } }))}
                  />
                  <Button size="sm" className="mt-3 w-full" disabled={saving} onClick={() => saveHorizon(n)}>
                    Save {label} horizon
                  </Button>
                  {supports.length > 0 && (
                    <div className="mt-3 border-t border-slate-200 pt-2 dark:border-slate-800">
                      <p className="mb-1 text-[11px] font-semibold text-slate-400">Supporting goals</p>
                      <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                        {supports.slice(0, 5).map((g) => (
                          <li key={g._id} className="truncate">
                            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {g.title}
                          </li>
                        ))}
                        {supports.length > 5 && <li className="text-slate-400">+{supports.length - 5} more…</li>}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
