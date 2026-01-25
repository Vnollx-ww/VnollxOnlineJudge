import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Typography,
  Table,
  Tag,
  Space,
  Button,
  Modal,
  Input,
  Spin,
  Empty,
  Avatar,
} from 'antd';
import toast from 'react-hot-toast';
import {
  TrophyOutlined,
  LockOutlined,
  UnorderedListOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import api from '../../utils/api';
import { isAuthenticated } from '../../utils/auth';

const { Title, Text } = Typography;

interface Competition {
  id: number;
  title: string;
  beginTime: string;
  endTime: string;
  needPassword: boolean;
}

interface User {
  id: number;
  name: string;
  passCount: number;
  penaltyTime: number;
}

const CompetitionRanklist: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordVerified, setPasswordVerified] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      toast.error('请先登录！');
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
        const comp = data.data.find((c: Competition) => c.id.toString() === id);
        if (comp) {
          setCompetition(comp);
        } else {
          toast.error('比赛不存在');
          navigate('/competitions');
        }
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error('请先登录！');
        navigate('/login');
      } else {
        toast.error('加载比赛信息失败');
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
        toast.success('密码验证成功');
        setPasswordVerified(true);
        setPasswordModalVisible(false);
        localStorage.setItem(`competition_${id}_verified`, 'true');
      } else {
        toast.error(data.msg || '密码错误');
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.msg || error.message || '密码验证失败';
      toast.error(errorMsg);
    }
  };

  const loadRanklist = async () => {
    setLoading(true);
    try {
      const data = await api.get('/competition/list-user', {
        params: { id: id },
      });
      if (data.code === 200) {
        const sorted = (data.data || []).sort((a: User, b: User) => {
          if (a.passCount !== b.passCount) {
            return b.passCount - a.passCount;
          }
          return (a.penaltyTime || 0) - (b.penaltyTime || 0);
        });
        setUsers(sorted);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error('请先登录！');
        navigate('/login');
      } else {
        toast.error('加载排行榜失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds) return '00:00:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatCompetitionTime = (timeStr: string) => {
    if (!timeStr) return '-';
    return new Date(timeStr).toLocaleString('zh-CN');
  };

  const columns = [
    {
      title: '排名',
      key: 'rank',
      width: 80,
      render: (_: any, __: any, index: number) => (
        <span className="font-semibold text-lg" style={{ color: 'var(--gemini-text-primary)' }}>{index + 1}</span>
      ),
    },
    {
      title: '用户',
      key: 'user',
      render: (_: any, record: User) => (
        <div className="flex items-center gap-3">
          <Avatar style={{ background: 'linear-gradient(135deg, var(--gemini-accent) 0%, var(--gemini-accent-strong) 100%)' }}>
            {record.name?.charAt(0)?.toUpperCase() || 'U'}
          </Avatar>
          <div className="font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>{record.name}</div>
        </div>
      ),
    },
    {
      title: '通过数',
      dataIndex: 'passCount',
      key: 'passCount',
      width: 120,
      align: 'center' as const,
      render: (count: number) => (
        <Tag color="success" className="text-sm px-3 py-1 !rounded-full">
          {count || 0}
        </Tag>
      ),
    },
    {
      title: '罚时',
      dataIndex: 'penaltyTime',
      key: 'penaltyTime',
      width: 150,
      align: 'center' as const,
      render: (time: number) => (
        <Text className="font-mono" style={{ color: 'var(--gemini-text-secondary)' }}>{formatTime(time || 0)}</Text>
      ),
    },
  ];

  if (loading && !competition) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="flex items-center justify-center py-24">
        <Empty description="比赛不存在" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--gemini-bg)' }}>
      {/* 导航栏 - Gemini 风格 */}
      <div 
        className="sticky top-0 z-10"
        style={{ 
          backgroundColor: 'var(--gemini-surface)',
          borderBottom: '1px solid var(--gemini-border-light)'
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Space size="large">
            <Link to={`/competition/${id}`}>
              <Button type="link" style={{ color: 'var(--gemini-text-secondary)' }}>
                <UnorderedListOutlined /> 比赛详情
              </Button>
            </Link>
            <Button type="link" className="!font-medium" style={{ color: 'var(--gemini-accent-strong)' }}>
              <TrophyOutlined /> 比赛排行榜
            </Button>
            <Link to={`/competition/${id}/submissions`}>
              <Button type="link" style={{ color: 'var(--gemini-text-secondary)' }}>
                <HistoryOutlined /> 比赛提交记录
              </Button>
            </Link>
          </Space>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* 比赛基本信息 - Gemini 风格 */}
        <div className="gemini-card mb-6">
          <Title level={2} className="!mb-4" style={{ color: 'var(--gemini-text-primary)' }}>{competition.title}</Title>
          <Space>
            <Text strong style={{ color: 'var(--gemini-text-primary)' }}>开始时间：</Text>
            <Text style={{ color: 'var(--gemini-text-secondary)' }}>{formatCompetitionTime(competition.beginTime)}</Text>
            <Text strong className="ml-6" style={{ color: 'var(--gemini-text-primary)' }}>结束时间：</Text>
            <Text style={{ color: 'var(--gemini-text-secondary)' }}>{formatCompetitionTime(competition.endTime)}</Text>
          </Space>
        </div>

        {/* 排行榜 - Gemini 风格 */}
        {passwordVerified ? (
          <div className="gemini-card">
            <div className="flex items-center gap-2 mb-4">
              <TrophyOutlined className="text-yellow-500" />
              <span className="font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>比赛排行榜</span>
            </div>
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
          </div>
        ) : (
          <div className="gemini-card text-center py-12">
            <Text style={{ color: 'var(--gemini-text-tertiary)' }}>请输入密码以查看排行榜</Text>
          </div>
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
        onCancel={() => navigate('/competitions')}
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
          className="!rounded-full"
        />
      </Modal>
    </div>
  );
};

export default CompetitionRanklist;
