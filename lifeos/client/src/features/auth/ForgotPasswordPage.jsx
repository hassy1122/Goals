import { z } from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { useForgotPasswordMutation } from '../../api/auth.api';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Label from '../../components/ui/Label.jsx';

const schema = z.object({ email: z.string().trim().email('Enter a valid email') });

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();
  const { register, handleSubmit, formState } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values) => {
    try {
      await forgotPassword(values).unwrap();
      setSent(true);
    } catch {
      setSent(true); // endpoint always answers success; show the neutral copy either way
    }
  };

  return (
    <div className="card">
      <h1 className="mb-1 text-center text-xl font-semibold">Forgot your password?</h1>
      <p className="mb-4 text-center text-sm text-slate-500 dark:text-slate-400">
        We email a reset link that expires in 1 hour.
      </p>

      {sent ? (
        <p className="bg-emerald-50 p-3 text-center text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" role="status">
          If that email belongs to an account, a reset link is on its way.
        </p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...register('email')} aria-invalid={!!formState.errors.email} />
            {formState.errors.email && (
              <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{formState.errors.email.message}</p>
            )}
          </div>
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      )}

      <p className="mt-4 text-center text-sm">
        <Link to="/login" className="link">Back to sign in</Link>
      </p>
    </div>
  );
}
