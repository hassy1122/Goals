import { baseApi } from './base';
import { userLoaded, sessionCleared } from '../stores/authSlice';

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMe: builder.query({
      query: () => ({ url: 'auth/me' }),
      providesTags: ['Me'],
    }),
    register: builder.mutation({
      query: (body) => ({ url: 'auth/register', method: 'POST', body }),
      onQueryStarted: async (_arg, { dispatch, queryFulfilled }) => {
        try {
          const { data } = await queryFulfilled;
          dispatch(userLoaded(data.user));
        } catch {
          /* surfaced to the user in the form */
        }
      },
    }),
    login: builder.mutation({
      query: (body) => ({ url: 'auth/login', method: 'POST', body }),
      onQueryStarted: async (_arg, { dispatch, queryFulfilled }) => {
        try {
          const { data } = await queryFulfilled;
          dispatch(userLoaded(data.user));
        } catch {
          /* surfaced to the user in the form */
        }
      },
    }),
    logout: builder.mutation({
      query: () => ({ url: 'auth/logout', method: 'POST' }),
      onQueryStarted: async (_arg, { dispatch, queryFulfilled }) => {
        try {
          await queryFulfilled;
        } finally {
          dispatch(sessionCleared());
          dispatch(baseApi.util.resetApiState());
        }
      },
    }),
    verifyEmail: builder.mutation({
      query: (body) => ({ url: 'auth/verify-email', method: 'POST', body }),
    }),
    resendVerification: builder.mutation({
      query: () => ({ url: 'auth/resend-verification', method: 'POST' }),
    }),
    forgotPassword: builder.mutation({
      query: (body) => ({ url: 'auth/forgot-password', method: 'POST', body }),
    }),
    resetPassword: builder.mutation({
      query: (body) => ({ url: 'auth/reset-password', method: 'POST', body }),
    }),
    updateMe: builder.mutation({
      query: (body) => ({ url: 'auth/me', method: 'PATCH', body }),
      invalidatesTags: ['Me'],
      onQueryStarted: async (_arg, { dispatch, queryFulfilled }) => {
        try {
          const { data } = await queryFulfilled;
          dispatch(userLoaded(data.user));
        } catch {
          /* surfaced to the user in the form */
        }
      },
    }),
    changePassword: builder.mutation({
      query: (body) => ({ url: 'auth/me/password', method: 'PATCH', body }),
      // http-only cookies rotate server-side; nothing else needs updating client-side
    }),
    updatePreferences: builder.mutation({
      query: (body) => ({ url: 'auth/me/preferences', method: 'PATCH', body }),
      invalidatesTags: ['Me'],
      onQueryStarted: async (_arg, { dispatch, queryFulfilled }) => {
        try {
          const { data } = await queryFulfilled;
          dispatch(userLoaded(data.user));
        } catch {
          /* surfaced to the user in the form */
        }
      },
    }),
    deleteAccount: builder.mutation({
      query: (body) => ({ url: 'auth/me', method: 'DELETE', body }),
      onQueryStarted: async (_arg, { dispatch, queryFulfilled }) => {
        try {
          await queryFulfilled;
        } finally {
          dispatch(sessionCleared());
          dispatch(baseApi.util.resetApiState());
        }
      },
    }),
  }),
});

export const {
  useGetMeQuery,
  useRegisterMutation,
  useLoginMutation,
  useLogoutMutation,
  useVerifyEmailMutation,
  useResendVerificationMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useUpdateMeMutation,
  useChangePasswordMutation,
  useUpdatePreferencesMutation,
  useDeleteAccountMutation,
} = authApi;
