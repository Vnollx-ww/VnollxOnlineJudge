import { useState, useEffect } from 'react';
import { Table, Button, Input, Modal, Form, Select, Tag, Popconfirm } from 'antd';
import toast from 'react-hot-toast';
import { Plus, RefreshCw, Edit, Trash2 } from 'lucide-react';
import api from '@/utils/api';
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

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadUsers();
  }, [currentPage, pageSize, keyword]);

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
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({ name: user.name, email: user.email, identity: user.identity });
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

  const handleSubmit = async (values: any) => {
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
    const map: Record<string, { text: string; color: string }> = {
      USER: { text: '普通用户', color: 'blue' },
      VIP: { text: 'VIP用户', color: 'purple' },
      ADMIN: { text: '管理员', color: 'orange' },
      SUPER_ADMIN: { text: '超级管理员', color: 'red' },
    };
    const item = map[identity] || { text: identity, color: 'default' };
    return <Tag color={item.color}>{item.text}</Tag>;
  };

  const columns = [
    { title: '用户名', dataIndex: 'name', key: 'name' },
    { title: '邮箱', dataIndex: 'email', key: 'email' },
    { title: '身份', dataIndex: 'identity', key: 'identity', render: (identity: string) => getIdentityTag(identity) },
    { title: '提交次数', dataIndex: 'submitCount', key: 'submitCount' },
    { title: '通过数', dataIndex: 'passCount', key: 'passCount' },
    {
      title: '上次登录',
      dataIndex: 'lastLoginTime',
      key: 'lastLoginTime',
      render: (text: string) => (text ? text.replace('T', ' ') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: User) => (
        <div className="flex gap-2">
          <PermissionGuard permission={PermissionCode.USER_UPDATE}>
            <Button type="link" icon={<Edit className="w-4 h-4" />} onClick={() => handleEdit(record)}>
              编辑
            </Button>
          </PermissionGuard>
          <PermissionGuard permission={PermissionCode.USER_DELETE}>
            <Popconfirm title="确定要删除这个用户吗？" onConfirm={() => handleDelete(record.id)}>
              <Button type="link" danger icon={<Trash2 className="w-4 h-4" />}>
                删除
              </Button>
            </Popconfirm>
          </PermissionGuard>
        </div>
      ),
    },
  ];

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
      <div className="flex items-center justify-between mb-4">
        <Input.Search
          placeholder="搜索用户..."
          allowClear
          className="w-72"
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
      <Table
        columns={columns}
        dataSource={users}
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
      />

      {/* Modal */}
      <Modal
        title={editingUser ? '编辑用户' : '新建用户'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="identity" label="身份" rules={[{ required: true, message: '请选择身份' }]}>
            <Select>
              <Select.Option value="USER">普通用户</Select.Option>
              <Select.Option value="VIP">VIP用户</Select.Option>
              <Select.Option value="ADMIN">管理员</Select.Option>
              <Select.Option value="SUPER_ADMIN">超级管理员</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item>
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
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminUsers;
