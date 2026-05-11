import api from './http';

export const userApi = {
  getProfile: <T = unknown>() => api.get<T>('/user/profile'),
  getById: <T = unknown>(userId: string | number | undefined) => api.get<T>(`/user/${userId}`),
  list: <T = unknown>(params?: Record<string, unknown>) => api.get<T>('/user/list', { params }),
  getSolvedProblems: <T = unknown>(uid: string | number) => api.get<T>('/user/solved-problems', { params: { uid } }),
  getLearningStats: <T = unknown>(days: number) => api.get<T>('/user/learning-stats', { params: { days } }),
  updateProfile: <T = unknown>(payload: FormData | Record<string, unknown>) => api.put<T>('/user/update/profile', payload),
  updatePassword: (payload: { oldPassword: string; newPassword: string }) => api.put('/user/update/password', payload),
  uploadAvatar: <T = unknown>(payload: FormData, prefix?: string) => api.post<T>(`/user/upload/avatar${prefix ? `?prefix=${prefix}` : ''}`, payload),
};
