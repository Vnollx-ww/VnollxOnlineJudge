import api from './http';

export const commentApi = {
  list: <T = unknown>(pid: string | number) => api.get<T>('/comment/list', { params: { pid } }),
  publish: <T = unknown>(payload: Record<string, unknown>) => api.post<T>('/comment/publish', payload),
  delete: (commentId: string | number) => api.delete('/comment/delete', { params: { commentId } }),
};
