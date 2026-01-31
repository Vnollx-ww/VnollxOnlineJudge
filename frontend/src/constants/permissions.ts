/**
 * 权限码常量定义
 * 与后端 PermissionCode.java 保持同步
 */
export const PermissionCode = {
  // 用户管理权限
  USER_VIEW: 'user:view',
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_MANAGE: 'user:manage',

  // 题目管理权限
  PROBLEM_VIEW: 'problem:view',
  PROBLEM_CREATE: 'problem:create',
  PROBLEM_UPDATE: 'problem:update',
  PROBLEM_DELETE: 'problem:delete',
  PROBLEM_MANAGE: 'problem:manage',

  // 比赛管理权限
  COMPETITION_VIEW: 'competition:view',
  COMPETITION_CREATE: 'competition:create',
  COMPETITION_UPDATE: 'competition:update',
  COMPETITION_DELETE: 'competition:delete',
  COMPETITION_MANAGE: 'competition:manage',

  // 练习管理权限
  PRACTICE_VIEW: 'practice:view',
  PRACTICE_CREATE: 'practice:create',
  PRACTICE_UPDATE: 'practice:update',
  PRACTICE_DELETE: 'practice:delete',
  PRACTICE_MANAGE: 'practice:manage',

  // 提交记录权限
  SUBMISSION_VIEW: 'submission:view',
  SUBMISSION_VIEW_ALL: 'submission:view_all',
  SUBMISSION_REJUDGE: 'submission:rejudge',
  SUBMISSION_SUBMIT: 'submission:submit',

  // 题解管理权限
  SOLVE_VIEW: 'solve:view',
  SOLVE_CREATE: 'solve:create',
  SOLVE_UPDATE: 'solve:update',
  SOLVE_DELETE: 'solve:delete',
  SOLVE_AUDIT: 'solve:audit',

  // 标签管理权限
  TAG_VIEW: 'tag:view',
  TAG_CREATE: 'tag:create',
  TAG_UPDATE: 'tag:update',
  TAG_DELETE: 'tag:delete',

  // 通知管理权限
  NOTIFICATION_VIEW: 'notification:view',
  NOTIFICATION_CREATE: 'notification:create',
  NOTIFICATION_DELETE: 'notification:delete',

  // 社交功能权限
  FRIEND_USE: 'friend:use',
  COMMENT_CREATE: 'comment:create',
  COMMENT_DELETE: 'comment:delete',

  // AI配置权限
  AI_CONFIG_VIEW: 'ai:config_view',
  AI_CONFIG_UPDATE: 'ai:config_update',
  AI_CHAT: 'ai:chat',

  // 系统管理权限
  SYSTEM_SETTINGS: 'system:settings',
  SYSTEM_MONITOR: 'system:monitor',
  SYSTEM_LOG: 'system:log',

  // 角色权限管理
  ROLE_VIEW: 'role:view',
  ROLE_CREATE: 'role:create',
  ROLE_UPDATE: 'role:update',
  ROLE_DELETE: 'role:delete',
  PERMISSION_ASSIGN: 'permission:assign',
} as const;

export type PermissionCodeType = typeof PermissionCode[keyof typeof PermissionCode];
