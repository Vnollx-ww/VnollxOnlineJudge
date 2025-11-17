import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Modal,
  Form,
  Select,
  message,
  Typography,
  Tag,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import api from '../../utils/api';
import './AdminUsers.css';

const { Title, Text } = Typography;
const { Search } = Input;

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadUsers();
  }, [currentPage, pageSize, keyword]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.get('/admin/user/list', {
        params: {
          pageNum: currentPage.toString(),
          pageSize: pageSize.toString(),
          keyword: keyword || undefined,
        },
      });
      if (data.code === 200) {
        setUsers(data.data || []);
      }

      const countData = await api.get('/admin/user/count', {
        params: { keyword: keyword || undefined },
      });
      if (countData.code === 200) {
        setTotal(countData.data || 0);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        // 401错误由响应拦截器处理，这里只记录
        console.error('认证失败，请重新登录');
      } else {
        message.error('加载用户列表失败');
        console.error(error);
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

  const handleEdit = (user) => {
    setEditingUser(user);
    form.setFieldsValue({
      name: user.name,
      email: user.email,
      identity: user.identity,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      const data = await api.delete(`/admin/user/delete/${id}`);
      if (data.code === 200) {
        message.success('删除用户成功');
        loadUsers();
      } else {
        message.error(data.msg || '删除失败');
      }
    } catch (error) {
      message.error('删除用户失败');
    }
  };

  const handleSubmit = async (values) => {
    try {
      if (editingUser) {
        const data = await api.put('/admin/user/update', {
          id: editingUser.id,
          ...values,
        });
        if (data.code === 200) {
          message.success('更新用户成功');
          setModalVisible(false);
          loadUsers();
        } else {
          message.error(data.msg || '更新失败');
        }
      } else {
        const data = await api.post('/admin/user/add', values);
        if (data.code === 200) {
          message.success('添加用户成功');
          setModalVisible(false);
          loadUsers();
        } else {
          message.error(data.msg || '添加失败');
        }
      }
    } catch (error) {
      message.error('操作失败');
    }
  };

  const getIdentityTag = (identity) => {
    const colors = {
      USER: 'blue',
      ADMIN: 'orange',
      SUPER_ADMIN: 'red',
    };
    return <Tag color={colors[identity] || 'default'}>{identity}</Tag>;
  };

  const columns = [
    {
      title: '用户名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '身份',
      dataIndex: 'identity',
      key: 'identity',
      render: (identity) => getIdentityTag(identity),
    },
    {
      title: '提交次数',
      dataIndex: 'submitCount',
      key: 'submitCount',
    },
    {
      title: '通过数',
      dataIndex: 'passCount',
      key: 'passCount',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个用户吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="admin-users">
      <Card>
        <div className="page-header">
          <div>
            <Title level={2} style={{ margin: 0 }}>
              用户列表
            </Title>
            <Text type="secondary">管理系统中的所有用户</Text>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            新建用户
          </Button>
        </div>

        <div className="toolbar">
          <Search
            placeholder="搜索用户..."
            allowClear
            style={{ width: 300 }}
            onSearch={(value) => {
              setKeyword(value);
              setCurrentPage(1);
            }}
          />
          <Button icon={<ReloadOutlined />} onClick={loadUsers}>
            刷新
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={users}
          loading={loading}
          rowKey="id"
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
          }}
        />
      </Card>

      <Modal
        title={editingUser ? '编辑用户' : '新建用户'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
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
          <Form.Item
            name="identity"
            label="身份"
            rules={[{ required: true, message: '请选择身份' }]}
          >
            <Select>
              <Select.Option value="USER">普通用户</Select.Option>
              <Select.Option value="ADMIN">管理员</Select.Option>
              <Select.Option value="SUPER_ADMIN">超级管理员</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                保存
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminUsers;


