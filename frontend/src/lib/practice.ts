import api from './http';

export const practiceApi = {
  list: <T = unknown>() => api.get<T>('/practice/list'),
  get: <T = unknown>(id: string | number | undefined) => api.get<T>(`/practice/${id}`),
  problems: <T = unknown>(id: string | number | undefined, params?: Record<string, unknown>) => api.get<T>(`/practice/${id}/problems`, { params }),
};
