import { useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { useListGoalsQuery, useDeleteGoalMutation, useUpdateGoalMutation } from '../../api/goal.api';
import { useListAreasQuery } from '../../api/life.api';
import { getApiError } from '../../api/base';
import { pushToast } from '../../stores/uiSlice';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import ProgressRing from '../../components/ui/ProgressRing.jsx';
import { GoalBars, GanttChart } from '../../components/charts';
import GoalFormModal from './GoalFormModal.jsx';

const TABS = [
  { key: 'active', label: 'Active' },
  { key: 'planned', label: 'Planned' },
  { key: 'idea', label: 'Ideas' },
  { key: 'in-progress', label: 'In progress' },
  { key: 'completed', label: 'Done' },
  { key: 'paused', label: 'Paused' },
  { key: 'all', label: 'All' },
];

const emptyFilters = { view: 'active', status: '', type: '', q: '', sort: 'priority' };

export default function GoalsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [filters, setFilters] = useState(emptyFilters);
  const [chart, setChart] = useState(null); // 'gantt' | 'bars' | null
  const [editing, setEditing] = useState(null); // goal | 'new' | null

  const goalsRes = useListGoalsQuery(filters);
  const [deleteGoal] = useDeleteGoalMutation();
  const [updateGoal] = useUpdateGoalMutation();

  const goals = goalsRes.data?.goals || [];
  const setFilter = (patch) => setFilters((f) => ({ ...f, status: '', ...patch }));

  const onDelete = async (goal) => {
    try {
      await deleteGoal(goal._id).unwrap();
      dispatch(pushToast('Goal deleted', 'success'));
    } catch (err) {
      dispatch(pushToast(getApiError(err), 'error'));
    }
  };

  const onStatus = async (goal, status) => {
    try {
      const { data } = await updateGoal({ goalId: goal._id, status }).unwrap();
      dispatch(pushToast(status === 'active' ? 'Goal activated' : `Marked ${status}`, 'success'));
      if (data.celebration) dispatch(pushToast('Goal completed — take a breath.', 'success'));
    } catch (err) {
      dispatch(pushToast(getApiError(err), 'error'));
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Goals"
        title="Goals"
        subtitle="Aligned to life areas, scored by priority, blocked by dependencies — visible before they bite."
        actions={
          <>
            <Button variant="secondary" onClick={() => setChart(chart === 'gantt' ? null : 'gantt')}>Timeline</Button>
            <Button variant="secondary" onClick={() => setChart(chart === 'bars' ? null : 'bars')}>Progress</Button>
            <Button onClick={() => setEditing('new')}>＋ New goal</Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map((tab) => (
          <Button
            key={tab.key}
            size="sm"
            variant={filters.view === tab.key && !filters.status ? 'primary' : 'secondary'}
            onClick={() => setFilter({ view: tab.key })}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
          placeholder="Search goals…"
          className="max-w-xs"
        />
        <AreaFilter value={filters.areaId} onChange={(areaId) => setFilter({ areaId })} />
        <label className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
          Sort
          <select className="input w-36" value={filters.sort} onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}>
            <option value="priority">Priority</option>
            <option value="target">Target date</option>
            <option value="progress">Progress</option>
            <option value="alpha">Title</option>
            <option value="created">Newest</option>
          </select>
        </label>
      </div>

      {chart === 'gantt' && <GanttCard className="mb-5" />}
      {chart === 'bars' && <BarsCard className="mb-5" />}

      {goalsRes.isLoading ? (
        <Card className="p-10 text-center text-sm text-slate-400">Loading goals…</Card>
      ) : goals.length === 0 ? (
        <Card className="py-14 text-center text-sm text-slate-400 dark:text-slate-500">
          No goals here yet. Pick one thing from your vision and turn it into a goal.
        </Card>
      ) : (
        <ul className="grid gap-3 xl:grid-cols-2">
          {goals.map((goal) => (
            <GoalCard
              key={goal._id}
              goal={goal}
              onOpen={() => navigate(`/goals/${goal._id}`)}
              onEdit={() => setEditing(goal)}
              onDelete={() => onDelete(goal)}
              onStatus={(status) => onStatus(goal, status)}
            />
          ))}
        </ul>
      )}

      <GoalFormModal open={Boolean(editing)} goal={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function AreaFilter({ value, onChange }) {
  const areas = useListAreasQuery();
  return (
    <label className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
      Area
      <select className="input max-w-44" value={value || ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">All areas</option>
        {(areas.data?.areas || []).map((area) => (
          <option key={area._id} value={area._id}>{area.name}</option>
        ))}
      </select>
    </label>
  );
}

function GanttCard({ className }) {
  const ganttRes = useListGoalsQuery({ view: 'all' });
  const rows = useMemo(() => {
    const raw = ganttRes.data?.goals || [];
    return raw.map((g) => ({
      ...g,
      // The chart pares rows down to dated goals only.
      milestones: (g.milestones || []).filter((m) => m.dueDate),
    }));
  }, [ganttRes.data]);
  return (
    <Card className={`p-4 ${className || ''}`}>
      <h2 className="mb-3 text-sm font-semibold">Timeline</h2>
      <GanttChart goals={rows} />
    </Card>
  );
}

function BarsCard({ className }) {
  const res = useListGoalsQuery({ view: 'in-progress' });
  const goals = (res.data?.goals || []).slice(0, 8);
  return (
    <Card className={`p-4 ${className || ''}`}>
      <h2 className="mb-3 text-sm font-semibold">Progress — top in-flight goals</h2>
      <GoalBars goals={goals} />
    </Card>
  );
}

function GoalCard({ goal, onOpen, onEdit, onDelete, onStatus }) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <ProgressRing
          percent={goal.progressPercent}
          color={goal.status === 'completed' ? 'emerald' : 'indigo'}
          size={54}
        />
        <button type="button" onClick={onOpen} className="min-w-0 grow text-left">
          <p className="truncate font-semibold text-slate-900 dark:text-slate-100">{goal.title}</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {goal.areaName || ''} · {goal.type} · target {goal.targetDate ? new Date(goal.targetDate).toLocaleDateString() : '—'}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">{goal.status}</span>
            {goal.blocked && (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-rose-700 dark:bg-rose-950 dark:text-rose-300" title="Waiting on another goal">
                blocked
              </span>
            )}
            {goal.moscow && <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">{goal.moscow}</span>}
            {goal.priorityScore != null && (
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" title="Priority score">
                P {goal.priorityScore}
              </span>
            )}
          </p>
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2 text-xs dark:border-slate-800">
        {goal.status !== 'active' && goal.status !== 'completed' && (
          <Button size="sm" variant="secondary" onClick={() => onStatus('active')}>Activate</Button>
        )}
        {goal.status === 'active' && (
          <Button size="sm" variant="secondary" onClick={() => onStatus('paused')}>Pause</Button>
        )}
        <Button size="sm" variant="subtle" onClick={onEdit}>Edit</Button>
        <Link to={`/goals/${goal._id}`} className="rounded-lg px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
          Open
        </Link>
        <Button size="sm" variant="subtle" className="text-rose-600 dark:text-rose-400" onClick={onDelete}>Delete</Button>
      </div>
    </Card>
  );
}
