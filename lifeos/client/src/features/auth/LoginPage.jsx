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

const schema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [login, { isLoading, error }] = useLoginMutation();
  const { register, handleSubmit, formState } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values) => {
    try {
      await login(values).unwrap();
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
      <h1 className="mb-4 text-center text-xl font-semibold">Welcome back</h1>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" {...register('email')} aria-invalid={!!formState.errors.email} />
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
      <p className="mt-1 text-center text-sm">
        No account yet? <Link to="/register" className="link">Create one</Link>
      </p>
    </div>
  );
}
