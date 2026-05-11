import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { competitionApi, dictApi, submissionApi } from '@/lib';
import { isAuthenticated } from '@/utils/auth';
import { useCompetitionFirstBloodWebSocket } from '@/hooks/useCompetitionFirstBloodWebSocket';

export interface Competition {
  id: number;
  title: string;
  beginTime: string;
  endTime: string;
  needPassword: boolean;
}

export interface Submission {
  id: number;
  pid: number;
  problemName?: string;
  userName: string;
  language: string;
  status: string;
  createTime: string;
  time?: number;
  memory?: number;
}

interface DictData {
  dictLabel: string;
  dictValue: string;
}

export const COMPETITION_SUBMISSIONS_PAGE_SIZE = 10;

export const useCompetitionSubmissions = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [language, setLanguage] = useState<string | null>(null);
  const [statusOptions, setStatusOptions] = useState<{ value: string; label: string }[]>([]);
  const [languageOptions, setLanguageOptions] = useState<{ value: string; label: string }[]>([]);
  useCompetitionFirstBloodWebSocket(id, passwordVerified);

  const pageSize = COMPETITION_SUBMISSIONS_PAGE_SIZE;

  const loadDictOptions = async () => {
    try {
      const [statusRes, languageRes] = await Promise.all([
        dictApi.listData<DictData[]>('JUDGE_RESULT_STATUS'),
        dictApi.listData<DictData[]>('SUBMIT_LANGUAGE'),
      ]);
      if (statusRes.code === 200) {
        setStatusOptions(((statusRes.data || []) as DictData[]).map((item) => ({ value: item.dictValue, label: item.dictLabel })));
      }
      if (languageRes.code === 200) {
        setLanguageOptions(((languageRes.data || []) as DictData[]).map((item) => ({ value: item.dictLabel, label: item.dictLabel })));
      }
    } catch (error) {
      console.error('加载提交筛选字典失败:', error);
    }
  };

  const loadCompetition = async () => {
    try {
      const data = await competitionApi.list<Competition[]>();
      if (data.code === 200) {
        const comp = data.data.find((c: Competition) => c.id.toString() === id);
        if (comp) setCompetition(comp);
        else {
          toast.error('比赛不存在');
          navigate('/competitions');
        }
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error('请先登录！');
        navigate('/login');
      } else {
        toast.error('加载比赛信息失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const checkPassword = () => {
    if (competition && competition.needPassword) {
      const verified = localStorage.getItem(`competition_${id}_verified`);
      if (verified === 'true') setPasswordVerified(true);
      else setPasswordModalVisible(true);
    } else {
      setPasswordVerified(true);
    }
  };

  const handleVerifyPassword = async () => {
    try {
      const data = await competitionApi.confirm(id, password);
      if (data.code === 200) {
        toast.success('密码验证成功');
        setPasswordVerified(true);
        setPasswordModalVisible(false);
        localStorage.setItem(`competition_${id}_verified`, 'true');
      } else {
        toast.error(data.msg || '密码错误');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.msg || error.message || '密码验证失败');
    }
  };

  const loadSubmissions = async (page: number) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        pageNum: String(page),
        pageSize: String(pageSize),
        cid: id!,
      };
      if (status) params.status = status;
      if (language) params.language = language;
      const data = await submissionApi.list<Submission[]>(params);
      if (data.code === 200) setSubmissions(data.data || []);

      const countParams: Record<string, string> = { cid: id! };
      if (status) countParams.status = status;
      if (language) countParams.language = language;
      const countData = await submissionApi.count(countParams);
      if (countData.code === 200) setTotal(countData.data || 0);
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error('请先登录！');
        navigate('/login');
      } else {
        toast.error('加载提交记录失败');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      toast.error('请先登录！');
      navigate('/login');
      return;
    }
    loadDictOptions();
    loadCompetition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, navigate]);

  useEffect(() => {
    if (competition) checkPassword();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competition]);

  useEffect(() => {
    if (passwordVerified && competition) loadSubmissions(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passwordVerified, competition]);

  useEffect(() => {
    if (passwordVerified) loadSubmissions(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, status, language]);

  const resetFilters = () => {
    setStatus(null);
    setLanguage(null);
  };

  return {
    id,
    navigate,
    competition,
    submissions,
    loading,
    passwordModalVisible,
    password,
    setPassword,
    passwordVerified,
    currentPage,
    setCurrentPage,
    total,
    pageSize,
    status,
    setStatus,
    language,
    setLanguage,
    statusOptions,
    languageOptions,
    handleVerifyPassword,
    resetFilters,
  };
};
