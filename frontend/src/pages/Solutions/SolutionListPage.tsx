import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Button,
  Space,
  Typography,
  Avatar,
  Tag,
  Empty,
  Skeleton,
  Result,
} from 'antd';
import toast from 'react-hot-toast';
import {
  ArrowLeftOutlined,
  EditOutlined,
  UserOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import api from '../../utils/api';
import { isAuthenticated } from '../../utils/auth';
import PermissionGuard from '@/components/PermissionGuard';
import { PermissionCode } from '@/constants/permissions';

const { Title, Paragraph, Text } = Typography;

interface Solution {
  id: number;
  title: string;
  content: string;
  name: string;
  pid: number;
  problemName?: string;
  createTime: string;
}

interface LocationState {
  title?: string;
}

// 将 markdown 转换为纯文本预览
const getPreviewText = (content: string) => {
  if (!content) return '';
  let text = content;
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, formula) => formula.trim());
  text = text.replace(/\$([^\$\n]+?)\$/g, (_, formula) => formula.trim());
  const html = marked.parse(text) as string;
  const div = document.createElement('div');
  div.innerHTML = DOMPurify.sanitize(html);
  return div.textContent || div.innerText || '';
};

const SolutionListPage: React.FC = () => {
  const navigate = useNavigate();
  const { problemId } = useParams<{ problemId: string }>();
  const location = useLocation();
  const pid = problemId;
  const titleFromState = (location.state as LocationState)?.title;

  const [problemInfo, setProblemInfo] = useState<{ title?: string; id?: string } | null>(null);
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

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
    } catch {
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
    } catch {
      setFetchError('网络异常，获取题解失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = () => {
    if (!isAuthenticated()) {
      toast.error('请先登录后再发布题解');
      return;
    }
    navigate(`/problem/${pid}/solutions/publish`, {
      state: { title: problemInfo?.title },
    });
  };

  const handleSolveClick = (solveId: number) => {
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
          <Button 
            type="primary" 
            onClick={() => navigate('/problems')}
            style={{ 
              backgroundColor: 'var(--gemini-accent)',
              color: 'var(--gemini-accent-text)',
              border: 'none'
            }}
          >
            返回题目列表
          </Button>
        }
      />
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--gemini-bg)' }}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Card - Gemini 风格 */}
        <div className="gemini-card">
          <Space direction="vertical" size="small" className="w-full">
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(`/problem/${pid}`)}
              type="link"
              className="!pl-0"
              style={{ color: 'var(--gemini-accent-strong)' }}
            >
              返回题目详情
            </Button>
            <div className="mb-4">
              <Title level={2} className="!mb-2" style={{ color: 'var(--gemini-text-primary)' }}>{pageTitle}</Title>
              <Paragraph style={{ color: 'var(--gemini-text-secondary)' }}>分享你的解题思路，帮助更多同学</Paragraph>
            </div>
            <div className="flex gap-4 mb-4">
              <div 
                className="rounded-2xl px-6 py-4"
                style={{ backgroundColor: 'var(--gemini-bg)' }}
              >
                <span style={{ color: 'var(--gemini-text-tertiary)' }} className="text-sm">题目 ID</span>
                <div className="text-xl font-bold" style={{ color: 'var(--gemini-accent-strong)' }}>{pid}</div>
              </div>
              <div 
                className="rounded-2xl px-6 py-4"
                style={{ backgroundColor: 'var(--gemini-bg)' }}
              >
                <span style={{ color: 'var(--gemini-text-tertiary)' }} className="text-sm">题解数量</span>
                <div className="text-xl font-bold" style={{ color: 'var(--gemini-success)' }}>{solutions.length}</div>
              </div>
            </div>
            <PermissionGuard permission={PermissionCode.SOLVE_CREATE}>
              <Button 
                type="primary" 
                icon={<EditOutlined />} 
                onClick={handlePublish}
                style={{ 
                  backgroundColor: 'var(--gemini-accent)',
                  color: 'var(--gemini-accent-text)',
                  border: 'none'
                }}
              >
                发布题解
              </Button>
            </PermissionGuard>
          </Space>
        </div>

        {/* Solutions List - Gemini 风格 */}
        <div className="space-y-4">
          {loading ? (
            <Skeleton active paragraph={{ rows: 4 }} />
          ) : fetchError ? (
            <Result
              status="error"
              title="加载题解失败"
              subTitle={fetchError}
              extra={
                <Button 
                  type="primary" 
                  onClick={loadSolutions}
                  style={{ 
                    backgroundColor: 'var(--gemini-accent)',
                    color: 'var(--gemini-accent-text)',
                    border: 'none'
                  }}
                >
                  重试
                </Button>
              }
            />
          ) : solutions.length === 0 ? (
            <div className="gemini-card">
              <Empty description="暂无题解，快来成为第一位分享者吧" />
            </div>
          ) : (
            solutions.map((item) => (
              <div
                key={item.id}
                onClick={() => handleSolveClick(item.id)}
                className="gemini-card cursor-pointer transition-all hover:shadow-gemini-hover"
              >
                <Space direction="vertical" className="w-full">
                  <Title level={4} className="!mb-2" style={{ color: 'var(--gemini-text-primary)' }}>{item.title}</Title>
                  <Paragraph 
                    className="!mb-4" 
                    ellipsis={{ rows: 3 }}
                    style={{ color: 'var(--gemini-text-secondary)' }}
                  >
                    {getPreviewText(item.content)}
                  </Paragraph>
                  <div className="flex items-center justify-between">
                    <Space size="middle">
                      <Avatar 
                        icon={<UserOutlined />} 
                        style={{ 
                          background: 'linear-gradient(135deg, var(--gemini-accent) 0%, var(--gemini-accent-strong) 100%)'
                        }}
                      />
                      <div>
                        <Text strong style={{ color: 'var(--gemini-text-primary)' }}>{item.name}</Text>
                        <br />
                        <Text style={{ color: 'var(--gemini-text-tertiary)' }} className="text-xs">
                          发布于 {dayjs(item.createTime).format('YYYY-MM-DD HH:mm')}
                        </Text>
                      </div>
                      <Tag 
                        className="!rounded-full !px-3"
                        style={{ 
                          backgroundColor: 'var(--gemini-accent)',
                          color: 'var(--gemini-accent-text)',
                          border: 'none'
                        }}
                      >
                        题目 #{item.pid}
                      </Tag>
                    </Space>
                    <Space>
                      <ClockCircleOutlined style={{ color: 'var(--gemini-text-tertiary)' }} />
                      <Text style={{ color: 'var(--gemini-text-tertiary)' }}>{item.problemName}</Text>
                    </Space>
                  </div>
                </Space>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SolutionListPage;
