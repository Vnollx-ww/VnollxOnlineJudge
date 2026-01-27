import { useState, useEffect } from 'react';
import { Table, Button, Modal, Select, Tag, Tabs, Spin, Descriptions, Divider, Empty } from 'antd';
import toast from 'react-hot-toast';
import { RefreshCw, Users, Shield, Key, Plus, Trash2, RotateCw } from 'lucide-react';
import api from '@/utils/api';
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
  const [selectedPermissionToAssign, setSelectedPermissionToAssign] = useState<number | null>(null);

  useEffect(() => {
    loadRoles();
    loadPermissions();
    loadUsers();
  }, []);

  const loadRoles = async () => {
    try {
      const data = await api.get('/admin/permission/roles') as ApiResponse<Role[]>;
      if (data.code === 200) {
        setRoles(data.data || []);
      }
    } catch {
      toast.error('加载角色列表失败');
    }
  };

  const loadPermissions = async () => {
    try {
      const data = await api.get('/admin/permission/permissions') as ApiResponse<Permission[]>;
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
      const data = await api.get('/admin/user/list', {
        params: { pageNum: 1, pageSize: 100 },
      }) as ApiResponse<User[]>;
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
      const data = await api.get(`/admin/permission/role/${roleId}/permissions`) as ApiResponse<Permission[]>;
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
        api.get(`/admin/permission/user/${userId}/roles`) as Promise<ApiResponse<Role[]>>,
        api.get(`/admin/permission/user/${userId}/permissions`) as Promise<ApiResponse<string[]>>,
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
      const data = await api.post(`/admin/permission/user/${selectedUser.id}/role/${selectedRoleToAssign}`) as ApiResponse;
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
      const data = await api.delete(`/admin/permission/user/${selectedUser.id}/role/${roleId}`) as ApiResponse;
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
    if (!selectedRole || !selectedPermissionToAssign) {
      toast.error('请选择角色和权限');
      return;
    }
    try {
      const data = await api.post(`/admin/permission/role/${selectedRole.id}/permission/${selectedPermissionToAssign}`) as ApiResponse;
      if (data.code === 200) {
        toast.success('分配权限成功');
        loadRolePermissions(selectedRole.id);
        setAssignPermissionModalVisible(false);
        setSelectedPermissionToAssign(null);
      } else {
        toast.error((data as any).msg || '分配权限失败');
      }
    } catch {
      toast.error('分配权限失败');
    }
  };

  const handleRemovePermissionFromRole = async (permissionId: number) => {
    if (!selectedRole) return;
    try {
      const data = await api.delete(`/admin/permission/role/${selectedRole.id}/permission/${permissionId}`) as ApiResponse;
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

  const handleRefreshCache = async (userId: number) => {
    try {
      const data = await api.post(`/admin/permission/user/${userId}/refresh`) as ApiResponse;
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
      const data = await api.post('/admin/permission/cache/clear') as ApiResponse;
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
      USER: 'blue',
      GUEST: 'default',
    };
    return <Tag color={colorMap[code] || 'default'}>{code}</Tag>;
  };

  const roleColumns = [
    { title: '角色码', dataIndex: 'code', key: 'code', render: (code: string) => getRoleTag(code) },
    { title: '角色名称', dataIndex: 'name', key: 'name' },
    { title: '描述', dataIndex: 'description', key: 'description' },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Role) => (
        <Button type="link" onClick={() => handleRoleSelect(record)}>
          查看权限
        </Button>
      ),
    },
  ];

  const permissionColumns = [
    { title: '权限码', dataIndex: 'code', key: 'code', render: (code: string) => <Tag color="blue">{code}</Tag> },
    { title: '权限名称', dataIndex: 'name', key: 'name' },
    { title: '模块', dataIndex: 'module', key: 'module', render: (module: string) => <Tag>{module}</Tag> },
    { title: '描述', dataIndex: 'description', key: 'description' },
  ];

  const rolePermissionColumns = [
    { title: '权限码', dataIndex: 'code', key: 'code', render: (code: string) => <Tag color="green">{code}</Tag> },
    { title: '权限名称', dataIndex: 'name', key: 'name' },
    { title: '模块', dataIndex: 'module', key: 'module' },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Permission) => (
        <Button type="link" danger icon={<Trash2 className="w-4 h-4" />} onClick={() => handleRemovePermissionFromRole(record.id)}>
          移除
        </Button>
      ),
    },
  ];

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
            <Table columns={roleColumns} dataSource={roles} rowKey="id" pagination={false} size="small" />
          </div>

          {selectedRole && (
            <div className="p-4 rounded-lg border" style={{ borderColor: 'var(--gemini-accent)', backgroundColor: 'rgba(66, 133, 244, 0.05)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-medium" style={{ color: 'var(--gemini-text-primary)' }}>
                  {getRoleTag(selectedRole.code)} {selectedRole.name} 的权限
                </h3>
                <Button
                  type="primary"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => setAssignPermissionModalVisible(true)}
                  style={{ backgroundColor: 'var(--gemini-accent)', color: 'var(--gemini-accent-text)', border: 'none' }}
                >
                  添加权限
                </Button>
              </div>
              <Spin spinning={rolePermissionsLoading}>
                <Table columns={rolePermissionColumns} dataSource={rolePermissions} rowKey="id" pagination={false} size="small" />
              </Spin>
            </div>
          )}
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
            >
              {users.map((user: User) => (
                <Select.Option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </Select.Option>
              ))}
            </Select>
          </div>

          {selectedUser && (
            <div className="p-4 rounded-lg border" style={{ borderColor: 'var(--gemini-border-light)' }}>
              <Descriptions title="用户信息" bordered size="small" column={3}>
                <Descriptions.Item label="用户名">{selectedUser.name}</Descriptions.Item>
                <Descriptions.Item label="邮箱">{selectedUser.email}</Descriptions.Item>
                <Descriptions.Item label="原身份">
                  <Tag color={selectedUser.identity === 'SUPER_ADMIN' ? 'red' : selectedUser.identity === 'ADMIN' ? 'orange' : 'blue'}>
                    {selectedUser.identity}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>

              <Divider />

              <div className="flex items-center justify-between mb-4">
                <h4 className="text-base font-medium" style={{ color: 'var(--gemini-text-primary)' }}>用户角色</h4>
                <div className="flex gap-2">
                  <Button
                    type="primary"
                    icon={<Plus className="w-4 h-4" />}
                    onClick={() => setAssignRoleModalVisible(true)}
                    style={{ backgroundColor: 'var(--gemini-accent)', color: 'var(--gemini-accent-text)', border: 'none' }}
                  >
                    分配角色
                  </Button>
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
                        color={role.code === 'SUPER_ADMIN' ? 'red' : role.code === 'ADMIN' ? 'orange' : 'blue'}
                        closable
                        onClose={() => handleRemoveRoleFromUser(role.id)}
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
      children: <Table columns={permissionColumns} dataSource={permissions} rowKey="id" pagination={{ pageSize: 20 }} />,
    },
  ];

  return (
    <div className="gemini-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--gemini-text-primary)' }}>
            <Shield className="w-5 h-5" />
            权限管理
          </h2>
          <p className="text-sm" style={{ color: 'var(--gemini-text-tertiary)' }}>管理系统角色与权限</p>
        </div>
        <div className="flex gap-2">
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

      <Tabs items={tabItems} />

      {/* 分配角色弹窗 */}
      <Modal
        title="分配角色"
        open={assignRoleModalVisible}
        onOk={handleAssignRoleToUser}
        onCancel={() => {
          setAssignRoleModalVisible(false);
          setSelectedRoleToAssign(null);
        }}
      >
        <div className="mb-4">
          <span>
            为用户 <strong>{selectedUser?.name}</strong> 分配角色：
          </span>
        </div>
        <Select placeholder="选择角色" className="w-full" value={selectedRoleToAssign} onChange={setSelectedRoleToAssign}>
          {roles
            .filter((r: Role) => !userRoles.find((ur: Role) => ur.id === r.id))
            .map((role: Role) => (
              <Select.Option key={role.id} value={role.id}>
                {role.name} ({role.code})
              </Select.Option>
            ))}
        </Select>
      </Modal>

      {/* 分配权限弹窗 */}
      <Modal
        title="分配权限"
        open={assignPermissionModalVisible}
        onOk={handleAssignPermissionToRole}
        onCancel={() => {
          setAssignPermissionModalVisible(false);
          setSelectedPermissionToAssign(null);
        }}
      >
        <div className="mb-4">
          <span>
            为角色 <strong>{selectedRole?.name}</strong> 分配权限：
          </span>
        </div>
        <Select
          showSearch
          placeholder="选择权限"
          className="w-full"
          value={selectedPermissionToAssign}
          onChange={setSelectedPermissionToAssign}
          optionFilterProp="children"
          filterOption={(input: string, option: unknown) => {
            const opt = option as { children?: unknown };
            return String(opt?.children || '').toLowerCase().includes(input.toLowerCase());
          }}
        >
          {permissions
            .filter((p: Permission) => !rolePermissions.find((rp: Permission) => rp.id === p.id))
            .map((perm: Permission) => (
              <Select.Option key={perm.id} value={perm.id}>
                {perm.code} - {perm.name}
              </Select.Option>
            ))}
        </Select>
      </Modal>
    </div>
  );
};

export default AdminPermissions;
