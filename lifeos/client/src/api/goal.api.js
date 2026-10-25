import { baseApi } from './base';

// Goals module: CRUD, milestones, risks, dependencies, analytics, templates.
const qs = (params = {}) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const str = search.toString();
  return str ? `?${str}` : '';
};

export const goalApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listGoals: builder.query({
      query: (filters = {}) => `goals${qs(filters)}`,
      providesTags: ['Goal'],
    }),
    getGoal: builder.query({
      query: (goalId) => `goals/${goalId}`,
      providesTags: (_r, _e, goalId) => [{ type: 'Goal', id: goalId }],
    }),
    createGoal: builder.mutation({
      query: (body) => ({ url: 'goals', method: 'POST', body }),
      invalidatesTags: ['Goal', 'LifeArea'],
    }),
    updateGoal: builder.mutation({
      query: ({ goalId, ...body }) => ({ url: `goals/${goalId}`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { goalId }) => ['Goal', 'LifeArea', { type: 'Goal', id: goalId }],
    }),
    deleteGoal: builder.mutation({
      query: (goalId) => ({ url: `goals/${goalId}`, method: 'DELETE' }),
      invalidatesTags: ['Goal', 'LifeArea'],
    }),

    createMilestone: builder.mutation({
      query: ({ goalId, ...body }) => ({
        url: `goals/${goalId}/milestones`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_r, _e, { goalId }) => ['Goal', { type: 'Goal', id: goalId }],
    }),
    updateMilestone: builder.mutation({
      query: ({ goalId, milestoneId, ...body }) => ({
        url: `goals/${goalId}/milestones/${milestoneId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_r, _e, { goalId }) => ['Goal', { type: 'Goal', id: goalId }],
    }),
    redeemMilestone: builder.mutation({
      query: ({ goalId, milestoneId }) => ({
        url: `goals/${goalId}/milestones/${milestoneId}/redeem`,
        method: 'POST',
      }),
      invalidatesTags: (_r, _e, { goalId }) => ['Goal', { type: 'Goal', id: goalId }],
    }),
    deleteMilestone: builder.mutation({
      query: ({ goalId, milestoneId }) => ({
        url: `goals/${goalId}/milestones/${milestoneId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_r, _e, { goalId }) => ['Goal', { type: 'Goal', id: goalId }],
    }),
    reorderMilestones: builder.mutation({
      query: ({ goalId, order }) => ({
        url: `goals/${goalId}/milestones/reorder`,
        method: 'POST',
        body: { order },
      }),
      onQueryStarted: async ({ goalId, order }, { dispatch, queryFulfilled }) => {
        // Optimistic: reorder temporarily in the detail cache, roll back on failure.
        const patch = dispatch(
          goalApi.util.updateQueryData('getGoal', goalId, (draft) => {
            const byId = new Map(draft.milestones.map((m) => [m._id, m]));
            draft.milestones = order.map((id) => byId.get(id)).filter(Boolean);
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),

    addRisk: builder.mutation({
      query: ({ goalId, ...body }) => ({ url: `goals/${goalId}/risks`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { goalId }) => ['Goal', { type: 'Goal', id: goalId }],
    }),
    updateRisk: builder.mutation({
      query: ({ goalId, index, ...body }) => ({
        url: `goals/${goalId}/risks/${index}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_r, _e, { goalId }) => ['Goal', { type: 'Goal', id: goalId }],
    }),
    deleteRisk: builder.mutation({
      query: ({ goalId, index }) => ({
        url: `goals/${goalId}/risks/${index}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_r, _e, { goalId }) => ['Goal', { type: 'Goal', id: goalId }],
    }),

    addDependency: builder.mutation({
      query: ({ goalId, depId }) => ({
        url: `goals/${goalId}/dependencies`,
        method: 'POST',
        body: { depId },
      }),
      invalidatesTags: () => ['Goal'],
    }),
    removeDependency: builder.mutation({
      query: ({ goalId, depId }) => ({
        url: `goals/${goalId}/dependencies/${depId}`,
        method: 'DELETE',
      }),
      invalidatesTags: () => ['Goal'],
    }),
    listDependencyCandidates: builder.query({
      query: (goalId) => `goals/${goalId}/dependencies/candidates`,
      providesTags: ['Goal'],
    }),

    getBurnup: builder.query({
      query: (goalId) => `goals/${goalId}/burnup`,
      providesTags: (_r, _e, goalId) => [{ type: 'Goal', id: goalId }],
    }),
    getComparison: builder.query({
      query: () => 'goals/analytics/comparison',
      providesTags: ['Goal'],
    }),
    getImpactEffort: builder.query({
      query: () => 'goals/analytics/impact-effort',
      providesTags: ['Goal'],
    }),
    getGantt: builder.query({
      query: () => 'goals/analytics/gantt',
      providesTags: ['Goal'],
    }),

    getTemplates: builder.query({
      query: () => 'goal-templates',
      providesTags: ['Template'],
    }),
    makeTemplate: builder.mutation({
      query: ({ goalId, templateKey } = {}) => ({
        url: `goals/${goalId}/make-template`,
        method: 'POST',
        body: templateKey ? { templateKey } : {},
      }),
      invalidatesTags: ['Template'],
    }),
    applyTemplate: builder.mutation({
      query: ({ key, ...body }) => ({ url: `goal-templates/${key}/apply`, method: 'POST', body }),
      invalidatesTags: ['Goal', 'Template', 'LifeArea'],
    }),
  }),
});

export const {
  useListGoalsQuery,
  useGetGoalQuery,
  useCreateGoalMutation,
  useUpdateGoalMutation,
  useDeleteGoalMutation,
  useCreateMilestoneMutation,
  useUpdateMilestoneMutation,
  useRedeemMilestoneMutation,
  useDeleteMilestoneMutation,
  useReorderMilestonesMutation,
  useAddRiskMutation,
  useUpdateRiskMutation,
  useDeleteRiskMutation,
  useAddDependencyMutation,
  useRemoveDependencyMutation,
  useListDependencyCandidatesQuery,
  useGetBurnupQuery,
  useGetComparisonQuery,
  useGetImpactEffortQuery,
  useGetGanttQuery,
  useGetTemplatesQuery,
  useMakeTemplateMutation,
  useApplyTemplateMutation,
} = goalApi;
