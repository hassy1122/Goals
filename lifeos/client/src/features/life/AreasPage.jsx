import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  useGetWheelQuery,
  useCreateAreaMutation,
  useUpdateAreaMutation,
  useDeleteAreaMutation,
  useAssessAreaMutation,
  useListAreaAssessmentsQuery,
} from '../../api/life.api';
import { getApiError } from '../../api/base';
import { pushToast } from '../../stores/uiSlice';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Input from '../../components/ui/Input.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import ProgressRing from '../../components/ui/ProgressRing.jsx';
import { WheelRadar, ScoreLine } from '../../components/charts';

const ICONS = ['💪', '💼', '💰', '🎓', '🤝', '🏡', '🌱', '🙏', '🎨', '🌳', '❤️', '⭐'];
const COLORS = ['#10b981', '#0ea5e9', '#f59e0b', '#6366f1', '#ec4899', '#8b5cf6', '#f97316', '#84cc16'];

const seedForm = (area) => ({
  name: area?.name ?? '',
  icon: area?.icon ?? '⭐',
  color: area?.color ?? COLORS[0],
  targetScore: area?.targetScore ?? 8,
  notes: area?.notes ?? '',
});

export default function AreasPage() {
  const dispatch = useDispatch();
  const wheel = useGetWheelQuery();
  const deleteArea = useDeleteAreaMutation()[0];
  const [editing, setEditing] = useState(null); // area object | 'new' | null
  const [assessing, setAssessing] = useState(null); // area object | null

  const onDelete = async (area) => {
    try {
      await deleteArea(area._id).unwrap();
      dispatch(pushToast('Area deleted', 'success'));
    } catch (err) {
      dispatch(pushToast(getApiError(err), 'error'));
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="My life"
        title="Life areas"
        subtitle="Ten areas. Rate honestly, aim the weakest, and let your goals pull the wheel up."
        actions={<Button onClick={() => setEditing('new')}>＋ New area</Button>}
      />

      {wheel.isLoading ? (
        <Card className="p-10 text-center text-sm text-slate-400">Loading areas…</Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <Card className="p-4">
            <h2 className="mb-2 text-center font-semibold">Your wheel</h2>
            <WheelRadar areas={wheel.data.areas} />
            <p className="mt-2 text-center text-xs text-slate-400 dark:text-slate-500">
              blended = 60% self-rating + 40% goal momentum
            </p>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {wheel.data.areas.map((area) => (
              <Card key={area._id} className="flex flex-col gap-3 p-4">
                <div className="flex items-center gap-3">
                  <span
                    className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-xl dark:bg-slate-800"
                    style={{ boxShadow: `inset 0 0 0 2px ${area.color || '#0ea5e9'}33` }}
                  >
                    {area.icon || '⭐'}
                  </span>
                  <div className="min-w-0 grow">
                    <p className="truncate font-semibold">{area.name}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      self-rating {area.latestAssessment ? `${area.latestAssessment.score}/10` : '— none yet'}
                    </p>
                  </div>
                  <ProgressRing percent={area.blendedScore * 10} size={48} />
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  blended {area.blendedScore} · from goals {area.goalScore} · target {area.targetScore}
                </p>

                <div className="mt-auto flex items-center gap-1.5 text-xs">
                  <Button size="sm" variant="secondary" onClick={() => setAssessing(area)}>Rate now</Button>
                  <Button size="sm" variant="subtle" onClick={() => setEditing(area)}>Edit</Button>
                  <Button
                    size="sm"
                    variant="subtle"
                    className="text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                    onClick={() => onDelete(area)}
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <AreaFormModal open={Boolean(editing)} area={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      <AssessmentModal open={Boolean(assessing)} area={assessing} onClose={() => setAssessing(null)} />
    </div>
  );
}

function AreaFormModal({ open, area, onClose }) {
  const dispatch = useDispatch();
  const [createArea, { isLoading: creating }] = useCreateAreaMutation();
  const [updateArea, { isLoading: updating }] = useUpdateAreaMutation();
  const [form, setForm] = useState(seedForm(area));

  useEffect(() => {
    if (open) setForm(seedForm(area));
  }, [open, area]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;
  const saving = creating || updating;

  const submit = async (event) => {
    event.preventDefault();
    const body = {
      name: form.name,
      icon: form.icon,
      color: form.color,
      targetScore: Number(form.targetScore),
      notes: form.notes,
    };
    try {
      if (area) {
        await updateArea({ id: area._id, ...body }).unwrap();
        dispatch(pushToast('Area updated', 'success'));
      } else {
        await createArea(body).unwrap();
        dispatch(pushToast('Area created', 'success'));
      }
      onClose();
    } catch (err) {
      dispatch(pushToast(getApiError(err), 'error'));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={area ? `Edit: ${area.name}` : 'New life area'}>
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-sm">
          Name
          <Input required maxLength={40} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="mt-1" />
        </label>

        <div>
          <p className="mb-1 text-sm font-medium">Icon</p>
          <div className="flex flex-wrap gap-1">
            {ICONS.map((icon) => (
              <button
                type="button"
                key={icon}
                onClick={() => setForm((f) => ({ ...f, icon }))}
                aria-label={`Icon ${icon}`}
                className={
                  form.icon === icon
                    ? 'rounded-lg bg-indigo-100 p-1.5 text-lg ring-2 ring-indigo-500 dark:bg-indigo-900'
                    : 'rounded-lg p-1.5 text-lg hover:bg-slate-100 dark:hover:bg-slate-800'
                }
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 text-sm font-medium">Color</p>
          <div className="flex gap-2">
            {COLORS.map((color) => (
              <button
                type="button"
                key={color}
                onClick={() => setForm((f) => ({ ...f, color }))}
                aria-label={`Color ${color}`}
                className={
                  form.color === color
                    ? 'h-7 w-7 rounded-full ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900'
                    : 'h-7 w-7 rounded-full'
                }
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <label className="block text-sm">
          Target score (1–10)
          <Input
            type="number"
            min="1"
            max="10"
            required
            value={form.targetScore}
            onChange={(e) => setForm((f) => ({ ...f, targetScore: e.target.value }))}
            className="mt-1"
          />
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save area'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function AssessmentModal({ open, area, onClose }) {
  const dispatch = useDispatch();
  const [score, setScore] = useState(5);
  const [note, setNote] = useState('');
  const [assessArea, { isLoading }] = useAssessAreaMutation();

  useEffect(() => {
    if (open) {
      setScore(5);
      setNote('');
    }
  }, [open, area]); // eslint-disable-line react-hooks/exhaustive-deps

  const history = useListAreaAssessmentsQuery(
    open && area ? { id: area._id, limit: 10 } : { id: 'skip' },
    { skip: !open || !area },
  );

  const submit = async (event) => {
    event.preventDefault();
    try {
      await assessArea({ id: area._id, score: Number(score), note }).unwrap();
      dispatch(pushToast(`Rated ${area.name} at ${score}/10`, 'success'));
      onClose();
    } catch (err) {
      dispatch(pushToast(getApiError(err), 'error'));
    }
  };

  const points = (history.data?.assessments || [])
    .slice()
    .reverse()
    .map((a) => ({ score: a.score, date: a.date }));

  return (
    <Modal open={open} onClose={onClose} title={area ? `Rate: ${area.name}` : 'Rate area'}>
      <form onSubmit={submit} className="space-y-3">
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              type="button"
              key={n}
              onClick={() => setScore(n)}
              aria-label={`Score ${n}`}
              className={
                Number(score) === n
                  ? 'h-9 w-9 rounded-lg bg-indigo-600 text-sm font-semibold text-white'
                  : 'h-9 w-9 rounded-lg bg-slate-100 text-sm hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700'
              }
            >
              {n}
            </button>
          ))}
        </div>
        <textarea
          className="input min-h-16"
          maxLength={1000}
          placeholder="What's working, what's dragging it down? (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isLoading}>{isLoading ? 'Saving…' : 'Save rating'}</Button>
        </div>
      </form>
      {points.length > 0 && (
        <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-800">
          <ScoreLine series={[{ name: area?.name || 'score', points }]} />
        </div>
      )}
    </Modal>
  );
}
