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
import {
  UserOutlined,
  MailOutlined,
  LockOutlined,
} from '@ant-design/icons';
import api from '../../utils/api';
import { setToken } from '../../utils/auth';

const { Text } = Typography;

const emailRules = [
  { required: true, message: '请输入邮箱地址' },
  { type: 'email', message: '请输入有效的邮箱地址' },
];

const passwordRules = [
  { required: true, message: '请输入密码' },
  { min: 6, message: '密码长度不能少于6位' },
];

const AuthModal = ({ open, mode = 'login', onClose, onModeChange }) => {
  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!open) {
      loginForm.resetFields();
      registerForm.resetFields();
      setCountdown(0);
    }
  }, [open, loginForm, registerForm]);

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

  const handleLogin = async (values) => {
    setLoginLoading(true);
    try {
      const data = await api.post('/user/login', values);
      if (data.code === 200) {
        setToken(data.data);
        message.success('登录成功');
        onClose?.();
        // 直接刷新以便全局状态（Header、路由）更新
        window.location.reload();
      } else {
        message.error(data.msg || '登录失败');
      }
    } catch (error) {
      message.error(error.response?.data?.msg || '网络请求失败，请重试');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (values) => {
    if (values.password !== values.repassword) {
      message.error('两次输入的密码不一致');
      return;
    }
    setRegisterLoading(true);
    try {
      const data = await api.post('/user/register', {
        name: values.name,
        email: values.email,
        verifyCode: values.verifyCode,
        password: values.password,
      });
      if (data.code === 200) {
        message.success('注册成功，请登录');
        onModeChange?.('login');
      } else {
        message.error(data.msg || '注册失败');
      }
    } catch (error) {
      message.error(error.response?.data?.msg || '网络请求失败，请重试');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleSendCode = async () => {
    const email = registerForm.getFieldValue('email');
    const emailError = await registerForm
      .validateFields(['email'])
      .then(() => null)
      .catch(() => '');

    if (emailError !== null) {
      return;
    }

    setCodeLoading(true);
    try {
      const data = await api.post('/email/send', {
        email,
        option: 'register',
      });
      if (data.code === 200) {
        message.success('验证码已发送，请注意查收');
        setCountdown(60);
      } else {
        message.error(data.msg || '发送验证码失败');
      }
    } catch (error) {
      message.error(error.response?.data?.msg || '网络请求失败，请重试');
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
          >
            <Form.Item name="email" rules={emailRules}>
              <Input prefix={<MailOutlined />} placeholder="邮箱地址" size="large" />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="登录密码"
                size="large"
              />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                loading={loginLoading}
              >
                立即登录
              </Button>
            </Form.Item>
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
          >
            <Form.Item
              name="name"
              rules={[
                { required: true, message: '请输入姓名' },
                { min: 2, max: 20, message: '姓名长度应在2-20个字符之间' },
              ]}
            >
              <Input prefix={<UserOutlined />} placeholder="姓名" size="large" />
            </Form.Item>
            <Form.Item name="email" rules={emailRules}>
              <Input prefix={<MailOutlined />} placeholder="邮箱地址" size="large" />
            </Form.Item>
            <Form.Item name="verifyCode" rules={[{ required: true, message: '请输入验证码' }]}
            >
              <Space.Compact style={{ width: '100%' }}>
                <Input placeholder="邮箱验证码" size="large" />
                <Button
                  size="large"
                  type="primary"
                  onClick={handleSendCode}
                  disabled={countdown > 0}
                  loading={codeLoading}
                >
                  {countdown > 0 ? `${countdown}s` : '获取验证码'}
                </Button>
              </Space.Compact>
            </Form.Item>
            <Form.Item name="password" rules={passwordRules}>
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="登录密码"
                size="large"
              />
            </Form.Item>
            <Form.Item
              name="repassword"
              rules={[{ required: true, message: '请再次输入密码' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="重复密码"
                size="large"
              />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                loading={registerLoading}
              >
                立即注册
              </Button>
            </Form.Item>
          </Form>
        ),
      },
    ],
    [
      loginForm,
      registerForm,
      loginLoading,
      registerLoading,
      codeLoading,
      countdown,
    ]
  );

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={480}
      centered
      destroyOnClose
      title={null}
      className="auth-modal"
    >
      <div className="auth-modal__header">
        <Typography.Title level={3} style={{ marginBottom: 8 }}>
          {mode === 'login' ? '欢迎回来' : '立即加入 Vnollx'}
        </Typography.Title>
        <Text type="secondary">
          {mode === 'login'
            ? '登录后即可同步记录、参与比赛'
            : '注册新账号，解锁完整评测体验'}
        </Text>
      </div>
      <Tabs
        activeKey={mode}
        onChange={onModeChange}
        items={tabItems}
        centered
      />
    </Modal>
  );
};

export default AuthModal;
