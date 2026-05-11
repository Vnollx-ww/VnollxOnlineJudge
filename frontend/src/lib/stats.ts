import api from './http';

export const statsApi = {
  problemCount: () => api.get<number>('/problem/count'),
  userCount: () => api.get<number>('/user/count'),
  submissionCount: () => api.get<number>('/submission/count'),
  competitionCount: () => api.get<number>('/competition/count'),
};
