import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Typography,
  Avatar,
  Statistic,
  Tag,
  Spin,
  Tooltip,
} from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { isAuthenticated } from '../../utils/auth';

const { Title, Text } = Typography;

interface User {
  id: number;
  name: string;
  signature?: string;
  submitCount: number;
  passCount: number;
}

interface SolvedProblem {
  problemId: number;
  problemName?: string;
}

const UserProfile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [solvedProblems, setSolvedProblems] = useState<SolvedProblem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      toast.error('请先登录！', { duration: 3000 });
      navigate('/login');
      return;
    }
    loadUserData();
  }, [userId]);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const profileData = await api.get('/user/profile');
      if (profileData.code === 200 && profileData.data.id === parseInt(userId!)) {
        setUser(profileData.data);
      } else {
        setUser(profileData.data);
      }

      const solvedData = await api.get('/user/solved-problems', {
        params: { uid: userId },
      });
      if (solvedData.code === 200) {
        setSolvedProblems(solvedData.data || []);
      }
    } catch (error) {
      toast.error('加载用户信息失败', { duration: 3000 });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--gemini-bg)' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--gemini-bg)' }}>
        <div className="gemini-card">用户不存在</div>
      </div>
    );
  }

  const passRate =
    user.submitCount > 0
      ? Math.round((user.passCount / user.submitCount) * 10000) / 100
      : 0;

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--gemini-bg)' }}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 用户信息卡片 - Gemini 风格 */}
        <div className="gemini-card">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-center gap-6">
              <Avatar
                size={80}
                style={{ 
                  background: 'linear-gradient(135deg, var(--gemini-accent) 0%, var(--gemini-accent-strong) 100%)',
                  fontSize: '2rem'
                }}
              >
                {user.name?.charAt(0)?.toUpperCase() || 'U'}
              </Avatar>
              <div>
                <Title level={2} className="!mb-1" style={{ color: 'var(--gemini-text-primary)' }}>{user.name}</Title>
                <Text style={{ color: 'var(--gemini-text-secondary)' }} className="text-base">
                  {user.signature || '这个人很懒，还没有个性签名'}
                </Text>
              </div>
            </div>
            <div className="flex gap-4">
              <div 
                className="rounded-2xl min-w-[100px] p-4 text-center"
                style={{ backgroundColor: 'var(--gemini-bg)' }}
              >
                <Statistic
                  title={<span style={{ color: 'var(--gemini-text-tertiary)' }}>提交次数</span>}
                  value={user.submitCount || 0}
                  valueStyle={{ color: 'var(--gemini-accent-strong)', fontWeight: 'bold' }}
                />
              </div>
              <div 
                className="rounded-2xl min-w-[100px] p-4 text-center"
                style={{ backgroundColor: 'var(--gemini-bg)' }}
              >
                <Statistic
                  title={<span style={{ color: 'var(--gemini-text-tertiary)' }}>通过题目</span>}
                  value={user.passCount || 0}
                  valueStyle={{ color: 'var(--gemini-success)', fontWeight: 'bold' }}
                />
              </div>
              <div 
                className="rounded-2xl min-w-[100px] p-4 text-center"
                style={{ backgroundColor: 'var(--gemini-bg)' }}
              >
                <Statistic
                  title={<span style={{ color: 'var(--gemini-text-tertiary)' }}>通过率</span>}
                  value={passRate}
                  suffix="%"
                  valueStyle={{ color: 'var(--gemini-warning)', fontWeight: 'bold' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 已解决问题列表 - Gemini 风格 */}
        <div className="gemini-card">
          <Title level={3} className="!mb-6" style={{ color: 'var(--gemini-text-primary)' }}>已解决问题列表</Title>
          {solvedProblems.length === 0 ? (
            <div className="py-12 text-center">
              <Text style={{ color: 'var(--gemini-text-tertiary)' }}>暂无已解决问题</Text>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {solvedProblems.map((problem) => (
                <Tooltip key={problem.problemId} title={problem.problemName || '查看题目'}>
                  <Link to={`/problem/${problem.problemId}`}>
                    <Tag 
                      className="!text-sm !px-4 !py-1.5 cursor-pointer hover:opacity-80 transition-opacity !rounded-full !border-0"
                      style={{ 
                        backgroundColor: 'var(--gemini-accent)',
                        color: 'var(--gemini-accent-text)'
                      }}
                    >
                      <CheckCircleOutlined className="mr-1" /> #{problem.problemId}
                    </Tag>
                  </Link>
                </Tooltip>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
