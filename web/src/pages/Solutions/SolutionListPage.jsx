import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Card,
  Button,
  Space,
  Typography,
  Avatar,
  Tag,
  Empty,
  Skeleton,
  message,
  Result,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  UserOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../utils/api';
import { isAuthenticated } from '../../utils/auth';
import './SolutionPages.css';

const { Title, Paragraph, Text } = Typography;

const SolutionListPage = () => {
  const navigate = useNavigate();
  const { problemId } = useParams();
  const location = useLocation();
  const pid = problemId;
  const titleFromState = location.state?.title;

  const [problemInfo, setProblemInfo] = useState(null);
  const [solutions, setSolutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    if (!pid) {
      setFetchError('缺少题目 ID，无法加载题解');
      setLoading(false);
      return;
    }
    loadProblemInfo();
    loadSolutions();
  }, [pid]);

  const loadProblemInfo = async () => {
    try {
      if (titleFromState) {
        setProblemInfo({ title: titleFromState, id: pid });
        return;
      }
      const data = await api.get('/problem/get', { params: { id: pid } });
      if (data.code === 200) {
        setProblemInfo(data.data);
      } else {
        setFetchError(data.msg || '获取题目信息失败');
      }
    } catch (error) {
      setFetchError('获取题目信息失败');
    }
  };

  const loadSolutions = async () => {
    setLoading(true);
    try {
      const data = await api.get('/solve/list', { params: { pid } });
      if (data.code === 200) {
        setSolutions((data.data || []).reverse());
        setFetchError(null);
      } else {
        setFetchError(data.msg || '获取题解失败');
      }
    } catch (error) {
      setFetchError('网络异常，获取题解失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = () => {
    if (!isAuthenticated()) {
      message.warning('请先登录后再发布题解');
      return;
    }
    navigate(`/problem/${pid}/solutions/publish`, {
      state: { title: problemInfo?.title },
    });
  };

  const handleSolveClick = (solveId) => {
    navigate(`/problem/${pid}/solutions/${solveId}`, {
      state: { title: problemInfo?.title },
    });
  };

  const pageTitle = useMemo(() => {
    if (problemInfo?.title) {
      return `${problemInfo.title} - 题解列表`;
    }
    return '题解列表';
  }, [problemInfo?.title]);

  if (!pid) {
    return (
      <Result
        status="404"
        title="缺少题目 ID"
        subTitle="无法加载题解列表，请返回题目页面重试"
        extra={
          <Button type="primary" onClick={() => navigate('/problems')}>
            返回题目列表
          </Button>
        }
      />
    );
  }

  return (
    <div className="solution-page">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card className="solution-header-card">
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(`/problem/${pid}`)}
              type="link"
              style={{ paddingLeft: 0 }}
            >
              返回题目详情
            </Button>
            <div>
              <Title level={2} className="solution-title">
                {pageTitle}
              </Title>
              <Paragraph className="solution-subtitle">
                分享你的解题思路，帮助更多同学
              </Paragraph>
            </div>
            <div className="solution-meta-grid">
              <div className="solution-meta-card">
                <span className="solution-meta-label">题目 ID</span>
                <span className="solution-meta-value">{pid}</span>
              </div>
              <div className="solution-meta-card">
                <span className="solution-meta-label">题解数量</span>
                <span className="solution-meta-value">{solutions.length}</span>
              </div>
            </div>
            <Space>
              <Button type="primary" icon={<EditOutlined />} onClick={handlePublish}>
                发布题解
              </Button>
            </Space>
          </Space>
        </Card>

        <div className="solution-card-list">
          {loading ? (
            <Skeleton active paragraph={{ rows: 4 }} />
          ) : fetchError ? (
            <Result
              status="error"
              title="加载题解失败"
              subTitle={fetchError}
              extra={
                <Button type="primary" onClick={loadSolutions}>
                  重试
                </Button>
              }
            />
          ) : solutions.length === 0 ? (
            <Card>
              <Empty description="暂无题解，快来成为第一位分享者吧" />
            </Card>
          ) : (
            solutions.map((item) => (
              <Card
                key={item.id}
                hoverable
                onClick={() => handleSolveClick(item.id)}
                style={{ marginBottom: 16 }}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Title level={4} className="solution-card-title">
                    {item.title}
                  </Title>
                  <Paragraph className="solution-card-content" ellipsis={{ rows: 3 }}>
                    {item.content}
                  </Paragraph>
                  <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
                    <Space size="middle">
                      <Avatar style={{ backgroundColor: '#1a73e8' }} icon={<UserOutlined />} />
                      <div>
                        <Text strong>{item.name}</Text>
                        <br />
                        <Text type="secondary">发布于 {dayjs(item.createTime).format('YYYY-MM-DD HH:mm')}</Text>
                      </div>
                      <Tag color="blue">题目 #{item.pid}</Tag>
                    </Space>
                    <Space>
                      <ClockCircleOutlined />
                      <Text type="secondary">{item.problemName}</Text>
                    </Space>
                  </Space>
                </Space>
              </Card>
            ))
          )}
        </div>
      </Space>
    </div>
  );
};

export default SolutionListPage;
