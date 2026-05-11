import api from './http';

export const submissionApi = {
  list: <T = unknown>(params?: Record<string, unknown>) => api.get<T>('/submission/list', { params }),
  count: (params?: Record<string, unknown>) => api.get<number>('/submission/count', { params }),
  submit: <T = unknown>(payload: Record<string, unknown>) => api.post<T>('/submission/submit', payload),
};
