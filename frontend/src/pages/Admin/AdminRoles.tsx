import { useState, useEffect } from 'react';
import { Button, Modal, Tag, Spin, Field, DataTable, DataColumn, ConfirmButton } from '@/components';
import toast from 'react-hot-toast';
import { RefreshCw, Shield, Plus, Trash2, Edit, X, Key } from 'lucide-react';
import api from '@/utils/api';
import Select from '@/components/Select';
import Input from '@/components/Input';
import PermissionGuard from '@/components/PermissionGuard';
import { PermissionCode } from '@/constants/permissions';
import type { ApiResponse } from '@/types';

interface Role {
  id: number;
  code: string;
  name: string;
  description: string;
  status: number;
}

interface Permission {
  id: number;
  code: string;
  name: string;
  description: string;
  module: string;
}

interface RoleFormValues {
  code: string;
  name: string;
  description: string;
}

interface PermissionFormValues {
  code: string;
  name: string;
  module: string;
  description: string;
}

const defaultRoleForm: RoleFormValues = { code: '', name: '', description: '' };
const defaultPermissionForm: PermissionFormValues = { code: '', name: '', module: '', description: '' };

const AdminRoles: React.FC = () => {
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
  const [selectedPermissionsToAssign, setSelectedPermissionsToAssign] = useState<number[]>([]);
  const [roleForm, setRoleForm] = useState<RoleFormValues>(defaultRoleForm);
  const [permissionFormValues, setPermissionFormValues] = useState<PermissionFormValues>(defaultPermissionForm);

  useEffect(() => {
    loadRoles();
    loadPermissions();
  }, []);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const data = await api.get('/admin/permission/roles') as ApiResponse<Role[]>;
      if (data.code === 200) {
        setRoles(data.data || []);
      }
    } catch {
      toast.error('加载角色列表失败');
    } finally {
      setLoading(false);
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

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    loadRolePermissions(role.id);
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
        const data = await api.put(`/admin/permission/role/${editingRole.id}`, values) as ApiResponse;
        if (data.code === 200) {
          toast.success('更新角色成功');
          setRoleModalVisible(false);
          loadRoles();
        } else {
          toast.error((data as any).msg || '更新失败');
        }
      } else {
        const data = await api.post('/admin/permission/role', values) as ApiResponse;
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
      const data = await api.delete(`/admin/permission/role/${roleId}`) as ApiResponse;
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
          api.post(`/admin/permission/role/${selectedRole.id}/permission/${permissionId}`) as Promise<ApiResponse>
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
      const data = await api.delete(`/admin/permission/role/${selectedRole.id}/permission/${permissionId}`) as ApiResponse;
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
      const data = await api.post('/admin/permission/permission', values) as ApiResponse;
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

  // 过滤掉已分配的权限
  const availablePermissions = permissions.filter(
    (p) => !rolePermissions.find((rp) => rp.id === p.id)
  );

  // 按模块分组权限
  const groupedPermissions = availablePermissions.reduce((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="gemini-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>角色管理</h2>
          <p className="text-sm" style={{ color: 'var(--gemini-text-tertiary)' }}>管理系统角色及其权限</p>
        </div>
        <div className="flex gap-2">
          <Button icon={<RefreshCw className="w-4 h-4" />} onClick={loadRoles}>
            刷新
          </Button>
          <PermissionGuard permission={PermissionCode.PERMISSION_ASSIGN}>
            <Button
              icon={<Key className="w-4 h-4" />}
              onClick={() => setPermissionModalVisible(true)}
            >
              新建权限
            </Button>
          </PermissionGuard>
          <PermissionGuard permission={PermissionCode.ROLE_CREATE}>
            <Button
              type="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={handleAddRole}
              style={{ backgroundColor: 'var(--gemini-accent)', color: 'var(--gemini-accent-text)', border: 'none' }}
            >
              新建角色
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {/* 角色列表 */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5" style={{ color: 'var(--gemini-accent-strong)' }} />
          <span className="font-medium" style={{ color: 'var(--gemini-text-primary)' }}>角色列表</span>
        </div>
        <DataTable<Role>
          rows={roles}
          rowKey="id"
          loading={loading}
          pagination={false}
          size="small"
        >
          <DataColumn<Role> header="角色码" cell={(role) => getRoleTag(role.code)} />
          <DataColumn<Role> header="角色名称" cell={(role) => role.name} />
          <DataColumn<Role> header="描述" cell={(role) => role.description} />
          <DataColumn<Role>
            header="操作"
            width={240}
            action
            cell={(role) => (
              <div className="flex gap-2">
                <Button type="link" size="small" onClick={() => handleRoleSelect(role)}>
                  查看权限
                </Button>
                <PermissionGuard permission={PermissionCode.ROLE_UPDATE}>
                  <Button type="link" size="small" icon={<Edit className="w-3 h-3" />} onClick={() => handleEditRole(role)}>
                    编辑
                  </Button>
                </PermissionGuard>
                <PermissionGuard permission={PermissionCode.ROLE_DELETE}>
                  <ConfirmButton message="确定要删除这个角色吗？" onConfirm={() => handleDeleteRole(role.id)}>
                    <Button type="link" danger size="small" icon={<Trash2 className="w-3 h-3" />}>
                      删除
                    </Button>
                  </ConfirmButton>
                </PermissionGuard>
              </div>
            )}
          />
        </DataTable>
      </div>

      {/* 选中角色的权限 */}
      {selectedRole && (
        <div className="p-4 rounded-lg border" style={{ borderColor: 'var(--gemini-accent)', backgroundColor: 'rgba(66, 133, 244, 0.05)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-medium" style={{ color: 'var(--gemini-text-primary)' }}>
              {getRoleTag(selectedRole.code)} {selectedRole.name} 的权限 ({rolePermissions.length}个)
            </h3>
            <div className="flex gap-2">
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
              <Button
                icon={<X className="w-4 h-4" />}
                onClick={() => setSelectedRole(null)}
              >
                收起
              </Button>
            </div>
          </div>
          <Spin spinning={rolePermissionsLoading}>
            <div className="max-h-80 overflow-y-auto">
              <DataTable<Permission> rows={rolePermissions} rowKey="id" pagination={false} size="small">
                <DataColumn<Permission> header="权限码" cell={(permission) => <Tag color="green">{permission.code}</Tag>} />
                <DataColumn<Permission> header="权限名称" cell={(permission) => permission.name} />
                <DataColumn<Permission> header="模块" cell={(permission) => permission.module} />
                <DataColumn<Permission>
                  header="操作"
                  action
                  cell={(permission) => (
                    <PermissionGuard permission={PermissionCode.PERMISSION_ASSIGN}>
                      <Button type="link" danger icon={<Trash2 className="w-4 h-4" />} onClick={() => handleRemovePermissionFromRole(permission.id)}>
                        移除
                      </Button>
                    </PermissionGuard>
                  )}
                />
              </DataTable>
            </div>
          </Spin>
        </div>
      )}

      {/* 新建/编辑角色 Modal */}
      <Modal
        title={editingRole ? '编辑角色' : '新建角色'}
        open={roleModalVisible}
        onCancel={() => setRoleModalVisible(false)}
        footer={null}
        width={500}
        centered
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleRoleSubmit(roleForm);
          }}
        >
          <Field label="角色码">
            <Input value={roleForm.code} onChange={(event) => updateRoleForm('code', event.target.value)} placeholder="如: MODERATOR" disabled={!!editingRole} />
          </Field>
          <Field label="角色名称">
            <Input value={roleForm.name} onChange={(event) => updateRoleForm('name', event.target.value)} placeholder="如: 版主" />
          </Field>
          <Field label="描述">
            <Input.TextArea value={roleForm.description} onChange={(event) => updateRoleForm('description', event.target.value)} placeholder="角色描述" rows={3} />
          </Field>
          <div className="mb-0">
            <div className="flex justify-end gap-2">
              <Button onClick={() => setRoleModalVisible(false)}>取消</Button>
              <Button
                type="primary"
                htmlType="submit"
                style={{ backgroundColor: 'var(--gemini-accent)', color: 'var(--gemini-accent-text)', border: 'none' }}
              >
                {editingRole ? '更新' : '创建'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* 分配权限 Modal */}
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
        <div className="space-y-3">
          <div className="flex justify-end gap-2">
            <Button type="link" size="small" onClick={() => setSelectedPermissionsToAssign(availablePermissions.map((p) => p.id))}>
              全选
            </Button>
            <Button type="link" size="small" onClick={() => setSelectedPermissionsToAssign([])}>
              清空
            </Button>
          </div>
          <Select
            mode="multiple"
            showSearch
            placeholder="选择要分配的权限（可多选）"
            className="w-full"
            value={selectedPermissionsToAssign}
            onChange={setSelectedPermissionsToAssign}
            optionFilterProp="children"
            options={Object.entries(groupedPermissions).flatMap(([module, perms]) =>
              perms.map((p) => ({
                value: p.id,
                label: `${p.name} (${p.code})`,
                group: module,
              }))
            )}
          />
          <div className="flex justify-end gap-2">
            <Button onClick={() => {
              setAssignPermissionModalVisible(false);
              setSelectedPermissionsToAssign([]);
            }}>
              取消
            </Button>
            <Button
              type="primary"
              onClick={handleAssignPermissionToRole}
              style={{ backgroundColor: 'var(--gemini-accent)', color: 'var(--gemini-accent-text)', border: 'none' }}
            >
              分配
            </Button>
          </div>
        </div>
      </Modal>

      {/* 新建权限 Modal */}
      <Modal
        title="新建权限"
        open={permissionModalVisible}
        centered
        onCancel={() => {
          setPermissionModalVisible(false);
          setPermissionFormValues(defaultPermissionForm);
        }}
        footer={null}
        width={500}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleCreatePermission(permissionFormValues);
          }}
        >
          <Field label="权限码">
            <Input value={permissionFormValues.code} onChange={(event) => updatePermissionForm('code', event.target.value)} placeholder="如: problem:export, user:ban" />
          </Field>
          <Field label="权限名称">
            <Input value={permissionFormValues.name} onChange={(event) => updatePermissionForm('name', event.target.value)} placeholder="如: 导出题目, 封禁用户" />
          </Field>
          <Field label="所属模块">
            <Input value={permissionFormValues.module} onChange={(event) => updatePermissionForm('module', event.target.value)} placeholder="如: 题目管理, 用户管理" />
          </Field>
          <Field label="描述">
            <Input.TextArea value={permissionFormValues.description} onChange={(event) => updatePermissionForm('description', event.target.value)} placeholder="权限描述" rows={3} />
          </Field>
          <div className="mb-0">
            <div className="flex justify-end gap-2">
              <Button onClick={() => {
                setPermissionModalVisible(false);
                setPermissionFormValues(defaultPermissionForm);
              }}>取消</Button>
              <Button
                type="primary"
                htmlType="submit"
                style={{ backgroundColor: 'var(--gemini-accent)', color: 'var(--gemini-accent-text)', border: 'none' }}
              >
                创建
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminRoles;

