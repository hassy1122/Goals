import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGetNotificationsQuery, useMarkAllNotificationsReadMutation, useMarkNotificationReadMutation } from '../../api/notification.api';

function timeAgo(iso) {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const { data } = useGetNotificationsQuery({ page: 1, limit: 8 });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: markingAll }] = useMarkAllNotificationsReadMutation();
  const wrapRef = useRef(null);

  const notifications = data?.notifications || [];
  const unread = notifications.filter((n) => !n.readAt).length;

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <span aria-hidden="true">🔔</span>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-1 flex items-center justify-between px-2 py-1">
            <span className="font-semibold">Notifications</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markAllRead()}
                disabled={markingAll}
                className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-slate-400">You are all caught up 🎉</p>
          ) : (
            <ul className="max-h-72 overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.id ?? n._id}>
                  <div
                    className={
                      'rounded-lg px-2 py-2 text-sm ' +
                      (n.readAt ? 'text-slate-500 dark:text-slate-400' : 'bg-indigo-50 dark:bg-indigo-950')
                    }
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-medium">{n.title}</span>
                      <span className="shrink-0 text-[10px] text-slate-400">{timeAgo(n.createdAt)}</span>
                    </div>
                    {n.body && <p className="mt-0.5 text-xs">{n.body}</p>}
                    <div className="mt-1 flex items-center gap-3">
                      {n.actionUrl && (
                        <Link to={n.actionUrl} onClick={() => setOpen(false)} className="text-xs text-indigo-600 hover:underline dark:text-indigo-400">
                          Open
                        </Link>
                      )}
                      {!n.readAt && (
                        <button
                          type="button"
                          onClick={() => markRead(n.id ?? n._id)}
                          className="text-xs text-slate-400 hover:underline"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
