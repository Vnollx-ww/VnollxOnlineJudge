import api from './http';

export const antiCheatApi = {
  report: (payload: Record<string, unknown>) => api.post('/competition/anti-cheat/report', payload),
};
