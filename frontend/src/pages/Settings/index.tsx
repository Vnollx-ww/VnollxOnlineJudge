import {
  Form,
  Button,
  Avatar,
  Typography,
  Space,
  Upload,
} from 'antd';
import { CameraOutlined } from '@ant-design/icons';
import {
  UserOutlined,
  MailOutlined,
  LockOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import Input from '../../components/input';
import { useSettings } from '@/hooks/useSettings';

const { Title, Text } = Typography;

const Settings: React.FC = () => {
  const {
    form,
    emailForm,
    passwordForm,
    user,
    activeMenu,
    setActiveMenu,
    codeLoading,
    countdown,
    avatarLoading,
    handleProfileSubmit,
    handleEmailSubmit,
    handlePasswordSubmit,
    handleGetCode,
    handleAvatarUpload,
  } = useSettings();

  const menuItems = [
    { key: 'profile', icon: <UserOutlined />, label: '个人资料' },
    { key: 'email', icon: <MailOutlined />, label: '修改邮箱' },
    { key: 'password', icon: <LockOutlined />, label: '修改密码' },
  ];

  return (
    <div className="min-h-full w-full p-6" style={{ backgroundColor: 'var(--gemini-bg)' }}>
      <div className="w-full">
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
                    <Upload
                      name="avatar"
                      showUploadList={false}
                      customRequest={handleAvatarUpload}
                      accept="image/*"
                      disabled={avatarLoading}
                    >
                      <div className="relative cursor-pointer group">
                        <Avatar
                          size={120}
                          src={user?.avatar}
                          style={{ 
                            background: user?.avatar ? 'transparent' : 'linear-gradient(135deg, var(--gemini-accent) 0%, var(--gemini-accent-strong) 100%)',
                            fontSize: '3rem'
                          }}
                        >
                          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </Avatar>
                        <div 
                          className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <CameraOutlined style={{ fontSize: 24, color: '#fff' }} />
                        </div>
                        {avatarLoading && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                            <span className="text-white text-sm">上传中...</span>
                          </div>
                        )}
                      </div>
                    </Upload>
                    <Text className="mt-3" style={{ color: 'var(--gemini-text-tertiary)' }}>
                      点击头像上传新图片
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
