import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { userLoaded, sessionCleared } from '../stores/authSlice';

const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const ROOT = `${base}/api/v1`;

let refreshInFlight = null;

// One shared refresh attempt (cookie-based); concurrent 401s reuse the same promise.
async function refreshSession() {
  try {
    const res = await fetch(`${ROOT}/auth/refresh`, { method: 'POST', credentials: 'include' });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data?.user ?? null;
  } catch {
    return null;
  } finally {
    refreshInFlight = null;
  }
}

const rawBaseQuery = fetchBaseQuery({ baseUrl: ROOT, credentials: 'include' });

// Server envelopes every 2xx as { success, data }; unwrap so hooks receive the inner payload.
const unwrapEnvelope = (result) =>
  result.data && result.data.success !== undefined && result.data.data !== undefined
    ? { ...result, data: result.data.data }
    : result;

const baseQueryWithReauth = async (args, api, extra) => {
  let result = unwrapEnvelope(await rawBaseQuery(args, api, extra));

  if (result.error?.status === 401) {
    refreshInFlight = refreshInFlight || refreshSession();
    const user = await refreshInFlight;

    if (user) {
      api.dispatch(userLoaded(user));
      result = unwrapEnvelope(await rawBaseQuery(args, api, extra));
    } else {
      api.dispatch(sessionCleared());
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Me', 'Notification', 'LifeArea', 'Vision', 'Decision', 'Goal', 'Template'],
  endpoints: () => ({}),
});

export const getApiError = (error) =>
  error?.data?.error?.message || error?.message || 'Request failed. Try again.';
