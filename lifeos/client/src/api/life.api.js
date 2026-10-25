import { baseApi } from './base';

// Life module: areas, wheel, assessments, vision (+ board), decisions, onboarding.
export const lifeApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listAreas: builder.query({
      query: ({ includeArchived } = {}) =>
        `life-areas${includeArchived ? '?includeArchived=true' : ''}`,
      providesTags: ['LifeArea'],
    }),
    getWheel: builder.query({
      query: () => 'life-areas/wheel',
      providesTags: ['LifeArea'],
    }),
    createArea: builder.mutation({
      query: (body) => ({ url: 'life-areas', method: 'POST', body }),
      invalidatesTags: ['LifeArea', 'Goal'],
    }),
    updateArea: builder.mutation({
      query: ({ id, ...body }) => ({ url: `life-areas/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['LifeArea', 'Goal'],
    }),
    reorderAreas: builder.mutation({
      query: (order) => ({ url: 'life-areas/reorder', method: 'POST', body: { order } }),
      invalidatesTags: ['LifeArea'],
    }),
    deleteArea: builder.mutation({
      query: (id) => ({ url: `life-areas/${id}`, method: 'DELETE' }),
      invalidatesTags: ['LifeArea', 'Goal'],
    }),
    assessArea: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `life-areas/${id}/assessments`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['LifeArea'],
    }),
    listAreaAssessments: builder.query({
      query: ({ id, page = 1, limit = 10 } = {}) =>
        `life-areas/${id}/assessments?page=${page}&limit=${limit}`,
      providesTags: (_r, _e, { id }) => [{ type: 'LifeArea', id }],
    }),

    getVision: builder.query({
      query: () => 'vision',
      providesTags: ['Vision'],
    }),
    updateVision: builder.mutation({
      query: (body) => ({ url: 'vision', method: 'PATCH', body }),
      invalidatesTags: ['Vision'],
    }),
    addBoardImage: builder.mutation({
      query: (body) => ({ url: 'vision/board', method: 'POST', body }),
      invalidatesTags: ['Vision'],
    }),
    removeBoardImage: builder.mutation({
      query: (imageId) => ({ url: `vision/board/${imageId}`, method: 'DELETE' }),
      invalidatesTags: ['Vision'],
    }),
    reorderBoard: builder.mutation({
      query: (order) => ({ url: 'vision/board', method: 'PATCH', body: { order } }),
      invalidatesTags: ['Vision'],
    }),

    listDecisions: builder.query({
      query: ({ status, page = 1, limit = 20 } = {}) => {
        const params = new URLSearchParams();
        if (status) params.set('status', status);
        params.set('page', String(page));
        params.set('limit', String(limit));
        return `decisions?${params.toString()}`;
      },
      providesTags: ['Decision'],
    }),
    createDecision: builder.mutation({
      query: (body) => ({ url: 'decisions', method: 'POST', body }),
      invalidatesTags: ['Decision'],
    }),
    updateDecision: builder.mutation({
      query: ({ id, ...body }) => ({ url: `decisions/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Decision'],
    }),
    deleteDecision: builder.mutation({
      query: (id) => ({ url: `decisions/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Decision'],
    }),

    completeOnboarding: builder.mutation({
      query: (body) => ({ url: 'auth/me/onboarding/complete', method: 'POST', body }),
      invalidatesTags: ['Me', 'LifeArea', 'Vision', 'Goal'],
    }),
  }),
});

export const {
  useListAreasQuery,
  useGetWheelQuery,
  useCreateAreaMutation,
  useUpdateAreaMutation,
  useReorderAreasMutation,
  useDeleteAreaMutation,
  useAssessAreaMutation,
  useListAreaAssessmentsQuery,
  useGetVisionQuery,
  useUpdateVisionMutation,
  useAddBoardImageMutation,
  useRemoveBoardImageMutation,
  useReorderBoardMutation,
  useListDecisionsQuery,
  useCreateDecisionMutation,
  useUpdateDecisionMutation,
  useDeleteDecisionMutation,
  useCompleteOnboardingMutation,
} = lifeApi;
