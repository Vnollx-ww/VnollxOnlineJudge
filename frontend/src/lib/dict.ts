import api from './http';

export const dictApi = {
  listData: <T = unknown>(dictType: string) => api.get<T>('/dict/data/list', { params: { dictType } }),
};
