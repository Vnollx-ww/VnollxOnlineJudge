import type { ReactNode } from 'react';
import { usePermission } from '@/contexts/PermissionContext';

interface PermissionGuardProps {
  /** 需要的权限码，满足其一即可显示 */
  permission?: string;
  /** 需要的权限码数组，满足其一即可显示 */
  permissions?: string[];
  /** 是否需要满足所有权限 */
  requireAll?: boolean;
  /** 没有权限时显示的内容，默认不显示任何内容 */
  fallback?: ReactNode;
  /** 子元素 */
  children: ReactNode;
}

/**
 * 权限守卫组件
 * 用于根据用户权限控制组件的显示
 * 
 * @example
 * // 单个权限
 * <PermissionGuard permission="problem:create">
 *   <Button>创建题目</Button>
 * </PermissionGuard>
 * 
 * @example
 * // 多个权限（满足其一）
 * <PermissionGuard permissions={["problem:edit", "problem:delete"]}>
 *   <Button>编辑</Button>
 * </PermissionGuard>
 * 
 * @example
 * // 多个权限（全部满足）
 * <PermissionGuard permissions={["problem:edit", "problem:delete"]} requireAll>
 *   <Button>高级操作</Button>
 * </PermissionGuard>
 */
const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  permissions = [],
  requireAll = false,
  fallback = null,
  children,
}) => {
  const { hasAnyPermission, hasAllPermissions } = usePermission();

  // 收集所有需要检查的权限
  const allPermissions = permission ? [permission, ...permissions] : permissions;

  // 如果没有指定任何权限，直接显示子元素
  if (allPermissions.length === 0) {
    return <>{children}</>;
  }

  // 检查权限
  const hasAccess = requireAll
    ? hasAllPermissions(...allPermissions)
    : hasAnyPermission(...allPermissions);

  if (hasAccess) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

export default PermissionGuard;
