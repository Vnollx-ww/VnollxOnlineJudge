import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Typography,
  Tag,
  Button,
  Spin,
  Space,
  Divider,
  Select,
  Alert,
  Input,
  Avatar,
  Popconfirm,
} from 'antd';
import toast from 'react-hot-toast';
import { 
  ArrowLeftOutlined, 
  CodeOutlined, 
  CommentOutlined, 
  FullscreenOutlined, 
  FullscreenExitOutlined, 
  CopyOutlined 
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import 'highlight.js/styles/github.css';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import api from '../../utils/api';
import { getUserInfo, isAuthenticated } from '../../utils/auth';
import { useJudgeWebSocket } from '../../hooks/useJudgeWebSocket';
import CodeEditor from '../../components/CodeEditor';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface Problem {
  id: number;
  title: string;
  description: string;
  inputFormat?: string;
  outputFormat?: string;
  inputExample?: string;
  outputExample?: string;
  hint?: string;
  difficulty?: string;
  timeLimit?: number;
  memoryLimit?: number;
  submitCount: number;
  passCount: number;
}

interface Comment {
  id: number;
  userId: number;
  username: string;
  content: string;
  createTime: string;
  subcommentList?: Comment[];
  children?: Comment[];
}

interface TestResult {
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
  detail?: string;
}

const languageOptions = [
  {
    label: 'C++',
    value: 'cpp',
    template: `#include <iostream>
// 注意：本平台禁止使用 #include <bits/stdc++.h>
// 请根据需要自行包含标准库头文件
using namespace std;

int main() {

    // 请在此处编写你的代码

    return 0;
}
`,
  },
  {
    label: 'Python 3',
    value: 'python',
    template: `# 请在此处编写你的代码
def main():
    pass

if __name__ == "__main__":
    main()
`,
  },
  {
    label: 'Java',
    value: 'java',
    template: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws Exception {
        // 请在此处编写你的代码
    }
}
`,
  },
];

const getDifficultyColor = (difficulty?: string) => {
  switch (difficulty?.toLowerCase()) {
    case '简单':
      return 'green';
    case '中等':
      return 'orange';
    case '困难':
      return 'red';
    default:
      return 'default';
  }
};

const CompetitionProblemDetail: React.FC = () => {
  const { cid, id } = useParams<{ cid: string; id: string }>();
  const navigate = useNavigate();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [_tags, _setTags] = useState<string[]>([]);
  const [language, setLanguage] = useState(languageOptions[0].value);
  const [code, setCode] = useState(languageOptions[0].template);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [submitResult, setSubmitResult] = useState<TestResult | null>(null);
  const [codeLoading, setCodeLoading] = useState({ test: false, submit: false });
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [replyTarget, setReplyTarget] = useState<Comment | null>(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [isCompetitionOpen, setIsCompetitionOpen] = useState(true);
  const [isCompetitionEnd, setIsCompetitionEnd] = useState(false);
  const [currentSnowflakeId, setCurrentSnowflakeId] = useState<string | null>(null);
  const [isEditorFullscreen, setIsEditorFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsEditorFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const userInfo = getUserInfo();

  const handleWebSocketMessage = useCallback((msg: any) => {
    if (msg && currentSnowflakeId && String(msg.snowflakeId) === String(currentSnowflakeId)) {
      const status = msg.status || '未知状态';
      let type: 'success' | 'warning' | 'error' | 'info' = 'info';
      if (status === '答案正确') type = 'success';
      else if (status === '评测中') type = 'info';
      else if (status === '编译错误') type = 'warning';
      else type = 'error';

      let detail = '';
      if (msg.status === '评测中') {
        detail = '正在进行评测...';
      } else {
        detail = `运行时间: ${msg.time || 0}ms, 内存: ${msg.memory || 0}MB`;
      }

      setSubmitResult({ type, message: status, detail });

      if (status !== '评测中') {
        window.dispatchEvent(new Event('notification-updated'));
      }
    }
  }, [currentSnowflakeId]);

  useJudgeWebSocket(handleWebSocketMessage);

  const renderLatex = useCallback((text: string) => {
    text = text.replace(/\$\$([\s\S]+?)\$\$/g, (match, formula) => {
      try {
        return katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false });
      } catch {
        return match;
      }
    });
    text = text.replace(/\$([^\$\n]+?)\$/g, (match, formula) => {
      try {
        return katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false });
      } catch {
        return match;
      }
    });
    return text;
  }, []);

  const renderMarkdown = useCallback((content: string, fallback = '暂无内容') => {
    const raw = content && content.trim() ? content : fallback;
    const withLatex = renderLatex(raw);
    return DOMPurify.sanitize(marked.parse(withLatex) as string);
  }, [renderLatex]);

  useEffect(() => {
    if (!isAuthenticated()) {
      toast.error('请先登录！');
      navigate('/');
      return;
    }
    loadProblem();
    loadCompetitionStatus();
  }, [id, navigate]);

  useEffect(() => {
    if (problem?.id && !isCompetitionOpen) {
      loadComments(problem.id);
    }
  }, [problem?.id, isCompetitionOpen]);

  useEffect(() => {
    const template = languageOptions.find((item) => item.value === language)?.template || languageOptions[0].template;
    setCode(template);
  }, [language]);

  const codeStorageKey = useMemo(() => {
    const pid = problem?.id ?? id;
    if (!pid || !cid) return undefined;
    return `oj:code:competition:${cid}:problem:${pid}:${language}`;
  }, [problem?.id, id, cid, language]);

  const loadProblem = async () => {
    setLoading(true);
    try {
      const data = await api.get('/problem/get', { params: { id } });
      if (data.code === 200) {
        setProblem(data.data);
      } else {
        toast.error(data.msg || '加载题目失败');
      }
    } catch {
      toast.error('加载题目失败');
    } finally {
      setLoading(false);
    }
  };

  const loadCompetitionStatus = async () => {
    try {
      const now = dayjs().format("YYYY-MM-DD HH:mm:ss");
      const openRes = await api.post("/competition/judgeIsOpen", { now, id: cid });
      setIsCompetitionOpen(openRes.code === 200);

      const endRes = await api.post("/competition/judgeIsEnd", { now, id: cid });
      setIsCompetitionEnd(endRes.code !== 200);
    } catch (err) {
      console.warn("比赛状态判断失败", err);
    }
  };

  const formatComments = (list: Comment[] = []): Comment[] =>
    list.map((item) => ({
      ...item,
      children: formatComments(item.subcommentList || []),
    }));

  const loadComments = async (pid: number) => {
    setCommentLoading(true);
    try {
      const data = await api.get('/comment/list', { params: { pid } });
      if (data.code === 200) {
        setComments(formatComments(data.data || []));
      }
    } catch {
      toast.error('加载评论失败');
    } finally {
      setCommentLoading(false);
    }
  };

  const infoItems = useMemo(() => {
    const submitCount = problem?.submitCount ?? 0;
    const passCount = problem?.passCount ?? 0;

    return [
      { label: '时间限制', value: problem?.timeLimit ? `${problem.timeLimit} ms` : '无限制' },
      { label: '内存限制', value: problem?.memoryLimit ? `${problem.memoryLimit} MB` : '无限制' },
      { label: '提交', value: submitCount },
      { label: '通过', value: passCount },
      {
        label: '通过率',
        value: submitCount > 0 ? `${Math.round((passCount / submitCount) * 10000) / 100}%` : '0%',
      },
    ];
  }, [problem]);

  const handleTestCode = async () => {
    if (!code.trim()) {
      toast('请先输入代码', { icon: '⚠️' });
      return;
    }
    if (!problem?.inputExample || !problem?.outputExample) {
      toast('该题目没有提供样例，无法测试', { icon: '⚠️' });
      return;
    }
    setCodeLoading((prev) => ({ ...prev, test: true }));
    setTestResult(null);
    try {
      const payload = {
        code,
        option: language,
        pid: String(problem.id),
        inputExample: problem.inputExample,
        outputExample: problem.outputExample,
        time: String(problem.timeLimit || 1000),
        memory: String(problem.memoryLimit || 256),
      };
      const data = await api.post('/judge/test', payload);
      if (data.code === 200) {
        setTestResult({
          type: data.data.status === '答案正确' ? 'success' : 'warning',
          message: data.data.status || '测试完成',
          detail: data.data.errorInfo,
        });
      } else {
        setTestResult({ type: 'error', message: data.msg || '测试失败' });
      }
    } catch (error: any) {
      setTestResult({
        type: 'error',
        message: error?.response?.data?.msg || '测试失败，请稍后重试',
      });
    } finally {
      setCodeLoading((prev) => ({ ...prev, test: false }));
    }
  };

  const handleSubmitCode = async () => {
    if (!code.trim()) {
      toast('请先输入代码', { icon: '⚠️' });
      return;
    }
    setCodeLoading((prev) => ({ ...prev, submit: true }));
    setSubmitResult(null);
    try {
      const payload = {
        code,
        title: problem?.title,
        option: language,
        pid: String(problem?.id),
        uname: userInfo?.name,
        cid: cid,
        create_time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        time: String(problem?.timeLimit || 1000),
        memory: String(problem?.memoryLimit || 256),
      };
      const data = await api.post('/judge/submit', payload);
      if (data.code === 200) {
        if (data.data.snowflakeId) {
          setCurrentSnowflakeId(data.data.snowflakeId);
        }
        setSubmitResult({
          type: 'info',
          message: '等待评测',
          detail: '已提交，等待评测...',
        });
        window.dispatchEvent(new Event('notification-updated'));
      } else {
        setSubmitResult({ type: 'error', message: data.msg || '提交失败' });
      }
    } catch (error: any) {
      setSubmitResult({
        type: 'error',
        message: error?.response?.data?.msg || '提交失败，请稍后重试',
      });
    } finally {
      setCodeLoading((prev) => ({ ...prev, submit: false }));
    }
  };

  const handleSubmitComment = async () => {
    if (!commentContent.trim()) {
      toast('请输入评论内容', { icon: '⚠️' });
      return;
    }
    if (!userInfo?.id) {
      toast.error('请先登录后再发表评论');
      return;
    }
    setCommentSubmitting(true);
    try {
      const payload = {
        problemId: Number(problem?.id),
        parentId: replyTarget?.id || null,
        receiveUserId: replyTarget?.userId || null,
        username: userInfo.name,
        content: commentContent.trim(),
        createTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      };
      const data = await api.post('/comment/publish', payload);
      if (data.code === 200) {
        toast.success('发布成功');
        setCommentContent('');
        setReplyTarget(null);
        loadComments(problem!.id);
      } else {
        toast.error(data.msg || '发布失败');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.msg || '发布失败，请稍后重试');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      const data = await api.delete('/comment/delete', { params: { commentId } });
      if (data.code === 200) {
        toast.success('删除成功');
        loadComments(problem!.id);
      } else {
        toast.error(data.msg || '删除失败');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.msg || '删除失败，请稍后重试');
    }
  };

  const renderComments = (items: Comment[] = []) =>
    items.map((item) => (
      <div className="border-l-2 border-gray-200 pl-4 py-3" key={item.id}>
        <div className="flex items-center justify-between mb-2">
          <Space size="middle">
            <Avatar className="!bg-blue-600">
              {item.username?.charAt(0)?.toUpperCase() || 'U'}
            </Avatar>
            <div>
              <span className="font-medium">{item.username}</span>
              <span className="text-gray-400 text-xs ml-2">
                {dayjs(item.createTime).format('YYYY-MM-DD HH:mm')}
              </span>
            </div>
          </Space>
          <Space size="small">
            <Button type="link" size="small" onClick={() => setReplyTarget(item)}>
              回复
            </Button>
            {userInfo?.id && String(userInfo.id) === String(item.userId) && (
              <Popconfirm
                title="确定删除该评论？"
                onConfirm={() => handleDeleteComment(item.id)}
              >
                <Button type="link" size="small" danger>
                  删除
                </Button>
              </Popconfirm>
            )}
          </Space>
        </div>
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(item.content) }}
        />
        {item.children?.length ? (
          <div className="mt-3">{renderComments(item.children)}</div>
        ) : null}
      </div>
    ));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <Spin size="large" />
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <Card className="!rounded-2xl !shadow-lg">题目不存在</Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-5xl mx-auto">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/competition/${cid}`)}
          className="!mb-4"
        >
          返回比赛题目列表
        </Button>

        <Space direction="vertical" size="large" className="w-full">
          {/* 题目信息卡片 */}
          <Card className="!rounded-2xl !shadow-lg !border-0">
            <div className="mb-6">
              <Title level={2} className="!mb-2">
                #{problem.id} - {problem.title}
              </Title>
              <div className="flex items-center gap-4 text-gray-500">
                <Tag color={getDifficultyColor(problem.difficulty)}>
                  {problem.difficulty}
                </Tag>
                <span>提交: {problem.submitCount}</span>
                <span>通过: {problem.passCount}</span>
                <span>
                  通过率: {problem.submitCount > 0
                    ? Math.round((problem.passCount / problem.submitCount) * 10000) / 100
                    : 0}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-4 mb-6">
              {infoItems.map((item) => (
                <div className="bg-gray-50 rounded-xl p-4 text-center" key={item.label}>
                  <Text type="secondary" className="text-xs">{item.label}</Text>
                  <Title level={4} className="!mb-0 !mt-1">{item.value}</Title>
                </div>
              ))}
            </div>

            <Divider />

            <div className="mb-6">
              <Title level={4}>题目描述</Title>
              <div
                className="prose prose-blue max-w-none"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(problem.description) }}
              />
            </div>

            <div className="mb-6">
              <Title level={4}>输入格式</Title>
              <div
                className="prose prose-blue max-w-none"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(problem.inputFormat || '', '暂无输入格式说明') }}
              />
            </div>

            <div className="mb-6">
              <Title level={4}>输出格式</Title>
              <div
                className="prose prose-blue max-w-none"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(problem.outputFormat || '', '暂无输出格式说明') }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <Title level={5} className="!mb-0">输入样例</Title>
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => {
                      navigator.clipboard.writeText(problem.inputExample || '');
                      toast.success('已复制输入样例');
                    }}
                  >
                    复制
                  </Button>
                </div>
                <pre className="bg-white p-3 rounded-lg overflow-auto text-sm font-mono">
                  {problem.inputExample || '暂无输入样例'}
                </pre>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <Title level={5} className="!mb-0">输出样例</Title>
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => {
                      navigator.clipboard.writeText(problem.outputExample || '');
                      toast.success('已复制输出样例');
                    }}
                  >
                    复制
                  </Button>
                </div>
                <pre className="bg-white p-3 rounded-lg overflow-auto text-sm font-mono">
                  {problem.outputExample || '暂无输出样例'}
                </pre>
              </div>
            </div>

            {problem.hint && (
              <div>
                <Title level={4}>提示</Title>
                <div
                  className="prose prose-blue max-w-none"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(problem.hint, '暂无提示') }}
                />
              </div>
            )}
          </Card>

          {/* 代码编辑器卡片 */}
          <Card
            className="!rounded-2xl !shadow-lg !border-0"
            title={
              <Space>
                <CodeOutlined />
                <span>在线代码编辑器</span>
              </Space>
            }
          >
            <div className="flex items-center justify-between mb-4">
              <Space size="small" wrap>
                <Select
                  value={language}
                  onChange={setLanguage}
                  className="w-40"
                >
                  {languageOptions.map((option) => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
                <Button
                  type="link"
                  onClick={() => {
                    const template = languageOptions.find((item) => item.value === language)?.template || '';
                    setCode(template);
                  }}
                >
                  重置模板
                </Button>
              </Space>
              <Button
                icon={isEditorFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                onClick={() => {
                  if (!isEditorFullscreen) {
                    document.documentElement.requestFullscreen();
                    setIsEditorFullscreen(true);
                  } else {
                    document.exitFullscreen();
                    setIsEditorFullscreen(false);
                  }
                }}
              >
                {isEditorFullscreen ? '退出全屏' : '全屏编辑'}
              </Button>
            </div>

            {language === 'java' && (
              <Alert
                message="暂不支持用Java提交，请等待"
                type="info"
                showIcon
                className="!mb-4"
              />
            )}

            {isEditorFullscreen && createPortal(
              <div className="fixed inset-0 z-[99999] bg-white">
                <Button
                  icon={<FullscreenExitOutlined />}
                  onClick={() => {
                    document.exitFullscreen();
                    setIsEditorFullscreen(false);
                  }}
                  className="absolute bottom-4 right-6 z-[100000]"
                >
                  退出全屏
                </Button>
                <CodeEditor
                  value={code}
                  onChange={setCode}
                  language={language}
                  height="100vh"
                  storageKey={codeStorageKey}
                />
              </div>,
              document.body
            )}

            {!isEditorFullscreen && (
              <CodeEditor
                value={code}
                onChange={setCode}
                language={language}
                height={420}
                storageKey={codeStorageKey}
              />
            )}

            <div className="mt-4">
              <Space>
                <Button
                  type="primary"
                  loading={codeLoading.test}
                  onClick={handleTestCode}
                  disabled={isCompetitionEnd || language === 'java'}
                >
                  {isCompetitionEnd ? "比赛已结束" : "测试样例"}
                </Button>
                <Button
                  type="primary"
                  loading={codeLoading.submit}
                  onClick={handleSubmitCode}
                  disabled={isCompetitionEnd || language === 'java'}
                >
                  {isCompetitionEnd ? "比赛已结束" : "提交评测"}
                </Button>
              </Space>
            </div>

            {(testResult || submitResult) && (
              <div className="mt-4 space-y-2">
                {testResult && (
                  <Alert
                    type={testResult.type}
                    message={`测试结果：${testResult.message}`}
                    description={testResult.detail}
                    showIcon
                    closable
                    onClose={() => setTestResult(null)}
                  />
                )}
                {submitResult && (
                  <Alert
                    type={submitResult.type}
                    message={`提交结果：${submitResult.message}`}
                    description={<div className="whitespace-pre-wrap">{submitResult.detail}</div>}
                    showIcon
                    closable
                    onClose={() => setSubmitResult(null)}
                  />
                )}
              </div>
            )}
          </Card>

          {/* 评论区 - 仅比赛结束后显示 */}
          {!isCompetitionOpen && (
            <Card
              className="!rounded-2xl !shadow-lg !border-0"
              title={
                <Space>
                  <CommentOutlined />
                  <span>评论讨论</span>
                  <Tag color="blue">{comments.length}</Tag>
                </Space>
              }
            >
              <div className="mb-4">
                {replyTarget && (
                  <div className="bg-blue-50 px-3 py-2 rounded-lg mb-2 flex items-center justify-between">
                    <span>回复 @{replyTarget.username}</span>
                    <Button type="link" size="small" onClick={() => setReplyTarget(null)}>
                      取消
                    </Button>
                  </div>
                )}
                <TextArea
                  rows={4}
                  placeholder="分享你的想法、解题思路或遇到的问题..."
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  maxLength={500}
                  className="!rounded-lg"
                />
                <div className="flex items-center justify-between mt-2">
                  <Text type="secondary">{commentContent.length}/500</Text>
                  <Button
                    type="primary"
                    onClick={handleSubmitComment}
                    loading={commentSubmitting}
                  >
                    发表评论
                  </Button>
                </div>
              </div>
              <Divider />
              <div>
                {commentLoading ? (
                  <Spin />
                ) : comments.length ? (
                  renderComments(comments)
                ) : (
                  <Text type="secondary">还没有评论，快来抢沙发吧！</Text>
                )}
              </div>
            </Card>
          )}
        </Space>
      </div>
    </div>
  );
};

export default CompetitionProblemDetail;

