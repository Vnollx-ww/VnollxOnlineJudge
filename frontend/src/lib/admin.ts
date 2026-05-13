import api from './http';

export const adminUserApi = {
  list: <T = unknown>(params?: Record<string, unknown>) => api.get<T>('/admin/user/list', { params }),
  count: (params?: Record<string, unknown>) => api.get<number>('/admin/user/count', { params }),
  add: <T = unknown>(payload: Record<string, unknown>) => api.post<T>('/admin/user/add', payload),
  update: <T = unknown>(payload: Record<string, unknown>) => api.put<T>('/admin/user/update', payload),
  delete: <T = unknown>(id: string | number) => api.delete<T>(`/admin/user/delete/${id}`),
};

export const adminRoleApi = {
  listRoles: <T = unknown>() => api.get<T>('/admin/permission/roles'),
  listPermissions: <T = unknown>() => api.get<T>('/admin/permission/permissions'),
  rolePermissions: <T = unknown>(roleId: number) => api.get<T>(`/admin/permission/role/${roleId}/permissions`),
  createRole: <T = unknown>(payload: Record<string, unknown>) => api.post<T>('/admin/permission/role', payload),
  updateRole: <T = unknown>(roleId: number, payload: Record<string, unknown>) => api.put<T>(`/admin/permission/role/${roleId}`, payload),
  deleteRole: <T = unknown>(roleId: number) => api.delete<T>(`/admin/permission/role/${roleId}`),
  assignPermission: <T = unknown>(roleId: number, permissionId: number) => api.post<T>(`/admin/permission/role/${roleId}/permission/${permissionId}`),
  removePermission: <T = unknown>(roleId: number, permissionId: number) => api.delete<T>(`/admin/permission/role/${roleId}/permission/${permissionId}`),
  createPermission: <T = unknown>(payload: Record<string, unknown>) => api.post<T>('/admin/permission/permission', payload),
  updatePermission: <T = unknown>(id: number, payload: Record<string, unknown>) => api.put<T>(`/admin/permission/permission/${id}`, payload),
  deletePermission: <T = unknown>(id: number) => api.delete<T>(`/admin/permission/permission/${id}`),
  userRoles: <T = unknown>(userId: number) => api.get<T>(`/admin/permission/user/${userId}/roles`),
  userPermissions: <T = unknown>(userId: number) => api.get<T>(`/admin/permission/user/${userId}/permissions`),
  assignUserRole: <T = unknown>(userId: number, roleId: number) => api.post<T>(`/admin/permission/user/${userId}/role/${roleId}`),
  removeUserRole: <T = unknown>(userId: number, roleId: number) => api.delete<T>(`/admin/permission/user/${userId}/role/${roleId}`),
  refreshUserCache: <T = unknown>(userId: number) => api.post<T>(`/admin/permission/user/${userId}/refresh`),
  clearCache: <T = unknown>() => api.post<T>('/admin/permission/cache/clear'),
};

export const adminSolveApi = {
  list: <T = unknown>(params?: Record<string, unknown>) => api.get<T>('/admin/solve/list', { params }),
  delete: <T = unknown>(id: number) => api.delete<T>(`/admin/solve/${id}`),
  audit: <T = unknown>(id: number, status: number) => api.put<T>(`/admin/solve/${id}/status`, null, { params: { status } }),
};

export const adminStatisticsApi = {
  errorPatterns: <T = unknown>() => api.get<T>('/admin/statistics/error-patterns'),
  platform: <T = unknown>(days: number) => api.get<T>('/admin/statistics/platform', { params: { days } }),
  learning: <T = unknown>(params: Record<string, unknown>) => api.get<T>('/admin/statistics/learning', { params }),
};

export const adminProblemApi = {
  list: <T = unknown>(params?: Record<string, unknown>) => api.get<T>('/admin/problem/list', { params }),
  count: (params?: Record<string, unknown>) => api.get<number>('/admin/problem/count', { params }),
  examples: <T = unknown>(pid: string | number) => api.get<T>('/admin/problem/examples', { params: { pid } }),
  delete: <T = unknown>(id: string | number) => api.delete<T>(`/admin/problem/delete/${id}`),
  add: <T = unknown>(payload: FormData) => api.post<T>('/admin/problem/add', payload, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: <T = unknown>(payload: FormData) => api.put<T>('/admin/problem/update', payload, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const adminPracticeApi = {
  list: <T = unknown>(params?: Record<string, unknown>) => api.get<T>('/admin/practice/list', { params }),
  count: (params?: Record<string, unknown>) => api.get<number>('/admin/practice/count', { params }),
  create: <T = unknown>(payload: Record<string, unknown>) => api.post<T>('/admin/practice/create', payload),
  update: <T = unknown>(payload: Record<string, unknown>) => api.put<T>('/admin/practice/update', payload),
  delete: <T = unknown>(id: string | number) => api.delete<T>(`/admin/practice/delete/${id}`),
  practiceProblems: <T = unknown>(practiceId: string | number) => api.get<T>(`/admin/practice/${practiceId}/problems`),
  allProblems: <T = unknown>() => api.get<T>('/admin/practice/problems'),
  addProblems: <T = unknown>(practiceId: string | number, problemIds: string[]) => api.post<T>('/admin/practice/add/problems', { practiceId: practiceId.toString(), problemIds }),
  deleteProblem: <T = unknown>(practiceId: string | number, problemId: string | number) => api.delete<T>(`/admin/practice/${practiceId}/problems/${problemId}`),
};

export const adminCompetitionApi = {
  list: <T = unknown>(params?: Record<string, unknown>) => api.get<T>('/admin/competition/list', { params }),
  count: (params?: Record<string, unknown>) => api.get<number>('/admin/competition/count', { params }),
  create: <T = unknown>(payload: Record<string, unknown>) => api.post<T>('/admin/competition/create', payload),
  update: <T = unknown>(payload: Record<string, unknown>) => api.put<T>('/admin/competition/update', payload),
  delete: <T = unknown>(id: string | number) => api.delete<T>(`/admin/competition/delete/${id}`),
  problems: <T = unknown>(cid: string | number) => api.get<T>(`/admin/competition/${cid}/problems`),
  allProblems: <T = unknown>() => api.get<T>('/admin/competition/problems'),
  addProblems: <T = unknown>(cid: string | number, pids: string[]) => api.post<T>('/admin/competition/add/problems/batch', { cid: cid.toString(), pids }),
  deleteProblem: <T = unknown>(cid: string | number, pid: string | number) => api.delete<T>(`/admin/competition/${cid}/problems/${pid}`),
  updateProblemOrder: <T = unknown>(cid: string | number, problemIds: (string | number)[]) => api.put<T>(`/admin/competition/${cid}/problems/order`, { cid, problemIds }),
  teams: <T = unknown>(cid: string | number) => api.get<T>(`/admin/competition/${cid}/teams`),
  saveTeam: <T = unknown>(cid: string | number, payload: Record<string, unknown>) => api.post<T>(`/admin/competition/${cid}/teams`, payload),
  importTeams: <T = unknown>(cid: string | number, payload: FormData) => api.post<T>(`/admin/competition/${cid}/teams/import/excel`, payload),
  deleteTeam: <T = unknown>(teamId: string | number) => api.delete<T>(`/admin/competition/teams/${teamId}`),
};

export const adminDictApi = {
  typeList: <T = unknown>() => api.get<T>('/admin/dict/type/list'),
  dataList: <T = unknown>(dictType: string) => api.get<T>('/admin/dict/data/list', { params: { dictType } }),
  saveType: <T = unknown>(payload: Record<string, unknown>) => api.post<T>('/admin/dict/type/save', payload),
  saveData: <T = unknown>(payload: Record<string, unknown>) => api.post<T>('/admin/dict/data/save', payload),
  deleteType: <T = unknown>(id: string | number) => api.delete<T>(`/admin/dict/type/${id}`),
  deleteData: <T = unknown>(id: string | number) => api.delete<T>(`/admin/dict/data/${id}`),
};

export const adminAiModelApi = {
  list: <T = unknown>() => api.get<T>('/admin/ai-model/list'),
  detail: <T = unknown>(id: string | number) => api.get<T>(`/admin/ai-model/${id}`),
  conversations: <T = unknown>(id: string | number) => api.get<T>(`/admin/ai-model/${id}/conversations`),
  delete: <T = unknown>(id: string | number) => api.delete<T>(`/admin/ai-model/${id}`),
  save: <T = unknown>(payload: Record<string, unknown>) => api.post<T>('/admin/ai-model/save', payload),
};

export const adminAntiCheatApi = {
  summaries: <T = unknown>(competitionId: string | number, params?: Record<string, unknown>) => api.get<T>(`/admin/competition/${competitionId}/anti-cheat/summaries`, { params }),
  statistics: <T = unknown>(competitionId: string | number) => api.get<T>(`/admin/competition/${competitionId}/anti-cheat/statistics`),
  userDetail: <T = unknown>(competitionId: string | number, uid: string | number) => api.get<T>(`/admin/competition/${competitionId}/anti-cheat/users/${uid}`),
  review: <T = unknown>(competitionId: string | number, userId: string | number, payload: Record<string, unknown>) => api.put<T>(`/admin/competition/${competitionId}/anti-cheat/users/${userId}/review`, payload),
  export: <T = unknown>(competitionId: string | number, params?: Record<string, unknown>) => api.get<T>(`/admin/competition/${competitionId}/anti-cheat/export`, { params }),
};
