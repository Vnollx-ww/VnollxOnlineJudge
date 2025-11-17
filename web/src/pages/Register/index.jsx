import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, message, Space } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined } from '@ant-design/icons';
import api from '../../utils/api';
import './Register.css';

const { Title, Text } = Typography;

const Register = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const onFinish = async (values) => {
    if (values.password !== values.repassword) {
      message.error('两次输入的密码不一致');
      return;
    }
    setLoading(true);
    try {
      const data = await api.post('/user/register', {
        name: values.name,
        email: values.email,
        verifyCode: values.verifyCode,
        password: values.password,
      });
      if (data.code === 200) {
        message.success('注册成功，请登录');
        navigate('/login');
      } else {
        message.error(data.msg || '注册失败');
      }
    } catch (error) {
      message.error('网络请求失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleGetCode = async (email) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      message.error('请输入有效的邮箱地址');
      return;
    }
    setCodeLoading(true);
    try {
      const data = await api.post('/email/send', {
        email,
        option: 'register',
      });
      if (data.code === 200) {
        message.success('验证码已发送，请注意查看');
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
        message.error(data.msg || '发送验证码失败');
      }
    } catch (error) {
      message.error('网络请求失败，请重试');
    } finally {
      setCodeLoading(false);
    }
  };

  return (
    <div className="register-container">
      <Card className="register-card">
        <Title level={2} className="register-title">
          用户注册
        </Title>
        <Form
          form={form}
          name="register"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
          layout="vertical"
        >
          <Form.Item
            name="name"
            rules={[
              { required: true, message: '请输入姓名' },
              { min: 2, max: 20, message: '姓名长度应在2-20个字符之间' },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="姓名" />
          </Form.Item>

          <Form.Item
            name="email"
            rules={[
              { required: true, message: '请输入邮箱地址' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="邮箱地址" />
          </Form.Item>

          <Form.Item
            name="verifyCode"
            rules={[{ required: true, message: '请输入验证码' }]}
          >
            <Space.Compact style={{ width: '100%' }}>
              <Input placeholder="短信验证码" style={{ flex: 1 }} />
              <Button
                type="primary"
                onClick={() => {
                  const email = form.getFieldValue('email');
                  handleGetCode(email);
                }}
                disabled={countdown > 0 || codeLoading}
                loading={codeLoading}
              >
                {countdown > 0 ? `${countdown}秒后重发` : '获取验证码'}
              </Button>
            </Space.Compact>
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码长度不能少于6位' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="登录密码"
            />
          </Form.Item>

          <Form.Item
            name="repassword"
            rules={[{ required: true, message: '请再次输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="重复密码"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              className="register-button"
            >
              立即注册
            </Button>
          </Form.Item>

          <div className="register-footer">
            <Text>
              已有账号？<Link to="/login">立即登录</Link>
            </Text>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default Register;

