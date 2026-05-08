import { useState, useEffect } from 'react';
import { Button, Modal, Tag, Field, DataTable, DataColumn, ConfirmButton } from '@/components';
import toast from 'react-hot-toast';
import { Plus, RefreshCw, Edit, Trash2 } from 'lucide-react';
import api from '@/utils/api';
import Select from '@/components/Select';
import Input from '@/components/Input';
import PermissionGuard from '@/components/PermissionGuard';
import { PermissionCode } from '@/constants/permissions';
import type { ApiResponse } from '@/types';

interface User {
  id: number;
  name: string;
  email: string;
  identity: string;
  submitCount: number;
  passCount: number;
  lastLoginTime?: string;
}

interface Role {
  id: number;
  code: string;
  name: string;
}

interface UserFormValues {
  name: string;
  email: string;
  identity: string;
}

const defaultUserForm: UserFormValues = {
  name: '',
  email: '',
  identity: '',
};

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState<UserFormValues>(defaultUserForm);

  useEffect(() => {
    loadUsers();
  }, [currentPage, pageSize, keyword]);

  useEffect(() => {
    loadRoles();
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

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.get('/admin/user/list', {
        params: { pageNum: currentPage.toString(), pageSize: pageSize.toString(), keyword: keyword || undefined },
      }) as ApiResponse<User[]>;
      if (data.code === 200) {
        setUsers(data.data || []);
      }

      const countData = await api.get('/admin/user/count', {
        params: { keyword: keyword || undefined },
      }) as ApiResponse<number>;
      if (countData.code === 200) {
        setTotal(countData.data || 0);
      }
    } catch (error: any) {
      if (error.response?.status !== 401) {
        toast.error('加载用户列表失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingUser(null);
    setUserForm(defaultUserForm);
    setModalVisible(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setUserForm({ name: user.name, email: user.email, identity: user.identity });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const data = await api.delete(`/admin/user/delete/${id}`) as ApiResponse;
      if (data.code === 200) {
        toast.success('删除用户成功');
        loadUsers();
      } else {
        toast.error((data as any).msg || '删除失败');
      }
    } catch {
      toast.error('删除用户失败');
    }
  };

  const updateUserForm = <K extends keyof UserFormValues>(key: K, value: UserFormValues[K]) => {
    setUserForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (values: UserFormValues) => {
    try {
      if (editingUser) {
        const data = await api.put('/admin/user/update', { id: editingUser.id, ...values }) as ApiResponse;
        if (data.code === 200) {
          toast.success('更新用户成功');
          setModalVisible(false);
          loadUsers();
        } else {
          toast.error((data as any).msg || '更新失败');
        }
      } else {
        const data = await api.post('/admin/user/add', values) as ApiResponse;
        if (data.code === 200) {
          toast.success('添加用户成功');
          setModalVisible(false);
          loadUsers();
        } else {
          toast.error((data as any).msg || '添加失败');
        }
      }
    } catch {
      toast.error('操作失败');
    }
  };

  const getIdentityTag = (identity: string) => {
    const role = roles.find((item) => item.code === identity);
    const item = {
      text: role?.name || identity,
      color: role ? 'blue' : 'default',
    };
    return <Tag color={item.color}>{item.text}</Tag>;
  };

  const identityOptions = roles.map((role) => ({
    value: role.code,
    label: role.name,
  }));

  return (
    <div className="gemini-card">
      {/* Header - Gemini 风格 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>用户列表</h2>
          <p className="text-sm" style={{ color: 'var(--gemini-text-tertiary)' }}>管理系统中的所有用户</p>
        </div>
        <PermissionGuard permission={PermissionCode.USER_CREATE}>
          <Button 
            type="primary" 
            icon={<Plus className="w-4 h-4" />} 
            onClick={handleAdd}
            style={{ 
              backgroundColor: 'var(--gemini-accent)',
              color: 'var(--gemini-accent-text)',
              border: 'none'
            }}
          >
            新建用户
          </Button>
        </PermissionGuard>
      </div>

      {/* Toolbar */}
      <div className="flex flex-row items-center justify-between gap-3 mb-4">
        <Input.Search
          placeholder="搜索用户..."
          allowClear
          className="w-72 shrink-0"
          onSearch={(value) => {
            setKeyword(value);
            setCurrentPage(1);
          }}
        />
        <Button icon={<RefreshCw className="w-4 h-4" />} onClick={loadUsers}>
          刷新
        </Button>
      </div>

      {/* Table */}
      <DataTable<User>
        rows={users}
        loading={loading}
        rowKey="id"
        pagination={{
          current: currentPage,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条记录`,
          onChange: (page, size) => {
            setCurrentPage(page);
            setPageSize(size);
          },
        }}
      >
        <DataColumn<User> header="用户名" cell={(user) => user.name} />
        <DataColumn<User> header="邮箱" cell={(user) => user.email} />
        <DataColumn<User> header="身份" cell={(user) => getIdentityTag(user.identity)} />
        <DataColumn<User> header="提交次数" cell={(user) => user.submitCount} />
        <DataColumn<User> header="通过数" cell={(user) => user.passCount} />
        <DataColumn<User> header="上次登录" cell={(user) => user.lastLoginTime ? user.lastLoginTime.replace('T', ' ') : '-'} />
        <DataColumn<User>
          header="操作"
          action
          cell={(user) => (
            <div className="flex gap-2">
              <PermissionGuard permission={PermissionCode.USER_UPDATE}>
                <Button type="link" icon={<Edit className="w-4 h-4" />} onClick={() => handleEdit(user)}>
                  编辑
                </Button>
              </PermissionGuard>
              <PermissionGuard permission={PermissionCode.USER_DELETE}>
                <ConfirmButton message="确定要删除这个用户吗？" onConfirm={() => handleDelete(user.id)}>
                  <Button type="link" danger icon={<Trash2 className="w-4 h-4" />}>
                    删除
                  </Button>
                </ConfirmButton>
              </PermissionGuard>
            </div>
          )}
        />
      </DataTable>

      {/* Modal */}
      <Modal
        title={editingUser ? '编辑用户' : '新建用户'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        centered
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit(userForm);
          }}
        >
          <Field label="用户名">
            <Input value={userForm.name} onChange={(event) => updateUserForm('name', event.target.value)} />
          </Field>
          <Field label="邮箱">
            <Input value={userForm.email} onChange={(event) => updateUserForm('email', event.target.value)} />
          </Field>
          <Field label="身份">
            <Select value={userForm.identity} onChange={(value) => updateUserForm('identity', value)} options={identityOptions} />
          </Field>
          <div>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setModalVisible(false)}>取消</Button>
              <Button 
                type="primary" 
                htmlType="submit"
                style={{ 
                  backgroundColor: 'var(--gemini-accent)',
                  color: 'var(--gemini-accent-text)',
                  border: 'none'
                }}
              >
                保存
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminUsers;

