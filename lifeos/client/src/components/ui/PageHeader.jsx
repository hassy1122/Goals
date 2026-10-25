import clsx from 'clsx';

// Consistent page title block: eyebrow (section), title, optional actions on the right.
export default function PageHeader({ eyebrow, title, subtitle, actions, className }) {
  return (
    <div className={clsx('mb-6 flex flex-wrap items-end justify-between gap-3', className)}>
      <div>
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">{eyebrow}</p>
        )}
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
