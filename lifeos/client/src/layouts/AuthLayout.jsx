import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="grid min-h-dvh place-items-center bg-slate-100 px-4 py-10 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        <Suspense
          fallback={
            <div className="grid place-items-center py-24">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" role="status" aria-label="Loading page" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
}
