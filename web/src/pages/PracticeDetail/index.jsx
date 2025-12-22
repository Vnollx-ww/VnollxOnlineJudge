import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Card,
  Typography,
  Tag,
  Button,
  Progress,
  message,
  Space,
  Table,
  Spin,
} from 'antd';
import {
  BookOutlined,
  ArrowLeftOutlined,
  CheckCircleFilled,
  MinusCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import api from '../../utils/api';
import { isAuthenticated } from '../../utils/auth';
import './PracticeDetail.css';

const { Title, Text } = Typography;

const PracticeDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [practice, setPractice] = useState(null);
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      message.error('请先登录！');
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
      message.error('加载练习数据失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '-';
    const date = new Date(timeStr);
    return date.toLocaleString('zh-CN');
  };

  const calculateProgress = () => {
    if (!practice || practice.problemCount === 0) return 0;
    return Math.round((practice.solvedCount / practice.problemCount) * 100);
  };

  const getDifficultyTag = (difficulty) => {
    const colors = {
      简单: 'green',
      中等: 'orange',
      困难: 'red',
    };
    return <Tag color={colors[difficulty] || 'default'}>{difficulty || '未知'}</Tag>;
  };

  const handleProblemClick = (problemId) => {
    navigate(`/problem/${problemId}`);
  };

  const columns = [
    {
      title: '状态',
      dataIndex: 'isSolved',
      key: 'status',
      width: 80,
      align: 'center',
      render: (isSolved) => (
        isSolved ? (
          <CheckCircleFilled className="solved-icon" />
        ) : (
          <MinusCircleOutlined className="unsolved-icon" />
        )
      ),
    },
    {
      title: '题号',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (id) => <Text strong>#{id}</Text>,
    },
    {
      title: '题目',
      dataIndex: 'title',
      key: 'title',
      render: (title, record) => (
        <span
          className="problem-link"
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
      render: (difficulty) => getDifficultyTag(difficulty),
    },
    {
      title: '通过率',
      key: 'passRate',
      width: 120,
      render: (_, record) => {
        const rate = record.submitCount > 0 
          ? Math.round((record.passCount / record.submitCount) * 100) 
          : 0;
        return <Text>{rate}%</Text>;
      },
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!practice) {
    return (
      <div className="practice-detail-container">
        <Card>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Text type="secondary">练习不存在</Text>
            <br />
            <Button type="primary" onClick={() => navigate('/practices')} style={{ marginTop: 16 }}>
              返回练习列表
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const progress = calculateProgress();

  return (
    <div className="practice-detail-container">
      <Card className="practice-detail-header">
        <div className="header-content">
          <div className="header-info">
            <Space align="center" style={{ marginBottom: 16 }}>
              <BookOutlined style={{ fontSize: 32, color: '#1a73e8' }} />
              <Title level={2} className="practice-title">
                {practice.title}
              </Title>
            </Space>
            <div className="practice-meta">
              <Tag color="blue">练习</Tag>
              <Text type="secondary">创建于 {formatTime(practice.createTime)}</Text>
            </div>
            {practice.description && (
              <Text>{practice.description}</Text>
            )}
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadPracticeData}>
              刷新
            </Button>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/practices')}>
              返回列表
            </Button>
          </Space>
        </div>
      </Card>

      <Card className="progress-card">
        <div className="progress-info">
          <Text strong>完成进度</Text>
          <Text>
            {practice.solvedCount || 0} / {practice.problemCount || 0} 题
          </Text>
        </div>
        <Progress
          percent={progress}
          strokeColor={{
            '0%': '#1a73e8',
            '100%': '#52c41a',
          }}
          status={progress === 100 ? 'success' : 'active'}
        />
      </Card>

      <Card className="problem-table-card" title="题目列表">
        <Table
          columns={columns}
          dataSource={problems}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: '暂无题目' }}
        />
      </Card>
    </div>
  );
};

export default PracticeDetail;
