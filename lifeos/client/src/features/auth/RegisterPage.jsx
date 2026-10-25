import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { useRegisterMutation } from '../../api/auth.api';
import { getApiError } from '../../api/base';
import { pushToast } from '../../stores/uiSlice';
import { useDispatch } from 'react-redux';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Label from '../../components/ui/Label.jsx';
import Logo from '../../components/ui/Logo.jsx';

const schema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(60),
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(10, 'Use at least 10 characters').max(128),
});

export default function RegisterPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [registerUser, { isLoading, error }] = useRegisterMutation();
  const { register, handleSubmit, formState } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = async (values) => {
    try {
      await registerUser(values).unwrap();
      dispatch(pushToast('Account created — check your inbox to verify your email', 'success'));
      navigate('/', { replace: true });
    } catch {
      /* error shown inline */
    }
  };

  return (
    <div className="card">
      <div className="mb-4 flex justify-center">
        <Logo />
      </div>
      <h1 className="mb-4 text-center text-xl font-semibold">Create your LifeOS</h1>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" autoComplete="name" {...register('name')} aria-invalid={!!formState.errors.name} />
          {formState.errors.name && (
            <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{formState.errors.name.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" {...register('email')} aria-invalid={!!formState.errors.email} />
          {formState.errors.email && (
            <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{formState.errors.email.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="password">Password (10+ characters)</Label>
          <Input id="password" type="password" autoComplete="new-password" {...register('password')} aria-invalid={!!formState.errors.password} />
          {formState.errors.password && (
            <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{formState.errors.password.message}</p>
          )}
        </div>

        {error && (
          <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{getApiError(error)}</p>
        )}

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm">
        Already have an account? <Link to="/login" className="link">Sign in</Link>
      </p>
    </div>
  );
}
