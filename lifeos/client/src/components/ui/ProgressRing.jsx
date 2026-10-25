import clsx from 'clsx';

const COLOR = {
  emerald: 'text-emerald-500',
  sky: 'text-sky-500',
  amber: 'text-amber-500',
  rose: 'text-rose-500',
  indigo: 'text-indigo-500',
};

export default function ProgressRing({ percent = 0, size = 56, stroke = 6, color = 'indigo', className, children }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = 50 - stroke / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (clamped / 100) * circumference;

  return (
    <div className={clsx('relative inline-grid place-items-center', className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={`Progress ${clamped}%`}>
        <circle cx="50" cy="50" r={radius} fill="none" strokeWidth={stroke} className="stroke-slate-200 dark:stroke-slate-800" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          transform="rotate(-90 50 50)"
          className={COLOR[color] || COLOR.indigo}
        />
      </svg>
      <span className="absolute text-center leading-tight" aria-hidden="true">
        {children ?? <span className="text-sm font-semibold">{Math.round(clamped)}%</span>}
      </span>
    </div>
  );
}
