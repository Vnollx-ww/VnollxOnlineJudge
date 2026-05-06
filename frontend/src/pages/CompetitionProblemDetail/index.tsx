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
  Avatar,
  Popconfirm,
} from 'antd';
import toast from 'react-hot-toast';
import Select from '../../components/Select';
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
import { copyTextToClipboard } from '../../utils/clipboard';
import { getUserInfo, isAuthenticated } from '../../utils/auth';
import { useJudgeWebSocket } from '../../hooks/useJudgeWebSocket';
import CodeEditor from '../../components/CodeEditor';
import { Input, JudgeOutcomeCard, mapJudgeStatusToVariant } from '../../components';
import type { JudgeOutcomeData } from '../../components';
import SuccessCelebration from '../../components/SuccessCelebration';
import type { JudgeMessage } from '../../types';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface ProblemExampleItem {
  id?: number;
  input: string;
  output: string;
  sortOrder?: number;
}

interface Problem {
  id: number;
  title: string;
  description: string;
  inputFormat?: string;
  outputFormat?: string;
  examples?: ProblemExampleItem[];
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

const languageOptions = [
  {
    label: 'C++',
    value: 'cpp',
    template: `#include <bits/stdc++.h>
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
  const [, /* tags */ setTags] = useState<string[]>([]);
  void setTags; // Reserved for future use
  const [language, setLanguage] = useState(languageOptions[0].value);
  const [code, setCode] = useState(languageOptions[0].template);
  const [testResult, setTestResult] = useState<JudgeOutcomeData | null>(null);
  const [submitResult, setSubmitResult] = useState<JudgeOutcomeData | null>(null);
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
  const [showCelebration, setShowCelebration] = useState(false);

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

  const handleWebSocketMessage = useCallback((msg: JudgeMessage) => {
    if (msg && currentSnowflakeId && String(msg.snowflakeId) === String(currentSnowflakeId)) {
      const status = msg.status || '未知状态';
      if (status === '评测中') {
        setSubmitResult({
          variant: 'info',
          source: 'submit',
          headline: status,
          bodyText: '正在进行评测...',
        });
      } else {
        const hasTests = msg.testCount != null && msg.testCount > 0;
        setSubmitResult({
          variant: mapJudgeStatusToVariant(String(status)),
          source: 'submit',
          headline: String(status),
          metrics: {
            timeMs: msg.time ?? 0,
            memoryMb: msg.memory ?? 0,
            ...(hasTests ? { passCount: msg.passCount ?? 0, testCount: msg.testCount! } : {}),
          },
          errorInfo: msg.errorInfo || undefined,
        });
      }

      // 答案正确时触发庆祝动画
      if (status === '答案正确') {
        setShowCelebration(true);
      }

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
    text = text.replace(/\$([^$\n]+?)\$/g, (match, formula) => {
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

  /** 当前选中的样例 Tab 索引 */
  const [activeExampleTab, setActiveExampleTab] = useState(0);
  /** 记录每个样例是否被修改过（用于显示"自定义"标识） */
  const [modifiedExamples, setModifiedExamples] = useState<Record<number, boolean>>({});

  // 当前选中的样例（用于测试）
  const currentExample = useMemo(() => {
    if (problem?.examples?.length && activeExampleTab < problem.examples.length) {
      return { 
        input: problem.examples[activeExampleTab].input, 
        output: problem.examples[activeExampleTab].output,
        index: activeExampleTab
      };
    }
    return null;
  }, [problem?.examples, activeExampleTab]);

  const [exampleInputs, setExampleInputs] = useState<Record<number, string>>({});
  const normalizeTestText = useCallback((text?: string | null) => (text ?? '').replace(/\r\n/g, '\n').trim(), []);
  const currentTestInput = exampleInputs[activeExampleTab] ?? '';
  const matchedExample = useMemo(() => {
    if (!problem?.examples?.length) {
      return null;
    }
    const normalizedInput = normalizeTestText(currentTestInput);
    return problem.examples.find((example) => normalizeTestText(example.input) === normalizedInput) ?? null;
  }, [currentTestInput, problem?.examples, normalizeTestText]);

  // 判断当前输入是否为自定义（与当前选中的样例不同）
  const isCustomTest = useMemo(() => {
    if (!problem?.examples?.length || !currentExample) return false;
    return normalizeTestText(currentTestInput) !== normalizeTestText(currentExample.input);
  }, [currentTestInput, currentExample, problem?.examples?.length, normalizeTestText]);

  // 题目变化时，重置所有状态
  useEffect(() => {
    if (problem?.examples?.length) {
      setExampleInputs(
        problem.examples.reduce<Record<number, string>>((acc, example, index) => {
          acc[index] = example.input || '';
          return acc;
        }, {})
      );
      setActiveExampleTab(0);
      setModifiedExamples({});
    } else {
      setExampleInputs({});
    }
  }, [problem?.id]);

  // 切换样例 Tab 时保留各自输入内容
  const handleExampleTabChange = useCallback((index: number) => {
    if (!problem?.examples?.length) return;
    setActiveExampleTab(index);
  }, [problem?.examples]);

  // 输入内容变化时，检查是否被修改
  const handleTestInputChange = useCallback((value: string) => {
    setExampleInputs((prev) => ({ ...prev, [activeExampleTab]: value }));
    // 检查当前输入是否与当前样例原始输入不同
    if (currentExample && normalizeTestText(value) !== normalizeTestText(currentExample.input)) {
      setModifiedExamples(prev => ({ ...prev, [activeExampleTab]: true }));
    } else {
      setModifiedExamples(prev => ({ ...prev, [activeExampleTab]: false }));
    }
  }, [currentExample, activeExampleTab, normalizeTestText]);

  const handleResetCurrentExample = useCallback(() => {
    if (!currentExample) return;
    setExampleInputs((prev) => ({
      ...prev,
      [activeExampleTab]: currentExample.input || '',
    }));
    setModifiedExamples((prev) => ({ ...prev, [activeExampleTab]: false }));
  }, [currentExample, activeExampleTab]);

  const handleTestCode = async () => {
    if (!code.trim()) {
      toast('请先输入代码', { icon: '⚠️' });
      return;
    }
    if (!currentExample?.output) {
      toast('该题目没有提供样例，无法测试', { icon: '⚠️' });
      return;
    }
    setCodeLoading((prev) => ({ ...prev, test: true }));
    setTestResult(null);
    try {
      const payload = {
        code,
        option: language,
        pid: String(problem!.id),
        inputExample: currentTestInput,
        outputExample: matchedExample?.output ?? currentExample.output,
        time: String(problem!.timeLimit || 1000),
        memory: String(problem!.memoryLimit || 256),
        customTest: isCustomTest,
      };
      const data = await api.post('/judge/test', payload);
      if (data.code === 200) {
        if (isCustomTest) {
          setTestResult({
            variant: 'info',
            source: 'test',
            headline: '自定义测试完成',
            bodyText: `程序输出:\n${data.data.actualOutput || '无输出'}`,
          });
        } else {
          const hasTests = data.data.testCount != null && data.data.testCount > 0;
          setTestResult({
            variant: data.data.status === '答案正确' ? 'success' : 'warning',
            source: 'test',
            headline: data.data.status || '测试完成',
            metrics: hasTests
              ? { passCount: data.data.passCount ?? 0, testCount: data.data.testCount! }
              : undefined,
            errorInfo: data.data.errorInfo || undefined,
          });
        }
      } else {
        setTestResult({
          variant: 'error',
          source: 'test',
          headline: data.msg || '测试失败',
        });
      }
    } catch (error: any) {
      setTestResult({
        variant: 'error',
        source: 'test',
        headline: error?.response?.data?.msg || '测试失败，请稍后重试',
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
          variant: 'info',
          source: 'submit',
          headline: '等待评测',
          bodyText: '已提交，等待评测...',
        });
        window.dispatchEvent(new Event('notification-updated'));
      } else {
        setSubmitResult({
          variant: 'error',
          source: 'submit',
          headline: data.msg || '提交失败',
        });
      }
    } catch (error: any) {
      setSubmitResult({
        variant: 'error',
        source: 'submit',
        headline: error?.response?.data?.msg || '提交失败，请稍后重试',
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
    <div className="space-y-6">
      <div className="w-full">
        <Space direction="vertical" size="large" className="w-full">
          {/* 题目信息卡片 */}
          <Card className="!rounded-2xl !shadow-lg !border-0">
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <Title level={2} className="!mb-2">
                  #{problem.id} - {problem.title}
                </Title>
                <Button
                  icon={<ArrowLeftOutlined />}
                  onClick={() => navigate(`/competition/${cid}`)}
                >
                  返回比赛题目列表
                </Button>
              </div>
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

            {problem.examples?.length ? (
              problem.examples.map((ex, idx) => (
                <div key={idx} className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Title level={5} className="!mb-0">输入样例 {idx + 1}</Title>
                      <Button
                        type="text"
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={async () => {
                          const ok = await copyTextToClipboard(ex.input || '');
                          if (ok) toast.success('已复制输入样例');
                          else toast.error('复制失败，请手动选择文本复制');
                        }}
                      >
                        复制
                      </Button>
                    </div>
                    <pre className="bg-white p-3 rounded-lg overflow-auto text-sm font-mono whitespace-pre-wrap">
                      {ex.input || '暂无输入样例'}
                    </pre>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Title level={5} className="!mb-0">输出样例 {idx + 1}</Title>
                      <Button
                        type="text"
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={async () => {
                          const ok = await copyTextToClipboard(ex.output || '');
                          if (ok) toast.success('已复制输出样例');
                          else toast.error('复制失败，请手动选择文本复制');
                        }}
                      >
                        复制
                      </Button>
                    </div>
                    <pre className="bg-white p-3 rounded-lg overflow-auto text-sm font-mono whitespace-pre-wrap">
                      {ex.output || '暂无输出样例'}
                    </pre>
                  </div>
                </div>
              ))
            ) : (
              <div className="mb-6 text-gray-500">暂无样例</div>
            )}

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
                  options={languageOptions.map((option) => ({ value: option.value, label: option.label }))}
                />
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

            {problem.examples?.length ? (
              <div className="mt-4">
                {/* 样例 Tab 切换 */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {problem.examples.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => handleExampleTabChange(index)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        activeExampleTab === index
                          ? 'bg-blue-500 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      样例 {index + 1}
                      {modifiedExamples[index] && (
                        <span className="ml-1 px-1.5 py-0.5 text-xs bg-orange-500 text-white rounded">
                          已修改
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <Input.TextArea
                    value={currentTestInput}
                    onChange={(e) => handleTestInputChange(e.target.value)}
                    placeholder="默认已填入当前样例输入，可修改后点击「测试样例」"
                    rows={4}
                    className="!rounded-xl font-mono text-sm focus:ring-0 focus:border-blue-400"
                    style={{ backgroundColor: '#fff', paddingBottom: 36 }}
                  />
                  <Button
                    type="link"
                    size="small"
                    className="!absolute !bottom-2 !right-3 !px-2"
                    onClick={handleResetCurrentExample}
                  >
                    重置当前样例
                  </Button>
                </div>
                {isCustomTest && (
                  <div className="mt-2 text-xs text-orange-500">
                    输入已修改，测试时将使用自定义输入，结果只显示程序实际输出
                  </div>
                )}
              </div>
            ) : null}

            <div className="mt-4">
              <Space>
                <Button
                  type="primary"
                  loading={codeLoading.test}
                  onClick={handleTestCode}
                  disabled={isCompetitionEnd || !problem.examples?.length}
                >
                  {isCompetitionEnd ? "比赛已结束" : "测试样例"}
                </Button>
                <Button
                  type="primary"
                  loading={codeLoading.submit}
                  onClick={handleSubmitCode}
                  disabled={isCompetitionEnd}
                >
                  {isCompetitionEnd ? "比赛已结束" : "提交评测"}
                </Button>
              </Space>
            </div>

            {(testResult || submitResult) && (
              <div className="mt-4 space-y-3">
                {testResult && (
                  <JudgeOutcomeCard data={testResult} onClose={() => setTestResult(null)} />
                )}
                {submitResult && (
                  <JudgeOutcomeCard data={submitResult} onClose={() => setSubmitResult(null)} />
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

      {/* 答案正确庆祝动画 */}
      <SuccessCelebration
        visible={showCelebration}
        onClose={() => setShowCelebration(false)}
        title="🎉 恭喜通过！"
        subtitle="Accepted"
      />
    </div>
  );
};

export default CompetitionProblemDetail;

