import { baseApi } from './base';

const API_ROOT = `${(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')}/api/v1`;

// Owner-guarded file URL — src it directly; the httpOnly session cookie authorizes it.
export const uploadUrl = (uploadId) => `${API_ROOT}/uploads/${uploadId}`;

export const uploadApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    uploadFile: builder.mutation({
      query: (file) => {
        const form = new FormData();
        form.append('file', file);
        return { url: 'uploads', method: 'POST', body: form };
      },
    }),
    deleteUpload: builder.mutation({
      query: (id) => ({ url: `uploads/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Vision'],
    }),
  }),
});

export const { useUploadFileMutation, useDeleteUploadMutation } = uploadApi;
