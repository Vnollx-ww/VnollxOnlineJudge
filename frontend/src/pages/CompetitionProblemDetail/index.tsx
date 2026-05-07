import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Tag,
  Button,
  Spin,
  Space,
  Divider,
  Avatar,
  Popconfirm,
  Drawer,
} from 'antd';
import toast from 'react-hot-toast';
import {
  ArrowLeftOutlined,
  CommentOutlined,
  FullscreenExitOutlined,
  CopyOutlined,
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
import { CodeEditor, Input, OnlineIdeToolbar, ProblemWorkbench, WorkbenchResult, mapJudgeStatusToVariant } from '../../components';
import type { OnlineIdeSettings, WorkbenchResultData } from '../../components';
import SuccessCelebration from '../../components/SuccessCelebration';
import type { JudgeMessage } from '../../types';

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
  {
    label: 'Go',
    value: 'golang',
    template: `package main

import (
    "bufio"
    "fmt"
    "os"
)

func main() {
    in := bufio.NewReader(os.Stdin)
    out := bufio.NewWriter(os.Stdout)
    defer out.Flush()

    // 请在此处编写你的代码
    _ = in
    fmt.Fprintln(out)
}
`,
  },
  {
    label: 'JavaScript',
    value: 'javascript',
    template: `const fs = require('fs');

const input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/);
let idx = 0;

// 请在此处编写你的代码
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
  const [runResult, setRunResult] = useState<WorkbenchResultData | null>(null);
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
  const [ideSettings, setIdeSettings] = useState<OnlineIdeSettings>({ fontSize: 14, wordWrap: true, theme: 'dark' });
  const [showCelebration, setShowCelebration] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState<'result' | 'input'>('result');
  const [commentsOpen, setCommentsOpen] = useState(false);

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
  const editorOptions = useMemo(() => ({
    fontSize: ideSettings.fontSize,
    wordWrap: ideSettings.wordWrap ? 'on' : 'off',
  }), [ideSettings]);

  const toggleEditorFullscreen = useCallback(() => {
    if (!isEditorFullscreen) {
      document.documentElement.requestFullscreen();
      setIsEditorFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsEditorFullscreen(false);
    }
  }, [isEditorFullscreen]);

  const handleWebSocketMessage = useCallback((msg: JudgeMessage) => {
    if (msg && currentSnowflakeId && String(msg.snowflakeId) === String(currentSnowflakeId)) {
      const status = msg.status || '未知状态';
      if (status === '评测中') {
        setRunResult({
          variant: 'info',
          source: 'submit',
          headline: status,
          bodyText: '正在进行评测...',
        });
      } else {
        const hasTests = msg.testCount != null && msg.testCount > 0;
        const s = String(status);
        setRunResult({
          variant: mapJudgeStatusToVariant(s),
          source: 'submit',
          headline: s,
          description: msg.description || s,
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

  const handleTestCode = async () => {
    setActiveBottomTab('result');
    if (!code.trim()) {
      toast('请先输入代码', { icon: '⚠️' });
      return;
    }
    if (!currentExample?.output) {
      toast('该题目没有提供样例，无法测试', { icon: '⚠️' });
      return;
    }
    setCodeLoading((prev) => ({ ...prev, test: true }));
    setRunResult({
      variant: 'info',
      source: 'test',
      headline: '评测中',
      description: '评测中：正在执行自测运行，请稍候…',
    });
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
          setRunResult({
            variant: 'info',
            source: 'test',
            headline: '自定义测试完成',
            description: '已使用自定义输入运行你的程序，下方为程序实际输出。',
            diff: {
              input: currentTestInput,
              actual: data.data.actualOutput || '',
            },
          });
        } else {
          const hasTests = data.data.testCount != null && data.data.testCount > 0;
          const status = data.data.status || '测试完成';
          const isCompileError = status === '编译错误' || status === 'Compile Error';
          setRunResult({
            variant: mapJudgeStatusToVariant(status),
            source: 'test',
            headline: status,
            description: data.data.description || status,
            metrics: hasTests
              ? { passCount: data.data.passCount ?? 0, testCount: data.data.testCount! }
              : undefined,
            errorInfo: data.data.errorInfo || undefined,
            diff: isCompileError
              ? undefined
              : {
                  input: data.data.input ?? currentTestInput,
                  expected: data.data.expectedOutput ?? (matchedExample?.output ?? currentExample.output ?? ''),
                  actual: data.data.actualOutput ?? '',
                },
          });
        }
      } else {
        setRunResult({
          variant: 'error',
          source: 'test',
          headline: data.msg || '测试失败',
        });
      }
    } catch (error: any) {
      setRunResult({
        variant: 'error',
        source: 'test',
        headline: error?.response?.data?.msg || '测试失败，请稍后重试',
      });
    } finally {
      setCodeLoading((prev) => ({ ...prev, test: false }));
    }
  };

  const handleSubmitCode = async () => {
    setActiveBottomTab('result');
    if (!code.trim()) {
      toast('请先输入代码', { icon: '⚠️' });
      return;
    }
    setCodeLoading((prev) => ({ ...prev, submit: true }));
    setRunResult({
      variant: 'info',
      source: 'submit',
      headline: '等待评测',
      description: '等待评测：正在保存提交并加入评测队列…',
    });
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
        setRunResult({
          variant: 'info',
          source: 'submit',
          headline: data.data.status || '等待评测',
          description: data.data.description || '等待评测：已加入评测队列。',
        });
        window.dispatchEvent(new Event('notification-updated'));
      } else {
        setRunResult({
          variant: 'error',
          source: 'submit',
          headline: data.msg || '提交失败',
        });
      }
    } catch (error: any) {
      setRunResult({
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

  // ---- 顶部操作栏 ----
  const statPillStyle: React.CSSProperties = {
    backgroundColor: 'var(--gemini-bg)',
    border: '1px solid var(--gemini-border-light)',
    borderRadius: 9999,
    padding: '4px 12px',
    color: 'var(--gemini-text-secondary)',
  };
  const topBar = (
    <>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(`/competition/${cid}`)}
      >
        返回题目列表
      </Button>
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="font-semibold whitespace-nowrap"
          style={{ color: 'var(--gemini-text-primary)', fontSize: 15 }}
          title={`#${problem.id} - ${problem.title}`}
        >
          #{problem.id} · {problem.title}
        </span>
        <Tag color={getDifficultyColor(problem.difficulty)} style={{ margin: 0, fontSize: 12, padding: '2px 10px' }}>
          {problem.difficulty || '未设置'}
        </Tag>
      </div>
      <div className="hidden lg:flex items-center gap-2 text-xs flex-none">
        <span style={statPillStyle}>时间 {problem.timeLimit || 1000} ms</span>
        <span style={statPillStyle}>内存 {problem.memoryLimit || 256} MB</span>
        <span style={statPillStyle}>提交 {problem.submitCount ?? 0}</span>
        <span style={statPillStyle}>通过 {problem.passCount ?? 0}</span>
      </div>
      <div className="flex-auto" />
      <div className="flex items-center gap-2 flex-none">
        {isCompetitionEnd && (
          <Tag color="red" style={{ margin: 0 }}>比赛已结束</Tag>
        )}
        {!isCompetitionOpen && (
          <Button
            icon={<CommentOutlined />}
            onClick={() => setCommentsOpen(true)}
          >
            评论 {comments.length ? `(${comments.length})` : ''}
          </Button>
        )}
      </div>
    </>
  );

  // ---- 左侧题目描述面板 ----
  const leftPanel = (
    <div className="space-y-5">
      <section>
        <h2 className="text-base font-bold mb-2" style={{ color: 'var(--gemini-text-primary)' }}>题目描述</h2>
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(problem.description) }}
        />
      </section>
      <section>
        <h2 className="text-base font-bold mb-2" style={{ color: 'var(--gemini-text-primary)' }}>输入格式</h2>
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(problem.inputFormat || '', '暂无输入格式说明') }}
        />
      </section>
      <section>
        <h2 className="text-base font-bold mb-2" style={{ color: 'var(--gemini-text-primary)' }}>输出格式</h2>
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(problem.outputFormat || '', '暂无输出格式说明') }}
        />
      </section>
      {problem.examples?.length ? (
        problem.examples.map((ex, idx) => (
          <section key={idx} className="space-y-3">
            <h2 className="text-base font-bold" style={{ color: 'var(--gemini-text-primary)' }}>示例 {idx + 1}</h2>
            <div>
              <div className="text-xs mb-1" style={{ color: 'var(--gemini-text-secondary)' }}>输入</div>
              <div className="relative">
                <pre className="rounded-xl p-3 pr-10 text-sm font-mono overflow-x-auto whitespace-pre-wrap border" style={{ backgroundColor: 'var(--gemini-bg)', borderColor: 'var(--gemini-border-light)', color: 'var(--gemini-text-primary)' }}>
{ex.input || '暂无输入样例'}
                </pre>
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  className="!absolute !top-2 !right-2"
                  onClick={async () => {
                    const ok = await copyTextToClipboard(ex.input || '');
                    if (ok) toast.success('已复制输入样例');
                    else toast.error('复制失败，请手动选择文本复制');
                  }}
                />
              </div>
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: 'var(--gemini-text-secondary)' }}>输出</div>
              <div className="relative">
                <pre className="rounded-xl p-3 pr-10 text-sm font-mono overflow-x-auto whitespace-pre-wrap border" style={{ backgroundColor: 'var(--gemini-bg)', borderColor: 'var(--gemini-border-light)', color: 'var(--gemini-text-primary)' }}>
{ex.output || '暂无输出样例'}
                </pre>
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  className="!absolute !top-2 !right-2"
                  onClick={async () => {
                    const ok = await copyTextToClipboard(ex.output || '');
                    if (ok) toast.success('已复制输出样例');
                    else toast.error('复制失败，请手动选择文本复制');
                  }}
                />
              </div>
            </div>
          </section>
        ))
      ) : null}
      {problem.hint && (
        <section>
          <h2 className="text-base font-bold mb-2" style={{ color: 'var(--gemini-text-primary)' }}>提示</h2>
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(problem.hint, '暂无提示') }}
          />
        </section>
      )}
    </div>
  );

  // ---- 编辑器顶部工具栏 ----
  const editorHeader = (
    <OnlineIdeToolbar
      language={language}
      languageOptions={languageOptions}
      code={code}
      settings={ideSettings}
      isFullscreen={isEditorFullscreen}
      onLanguageChange={setLanguage}
      onCodeChange={setCode}
      onSettingsChange={setIdeSettings}
      onToggleFullscreen={toggleEditorFullscreen}
    />
  );

  // 载入指定示例到自测输入
  const loadExampleInput = (i: number) => {
    if (!problem.examples?.[i]) return;
    setActiveExampleTab(i);
    setExampleInputs((prev) => ({ ...prev, [i]: problem.examples![i].input || '' }));
    setModifiedExamples((prev) => ({ ...prev, [i]: false }));
  };

  // ---- 自测输入区域 ----
  const inputArea = (
    <div className="flex flex-col h-full min-h-0">
      <Input.TextArea
        value={currentTestInput}
        onChange={(e) => handleTestInputChange(e.target.value)}
        placeholder="请输入示例或载入测试用例"
        className="!flex-auto !rounded-xl font-mono text-sm"
        style={{
          backgroundColor: '#fff',
          borderColor: 'var(--gemini-border-light)',
          resize: 'none',
          minHeight: 80,
        }}
      />
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {problem.examples?.length ? (
          problem.examples.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => loadExampleInput(i)}
              className="px-3 py-1 text-xs rounded-md transition-colors"
              style={{
                backgroundColor: activeExampleTab === i && !modifiedExamples[i]
                  ? 'var(--gemini-accent)'
                  : 'var(--gemini-bg)',
                color: activeExampleTab === i && !modifiedExamples[i]
                  ? 'var(--gemini-accent-text)'
                  : 'var(--gemini-text-secondary)',
                border: `1px solid ${activeExampleTab === i && !modifiedExamples[i]
                  ? 'transparent'
                  : 'var(--gemini-border-light)'}`,
              }}
            >
              载入示例 {i + 1}
            </button>
          ))
        ) : (
          <span className="text-xs" style={{ color: 'var(--gemini-text-disabled)' }}>该题目未提供示例</span>
        )}
        {isCustomTest && (
          <span className="text-xs ml-2" style={{ color: 'var(--gemini-warning)' }}>
            自定义输入
          </span>
        )}
      </div>
    </div>
  );

  // ---- 运行结果区域 ----
  const resultsArea = runResult ? (
    <WorkbenchResult data={runResult} />
  ) : (
    <div className="text-sm" style={{ color: 'var(--gemini-text-disabled)' }}>
      点击右上角「自测运行」或「保存并提交」后，结果将显示在此处。
    </div>
  );

  // ---- Tab 右侧次级操作（自测运行） ----
  const tabActions = (
    <Button
      loading={codeLoading.test}
      onClick={handleTestCode}
      disabled={isCompetitionEnd || !problem.examples?.length}
      style={{ padding: '0 16px', height: 32, fontSize: 14 }}
    >
      {isCompetitionEnd ? '比赛已结束' : '自测运行'}
    </Button>
  );

  // ---- 最右主操作（保存并提交） ----
  const primaryAction = (
    <Button
      type="primary"
      loading={codeLoading.submit}
      onClick={handleSubmitCode}
      disabled={isCompetitionEnd}
      style={{ padding: '0 18px', height: 34, fontSize: 14, fontWeight: 500 }}
    >
      {isCompetitionEnd ? '比赛已结束' : '保存并提交'}
    </Button>
  );

  return (
    <div
      className="fixed z-[20]"
      style={{
        top: 0,
        left: 80,
        right: 0,
        bottom: 0,
        backgroundColor: 'var(--gemini-bg, #f7f8fa)',
      }}
    >
      <ProblemWorkbench
        storageKey={`competition-problem-workbench:${cid}:${problem.id}`}
        topBar={topBar}
        leftPanel={leftPanel}
        editorHeader={editorHeader}
        editor={
          isEditorFullscreen ? (
            <div className="w-full h-full flex items-center justify-center text-sm" style={{ color: 'var(--gemini-text-disabled)' }}>
              代码已在全屏中编辑…
            </div>
          ) : (
            <CodeEditor
              value={code}
              onChange={setCode}
              language={language}
              height="100%"
              storageKey={codeStorageKey}
              options={editorOptions}
              theme={ideSettings.theme}
            />
          )
        }
        bottomTabs={[
          { key: 'result', label: '运行结果' },
          { key: 'input', label: '自测输入' },
        ]}
        activeBottomTab={activeBottomTab}
        onBottomTabChange={(k) => setActiveBottomTab(k as 'result' | 'input')}
        bottomContent={activeBottomTab === 'result' ? resultsArea : inputArea}
        tabActions={tabActions}
        primaryAction={primaryAction}
      />

      {/* 全屏编辑器（保留原全屏行为） */}
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
            options={editorOptions}
            theme={ideSettings.theme}
          />
        </div>,
        document.body
      )}

      {/* 评论抽屉 — 仅比赛结束后可用 */}
      {!isCompetitionOpen && (
        <Drawer
          title={(
            <Space>
              <CommentOutlined />
              <span>评论讨论</span>
              <Tag color="blue">{comments.length}</Tag>
            </Space>
          )}
          placement="right"
          width={Math.min(560, typeof window !== 'undefined' ? window.innerWidth : 560)}
          open={commentsOpen}
          onClose={() => setCommentsOpen(false)}
          destroyOnClose={false}
        >
          <div className="flex flex-col h-full">
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
                <span className="text-xs" style={{ color: 'var(--gemini-text-disabled)' }}>{commentContent.length}/500</span>
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
            <div className="flex-auto overflow-auto">
              {commentLoading ? (
                <Spin />
              ) : comments.length ? (
                renderComments(comments)
              ) : (
                <span style={{ color: 'var(--gemini-text-disabled)' }}>还没有评论，快来抢沙发吧！</span>
              )}
            </div>
          </div>
        </Drawer>
      )}

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
