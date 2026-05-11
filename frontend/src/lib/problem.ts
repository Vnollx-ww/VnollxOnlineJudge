import api from './http';

export const problemApi = {
  list: <T = unknown>(params?: Record<string, unknown>) => api.get<T>('/problem/list', { params }),
  count: (params?: Record<string, unknown>) => api.get<number>('/problem/count', { params }),
  get: <T = unknown>(id: string | number | undefined) => api.get<T>('/problem/get', { params: { id } }),
  tags: <T = unknown>(pid: string | number) => api.get<T>('/problem/tags', { params: { pid } }),
};

export const tagApi = {
  list: <T = unknown>() => api.get<T>('/tag/list'),
};
