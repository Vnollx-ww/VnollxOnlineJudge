import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import katex from 'katex';
import { commentApi, competitionApi, dictApi, judgeApi, problemApi, submissionApi } from '@/lib';
import { getUserInfo, isAuthenticated } from '@/utils/auth';
import { useJudgeWebSocket } from '@/hooks/useJudgeWebSocket';
import { useCompetitionAntiCheat } from '@/hooks/useCompetitionAntiCheat';
import { useCompetitionFirstBloodWebSocket } from '@/hooks/useCompetitionFirstBloodWebSocket';
import { mapJudgeStatusToVariant } from '@/components';
import type { OnlineIdeSettings, WorkbenchResultData } from '@/components';
import type { ApiResponse, JudgeMessage } from '@/types';

export interface ProblemExampleItem {
  id?: number;
  input: string;
  output: string;
  sortOrder?: number;
}

export interface Competition {
  id: number;
  title: string;
  beginTime: string;
  endTime: string;
  needPassword?: boolean;
  password?: string;
  antiCheatMode?: 'NORMAL' | 'STRICT' | string;
}

export interface Problem {
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

export interface CompetitionProblem {
  id: number;
  title: string;
  submitCount?: number;
  passCount?: number;
  isSolved?: boolean | null;
}

export interface Comment {
  id: number;
  userId: number;
  username: string;
  content: string;
  createTime: string;
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
  cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n\n    // 请在此处编写你的代码\n\n    return 0;\n}\n`,
  python: `# 请在此处编写你的代码\ndef main():\n    pass\n\nif __name__ == \"__main__\":\n    main()\n`,
  java: `import java.io.*;\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) throws Exception {\n        // 请在此处编写你的代码\n    }\n}\n`,
  golang: `package main\n\nimport (\n    \"bufio\"\n    \"fmt\"\n    \"os\"\n)\n\nfunc main() {\n    in := bufio.NewReader(os.Stdin)\n    out := bufio.NewWriter(os.Stdout)\n    defer out.Flush()\n\n    // 请在此处编写你的代码\n    _ = in\n    fmt.Fprintln(out)\n}\n`,
  javascript: `const fs = require('fs');\n\nconst input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/);\nlet idx = 0;\n\n// 请在此处编写你的代码\n`,
};

const getLanguageTemplate = (language: string) =>
  languageTemplates[language] || languageTemplates[language.toLowerCase()] || '';

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

export const MY_SUBMISSIONS_PAGE_SIZE = 10;

export const useCompetitionProblemDetail = () => {
  const { cid, id } = useParams<{ cid: string; id: string }>();
  const navigate = useNavigate();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setTags] = useState<string[]>([]);
  void setTags;
  const [language, setLanguage] = useState('');
  const [code, setCode] = useState('');
  const [submitLanguageOptions, setSubmitLanguageOptions] = useState<LanguageOption[]>([]);
  const [runResult, setRunResult] = useState<WorkbenchResultData | null>(null);
  const [codeLoading, setCodeLoading] = useState({ test: false, submit: false });
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [replyTarget, setReplyTarget] = useState<Comment | null>(null);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [isCompetitionOpen, setIsCompetitionOpen] = useState(true);
  const [isCompetitionEnd, setIsCompetitionEnd] = useState(false);
  const [isUserCompetitionEnded, setIsUserCompetitionEnded] = useState(false);
  const [finishCompetitionLoading, setFinishCompetitionLoading] = useState(false);
  const [finishCompetitionModalOpen, setFinishCompetitionModalOpen] = useState(false);
  const [currentSnowflakeId, setCurrentSnowflakeId] = useState<string | null>(null);
  const [isEditorFullscreen, setIsEditorFullscreen] = useState(false);
  const [ideSettings, setIdeSettings] = useState<OnlineIdeSettings>({ fontSize: 14, wordWrap: true, theme: 'dark' });
  const [showCelebration, setShowCelebration] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState<'result' | 'input'>('result');
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [competitionProblems, setCompetitionProblems] = useState<CompetitionProblem[]>([]);
  const [competitionProblemsLoading, setCompetitionProblemsLoading] = useState(false);
  const [mySubmissionsOpen, setMySubmissionsOpen] = useState(false);
  const [mySubmissions, setMySubmissions] = useState<Submission[]>([]);
  const [mySubmissionsLoading, setMySubmissionsLoading] = useState(false);
  const [mySubmissionsPage, setMySubmissionsPage] = useState(1);
  const [mySubmissionsTotal, setMySubmissionsTotal] = useState(0);
  const [currentSubmission, setCurrentSubmission] = useState<Submission | null>(null);
  const [activeExampleTab, setActiveExampleTab] = useState(0);
  const [modifiedExamples, setModifiedExamples] = useState<Record<number, boolean>>({});
  const [exampleInputs, setExampleInputs] = useState<Record<number, string>>({});
  const pendingJudgeMessagesRef = useRef<Record<string, JudgeMessage>>({});
  const optimisticCountedSubmissionsRef = useRef<Set<string>>(new Set());
  useCompetitionFirstBloodWebSocket(cid, !!cid);

  const userInfo = getUserInfo();
  const mySubmissionsPageSize = MY_SUBMISSIONS_PAGE_SIZE;

  const codeStorageKey = useMemo(() => {
    const pid = problem?.id ?? id;
    if (!pid || !cid) return undefined;
    return `oj:code:competition:${cid}:problem:${pid}:${language}`;
  }, [problem?.id, id, cid, language]);

  const editorOptions = useMemo(() => ({
    fontSize: ideSettings.fontSize,
    wordWrap: ideSettings.wordWrap ? 'on' : 'off',
  }), [ideSettings]);

  const currentCompetitionProblem = useMemo(() => {
    if (!problem?.id) return undefined;
    return competitionProblems.find((item) => String(item.id) === String(problem.id));
  }, [competitionProblems, problem?.id]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) setIsEditorFullscreen(false);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleEditorFullscreen = useCallback(() => {
    if (!isEditorFullscreen) {
      document.documentElement.requestFullscreen();
      setIsEditorFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsEditorFullscreen(false);
    }
  }, [isEditorFullscreen]);

  const applyJudgeMessage = useCallback((msg: JudgeMessage) => {
    const status = msg.status || '未知状态';
    if (status === '评测中') {
      setRunResult({ variant: 'info', source: 'submit', headline: status, bodyText: '正在进行评测...' });
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

    if (status === '答案正确') {
      setShowCelebration(true);
      const solvedProblemId = problem?.id ?? id;
      if (solvedProblemId) {
        setCompetitionProblems((prev) =>
          prev.map((item) =>
            String(item.id) === String(solvedProblemId) ? { ...item, isSolved: true } : item
          )
        );
      }
    }

    if (status !== '评测中') {
      const snowflakeId = String(msg.snowflakeId);
      if (!optimisticCountedSubmissionsRef.current.has(snowflakeId)) {
        optimisticCountedSubmissionsRef.current.add(snowflakeId);
        const solvedProblemId = problem?.id ?? id;
        setProblem((current) => current ? {
          ...current,
          submitCount: (current.submitCount ?? 0) + 1,
          passCount: status === '答案正确' ? (current.passCount ?? 0) + 1 : (current.passCount ?? 0),
        } : current);
        if (solvedProblemId) {
          setCompetitionProblems((prev) =>
            prev.map((item) =>
              String(item.id) === String(solvedProblemId)
                ? {
                    ...item,
                    submitCount: (item.submitCount ?? 0) + 1,
                    passCount: status === '答案正确' ? (item.passCount ?? 0) + 1 : (item.passCount ?? 0),
                  }
                : item
            )
          );
        }
      }
      window.dispatchEvent(new Event('notification-updated'));
    }
  }, [id, problem?.id]);

  const handleWebSocketMessage = useCallback((msg: JudgeMessage) => {
    if (!msg?.snowflakeId) return;
    const messageSnowflakeId = String(msg.snowflakeId);
    if (!currentSnowflakeId || messageSnowflakeId !== String(currentSnowflakeId)) {
      pendingJudgeMessagesRef.current[messageSnowflakeId] = msg;
      return;
    }
    applyJudgeMessage(msg);
  }, [applyJudgeMessage, currentSnowflakeId]);

  useJudgeWebSocket(handleWebSocketMessage);

  const antiCheatEnabled = competition?.antiCheatMode === 'STRICT' && !!cid && isCompetitionOpen && !isCompetitionEnd && !isUserCompetitionEnded && !mySubmissionsOpen && !currentSubmission;
  useCompetitionAntiCheat({
    competitionId: cid ?? null,
    problemId: problem?.id ?? null,
    enabled: antiCheatEnabled,
    onWarn: useCallback((msg: string, level: 'info' | 'warning' | 'critical') => {
      if (level === 'info') toast(msg, { icon: '⚠️' });
      else if (level === 'warning') toast(msg, { icon: '⚠️', duration: 4000 });
      else toast.error(msg, { duration: 5000 });
    }, []),
  });

  const renderLatex = useCallback((text: string) => {
    text = text.replace(/\$\$([\s\S]+?)\$\$/g, (match, formula) => {
      try { return katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false }); } catch { return match; }
    });
    text = text.replace(/\$([^$\n]+?)\$/g, (match, formula) => {
      try { return katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false }); } catch { return match; }
    });
    return text;
  }, []);

  const renderMarkdown = useCallback((content: string, fallback = '暂无内容') => {
    const raw = content && content.trim() ? content : fallback;
    const withLatex = renderLatex(raw);
    return DOMPurify.sanitize(marked.parse(withLatex) as string);
  }, [renderLatex]);

  const loadProblem = async () => {
    if (!problem) setLoading(true);
    try {
      const data = await problemApi.get<Problem>(id);
      if (data.code === 200) setProblem(data.data);
      else toast.error(data.msg || '加载题目失败');
    } catch {
      toast.error('加载题目失败');
    } finally {
      setLoading(false);
    }
  };

  const loadCompetition = async () => {
    if (!cid) return;
    try {
      const data = await competitionApi.get<Competition>(cid);
      if (data.code === 200) setCompetition(data.data || null);
    } catch {
      setCompetition(null);
    }
  };

  const loadCompetitionStatus = async () => {
    try {
      const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
      const openRes = await competitionApi.judgeIsOpen(now, cid);
      setIsCompetitionOpen(openRes.code === 200);
      const endRes = await competitionApi.judgeIsEnd(now, cid);
      setIsCompetitionEnd(endRes.code !== 200);
      const finishRes = await competitionApi.finishStatus<boolean>(cid);
      setIsUserCompetitionEnded(Boolean(finishRes.data));
    } catch (err) {
      console.warn('比赛状态判断失败', err);
    }
  };

  const loadCompetitionProblems = async () => {
    if (!cid) return;
    setCompetitionProblemsLoading(true);
    try {
      const data = await competitionApi.listProblem<CompetitionProblem[]>(cid);
      if (data.code === 200) setCompetitionProblems(data.data || []);
    } catch {
      toast.error('加载比赛题目列表失败');
    } finally {
      setCompetitionProblemsLoading(false);
    }
  };

  const loadMySubmissions = async (page = 1) => {
    if (!cid || !problem?.id || !userInfo?.id) {
      setMySubmissions([]);
      setMySubmissionsTotal(0);
      return;
    }
    setMySubmissionsLoading(true);
    try {
      const params = {
        pageNum: String(page),
        pageSize: String(mySubmissionsPageSize),
        cid: String(cid),
        uid: String(userInfo.id),
        keyword: String(problem.id),
      };
      const data = await submissionApi.list<Submission[]>(params);
      if (data.code === 200) setMySubmissions(data.data || []);
      const countData = await submissionApi.count({ cid: params.cid, uid: params.uid, keyword: params.keyword });
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

  const formatComments = (list: Comment[] = []): Comment[] =>
    list.map((item) => ({ ...item, children: formatComments(item.subcommentList || []) }));

  const loadComments = async (pid: number) => {
    setCommentLoading(true);
    try {
      const data = await commentApi.list<Comment[]>(pid);
      if (data.code === 200) setComments(formatComments(data.data || []));
    } catch {
      toast.error('加载评论失败');
    } finally {
      setCommentLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      toast.error('请先登录！');
      navigate('/');
      return;
    }
    loadProblem();
    loadCompetition();
    loadCompetitionStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, cid, navigate]);

  useEffect(() => {
    loadCompetitionProblems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cid]);

  useEffect(() => {
    if (problem?.id && !isCompetitionOpen) loadComments(problem.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem?.id, isCompetitionOpen]);

  useEffect(() => {
    if (!language) return;
    const template = submitLanguageOptions.find((item) => item.value === language)?.template || getLanguageTemplate(language);
    if (!codeStorageKey) { setCode(template); return; }
    try {
      const cachedCode = localStorage.getItem(codeStorageKey);
      setCode(cachedCode ?? template);
    } catch {
      setCode(template);
    }
  }, [language, codeStorageKey, submitLanguageOptions]);

  useEffect(() => {
    const loadLanguageOptions = async () => {
      try {
        const res = (await dictApi.listData<DictData[]>('SUBMIT_LANGUAGE')) as ApiResponse<DictData[]>;
        if (res.code === 200) {
          const nextOptions = buildSubmitLanguageOptions(res.data);
          setSubmitLanguageOptions(nextOptions);
          setLanguage((current) => (nextOptions.some((item) => item.value === current) ? current : nextOptions[0].value));
        }
      } catch (error) {
        console.error('加载提交语言字典失败:', error);
      }
    };
    loadLanguageOptions();
  }, []);

  useEffect(() => {
    if (!codeStorageKey) return;
    if (typeof code !== 'string') return;
    const timer = window.setTimeout(() => {
      try { localStorage.setItem(codeStorageKey, code); } catch { return; }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [code, codeStorageKey]);

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

  const normalizeTestText = useCallback((text?: string | null) => (text ?? '').replace(/\r\n/g, '\n').trim(), []);
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
        }, {})
      );
      setActiveExampleTab(0);
      setModifiedExamples({});
    } else {
      setExampleInputs({});
    }
  }, [problem?.id]);

  const handleTestInputChange = useCallback((value: string) => {
    setExampleInputs((prev) => ({ ...prev, [activeExampleTab]: value }));
    if (currentExample && normalizeTestText(value) !== normalizeTestText(currentExample.input)) {
      setModifiedExamples((prev) => ({ ...prev, [activeExampleTab]: true }));
    } else {
      setModifiedExamples((prev) => ({ ...prev, [activeExampleTab]: false }));
    }
  }, [currentExample, activeExampleTab, normalizeTestText]);

  const handleTestCode = async () => {
    setActiveBottomTab('result');
    if (!code.trim()) { toast('请先输入代码', { icon: '⚠️' }); return; }
    if (!currentExample?.output) { toast('该题目没有提供样例，无法测试', { icon: '⚠️' }); return; }
    setCodeLoading((prev) => ({ ...prev, test: true }));
    setRunResult({ variant: 'info', source: 'test', headline: '评测中', description: '评测中：正在执行自测运行，请稍候…' });
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
      const data = await judgeApi.test<{
        actualOutput?: string;
        expectedOutput?: string;
        input?: string;
        description?: string;
        status?: string;
        errorInfo?: string;
        passCount?: number | null;
        testCount?: number | null;
      }>(payload);
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
            metrics: hasTests ? { passCount: data.data.passCount ?? 0, testCount: data.data.testCount! } : undefined,
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
        setRunResult({ variant: 'error', source: 'test', headline: data.msg || '测试失败' });
      }
    } catch (error: any) {
      setRunResult({ variant: 'error', source: 'test', headline: error?.response?.data?.msg || '测试失败，请稍后重试' });
    } finally {
      setCodeLoading((prev) => ({ ...prev, test: false }));
    }
  };

  const handleSubmitCode = async () => {
    setActiveBottomTab('result');
    if (isUserCompetitionEnded) { toast.error('你已确认结束本场比赛，无法再次提交'); return; }
    if (!code.trim()) { toast('请先输入代码', { icon: '⚠️' }); return; }
    setCodeLoading((prev) => ({ ...prev, submit: true }));
    setRunResult({ variant: 'info', source: 'submit', headline: '等待评测', description: '等待评测：正在保存提交并加入评测队列…' });
    try {
      const payload = {
        code,
        title: problem?.title,
        option: language,
        pid: String(problem?.id),
        uname: userInfo?.name,
        cid,
        create_time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        time: String(problem?.timeLimit || 1000),
        memory: String(problem?.memoryLimit || 256),
      };
      const data = await judgeApi.submit<{
        snowflakeId?: string;
        status?: string;
        description?: string;
        queueAhead?: number | null;
      }>(payload);
      if (data.code === 200) {
        let hasAppliedPendingMessage = false;
        if (data.data.snowflakeId) {
          const snowflakeId = String(data.data.snowflakeId);
          setCurrentSnowflakeId(snowflakeId);
          const pendingMessage = pendingJudgeMessagesRef.current[snowflakeId];
          if (pendingMessage) {
            delete pendingJudgeMessagesRef.current[snowflakeId];
            applyJudgeMessage(pendingMessage);
            hasAppliedPendingMessage = true;
          }
        }
        if (!hasAppliedPendingMessage) {
          setRunResult({
            variant: 'info',
            source: 'submit',
            headline: data.data.status || '等待评测',
            description: data.data.description || '等待评测：已加入评测队列。',
          });
        }
        window.dispatchEvent(new Event('notification-updated'));
      } else {
        setRunResult({ variant: 'error', source: 'submit', headline: data.msg || '提交失败' });
      }
    } catch (error: any) {
      setRunResult({ variant: 'error', source: 'submit', headline: error?.response?.data?.msg || '提交失败，请稍后重试' });
    } finally {
      setCodeLoading((prev) => ({ ...prev, submit: false }));
    }
  };

  const handleFinishCompetition = async () => {
    if (!cid) return;
    setFinishCompetitionLoading(true);
    try {
      const data = await competitionApi.finish(cid);
      if (data.code === 200) {
        setIsUserCompetitionEnded(true);
        setFinishCompetitionModalOpen(false);
        if (document.fullscreenElement) {
          await document.exitFullscreen().catch(() => undefined);
        }
        toast.success('已结束本场比赛，后续无法再次提交');
      } else {
        toast.error(data.msg || '结束比赛失败');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.msg || '结束比赛失败');
    } finally {
      setFinishCompetitionLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentContent.trim()) { toast('请输入评论内容', { icon: '⚠️' }); return; }
    if (!userInfo?.id) { toast.error('请先登录后再发表评论'); return; }
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
      const data = await commentApi.publish(payload);
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
      const data = await commentApi.delete(commentId);
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

  return {
    cid,
    id,
    navigate,
    userInfo,
    problem,
    loading,
    languageOptions: submitLanguageOptions,
    language,
    setLanguage,
    code,
    setCode,
    runResult,
    setRunResult,
    codeLoading,
    comments,
    commentLoading,
    commentContent,
    setCommentContent,
    replyTarget,
    setReplyTarget,
    competition,
    commentSubmitting,
    isCompetitionOpen,
    isCompetitionEnd,
    isUserCompetitionEnded,
    finishCompetitionLoading,
    finishCompetitionModalOpen,
    setFinishCompetitionModalOpen,
    isEditorFullscreen,
    setIsEditorFullscreen,
    ideSettings,
    setIdeSettings,
    showCelebration,
    setShowCelebration,
    activeBottomTab,
    setActiveBottomTab,
    commentsOpen,
    setCommentsOpen,
    competitionProblems,
    competitionProblemsLoading,
    currentCompetitionProblem,
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
    activeExampleTab,
    setActiveExampleTab,
    modifiedExamples,
    setModifiedExamples,
    exampleInputs,
    setExampleInputs,
    currentExample,
    matchedExample,
    isCustomTest,
    currentTestInput,
    editorOptions,
    toggleEditorFullscreen,
    renderMarkdown,
    handleTestInputChange,
    handleTestCode,
    handleSubmitCode,
    handleFinishCompetition,
    handleSubmitComment,
    handleDeleteComment,
    loadMySubmissions,
    openMySubmissions,
  };
};
