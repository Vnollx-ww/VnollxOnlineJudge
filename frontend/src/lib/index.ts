export { authApi } from './auth';
export { userApi } from './user';
export { notificationApi } from './notification';
export { aiApi } from './ai';
export { problemApi, tagApi } from './problem';
export { submissionApi } from './submission';
export { dictApi } from './dict';
export { readCachedDict, fetchDictWithCache } from './dictCache';
export type { DictDataItem } from './dictCache';
export { solutionApi } from './solution';
export { judgeApi } from './judge';
export { commentApi } from './comment';
export { practiceApi } from './practice';
export { friendApi } from './friend';
export { statsApi } from './stats';
export { competitionApi } from './competition';
export { antiCheatApi } from './antiCheat';
export {
  adminUserApi,
  adminRoleApi,
  adminSolveApi,
  adminStatisticsApi,
  adminProblemApi,
  adminPracticeApi,
  adminCompetitionApi,
  adminDictApi,
  adminAiModelApi,
  adminNotificationApi,
  adminAntiCheatApi,
} from './admin';
export { default as api } from './http';
export type { ApiResponse } from './http';
