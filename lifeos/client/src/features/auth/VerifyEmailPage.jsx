import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useVerifyEmailMutation } from '../../api/auth.api';
import { getApiError } from '../../api/base';
import Spinner from '../../components/ui/Spinner.jsx';
import Logo from '../../components/ui/Logo.jsx';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [verify, { data, isLoading, error }] = useVerifyEmailMutation();
  const firedRef = useRef(false);

  useEffect(() => {
    if (token && !firedRef.current) {
      firedRef.current = true;
      verify({ token });
    }
  }, [token, verify]);

  const succeeded = !!data?.verified;
  const failed = !!error || (!isLoading && !!token && !succeeded);

  return (
    <div className="card text-center">
      <div className="mb-4 flex justify-center">
        <Logo />
      </div>

      {!token && <p className="text-sm text-slate-600 dark:text-slate-300">No verification token in the link.</p>}

      {isLoading && <Spinner className="mx-auto h-8 w-8" label="Verifying email" />}

      {succeeded && (
        <>
          <p className="text-sm text-emerald-600 dark:text-emerald-400">Email verified 🎉</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            <Link to="/login" className="link">Continue to sign in</Link>
          </p>
        </>
      )}

      {failed && (
        <>
          <p className="text-sm text-rose-600 dark:text-rose-400">
            {error ? getApiError(error) : 'This link is no longer valid.'}
          </p>
          {error?.data?.error?.code === 'TOKEN_USED' && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              This link was already used — you may already be verified.
            </p>
          )}
          <p className="mt-4 text-sm">
            <Link to="/login" className="link">Go to sign in</Link>
          </p>
        </>
      )}
    </div>
  );
}
