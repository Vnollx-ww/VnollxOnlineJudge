import api from './http';

export const friendApi = {
  list: <T = unknown>() => api.get<T>('/friend/list'),
  requests: <T = unknown>() => api.get<T>('/friend/requests'),
  search: <T = unknown>(keyword: string, pageNum = 1, pageSize = 20) => api.get<T>('/friend/search', { params: { keyword, pageNum, pageSize } }),
  chat: <T = unknown>(friendId: string | number, pageNum: number, pageSize: number) => api.get<T>(`/friend/chat/${friendId}`, { params: { pageNum, pageSize } }),
  read: (friendId: string | number) => api.post(`/friend/read/${friendId}`),
  sendMessage: <T = unknown>(receiverId: string | number, content: string) => api.post<T>('/friend/message', { receiverId, content }),
  request: (userId: string | number) => api.post(`/friend/request/${userId}`),
  accept: (requesterId: string | number) => api.post(`/friend/accept/${requesterId}`),
  reject: (requesterId: string | number) => api.post(`/friend/reject/${requesterId}`),
  clearChat: (friendId: string | number) => api.delete(`/friend/chat/clear/${friendId}`),
};
