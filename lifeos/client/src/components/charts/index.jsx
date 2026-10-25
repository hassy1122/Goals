import clsx from 'clsx';

/**
 * LifeOS charts — hand-drawn SVG, zero chart dependencies (approved approach).
 * Each chart is responsive (width 100% via viewBox) and dark-mode aware.
 */

const AXIS = 'stroke-slate-200 dark:stroke-slate-700';
const TEXT = 'fill-slate-500 dark:fill-slate-400';
const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#0ea5e9', '#8b5cf6', '#f97316', '#84cc16', '#d946ef', '#64748b'];

const areaColor = (i) => PALETTE[i % PALETTE.length];

// ---------------- Balance-wheel radar ----------------
export function WheelRadar({ areas, size = 320 }) {
  const n = Math.max(areas.length, 3);
  const cx = 100;
  const cy = 100;
  const R = 78;
  const angle = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const point = (i, r) => [cx + Math.cos(angle(i)) * r, cy + Math.sin(angle(i)) * r];

  const rings = [2.5, 5, 7.5, 10];
  const polygon = areas
    .map((a, i) => point(i, (Math.max(0, Math.min(10, a.blendedScore)) / 10) * R).join(','))
    .join(' ');

  return (
    <svg viewBox="0 0 200 200" width="100%" style={{ maxWidth: size }} className="mx-auto" role="img" aria-label="Balance wheel radar chart">
      {rings.map((ring) => (
        <polygon
          key={ring}
          points={areas.map((_, i) => point(i, (ring / 10) * R).join(',')).join(' ')}
          className={AXIS}
          fill="none"
          strokeWidth="0.5"
        />
      ))}
      {areas.map((_, i) => {
        const [x, y] = point(i, R);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} className={AXIS} strokeWidth="0.5" />;
      })}
      <polygon points={polygon} fill="rgba(99,102,241,0.25)" stroke="#6366f1" strokeWidth="1.5" />
      {areas.map((a, i) => {
        const [x, y] = point(i, (Math.max(0, Math.min(10, a.blendedScore)) / 10) * R);
        return <circle key={a._id} cx={x} cy={y} r="2" fill={areaColor(i)} />;
      })}
      {areas.map((a, i) => {
        const [x, y] = point(i, R + 13);
        return (
          <text
            key={`label-${a._id}`}
            x={x}
            y={y}
            textAnchor={Math.abs(x - cx) < 10 ? 'middle' : x > cx ? 'start' : 'end'}
            dominantBaseline="middle"
            className="fill-slate-600 dark:fill-slate-300"
            fontSize="7"
          >
            {a.name}
          </text>
        );
      })}
    </svg>
  );
}

// ---------------- Horizontal goal progress bars ----------------
export function GoalBars({ goals, onSelect, max = 100 }) {
  if (goals.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">No goals plotted yet.</p>;
  }
  return (
    <ul className="space-y-3" role="img" aria-label="Goal progress comparison">
      {goals.map((g, i) => {
        const width = Math.max(0, Math.min(100, (g.progressPercent / max) * 100));
        return (
          <li key={g._id}>
            <button
              type="button"
              onClick={onSelect ? () => onSelect(g) : undefined}
              className={clsx('w-full text-left', onSelect && 'cursor-pointer')}
              title={onSelect ? 'Open goal' : undefined}
            >
              <span className="flex items-baseline justify-between gap-2 text-xs">
                <span className="truncate font-medium text-slate-700 dark:text-slate-200">{g.title}</span>
                <span className={TEXT}>{Math.round(g.progressPercent)}%</span>
              </span>
              <span className="mt-1 block h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <span
                  className="block h-full rounded-full transition-all"
                  style={{ width: `${width}%`, backgroundColor: areaColor(i) }}
                />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// ---------------- Burn-up (planned vs actual) ----------------
const toTime = (d) => new Date(d).getTime();

export function BurnupChart({ planned, actual, target, height = 180 }) {
  const points = [...planned.map((p) => ({ date: p.date, percent: p.percent, kind: 'planned' })),
    ...actual.map((a) => ({ date: a.date, percent: a.percent, kind: 'actual' }))];
  if (points.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">No progress data yet.</p>;
  }
  const xs = points.map((p) => toTime(p.date));
  if (target) xs.push(toTime(target));
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const x = (date) => ((toTime(date) - xMin) / Math.max(1, xMax - xMin)) * 180 + 10;
  const y = (percent) => 90 - (Math.max(0, Math.min(100, percent)) / 100) * 80;

  const line = (kind) =>
    points
      .filter((p) => p.kind === kind)
      .map((p) => `${x(p.date).toFixed(2)},${y(p.percent).toFixed(2)}`)
      .join(' ');

  return (
    <svg viewBox="0 0 200 100" width="100%" style={{ height }} preserveAspectRatio="none" role="img" aria-label="Burn-up chart">
      <line x1="10" y1="90" x2="190" y2="90" className={AXIS} strokeWidth="0.5" />
      <line x1="10" y1="10" x2="190" y2="10" className={AXIS} strokeWidth="0.5" strokeDasharray="2 2" />
      {planned.length > 1 && <polyline points={line('planned')} fill="none" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 2" />}
      {actual.length > 1 && <polyline points={line('actual')} fill="none" stroke="#6366f1" strokeWidth="2" />}
      {actual.length > 0 && (
        <circle cx={x(actual[actual.length - 1].date)} cy={y(actual[actual.length - 1].percent)} r="2.5" fill="#6366f1" />
      )}
      <text x="10" y="99" fontSize="6" className={TEXT}>start</text>
      <text x="190" y="99" fontSize="6" textAnchor="end" className={TEXT}>target</text>
    </svg>
  );
}

// ---------------- Gantt timelines ----------------
const DAY = 86400000;

export function GanttChart({ goals, height = 26, today = new Date() }) {
  const usable = goals.filter((g) => g.startDate || g.targetDate);
  if (usable.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">Dated goals show up here.</p>;
  }
  const timeOf = (g, key, fallback) => (g[key] ? toTime(g[key]) : fallback);
  const now = toTime(today);
  const starts = usable.map((g) => timeOf(g, 'startDate', now - 30 * DAY) - 20 * DAY);
  const ends = usable.map((g) => timeOf(g, 'targetDate', now + 30 * DAY) + 5 * DAY);
  const tMin = Math.min(now - 15 * DAY, ...starts);
  const tMax = Math.max(now + 15 * DAY, ...ends);
  const x = (t) => ((t - tMin) / Math.max(DAY, tMax - tMin)) * 172 + 14;

  return (
    <ul className="space-y-2" role="img" aria-label="Goal timeline">
      {usable.map((g) => {
        const s = x(timeOf(g, 'startDate', now - 30 * DAY));
        const e = x(timeOf(g, 'targetDate', now + 30 * DAY));
        return (
          <li key={g._id} className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60" style={{ height }}>
            <div className="grid h-4 items-center">
              <svg viewBox="0 0 200 16" width="100%" height="16" preserveAspectRatio="none">
                <line x1="14" y1="8" x2="186" y2="8" className={AXIS} strokeWidth="0.5" />
                <rect x={s} y={4} width={Math.max(2, e - s)} height="7" rx="3.5" fill={areaColor(g.milestones?.length > 1 ? 0 : 1)} opacity="0.85" />
                <line x1={x(now)} y1={2} x2={x(now)} y2="14" stroke="#ef4444" strokeWidth="1" />
                {g.milestones?.map((m) =>
                  m.dueDate ? (
                    <rect key={m.id} x={x(toTime(m.dueDate)) - 1.5} y="3" width="3" height="9" rx="1" fill={m.done ? '#10b981' : '#f59e0b'} transform={`rotate(45 ${x(toTime(m.dueDate))} 7.5)`} />
                  ) : null,
                )}
              </svg>
            </div>
            <p className="truncate text-xs text-slate-600 dark:text-slate-300">
              {g.title}
              {!g.targetDate && ' · (no target date)'}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

// ---------------- Assessment score line ----------------
export function ScoreLine({ series, height = 160 }) {
  // series: [{ name, points: [{ score, date }] }] — points sorted ascending.
  const all = series.flatMap((s) => s.points);
  if (all.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">No assessments recorded yet.</p>;
  }
  const times = all.map((p) => toTime(p.date));
  const tMin = Math.min(...times);
  const tMax = Math.max(...times);
  const x = (date) => (tMax === tMin ? 100 : ((toTime(date) - tMin) / (tMax - tMin)) * 170 + 15);
  const y = (score) => 80 - (Math.max(0, Math.min(10, score)) / 10) * 70;

  return (
    <svg viewBox="0 0 200 90" width="100%" style={{ height }} preserveAspectRatio="none" role="img" aria-label="Assessment trend">
      {[0, 5, 10].map((ring) => (
        <g key={ring}>
          <line x1="15" y1={y(ring)} x2="185" y2={y(ring)} className={AXIS} strokeWidth="0.5" strokeDasharray={ring === 5 ? '2 2' : undefined} />
          <text x="2" y={y(ring) + 2} fontSize="6" className={TEXT}>{ring}</text>
        </g>
      ))}
      {series.map((s, i) => {
        const sorted = [...s.points].sort((a, b) => toTime(a.date) - toTime(b.date));
        return (
          <g key={s.name}>
            {sorted.length > 1 && (
              <polyline points={sorted.map((p) => `${x(p.date)},${y(p.score)}`).join(' ')} fill="none" stroke={areaColor(i)} strokeWidth="1.5" />
            )}
            {sorted.map((p, j) => (
              <circle key={j} cx={x(p.date)} cy={y(p.score)} r="2" fill={areaColor(i)} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

// ---------------- Impact / effort scatter ----------------
export function ImpactEffortScatter({ items, height = 240 }) {
  if (items.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">Nothing to plot yet.</p>;
  }
  const GRID = 30;
  const cell = (slot) => 10 + slot * GRID; // slot 0..4 → 10..130
  const mid = cell(2) + GRID / 2; // quadrant midlines at 85
  return (
    <svg viewBox="0 0 150 145" width="100%" style={{ height }} role="img" aria-label="Impact vs effort scatter">
      <rect x="10" y="10" width="140" height="120" className={AXIS} fill="none" strokeWidth="0.75" />
      <line x1="85" y1="10" x2="85" y2="130" className={AXIS} strokeWidth="0.5" strokeDasharray="2 2" />
      <line x1="10" y1="70" x2="150" y2="70" className={AXIS} strokeWidth="0.5" strokeDasharray="2 2" />
      {items.map((g, i) => {
        const cx = cell((g.effort || 1) - 1) + GRID / 2;
        const cy = 130 - cell((g.impact || 1) - 1) - GRID / 2;
        return (
          <g key={g._id}>
            <circle cx={cx} cy={cy} r="5" fill={areaColor(i)} opacity="0.85" />
            <text x={cx} y={cy - 8} fontSize="6" textAnchor="middle" className="fill-slate-600 dark:fill-slate-300">
              {g.title.length > 14 ? `${g.title.slice(0, 13)}…` : g.title}
            </text>
          </g>
        );
      })}
      <text x="146" y="137" fontSize="7" textAnchor="end" className={TEXT}>effort →</text>
      <text x="12" y="8" fontSize="7" className={TEXT}>impact →</text>
      <text x="24" y="18" fontSize="6" className={TEXT}>quick wins</text>
      <text x="104" y="18" fontSize="6" className={TEXT}>big bets</text>
      <text x="24" y="126" fontSize="6" className={TEXT}>fill-ins</text>
      <text x="104" y="126" fontSize="6" className={TEXT}>money pits</text>
    </svg>
  );
}
