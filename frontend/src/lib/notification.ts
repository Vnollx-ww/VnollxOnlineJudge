import api from './http';

export const notificationApi = {
  count: (params?: Record<string, unknown>) => api.get<number>('/notification/count', { params }),
  list: <T = unknown>(params?: Record<string, unknown>) => api.get<T>('/notification/list', { params }),
  info: <T = unknown>(nid: string | number | undefined) => api.get<T>('/notification/info', { params: { nid } }),
  read: (id: string | number) => api.put(`/notification/read/${id}`),
  readAll: () => api.put('/notification/readAll'),
  delete: (id: string | number) => api.delete(`/notification/delete/${id}`),
};
