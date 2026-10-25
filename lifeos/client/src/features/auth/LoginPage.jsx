import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLoginMutation } from '../../api/auth.api';
import { getApiError } from '../../api/base';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Label from '../../components/ui/Label.jsx';
import Logo from '../../components/ui/Logo.jsx';

const REMEMBERED_EMAIL_KEY = 'lifeos:rememberedEmail';

const schema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
  rememberMe: z.boolean(),
});

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [login, { isLoading, error }] = useLoginMutation();
  const rememberedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY) || '';

  const { register, handleSubmit, formState } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      email: rememberedEmail,
      password: '',
      rememberMe: Boolean(rememberedEmail),
    },
  });

  const onSubmit = async (values) => {
    try {
      await login({ email: values.email, password: values.password, rememberMe: values.rememberMe }).unwrap();
      if (values.rememberMe) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, values.email.trim());
      } else {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }
      navigate(location.state?.from || '/', { replace: true });
    } catch {
      /* error shown inline via useLoginMutation error */
    }
  };

  return (
    <div className="card">
      <div className="mb-4 flex justify-center">
        <Logo />
      </div>
      <h1 className="mb-1 text-center text-xl font-semibold">Welcome back</h1>
      <p className="mb-4 text-center text-xs text-slate-400 dark:text-slate-500">
        Private install — single account. Sign-up is disabled.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="username" {...register('email')} aria-invalid={!!formState.errors.email} />
          {formState.errors.email && (
            <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">
              {formState.errors.email.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="current-password" {...register('password')} aria-invalid={!!formState.errors.password} />
          {formState.errors.password && (
            <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">
              {formState.errors.password.message}
            </p>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input type="checkbox" className="h-4 w-4 accent-indigo-600" {...register('rememberMe')} />
          Keep me signed in
        </label>

        {error && (
          <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
            {getApiError(error)}
          </p>
        )}

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm">
        <Link to="/forgot-password" className="link">Forgot password?</Link>
      </p>
    </div>
  );
}
