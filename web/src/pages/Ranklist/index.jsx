import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Tag,
  Avatar,
  Typography,
  message,
  Row,
  Col,
  Statistic,
} from 'antd';
import { TrophyOutlined, UserOutlined } from '@ant-design/icons';
import api from '../../utils/api';
import { isAuthenticated, getUserInfo } from '../../utils/auth';
import './Ranklist.css';

const { Title } = Typography;

const Ranklist = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [topUsers, setTopUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      message.error('请先登录！');
      navigate('/');
      return;
    }
    const user = getUserInfo();
    if (user?.id) {
      setCurrentUserId(parseInt(user.id));
    }
    loadRanking();
  }, []);

  const loadRanking = async () => {
    setLoading(true);
    try {
      const data = await api.get('/user/list');
      if (data.code === 200) {
        // 排序逻辑：按通过数降序，通过数相同则按提交数升序
        const sorted = data.data.sort((a, b) => {
          if (b.passCount !== a.passCount) {
            return b.passCount - a.passCount;
          }
          if (a.submitCount !== b.submitCount) {
            return a.submitCount - b.submitCount;
          }
          return a.name.localeCompare(b.name);
        });

        setTopUsers(sorted.slice(0, 3));
        setUsers(sorted.slice(3));
      }
    } catch (error) {
      message.error('加载排行榜失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePassRate = (pass, submit) => {
    if (submit === 0) return '0%';
    return `${Math.round((pass / submit) * 100)}%`;
  };

  const getRateColor = (pass, submit) => {
    const rate = submit === 0 ? 0 : (pass / submit) * 100;
    if (rate >= 70) return 'green';
    if (rate >= 40) return 'orange';
    return 'red';
  };

  const columns = [
    {
      title: '排名',
      key: 'rank',
      width: 100,
      render: (_, __, index) => index + 4,
    },
    {
      title: '用户',
      key: 'user',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar
            style={{
              backgroundColor: '#1a73e8',
            }}
          >
            {record.name?.charAt(0)?.toUpperCase() || 'U'}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600 }}>{record.name}</div>
            <div style={{ fontSize: 12, color: '#999' }}>ID: {record.id}</div>
          </div>
        </div>
      ),
    },
    {
      title: '已通过',
      dataIndex: 'passCount',
      key: 'passCount',
      width: 120,
      align: 'center',
      render: (count) => (
        <Statistic value={count} valueStyle={{ color: '#66bb6a' }} />
      ),
    },
    {
      title: '总提交',
      dataIndex: 'submitCount',
      key: 'submitCount',
      width: 120,
      align: 'center',
      render: (count) => (
        <Statistic value={count} valueStyle={{ color: '#1a73e8' }} />
      ),
    },
    {
      title: '通过率',
      key: 'passRate',
      width: 120,
      align: 'center',
      render: (_, record) => {
        const rate = calculatePassRate(record.passCount, record.submitCount);
        return (
          <Tag color={getRateColor(record.passCount, record.submitCount)}>
            {rate}
          </Tag>
        );
      },
    },
  ];

  const getMedalIcon = (rank) => {
    switch (rank) {
      case 1:
        return <TrophyOutlined style={{ fontSize: 64, color: '#d97706' }} />;
      case 2:
        return <TrophyOutlined style={{ fontSize: 56, color: '#6b7280' }} />;
      case 3:
        return <TrophyOutlined style={{ fontSize: 56, color: '#92400e' }} />;
      default:
        return null;
    }
  };

  return (
    <div className="ranklist-container">
      <Card className="ranklist-card">
        <div className="ranklist-header">
          <Title level={2} className="page-title">
            <TrophyOutlined /> 排行榜
          </Title>
          <p className="header-subtitle">
            根据用户通过题目数量排名，通过数相同则提交少的靠前
          </p>
        </div>

        {/* 前三名展示 */}
        {topUsers.length > 0 && (
          <div className="top-rankings">
            <Row gutter={[24, 24]} justify="center">
              {topUsers.map((user, index) => {
                const rank = index + 1;
                return (
                  <Col xs={24} sm={8} key={user.id}>
                    <Card
                      className={`top-rank-card rank-${rank} ${
                        currentUserId === user.id ? 'current-user' : ''
                      }`}
                      hoverable
                    >
                      <div className="medal-icon">{getMedalIcon(rank)}</div>
                      <div className="top-rank-name">{user.name}</div>
                      <div className="top-rank-id">ID: {user.id}</div>
                      <div className="top-rank-stats">
                        已通过 <span className="pass-count">{user.passCount}</span>{' '}
                        题
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </div>
        )}

        {/* 排行榜列表 */}
        <div className="ranking-list">
          <Table
            columns={columns}
            dataSource={users}
            loading={loading}
            rowKey="id"
            pagination={false}
            rowClassName={(record) =>
              currentUserId === record.id ? 'current-user-row' : ''
            }
          />
        </div>
      </Card>
    </div>
  );
};

export default Ranklist;



