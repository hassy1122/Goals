import { baseApi } from './base';

export const metaApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getHealth: builder.query({ query: () => 'health' }),
    getDailyQuote: builder.query({ query: () => 'quotes/daily' }),
  }),
});

export const { useGetHealthQuery, useGetDailyQuoteQuery } = metaApi;
