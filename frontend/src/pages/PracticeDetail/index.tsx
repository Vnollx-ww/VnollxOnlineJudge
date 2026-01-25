import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Card,
  Typography,
  Tag,
  Button,
  Progress,
  Table,
  Spin,
} from 'antd';
import toast from 'react-hot-toast';
import {
  BookOutlined,
  ArrowLeftOutlined,
  CheckCircleFilled,
  MinusCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import api from '../../utils/api';
import { isAuthenticated } from '../../utils/auth';

const { Title, Text } = Typography;

interface Practice {
  id: number;
  title: string;
  description?: string;
  createTime: string;
  problemCount: number;
  solvedCount: number;
}

interface Problem {
  id: number;
  title: string;
  difficulty?: string;
  isSolved: boolean;
  submitCount: number;
  passCount: number;
}

const PracticeDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [practice, setPractice] = useState<Practice | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      toast.error('请先登录！');
      navigate('/');
      return;
    }
    loadPracticeData();
  }, [id]);

  const loadPracticeData = async () => {
    setLoading(true);
    try {
      const [practiceRes, problemsRes] = await Promise.all([
        api.get(`/practice/${id}`),
        api.get(`/practice/${id}/problems`),
      ]);

      if (practiceRes.code === 200) {
        setPractice(practiceRes.data);
      }

      if (problemsRes.code === 200) {
        setProblems(problemsRes.data || []);
      }
    } catch (error) {
      toast.error('加载练习数据失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '-';
    return new Date(timeStr).toLocaleString('zh-CN');
  };

  const calculateProgress = () => {
    if (!practice || practice.problemCount === 0) return 0;
    return Math.round((practice.solvedCount / practice.problemCount) * 100);
  };

  const getDifficultyTag = (difficulty?: string) => {
    const colors: Record<string, string> = {
      简单: 'green',
      中等: 'orange',
      困难: 'red',
    };
    return <Tag color={colors[difficulty || ''] || 'default'} className="!rounded-full">{difficulty || '未知'}</Tag>;
  };

  const handleProblemClick = (problemId: number) => {
    navigate(`/problem/${problemId}`, { state: { from: 'practice', practiceId: id } });
  };

  const columns = [
    {
      title: '状态',
      dataIndex: 'isSolved',
      key: 'status',
      width: 80,
      align: 'center' as const,
      render: (isSolved: boolean) => (
        isSolved ? (
          <CheckCircleFilled style={{ color: 'var(--gemini-success)' }} className="text-lg" />
        ) : (
          <MinusCircleOutlined style={{ color: 'var(--gemini-text-disabled)' }} className="text-lg" />
        )
      ),
    },
    {
      title: '题号',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (id: number) => <Text strong style={{ color: 'var(--gemini-text-primary)' }}>#{id}</Text>,
    },
    {
      title: '题目',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: Problem) => (
        <span
          className="cursor-pointer hover:opacity-70 transition-opacity"
          style={{ color: 'var(--gemini-accent-strong)' }}
          onClick={() => handleProblemClick(record.id)}
        >
          {title}
        </span>
      ),
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      width: 100,
      render: (difficulty: string) => getDifficultyTag(difficulty),
    },
    {
      title: '通过率',
      key: 'passRate',
      width: 120,
      render: (_: any, record: Problem) => {
        const rate = record.submitCount > 0 
          ? Math.round((record.passCount / record.submitCount) * 100) 
          : 0;
        return <Text style={{ color: 'var(--gemini-text-secondary)' }}>{rate}%</Text>;
      },
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--gemini-bg)' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!practice) {
    return (
      <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--gemini-bg)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="gemini-card">
            <div className="py-12 text-center">
              <Text style={{ color: 'var(--gemini-text-tertiary)' }}>练习不存在</Text>
              <br />
              <Button 
                type="primary" 
                onClick={() => navigate('/practices')} 
                className="mt-4"
                style={{ 
                  backgroundColor: 'var(--gemini-accent)',
                  color: 'var(--gemini-accent-text)',
                  border: 'none'
                }}
              >
                返回练习列表
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const progress = calculateProgress();

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--gemini-bg)' }}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 头部信息 - Gemini 风格 */}
        <div className="gemini-card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <BookOutlined className="text-3xl" style={{ color: 'var(--gemini-accent-strong)' }} />
                <Title level={2} className="!mb-0" style={{ color: 'var(--gemini-text-primary)' }}>{practice.title}</Title>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <Tag 
                  className="!rounded-full !px-3"
                  style={{ 
                    backgroundColor: 'var(--gemini-accent)',
                    color: 'var(--gemini-accent-text)',
                    border: 'none'
                  }}
                >
                  练习
                </Tag>
                <Text style={{ color: 'var(--gemini-text-tertiary)' }}>创建于 {formatTime(practice.createTime)}</Text>
              </div>
              {practice.description && (
                <Text style={{ color: 'var(--gemini-text-secondary)' }}>{practice.description}</Text>
              )}
            </div>
            <div className="flex gap-3">
              <Button icon={<ReloadOutlined />} onClick={loadPracticeData}>
                刷新
              </Button>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/practices')}>
                返回列表
              </Button>
            </div>
          </div>
        </div>

        {/* 进度卡片 - Gemini 风格 */}
        <div className="gemini-card">
          <div className="flex items-center justify-between mb-2">
            <Text strong style={{ color: 'var(--gemini-text-primary)' }}>完成进度</Text>
            <Text style={{ color: 'var(--gemini-text-secondary)' }}>
              {practice.solvedCount || 0} / {practice.problemCount || 0} 题
            </Text>
          </div>
          <Progress
            percent={progress}
            strokeColor={{
              '0%': 'var(--gemini-accent-strong)',
              '100%': 'var(--gemini-success)',
            }}
            status={progress === 100 ? 'success' : 'active'}
          />
        </div>

        {/* 题目列表 - Gemini 风格 */}
        <div className="gemini-card">
          <div className="flex items-center gap-2 mb-4">
            <span className="font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>题目列表</span>
          </div>
          <Table
            columns={columns}
            dataSource={problems}
            rowKey="id"
            pagination={false}
            locale={{ emptyText: '暂无题目' }}
          />
        </div>
      </div>
    </div>
  );
};

export default PracticeDetail;
