import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  useListDecisionsQuery,
  useCreateDecisionMutation,
  useUpdateDecisionMutation,
  useDeleteDecisionMutation,
} from '../../api/life.api';
import { getApiError } from '../../api/base';
import { pushToast } from '../../stores/uiSlice';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Modal from '../../components/ui/Modal.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';

export default function DecisionsPage() {
  const dispatch = useDispatch();
  const [filter, setFilter] = useState('open');
  const [editing, setEditing] = useState(null); // decision | 'new' | null

  const decisions = useListDecisionsQuery({
    status: filter === 'all' ? undefined : filter,
    page: 1,
    limit: 50,
  });

  return (
    <div>
      <PageHeader
        eyebrow="My life"
        title="Decisions"
        subtitle="Write the pros, weigh the impact and effort, then commit in writing."
        actions={<Button onClick={() => setEditing('new')}>＋ New decision</Button>}
      />

      <div className="mb-4 flex gap-2">
        {[
          { key: 'open', label: 'Open' },
          { key: 'decided', label: 'Decided' },
          { key: 'all', label: 'All' },
        ].map((tab) => (
          <Button key={tab.key} size="sm" variant={filter === tab.key ? 'primary' : 'secondary'} onClick={() => setFilter(tab.key)}>
            {tab.label}
          </Button>
        ))}
      </div>

      {decisions.isLoading ? (
        <Card className="p-10 text-center text-sm text-slate-400">Loading decisions…</Card>
      ) : (decisions.data?.decisions || []).length === 0 ? (
        <Card className="py-14 text-center text-sm text-slate-400 dark:text-slate-500">
          Nothing here. A pending decision lives rent-free — get it on paper.
        </Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {decisions.data.decisions.map((decision) => (
            <DecisionCard key={decision._id} decision={decision} onEdit={() => setEditing(decision)} />
          ))}
        </ul>
      )}

      <DecisionFormModal open={Boolean(editing)} decision={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function OptionMeta({ option }) {
  return (
    <p className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
      title={`Impact ${option.impact} · Effort ${option.effort} — this option scores ${(option.impact * 2 / Math.max(option.effort, 1)).toFixed(1)}`}>
      impact {option.impact} · effort {option.effort}
    </p>
  );
}

function DecisionCard({ decision, onEdit }) {
  const dispatch = useDispatch();
  const [updateDecision] = useUpdateDecisionMutation();
  const [deleteDecision] = useDeleteDecisionMutation();

  const onDecide = async (index) => {
    try {
      await updateDecision({ id: decision._id, chosenOptionIndex: index, status: 'decided' }).unwrap();
      dispatch(pushToast('Decision made — momentum unlocked', 'success'));
    } catch (err) {
      dispatch(pushToast(getApiError(err), 'error'));
    }
  };

  const onReopen = async () => {
    try {
      await updateDecision({ id: decision._id, status: 'open', chosenOptionIndex: null }).unwrap();
      dispatch(pushToast('Decision reopened', 'info'));
    } catch (err) {
      dispatch(pushToast(getApiError(err), 'error'));
    }
  };

  const onDelete = async () => {
    try {
      await deleteDecision(decision._id).unwrap();
      dispatch(pushToast('Decision deleted', 'success'));
    } catch (err) {
      dispatch(pushToast(getApiError(err), 'error'));
    }
  };

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold">{decision.title}</p>
          <p className="text-xs text-slate-400">
            {decision.status === 'decided' ? `decided ${decision.decidedAt ? new Date(decision.decidedAt).toLocaleDateString() : ''}` : 'open'}
          </p>
        </div>
        <Button size="sm" variant="subtle" onClick={onEdit}>Edit</Button>
      </div>

      {decision.options.length === 0 && <p className="text-sm text-slate-400">No options written down yet.</p>}

      <ul className="space-y-2">
        {decision.options.map((option, index) => {
          const chosen = decision.status === 'decided' && decision.chosenOptionIndex === index;
          return (
            <li
              key={index}
              className={
                chosen
                  ? 'rounded-lg border-2 border-emerald-500 bg-emerald-50 p-3 dark:bg-emerald-950/40'
                  : 'rounded-lg border border-slate-200 p-3 dark:border-slate-800'
              }
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{option.title}</p>
                <OptionMeta option={option} />
              </div>
              {option.pros.length > 0 && (
                <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">{option.pros.map((p) => `+ ${p}`).join(' · ')}</p>
              )}
              {option.cons.length > 0 && (
                <p className="text-xs text-rose-700 dark:text-rose-400">{option.cons.map((c) => `− ${c}`).join(' · ')}</p>
              )}
              {decision.status !== 'decided' && (
                <Button size="sm" variant="secondary" className="mt-2" onClick={() => onDecide(index)}>
                  Choose this
                </Button>
              )}
              {chosen && <p className="mt-1 text-xs font-semibold text-emerald-600">✓ Your call</p>}
            </li>
          );
        })}
      </ul>

      {decision.status === 'decided' ? (
        <div className="flex gap-2">
          <Button size="sm" variant="subtle" onClick={onReopen}>Reopen</Button>
          <Button size="sm" variant="subtle" className="text-rose-600 dark:text-rose-400" onClick={onDelete}>Delete</Button>
        </div>
      ) : (
        <Button size="sm" variant="subtle" className="text-rose-600 dark:text-rose-400" onClick={onDelete}>Delete</Button>
      )}
    </Card>
  );
}

function OptionEditor({ option, index, onChange, onRemove }) {
  const toList = (value) => value.split(',').map((s) => s.trim()).filter(Boolean);
  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <div className="flex items-center gap-2">
        <Input value={option.title} maxLength={200} placeholder={`Option ${index + 1}`} onChange={(e) => onChange({ title: e.target.value })} />
        <Button type="button" size="sm" variant="subtle" aria-label="Remove option" className="shrink-0 text-rose-600 dark:text-rose-400" onClick={onRemove}>✕</Button>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <Input value={option.pros.join(', ')} placeholder="Pros (comma separated)" onChange={(e) => onChange({ pros: toList(e.target.value) })} />
        <Input value={option.cons.join(', ')} placeholder="Cons (comma separated)" onChange={(e) => onChange({ cons: toList(e.target.value) })} />
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-slate-500 dark:text-slate-400">
          Impact: {option.impact}/5
          <input type="range" min="1" max="5" step="1" value={option.impact} className="w-full accent-indigo-600" onChange={(e) => onChange({ impact: Number(e.target.value) })} />
        </label>
        <label className="text-xs text-slate-500 dark:text-slate-400">
          Effort: {option.effort}/5
          <input type="range" min="1" max="5" step="1" value={option.effort} className="w-full accent-indigo-600" onChange={(e) => onChange({ effort: Number(e.target.value) })} />
        </label>
      </div>
    </div>
  );
}

function DecisionFormModal({ open, decision, onClose }) {
  const dispatch = useDispatch();
  const [createDecision, { isLoading: creating }] = useCreateDecisionMutation();
  const [updateDecision, { isLoading: updating }] = useUpdateDecisionMutation();
  const [form, setForm] = useState(seedForm(decision, ''));

  useEffect(() => {
    if (open) {
      setForm({
        title: decision?.title ?? '',
        notes: decision?.notes ?? '',
        options: (decision?.options || []).map((o) => ({
          title: o.title,
          notes: o.notes ?? '',
          pros: o.pros ?? [],
          cons: o.cons ?? [],
          impact: o.impact ?? 3,
          effort: o.effort ?? 3,
        })),
      });
    }
  }, [open, decision]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open || !form) return null;
  const saving = creating || updating;

  const setOption = (index, patch) =>
    setForm((f) => ({
      ...f,
      options: f.options.map((option, i) => (i === index ? { ...option, ...patch } : option)),
    }));

  const submit = async (event) => {
    event.preventDefault();
    const body = {
      title: form.title,
      notes: form.notes,
      options: form.options.filter((o) => o.title.trim()),
    };
    try {
      if (decision) {
        await updateDecision({ id: decision._id, ...body }).unwrap();
        dispatch(pushToast('Decision updated', 'success'));
      } else {
        await createDecision(body).unwrap();
        dispatch(pushToast('Decision created', 'success'));
      }
      onClose();
    } catch (err) {
      dispatch(pushToast(getApiError(err), 'error'));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={decision ? 'Edit decision' : 'New decision'} width="max-w-2xl">
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-sm">
          What are you deciding?
          <Input
            required
            maxLength={200}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="mt-1"
            placeholder="e.g. City apartment or house outside town?"
          />
        </label>

        {form.options.map((option, index) => (
          <OptionEditor
            key={index}
            option={option}
            index={index}
            onChange={(patch) => setOption(index, patch)}
            onRemove={() => setForm((f) => ({ ...f, options: f.options.filter((_, i) => i !== index) }))}
          />
        ))}

        {form.options.length < 8 && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setForm((f) => ({ ...f, options: [...f.options, { title: '', notes: '', pros: [], cons: [], impact: 3, effort: 3 }] }))}
          >
            ＋ Add option
          </Button>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : decision ? 'Save decision' : 'Create decision'}</Button>
        </div>
      </form>
    </Modal>
  );
}
