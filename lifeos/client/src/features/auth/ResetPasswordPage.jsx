import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams } from 'react-router-dom';
import { useResetPasswordMutation } from '../../api/auth.api';
import { getApiError } from '../../api/base';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Label from '../../components/ui/Label.jsx';

const schema = z
  .object({ password: z.string().min(10, 'Use at least 10 characters').max(128), confirm: z.string().min(1, 'Repeat the new password') })
  .superRefine((val, ctx) => {
    if (val.password !== val.confirm) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['confirm'], message: 'Passwords do not match' });
  });

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [resetPassword, { isLoading, error, isSuccess }] = useResetPasswordMutation();
  const { register, handleSubmit, formState } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '' },
  });

  const onSubmit = async (values) => {
    await resetPassword({ token, password: values.password });
  };

  if (!token) {
    return (
      <div className="card text-center">
        <h1 className="mb-2 text-xl font-semibold">Password reset</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">This link is missing its token. Request a new one.</p>
        <p className="mt-4"><Link to="/forgot-password" className="link">Request reset link</Link></p>
      </div>
    );
  }

  return (
    <div className="card">
      <h1 className="mb-4 text-center text-xl font-semibold">Set a new password</h1>

      {isSuccess ? (
        <>
          <p className="bg-emerald-50 p-3 text-center text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" role="status">
            Password updated. Use the new password next time.
          </p>
          <p className="mt-4 text-center text-sm">
            <Link to="/login" className="link">Go to sign in</Link>
          </p>
        </>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
          <div>
            <Label htmlFor="password">New password (10+ characters)</Label>
            <Input id="password" type="password" autoComplete="new-password" {...register('password')} aria-invalid={!!formState.errors.password} />
            {formState.errors.password && (
              <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{formState.errors.password.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="confirm">Repeat new password</Label>
            <Input id="confirm" type="password" autoComplete="new-password" {...register('confirm')} aria-invalid={!!formState.errors.confirm} />
            {formState.errors.confirm && (
              <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{formState.errors.confirm.message}</p>
            )}
          </div>

          {error && (
            <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{getApiError(error)}</p>
          )}

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Updating…' : 'Update password'}
          </Button>
        </form>
      )}
    </div>
  );
}
