import { useGetMeQuery } from '../../../api/auth.api';

function greetingFor(hour) {
  if (hour < 5) return 'Late night focus';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function GreetingWidget() {
  const { data: me } = useGetMeQuery();
  const user = me?.user;

  const now = new Date();
  let hour = now.getHours();
  let dateLabel = '';
  try {
    const tz = user?.timezone || 'UTC';
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: 'numeric', hour12: false }).formatToParts(now);
    hour = Number(parts.find((p) => p.type === 'hour')?.value ?? hour);
    dateLabel = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(now);
  } catch {
    dateLabel = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
  }

  return (
    <div>
      <p className="text-lg font-semibold">{greetingFor(hour)}, {user?.name || 'there'} 👋</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{dateLabel}</p>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
        Your first life areas are already created. Goals, tasks and the rest of the modules arrive in the
        next phases — your dashboard fills up as they do.
      </p>
    </div>
  );
}
