import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { useListGoalsQuery, useCreateGoalMutation, useUpdateGoalMutation } from '../../api/goal.api';
import { useListAreasQuery } from '../../api/life.api';
import { getApiError } from '../../api/base';
import { pushToast } from '../../stores/uiSlice';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Modal from '../../components/ui/Modal.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import ProgressRing from '../../components/ui/ProgressRing.jsx';

const stepFor = (target) => Math.max(1, Math.round((target || 1) / 20));

// OKR operating page: create objectives with 2–5 key results, tick currents up.
export default function OkrPage() {
  const dispatch = useDispatch();
  const okrs = useListGoalsQuery({ view: 'okr' });
  const [updateGoal] = useUpdateGoalMutation();
  const [creating, setCreating] = useState(false);

  const bump = async (goal, index, delta) => {
    const next = (goal.okrKeyResults || []).map((kr, i) => {
      if (i !== index) return kr;
      return { ...kr, current: Math.max(0, Math.min(kr.target, Number(kr.current) + delta)) };
    });
    try {
      const { data } = await updateGoal({ goalId: goal._id, okrKeyResults: next }).unwrap();
      dispatch(pushToast(data?.celebration ? 'Objective complete — outstanding.' : 'Key result updated', 'success'));
    } catch (err) {
      dispatch(pushToast(getApiError(err), 'error'));
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Goals"
        title="OKR"
        subtitle="Objectives that matter, measured by key results that don't lie."
        actions={<Button onClick={() => setCreating(true)}>＋ New objective</Button>}
      />

      {okrs.isLoading ? (
        <Card className="p-10 text-center text-sm text-slate-400">Loading OKRs…</Card>
      ) : (okrs.data?.goals || []).length === 0 ? (
        <Card className="py-14 text-center text-sm text-slate-400 dark:text-slate-500">
          No OKRs yet. Create an objective and 2–4 key results that prove you got there.
        </Card>
      ) : (
        <ul className="grid gap-4 xl:grid-cols-2">
          {okrs.data.goals.map((goal) => (
            <Card key={goal._id} className="flex flex-col gap-3 p-4">
              <div className="flex items-start gap-3">
                <ProgressRing percent={goal.progressPercent} size={58} color={goal.status === 'completed' ? 'emerald' : 'indigo'} />
                <div className="min-w-0 grow">
                  <p className="truncate font-semibold">{goal.title}</p>
                  <p className="text-xs text-slate-400">
                    {goal.areaIcon ? `${goal.areaIcon} ` : ''}{goal.areaName || 'no area'} · {goal.targetDate ? `by ${new Date(goal.targetDate).toLocaleDateString()}` : 'no target date'}
                  </p>
                </div>
                <Link to={`/goals/${goal._id}`} className="rounded-lg px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Open</Link>
              </div>

              <ul className="space-y-2">
                {(goal.okrKeyResults || []).map((kr, index) => {
                  const pct = Math.max(0, Math.min(100, (Number(kr.current) / Math.max(kr.target || 1, 1)) * 100));
                  return (
                    <li key={index} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                      <div className="flex items-center justify-between gap-2">
                        <p className="grow truncate text-sm">{kr.title}</p>
                        <span className="text-xs text-slate-400">{kr.current}/{kr.target} {kr.unit || ''}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <Button size="sm" variant="secondary" onClick={() => bump(goal, index, -stepFor(kr.target))} aria-label="Decrement key result">−</Button>
                        <span className="h-1.5 grow overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                          <span className="block h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                        </span>
                        <Button size="sm" variant="secondary" onClick={() => bump(goal, index, stepFor(kr.target))} aria-label="Increment key result">＋{stepFor(kr.target)}</Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))}
        </ul>
      )}

      <NewOkrModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

const blankKr = () => ({ title: '', unit: '', current: 0, target: 100 });

function NewOkrModal({ open, onClose }) {
  const dispatch = useDispatch();
  const [createGoal, { isLoading: saving }] = useCreateGoalMutation();
  const areas = useListAreasQuery();

  const [title, setTitle] = useState('');
  const [areaId, setAreaId] = useState('');
  const [keyResults, setKeyResults] = useState([blankKr()]);

  const reset = () => {
    setTitle('');
    setKeyResults([blankKr()]);
  };

  const setKr = (index, patch) =>
    setKeyResults((krs) => krs.map((kr, i) => (i === index ? { ...kr, ...patch } : kr)));

  const submit = async (event) => {
    event.preventDefault();
    if (!areaId || !title.trim()) return;
    const usable = keyResults.filter((kr) => kr.title.trim());
    try {
      await createGoal({
        areaId,
        title: title.trim(),
        type: 'okr',
        status: 'active',
        okrKeyResults: usable.map((kr) => ({
          title: kr.title.trim(),
          unit: kr.unit.trim(),
          current: Number(kr.current) || 0,
          target: Number(kr.target) || 100,
        })),
      }).unwrap();
      dispatch(pushToast('Objective created', 'success'));
      reset();
      onClose();
    } catch (err) {
      dispatch(pushToast(getApiError(err), 'error'));
    }
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title="New OKR objective" width="max-w-2xl">
      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_240px]">
          <label className="block text-sm">
            Objective
            <Input required maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" placeholder="e.g. Become a confident TypeScript engineer" />
          </label>
          <label className="block text-sm">
            Life area
            <select className="input mt-1" value={areaId} onChange={(e) => setAreaId(e.target.value)} required>
              <option value="" disabled>Choose…</option>
              {(areas.data?.areas || []).map((area) => (
                <option key={area._id} value={area._id}>{area.icon ? `${area.icon} ` : ''}{area.name}</option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <p className="mb-1 text-sm font-medium">Key results (the scoreboard)</p>
          {keyResults.map((kr, index) => (
            <div key={index} className="mb-2 grid gap-2 sm:grid-cols-[1fr_120px_90px_auto]">
              <Input value={kr.title} maxLength={160} placeholder={`Key result ${index + 1}`} onChange={(e) => setKr(index, { title: e.target.value })} />
              <Input value={kr.unit} maxLength={20} placeholder="unit (e.g. talks)" onChange={(e) => setKr(index, { unit: e.target.value })} />
              <Input type="number" min="1" max="100000" value={kr.target} onChange={(e) => setKr(index, { target: e.target.value })} aria-label="Target" />
              <Button type="button" size="sm" variant="subtle" className="self-center text-rose-600 dark:text-rose-400" aria-label="Remove key result" onClick={() => setKeyResults((krs) => krs.filter((_, i) => i !== index))}>✕</Button>
            </div>
          ))}
          {keyResults.length < 5 && (
            <Button type="button" size="sm" variant="secondary" onClick={() => setKeyResults((krs) => [...krs, blankKr()])}>＋ Add key result</Button>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create objective'}</Button>
        </div>
      </form>
    </Modal>
  );
}
