import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Tag, Spin, Popconfirm } from 'antd';
import toast from 'react-hot-toast';
import { RefreshCw, Shield, Plus, Trash2, Edit, X, Key } from 'lucide-react';
import api from '@/utils/api';
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
  const [permissionForm] = Form.useForm();
  const [selectedPermissionToAssign, setSelectedPermissionToAssign] = useState<number | null>(null);
  const [form] = Form.useForm();

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
    form.resetFields();
    setRoleModalVisible(true);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    form.setFieldsValue(role);
    setRoleModalVisible(true);
  };

  const handleRoleSubmit = async (values: { code: string; name: string; description: string }) => {
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
        toast.error((data as any).msg || '分配失败');
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

  const handleCreatePermission = async (values: { code: string; name: string; description: string; module: string }) => {
    try {
      const data = await api.post('/admin/permission/permission', values) as ApiResponse;
      if (data.code === 200) {
        toast.success('创建权限成功');
        setPermissionModalVisible(false);
        permissionForm.resetFields();
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
      VIP: 'purple',
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
      width: 200,
      render: (_: unknown, record: Role) => (
        <div className="flex gap-2">
          <Button type="link" size="small" onClick={() => handleRoleSelect(record)}>
            查看权限
          </Button>
          <PermissionGuard permission={PermissionCode.ROLE_UPDATE}>
            <Button type="link" size="small" icon={<Edit className="w-3 h-3" />} onClick={() => handleEditRole(record)}>
              编辑
            </Button>
          </PermissionGuard>
          <PermissionGuard permission={PermissionCode.ROLE_DELETE}>
            <Popconfirm title="确定要删除这个角色吗？" onConfirm={() => handleDeleteRole(record.id)}>
              <Button type="link" danger size="small" icon={<Trash2 className="w-3 h-3" />}>
                删除
              </Button>
            </Popconfirm>
          </PermissionGuard>
        </div>
      ),
    },
  ];

  const rolePermissionColumns = [
    { title: '权限码', dataIndex: 'code', key: 'code', render: (code: string) => <Tag color="green">{code}</Tag> },
    { title: '权限名称', dataIndex: 'name', key: 'name' },
    { title: '模块', dataIndex: 'module', key: 'module' },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Permission) => (
        <PermissionGuard permission={PermissionCode.PERMISSION_ASSIGN}>
          <Button type="link" danger icon={<Trash2 className="w-4 h-4" />} onClick={() => handleRemovePermissionFromRole(record.id)}>
            移除
          </Button>
        </PermissionGuard>
      ),
    },
  ];

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
        <Table
          columns={roleColumns}
          dataSource={roles}
          rowKey="id"
          loading={loading}
          pagination={false}
          size="small"
        />
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
            <Table columns={rolePermissionColumns} dataSource={rolePermissions} rowKey="id" pagination={false} size="small" />
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
      >
        <Form form={form} layout="vertical" onFinish={handleRoleSubmit}>
          <Form.Item name="code" label="角色码" rules={[{ required: true, message: '请输入角色码' }]}>
            <Input placeholder="如: VIP, MODERATOR" disabled={!!editingRole} />
          </Form.Item>
          <Form.Item name="name" label="角色名称" rules={[{ required: true, message: '请输入角色名称' }]}>
            <Input placeholder="如: VIP用户, 版主" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="角色描述" rows={3} />
          </Form.Item>
          <Form.Item className="mb-0">
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
          </Form.Item>
        </Form>
      </Modal>

      {/* 分配权限 Modal */}
      <Modal
        title="分配权限"
        open={assignPermissionModalVisible}
        onOk={handleAssignPermissionToRole}
        onCancel={() => {
          setAssignPermissionModalVisible(false);
          setSelectedPermissionToAssign(null);
        }}
        okText="分配"
        cancelText="取消"
        okButtonProps={{ style: { backgroundColor: 'var(--gemini-accent)', border: 'none' } }}
      >
        <div className="py-4">
          <Select
            showSearch
            placeholder="选择要分配的权限"
            className="w-full"
            value={selectedPermissionToAssign}
            onChange={setSelectedPermissionToAssign}
            optionFilterProp="children"
          >
            {Object.entries(groupedPermissions).map(([module, perms]) => (
              <Select.OptGroup key={module} label={module}>
                {perms.map((p) => (
                  <Select.Option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </Select.Option>
                ))}
              </Select.OptGroup>
            ))}
          </Select>
        </div>
      </Modal>

      {/* 新建权限 Modal */}
      <Modal
        title="新建权限"
        open={permissionModalVisible}
        onCancel={() => {
          setPermissionModalVisible(false);
          permissionForm.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form form={permissionForm} layout="vertical" onFinish={handleCreatePermission}>
          <Form.Item name="code" label="权限码" rules={[{ required: true, message: '请输入权限码' }]}>
            <Input placeholder="如: problem:export, user:ban" />
          </Form.Item>
          <Form.Item name="name" label="权限名称" rules={[{ required: true, message: '请输入权限名称' }]}>
            <Input placeholder="如: 导出题目, 封禁用户" />
          </Form.Item>
          <Form.Item name="module" label="所属模块" rules={[{ required: true, message: '请输入模块名称' }]}>
            <Input placeholder="如: 题目管理, 用户管理" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="权限描述" rows={3} />
          </Form.Item>
          <Form.Item className="mb-0">
            <div className="flex justify-end gap-2">
              <Button onClick={() => {
                setPermissionModalVisible(false);
                permissionForm.resetFields();
              }}>取消</Button>
              <Button
                type="primary"
                htmlType="submit"
                style={{ backgroundColor: 'var(--gemini-accent)', color: 'var(--gemini-accent-text)', border: 'none' }}
              >
                创建
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminRoles;
