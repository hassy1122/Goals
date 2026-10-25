import clsx from 'clsx';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { dismissToast } from '../../stores/uiSlice';

const BG = {
  success: 'bg-emerald-600',
  error: 'bg-rose-600',
  info: 'bg-slate-900',
};

function Toast({ toast }) {
  const dispatch = useDispatch();

  useEffect(() => {
    const t = setTimeout(() => dispatch(dismissToast(toast.id)), 4000);
    return () => clearTimeout(t);
  }, [toast.id, dispatch]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={clsx('pointer-events-auto rounded-lg px-4 py-3 text-sm text-white shadow-lg', BG[toast.type] || BG.info)}
    >
      {toast.message}
    </div>
  );
}

export default function Toaster() {
  const toasts = useSelector((s) => s.ui.toasts);

  return (
    <div aria-label="Notifications" className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} />
      ))}
    </div>
  );
}
