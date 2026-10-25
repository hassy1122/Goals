import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useCreateGoalMutation, useUpdateGoalMutation } from '../../api/goal.api';
import { useListAreasQuery } from '../../api/life.api';
import { getApiError } from '../../api/base';
import { pushToast } from '../../stores/uiSlice';
import Modal from '../../components/ui/Modal.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import PriorityBadge from '../../components/ui/PriorityBadge.jsx';

const GOAL_TYPES = [
  ['short', 'Short-term'],
  ['medium', 'Medium-term'],
  ['long', 'Long-term'],
  ['lifetime', 'Lifetime'],
  ['okr', 'OKR'],
];
const STATUSES = ['idea', 'planned', 'active', 'paused', 'completed', 'dropped', 'failed'];
const MOSCOW = ['must', 'should', 'could', "won't"];

// Same formula as the server: (Importance×3 + Impact×2 + Urgency×2) ÷ Effort.
const priority = (f) => {
  const effort = Number(f.effort) || 1;
  return Math.round(((Number(f.importance) * 3 + Number(f.impact) * 2 + Number(f.urgency) * 2) / effort) * 10) / 10;
};

const today = () => new Date().toISOString().slice(0, 10);

const seed = (goal) => ({
  title: goal?.title ?? '',
  areaId: goal?.area?.[0]?._id ?? goal?.areaId ?? '',
  type: goal?.type ?? 'medium',
  status: goal?.status ?? 'idea',
  description: goal?.description ?? '',
  why: goal?.why ?? '',
  startDate: goal?.startDate ? goal.startDate.slice(0, 10) : '',
  targetDate: goal?.targetDate ? goal.targetDate.slice(0, 10) : '',
  importance: goal?.importance ?? 3,
  impact: goal?.impact ?? 3,
  urgency: goal?.urgency ?? 3,
  effort: goal?.effort ?? 3,
  moscow: goal?.moscow ?? 'should',
  weight: goal?.weight ?? 10,
  isBucketList: Boolean(goal?.isBucketList),
});

export default function GoalFormModal({ open, goal = null, defaultAreaId = '', isBucketList = false, title, onClose }) {
  const dispatch = useDispatch();
  const [createGoal, { isLoading: creating }] = useCreateGoalMutation();
  const [updateGoal, { isLoading: updating }] = useUpdateGoalMutation();
  const [form, setForm] = useState(seed(goal));

  useEffect(() => {
    if (open) {
      const base = seed(goal);
      if (defaultAreaId) base.areaId = defaultAreaId;
      if (isBucketList) {
        base.isBucketList = true;
        base.status = 'idea';
      }
      setForm(base);
    }
  }, [open, goal, defaultAreaId, isBucketList]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open || !form) return null;
  const saving = creating || updating;
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (event) => {
    event.preventDefault();
    const body = {
      title: form.title,
      areaId: form.areaId,
      type: form.type,
      status: form.status,
      description: form.description,
      why: form.why,
      startDate: form.startDate || undefined,
      targetDate: form.targetDate || undefined,
      importance: Number(form.importance),
      impact: Number(form.impact),
      urgency: Number(form.urgency),
      effort: Number(form.effort),
      moscow: form.moscow,
      weight: Number(form.weight),
      isBucketList: form.isBucketList,
    };
    try {
      let message;
      if (goal) {
        await updateGoal({ goalId: goal._id, ...body }).unwrap();
        message = 'Goal updated';
      } else {
        await createGoal(body).unwrap();
        message = form.isBucketList ? 'Bucket-list item added' : 'Goal created';
      }
      dispatch(pushToast(message, 'success'));
      onClose();
    } catch (err) {
      dispatch(pushToast(getApiError(err), 'error'));
    }
  };

  const RangeField = ({ name, label, min, max, hint }) => (
    <label className="text-xs text-slate-500 dark:text-slate-400 sm:w-36">
      {label}: {form[name]}
      <input
        type="range"
        min={min}
        max={max}
        step="1"
        value={form[name]}
        className="w-full accent-indigo-600"
        onChange={(e) => set({ [name]: Number(e.target.value) })}
      />
      {hint && <span className="block text-[10px] leading-tight">{hint}</span>}
    </label>
  );

  return (
    <Modal open={open} onClose={onClose} title={title || (goal ? `Edit: ${goal.title}` : 'New goal')} width="max-w-2xl">
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-sm">
          Goal
          <Input
            required
            maxLength={160}
            value={form.title}
            onChange={(e) => set({ title: e.target.value })}
            className="mt-1"
            placeholder="Concrete and finishable, e.g. 'Run a 10K race'"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm">
            Life area
            <AreaSelect value={form.areaId} onChange={(areaId) => set({ areaId })} className="mt-1" required />
          </label>
          <label className="block text-sm">
            Type
            <select className="input mt-1" value={form.type} onChange={(e) => set({ type: e.target.value })} disabled={Boolean(goal)}>
              {GOAL_TYPES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Status
            <select className="input mt-1" value={form.status} onChange={(e) => set({ status: e.target.value })}>
              {STATUSES.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            Start date
            <Input type="date" value={form.startDate || ''} onChange={(e) => set({ startDate: e.target.value })} className="mt-1" />
          </label>
          <label className="block text-sm">
            Target date
            <Input type="date" min={today()} value={form.targetDate || ''} onChange={(e) => set({ targetDate: e.target.value })} className="mt-1" />
          </label>
        </div>

        {form.why === '' && !goal ? null : (
          <label className="block text-sm">
            Why it matters
            <textarea
              className="input mt-1 min-h-14"
              maxLength={1000}
              value={form.why}
              onChange={(e) => set({ why: e.target.value })}
              placeholder="The sentence you'll reread on a bad week"
            />
          </label>
        )}

        <label className="block text-sm">          Notes
          <textarea
            className="input mt-1 min-h-14"
            maxLength={2000}
            value={form.description}
            onChange={(e) => set({ description: e.target.value })}
            placeholder="How you'll approach it (optional)"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <RangeField name="importance" label="Importance" min="1" max="5" hint="how core to your life" />
          <RangeField name="impact" label="Impact" min="1" max="5" hint="size of the outcome" />
          <RangeField name="urgency" label="Urgency" min="1" max="5" hint="how time-critical" />
          <RangeField name="effort" label="Effort" min="1" max="8" hint="hours/days per push" />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm">
            MoSCoW
            <select className="input mt-1" value={form.moscow} onChange={(e) => set({ moscow: e.target.value })}>
              {MOSCOW.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Area weight %
            <Input
              type="number"
              min="1"
              max="100"
              value={form.weight}
              onChange={(e) => set({ weight: e.target.value })}
              className="mt-1"
            />
            <span className="text-[10px] text-slate-400">weights in an area must sum to ≤ 100</span>
          </label>
          <label className="flex items-center gap-2 self-end pb-1 text-sm">
            <input type="checkbox" checked={form.isBucketList} onChange={(e) => set({ isBucketList: e.target.checked })} className="h-4 w-4 accent-indigo-600" />
            Bucket-list item
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
          <span className="text-xs text-slate-500 dark:text-slate-400">Priority preview</span>
          <PriorityBadge score={priority(form)} />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : goal ? 'Save goal' : form.isBucketList ? 'Add to bucket list' : 'Create goal'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function AreaSelect({ value, onChange, className, required }) {
  const { data } = useListAreasQuery();
  return (
    <select className={`input ${className || ''}`} value={value} onChange={(e) => onChange(e.target.value)} required={required}>
      <option value="" disabled>Choose an area…</option>
      {(data?.areas || []).map((area) => (
        <option key={area._id} value={area._id} disabled={area.archived}>
          {area.icon ? `${area.icon} ` : ''}{area.name}
        </option>
      ))}
    </select>
  );
}
