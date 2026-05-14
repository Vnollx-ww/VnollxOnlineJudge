import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { dictApi, submissionApi, userApi } from '@/lib';
import { isAuthenticated, getUserInfo, setUserInfo } from '@/utils/auth';
import { useJudgeWebSocket } from '@/hooks/judge/useJudgeWebSocket';
import type { ApiResponse, JudgeMessage } from '@/types';

export interface Submission {
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
  passCount?: number | null;
  testCount?: number | null;
}

interface DictData {
  dictLabel: string;
  dictValue: string;
}

export const SUBMISSIONS_PAGE_SIZE = 15;

export const useSubmissions = () => {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [problemId, setProblemId] = useState('');
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [language, setLanguage] = useState<string | undefined>(undefined);
  const [statusOptions, setStatusOptions] = useState<{ value: string; label: string }[]>([]);
  const [languageOptions, setLanguageOptions] = useState<{ value: string; label: string }[]>([]);
  const [onlyMine, setOnlyMine] = useState(false);
  const [codeModalVisible, setCodeModalVisible] = useState(false);
  const [currentSubmission, setCurrentSubmission] = useState<Submission | null>(null);

  const pageSize = SUBMISSIONS_PAGE_SIZE;
  const currentPageRef = useRef(currentPage);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  const handleWebSocketMessage = useCallback((msg: JudgeMessage) => {
    const wsMsg = msg as JudgeMessage;
    if (!wsMsg?.snowflakeId) return;

    setSubmissions((prev) =>
      prev.map((item) => {
        if (String(item.snowflakeId) === String(wsMsg.snowflakeId)) {
          return {
            ...item,
            status: (wsMsg.status as string) || item.status,
            time: wsMsg.time ?? item.time,
            memory: wsMsg.memory ?? item.memory,
            passCount: wsMsg.passCount ?? item.passCount,
            testCount: wsMsg.testCount ?? item.testCount,
          };
        }
        return item;
      }),
    );

    if (wsMsg.status != null && wsMsg.status !== '评测中') {
      setTimeout(() => {
        loadSubmissions(currentPageRef.current);
      }, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useJudgeWebSocket(handleWebSocketMessage);

  const loadDictOptions = async () => {
    try {
      const [statusRes, languageRes] = await Promise.all([
        dictApi.listData<DictData[]>('JUDGE_RESULT_STATUS') as Promise<ApiResponse<DictData[]>>,
        dictApi.listData<DictData[]>('SUBMIT_LANGUAGE') as Promise<ApiResponse<DictData[]>>,
      ]);
      if (statusRes.code === 200) {
        setStatusOptions((statusRes.data || []).map((item) => ({ value: item.dictValue, label: item.dictLabel })));
      }
      if (languageRes.code === 200) {
        setLanguageOptions(
          (languageRes.data || []).map((item) => ({ value: item.dictLabel, label: item.dictLabel })),
        );
      }
    } catch (error) {
      console.error('加载提交筛选字典失败:', error);
    }
  };

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
            const res = (await userApi.getProfile<{ id: string; name: string; identity: string }>()) as ApiResponse<{
              id: string;
              name: string;
              identity: string;
            }>;
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

      const data = (await submissionApi.list<Submission[]>(params)) as ApiResponse<Submission[]>;
      if (data.code === 200) setSubmissions(data.data || []);

      const countParams: Record<string, string> = {};
      if (problemId) countParams.keyword = problemId;
      if (status) countParams.status = status;
      if (language) countParams.language = language;
      if (currentUid) countParams.uid = currentUid;

      const countData = (await submissionApi.count(countParams)) as ApiResponse<number>;
      if (countData.code === 200) setTotal(countData.data || 0);
    } catch (error) {
      toast.error('加载提交记录失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      toast.error('请先登录！');
      navigate('/');
      return;
    }
    setCurrentPage(1);
    loadSubmissions(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyMine, problemId, status, language]);

  useEffect(() => {
    if (!isAuthenticated()) return;
    loadDictOptions();
  }, []);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadSubmissions(page);
  };

  const resetFilters = () => {
    setProblemId('');
    setStatus(undefined);
    setLanguage(undefined);
    setOnlyMine(false);
  };

  const openSubmissionDetail = (record: Submission) => {
    setCurrentSubmission(record);
    setCodeModalVisible(true);
  };

  const closeSubmissionDetail = () => {
    setCodeModalVisible(false);
    setCurrentSubmission(null);
  };

  return {
    submissions,
    loading,
    currentPage,
    total,
    pageSize,
    problemId,
    setProblemId,
    status,
    setStatus,
    language,
    setLanguage,
    statusOptions,
    languageOptions,
    onlyMine,
    setOnlyMine,
    codeModalVisible,
    currentSubmission,
    handlePageChange,
    resetFilters,
    openSubmissionDetail,
    closeSubmissionDetail,
    navigate,
  };
};
