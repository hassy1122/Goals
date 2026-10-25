import clsx from 'clsx';

// Score → badge label/color, mirroring the server's formula thresholds.
const LADDER = [
  { min: 9, label: 'Critical', className: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' },
  { min: 7, label: 'High', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  { min: 5, label: 'Medium', className: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300' },
  { min: 3, label: 'Low', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  { min: -Infinity, label: 'Optional', className: 'bg-slate-50 text-slate-400 dark:bg-slate-900 dark:text-slate-500' },
];

export default function PriorityBadge({ score, label, className }) {
  const rung = LADDER.find((r) => score >= r.min) || LADDER[LADDER.length - 1];
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
        rung.className,
        className,
      )}
      title={`Priority ${score} = (Importance×3 + Impact×2 + Urgency×2) ÷ Effort`}
    >
      {label || rung.label} · {score}
    </span>
  );
}
