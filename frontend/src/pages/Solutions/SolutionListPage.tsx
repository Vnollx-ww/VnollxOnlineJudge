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
import {
  ArrowLeftOutlined,
  EditOutlined,
  UserOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import PermissionGuard from '@/components/permission-guard';
import { PermissionCode } from '@/constants/permissions';
import { useSolutionList } from '@/hooks/useSolutionList';

const { Title, Paragraph, Text } = Typography;

const SolutionListPage: React.FC = () => {
  const {
    navigate,
    pid,
    solutions,
    loading,
    fetchError,
    pageTitle,
    loadSolutions,
    handlePublish,
    handleSolveClick,
    getPreviewText,
  } = useSolutionList();

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
    <div className="min-h-full w-full">
      <div className="w-full space-y-6">
        {/* Header Card - Gemini 风格 */}
        <div className="gemini-card">
          <Space direction="vertical" size="small" className="w-full">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(`/problem/${pid}`)}
                className="gemini-btn gemini-btn-outlined"
              >
                返回题目详情
              </Button>
            </div>
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
