export default function EmptyState({ icon = '🗂️', title, description, action = null }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center dark:border-slate-700">
      <span aria-hidden="true" className="text-3xl">
        {icon}
      </span>
      <p className="mt-2 font-medium">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
