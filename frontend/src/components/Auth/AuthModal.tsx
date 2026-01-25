import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Tabs,
  Form,
  Input,
  Button,
  Typography,
  message,
  Space,
} from 'antd';
import { Mail, Lock, User } from 'lucide-react';
import api from '@/utils/api';
import { setToken } from '@/utils/auth';
import type { ApiResponse } from '@/types';

const { Text } = Typography;

type AuthMode = 'login' | 'register' | 'forget';

interface AuthModalProps {
  open: boolean;
  mode?: AuthMode;
  onClose?: () => void;
  onModeChange?: (mode: AuthMode) => void;
}

interface LoginFormValues {
  email: string;
  password: string;
}

interface RegisterFormValues {
  name: string;
  email: string;
  verifyCode: string;
  password: string;
  repassword: string;
}

interface ForgotFormValues {
  email: string;
  verifyCode: string;
  newPassword: string;
  confirmPassword: string;
}

const emailRules = [
  { required: true, message: '请输入邮箱地址' },
  { type: 'email' as const, message: '请输入有效的邮箱地址' },
];

const passwordRules = [
  { required: true, message: '请输入密码' },
  { min: 6, message: '密码长度不能少于6位' },
];

const AuthModal: React.FC<AuthModalProps> = ({ open, mode = 'login', onClose, onModeChange }) => {
  const [loginForm] = Form.useForm<LoginFormValues>();
  const [registerForm] = Form.useForm<RegisterFormValues>();
  const [forgotForm] = Form.useForm<ForgotFormValues>();
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [forgotCodeLoading, setForgotCodeLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [forgotCountdown, setForgotCountdown] = useState(0);
  const [messageApi, messageContextHolder] = message.useMessage();

  useEffect(() => {
    if (!open) {
      loginForm.resetFields();
      registerForm.resetFields();
      forgotForm.resetFields();
      setCountdown(0);
      setForgotCountdown(0);
    }
  }, [open, loginForm, registerForm, forgotForm]);

  useEffect(() => {
    if (!countdown) return undefined;
    const timer = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [countdown]);

  useEffect(() => {
    if (!forgotCountdown) return undefined;
    const timer = window.setInterval(() => {
      setForgotCountdown((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [forgotCountdown]);

  const handleLogin = async (values: LoginFormValues) => {
    setLoginLoading(true);
    try {
      const data = await api.post('/user/login', values) as ApiResponse<string>;
      if (data.code === 200) {
        setToken(data.data);
        messageApi.success('登录成功');
        onClose?.();
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        messageApi.error((data as any).msg || '登录失败');
      }
    } catch (error: any) {
      messageApi.error(error.response?.data?.msg || '网络请求失败，请重试');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleForgotPassword = async (values: ForgotFormValues) => {
    if (values.newPassword !== values.confirmPassword) {
      messageApi.error('两次输入的密码不一致');
      return;
    }
    setForgotLoading(true);
    try {
      const data = await api.put('/user/forget', {
        email: values.email,
        verifyCode: values.verifyCode,
        newPassword: values.newPassword,
      }) as ApiResponse;
      if (data.code === 200) {
        messageApi.success('密码重置成功，请重新登录');
        forgotForm.resetFields();
        onModeChange?.('login');
      } else {
        messageApi.error((data as any).msg || '密码重置失败');
      }
    } catch (error: any) {
      messageApi.error(error.response?.data?.msg || '网络请求失败，请重试');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSendForgotCode = async () => {
    const email = forgotForm.getFieldValue('email');
    try {
      await forgotForm.validateFields(['email']);
    } catch {
      return;
    }

    setForgotCodeLoading(true);
    try {
      const data = await api.post('/email/send', {
        email,
        option: 'forget',
      }) as ApiResponse;
      if (data.code === 200) {
        messageApi.success('验证码已发送，请注意查收');
        setForgotCountdown(60);
      } else {
        messageApi.error((data as any).msg || '发送验证码失败');
      }
    } catch (error: any) {
      messageApi.error(error.response?.data?.msg || '网络请求失败，请重试');
    } finally {
      setForgotCodeLoading(false);
    }
  };

  const handleRegister = async (values: RegisterFormValues) => {
    if (values.password !== values.repassword) {
      messageApi.error('两次输入的密码不一致');
      return;
    }
    setRegisterLoading(true);
    try {
      const data = await api.post('/user/register', {
        name: values.name,
        email: values.email,
        verifyCode: values.verifyCode,
        password: values.password,
      }) as ApiResponse;
      if (data.code === 200) {
        messageApi.success('注册成功，请登录');
        onModeChange?.('login');
      } else {
        messageApi.error((data as any).msg || '注册失败');
      }
    } catch (error: any) {
      messageApi.error(error.response?.data?.msg || '网络请求失败，请重试');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleSendCode = async () => {
    const email = registerForm.getFieldValue('email');
    try {
      await registerForm.validateFields(['email']);
    } catch {
      return;
    }

    setCodeLoading(true);
    try {
      const data = await api.post('/email/send', {
        email,
        option: 'register',
      }) as ApiResponse;
      if (data.code === 200) {
        messageApi.success('验证码已发送，请注意查收');
        setCountdown(60);
      } else {
        messageApi.error((data as any).msg || '发送验证码失败');
      }
    } catch (error: any) {
      messageApi.error(error.response?.data?.msg || '网络请求失败，请重试');
    } finally {
      setCodeLoading(false);
    }
  };

  const tabItems = useMemo(
    () => [
      {
        key: 'login',
        label: '登录',
        children: (
          <Form
            layout="vertical"
            form={loginForm}
            onFinish={handleLogin}
            autoComplete="off"
            className="pt-4"
          >
            <Form.Item name="email" rules={emailRules}>
              <Input
                prefix={<Mail className="w-4 h-4" style={{ color: 'var(--gemini-text-disabled)' }} />}
                placeholder="邮箱地址"
                size="large"
                className="rounded-full"
                style={{ backgroundColor: 'var(--gemini-bg)', border: 'none' }}
              />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password
                prefix={<Lock className="w-4 h-4" style={{ color: 'var(--gemini-text-disabled)' }} />}
                placeholder="登录密码"
                size="large"
                className="rounded-full"
                style={{ backgroundColor: 'var(--gemini-bg)', border: 'none' }}
              />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                loading={loginLoading}
                className="h-12 rounded-full font-semibold hover:-translate-y-0.5 transition-all duration-300"
                style={{ backgroundColor: 'var(--gemini-accent)', color: 'var(--gemini-accent-text)', border: 'none' }}
              >
                立即登录
              </Button>
            </Form.Item>
            <div className="text-center">
              <Button
                type="link"
                size="small"
                onClick={() => onModeChange?.('forget')}
                style={{ color: 'var(--gemini-text-secondary)' }}
              >
                忘记密码？
              </Button>
            </div>
          </Form>
        ),
      },
      {
        key: 'register',
        label: '注册',
        children: (
          <Form
            layout="vertical"
            form={registerForm}
            onFinish={handleRegister}
            autoComplete="off"
            className="pt-4"
          >
            <Form.Item
              name="name"
              rules={[
                { required: true, message: '请输入姓名' },
                { min: 2, max: 20, message: '姓名长度应在2-20个字符之间' },
              ]}
            >
              <Input
                prefix={<User className="w-4 h-4" style={{ color: 'var(--gemini-text-disabled)' }} />}
                placeholder="姓名"
                size="large"
                className="rounded-full"
                style={{ backgroundColor: 'var(--gemini-bg)', border: 'none' }}
              />
            </Form.Item>
            <Form.Item name="email" rules={emailRules}>
              <Input
                prefix={<Mail className="w-4 h-4" style={{ color: 'var(--gemini-text-disabled)' }} />}
                placeholder="邮箱地址"
                size="large"
                className="rounded-full"
                style={{ backgroundColor: 'var(--gemini-bg)', border: 'none' }}
              />
            </Form.Item>
            <Form.Item name="verifyCode" rules={[{ required: true, message: '请输入验证码' }]}>
              <Space.Compact className="w-full">
                <Input 
                  placeholder="邮箱验证码" 
                  size="large" 
                  className="rounded-l-full"
                  style={{ backgroundColor: 'var(--gemini-bg)', border: 'none' }}
                />
                <Button
                  size="large"
                  onClick={handleSendCode}
                  disabled={countdown > 0}
                  loading={codeLoading}
                  className="rounded-r-full"
                  style={{ backgroundColor: 'var(--gemini-accent)', color: 'var(--gemini-accent-text)', border: 'none' }}
                >
                  {countdown > 0 ? `${countdown}s` : '获取验证码'}
                </Button>
              </Space.Compact>
            </Form.Item>
            <Form.Item name="password" rules={passwordRules}>
              <Input.Password
                prefix={<Lock className="w-4 h-4" style={{ color: 'var(--gemini-text-disabled)' }} />}
                placeholder="登录密码"
                size="large"
                className="rounded-full"
                style={{ backgroundColor: 'var(--gemini-bg)', border: 'none' }}
              />
            </Form.Item>
            <Form.Item
              name="repassword"
              rules={[{ required: true, message: '请再次输入密码' }]}
            >
              <Input.Password
                prefix={<Lock className="w-4 h-4" style={{ color: 'var(--gemini-text-disabled)' }} />}
                placeholder="重复密码"
                size="large"
                className="rounded-full"
                style={{ backgroundColor: 'var(--gemini-bg)', border: 'none' }}
              />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                loading={registerLoading}
                className="h-12 rounded-full font-semibold hover:-translate-y-0.5 transition-all duration-300"
                style={{ backgroundColor: 'var(--gemini-accent)', color: 'var(--gemini-accent-text)', border: 'none' }}
              >
                立即注册
              </Button>
            </Form.Item>
          </Form>
        ),
      },
      {
        key: 'forget',
        label: '忘记密码',
        children: (
          <Form
            layout="vertical"
            form={forgotForm}
            onFinish={handleForgotPassword}
            autoComplete="off"
            className="pt-4"
          >
            <Form.Item name="email" rules={emailRules}>
              <Input
                prefix={<Mail className="w-4 h-4" style={{ color: 'var(--gemini-text-disabled)' }} />}
                placeholder="注册邮箱"
                size="large"
                className="rounded-full"
                style={{ backgroundColor: 'var(--gemini-bg)', border: 'none' }}
              />
            </Form.Item>
            <Form.Item
              name="verifyCode"
              rules={[{ required: true, message: '请输入验证码' }]}
            >
              <Space.Compact className="w-full">
                <Input 
                  placeholder="邮箱验证码" 
                  size="large" 
                  className="rounded-l-full"
                  style={{ backgroundColor: 'var(--gemini-bg)', border: 'none' }}
                />
                <Button
                  size="large"
                  onClick={handleSendForgotCode}
                  disabled={forgotCountdown > 0}
                  loading={forgotCodeLoading}
                  className="rounded-r-full"
                  style={{ backgroundColor: 'var(--gemini-accent)', color: 'var(--gemini-accent-text)', border: 'none' }}
                >
                  {forgotCountdown > 0 ? `${forgotCountdown}s` : '获取验证码'}
                </Button>
              </Space.Compact>
            </Form.Item>
            <Form.Item name="newPassword" rules={passwordRules}>
              <Input.Password
                prefix={<Lock className="w-4 h-4" style={{ color: 'var(--gemini-text-disabled)' }} />}
                placeholder="新密码"
                size="large"
                className="rounded-full"
                style={{ backgroundColor: 'var(--gemini-bg)', border: 'none' }}
              />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              dependencies={['newPassword']}
              rules={[{ required: true, message: '请再次输入密码' }]}
            >
              <Input.Password
                prefix={<Lock className="w-4 h-4" style={{ color: 'var(--gemini-text-disabled)' }} />}
                placeholder="确认新密码"
                size="large"
                className="rounded-full"
                style={{ backgroundColor: 'var(--gemini-bg)', border: 'none' }}
              />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                loading={forgotLoading}
                className="h-12 rounded-full font-semibold hover:-translate-y-0.5 transition-all duration-300"
                style={{ backgroundColor: 'var(--gemini-accent)', color: 'var(--gemini-accent-text)', border: 'none' }}
              >
                重置密码
              </Button>
            </Form.Item>
          </Form>
        ),
      },
    ],
    [
      loginForm,
      registerForm,
      forgotForm,
      loginLoading,
      registerLoading,
      forgotLoading,
      codeLoading,
      forgotCodeLoading,
      countdown,
      forgotCountdown,
    ]
  );

  return (
    <>
      {messageContextHolder}
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        width={440}
        centered
        destroyOnClose
        title={null}
        className="auth-modal"
        styles={{
          content: {
            borderRadius: '24px',
            padding: '24px',
          }
        }}
      >
        <div className="text-center pt-4 pb-2">
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--gemini-text-primary)' }}>
            {mode === 'login' ? '欢迎回来' : mode === 'register' ? '立即加入 Vnollx' : '找回密码'}
          </h2>
          <Text style={{ color: 'var(--gemini-text-secondary)' }}>
            {mode === 'login'
              ? '登录后即可同步记录、参与比赛'
              : mode === 'register'
              ? '注册新账号，解锁完整评测体验'
              : '通过邮箱验证重置您的密码'}
          </Text>
        </div>
        <Tabs
          activeKey={mode}
          onChange={(key) => onModeChange?.(key as AuthMode)}
          items={tabItems}
          centered
          className="auth-tabs"
        />
      </Modal>
    </>
  );
};

export default AuthModal;

