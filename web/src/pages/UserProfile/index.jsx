import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Card,
  Typography,
  Avatar,
  Statistic,
  Row,
  Col,
  List,
  Tag,
  message,
  Spin,
} from 'antd';
import {
  UserOutlined,
  CheckCircleOutlined,
  RightOutlined,
} from '@ant-design/icons';
import api from '../../utils/api';
import { isAuthenticated } from '../../utils/auth';
import './UserProfile.css';

const { Title, Text } = Typography;

const UserProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [solvedProblems, setSolvedProblems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      message.error('请先登录！');
      navigate('/');
      return;
    }
    loadUserData();
  }, [id]);

  const loadUserData = async () => {
    setLoading(true);
    try {
      // 获取用户信息 - 需要根据ID获取，但后端只有/profile接口获取当前用户
      // 这里先尝试获取当前用户信息，如果ID匹配则显示
      const profileData = await api.get('/user/profile');
      if (profileData.code === 200 && profileData.data.id === parseInt(id)) {
        setUser(profileData.data);
      } else {
        // 如果ID不匹配，可能需要调用其他接口
        // 暂时使用当前用户信息
        setUser(profileData.data);
      }

      // 获取已解决问题列表
      const solvedData = await api.get('/user/solved-problems', {
        params: { uid: id },
      });
      if (solvedData.code === 200) {
        setSolvedProblems(solvedData.data || []);
      }
    } catch (error) {
      message.error('加载用户信息失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="user-profile-container">
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="user-profile-container">
        <Card>用户不存在</Card>
      </div>
    );
  }

  const passRate =
    user.submitCount > 0
      ? Math.round((user.passCount / user.submitCount) * 10000) / 100
      : 0;

  return (
    <div className="user-profile-container">
      {/* 用户信息卡片 */}
      <Card className="profile-card">
        <div className="profile-header">
          <div className="profile-left">
            <Avatar
              size={80}
              style={{
                backgroundColor: '#1a73e8',
                fontSize: 32,
              }}
            >
              {user.name?.charAt(0)?.toUpperCase() || 'U'}
            </Avatar>
            <div className="profile-info">
              <Title level={2} className="user-name">
                {user.name}
              </Title>
              <Text type="secondary" className="user-signature">
                {user.signature || '这个人很懒，还没有个性签名'}
              </Text>
            </div>
          </div>
          <div className="profile-stats">
            <Card className="stat-card">
              <Statistic
                title="提交次数"
                value={user.submitCount || 0}
                valueStyle={{ color: '#1a73e8' }}
              />
            </Card>
            <Card className="stat-card">
              <Statistic
                title="通过题目"
                value={user.passCount || 0}
                valueStyle={{ color: '#66bb6a' }}
              />
            </Card>
            <Card className="stat-card">
              <Statistic
                title="通过率"
                value={passRate}
                suffix="%"
                valueStyle={{ color: '#ff9800' }}
              />
            </Card>
          </div>
        </div>
      </Card>

      {/* 已解决问题列表 */}
      <Card className="problems-card">
        <Title level={3} className="problems-title">
          已解决问题列表
        </Title>
        {solvedProblems.length === 0 ? (
          <div className="empty-state">
            <Text type="secondary">暂无已解决问题</Text>
          </div>
        ) : (
          <List
            dataSource={solvedProblems}
            renderItem={(problem) => (
              <List.Item className="problem-item">
                <Link
                  to={`/problem/${problem.problemId}`}
                  className="problem-link"
                >
                  <Tag color="blue" className="problem-id">
                    #{problem.problemId}
                  </Tag>
                  <Text>查看题目详情</Text>
                  <RightOutlined className="arrow-icon" />
                </Link>
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
};

export default UserProfile;
