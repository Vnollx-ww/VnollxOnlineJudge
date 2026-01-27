import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  message,
  Typography,
  Tag,
  Tabs,
  Select,
  Tree,
  Spin,
  Descriptions,
  Divider,
  Empty,
} from 'antd';
import {
  ReloadOutlined,
  UserOutlined,
  TeamOutlined,
  SafetyOutlined,
  KeyOutlined,
  PlusOutlined,
  DeleteOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import api from '../../utils/api';
import './AdminPermissions.css';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const AdminPermissions = () => {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [rolePermissionsLoading, setRolePermissionsLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userRoles, setUserRoles] = useState([]);
  const [userPermissions, setUserPermissions] = useState([]);
  const [assignRoleModalVisible, setAssignRoleModalVisible] = useState(false);
  const [assignPermissionModalVisible, setAssignPermissionModalVisible] = useState(false);
  const [selectedRoleToAssign, setSelectedRoleToAssign] = useState(null);
  const [selectedPermissionToAssign, setSelectedPermissionToAssign] = useState(null);
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    loadRoles();
    loadPermissions();
    loadUsers();
  }, []);

  const loadRoles = async () => {
    try {
      const data = await api.get('/admin/permission/roles');
      if (data.code === 200) {
        setRoles(data.data || []);
      }
    } catch (error) {
      messageApi.error('加载角色列表失败');
    }
  };

  const loadPermissions = async () => {
    try {
      const data = await api.get('/admin/permission/permissions');
      if (data.code === 200) {
        setPermissions(data.data || []);
      }
    } catch (error) {
      messageApi.error('加载权限列表失败');
    }
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const data = await api.get('/admin/user/list', {
        params: { pageNum: 1, pageSize: 100 },
      });
      if (data.code === 200) {
        setUsers(data.data || []);
      }
    } catch (error) {
      messageApi.error('加载用户列表失败');
    } finally {
      setUsersLoading(false);
    }
  };

  const loadRolePermissions = async (roleId) => {
    setRolePermissionsLoading(true);
    try {
      const data = await api.get(`/admin/permission/role/${roleId}/permissions`);
      if (data.code === 200) {
        setRolePermissions(data.data || []);
      }
    } catch (error) {
      messageApi.error('加载角色权限失败');
    } finally {
      setRolePermissionsLoading(false);
    }
  };

  const loadUserRolesAndPermissions = async (userId) => {
    try {
      const [rolesData, permsData] = await Promise.all([
        api.get(`/admin/permission/user/${userId}/roles`),
        api.get(`/admin/permission/user/${userId}/permissions`),
      ]);
      if (rolesData.code === 200) {
        setUserRoles(rolesData.data || []);
      }
      if (permsData.code === 200) {
        setUserPermissions(permsData.data || []);
      }
    } catch (error) {
      messageApi.error('加载用户权限失败');
    }
  };

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    loadRolePermissions(role.id);
  };

  const handleUserSelect = (userId) => {
    const user = users.find((u) => u.id === userId);
    setSelectedUser(user);
    loadUserRolesAndPermissions(userId);
  };

  const handleAssignRoleToUser = async () => {
    if (!selectedUser || !selectedRoleToAssign) {
      messageApi.warning('请选择用户和角色');
      return;
    }
    try {
      const data = await api.post(
        `/admin/permission/user/${selectedUser.id}/role/${selectedRoleToAssign}`
      );
      if (data.code === 200) {
        messageApi.success('分配角色成功');
        loadUserRolesAndPermissions(selectedUser.id);
        setAssignRoleModalVisible(false);
        setSelectedRoleToAssign(null);
      } else {
        messageApi.error(data.msg || '分配角色失败');
      }
    } catch (error) {
      messageApi.error('分配角色失败');
    }
  };

  const handleRemoveRoleFromUser = async (roleId) => {
    if (!selectedUser) return;
    try {
      const data = await api.delete(
        `/admin/permission/user/${selectedUser.id}/role/${roleId}`
      );
      if (data.code === 200) {
        messageApi.success('移除角色成功');
        loadUserRolesAndPermissions(selectedUser.id);
      } else {
        messageApi.error(data.msg || '移除角色失败');
      }
    } catch (error) {
      messageApi.error('移除角色失败');
    }
  };

  const handleAssignPermissionToRole = async () => {
    if (!selectedRole || !selectedPermissionToAssign) {
      messageApi.warning('请选择角色和权限');
      return;
    }
    try {
      const data = await api.post(
        `/admin/permission/role/${selectedRole.id}/permission/${selectedPermissionToAssign}`
      );
      if (data.code === 200) {
        messageApi.success('分配权限成功');
        loadRolePermissions(selectedRole.id);
        setAssignPermissionModalVisible(false);
        setSelectedPermissionToAssign(null);
      } else {
        messageApi.error(data.msg || '分配权限失败');
      }
    } catch (error) {
      messageApi.error('分配权限失败');
    }
  };

  const handleRemovePermissionFromRole = async (permissionId) => {
    if (!selectedRole) return;
    try {
      const data = await api.delete(
        `/admin/permission/role/${selectedRole.id}/permission/${permissionId}`
      );
      if (data.code === 200) {
        messageApi.success('移除权限成功');
        loadRolePermissions(selectedRole.id);
      } else {
        messageApi.error(data.msg || '移除权限失败');
      }
    } catch (error) {
      messageApi.error('移除权限失败');
    }
  };

  const handleRefreshCache = async (userId) => {
    try {
      const data = await api.post(`/admin/permission/user/${userId}/refresh`);
      if (data.code === 200) {
        messageApi.success('刷新缓存成功');
      } else {
        messageApi.error(data.msg || '刷新缓存失败');
      }
    } catch (error) {
      messageApi.error('刷新缓存失败');
    }
  };

  const handleClearAllCache = async () => {
    try {
      const data = await api.post('/admin/permission/cache/clear');
      if (data.code === 200) {
        messageApi.success('清除所有缓存成功');
      } else {
        messageApi.error(data.msg || '清除缓存失败');
      }
    } catch (error) {
      messageApi.error('清除缓存失败');
    }
  };

  const getRoleTag = (code) => {
    const colorMap = {
      SUPER_ADMIN: 'red',
      ADMIN: 'orange',
      USER: 'blue',
      GUEST: 'default',
    };
    return <Tag color={colorMap[code] || 'default'}>{code}</Tag>;
  };

  const groupPermissionsByModule = (perms) => {
    const grouped = {};
    perms.forEach((p) => {
      const module = p.module || 'other';
      if (!grouped[module]) {
        grouped[module] = [];
      }
      grouped[module].push(p);
    });
    return grouped;
  };

  const roleColumns = [
    {
      title: '角色码',
      dataIndex: 'code',
      key: 'code',
      render: (code) => getRoleTag(code),
    },
    {
      title: '角色名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button type="link" onClick={() => handleRoleSelect(record)}>
          查看权限
        </Button>
      ),
    },
  ];

  const permissionColumns = [
    {
      title: '权限码',
      dataIndex: 'code',
      key: 'code',
      render: (code) => <Tag color="blue">{code}</Tag>,
    },
    {
      title: '权限名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '模块',
      dataIndex: 'module',
      key: 'module',
      render: (module) => <Tag>{module}</Tag>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
  ];

  const rolePermissionColumns = [
    {
      title: '权限码',
      dataIndex: 'code',
      key: 'code',
      render: (code) => <Tag color="green">{code}</Tag>,
    },
    {
      title: '权限名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '模块',
      dataIndex: 'module',
      key: 'module',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemovePermissionFromRole(record.id)}
        >
          移除
        </Button>
      ),
    },
  ];

  return (
    <div className="admin-permissions">
      {contextHolder}
      <Card>
        <div className="page-header">
          <div>
            <Title level={2} style={{ margin: 0 }}>
              <SafetyOutlined style={{ marginRight: 8 }} />
              权限管理
            </Title>
            <Text type="secondary">管理系统角色与权限</Text>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => { loadRoles(); loadPermissions(); }}>
              刷新
            </Button>
            <Button danger icon={<SyncOutlined />} onClick={handleClearAllCache}>
              清除所有缓存
            </Button>
          </Space>
        </div>

        <Tabs defaultActiveKey="roles">
          <TabPane
            tab={<span><TeamOutlined />角色管理</span>}
            key="roles"
          >
            <div className="roles-section">
              <div className="roles-list">
                <Title level={4}>角色列表</Title>
                <Table
                  columns={roleColumns}
                  dataSource={roles}
                  rowKey="id"
                  pagination={false}
                  size="small"
                />
              </div>

              {selectedRole && (
                <div className="role-permissions">
                  <div className="section-header">
                    <Title level={4}>
                      {getRoleTag(selectedRole.code)} {selectedRole.name} 的权限
                    </Title>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => setAssignPermissionModalVisible(true)}
                    >
                      添加权限
                    </Button>
                  </div>
                  <Spin spinning={rolePermissionsLoading}>
                    <Table
                      columns={rolePermissionColumns}
                      dataSource={rolePermissions}
                      rowKey="id"
                      pagination={false}
                      size="small"
                    />
                  </Spin>
                </div>
              )}
            </div>
          </TabPane>

          <TabPane
            tab={<span><UserOutlined />用户权限</span>}
            key="users"
          >
            <div className="users-section">
              <div className="user-selector">
                <Title level={4}>选择用户</Title>
                <Select
                  showSearch
                  placeholder="选择用户查看权限"
                  style={{ width: 300 }}
                  loading={usersLoading}
                  onChange={handleUserSelect}
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    option.children.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {users.map((user) => (
                    <Select.Option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </Select.Option>
                  ))}
                </Select>
              </div>

              {selectedUser && (
                <div className="user-details">
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

                  <div className="section-header">
                    <Title level={4}>用户角色</Title>
                    <Space>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setAssignRoleModalVisible(true)}
                      >
                        分配角色
                      </Button>
                      <Button
                        icon={<SyncOutlined />}
                        onClick={() => handleRefreshCache(selectedUser.id)}
                      >
                        刷新缓存
                      </Button>
                    </Space>
                  </div>

                  <div className="user-roles">
                    {userRoles.length > 0 ? (
                      <Space wrap>
                        {userRoles.map((role) => (
                          <Tag
                            key={role.id}
                            color={role.code === 'SUPER_ADMIN' ? 'red' : role.code === 'ADMIN' ? 'orange' : 'blue'}
                            closable
                            onClose={() => handleRemoveRoleFromUser(role.id)}
                          >
                            {role.name}
                          </Tag>
                        ))}
                      </Space>
                    ) : (
                      <Empty description="暂无角色" />
                    )}
                  </div>

                  <Divider />

                  <Title level={4}>用户权限（来自角色）</Title>
                  <div className="user-permissions">
                    {userPermissions.length > 0 ? (
                      <Space wrap>
                        {userPermissions.map((perm) => (
                          <Tag key={perm} color="green">
                            {perm}
                          </Tag>
                        ))}
                      </Space>
                    ) : (
                      <Empty description="暂无权限" />
                    )}
                  </div>
                </div>
              )}
            </div>
          </TabPane>

          <TabPane
            tab={<span><KeyOutlined />所有权限</span>}
            key="permissions"
          >
            <Table
              columns={permissionColumns}
              dataSource={permissions}
              rowKey="id"
              pagination={{ pageSize: 20 }}
            />
          </TabPane>
        </Tabs>
      </Card>

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
        <div style={{ marginBottom: 16 }}>
          <Text>为用户 <strong>{selectedUser?.name}</strong> 分配角色：</Text>
        </div>
        <Select
          placeholder="选择角色"
          style={{ width: '100%' }}
          value={selectedRoleToAssign}
          onChange={setSelectedRoleToAssign}
        >
          {roles
            .filter((r) => !userRoles.find((ur) => ur.id === r.id))
            .map((role) => (
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
        <div style={{ marginBottom: 16 }}>
          <Text>为角色 <strong>{selectedRole?.name}</strong> 分配权限：</Text>
        </div>
        <Select
          showSearch
          placeholder="选择权限"
          style={{ width: '100%' }}
          value={selectedPermissionToAssign}
          onChange={setSelectedPermissionToAssign}
          optionFilterProp="children"
          filterOption={(input, option) =>
            option.children.toLowerCase().includes(input.toLowerCase())
          }
        >
          {permissions
            .filter((p) => !rolePermissions.find((rp) => rp.id === p.id))
            .map((perm) => (
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
