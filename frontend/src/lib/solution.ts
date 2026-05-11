import api from './http';

export const solutionApi = {
  list: <T = unknown>(pid: string | number | undefined) => api.get<T>('/solve/list', { params: { pid } }),
  detail: <T = unknown>(id: string | number | undefined) => api.get<T>('/solve/detail', { params: { id } }),
  create: <T = unknown>(payload: Record<string, unknown>) => api.post<T>('/solve/create', payload),
};
