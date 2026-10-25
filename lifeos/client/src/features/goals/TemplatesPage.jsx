import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useGetTemplatesQuery, useApplyTemplateMutation } from '../../api/goal.api';
import { useListAreasQuery } from '../../api/life.api';
import { getApiError } from '../../api/base';
import { pushToast } from '../../stores/uiSlice';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Modal from '../../components/ui/Modal.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';

function TemplateCard({ template, onApply, isCustom }) {
  const milestoneCount = template.milestones?.length ?? 0;
  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{template.title}</p>
          {template.why && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{template.why}</p>}
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${isCustom ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'}`}>
          {isCustom ? 'yours' : 'system'}
        </span>
      </div>

      {template.description && <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{template.description}</p>}

      <p className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
        <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">{template.type}</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">{milestoneCount} milestones</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">P{template.importance}·I{template.impact}·U{template.urgency}/E{template.effort}</span>
      </p>

      <ul className="mt-1 space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
        {(template.milestones || []).slice(0, 3).map((m, i) => (
          <li key={i} className="truncate">— {m.title}{m.dueInDays ? ` (+${m.dueInDays}d)` : ''}</li>
        ))}
        {milestoneCount > 3 && <li className="text-slate-400">+{milestoneCount - 3} more…</li>}
      </ul>

      <Button className="mt-auto" size="sm" onClick={() => onApply(template)}>Apply this template</Button>
      <p className="text-[10px] text-slate-400 dark:text-slate-500">Applying creates a fresh planned goal — your data stays untouched.</p>
    </Card>
  );
}

function ApplyModal({ template, onClose }) {
  const dispatch = useDispatch();
  const areas = useListAreasQuery();
  const [applyTemplate, { isLoading: applying }] = useApplyTemplateMutation();
  const [areaId, setAreaId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState('');

  if (!template) return null;

  const submit = async (event) => {
    event.preventDefault();
    if (!areaId) return;
    try {
      const { data } = await applyTemplate({
        key: template.templateKey,
        areaId,
        title: title.trim() || undefined,
        startDate: startDate ? new Date(`${startDate}T12:00:00`).toISOString() : new Date().toISOString(),
      }).unwrap();
      dispatch(pushToast(`“${data.goal.title}” created from “${template.title}”`, 'success'));
      onClose();
    } catch (err) {
      dispatch(pushToast(getApiError(err), 'error'));
    }
  };

  return (
    <Modal open onClose={onClose} title={`Apply: ${template.title}`} width="max-w-md">
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-sm">
          Target life area
          <select className="input mt-1" value={areaId} onChange={(e) => setAreaId(e.target.value)} required>
            <option value="" disabled>Choose…</option>
            {(areas.data?.areas || []).map((area) => (
              <option key={area._id} value={area._id} disabled={area.archived}>{area.icon ? `${area.icon} ` : ''}{area.name}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Goal title (optional — leave as-is to use the template title)
          <Input value={title} maxLength={160} onChange={(e) => setTitle(e.target.value)} className="mt-1" placeholder={template.title} />
        </label>
        <label className="block text-sm">
          Start date
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1" />
        </label>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={applying}>{applying ? 'Creating…' : 'Create goal from template'}</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function TemplatesPage() {
  const templates = useGetTemplatesQuery();
  const [applyTarget, setApplyTarget] = useState(null);

  const system = templates.data?.system || [];
  const custom = templates.data?.custom || [];

  return (
    <div>
      <PageHeader
        eyebrow="Goals"
        title="Template library"
        subtitle="Proven goal blueprints — apply one and it lands as a planned goal with dated milestones."
      />

      {templates.isLoading ? (
        <Card className="p-10 text-center text-sm text-slate-400">Loading templates…</Card>
      ) : (
        <>
          {custom.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 text-sm font-semibold">Your templates <span className="text-xs text-slate-400">— saved from your own goals</span></h2>
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {custom.map((template) => (
                  <li key={template._id}>
                    <TemplateCard template={template} isCustom onApply={setApplyTarget} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="mb-3 text-sm font-semibold">System library <span className="text-xs text-slate-400">— {system.length} curated starters</span></h2>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {system.map((template) => (
                <li key={template.templateKey}>
                  <TemplateCard template={template} onApply={setApplyTarget} />
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <ApplyModal template={applyTarget} onClose={() => setApplyTarget(null)} />
    </div>
  );
}
