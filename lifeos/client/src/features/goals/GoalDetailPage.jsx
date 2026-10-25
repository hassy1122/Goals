import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  useGetGoalQuery,
  useUpdateGoalMutation,
  useDeleteGoalMutation,
  useCreateMilestoneMutation,
  useUpdateMilestoneMutation,
  useDeleteMilestoneMutation,
  useReorderMilestonesMutation,
  useRedeemMilestoneMutation,
  useAddRiskMutation,
  useUpdateRiskMutation,
  useDeleteRiskMutation,
  useAddDependencyMutation,
  useRemoveDependencyMutation,
  useListDependencyCandidatesQuery,
  useGetBurnupQuery,
  useMakeTemplateMutation,
} from '../../api/goal.api';
import { getApiError } from '../../api/base';
import { pushToast } from '../../stores/uiSlice';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Modal from '../../components/ui/Modal.jsx';
import ProgressRing from '../../components/ui/ProgressRing.jsx';
import PriorityBadge from '../../components/ui/PriorityBadge.jsx';
import { BurnupChart } from '../../components/charts';
import CelebrationModal from './CelebrationModal.jsx';
import GoalFormModal from './GoalFormModal.jsx';

const STATUSES = ['idea', 'planned', 'active', 'paused', 'completed', 'dropped', 'failed'];
const SOURCE_LABEL = {
  'key-results': 'OKR key results',
  milestones: 'milestones',
  metrics: 'success metrics',
  manual: 'manual',
};

export default function GoalDetailPage() {
  const { goalId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const goalRes = useGetGoalQuery(goalId);
  const [updateGoal, { isLoading: patching }] = useUpdateGoalMutation();
  const [deleteGoal] = useDeleteGoalMutation();
  const [celebration, setCelebration] = useState(false);

  const goal = goalRes.data?.goal;
  const milestones = goalRes.data?.milestones || [];

  const patch = async (body, message = 'Saved') => {
    try {
      const { data } = await updateGoal({ goalId, ...body }).unwrap();
      if (!message) return data;
      dispatch(pushToast(data?.celebration ? 'Completed! Well done.' : message, 'success'));
      if (data?.celebration) setCelebration(true);
      return data;
    } catch (err) {
      dispatch(pushToast(getApiError(err), 'error'));
      return undefined;
    }
  };

  const onDelete = async () => {
    try {
      await deleteGoal(goalId).unwrap();
      dispatch(pushToast('Goal deleted', 'success'));
      navigate('/goals', { replace: true });
    } catch (err) {
      dispatch(pushToast(getApiError(err), 'error'));
    }
  };

  if (goalRes.isLoading) {
    return <Card className="p-10 text-center text-sm text-slate-400">Loading goal…</Card>;
  }
  if (!goal) {
    return (
      <Card className="py-14 text-center text-sm text-slate-400">
        Goal not found. <Link to="/goals" className="underline">Back to goals</Link>
      </Card>
    );
  }

  return (
    <div>
      <Header goal={goal} onStatus={(status) => patch({ status }, `Marked ${status}`)} onDelete={onDelete} onManual={(value) => patch({ manualProgress: value }, 'Progress updated')} />
      <ProgressLine goal={goal} />
      <BurnupCard goalId={goalId} />
      <Card className="mt-5 p-5">
        <Milestones goalId={goalId} milestones={milestones} />
      </Card>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <Checklist goal={goal} onToggle={(index) => {
            const next = (goal.smartChecklist || []).map((item, i) => (i === index ? { ...item, checked: !item.checked } : item));
            patch({ smartChecklist: next }, 'Checklist updated');
          }} />
          <Metrics goal={goal} />
        </Card>
        <Card className="p-5">
          <KeyResults goal={goal} onKeyIndex={(index, delta) => {
            const next = (goal.okrKeyResults || []).map((kr, i) => {
              if (i !== index) return kr;
              const current = Math.max(0, Math.min(kr.target, Number(kr.current) + delta));
              return { ...kr, current };
            });
            patch({ okrKeyResults: next }, 'Key result updated');
          }} />
          <Risks goalId={goalId} risks={goal.risks || []} />
        </Card>
      </div>
      <Dependencies goal={goal} onSaved={() => goalRes.refetch()} />
      <CelebrationModal open={celebration} goalTitle={goal.title} onClose={() => setCelebration(false)} />
      <div className="mt-6 space-y-2">
        {goal.isBucketList && (
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Bucket-list goals are excluded from life-area scoring by design — they're aspirations, not yearly commitments.
          </p>
        )}
      </div>
    </div>
  );
}

// ---------- Header ----------
function Header({ goal, onStatus, onDelete, onManual }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [templateKey, setTemplateKey] = useState('');
  const [openModal, setOpenModal] = useState(false);
  const [makeTemplate, { isLoading: templating }] = useMakeTemplateMutation();
  const dispatch = useDispatch();

  const onSaveTemplate = async () => {
    try {
      const { data } = await makeTemplate({ goalId: goal._id, templateKey: templateKey || undefined }).unwrap();
      dispatch(pushToast(`Saved as template “${data.template.templateKey}”`, 'success'));
      setOpenModal(false);
      setTemplateKey('');
    } catch (err) {
      dispatch(pushToast(getApiError(err), 'error'));
    }
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-4">
          <ProgressRing percent={goal.progressPercent} size={72} color={goal.status === 'completed' ? 'emerald' : 'indigo'} />
          <div className="min-w-0">
            <Link to="/goals" className="text-xs text-slate-400 underline">← back</Link>
            <h1 className="truncate text-2xl font-bold">{goal.title}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{goal.areaIcon ? `${goal.areaIcon} ` : ''}{goal.areaName}</span>·
              <span className="capitalize">{goal.type}</span>·
              {goal.targetDate && <span>target {new Date(goal.targetDate).toLocaleDateString()}</span>}
              {goal.priorityScore != null && <PriorityBadge score={goal.priorityScore} label={goal.priorityLabel} />}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="input w-36"
            value={goal.status}
            onChange={(e) => onStatus(e.target.value)}
            aria-label="Goal status"
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <Button variant="secondary" onClick={() => setEditing(true)}>Edit</Button>
          <Button variant="secondary" onClick={() => setOpenModal(true)} disabled={templating}>
            {templating ? 'Saving…' : 'Save as template'}
          </Button>
          <Button variant="danger" onClick={() => setConfirmDelete(true)} aria-label="Delete goal">✕</Button>
        </div>
      </div>

      <GoalFormModal open={editing} goal={goal} title={`Edit: ${goal.title}`} onClose={() => setEditing(false)} />

      <Modal open={openModal} onClose={() => setOpenModal(false)} title="Save as reusable template">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Templates are copies, not conversions — the goal stays here. Apply them later from the Templates page.
        </p>
        <label className="mt-3 block text-sm">
          Custom template key (optional)
          <Input value={templateKey} maxLength={60} onChange={(e) => setTemplateKey(e.target.value)} className="mt-1" placeholder={goal.title?.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)} />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpenModal(false)}>Cancel</Button>
          <Button onClick={onSaveTemplate} disabled={templating}>Save template</Button>
        </div>
      </Modal>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete this goal?">
        <p className="text-sm">
          Milestones on this goal are deleted too; any goals depending on it get their reference removed. This cannot be undone.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Keep goal</Button>
          <Button variant="danger" onClick={onDelete}>Delete permanently</Button>
        </div>
      </Modal>
    </>
  );
}

// ---------- Progress ----------
function ProgressLine({ goal }) {
  const isManual = goal.progressSource === 'manual';
  return (
    <Card className="mb-5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Progress {Math.round(goal.progressPercent)}% — auto from <b>{SOURCE_LABEL[goal.progressSource] || goal.progressSource}</b>
          {!isManual && ' (edit the source, not this number)'}
        </p>
        {isManual ? (
          <label className="flex w-72 items-center gap-2 text-xs">
            Manual progress
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={goal.progressPercent}
              className="grow accent-indigo-600"
              onChange={(e) => onManual(Number(e.target.value))}
              aria-label="Manual progress"
            />
            <span className="w-10 text-right font-semibold">{Math.round(goal.progressPercent)}%</span>
          </label>
        ) : (
          <p className="text-xs text-slate-400">
            counts: {goal.counts?.milestonesDone ?? 0}/{goal.counts?.milestonesTotal ?? 0} milestones, {goal.counts?.tasksDone ?? 0}/{goal.counts?.tasksTotal ?? 0} tasks
          </p>
        )}
      </div>
    </Card>
  );
}

// ---------- Burn-up ----------
function BurnupCard({ goalId }) {
  const burnRes = useGetBurnupQuery(goalId);
  const data = burnRes.data;
  if (!data) return null;
  const message = { 'on-track': 'On track for the target date.', 'at-risk': 'Slipping — close gaps in the plan.', behind: 'Behind schedule. Consider scope or dates.' }[data.status];
  return (
    <Card className="mb-5 p-5">
      <h2 className="mb-1 text-sm font-semibold">Burn-up</h2>
      <p className="mb-3 text-xs text-slate-400">{message}</p>
      <BurnupChart planned={data.planned} actual={data.actual} target={data.targetDate} />
    </Card>
  );
}

// ---------- Milestones ----------
function Milestones({ goalId, milestones }) {
  const dispatch = useDispatch();
  const [createMilestone, { isLoading: adding }] = useCreateMilestoneMutation();
  const [updateMilestone] = useUpdateMilestoneMutation();
  const [deleteMilestone] = useDeleteMilestoneMutation();
  const [reorderMilestones] = useReorderMilestonesMutation();
  const [redeemMilestone] = useRedeemMilestoneMutation();

  const [form, setForm] = useState({});
  const setLocal = (id, patch) => setForm((f) => ({ ...f, [id]: { ...f[id], ...patch } }));

  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [reward, setReward] = useState('');

  const run = async (fn, message) => {
    try {
      await fn().unwrap();
      if (message) dispatch(pushToast(message, 'success'));
    } catch (err) {
      dispatch(pushToast(getApiError(err), 'error'));
    }
  };

  const add = () => {
    if (!title.trim()) return;
    run(() => createMilestone({
      goalId,
      title: title.trim(),
      ...(dueDate ? { dueDate: new Date(dueDate).toISOString() } : {}),
      ...(reward ? { reward } : {}),
    }), 'Milestone added');
    setTitle('');
    setDueDate('');
    setReward('');
  };

  const move = (index, delta) => {
    const ids = milestones.map((m) => m._id);
    const to = index + delta;
    if (to < 0 || to >= ids.length) return;
    [ids[index], ids[to]] = [ids[to], ids[index]];
    run(() => reorderMilestones({ goalId, order: ids }));
  };

  const setStatus = (m, status) => run(() => updateMilestone({ goalId, milestoneId: m._id, status }), status === 'done' ? 'Milestone done — progress reflected' : 'Reopened');

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold">Milestones <span className="ml-1 text-xs text-slate-400">{milestones.filter((m) => m.status === 'done').length}/{milestones.length} done {milestones.length > 0 ? '· these drive goal progress' : ''}</span></h2>

      <ul className="space-y-2">
        {milestones.map((m, index) => {
          const local = form[m._id] || {};
          const isDone = m.status === 'done';
          return (
            <li key={m._id} className={`rounded-xl border px-3 py-2 ${isDone ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30' : 'border-slate-200 dark:border-slate-800'}`}>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="checkbox"
                  checked={isDone}
                  onChange={() => setStatus(m, isDone ? 'todo' : 'done')}
                  className="h-4 w-4 accent-emerald-600"
                  aria-label={`Mark ${m.title}`}
                />
                <Input
                  value={local.title ?? m.title}
                  maxLength={160}
                  onChange={(e) => setLocal(m._id, { title: e.target.value })}
                  onBlurCapture={() => local.title && local.title !== m.title && run(() => updateMilestone({ goalId, milestoneId: m._id, title: local.title }), 'Milestone saved')}
                  className={`grow ${isDone ? 'line-through opacity-60' : ''}`}
                />
                <Input
                  type="date"
                  value={local.dueDate ?? (m.dueDate ? m.dueDate.slice(0, 10) : '')}
                  onChange={(e) => setLocal(m._id, { dueDate: e.target.value })}
                  onBlurCapture={() => local.dueDate !== undefined && run(() => updateMilestone({ goalId, milestoneId: m._id, dueDate: local.dueDate ? new Date(`${local.dueDate}T12:00:00`).toISOString() : null }), 'Date saved')}
                />
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="subtle" onClick={() => move(index, -1)} aria-label="Move up">↑</Button>
                  <Button size="sm" variant="subtle" onClick={() => move(index, 1)} aria-label="Move down">↓</Button>
                  <Button size="sm" variant="subtle" className="text-rose-600 dark:text-rose-400" onClick={() => run(() => deleteMilestone({ goalId, milestoneId: m._id }), 'Milestone removed')}>✕</Button>
                </div>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                {m.reward && (
                  m.rewardRedeemedAt ? (
                    <span className="text-emerald-600 dark:text-emerald-400">redeemed: {m.reward}</span>
                  ) : (
                    <button type="button" className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-300" onClick={() => run(() => redeemMilestone({ goalId, milestoneId: m._id }), 'Reward redeemed 🎁')}>
                      redeem {m.reward}
                    </button>
                  )
                )}
                {!m.reward && (
                  <input
                    className="input max-w-52 py-1 text-xs"
                    placeholder="+ add a reward"
                    value={local.rewardInput ?? ''}
                    onChange={(e) => setLocal(m._id, { rewardInput: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter' && e.target.value.trim()) { run(() => updateMilestone({ goalId, milestoneId: m._id, reward: e.target.value.trim() }), 'Reward set'); setLocal(m._id, { rewardInput: '' }); } }}
                  />
                )}
                {m.dueDate && !isDone && new Date(m.dueDate) < new Date() && (
                  <span className="text-rose-600 dark:text-rose-400">overdue</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <Input value={title} maxLength={160} placeholder="Next milestone…" className="max-w-xs" onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <Input value={reward} maxLength={120} placeholder="Reward (optional)" className="max-w-44" onChange={(e) => setReward(e.target.value)} />
        <Button size="sm" onClick={add} disabled={adding}>{adding ? 'Adding…' : 'Add'}</Button>
      </div>
    </div>
  );
}

// ---------- Smart checklist (embedded on goal, saved via goal PATCH) ----------
function Checklist({ goal, onToggle }) {
  const items = goal.smartChecklist || [];
  if (items.length === 0) return null;
  return (
    <div className="mb-5">
      <h2 className="mb-2 text-sm font-semibold">SMART checklist</h2>
      <ul className="space-y-1 text-sm">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            <input type="checkbox" checked={Boolean(item.checked)} onChange={() => onToggle(index)} className="h-4 w-4 accent-emerald-600" aria-label={item.text} />
            <span className={item.checked ? 'line-through opacity-60' : ''}>{item.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- Success metrics (read-only; metrics drive progress) ----------
function Metrics({ goal }) {
  const items = goal.successMetrics || [];
  if (items.length === 0) return null;
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold">Success metrics</h2>
      <ul className="space-y-1.5 text-sm">
        {items.map((metric, index) => {
          const pct = Math.max(0, Math.min(100, (Number(metric.current) / Math.max(metric.target || 1, 1)) * 100));
          return (
            <li key={index}>
              <span className="flex items-baseline justify-between gap-2">
                <span>{metric.label}</span>
                <span className="text-xs text-slate-400">{metric.current}/{metric.target} {metric.unit || ''}</span>
              </span>
              <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <span className="block h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------- OKR key results ----------
function KeyResults({ goal, onKeyIndex }) {
  const items = goal.okrKeyResults || [];
  if (goal.type !== 'okr' || items.length === 0) return null;
  return (
    <div className="mb-6">
      <h2 className="mb-2 text-sm font-semibold">OKR — key results</h2>
      <ul className="space-y-2 text-sm">
        {items.map((kr, index) => {
          const pct = Math.max(0, Math.min(100, (Number(kr.current) / Math.max(kr.target || 1, 1)) * 100));
          return (
            <li key={index} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <div className="flex items-center justify-between gap-2">
                <span className="grow">{kr.title}</span>
                <span className="text-xs text-slate-400">{kr.current}/{kr.target} {kr.unit || ''}</span>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <Button size="sm" variant="secondary" onClick={() => onKeyIndex(index, -stepFor(kr.target))} aria-label="Decrement key result">−</Button>
                <span className="h-1.5 grow overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <span className="block h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                </span>
                <Button size="sm" variant="secondary" onClick={() => onKeyIndex(index, stepFor(kr.target))} aria-label="Increment key result">＋{stepFor(kr.target)}</Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const stepFor = (target) => Math.max(1, Math.round((target || 1) / 20));

// ---------- Risks ----------
function Risks({ goalId, risks }) {
  const dispatch = useDispatch();
  const [addRisk, { isLoading: adding }] = useAddRiskMutation();
  const [updateRisk] = useUpdateRiskMutation();
  const [deleteRisk] = useDeleteRiskMutation();
  const [text, setText] = useState('');
  const [probability, setProbability] = useState(3);
  const [impact, setImpact] = useState(3);

  const run = async (fn, message) => {
    try {
      await fn().unwrap();
      if (message) dispatch(pushToast(message, 'success'));
    } catch (err) {
      dispatch(pushToast(getApiError(err), 'error'));
    }
  };

  const score = (risk) => risk.probability * risk.impact; // 1–25 severity heat

  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold">Risks & pre-mortems</h2>
      {risks.length === 0 && <p className="text-xs text-slate-400">No named risks. Naming them is half the defense.</p>}
      <ul className="space-y-2">
        {risks.map((risk, index) => (
          <li key={index} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm">{risk.risk}</p>
                {risk.backupPlan && <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-400">plan: {risk.backupPlan}</p>}
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] dark:bg-slate-800" title="Probability × impact (max 25)">severity {score(risk)}</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <input
                className="input flex-1 py-1 text-xs"
                placeholder="Backup plan…"
                maxLength={500}
                defaultValue={risk.backupPlan || ''}
                onBlur={(e) => e.target.value !== (risk.backupPlan || '') && run(() => updateRisk({ goalId, index, backupPlan: e.target.value }), 'Plan attached')}
              />
              <Button size="sm" variant="subtle" className="text-rose-600 dark:text-rose-400" onClick={() => run(() => deleteRisk({ goalId, index }), 'Risk removed')} aria-label="Remove risk">✕</Button>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Input value={text} maxLength={300} className="max-w-xs" placeholder="What could go wrong?" onChange={(e) => setText(e.target.value)} />
        <label className="text-xs text-slate-500 dark:text-slate-400">
          prob
          <input type="range" min="1" max="5" value={probability} className="w-20 accent-indigo-600" onChange={(e) => setProbability(Number(e.target.value))} />
        </label>
        <label className="text-xs text-slate-500 dark:text-slate-400">
          impact
          <input type="range" min="1" max="5" value={impact} className="w-20 accent-indigo-600" onChange={(e) => setImpact(Number(e.target.value))} />
        </label>
        <Button
          size="sm"
          disabled={adding || !text.trim()}
          onClick={() => {
            if (!text.trim()) return;
            run(() => addRisk({ goalId, risk: text.trim(), probability, impact }), 'Risk logged');
            setText('');
            setProbability(3);
            setImpact(3);
          }}
        >
          Add
        </Button>
      </div>
    </div>
  );
}

// ---------- Dependencies ----------
function Dependencies({ goal, onSaved }) {
  const dispatch = useDispatch();
  const [addDependency, { isLoading: adding }] = useAddDependencyMutation();
  const [removeDependency] = useRemoveDependencyMutation();
  const candidates = useListDependencyCandidatesQuery(goal._id);
  const [depId, setDepId] = useState('');

  const run = async (fn, message) => {
    try {
      await fn().unwrap();
      if (message) dispatch(pushToast(message, 'success'));
      onSaved();
    } catch (err) {
      dispatch(pushToast(getApiError(err), 'error'));
    }
  };

  return (
    <Card className="mt-5 p-5">
      <h2 className="mb-2 text-sm font-semibold">Depends on</h2>
      <p className="mb-2 text-xs text-slate-400 dark:text-slate-500">
        The goal is <b>blocked</b> while any dependency hasn't completed — cycles are rejected automatically.
      </p>
      <ul className="mb-3 space-y-1.5 text-sm">
        {(goal.dependsOn || []).map((dep) => (
          <li key={dep.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
            <span className="truncate">
              {dep.status === 'completed' ? '✅ ' : '⏳ '}{dep.title}
              {dep.targetDate && <span className="text-xs text-slate-400"> · by {new Date(dep.targetDate).toLocaleDateString()}</span>}
            </span>
            <Button size="sm" variant="subtle" onClick={() => run(() => removeDependency({ goalId: goal._id, depId: dep.id }), 'Dependency removed')} aria-label="Remove dependency">✕</Button>
          </li>
        ))}
        {(goal.dependsOn || []).length === 0 && <li className="text-xs text-slate-400">Nothing blocking this goal.</li>}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <select className="input w-full sm:w-96" value={depId} onChange={(e) => setDepId(e.target.value)}>
          <option value="">Add a prerequisite goal…</option>
          {(candidates.data?.candidates || []).map((candidate) => (
            <option key={candidate._id} value={candidate._id}>
              {candidate.title} ({candidate.status})
            </option>
          ))}
        </select>
        <Button
          size="sm"
          disabled={adding || !depId}
          onClick={() => {
            if (!depId) return;
            run(() => addDependency({ goalId: goal._id, depId }), 'Dependency added');
            setDepId('');
          }}
        >
          Add
        </Button>
      </div>
    </Card>
  );
}
