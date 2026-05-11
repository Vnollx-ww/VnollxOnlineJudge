import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminRoleApi } from '@/lib';
import type { ApiResponse } from '@/types';

export interface Role {
  id: number;
  code: string;
  name: string;
  description: string;
  status: number;
}

export interface Permission {
  id: number;
  code: string;
  name: string;
  description: string;
  module: string;
}

export interface RoleFormValues {
  code: string;
  name: string;
  description: string;
}

export interface PermissionFormValues {
  code: string;
  name: string;
  module: string;
  description: string;
}

export const defaultRoleForm: RoleFormValues = { code: '', name: '', description: '' };
export const defaultPermissionForm: PermissionFormValues = { code: '', name: '', module: '', description: '' };

export const useAdminRoles = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);
  const [rolePermissionsLoading, setRolePermissionsLoading] = useState(false);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [assignPermissionModalVisible, setAssignPermissionModalVisible] = useState(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [viewRoleModalVisible, setViewRoleModalVisible] = useState(false);
  const [deleteRoleModalVisible, setDeleteRoleModalVisible] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [removePermissionModalVisible, setRemovePermissionModalVisible] = useState(false);
  const [permissionToRemove, setPermissionToRemove] = useState<Permission | null>(null);
  const [selectedPermissionsToAssign, setSelectedPermissionsToAssign] = useState<number[]>([]);
  const [roleForm, setRoleForm] = useState<RoleFormValues>(defaultRoleForm);
  const [permissionFormValues, setPermissionFormValues] = useState<PermissionFormValues>(defaultPermissionForm);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const data = (await adminRoleApi.listRoles<Role[]>()) as ApiResponse<Role[]>;
      if (data.code === 200) setRoles(data.data || []);
    } catch {
      toast.error('加载角色列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async () => {
    try {
      const data = (await adminRoleApi.listPermissions<Permission[]>()) as ApiResponse<Permission[]>;
      if (data.code === 200) setPermissions(data.data || []);
    } catch {
      toast.error('加载权限列表失败');
    }
  };

  const loadRolePermissions = async (roleId: number) => {
    setRolePermissionsLoading(true);
    try {
      const data = (await adminRoleApi.rolePermissions<Permission[]>(roleId)) as ApiResponse<Permission[]>;
      if (data.code === 200) setRolePermissions(data.data || []);
    } catch {
      toast.error('加载角色权限失败');
    } finally {
      setRolePermissionsLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
    loadPermissions();
  }, []);

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    loadRolePermissions(role.id);
    setViewRoleModalVisible(true);
  };

  const handleAddRole = () => {
    setEditingRole(null);
    setRoleForm(defaultRoleForm);
    setRoleModalVisible(true);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setRoleForm({ code: role.code, name: role.name, description: role.description || '' });
    setRoleModalVisible(true);
  };

  const updateRoleForm = <K extends keyof RoleFormValues>(key: K, value: RoleFormValues[K]) => {
    setRoleForm((current) => ({ ...current, [key]: value }));
  };

  const updatePermissionForm = <K extends keyof PermissionFormValues>(key: K, value: PermissionFormValues[K]) => {
    setPermissionFormValues((current) => ({ ...current, [key]: value }));
  };

  const handleRoleSubmit = async (values: RoleFormValues) => {
    try {
      if (editingRole) {
        const data = (await adminRoleApi.updateRole(editingRole.id, { ...values })) as ApiResponse;
        if (data.code === 200) {
          toast.success('更新角色成功');
          setRoleModalVisible(false);
          loadRoles();
        } else {
          toast.error((data as any).msg || '更新失败');
        }
      } else {
        const data = (await adminRoleApi.createRole({ ...values })) as ApiResponse;
        if (data.code === 200) {
          toast.success('创建角色成功');
          setRoleModalVisible(false);
          loadRoles();
        } else {
          toast.error((data as any).msg || '创建失败');
        }
      }
    } catch {
      toast.error('操作失败');
    }
  };

  const handleDeleteRole = async (roleId: number) => {
    try {
      const data = (await adminRoleApi.deleteRole(roleId)) as ApiResponse;
      if (data.code === 200) {
        toast.success('删除角色成功');
        if (selectedRole?.id === roleId) {
          setSelectedRole(null);
          setRolePermissions([]);
        }
        loadRoles();
      } else {
        toast.error((data as any).msg || '删除失败');
      }
    } catch {
      toast.error('删除失败');
    }
  };

  const handleAssignPermissionToRole = async () => {
    if (!selectedRole || selectedPermissionsToAssign.length === 0) {
      toast.error('请选择角色和权限');
      return;
    }
    try {
      const results = await Promise.allSettled(
        selectedPermissionsToAssign.map((permissionId) =>
          adminRoleApi.assignPermission(selectedRole.id, permissionId) as Promise<ApiResponse>
        )
      );
      const successCount = results.filter(
        (result) => result.status === 'fulfilled' && result.value.code === 200
      ).length;

      if (successCount === selectedPermissionsToAssign.length) toast.success(`成功分配 ${successCount} 个权限`);
      else if (successCount > 0) toast.error(`部分分配成功：${successCount}/${selectedPermissionsToAssign.length}`);
      else toast.error('分配权限失败');

      await loadRolePermissions(selectedRole.id);
      if (successCount > 0) {
        setAssignPermissionModalVisible(false);
        setSelectedPermissionsToAssign([]);
      }
    } catch {
      toast.error('分配权限失败');
    }
  };

  const handleRemovePermissionFromRole = async (permissionId: number) => {
    if (!selectedRole) return;
    try {
      const data = (await adminRoleApi.removePermission(selectedRole.id, permissionId)) as ApiResponse;
      if (data.code === 200) {
        toast.success('移除权限成功');
        loadRolePermissions(selectedRole.id);
      } else {
        toast.error((data as any).msg || '移除失败');
      }
    } catch {
      toast.error('移除权限失败');
    }
  };

  const handleCreatePermission = async (values: PermissionFormValues) => {
    try {
      const data = (await adminRoleApi.createPermission({ ...values })) as ApiResponse;
      if (data.code === 200) {
        toast.success('创建权限成功');
        setPermissionModalVisible(false);
        setPermissionFormValues(defaultPermissionForm);
        loadPermissions();
      } else {
        toast.error((data as any).msg || '创建失败');
      }
    } catch {
      toast.error('创建权限失败');
    }
  };

  const availablePermissions = permissions.filter((p) => !rolePermissions.find((rp) => rp.id === p.id));
  const groupedPermissions = availablePermissions.reduce((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {} as Record<string, Permission[]>);

  return {
    roles,
    loading,
    selectedRole,
    setSelectedRole,
    rolePermissions,
    rolePermissionsLoading,
    roleModalVisible,
    setRoleModalVisible,
    editingRole,
    assignPermissionModalVisible,
    setAssignPermissionModalVisible,
    permissionModalVisible,
    setPermissionModalVisible,
    viewRoleModalVisible,
    setViewRoleModalVisible,
    deleteRoleModalVisible,
    setDeleteRoleModalVisible,
    roleToDelete,
    setRoleToDelete,
    removePermissionModalVisible,
    setRemovePermissionModalVisible,
    permissionToRemove,
    setPermissionToRemove,
    selectedPermissionsToAssign,
    setSelectedPermissionsToAssign,
    roleForm,
    permissionFormValues,
    setPermissionFormValues,
    loadRoles,
    handleRoleSelect,
    handleAddRole,
    handleEditRole,
    updateRoleForm,
    updatePermissionForm,
    handleRoleSubmit,
    handleDeleteRole,
    handleAssignPermissionToRole,
    handleRemovePermissionFromRole,
    handleCreatePermission,
    availablePermissions,
    groupedPermissions,
  };
};
