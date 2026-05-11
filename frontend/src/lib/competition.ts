import api from './http';

export const competitionApi = {
  list: <T = unknown>() => api.get<T>('/competition/list'),
  get: <T = unknown>(id: string | number | undefined) => api.get<T>(`/competition/${id}`),
  participation: <T = unknown>(id: string | number) => api.get<T>(`/competition/${id}/participation`),
  confirm: (id: string | number | undefined, password: string) => api.post('/competition/confirm', { id, password }),
  ranklistDetail: <T = unknown>(id: string | number | undefined) => api.get<T>('/competition/ranklist-detail', { params: { id } }),
  ranklistSubmissions: <T = unknown>(id: string | number | undefined, userId: string | number) => api.get<T>('/competition/ranklist-submissions', { params: { id, userId } }),
  listProblem: <T = unknown>(id: string | number | undefined) => api.get<T>('/competition/list-problem', { params: { id } }),
  judgeIsOpen: (now: string, id: string | number | undefined) => api.post('/competition/judgeIsOpen', { now, id }),
  judgeIsEnd: (now: string, id: string | number | undefined) => api.post('/competition/judgeIsEnd', { now, id }),
  finishStatus: <T = unknown>(id: string | number | undefined) => api.get<T>(`/competition/${id}/finish/status`),
  finish: (id: string | number | undefined) => api.post(`/competition/${id}/finish`),
};
