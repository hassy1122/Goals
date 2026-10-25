import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useListGoalsQuery, useUpdateGoalMutation } from '../../api/goal.api';
import { getApiError } from '../../api/base';
import { pushToast } from '../../stores/uiSlice';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import ProgressRing from '../../components/ui/ProgressRing.jsx';
import GoalFormModal from './GoalFormModal.jsx';

// The dream ledger. Bucket goals are excluded from area scoring — this page is
// for keeping the dreams visible and occasionally promoting one into a real goal.
export default function BucketListPage() {
  const dispatch = useDispatch();
  const items = useListGoalsQuery({ view: 'bucket' });
  const [updateGoal] = useUpdateGoalMutation();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);

  const promote = async (goal) => {
    try {
      await updateGoal({
        goalId: goal._id,
        isBucketList: false,
        status: 'planned',
        startDate: new Date().toISOString().slice(0, 10),
      }).unwrap();
      dispatch(pushToast(`“${goal.title}” is now a real goal — go plan it`, 'success'));
    } catch (err) {
      dispatch(pushToast(getApiError(err), 'error'));
    }
  };

  const backToIdea = async (goal) => {
    try {
      await updateGoal({ goalId: goal._id, status: 'idea' }).unwrap();
      dispatch(pushToast('Status set to idea', 'success'));
    } catch (err) {
      dispatch(pushToast(getApiError(err), 'error'));
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Goals"
        title="Bucket list"
        subtitle="The someday list. Making one real is a single click."
        actions={<Button onClick={() => setAdding(true)}>＋ Add dream</Button>}
      />

      {items.isLoading ? (
        <Card className="p-10 text-center text-sm text-slate-400">Loading the list…</Card>
      ) : (items.data?.goals || []).length === 0 ? (
        <Card className="py-14 text-center text-sm text-slate-400 dark:text-slate-500">
          Empty. Travel, adventures, bold stunts — write down anything you'd regret not trying.
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.data.goals.map((goal) => (
            <Card key={goal._id} className="flex flex-col gap-3 p-4">
              <div className="flex items-start gap-3">
                <ProgressRing percent={goal.progressPercent} size={52} color="indigo" />
                <div className="min-w-0 grow">
                  <p className="truncate font-semibold">{goal.title}</p>
                  <p className="text-xs text-slate-400">
                    {goal.areaIcon ? `${goal.areaIcon} ` : ''}{goal.areaName} · {goal.targetDate ? `someday by ${new Date(goal.targetDate).toLocaleDateString()}` : 'someday'}
                  </p>
                  {goal.why && <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{goal.why}</p>}
                </div>
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-1.5 text-xs">
                <Button size="sm" variant="secondary" onClick={() => promote(goal)}>Make it a goal</Button>
                <Button size="sm" variant="subtle" onClick={() => setEditing(goal)}>Edit</Button>
                <Button size="sm" variant="subtle" className="text-rose-600 dark:text-rose-400" onClick={() => backToIdea(goal)} title="Back to idea status">
                  Idea
                </Button>
              </div>
            </Card>
          ))}
        </ul>
      )}

      <GoalFormModal
        open={adding}
        goal={null}
        isBucketList
        title="Add to your bucket list"
        onClose={() => setAdding(false)}
      />
      {editing && (
        <GoalFormModal open goal={editing} title={`Edit dream: ${editing.title}`} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
