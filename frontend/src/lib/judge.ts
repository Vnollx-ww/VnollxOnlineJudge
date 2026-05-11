import api from './http';

export const judgeApi = {
  test: <T = unknown>(payload: Record<string, unknown>) => api.post<T>('/judge/test', payload),
  submit: <T = unknown>(payload: Record<string, unknown>) => api.post<T>('/judge/submit', payload),
};
