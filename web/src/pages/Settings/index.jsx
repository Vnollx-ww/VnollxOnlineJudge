import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Layout,
  Menu,
  Form,
  Input,
  Button,
  Avatar,
  Typography,
  message,
  Space,
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  LockOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import api from '../../utils/api';
import { isAuthenticated } from '../../utils/auth';
import './Settings.css';

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

const Settings = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [emailForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [user, setUser] = useState(null);
  const [activeMenu, setActiveMenu] = useState('profile');
  const [codeLoading, setCodeLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!isAuthenticated()) {
      message.error('请先登录！');
      navigate('/');
      return;
    }
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      const data = await api.get('/user/profile');
      if (data.code === 200) {
        setUser(data.data);
        form.setFieldsValue({
          name: data.data.name,
          signature: data.data.signature || localStorage.getItem('signature') || '个性签名',
        });
        emailForm.setFieldsValue({
          currentEmail: data.data.email,
        });
      }
    } catch (error) {
      message.error('加载用户信息失败');
    }
  };

  const handleProfileSubmit = async (values) => {
    try {
      const formData = new FormData();
      formData.append('email', user.email);
      formData.append('name', values.name);
      formData.append('option', 'name');
      formData.append('signature', values.signature);
      formData.append('verifyCode', '');

      const data = await api.put('/user/update/profile', formData);
      if (data.code === 200) {
        message.success('用户信息更新成功');
        localStorage.setItem('name', values.name);
        localStorage.setItem('signature', values.signature);
        setUser({ ...user, name: values.name, signature: values.signature });
      } else {
        message.error(data.msg || '更新失败');
      }
    } catch (error) {
      message.error('网络请求失败，请重试');
    }
  };

  const handleEmailSubmit = async (values) => {
    if (values.newEmail === user.email) {
      message.error('新邮箱地址不能与旧邮箱地址相同');
      return;
    }
    try {
      const data = await api.put('/user/update/profile', {
        email: values.newEmail,
        name: user.name,
        option: 'email',
        verifyCode: values.verifyCode,
      });
      if (data.code === 200) {
        message.success('邮箱更新成功');
        setUser({ ...user, email: values.newEmail });
        emailForm.setFieldsValue({ currentEmail: values.newEmail });
        emailForm.setFieldsValue({ verifyCode: '' });
      } else {
        message.error(data.msg || '更新失败');
      }
    } catch (error) {
      message.error('网络请求失败，请重试');
    }
  };

  const handlePasswordSubmit = async (values) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('两次输入的密码不一致');
      return;
    }
    try {
      const data = await api.put('/user/update/password', {
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });
      if (data.code === 200) {
        message.success('密码更新成功');
        passwordForm.resetFields();
      } else {
        message.error(data.msg || '更新失败');
      }
    } catch (error) {
      message.error('网络请求失败，请重试');
    }
  };

  const handleGetCode = async () => {
    const newEmail = emailForm.getFieldValue('newEmail');
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      message.error('请输入有效的邮箱地址');
      return;
    }
    setCodeLoading(true);
    try {
      const data = await api.post('/email/send', {
        email: newEmail,
        option: 'update',
      });
      if (data.code === 200) {
        message.success('验证码已发送，请查收邮件');
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        message.error(data.msg || '验证码发送失败');
      }
    } catch (error) {
      message.error('网络请求失败，请重试');
    } finally {
      setCodeLoading(false);
    }
  };

  const menuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
    },
    {
      key: 'email',
      icon: <MailOutlined />,
      label: '修改邮箱',
    },
    {
      key: 'password',
      icon: <LockOutlined />,
      label: '修改密码',
    },
  ];

  return (
    <div className="settings-container">
      <Layout className="settings-layout">
        <Sider width={280} className="settings-sidebar">
          <Title level={4} className="sidebar-title">
            <SettingOutlined /> 账号设置
          </Title>
          <Menu
            mode="inline"
            selectedKeys={[activeMenu]}
            items={menuItems}
            onClick={({ key }) => setActiveMenu(key)}
            className="settings-menu"
          />
        </Sider>
        <Content className="settings-content">
          {/* 个人资料 */}
          {activeMenu === 'profile' && (
            <Card className="setting-card">
              <Title level={3} className="section-title">
                个人资料
              </Title>
              <Form
                form={form}
                layout="vertical"
                onFinish={handleProfileSubmit}
              >
                <div className="avatar-section">
                  <Avatar
                    size={120}
                    style={{
                      backgroundColor: '#1a73e8',
                      fontSize: 48,
                    }}
                  >
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </Avatar>
                  <Text type="secondary" className="avatar-note">
                    头像将显示用户名的首字母
                  </Text>
                </div>
                <Form.Item
                  name="name"
                  label="用户名"
                  rules={[{ required: true, message: '请输入用户名' }]}
                >
                  <Input size="large" />
                </Form.Item>
                <Form.Item
                  name="signature"
                  label="个性签名"
                  rules={[{ required: true, message: '请输入个性签名' }]}
                >
                  <Input size="large" />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" size="large">
                    保存更改
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          )}

          {/* 修改邮箱 */}
          {activeMenu === 'email' && (
            <Card className="setting-card">
              <Title level={3} className="section-title">
                修改邮箱
              </Title>
              <Form
                form={emailForm}
                layout="vertical"
                onFinish={handleEmailSubmit}
              >
                <Form.Item name="currentEmail" label="当前邮箱">
                  <Input size="large" disabled />
                </Form.Item>
                <Form.Item
                  name="newEmail"
                  label="新邮箱地址"
                  rules={[
                    { required: true, message: '请输入新邮箱地址' },
                    { type: 'email', message: '请输入有效的邮箱地址' },
                  ]}
                >
                  <Space.Compact style={{ width: '100%' }}>
                    <Input size="large" style={{ flex: 1 }} />
                    <Button
                      type="primary"
                      onClick={handleGetCode}
                      disabled={countdown > 0 || codeLoading}
                      loading={codeLoading}
                      size="large"
                    >
                      {countdown > 0 ? `${countdown}秒后重试` : '获取验证码'}
                    </Button>
                  </Space.Compact>
                </Form.Item>
                <Form.Item
                  name="verifyCode"
                  label="验证码"
                  rules={[{ required: true, message: '请输入验证码' }]}
                >
                  <Input size="large" placeholder="请输入6位验证码" />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" size="large">
                    更新邮箱
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          )}

          {/* 修改密码 */}
          {activeMenu === 'password' && (
            <Card className="setting-card">
              <Title level={3} className="section-title">
                修改密码
              </Title>
              <Form
                form={passwordForm}
                layout="vertical"
                onFinish={handlePasswordSubmit}
              >
                <Form.Item
                  name="oldPassword"
                  label="当前密码"
                  rules={[{ required: true, message: '请输入当前密码' }]}
                >
                  <Input.Password size="large" />
                </Form.Item>
                <Form.Item
                  name="newPassword"
                  label="新密码"
                  rules={[
                    { required: true, message: '请输入新密码' },
                    { min: 6, message: '密码长度不能少于6位' },
                  ]}
                >
                  <Input.Password size="large" />
                </Form.Item>
                <Form.Item
                  name="confirmPassword"
                  label="确认新密码"
                  rules={[
                    { required: true, message: '请再次输入新密码' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('newPassword') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(
                          new Error('两次输入的密码不一致')
                        );
                      },
                    }),
                  ]}
                >
                  <Input.Password size="large" />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" size="large">
                    更新密码
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          )}
        </Content>
      </Layout>
    </div>
  );
};

export default Settings;
