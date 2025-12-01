import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import api from '../../utils/api';
import { setToken, setUserInfo } from '../../utils/auth';
import './Login.css';

const { Title, Text } = Typography;

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const data = await api.post('/user/login', values);
      if (data.code === 200) {
        setToken(data.data);
        
        // 获取用户信息
        try {
          const userRes = await api.get('/user/profile');
          if (userRes.code === 200) {
            setUserInfo(userRes.data);
          }
        } catch (error) {
          console.error('获取用户信息失败:', error);
        }

        message.success('登录成功');
        navigate('/');
        window.location.reload();
      } else {
        message.error(data.msg || '登录失败');
      }
    } catch (error) {
      message.error('网络请求失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card">
        <Title level={2} className="login-title">
          用户登录
        </Title>
        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
          layout="vertical"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: '请输入邮箱地址' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="邮箱地址"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="登录密码"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              className="login-button"
            >
              立即登录
            </Button>
          </Form.Item>

          <div className="login-footer">
            <Text>
              还没有账号？<Link to="/register">立即注册</Link>
            </Text>
            <Link to="/forgot-password" className="forgot-password">
              忘记密码？
            </Link>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default Login;



