import api from './http';

export const aiApi = {
  getHistoryPage: <T = unknown>(query: string) => api.get<T>(`/ai/history/page?${query}`),
  listModels: <T = unknown>() => api.get<T>('/ai/models'),
  listSessions: <T = unknown>() => api.get<T>('/ai/sessions'),
  createSession: <T = unknown>(title?: string) => api.post<T>('/ai/sessions', title ? { title } : {}),
  deleteSession: (sessionId: string) => api.delete<void>(`/ai/sessions/${sessionId}`),
};
