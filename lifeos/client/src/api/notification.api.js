import { baseApi } from './base';

export const notificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query({
      query: ({ page = 1, limit = 8, unread } = {}) => {
        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (unread) params.set('unread', 'true');
        return `notifications?${params.toString()}`;
      },
      providesTags: (result) =>
        result?.notifications
          ? [
              ...result.notifications.map((n) => ({ type: 'Notification', id: n.id ?? n._id })),
              { type: 'Notification', id: 'LIST' },
            ]
          : [{ type: 'Notification', id: 'LIST' }],
    }),
    markNotificationRead: builder.mutation({
      query: (id) => ({ url: `notifications/${id}/read`, method: 'PATCH' }),
      invalidatesTags: (_r, _e, id) => [{ type: 'Notification', id }],
    }),
    markAllNotificationsRead: builder.mutation({
      query: () => ({ url: 'notifications/read-all', method: 'POST' }),
      invalidatesTags: [{ type: 'Notification', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = notificationApi;
