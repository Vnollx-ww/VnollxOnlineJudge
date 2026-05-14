import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import katex from 'katex';
import { commentApi, fetchDictWithCache, judgeApi, problemApi, readCachedDict, submissionApi } from '@/lib';
import { copyTextToClipboard } from '@/utils/clipboard';
import { getUserInfo, isAuthenticated } from '@/utils/auth';
import { useJudgeWebSocket } from '@/hooks/judge/useJudgeWebSocket';
import { mapJudgeStatusToVariant } from '@/components';
import type { OnlineIdeSettings, WorkbenchResultData } from '@/components';
import type { ApiResponse, JudgeMessage } from '@/types';

marked.setOptions({ gfm: true, breaks: true });

export interface ProblemExampleItem {
  id?: number;
  input: string;
  output: string;
  sortOrder?: number;
}

export interface Problem {
  id: number;
  title: string;
  difficulty: string;
  timeLimit: number;
  memoryLimit: number;
  description: string;
  inputFormat: string;
  outputFormat: string;
  examples?: ProblemExampleItem[];
  inputExample?: string;
  outputExample?: string;
  hint: string;
  submitCount: number;
  passCount: number;
}

export interface Comment {
  id: number;
  userId: number;
  username: string;
  userAvatar?: string;
  content: string;
  createTime: string;
  parentId?: number;
  parentUsername?: string;
  subcommentList?: Comment[];
  children?: Comment[];
}

export interface Submission {
  id: number;
  pid: number;
  problemName?: string;
  userName: string;
  language: string;
  status: string;
  createTime: string;
  time?: number | null;
  memory?: number | null;
  code?: string;
}

export interface LanguageOption {
  label: string;
  value: string;
  template: string;
}

interface DictData {
  dictLabel: string;
  dictValue: string;
}

const languageTemplates: Record<string, string> = {
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {

    // 请在此处编写你的代码

    return 0;
}
`,
  python: `# 请在此处编写你的代码
def main():
    pass

if __name__ == "__main__":
    main()
`,
  java: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws Exception {
        // 请在此处编写你的代码
    }
}
`,
  go: `package main

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
  javascript: `const fs = require('fs');

const input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/);
let idx = 0;

// 请在此处编写你的代码
`,
};

const getLanguageTemplate = (language: string) =>
  languageTemplates[language] ||
  languageTemplates[language.toLowerCase()] ||
  (language.toLowerCase() === 'golang' ? languageTemplates.go : '');

const buildSubmitLanguageOptions = (data?: DictData[]) => {
  const options = (data || [])
    .map((item) => {
      const value = item.dictValue || item.dictLabel;
      const template = getLanguageTemplate(value);
      return { label: item.dictLabel, value, template };
    })
    .filter((item) => item.label && item.value);
  return options;
};

export const getCodeHighlightLanguage = (lang?: string) => {
  if (!lang) return 'plaintext';
  if (lang === 'C++') return 'cpp';
  if (lang === 'Golang') return 'go';
  if (lang === 'JavaScript') return 'javascript';
  return lang.toLowerCase();
};

export const MY_SUBMISSIONS_PAGE_SIZE = 10;

export const useProblemDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const [language, setLanguage] = useState('');
  const [code, setCode] = useState('');
  const [submitLanguageOptions, setSubmitLanguageOptions] = useState<LanguageOption[]>([]);

  const getCodeCacheKey = useCallback((problemId: string, lang: string) => {
    return `problem_code_${problemId}_${lang}`;
  }, []);

  const saveCodeToCache = useCallback(
    (problemId: string, lang: string, codeContent: string) => {
      try {
        const key = getCodeCacheKey(problemId, lang);
        localStorage.setItem(key, codeContent);
      } catch (e) {
        console.warn('保存代码缓存失败:', e);
      }
    },
    [getCodeCacheKey],
  );

  const loadCodeFromCache = useCallback(
    (problemId: string, lang: string): string | null => {
      try {
        const key = getCodeCacheKey(problemId, lang);
        return localStorage.getItem(key);
      } catch (e) {
        console.warn('读取代码缓存失败:', e);
        return null;
      }
    },
    [getCodeCacheKey],
  );

  const [runResult, setRunResult] = useState<WorkbenchResultData | null>(null);
  const [codeLoading, setCodeLoading] = useState({ test: false, submit: false });
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [replyTarget, setReplyTarget] = useState<Comment | null>(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const currentSnowflakeIdRef = useRef<string | null>(null);
  const pendingJudgeMessagesRef = useRef<Record<string, JudgeMessage[]>>({});
  const [isEditorFullscreen, setIsEditorFullscreen] = useState(false);
  const [ideSettings, setIdeSettings] = useState<OnlineIdeSettings>({ fontSize: 14, wordWrap: true, theme: 'dark' });
  const [highlightedCommentId, setHighlightedCommentId] = useState<number | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const commentRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [exampleInputs, setExampleInputs] = useState<Record<number, string>>({});
  const [activeExampleTab, setActiveExampleTab] = useState(0);
  const [modifiedExamples, setModifiedExamples] = useState<Record<number, boolean>>({});
  const [activeBottomTab, setActiveBottomTab] = useState<'result' | 'input'>('result');
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [mySubmissionsOpen, setMySubmissionsOpen] = useState(false);
  const [mySubmissions, setMySubmissions] = useState<Submission[]>([]);
  const [mySubmissionsLoading, setMySubmissionsLoading] = useState(false);
  const [mySubmissionsPage, setMySubmissionsPage] = useState(1);
  const [mySubmissionsTotal, setMySubmissionsTotal] = useState(0);
  const [currentSubmission, setCurrentSubmission] = useState<Submission | null>(null);
  const optimisticCountedSubmissionsRef = useRef<Set<string>>(new Set());
  const userInfo = getUserInfo();
  const mySubmissionsPageSize = MY_SUBMISSIONS_PAGE_SIZE;

  const editorOptions = useMemo(
    () => ({
      fontSize: ideSettings.fontSize,
      wordWrap: ideSettings.wordWrap ? 'on' : 'off',
    }),
    [ideSettings],
  );

  const toggleEditorFullscreen = useCallback(() => {
    if (!isEditorFullscreen) {
      document.documentElement.requestFullscreen();
      setIsEditorFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsEditorFullscreen(false);
    }
  }, [isEditorFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) setIsEditorFullscreen(false);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleSyncCode = (event: CustomEvent<{ code: string; language: string }>) => {
      const { code: incoming, language: lang } = event.detail;
      const langMap: Record<string, string> = {
        cpp: 'cpp', 'c++': 'cpp', c: 'cpp',
        python: 'python', py: 'python', python3: 'python',
        java: 'java',
        go: 'go', golang: 'go',
      };
      const mappedLang = langMap[lang.toLowerCase()] || language;
      if (mappedLang !== language) setLanguage(mappedLang);
      setCode(incoming);
      toast.success('代码已同步到编辑器');
    };
    window.addEventListener('sync-code-to-editor', handleSyncCode as EventListener);
    return () => window.removeEventListener('sync-code-to-editor', handleSyncCode as EventListener);
  }, [language]);

  const applyJudgeMessage = useCallback((msg: JudgeMessage) => {
    const status = msg.status || '未知状态';
    if (status === '评测中') {
      setRunResult({ variant: 'info', source: 'submit', headline: status, bodyText: '正在进行评测...' });
    } else {
      const hasTests = msg.testCount != null && msg.testCount > 0;
      const hasFailureDiff =
        status !== '答案正确' &&
        (msg.caseInput != null || msg.caseExpected != null || msg.actualOutput != null);
      setRunResult({
        variant: mapJudgeStatusToVariant(status),
        source: 'submit',
        headline: status,
        description: msg.description || status,
        metrics: {
          timeMs: msg.time ?? 0,
          memoryMb: msg.memory ?? 0,
          ...(hasTests ? { passCount: msg.passCount ?? 0, testCount: msg.testCount! } : {}),
        },
        errorInfo: msg.errorInfo || undefined,
        diff: hasFailureDiff
          ? {
              input: msg.caseInput ?? undefined,
              expected: msg.caseExpected ?? undefined,
              actual: msg.actualOutput ?? undefined,
            }
          : undefined,
      });
    }
    if (status === '答案正确') setShowCelebration(true);
    if (status !== '评测中') {
      const snowflakeId = String(msg.snowflakeId);
      if (!optimisticCountedSubmissionsRef.current.has(snowflakeId)) {
        optimisticCountedSubmissionsRef.current.add(snowflakeId);
        setProblem((current) =>
          current
            ? {
                ...current,
                submitCount: (current.submitCount ?? 0) + 1,
                passCount: status === '答案正确' ? (current.passCount ?? 0) + 1 : current.passCount ?? 0,
              }
            : current,
        );
      }
    }
  }, []);

  const handleWebSocketMessage = useCallback(
    (msg: JudgeMessage) => {
      if (!msg?.snowflakeId) return;
      const messageSnowflakeId = String(msg.snowflakeId);
      const currentId = currentSnowflakeIdRef.current;
      // 如果 snowflakeId 还没拿到（提交响应未到达）或不匹配，先入队缓存，
      // 等 handleSubmitCode 拿到 snowflakeId 后再统一回放，避免“评测中”消息因
      // 状态闭包过期被直接丢掉。
      if (!currentId || messageSnowflakeId !== currentId) {
        const queue = pendingJudgeMessagesRef.current[messageSnowflakeId] || [];
        queue.push(msg);
        pendingJudgeMessagesRef.current[messageSnowflakeId] = queue;
        return;
      }
      applyJudgeMessage(msg);
    },
    [applyJudgeMessage],
  );

  useJudgeWebSocket(handleWebSocketMessage);

  const renderLatex = useCallback((text: string): string => {
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

  const renderMarkdown = useCallback(
    (content: string, fallback = '暂无内容') => {
      const raw = content && content.trim() ? content : fallback;
      const withLatex = renderLatex(raw);
      const html = marked.parse(withLatex) as string;
      return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
          'p', 'br', 'strong', 'em', 'u', 's', 'del', 'code', 'pre',
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'ul', 'ol', 'li', 'blockquote',
          'a', 'img', 'hr',
          'table', 'thead', 'tbody', 'tr', 'th', 'td',
          'div', 'span',
        ],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'style'],
        ALLOW_DATA_ATTR: false,
      });
    },
    [renderLatex],
  );

  const loadProblem = async () => {
    setLoading(true);
    try {
      const data = (await problemApi.get<Problem>(id)) as ApiResponse<Problem>;
      if (data.code === 200) setProblem(data.data);
      else toast.error((data as any).msg || '加载题目失败');
    } catch {
      toast.error('加载题目失败');
    } finally {
      setLoading(false);
    }
  };

  const loadTags = async (pid: number) => {
    try {
      const data = (await problemApi.tags<string[]>(pid)) as ApiResponse<string[]>;
      if (data.code === 200) setTags(data.data || []);
    } catch (error) {
      console.warn('加载标签失败:', error);
    }
  };

  const formatComments = (list: Comment[] = []): Comment[] =>
    list.map((item) => ({ ...item, children: formatComments(item.subcommentList || []) }));

  const normalizeComment = (comment: Comment): Comment => ({
    ...comment,
    children: formatComments(comment.subcommentList || comment.children || []),
  });

  const addCommentToTree = (list: Comment[], comment: Comment): Comment[] => {
    const nextComment = normalizeComment(comment);
    if (!nextComment.parentId) return [nextComment, ...list];
    return list.map((item) => {
      if (item.id === nextComment.parentId) {
        return { ...item, children: [nextComment, ...(item.children || [])] };
      }
      return { ...item, children: addCommentToTree(item.children || [], nextComment) };
    });
  };

  const removeCommentFromTree = (list: Comment[], commentId: number): Comment[] =>
    list
      .filter((item) => item.id !== commentId)
      .map((item) => ({ ...item, children: removeCommentFromTree(item.children || [], commentId) }));

  const loadComments = async (pid: number) => {
    setCommentLoading(true);
    try {
      const data = (await commentApi.list<Comment[]>(pid)) as ApiResponse<Comment[]>;
      if (data.code === 200) setComments(formatComments(data.data || []));
    } catch {
      toast.error('加载评论失败');
    } finally {
      setCommentLoading(false);
    }
  };

  const loadMySubmissions = async (page = 1) => {
    if (!problem?.id || !userInfo?.id) {
      setMySubmissions([]);
      setMySubmissionsTotal(0);
      return;
    }
    setMySubmissionsLoading(true);
    try {
      const params = {
        pageNum: String(page),
        pageSize: String(mySubmissionsPageSize),
        cid: '0',
        uid: String(userInfo.id),
        keyword: String(problem.id),
      };
      const data = (await submissionApi.list<Submission[]>(params)) as ApiResponse<Submission[]>;
      if (data.code === 200) setMySubmissions(data.data || []);
      const countData = (await submissionApi.count({
        cid: params.cid,
        uid: params.uid,
        keyword: params.keyword,
      })) as ApiResponse<number>;
      if (countData.code === 200) setMySubmissionsTotal(countData.data || 0);
    } catch {
      toast.error('加载本题提交记录失败');
    } finally {
      setMySubmissionsLoading(false);
    }
  };

  const openMySubmissions = () => {
    setMySubmissionsOpen(true);
    setMySubmissionsPage(1);
    loadMySubmissions(1);
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      toast.error('请先登录！');
      navigate('/');
      return;
    }
    // 题目主体、标签、评论三路接口并行触发：tags/comments 仅需 pid（即 URL id），
    // 不必等 loadProblem 回来再串行发请求
    loadProblem();
    const pid = Number(id);
    if (!Number.isNaN(pid) && pid > 0) {
      loadTags(pid);
      loadComments(pid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, navigate]);

  useEffect(() => {
    const commentId = searchParams.get('commentId');
    if (commentId && comments.length > 0 && !commentLoading) {
      const targetId = Number(commentId);
      setHighlightedCommentId(targetId);
      setTimeout(() => {
        const targetElement = commentRefs.current[targetId];
        if (targetElement) targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
      const timer = setTimeout(() => setHighlightedCommentId(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, comments, commentLoading]);

  useEffect(() => {
    if (!id || !language) return;
    const cachedCode = loadCodeFromCache(id, language);
    if (cachedCode) {
      setCode(cachedCode);
    } else {
      const template = submitLanguageOptions.find((item) => item.value === language)?.template || getLanguageTemplate(language);
      setCode(template);
    }
  }, [language, id, loadCodeFromCache, submitLanguageOptions]);

  useEffect(() => {
    let cancelled = false;
    const apply = (data: DictData[] | null | undefined) => {
      if (cancelled || !data || !data.length) return;
      const nextOptions = buildSubmitLanguageOptions(data);
      if (!nextOptions.length) return;
      setSubmitLanguageOptions(nextOptions);
      setLanguage((current) =>
        nextOptions.some((item) => item.value === current) ? current : nextOptions[0].value,
      );
    };
    // 命中 localStorage 缓存就立即就位，避免刷新时等接口才出语言/模板
    apply(readCachedDict('SUBMIT_LANGUAGE') as DictData[] | null);
    // 后台 revalidate
    fetchDictWithCache('SUBMIT_LANGUAGE')
      .then((data) => apply(data as DictData[] | null))
      .catch((error) => console.error('加载提交语言字典失败:', error));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!id || !code) return;
    const timer = setTimeout(() => saveCodeToCache(id, language, code), 500);
    return () => clearTimeout(timer);
  }, [code, id, language, saveCodeToCache]);

  const currentExample = useMemo(() => {
    if (problem?.examples?.length && activeExampleTab < problem.examples.length) {
      return {
        input: problem.examples[activeExampleTab].input,
        output: problem.examples[activeExampleTab].output,
        index: activeExampleTab,
      };
    }
    return null;
  }, [problem?.examples, activeExampleTab]);

  const normalizeTestText = useCallback(
    (text?: string | null) => (text ?? '').replace(/\r\n/g, '\n').trim(),
    [],
  );
  const currentTestInput = exampleInputs[activeExampleTab] ?? '';

  const matchedExample = useMemo(() => {
    if (!problem?.examples?.length) return null;
    const normalizedInput = normalizeTestText(currentTestInput);
    return problem.examples.find((example) => normalizeTestText(example.input) === normalizedInput) ?? null;
  }, [currentTestInput, problem?.examples, normalizeTestText]);

  const isCustomTest = useMemo(() => {
    if (!problem?.examples?.length || !currentExample) return false;
    return normalizeTestText(currentTestInput) !== normalizeTestText(currentExample.input);
  }, [currentTestInput, currentExample, problem?.examples?.length, normalizeTestText]);

  useEffect(() => {
    if (problem?.examples?.length) {
      setExampleInputs(
        problem.examples.reduce<Record<number, string>>((acc, example, index) => {
          acc[index] = example.input || '';
          return acc;
        }, {}),
      );
      setActiveExampleTab(0);
      setModifiedExamples({});
    } else {
      setExampleInputs({});
    }
  }, [problem?.id]);

  const handleTestInputChange = useCallback(
    (value: string) => {
      setExampleInputs((prev) => ({ ...prev, [activeExampleTab]: value }));
      if (currentExample && normalizeTestText(value) !== normalizeTestText(currentExample.input)) {
        setModifiedExamples((prev) => ({ ...prev, [activeExampleTab]: true }));
      } else {
        setModifiedExamples((prev) => ({ ...prev, [activeExampleTab]: false }));
      }
    },
    [currentExample, activeExampleTab, normalizeTestText],
  );

  const handleTestCode = async () => {
    setActiveBottomTab('result');
    if (!code.trim()) {
      toast('请先输入代码');
      return;
    }
    if (!currentExample?.output) {
      toast('该题目没有提供样例，无法测试');
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
      const data = (await judgeApi.test<{
        status?: string;
        description?: string;
        errorInfo?: string;
        input?: string;
        expectedOutput?: string;
        actualOutput?: string;
        passCount?: number | null;
        testCount?: number | null;
      }>(payload)) as ApiResponse<{
        status?: string;
        description?: string;
        errorInfo?: string;
        input?: string;
        expectedOutput?: string;
        actualOutput?: string;
        passCount?: number | null;
        testCount?: number | null;
      }>;
      if (data.code === 200) {
        if (isCustomTest) {
          setRunResult({
            variant: 'info',
            source: 'test',
            headline: '自定义测试完成',
            description: '已使用自定义输入运行你的程序，下方为程序实际输出。',
            diff: { input: currentTestInput, actual: data.data.actualOutput || '' },
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
        setRunResult({ variant: 'error', source: 'test', headline: (data as any).msg || '测试失败' });
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
      toast('请先输入代码');
      return;
    }
    if (!problem) return;

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
        option: language,
        pid: String(problem.id),
        title: problem.title,
        uname: userInfo.name,
        cid: '0',
        time: String(problem.timeLimit || 1000),
        memory: String(problem.memoryLimit || 256),
      };
      const data = (await judgeApi.submit<{
        snowflakeId?: string;
        status?: string;
        description?: string;
        queueAhead?: number | null;
      }>(payload)) as ApiResponse<{
        snowflakeId?: string;
        status?: string;
        description?: string;
        queueAhead?: number | null;
      }>;
      if (data.code === 200) {
        let hasAppliedPendingMessage = false;
        if (data.data.snowflakeId) {
          const snowflakeId = String(data.data.snowflakeId);
          // 同步写入 ref，避免 setState 异步导致 WS 回调读到的还是 null
          currentSnowflakeIdRef.current = snowflakeId;
          const pendingMessages = pendingJudgeMessagesRef.current[snowflakeId];
          if (pendingMessages && pendingMessages.length > 0) {
            delete pendingJudgeMessagesRef.current[snowflakeId];
            pendingMessages.forEach((m) => applyJudgeMessage(m));
            hasAppliedPendingMessage = true;
          }
        }
        // 没有提前到达的消息时再回退到“等待评测”，否则会盖掉刚回放的“评测中/结果”状态
        if (!hasAppliedPendingMessage) {
          setRunResult({
            variant: 'info',
            source: 'submit',
            headline: data.data.status || '等待评测',
            description: data.data.description || '等待评测：已加入评测队列。',
          });
        }
      } else {
        setRunResult({ variant: 'error', source: 'submit', headline: (data as any).msg || '提交失败' });
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
      toast('请输入评论内容');
      return;
    }
    if (!userInfo?.id || !problem) {
      toast.error('请先登录后再发表评论');
      return;
    }
    setCommentSubmitting(true);
    try {
      const payload = {
        problemId: Number(problem.id),
        parentId: replyTarget?.id || null,
        receiveUserId: replyTarget?.userId || null,
        username: userInfo.name,
        content: commentContent.trim(),
        createTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      };
      const data = (await commentApi.publish<Comment>(payload)) as ApiResponse<Comment>;
      if (data.code === 200) {
        toast.success('发布成功');
        setCommentContent('');
        setReplyTarget(null);
        if (data.data) setComments((current) => addCommentToTree(current, data.data!));
      } else {
        toast.error((data as any).msg || '发布失败');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.msg || '发布失败，请稍后重试');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!problem) return;
    try {
      const data = (await commentApi.delete(commentId)) as ApiResponse;
      if (data.code === 200) {
        toast.success('删除成功');
        setComments((current) => removeCommentFromTree(current, commentId));
      } else {
        toast.error((data as any).msg || '删除失败');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.msg || '删除失败，请稍后重试');
    }
  };

  const handleOpenAiAnalysis = () => {
    if (!problem) return;
    window.dispatchEvent(
      new CustomEvent('open-ai-assistant', {
        detail: {
          forceNewSession: true,
          problemContext: {
            problemId: problem.id,
            title: problem.title,
            difficulty: problem.difficulty,
            description: problem.description || '',
            inputFormat: problem.inputFormat || '',
            outputFormat: problem.outputFormat || '',
            hint: problem.hint || '',
            timeLimit: problem.timeLimit,
            memoryLimit: problem.memoryLimit,
            language,
            code,
          },
        },
      }),
    );
  };

  const copyToClipboard = async (text: string, label: string) => {
    const ok = await copyTextToClipboard(text);
    if (ok) toast.success(`已复制${label}`);
    else toast.error('复制失败，请手动选择文本复制');
  };

  const loadExampleInput = (i: number) => {
    if (!problem?.examples?.[i]) return;
    setActiveExampleTab(i);
    setExampleInputs((prev) => ({ ...prev, [i]: problem.examples![i].input || '' }));
    setModifiedExamples((prev) => ({ ...prev, [i]: false }));
  };

  return {
    // routing
    id,
    navigate,
    location,
    // problem
    problem,
    loading,
    tags,
    // editor
    languageOptions: submitLanguageOptions,
    language,
    setLanguage,
    code,
    setCode,
    codeLoading,
    runResult,
    ideSettings,
    setIdeSettings,
    isEditorFullscreen,
    setIsEditorFullscreen,
    toggleEditorFullscreen,
    editorOptions,
    // comments
    comments,
    commentLoading,
    commentContent,
    setCommentContent,
    replyTarget,
    setReplyTarget,
    commentSubmitting,
    highlightedCommentId,
    commentRefs,
    handleSubmitComment,
    handleDeleteComment,
    // testing
    exampleInputs,
    activeExampleTab,
    setActiveExampleTab,
    modifiedExamples,
    activeBottomTab,
    setActiveBottomTab,
    currentExample,
    currentTestInput,
    isCustomTest,
    handleTestInputChange,
    handleTestCode,
    handleSubmitCode,
    loadExampleInput,
    // submissions drawer
    commentsOpen,
    setCommentsOpen,
    mySubmissionsOpen,
    setMySubmissionsOpen,
    mySubmissions,
    mySubmissionsLoading,
    mySubmissionsPage,
    setMySubmissionsPage,
    mySubmissionsTotal,
    mySubmissionsPageSize,
    currentSubmission,
    setCurrentSubmission,
    openMySubmissions,
    loadMySubmissions,
    // misc
    showCelebration,
    setShowCelebration,
    userInfo,
    handleOpenAiAnalysis,
    copyToClipboard,
    renderMarkdown,
  };
};
