import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminRoleApi, adminUserApi } from '@/lib';
import type { ApiResponse } from '@/types';

export interface Role { id: number; code: string; name: string; description: string; }
export interface Permission { id: number; code: string; name: string; description: string; module: string; }
export interface User { id: number; name: string; email: string; identity: string; }

export type AdminPermissionsConfirmAction = 'removeRole' | 'removePermission';
export type AdminPermissionsTab = 'roles' | 'users' | 'permissions';

export const PERMISSIONS_PAGE_SIZE = 20;

export const useAdminPermissions = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);
  const [rolePermissionsLoading, setRolePermissionsLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userRoles, setUserRoles] = useState<Role[]>([]);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [assignRoleModalVisible, setAssignRoleModalVisible] = useState(false);
  const [assignPermissionModalVisible, setAssignPermissionModalVisible] = useState(false);
  const [selectedRoleToAssign, setSelectedRoleToAssign] = useState<number | null>(null);
  const [selectedPermissionsToAssign, setSelectedPermissionsToAssign] = useState<number[]>([]);
  const [permissionsPage, setPermissionsPage] = useState(1);
  const [activeTab, setActiveTab] = useState<AdminPermissionsTab>('roles');
  const [viewRoleModalVisible, setViewRoleModalVisible] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmAction, setConfirmAction] = useState<AdminPermissionsConfirmAction | null>(null);
  const [confirmTargetId, setConfirmTargetId] = useState<number | null>(null);
  const [confirmTargetName, setConfirmTargetName] = useState<string>('');

  const loadRoles = async () => {
    try {
      const data = (await adminRoleApi.listRoles<Role[]>()) as ApiResponse<Role[]>;
      if (data.code === 200) setRoles(data.data || []);
    } catch { toast.error('加载角色列表失败'); }
  };

  const loadPermissions = async () => {
    try {
      const data = (await adminRoleApi.listPermissions<Permission[]>()) as ApiResponse<Permission[]>;
      if (data.code === 200) setPermissions(data.data || []);
    } catch { toast.error('加载权限列表失败'); }
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const data = (await adminUserApi.list<User[]>({ pageNum: 1, pageSize: 100 })) as ApiResponse<User[]>;
      if (data.code === 200) setUsers(data.data || []);
    } catch { toast.error('加载用户列表失败'); }
    finally { setUsersLoading(false); }
  };

  const loadRolePermissions = async (roleId: number) => {
    setRolePermissionsLoading(true);
    try {
      const data = (await adminRoleApi.rolePermissions<Permission[]>(roleId)) as ApiResponse<Permission[]>;
      if (data.code === 200) setRolePermissions(data.data || []);
    } catch { toast.error('加载角色权限失败'); }
    finally { setRolePermissionsLoading(false); }
  };

  const loadUserRolesAndPermissions = async (userId: number) => {
    try {
      const [rolesData, permsData] = await Promise.all([
        adminRoleApi.userRoles<Role[]>(userId) as Promise<ApiResponse<Role[]>>,
        adminRoleApi.userPermissions<string[]>(userId) as Promise<ApiResponse<string[]>>,
      ]);
      if (rolesData.code === 200) setUserRoles(rolesData.data || []);
      if (permsData.code === 200) setUserPermissions(permsData.data || []);
    } catch { toast.error('加载用户权限失败'); }
  };

  useEffect(() => {
    loadRoles();
    loadPermissions();
    loadUsers();
  }, []);

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    loadRolePermissions(role.id);
    setViewRoleModalVisible(true);
  };

  const handleUserSelect = (userId: number) => {
    const user = users.find((u) => u.id === userId);
    setSelectedUser(user || null);
    if (user) loadUserRolesAndPermissions(userId);
  };

  const handleAssignRoleToUser = async () => {
    if (!selectedUser || !selectedRoleToAssign) { toast.error('请选择用户和角色'); return; }
    try {
      const data = (await adminRoleApi.assignUserRole(selectedUser.id, selectedRoleToAssign)) as ApiResponse;
      if (data.code === 200) {
        toast.success('分配角色成功');
        loadUserRolesAndPermissions(selectedUser.id);
        setAssignRoleModalVisible(false);
        setSelectedRoleToAssign(null);
      } else { toast.error((data as any).msg || '分配角色失败'); }
    } catch { toast.error('分配角色失败'); }
  };

  const handleRemoveRoleFromUser = async (roleId: number) => {
    if (!selectedUser) return;
    try {
      const data = (await adminRoleApi.removeUserRole(selectedUser.id, roleId)) as ApiResponse;
      if (data.code === 200) {
        toast.success('移除角色成功');
        loadUserRolesAndPermissions(selectedUser.id);
      } else { toast.error((data as any).msg || '移除角色失败'); }
    } catch { toast.error('移除角色失败'); }
  };

  const handleAssignPermissionToRole = async () => {
    if (!selectedRole || selectedPermissionsToAssign.length === 0) { toast.error('请选择角色和权限'); return; }
    try {
      const results = await Promise.allSettled(
        selectedPermissionsToAssign.map((permissionId) =>
          adminRoleApi.assignPermission(selectedRole.id, permissionId) as Promise<ApiResponse>
        )
      );
      const successCount = results.filter((r) => r.status === 'fulfilled' && r.value.code === 200).length;
      if (successCount === selectedPermissionsToAssign.length) toast.success(`成功分配 ${successCount} 个权限`);
      else if (successCount > 0) toast.error(`部分分配成功：${successCount}/${selectedPermissionsToAssign.length}`);
      else toast.error('分配权限失败');
      await loadRolePermissions(selectedRole.id);
      if (successCount > 0) {
        setAssignPermissionModalVisible(false);
        setSelectedPermissionsToAssign([]);
      }
    } catch { toast.error('分配权限失败'); }
  };

  const handleRemovePermissionFromRole = async (permissionId: number) => {
    if (!selectedRole) return;
    try {
      const data = (await adminRoleApi.removePermission(selectedRole.id, permissionId)) as ApiResponse;
      if (data.code === 200) {
        toast.success('移除权限成功');
        loadRolePermissions(selectedRole.id);
      } else { toast.error((data as any).msg || '移除权限失败'); }
    } catch { toast.error('移除权限失败'); }
  };

  const openConfirmModal = (action: AdminPermissionsConfirmAction, id: number, name: string) => {
    setConfirmAction(action);
    setConfirmTargetId(id);
    setConfirmTargetName(name);
    setConfirmModalVisible(true);
  };

  const handleConfirm = () => {
    if (confirmAction === 'removeRole' && confirmTargetId !== null) handleRemoveRoleFromUser(confirmTargetId);
    else if (confirmAction === 'removePermission' && confirmTargetId !== null) handleRemovePermissionFromRole(confirmTargetId);
    setConfirmModalVisible(false);
  };

  const handleRefreshCache = async (userId: number) => {
    try {
      const data = (await adminRoleApi.refreshUserCache(userId)) as ApiResponse;
      if (data.code === 200) toast.success('刷新缓存成功');
      else toast.error((data as any).msg || '刷新缓存失败');
    } catch { toast.error('刷新缓存失败'); }
  };

  const handleClearAllCache = async () => {
    try {
      const data = (await adminRoleApi.clearCache()) as ApiResponse;
      if (data.code === 200) toast.success('清除所有缓存成功');
      else toast.error((data as any).msg || '清除缓存失败');
    } catch { toast.error('清除缓存失败'); }
  };

  const pagedPermissions = permissions.slice(
    (permissionsPage - 1) * PERMISSIONS_PAGE_SIZE,
    permissionsPage * PERMISSIONS_PAGE_SIZE,
  );

  return {
    roles,
    permissions,
    selectedRole,
    setSelectedRole,
    rolePermissions,
    rolePermissionsLoading,
    users,
    usersLoading,
    selectedUser,
    userRoles,
    userPermissions,
    assignRoleModalVisible,
    setAssignRoleModalVisible,
    assignPermissionModalVisible,
    setAssignPermissionModalVisible,
    selectedRoleToAssign,
    setSelectedRoleToAssign,
    selectedPermissionsToAssign,
    setSelectedPermissionsToAssign,
    permissionsPage,
    setPermissionsPage,
    activeTab,
    setActiveTab,
    viewRoleModalVisible,
    setViewRoleModalVisible,
    confirmModalVisible,
    setConfirmModalVisible,
    confirmAction,
    confirmTargetName,
    loadRoles,
    loadPermissions,
    handleRoleSelect,
    handleUserSelect,
    handleAssignRoleToUser,
    handleAssignPermissionToRole,
    openConfirmModal,
    handleConfirm,
    handleRefreshCache,
    handleClearAllCache,
    pagedPermissions,
  };
};
