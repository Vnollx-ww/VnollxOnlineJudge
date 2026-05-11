import { useState, useEffect } from 'react';
import { Button, Modal, Tag, Spin, Descriptions, Divider, Empty, DataTable, DataColumn } from '@/components';
import toast from 'react-hot-toast';
import { RefreshCw, Users, Shield, Key, Plus, Trash2, RotateCw } from 'lucide-react';
import { adminRoleApi, adminUserApi } from '@/lib';
import Select from '@/components/select';
import PermissionGuard from '@/components/permission-guard';
import { PermissionCode } from '@/constants/permissions';
import type { ApiResponse } from '@/types';

interface Role {
  id: number;
  code: string;
  name: string;
  description: string;
}

interface Permission {
  id: number;
  code: string;
  name: string;
  description: string;
  module: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  identity: string;
}

const AdminPermissions: React.FC = () => {
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
  const permissionsPageSize = 20;
  const [activeTab, setActiveTab] = useState<'roles' | 'users' | 'permissions'>('roles');
  const [viewRoleModalVisible, setViewRoleModalVisible] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'removeRole' | 'removePermission' | null>(null);
  const [confirmTargetId, setConfirmTargetId] = useState<number | null>(null);
  const [confirmTargetName, setConfirmTargetName] = useState<string>('');

  useEffect(() => {
    loadRoles();
    loadPermissions();
    loadUsers();
  }, []);

  const loadRoles = async () => {
    try {
      const data = await adminRoleApi.listRoles<Role[]>() as ApiResponse<Role[]>;
      if (data.code === 200) {
        setRoles(data.data || []);
      }
    } catch {
      toast.error('加载角色列表失败');
    }
  };

  const loadPermissions = async () => {
    try {
      const data = await adminRoleApi.listPermissions<Permission[]>() as ApiResponse<Permission[]>;
      if (data.code === 200) {
        setPermissions(data.data || []);
      }
    } catch {
      toast.error('加载权限列表失败');
    }
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const data = await adminUserApi.list<User[]>({ pageNum: 1, pageSize: 100 }) as ApiResponse<User[]>;
      if (data.code === 200) {
        setUsers(data.data || []);
      }
    } catch {
      toast.error('加载用户列表失败');
    } finally {
      setUsersLoading(false);
    }
  };

  const loadRolePermissions = async (roleId: number) => {
    setRolePermissionsLoading(true);
    try {
      const data = await adminRoleApi.rolePermissions<Permission[]>(roleId) as ApiResponse<Permission[]>;
      if (data.code === 200) {
        setRolePermissions(data.data || []);
      }
    } catch {
      toast.error('加载角色权限失败');
    } finally {
      setRolePermissionsLoading(false);
    }
  };

  const loadUserRolesAndPermissions = async (userId: number) => {
    try {
      const [rolesData, permsData] = await Promise.all([
        adminRoleApi.userRoles<Role[]>(userId) as Promise<ApiResponse<Role[]>>,
        adminRoleApi.userPermissions<string[]>(userId) as Promise<ApiResponse<string[]>>,
      ]);
      if (rolesData.code === 200) {
        setUserRoles(rolesData.data || []);
      }
      if (permsData.code === 200) {
        setUserPermissions(permsData.data || []);
      }
    } catch {
      toast.error('加载用户权限失败');
    }
  };

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    loadRolePermissions(role.id);
    setViewRoleModalVisible(true);
  };

  const handleUserSelect = (userId: number) => {
    const user = users.find((u: User) => u.id === userId);
    setSelectedUser(user || null);
    if (user) {
      loadUserRolesAndPermissions(userId);
    }
  };

  const handleAssignRoleToUser = async () => {
    if (!selectedUser || !selectedRoleToAssign) {
      toast.error('请选择用户和角色');
      return;
    }
    try {
      const data = await adminRoleApi.assignUserRole(selectedUser.id, selectedRoleToAssign) as ApiResponse;
      if (data.code === 200) {
        toast.success('分配角色成功');
        loadUserRolesAndPermissions(selectedUser.id);
        setAssignRoleModalVisible(false);
        setSelectedRoleToAssign(null);
      } else {
        toast.error((data as any).msg || '分配角色失败');
      }
    } catch {
      toast.error('分配角色失败');
    }
  };

  const handleRemoveRoleFromUser = async (roleId: number) => {
    if (!selectedUser) return;
    try {
      const data = await adminRoleApi.removeUserRole(selectedUser.id, roleId) as ApiResponse;
      if (data.code === 200) {
        toast.success('移除角色成功');
        loadUserRolesAndPermissions(selectedUser.id);
      } else {
        toast.error((data as any).msg || '移除角色失败');
      }
    } catch {
      toast.error('移除角色失败');
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

      if (successCount === selectedPermissionsToAssign.length) {
        toast.success(`成功分配 ${successCount} 个权限`);
      } else if (successCount > 0) {
        toast.error(`部分分配成功：${successCount}/${selectedPermissionsToAssign.length}`);
      } else {
        toast.error('分配权限失败');
      }

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
      const data = await adminRoleApi.removePermission(selectedRole.id, permissionId) as ApiResponse;
      if (data.code === 200) {
        toast.success('移除权限成功');
        loadRolePermissions(selectedRole.id);
      } else {
        toast.error((data as any).msg || '移除权限失败');
      }
    } catch {
      toast.error('移除权限失败');
    }
  };

  const openConfirmModal = (action: 'removeRole' | 'removePermission', id: number, name: string) => {
    setConfirmAction(action);
    setConfirmTargetId(id);
    setConfirmTargetName(name);
    setConfirmModalVisible(true);
  };

  const handleConfirm = () => {
    if (confirmAction === 'removeRole' && confirmTargetId !== null) {
      handleRemoveRoleFromUser(confirmTargetId);
    } else if (confirmAction === 'removePermission' && confirmTargetId !== null) {
      handleRemovePermissionFromRole(confirmTargetId);
    }
    setConfirmModalVisible(false);
  };

  const handleRefreshCache = async (userId: number) => {
    try {
      const data = await adminRoleApi.refreshUserCache(userId) as ApiResponse;
      if (data.code === 200) {
        toast.success('刷新缓存成功');
      } else {
        toast.error((data as any).msg || '刷新缓存失败');
      }
    } catch {
      toast.error('刷新缓存失败');
    }
  };

  const handleClearAllCache = async () => {
    try {
      const data = await adminRoleApi.clearCache() as ApiResponse;
      if (data.code === 200) {
        toast.success('清除所有缓存成功');
      } else {
        toast.error((data as any).msg || '清除缓存失败');
      }
    } catch {
      toast.error('清除缓存失败');
    }
  };

  const getRoleTag = (code: string) => {
    const colorMap: Record<string, string> = {
      SUPER_ADMIN: 'red',
      ADMIN: 'orange',
      TEACHER: 'green',
      USER: 'blue',
      GUEST: 'default',
    };
    return <Tag color={colorMap[code] || 'default'}>{code}</Tag>;
  };

  const pagedPermissions = permissions.slice(
    (permissionsPage - 1) * permissionsPageSize,
    permissionsPage * permissionsPageSize,
  );

  const tabItems = [
    {
      key: 'roles',
      label: (
        <span className="flex items-center gap-2">
          <Shield className="w-4 h-4" />
          角色管理
        </span>
      ),
      children: (
        <div className="space-y-6">
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--gemini-surface-variant)' }}>
            <h3 className="text-base font-medium mb-4" style={{ color: 'var(--gemini-text-primary)' }}>角色列表</h3>
            <DataTable<Role> rows={roles} rowKey="id" pagination={false} size="small">
              <DataColumn<Role> header="角色码" cell={(role) => getRoleTag(role.code)} />
              <DataColumn<Role> header="角色名称" cell={(role) => role.name} />
              <DataColumn<Role> header="描述" cell={(role) => role.description} />
              <DataColumn<Role>
                header="操作"
                cell={(role) => (
                  <button type="button" className="rounded-lg p-1.5 text-gray-400 transition-all hover:bg-blue-50 hover:text-blue-600" onClick={() => handleRoleSelect(role)} title="查看权限">
                    <Shield size={16} />
                  </button>
                )}
              />
            </DataTable>
          </div>

        </div>
      ),
    },
    {
      key: 'users',
      label: (
        <span className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          用户权限
        </span>
      ),
      children: (
        <div className="space-y-6">
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--gemini-surface-variant)' }}>
            <h3 className="text-base font-medium mb-4" style={{ color: 'var(--gemini-text-primary)' }}>选择用户</h3>
            <Select
              showSearch
              placeholder="选择用户查看权限"
              className="w-80"
              loading={usersLoading}
              onChange={handleUserSelect}
              optionFilterProp="children"
              filterOption={(input: string, option: unknown) => {
                const opt = option as { children?: unknown };
                return String(opt?.children || '').toLowerCase().includes(input.toLowerCase());
              }}
              options={users.map((user: User) => ({
                value: user.id,
                label: `${user.name} (${user.email})`,
              }))}
            />
          </div>

          {selectedUser && (
            <div className="p-4 rounded-lg border" style={{ borderColor: 'var(--gemini-border-light)' }}>
              <Descriptions title="用户信息" bordered size="small" column={3}>
                <Descriptions.Item label="用户名">{selectedUser.name}</Descriptions.Item>
                <Descriptions.Item label="邮箱">{selectedUser.email}</Descriptions.Item>
                <Descriptions.Item label="原身份">
                  <Tag color={selectedUser.identity === 'SUPER_ADMIN' ? 'red' : selectedUser.identity === 'ADMIN' ? 'orange' : selectedUser.identity === 'TEACHER' ? 'green' : 'blue'}>
                    {selectedUser.identity}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>

              <Divider />

              <div className="flex items-center justify-between mb-4">
                <h4 className="text-base font-medium" style={{ color: 'var(--gemini-text-primary)' }}>用户角色</h4>
                <div className="flex gap-2">
                  <PermissionGuard permission={PermissionCode.PERMISSION_ASSIGN}>
                    <Button
                      type="primary"
                      icon={<Plus className="w-4 h-4" />}
                      onClick={() => setAssignRoleModalVisible(true)}
                      style={{ backgroundColor: 'var(--gemini-accent)', color: 'var(--gemini-accent-text)', border: 'none' }}
                    >
                      分配角色
                    </Button>
                  </PermissionGuard>
                  <Button icon={<RotateCw className="w-4 h-4" />} onClick={() => handleRefreshCache(selectedUser.id)}>
                    刷新缓存
                  </Button>
                </div>
              </div>

              <div className="p-3 rounded-lg min-h-[60px]" style={{ backgroundColor: 'var(--gemini-surface-variant)' }}>
                {userRoles.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {userRoles.map((role: Role) => (
                      <Tag
                        key={role.id}
                        color={role.code === 'SUPER_ADMIN' ? 'red' : role.code === 'ADMIN' ? 'orange' : role.code === 'TEACHER' ? 'green' : 'blue'}
                        closable
                        onClose={() => openConfirmModal('removeRole', role.id, role.name)}
                      >
                        {role.name}
                      </Tag>
                    ))}
                  </div>
                ) : (
                  <Empty description="暂无角色" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </div>

              <Divider />

              <h4 className="text-base font-medium mb-4" style={{ color: 'var(--gemini-text-primary)' }}>用户权限（来自角色）</h4>
              <div className="p-3 rounded-lg min-h-[100px] max-h-[300px] overflow-y-auto" style={{ backgroundColor: 'rgba(52, 168, 83, 0.08)' }}>
                {userPermissions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {userPermissions.map((perm: string) => (
                      <Tag key={perm} color="green">
                        {perm}
                      </Tag>
                    ))}
                  </div>
                ) : (
                  <Empty description="暂无权限" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'permissions',
      label: (
        <span className="flex items-center gap-2">
          <Key className="w-4 h-4" />
          所有权限
        </span>
      ),
      children: (
        <DataTable<Permission>
          rows={pagedPermissions}
          rowKey="id"
          pagination={{
            current: permissionsPage,
            pageSize: permissionsPageSize,
            total: permissions.length,
            onChange: (page) => setPermissionsPage(page),
          }}
        >
          <DataColumn<Permission> header="权限码" cell={(permission) => <Tag color="blue">{permission.code}</Tag>} />
          <DataColumn<Permission> header="权限名称" cell={(permission) => permission.name} />
          <DataColumn<Permission> header="模块" cell={(permission) => <Tag>{permission.module}</Tag>} />
          <DataColumn<Permission> header="描述" cell={(permission) => permission.description} />
        </DataTable>
      ),
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden text-gray-900">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-2 border-b border-gray-50 bg-gray-50/50 p-4">
          <div className="flex gap-2 rounded-full bg-slate-100 p-1">
            {[
              { key: 'roles' as const, label: <span className="flex items-center gap-2"><Shield className="w-4 h-4" />角色管理</span> },
              { key: 'users' as const, label: <span className="flex items-center gap-2"><Users className="w-4 h-4" />用户权限</span> },
              { key: 'permissions' as const, label: <span className="flex items-center gap-2"><Key className="w-4 h-4" />所有权限</span> },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 ${
                  activeTab === tab.key
                    ? 'bg-white text-blue-700 shadow-sm shadow-slate-200'
                    : 'text-slate-500 hover:bg-white/60 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button
              icon={<RefreshCw className="w-4 h-4" />}
              onClick={() => {
                loadRoles();
                loadPermissions();
              }}
            >
              刷新
            </Button>
            <Button danger icon={<RotateCw className="w-4 h-4" />} onClick={handleClearAllCache}>
              清除所有缓存
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {activeTab === 'roles' && tabItems[0].children}
          {activeTab === 'users' && tabItems[1].children}
          {activeTab === 'permissions' && tabItems[2].children}
        </div>
      </div>

      {/* 分配角色弹窗 */}
      <Modal
        title="分配角色"
        open={assignRoleModalVisible}
        centered
        onCancel={() => {
          setAssignRoleModalVisible(false);
          setSelectedRoleToAssign(null);
        }}
        footer={null}
      >
        <div className="mb-4">
          <span>
            为用户 <strong>{selectedUser?.name}</strong> 分配角色：
          </span>
        </div>
        <Select
          placeholder="选择角色"
          className="w-full"
          value={selectedRoleToAssign}
          onChange={setSelectedRoleToAssign}
          options={roles
            .filter((r: Role) => !userRoles.find((ur: Role) => ur.id === r.id))
            .map((role: Role) => ({
              value: role.id,
              label: `${role.name} (${role.code})`,
            }))}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => {
            setAssignRoleModalVisible(false);
            setSelectedRoleToAssign(null);
          }}>
            取消
          </Button>
          <Button type="primary" onClick={handleAssignRoleToUser}>
            分配
          </Button>
        </div>
      </Modal>

      {/* 查看角色权限弹窗 */}
      <Modal
        title={
          <span className="flex items-center gap-2">
            {selectedRole ? getRoleTag(selectedRole.code) : null}
            {selectedRole?.name} 的权限
          </span>
        }
        open={viewRoleModalVisible}
        centered
        width={900}
        onCancel={() => {
          setViewRoleModalVisible(false);
          setSelectedRole(null);
        }}
        footer={null}
      >
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-base font-medium" style={{ color: 'var(--gemini-text-primary)' }}>
            权限列表
          </h4>
          <PermissionGuard permission={PermissionCode.PERMISSION_ASSIGN}>
            <Button
              type="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setAssignPermissionModalVisible(true)}
              style={{ backgroundColor: 'var(--gemini-accent)', color: 'var(--gemini-accent-text)', border: 'none' }}
            >
              添加权限
            </Button>
          </PermissionGuard>
        </div>
        <Spin spinning={rolePermissionsLoading}>
          <div className="max-h-80 overflow-auto">
            <DataTable<Permission> rows={rolePermissions} rowKey="id" pagination={false} size="small">
              <DataColumn<Permission> header="权限码" cell={(permission) => <Tag color="green">{permission.code}</Tag>} />
              <DataColumn<Permission> header="权限名称" cell={(permission) => permission.name} />
              <DataColumn<Permission> header="模块" cell={(permission) => permission.module} />
              <DataColumn<Permission>
                header="操作"
                cell={(permission) => (
                  <PermissionGuard permission={PermissionCode.PERMISSION_ASSIGN}>
                    <button type="button" className="rounded-lg p-1.5 text-gray-400 transition-all hover:bg-red-50 hover:text-red-600" onClick={() => openConfirmModal('removePermission', permission.id, permission.name)} title="移除">
                      <Trash2 size={16} />
                    </button>
                  </PermissionGuard>
                )}
              />
            </DataTable>
          </div>
        </Spin>
      </Modal>

      {/* 确认删除弹窗 */}
      <Modal
        title="确认删除"
        open={confirmModalVisible}
        centered
        onCancel={() => setConfirmModalVisible(false)}
        footer={null}
      >
        <div className="py-2 text-sm text-slate-700">
          确定要{confirmAction === 'removeRole' ? '移除角色' : '移除权限'} <strong>{confirmTargetName}</strong> 吗？
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => setConfirmModalVisible(false)}>取消</Button>
          <Button type="primary" danger onClick={handleConfirm}>确定</Button>
        </div>
      </Modal>

      {/* 分配权限弹窗 */}
      <Modal
        title="分配权限"
        open={assignPermissionModalVisible}
        centered
        onCancel={() => {
          setAssignPermissionModalVisible(false);
          setSelectedPermissionsToAssign([]);
        }}
        footer={null}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <span>
            为角色 <strong>{selectedRole?.name}</strong> 分配权限：
          </span>
          <div className="flex shrink-0 gap-2">
            <Button type="link" size="small" onClick={() => setSelectedPermissionsToAssign(permissions.filter((p: Permission) => !rolePermissions.find((rp: Permission) => rp.id === p.id)).map((p: Permission) => p.id))}>
              全选
            </Button>
            <Button type="link" size="small" onClick={() => setSelectedPermissionsToAssign([])}>
              清空
            </Button>
          </div>
        </div>
        <Select
          mode="multiple"
          showSearch
          placeholder="选择权限（可多选）"
          className="w-full"
          value={selectedPermissionsToAssign}
          onChange={setSelectedPermissionsToAssign}
          optionFilterProp="children"
          filterOption={(input: string, option: unknown) => {
            const opt = option as { children?: unknown };
            return String(opt?.children || '').toLowerCase().includes(input.toLowerCase());
          }}
          options={permissions
            .filter((p: Permission) => !rolePermissions.find((rp: Permission) => rp.id === p.id))
            .map((perm: Permission) => ({
              value: perm.id,
              label: `${perm.code} - ${perm.name}`,
            }))}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => {
            setAssignPermissionModalVisible(false);
            setSelectedPermissionsToAssign([]);
          }}>
            取消
          </Button>
          <Button type="primary" onClick={handleAssignPermissionToRole}>
            分配
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminPermissions;

