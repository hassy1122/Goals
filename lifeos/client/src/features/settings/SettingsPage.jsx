import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch, useSelector } from 'react-redux';
import { useGetMeQuery, useUpdateMeMutation, useChangePasswordMutation, useUpdatePreferencesMutation } from '../../api/auth.api';
import { getApiError } from '../../api/base';
import { pushToast, setTheme } from '../../stores/uiSlice';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Label from '../../components/ui/Label.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(60),
  avatarUrl: z
    .string()
    .trim()
    .max(400)
    .refine((v) => v === '' || /^https?:\/\/\S+$/.test(v), 'Enter a valid http(s) URL or leave empty'),
  timezone: z.string().trim().min(1, 'Timezone is required').max(64),
  locale: z.string().trim().min(1).max(10),
});

const passwordSchema = z
  .object({ currentPassword: z.string().min(1, 'Enter your current password'), newPassword: z.string().min(10, 'Use at least 10 characters').max(128), confirm: z.string().min(1, 'Repeat the new password') })
  .superRefine((val, ctx) => {
    if (val.newPassword !== val.confirm) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['confirm'], message: 'Passwords do not match' });
  });

const THEMES = [
  { value: 'light', label: 'Light ☀️' },
  { value: 'dark', label: 'Dark 🌙' },
  { value: 'system', label: 'System 🖥️' },
];

export default function SettingsPage() {
  const dispatchRedux = useDispatch();
  const { data: me, isLoading } = useGetMeQuery();
  const user = me?.user;
  const [updateMe, { isLoading: savingProfile, error: profileError }] = useUpdateMeMutation();
  const [changePassword, { isLoading: savingPassword, error: passwordError }] = useChangePasswordMutation();
  const [updatePreferences, { isLoading: savingPrefs }] = useUpdatePreferencesMutation();
  const uiTheme = useSelector((s) => s.ui.theme);

  const profileForm = useForm({ resolver: zodResolver(profileSchema), defaultValues: { name: '', avatarUrl: '', timezone: 'UTC', locale: 'en' } });
  const passwordForm = useForm({ resolver: zodResolver(passwordSchema), defaultValues: { currentPassword: '', newPassword: '', confirm: '' } });

  useEffect(() => {
    if (user) {
      profileForm.reset({
        name: user.name || '',
        avatarUrl: user.avatarUrl || '',
        timezone: user.timezone || 'UTC',
        locale: user.locale || 'en',
      });
      dispatchRedux(setTheme(user.theme || 'system'));
    }
  }, [user, profileForm, dispatchRedux]);

  const onSubmitProfile = async (values) => {
    try {
      await updateMe(values).unwrap();
      dispatchRedux(pushToast('Profile saved', 'success'));
    } catch { /* shown inline */ }
  };

  const onSubmitPassword = async (values) => {
    try {
      await changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword }).unwrap();
      passwordForm.reset({ currentPassword: '', newPassword: '', confirm: '' });
      dispatchRedux(pushToast('Password changed — other sessions signed out', 'success'));
    } catch { /* shown inline */ }
  };

  const onThemeChange = (value) => {
    dispatchRedux(setTheme(value)); // instant visual; every change persists via the profile endpoint
    if (value !== user?.theme) updateMe({ theme: value });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">Profile</h2>
        <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} noValidate className="space-y-3">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...profileForm.register('name')} aria-invalid={!!profileForm.formState.errors.name} />
            {profileForm.formState.errors.name && (
              <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{profileForm.formState.errors.name.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="avatarUrl">Avatar URL (optional)</Label>
            <Input id="avatarUrl" placeholder="https://…" {...profileForm.register('avatarUrl')} aria-invalid={!!profileForm.formState.errors.avatarUrl} />
            {profileForm.formState.errors.avatarUrl && (
              <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{profileForm.formState.errors.avatarUrl.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="timezone">Timezone (IANA)</Label>
              <Input id="timezone" list="tz-list" {...profileForm.register('timezone')} />
              <datalist id="tz-list">
                <option value="UTC" />
                <option value="Europe/London" />
                <option value="Europe/Berlin" />
                <option value="America/New_York" />
                <option value="America/Los_Angeles" />
                <option value="Asia/Dhaka" />
                <option value="Asia/Tokyo" />
                <option value="Australia/Sydney" />
              </datalist>
            </div>
            <div>
              <Label htmlFor="locale">Language code</Label>
              <Input id="locale" {...profileForm.register('locale')} />
            </div>
          </div>

          {profileError && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{getApiError(profileError)}</p>}

          <Button type="submit" disabled={savingProfile}>{savingProfile ? 'Saving…' : 'Save profile'}</Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">Appearance</h2>
        <fieldset className="flex flex-wrap gap-2" disabled={savingPrefs}>
          <legend className="sr-only">Theme</legend>
          {THEMES.map((t) => (
            <label key={t.value} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
              <input
                type="radio"
                name="theme"
                value={t.value}
                checked={uiTheme === t.value}
                onChange={() => onThemeChange(t.value)}
                className="accent-indigo-600"
              />
              {t.label}
            </label>
          ))}
        </fieldset>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">Change password</h2>
        <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} noValidate className="space-y-3">
          <div>
            <Label htmlFor="currentPassword">Current password</Label>
            <Input id="currentPassword" type="password" autoComplete="current-password" {...passwordForm.register('currentPassword')} aria-invalid={!!passwordForm.formState.errors.currentPassword} />
            {passwordForm.formState.errors.currentPassword && (
              <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{passwordForm.formState.errors.currentPassword.message}</p>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="newPassword">New password (10+ characters)</Label>
              <Input id="newPassword" type="password" autoComplete="new-password" {...passwordForm.register('newPassword')} aria-invalid={!!passwordForm.formState.errors.newPassword} />
              {passwordForm.formState.errors.newPassword && (
                <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{passwordForm.formState.errors.newPassword.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="confirm">Repeat new password</Label>
              <Input id="confirm" type="password" autoComplete="new-password" {...passwordForm.register('confirm')} aria-invalid={!!passwordForm.formState.errors.confirm} />
              {passwordForm.formState.errors.confirm && (
                <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{passwordForm.formState.errors.confirm.message}</p>
              )}
            </div>
          </div>

          {passwordError && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{getApiError(passwordError)}</p>}

          <Button type="submit" disabled={savingPassword}>{savingPassword ? 'Updating…' : 'Update password'}</Button>
        </form>
      </Card>
    </div>
  );
}
