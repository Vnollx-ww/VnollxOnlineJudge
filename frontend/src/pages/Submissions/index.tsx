import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Table, Input, Button, Tag, Pagination, Switch, Select } from 'antd';
import toast from 'react-hot-toast';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Maximize2, Minimize2 } from 'lucide-react';
import api from '../../utils/api';
import { isAuthenticated, getUserInfo, setUserInfo } from '../../utils/auth';
import { useJudgeWebSocket } from '../../hooks/useJudgeWebSocket';
import type { ApiResponse, JudgeMessage } from '../../types';

interface Submission {
  id: number;
  snowflakeId: string;
  pid: number;
  problemName: string;
  userName: string;
  language: string;
  status: string;
  time: number | null;
  memory: number | null;
  createTime: string;
  code?: string;
  errorInfo?: string;
}

const Submissions: React.FC = () => {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [problemId, setProblemId] = useState('');
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [language, setLanguage] = useState<string | undefined>(undefined);
  const [onlyMine, setOnlyMine] = useState(false);
  const [codeModalVisible, setCodeModalVisible] = useState(false);
  const [currentCode, setCurrentCode] = useState('');
  const [currentLang, setCurrentLang] = useState('');
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [currentErrorInfo, setCurrentErrorInfo] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const pageSize = 15;
  const currentPageRef = useRef(currentPage);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleWebSocketMessage = useCallback((msg: JudgeMessage) => {
    const wsMsg = msg as unknown as { snowflakeId: string; status: string; time: number; memory: number };
    if (!wsMsg || !wsMsg.snowflakeId) return;

    setSubmissions((prev) =>
      prev.map((item) => {
        if (String(item.snowflakeId) === String(wsMsg.snowflakeId)) {
          return {
            ...item,
            status: wsMsg.status,
            time: wsMsg.time,
            memory: wsMsg.memory,
          };
        }
        return item;
      })
    );

    if (wsMsg.status !== '评测中') {
      setTimeout(() => {
        loadSubmissions(currentPageRef.current);
      }, 500);
    }
  }, []);

  useJudgeWebSocket(handleWebSocketMessage);

  useEffect(() => {
    if (!isAuthenticated()) {
      toast.error('请先登录！');
      navigate('/');
      return;
    }
    setCurrentPage(1);
    loadSubmissions(1);
  }, [onlyMine, problemId, status, language]);

  const loadSubmissions = async (page: number) => {
    setLoading(true);
    try {
      let currentUid: string | null = null;
      if (onlyMine) {
        const userInfo = getUserInfo();
        if (userInfo?.id) {
          currentUid = userInfo.id;
        } else {
          try {
            const res = await api.get('/user/profile') as ApiResponse<{ id: string; name: string; identity: string }>;
            if (res.code === 200) {
              setUserInfo({ id: res.data.id, name: res.data.name, identity: res.data.identity });
              currentUid = res.data.id;
            }
          } catch (e) {
            console.error('获取用户信息失败', e);
          }
        }
      }

      const params: Record<string, string> = {
        pageNum: String(page),
        pageSize: String(pageSize),
      };
      if (problemId) params.keyword = problemId;
      if (status) params.status = status;
      if (language) params.language = language;
      if (currentUid) params.uid = currentUid;

      const data = await api.get('/submission/list', { params }) as ApiResponse<Submission[]>;
      if (data.code === 200) {
        setSubmissions(data.data || []);
      }

      const countParams: Record<string, string> = {};
      if (problemId) countParams.keyword = problemId;
      if (status) countParams.status = status;
      if (language) countParams.language = language;
      if (currentUid) countParams.uid = currentUid;

      const countData = await api.get('/submission/count', { params: countParams }) as ApiResponse<number>;
      if (countData.code === 200) {
        setTotal(countData.data || 0);
      }
    } catch (error) {
      toast.error('加载提交记录失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };


  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadSubmissions(page);
  };

  const getStatusStyle = (status: string) => {
    const statusMap: Record<string, { color: string; bg: string }> = {
      '答案正确': { color: 'var(--gemini-success)', bg: 'var(--gemini-success-bg)' },
      '答案错误': { color: 'var(--gemini-error)', bg: 'var(--gemini-error-bg)' },
      '超时': { color: 'var(--gemini-warning)', bg: 'var(--gemini-warning-bg)' },
      '时间超出限制': { color: 'var(--gemini-warning)', bg: 'var(--gemini-warning-bg)' },
      '内存超限': { color: 'var(--gemini-warning)', bg: 'var(--gemini-warning-bg)' },
      '内存超出限制': { color: 'var(--gemini-warning)', bg: 'var(--gemini-warning-bg)' },
      '运行时错误': { color: 'var(--gemini-error)', bg: 'var(--gemini-error-bg)' },
      '运行错误': { color: 'var(--gemini-error)', bg: 'var(--gemini-error-bg)' },
      '编译错误': { color: 'var(--gemini-error)', bg: 'var(--gemini-error-bg)' },
      '等待中': { color: 'var(--gemini-info)', bg: 'var(--gemini-info-bg)' },
      '评测中': { color: 'var(--gemini-info)', bg: 'var(--gemini-info-bg)' },
    };
    return statusMap[status] || { color: 'var(--gemini-text-secondary)', bg: 'var(--gemini-surface-hover)' };
  };

  const getLanguageColor = (lang: string) => {
    const langMap: Record<string, string> = {
      Python: 'blue',
      Java: 'orange',
      'C++': 'purple',
      C: 'cyan',
      JavaScript: 'green',
    };
    return langMap[lang] || 'default';
  };

  const columns = [
    {
      title: '提交ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (id: number, record: Submission) => (
        <button
          onClick={() => {
            setCurrentCode(record.code || '（无代码）');
            setCurrentLang(record.language || 'plaintext');
            setCodeModalVisible(true);
          }}
          className="font-mono transition-colors"
          style={{ color: 'var(--gemini-accent-strong)' }}
        >
          {id}
        </button>
      ),
    },
    {
      title: '题目',
      key: 'problem',
      render: (_: unknown, record: Submission) => (
        <button
          onClick={() => navigate(`/problem/${record.pid}`)}
          className="text-left transition-colors"
          style={{ color: 'var(--gemini-text-primary)' }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--gemini-accent-strong)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--gemini-text-primary)'}
        >
          #{record.pid} - {record.problemName || '未知题目'}
        </button>
      ),
    },
    {
      title: '用户',
      dataIndex: 'userName',
      key: 'userName',
      width: 150,
      render: (name: string) => <span style={{ color: 'var(--gemini-text-secondary)' }}>{name}</span>,
    },
    {
      title: '语言',
      dataIndex: 'language',
      key: 'language',
      width: 120,
      render: (lang: string) => <Tag color={getLanguageColor(lang)}>{lang}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status: string, record: Submission) => {
        const style = getStatusStyle(status);
        const hasError = status === '编译错误' && record.errorInfo;
        return (
          <span 
            className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${hasError ? 'cursor-pointer hover:opacity-80' : ''}`}
            style={{ backgroundColor: style.bg, color: style.color }}
            onClick={() => {
              if (hasError) {
                setCurrentErrorInfo(record.errorInfo || '');
                setErrorModalVisible(true);
              }
            }}
            title={hasError ? '点击查看错误详情' : undefined}
          >
            {status}
            {hasError && <span className="ml-1">🔍</span>}
          </span>
        );
      },
    },
    {
      title: '时间',
      dataIndex: 'createTime',
      key: 'submitTime',
      width: 180,
      render: (time: string) => {
        if (!time) return '-';
        return <span className="text-sm" style={{ color: 'var(--gemini-text-disabled)' }}>{new Date(time).toLocaleString('zh-CN')}</span>;
      },
    },
    {
      title: '运行时间',
      dataIndex: 'time',
      key: 'runTime',
      width: 120,
      align: 'center' as const,
      render: (ms: number | null) => (
        <span style={{ color: 'var(--gemini-text-secondary)' }}>{ms != null ? `${ms} ms` : '-'}</span>
      ),
    },
    {
      title: '运行内存',
      dataIndex: 'memory',
      key: 'memory',
      width: 120,
      align: 'center' as const,
      render: (mem: number | null) => (
        <span style={{ color: 'var(--gemini-text-secondary)' }}>{mem != null ? `${mem} MB` : '-'}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div 
        className="rounded-3xl p-6"
        style={{ backgroundColor: 'var(--gemini-surface)', boxShadow: 'var(--shadow-gemini)' }}
      >
        <h1 className="text-2xl font-semibold mb-6" style={{ color: 'var(--gemini-text-primary)' }}>提交记录</h1>

        {/* 筛选栏 */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="题目标题或ID"
              value={problemId}
              onChange={(e) => setProblemId(e.target.value)}
              className="w-40"
            />
            <Select
              placeholder="状态"
              value={status}
              onChange={setStatus}
              className="w-40"
              allowClear
            >
              <Select.Option value="答案正确">答案正确</Select.Option>
              <Select.Option value="答案错误">答案错误</Select.Option>
              <Select.Option value="时间超出限制">时间超出限制</Select.Option>
              <Select.Option value="内存超出限制">内存超出限制</Select.Option>
              <Select.Option value="运行时错误">运行时错误</Select.Option>
              <Select.Option value="编译错误">编译错误</Select.Option>
            </Select>
            <Select
              placeholder="语言"
              value={language}
              onChange={setLanguage}
              className="w-32"
              allowClear
            >
              <Select.Option value="Python">Python</Select.Option>
              <Select.Option value="Java">Java</Select.Option>
              <Select.Option value="C++">C++</Select.Option>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                setProblemId('');
                setStatus(undefined);
                setLanguage(undefined);
                setOnlyMine(false);
              }}
            >
              重置
            </Button>
            <span className="text-sm" style={{ color: 'var(--gemini-text-secondary)' }}>仅看自己</span>
            <Switch checked={onlyMine} onChange={setOnlyMine} />
          </div>
        </div>

        {/* 表格 */}
        <Table
          columns={columns}
          dataSource={submissions}
          loading={loading}
          rowKey="id"
          pagination={false}
        />

        {/* 分页 */}
        <div className="flex justify-center mt-6">
          <Pagination
            current={currentPage}
            total={total}
            pageSize={pageSize}
            onChange={handlePageChange}
            showSizeChanger={false}
            showQuickJumper
            showTotal={(total) => <span style={{ color: 'var(--gemini-text-secondary)' }}>共 {total} 条记录</span>}
          />
        </div>
      </div>

      {/* 代码查看模态框 */}
      <Modal
        title="代码查看"
        open={codeModalVisible}
        onCancel={() => {
          setCodeModalVisible(false);
          setIsFullscreen(false);
        }}
        footer={null}
        width={isFullscreen ? '100vw' : '80%'}
        style={isFullscreen ? { top: 0, maxWidth: '100vw', paddingBottom: 0 } : undefined}
      >
        <div className="flex gap-2 mb-4">
          <Button
            icon={<Copy className="w-4 h-4" />}
            onClick={() => {
              navigator.clipboard.writeText(currentCode).then(() => {
                toast.success('代码已复制到剪贴板');
              });
            }}
          >
            复制代码
          </Button>
          <Button
            icon={isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
                setIsFullscreen(true);
              } else {
                document.exitFullscreen();
                setIsFullscreen(false);
              }
            }}
          >
            {isFullscreen ? '退出全屏' : '全屏查看'}
          </Button>
        </div>
        <div className="max-h-[70vh] overflow-auto rounded-xl">
          <SyntaxHighlighter
            language={currentLang.toLowerCase() === 'c++' ? 'cpp' : currentLang.toLowerCase()}
            style={vscDarkPlus}
            showLineNumbers
            customStyle={{ margin: 0, borderRadius: 12, fontSize: 14 }}
          >
            {currentCode}
          </SyntaxHighlighter>
        </div>
      </Modal>

      {/* 编译错误详情模态框 */}
      <Modal
        title="编译错误详情"
        open={errorModalVisible}
        onCancel={() => setErrorModalVisible(false)}
        footer={null}
        width="60%"
      >
        <div className="max-h-[70vh] overflow-auto">
          <pre 
            className="p-4 rounded-xl text-sm font-mono whitespace-pre-wrap"
            style={{ 
              backgroundColor: 'var(--gemini-error-bg)', 
              color: 'var(--gemini-error)',
              border: '1px solid var(--gemini-error)'
            }}
          >
            {currentErrorInfo || '无错误信息'}
          </pre>
        </div>
      </Modal>
    </div>
  );
};

export default Submissions;
