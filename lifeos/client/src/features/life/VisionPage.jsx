import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useGetVisionQuery, useUpdateVisionMutation } from '../../api/life.api';
import { getApiError } from '../../api/base';
import { pushToast } from '../../stores/uiSlice';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { WheelRadar } from '../../components/charts';
import { useGetWheelQuery } from '../../api/life.api';
import VisionBoard from './VisionBoard.jsx';

const HORIZONS = { 1: 'In 1 year', 3: 'In 3 years', 5: 'In 5 years', 10: 'In 10 years' };
const IKIGAI_FIELDS = [
  ['loves', 'What you love'],
  ['excels', 'What you are great at'],
  ['worldNeeds', 'What the world needs'],
  ['paidFor', 'What you can be paid for'],
];

export default function VisionPage() {
  const dispatch = useDispatch();
  const wheel = useGetWheelQuery();
  const vision = useGetVisionQuery();
  const [updateVision, { isLoading: saving }] = useUpdateVisionMutation();
  const data = vision.data;

  const notifySave = async (body, okMessage) => {
    try {
      await updateVision(body).unwrap();
      dispatch(pushToast(okMessage, 'success'));
    } catch (err) {
      dispatch(pushToast(getApiError(err), 'error'));
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="My life"
        title="Vision"
        subtitle="The 10-year target, the year's theme, and the pictures that pull you forward."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Statement + values + affirmations */}
        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Declaration</h2>
          <StatementSection data={data} disabled={saving || !data} onSave={notifySave} />
          <ValuesSection data={data} disabled={saving || !data} onSave={notifySave} />
        </Card>

        {/* Wheel preview (read-only) */}
        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Balance wheel</h2>
          {wheel.data ? <WheelRadar areas={wheel.data.areas} /> : <p className="text-sm text-slate-400">Loading wheel…</p>}
          <p className="mt-3 text-center text-xs text-slate-400 dark:text-slate-500">
            Edit targets on the Areas page — this wheels your blended scores.
          </p>
        </Card>

        {/* Year theme */}
        <YearThemeSection data={data} disabled={saving || !data} onSave={notifySave} />

        {/* Ikigai */}
        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Ikigai let it breathe, then aim it</h2>
          <IkigaiSection data={data} disabled={saving || !data} onSave={notifySave} />
        </Card>

        {/* Roadmap */}
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-3 font-semibold">Roadmap — horizons</h2>
          <RoadmapSection data={data} disabled={saving || !data} onSave={notifySave} />
        </Card>

        {/* Wheel reflection */}
        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Wheel reflection</h2>
          <ReflectionSection data={data} disabled={saving || !data} onSave={notifySave} />
        </Card>

        {/* Vision board */}
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-1 font-semibold">Vision board</h2>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            Where you want to go, what it looks like when you arrive.
          </p>
          <VisionBoard boardImages={data?.vision?.boardImages || []} readOnly={false} />
        </Card>
      </div>
    </div>
  );
}

function StatementSection({ data, disabled, onSave }) {
  const initial = data?.vision?.statement ?? '';
  const [text, setText] = useState(initial);
  useEffect(() => setText(initial), [initial]);

  const affirmations = data?.vision?.affirmations ?? [];
  const [affText, setAffText] = useState('');

  return (
    <div>
      <label className="mb-1 block text-sm font-medium" htmlFor="vision-statement">Vision statement</label>
      <textarea
        id="vision-statement"
        className="input min-h-24"
        value={text}
        maxLength={2000}
        onChange={(e) => setText(e.target.value)}
        placeholder="One paragraph: who you are becoming and what that looks like."
      />
      <Button size="sm" className="mt-2" disabled={disabled} onClick={() => onSave({ statement: text }, 'Statement saved')}>
        Save statement
      </Button>

      <div className="mt-4">
        <p className="mb-1 text-sm font-medium">Affirmations</p>
        <ul className="mb-2 flex flex-wrap gap-2">
          {affirmations.map((aff) => (
            <li key={aff} className="rounded-full bg-indigo-50 px-3 py-1 text-xs text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              {aff}
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Input
            value={affText}
            maxLength={200}
            onChange={(e) => setAffText(e.target.value)}
            placeholder="Say it like it's already true…"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && affText.trim()) {
                setAffText('');
                onSave({ affirmations: [...affirmations, affText.trim()] }, 'Affirmation added');
              }
            }}
          />
          <Button size="sm" variant="secondary" disabled={!affText.trim() || disabled}
            onClick={() => { setAffText(''); onSave({ affirmations: [...affirmations, affText.trim()] }, 'Affirmation added'); }}>
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}

function ValuesSection({ data, disabled, onSave }) {
  const values = data?.vision?.coreValues ?? [];
  const [text, setText] = useState('');
  const add = () => {
    if (!text.trim()) return;
    setText('');
    onSave({ coreValues: [...values, text.trim()] }, 'Value added');
  };
  const remove = (value) => onSave({ coreValues: values.filter((v) => v !== value) }, 'Value removed');

  return (
    <div className="mt-4">
      <p className="mb-1 text-sm font-medium">Core values</p>
      <ul className="mb-2 flex flex-wrap gap-2">
        {values.map((value) => (
          <li key={value} className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            {value}
            <button type="button" aria-label={`Remove ${value}`} onClick={() => remove(value)} className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400">✕</button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Input value={text} maxLength={60} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Add a value and press Enter" />
        <Button size="sm" variant="secondary" onClick={add} disabled={!text.trim() || disabled}>Add</Button>
      </div>
    </div>
  );
}

function YearThemeSection({ data, disabled, onSave }) {
  const theme = data?.vision?.yearTheme ?? { year: null, title: '', why: '' };
  const [draft, setDraft] = useState(theme);
  useEffect(() => setDraft(theme), [theme.year, theme.title, theme.why]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card className="p-5">
      <h2 className="mb-3 font-semibold">Theme of the year</h2>
      <div className="grid grid-cols-[80px_1fr] gap-2">
        <Input
          type="number"
          value={draft.year ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, year: e.target.value === '' ? null : Number(e.target.value) }))}
          aria-label="Year"
        />
        <Input value={draft.title} maxLength={120} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} placeholder="e.g. The year of quiet compounding" />
        <Input className="col-span-2" value={draft.why} maxLength={1000} onChange={(e) => setDraft((d) => ({ ...d, why: e.target.value }))} placeholder="Why this theme (one line)" />
      </div>
      <Button size="sm" className="mt-3" disabled={disabled} onClick={() => onSave({ yearTheme: draft }, 'Theme saved')}>
        Save theme
      </Button>
    </Card>
  );
}

function IkigaiSection({ data, disabled, onSave }) {
  const original = data?.vision?.ikigai ?? { loves: '', excels: '', worldNeeds: '', paidFor: '', summary: '' };
  const [draft, setDraft] = useState(original);
  useEffect(() => setDraft(original), [original.loves, original.excels, original.worldNeeds, original.paidFor, original.summary]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        {IKIGAI_FIELDS.map(([key, label]) => (
          <label key={key} className="text-sm">
            <span className="mb-1 block font-medium">{label}</span>
            <textarea className="input min-h-16 text-xs" maxLength={1000} value={draft[key] ?? ''} onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))} />
          </label>
        ))}
      </div>
      <label className="mt-3 block text-sm">
        <span className="mb-1 block font-medium">The overlap (your summary)</span>
        <textarea className="input min-h-16 text-sm" maxLength={1000} value={draft.summary ?? ''} onChange={(e) => setDraft((d) => ({ ...d, summary: e.target.value }))} />
      </label>
      <Button size="sm" className="mt-3" disabled={disabled} onClick={() => onSave({ ikigai: draft }, 'Ikigai saved')}>
        Save ikigai
      </Button>
    </div>
  );
}

function RoadmapSection({ data, disabled, onSave }) {
  const roadmap = data?.vision?.roadmap ?? [];
  const save = async (horizon, title, notes) => {
    const existing = roadmap.find((r) => r.horizon === horizon);
    const next = existing
      ? roadmap.map((entry) => (entry.horizon === horizon ? { ...entry, title, notes } : entry))
      : [...roadmap, { horizon, title, notes }];
    if (!title.trim()) return;
    await onSave({ roadmap: next }, 'Roadmap saved');
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Object.entries(HORIZONS).map(([horizon, label]) => {
        const entry = roadmap.find((r) => r.horizon === Number(horizon));
        const commit = (field) => (e) => {
          const title = field === 'title' ? e.target.value : entry?.title ?? '';
          const notes = field === 'notes' ? e.target.value : entry?.notes ?? '';
          if (title.trim()) save(Number(horizon), title, notes);
        };
        return (
          <div key={horizon} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">{label}</p>
            <textarea
              className="input min-h-14 text-sm"
              maxLength={160}
              placeholder="One north star for this horizon"
              defaultValue={entry?.title ?? ''}
              onBlur={commit('title')}
            />
            <textarea
              className="input mt-2 min-h-14 text-xs"
              maxLength={1000}
              placeholder="Notes"
              defaultValue={entry?.notes ?? ''}
              onBlur={commit('notes')}
            />
          </div>
        );
      })}
    </div>
  );
}

function ReflectionSection({ data, disabled, onSave }) {
  const initial = data?.vision?.wheelReflection ?? '';
  const [text, setText] = useState(initial);
  useEffect(() => setText(initial), [initial]);

  return (
    <div>
      <textarea className="input min-h-24" maxLength={2000} value={text} onChange={(e) => setText(e.target.value)}
        placeholder="Look at your wheel: what would change first if it rose one point?" />
      <Button size="sm" className="mt-2" disabled={disabled} onClick={() => onSave({ wheelReflection: text }, 'Reflection saved')}>
        Save reflection
      </Button>
    </div>
  );
}
