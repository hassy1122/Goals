import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { useListAreasQuery, useCompleteOnboardingMutation } from '../../api/life.api';
import { getApiError } from '../../api/base';
import { pushToast } from '../../stores/uiSlice';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Card from '../../components/ui/Card.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';

const STEPS = ['Your vision', 'Pick your targets', 'First goal'];

const SUGGESTED_GOAL_TITLES = {
  health: 'Three workouts a week for a month',
  finance: 'Save the first 25% of an emergency fund',
  career: 'Update CV + ask for a development plan',
  relationships: 'Book a monthly night with friends',
  family: 'Plan one distraction-free family day',
  'personal-growth': 'Read one book this month',
  'fun-hobbies': 'Block two hours a week for a hobby',
  spirituality: 'Ten quiet minutes a day',
  education: 'Finish one online course module a week',
  environment: 'One weekend declutter of the workspace',
};

export default function OnboardingWizard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);
  const areas = useListAreasQuery();
  const [complete, { isLoading: saving }] = useCompleteOnboardingMutation();

  const [step, setStep] = useState(0);
  const [statement, setStatement] = useState('');
  const [values, setValues] = useState(['']);
  const [targets, setTargets] = useState({}); // areaId → score
  const [goalAreaId, setGoalAreaId] = useState('');
  const [goalTitle, setGoalTitle] = useState('');

  // Already finished? Bounce back to the dashboard.
  useEffect(() => {
    if (user?.onboarding?.done) navigate('/', { replace: true });
  }, [user?.onboarding?.done, navigate]);

  useEffect(() => {
    if (!areas.data) return;
    const seededTargets = {};
    let firstArea = '';
    for (const area of areas.data.areas) {
      seededTargets[area._id] = area.targetScore || 8;
      if (!firstArea) firstArea = area._id;
    }
    setTargets(seededTargets);
    setGoalAreaId(firstArea);
    setGoalTitle(SUGGESTED_GOAL_TITLES[areas.data.areas[0]?.key] || '');
  }, [areas.data]); // eslint-disable-line react-hooks/exhaustive-deps

  if (areas.isLoading) return <p className="py-16 text-center text-sm text-slate-400">Loading areas…</p>;

  const pickGoalSuggestion = (areaId) => {
    setGoalAreaId(areaId);
    const key = areas.data.areas.find((a) => a._id === areaId)?.key;
    setGoalTitle(SUGGESTED_GOAL_TITLES[key] || '');
  };

  const finish = async () => {
    try {
      await complete({
        areas: Object.entries(targets).map(([areaId, targetScore]) => ({ areaId, targetScore: Number(targetScore) })),
        statement,
        coreValues: values.map((v) => v.trim()).filter(Boolean),
        firstGoal: goalAreaId && goalTitle.trim() ? { areaId: goalAreaId, title: goalTitle.trim() } : undefined,
      }).unwrap();
      dispatch(pushToast('Your LifeOS is ready. Welcome.', 'success'));
      navigate('/', { replace: true });
    } catch (err) {
      dispatch(pushToast(getApiError(err), 'error'));
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Welcome to LifeOS" title={`So — ${user?.name?.split(' ')[0]}, who are you becoming?`} subtitle={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step].toLowerCase()}`} />

      <div className="mb-6 flex gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800'}`} />
        ))}
      </div>

      <Card className="p-6">
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium" htmlFor="ob-statement">Describe the life you're building — one honest paragraph.</label>
              <textarea
                id="ob-statement"
                className="input mt-1 min-h-28"
                maxLength={2000}
                placeholder="In three years I want to wake up in control of my days: fit enough, financially calm enough…"
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
              />
            </div>
            <div>
              <p className="text-sm font-medium">Name the values that keep it true</p>
              {values.map((value, i) => (
                <div key={i} className="mt-2 flex gap-2">
                  <Input maxLength={60} value={value} placeholder={i === 0 ? 'e.g. Health before hustle' : 'Another value'} onChange={(e) => setValues((v) => v.map((x, j) => (j === i ? e.target.value : x)))} />
                  {i > 0 && (
                    <Button type="button" size="sm" variant="subtle" className="text-rose-600 dark:text-rose-400" onClick={() => setValues((v) => v.filter((_, j) => j !== i))}>✕</Button>
                  )}
                </div>
              ))}
              {values.length < 6 && (
                <Button type="button" size="sm" variant="secondary" className="mt-2" onClick={() => setValues((v) => [...v, ''])}>＋ Add value</Button>
              )}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Where are you now, and where do you want to be? Set a 1–10 target for the areas you're targeting this year.
            </p>
            {areas.data.areas.map((area) => (
              <div key={area._id} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800">
                <span className="text-xl">{area.icon || '⭐'}</span>
                <span className="grow text-sm font-medium">{area.name}</span>
                <select
                  className="input w-28"
                  value={targets[area._id] ?? 8}
                  onChange={(e) => setTargets((t) => ({ ...t, [area._id]: Number(e.target.value) }))}
                  aria-label={`Target for ${area.name}`}
                >
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>{n} / 10</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              One goal to start. Small is better than impressive — you can eat it today.
            </p>
            <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
              <label className="block text-sm">
                Life area
                <select className="input mt-1" value={goalAreaId} onChange={(e) => pickGoalSuggestion(e.target.value)}>
                  {areas.data.areas.map((area) => (
                    <option key={area._id} value={area._id}>
                      {area.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                First goal
                <Input className="mt-1" maxLength={160} value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)} placeholder="Small, concrete, this month" />
              </label>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <Button variant="secondary" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)}>Next — {STEPS[step + 1]}</Button>
          ) : (
            <Button onClick={finish} disabled={saving}>{saving ? 'Setting up…' : 'Finish setup'}</Button>
          )}
        </div>
      </Card>

      <p className="mt-4 text-center text-xs text-slate-400">
        You can refine everything later from <Link to="/vision" className="underline">Vision</Link> and <Link to="/vision/areas" className="underline">Life areas</Link>.
      </p>
    </div>
  );
}
