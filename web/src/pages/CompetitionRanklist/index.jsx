import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Card,
  Typography,
  Table,
  Tag,
  Space,
  Button,
  Modal,
  Input,
  message,
  Spin,
  Empty,
  Avatar,
} from 'antd';
import {
  TrophyOutlined,
  ClockCircleOutlined,
  LockOutlined,
  UnorderedListOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import api from '../../utils/api';
import { isAuthenticated } from '../../utils/auth';
import './CompetitionRanklist.css';

const { Title, Text } = Typography;

const CompetitionRanklist = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [competition, setCompetition] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordVerified, setPasswordVerified] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      message.error('请先登录！');
      navigate('/login');
      return;
    }
    loadCompetition();
  }, [id]);

  useEffect(() => {
    if (competition) {
      checkPassword();
    }
  }, [competition]);

  useEffect(() => {
    if (passwordVerified && competition) {
      loadRanklist();
    }
  }, [passwordVerified, competition]);

  const loadCompetition = async () => {
    try {
      const data = await api.get('/competition/list');
      if (data.code === 200) {
        const comp = data.data.find((c) => c.id.toString() === id);
        if (comp) {
          setCompetition(comp);
        } else {
          message.error('比赛不存在');
          navigate('/competitions');
        }
      }
    } catch (error) {
      if (error.response?.status === 401) {
        message.error('请先登录！');
        navigate('/login');
      } else {
        message.error('加载比赛信息失败');
        console.error(error);
      }
    } finally {
      setLoading(false);
    }
  };

  const checkPassword = () => {
    if (competition && competition.needPassword) {
      const verified = localStorage.getItem(`competition_${id}_verified`);
      if (verified === 'true') {
        setPasswordVerified(true);
      } else {
        setPasswordModalVisible(true);
      }
    } else {
      setPasswordVerified(true);
    }
  };

  const handleVerifyPassword = async () => {
    try {
      const data = await api.post('/competition/confirm', {
        id: id,
        password: password,
      });
      if (data.code === 200) {
        message.success('密码验证成功');
        setPasswordVerified(true);
        setPasswordModalVisible(false);
        localStorage.setItem(`competition_${id}_verified`, 'true');
      } else {
        message.error(data.msg || '密码错误');
      }
    } catch (error) {
      message.error('密码验证失败');
      console.error(error);
    }
  };

  const loadRanklist = async () => {
    setLoading(true);
    try {
      const data = await api.get('/competition/list-user', {
        params: { id: id },
      });
      if (data.code === 200) {
        // 排序：通过数降序，罚时升序
        const sorted = (data.data || []).sort((a, b) => {
          if (a.passCount !== b.passCount) {
            return b.passCount - a.passCount;
          }
          return (a.penaltyTime || 0) - (b.penaltyTime || 0);
        });
        setUsers(sorted);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        message.error('请先登录！');
        navigate('/login');
      } else {
        message.error('加载排行榜失败');
        console.error(error);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return '00:00:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatCompetitionTime = (timeStr) => {
    if (!timeStr) return '-';
    const date = new Date(timeStr);
    return date.toLocaleString('zh-CN');
  };

  const columns = [
    {
      title: '排名',
      key: 'rank',
      width: 80,
      render: (_, __, index) => (
        <span style={{ fontWeight: 600, fontSize: 16 }}>
          {index + 1}
        </span>
      ),
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
          </div>
        </div>
      ),
    },
    {
      title: '通过数',
      dataIndex: 'passCount',
      key: 'passCount',
      width: 120,
      align: 'center',
      render: (count) => (
        <Tag color="success" style={{ fontSize: 14, padding: '4px 12px' }}>
          {count || 0}
        </Tag>
      ),
    },
    {
      title: '罚时',
      dataIndex: 'penaltyTime',
      key: 'penaltyTime',
      width: 150,
      align: 'center',
      render: (time) => (
        <Text style={{ fontFamily: 'monospace' }}>
          {formatTime(time || 0)}
        </Text>
      ),
    },
  ];

  if (loading && !competition) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!competition) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Empty description="比赛不存在" />
      </div>
    );
  }

  return (
    <div className="competition-ranklist">
      {/* 导航栏 */}
      <div className="competition-nav">
        <Space size="large">
          <Link to={`/competition/${id}`}>
            <Button type="link" className="nav-button">
              <UnorderedListOutlined /> 比赛详情
            </Button>
          </Link>
          <Button type="link" className="nav-button active">
            <TrophyOutlined /> 比赛排行榜
          </Button>
          <Link to={`/competition/${id}/submissions`}>
            <Button type="link" className="nav-button">
              <HistoryOutlined /> 比赛提交记录
            </Button>
          </Link>
        </Space>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
        {/* 比赛基本信息 */}
        <Card className="info-card" style={{ marginBottom: 24 }}>
          <Title level={2} style={{ marginBottom: 16 }}>
            {competition.title}
          </Title>
          <Space>
            <Text strong>开始时间：</Text>
            <Text>{formatCompetitionTime(competition.beginTime)}</Text>
            <Text strong style={{ marginLeft: 24 }}>结束时间：</Text>
            <Text>{formatCompetitionTime(competition.endTime)}</Text>
          </Space>
        </Card>

        {/* 排行榜 */}
        {passwordVerified ? (
          <Card
            className="info-card"
            title={
              <Space>
                <TrophyOutlined />
                <span>比赛排行榜</span>
              </Space>
            }
          >
            {users.length === 0 ? (
              <Empty description="暂无排名数据" />
            ) : (
              <Table
                columns={columns}
                dataSource={users}
                loading={loading}
                rowKey="id"
                pagination={false}
              />
            )}
          </Card>
        ) : (
          <Card style={{ textAlign: 'center' }}>
            <Text type="secondary">请输入密码以查看排行榜</Text>
          </Card>
        )}
      </div>

      {/* 密码验证Modal */}
      <Modal
        title={
          <Space>
            <LockOutlined />
            <span>请输入比赛密码</span>
          </Space>
        }
        open={passwordModalVisible}
        onOk={handleVerifyPassword}
        onCancel={() => {
          navigate('/competitions');
        }}
        okText="验证"
        cancelText="取消"
        closable={false}
        maskClosable={false}
      >
        <Input.Password
          placeholder="请输入比赛访问密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onPressEnter={handleVerifyPassword}
          autoFocus
        />
      </Modal>
    </div>
  );
};

export default CompetitionRanklist;

