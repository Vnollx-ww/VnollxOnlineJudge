import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Button,
  Avatar,
  Typography,
  Space,
} from 'antd';
import toast from 'react-hot-toast';
import {
  UserOutlined,
  MailOutlined,
  LockOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import api from '../../utils/api';
import { isAuthenticated } from '../../utils/auth';

const { Title, Text } = Typography;

interface User {
  id: number;
  name: string;
  email: string;
  signature?: string;
}

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [emailForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [user, setUser] = useState<User | null>(null);
  const [activeMenu, setActiveMenu] = useState('profile');
  const [codeLoading, setCodeLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!isAuthenticated()) {
      toast.error('请先登录！');
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
    } catch {
      toast.error('加载用户信息失败');
    }
  };

  const handleProfileSubmit = async (values: { name: string; signature: string }) => {
    try {
      const formData = new FormData();
      formData.append('email', user!.email);
      formData.append('name', values.name);
      formData.append('option', 'name');
      formData.append('signature', values.signature);
      formData.append('verifyCode', '');

      const data = await api.put('/user/update/profile', formData);
      if (data.code === 200) {
        toast.success('用户信息更新成功');
        localStorage.setItem('name', values.name);
        localStorage.setItem('signature', values.signature);
        setUser({ ...user!, name: values.name, signature: values.signature });
      } else {
        toast.error(data.msg || '更新失败');
      }
    } catch {
      toast.error('网络请求失败，请重试');
    }
  };

  const handleEmailSubmit = async (values: { newEmail: string; verifyCode: string }) => {
    if (values.newEmail === user?.email) {
      toast.error('新邮箱地址不能与旧邮箱地址相同');
      return;
    }
    try {
      const data = await api.put('/user/update/profile', {
        email: values.newEmail,
        name: user!.name,
        option: 'email',
        verifyCode: values.verifyCode,
      });
      if (data.code === 200) {
        toast.success('邮箱更新成功');
        setUser({ ...user!, email: values.newEmail });
        emailForm.setFieldsValue({ currentEmail: values.newEmail, verifyCode: '' });
      } else {
        toast.error(data.msg || '更新失败');
      }
    } catch {
      toast.error('网络请求失败，请重试');
    }
  };

  const handlePasswordSubmit = async (values: { oldPassword: string; newPassword: string; confirmPassword: string }) => {
    if (values.newPassword !== values.confirmPassword) {
      toast.error('两次输入的密码不一致');
      return;
    }
    try {
      const data = await api.put('/user/update/password', {
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });
      if (data.code === 200) {
        toast.success('密码更新成功');
        passwordForm.resetFields();
      } else {
        toast.error(data.msg || '更新失败');
      }
    } catch {
      toast.error('网络请求失败，请重试');
    }
  };

  const handleGetCode = async () => {
    const newEmail = emailForm.getFieldValue('newEmail');
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      toast.error('请输入有效的邮箱地址');
      return;
    }
    setCodeLoading(true);
    try {
      const data = await api.post('/email/send', {
        email: newEmail,
        option: 'update',
      });
      if (data.code === 200) {
        toast.success('验证码已发送，请查收邮件');
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
        toast.error(data.msg || '验证码发送失败');
      }
    } catch {
      toast.error('网络请求失败，请重试');
    } finally {
      setCodeLoading(false);
    }
  };

  const menuItems = [
    { key: 'profile', icon: <UserOutlined />, label: '个人资料' },
    { key: 'email', icon: <MailOutlined />, label: '修改邮箱' },
    { key: 'password', icon: <LockOutlined />, label: '修改密码' },
  ];

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--gemini-bg)' }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex gap-6">
          {/* 侧边栏 - Gemini 风格 */}
          <div className="w-64 shrink-0">
            <div className="gemini-card">
              <Title level={4} className="flex items-center gap-2 !mb-6" style={{ color: 'var(--gemini-text-primary)' }}>
                <SettingOutlined /> 账号设置
              </Title>
              <div className="space-y-2">
                {menuItems.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setActiveMenu(item.key)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-full transition-all"
                    style={{
                      backgroundColor: activeMenu === item.key ? 'var(--gemini-accent)' : 'transparent',
                      color: activeMenu === item.key ? 'var(--gemini-accent-text)' : 'var(--gemini-text-secondary)',
                    }}
                  >
                    {item.icon}
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 内容区域 */}
          <div className="flex-1">
            {/* 个人资料 - Gemini 风格 */}
            {activeMenu === 'profile' && (
              <div className="gemini-card">
                <Title level={3} className="!mb-8" style={{ color: 'var(--gemini-text-primary)' }}>个人资料</Title>
                <Form form={form} layout="vertical" onFinish={handleProfileSubmit}>
                  <div className="flex flex-col items-center mb-8">
                    <Avatar
                      size={120}
                      style={{ 
                        background: 'linear-gradient(135deg, var(--gemini-accent) 0%, var(--gemini-accent-strong) 100%)',
                        fontSize: '3rem'
                      }}
                    >
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </Avatar>
                    <Text className="mt-3" style={{ color: 'var(--gemini-text-tertiary)' }}>
                      头像将显示用户名的首字母
                    </Text>
                  </div>
                  <Form.Item
                    name="name"
                    label="用户名"
                    rules={[{ required: true, message: '请输入用户名' }]}
                  >
                    <Input size="large" className="!rounded-full" />
                  </Form.Item>
                  <Form.Item
                    name="signature"
                    label="个性签名"
                    rules={[{ required: true, message: '请输入个性签名' }]}
                  >
                    <Input size="large" className="!rounded-full" />
                  </Form.Item>
                  <Form.Item>
                    <Button 
                      type="primary" 
                      htmlType="submit" 
                      size="large" 
                      className="!rounded-full"
                      style={{ 
                        backgroundColor: 'var(--gemini-accent)',
                        color: 'var(--gemini-accent-text)',
                        border: 'none'
                      }}
                    >
                      保存更改
                    </Button>
                  </Form.Item>
                </Form>
              </div>
            )}

            {/* 修改邮箱 - Gemini 风格 */}
            {activeMenu === 'email' && (
              <div className="gemini-card">
                <Title level={3} className="!mb-8" style={{ color: 'var(--gemini-text-primary)' }}>修改邮箱</Title>
                <Form form={emailForm} layout="vertical" onFinish={handleEmailSubmit}>
                  <Form.Item name="currentEmail" label="当前邮箱">
                    <Input size="large" disabled className="!rounded-full" />
                  </Form.Item>
                  <Form.Item
                    name="newEmail"
                    label="新邮箱地址"
                    rules={[
                      { required: true, message: '请输入新邮箱地址' },
                      { type: 'email', message: '请输入有效的邮箱地址' },
                    ]}
                  >
                    <Space.Compact className="w-full">
                      <Input size="large" className="!rounded-l-full flex-1" />
                      <Button
                        type="primary"
                        onClick={handleGetCode}
                        disabled={countdown > 0 || codeLoading}
                        loading={codeLoading}
                        size="large"
                        className="!rounded-r-full"
                        style={{ 
                          backgroundColor: 'var(--gemini-accent)',
                          color: 'var(--gemini-accent-text)',
                          border: 'none'
                        }}
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
                    <Input size="large" placeholder="请输入6位验证码" className="!rounded-full" />
                  </Form.Item>
                  <Form.Item>
                    <Button 
                      type="primary" 
                      htmlType="submit" 
                      size="large" 
                      className="!rounded-full"
                      style={{ 
                        backgroundColor: 'var(--gemini-accent)',
                        color: 'var(--gemini-accent-text)',
                        border: 'none'
                      }}
                    >
                      更新邮箱
                    </Button>
                  </Form.Item>
                </Form>
              </div>
            )}

            {/* 修改密码 - Gemini 风格 */}
            {activeMenu === 'password' && (
              <div className="gemini-card">
                <Title level={3} className="!mb-8" style={{ color: 'var(--gemini-text-primary)' }}>修改密码</Title>
                <Form form={passwordForm} layout="vertical" onFinish={handlePasswordSubmit}>
                  <Form.Item
                    name="oldPassword"
                    label="当前密码"
                    rules={[{ required: true, message: '请输入当前密码' }]}
                  >
                    <Input.Password size="large" className="!rounded-full" />
                  </Form.Item>
                  <Form.Item
                    name="newPassword"
                    label="新密码"
                    rules={[
                      { required: true, message: '请输入新密码' },
                      { min: 6, message: '密码长度不能少于6位' },
                    ]}
                  >
                    <Input.Password size="large" className="!rounded-full" />
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
                          return Promise.reject(new Error('两次输入的密码不一致'));
                        },
                      }),
                    ]}
                  >
                    <Input.Password size="large" className="!rounded-full" />
                  </Form.Item>
                  <Form.Item>
                    <Button 
                      type="primary" 
                      htmlType="submit" 
                      size="large" 
                      className="!rounded-full"
                      style={{ 
                        backgroundColor: 'var(--gemini-accent)',
                        color: 'var(--gemini-accent-text)',
                        border: 'none'
                      }}
                    >
                      更新密码
                    </Button>
                  </Form.Item>
                </Form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
