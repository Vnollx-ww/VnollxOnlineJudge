import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { antiCheatApi, competitionApi } from '@/lib';
import { isAuthenticated } from '@/utils/auth';
import { useCompetitionFirstBloodWebSocket } from '@/hooks/useCompetitionFirstBloodWebSocket';

export interface Competition {
  id: number;
  title: string;
  description?: string;
  beginTime: string;
  endTime: string;
  needPassword: boolean;
  antiCheatMode?: 'NORMAL' | 'STRICT' | string;
}

export interface CompetitionProblem {
  id: number;
  title: string;
  submitCount: number;
  passCount: number;
  isSolved?: boolean | null;
}

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const calculateTimeRemaining = (diff: number): Countdown => {
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds };
};

export const formatCompetitionDetailTime = (timeStr: string) => {
  if (!timeStr) return '-';
  const date = new Date(timeStr);
  return date.toLocaleString('zh-CN');
};

export const useCompetitionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [problems, setProblems] = useState<CompetitionProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [problemsLoading, setProblemsLoading] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [countdown, setCountdown] = useState<Countdown | null>(null);
  const [status, setStatus] = useState('');
  const [isUserCompetitionEnded, setIsUserCompetitionEnded] = useState(false);
  const [finishStatusLoaded, setFinishStatusLoaded] = useState(false);
  const [finishCompetitionLoading, setFinishCompetitionLoading] = useState(false);
  const [finishCompetitionModalOpen, setFinishCompetitionModalOpen] = useState(false);
  const [fullscreenPromptOpen, setFullscreenPromptOpen] = useState(false);
  const [fullscreenPromptDismissed, setFullscreenPromptDismissed] = useState(false);
  const isStrictAntiCheat = competition?.antiCheatMode === 'STRICT';
  useCompetitionFirstBloodWebSocket(id, passwordVerified);

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
        console.error(error);
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
      const errorMsg = error.response?.data?.msg || error.message || '密码验证失败';
      toast.error(errorMsg);
      console.error(error);
    }
  };

  const loadProblems = async () => {
    setProblems([]);
    setProblemsLoading(true);
    try {
      const data = await competitionApi.listProblem<CompetitionProblem[]>(id);
      if (data.code === 200) setProblems(data.data || []);
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error('请先登录！');
        navigate('/login');
      } else {
        toast.error(error?.response?.data?.msg || '加载题目列表失败');
        console.error(error);
      }
    } finally {
      setProblemsLoading(false);
    }
  };

  const loadFinishStatus = async () => {
    if (!id) return;
    setFinishStatusLoaded(false);
    try {
      const data = await competitionApi.finishStatus<boolean>(id);
      if (data.code === 200) setIsUserCompetitionEnded(Boolean(data.data));
    } catch {
      setIsUserCompetitionEnded(false);
    } finally {
      setFinishStatusLoaded(true);
    }
  };

  const handleFinishCompetition = async () => {
    if (!id) return;
    setFinishCompetitionLoading(true);
    try {
      const data = await competitionApi.finish(id);
      if (data.code === 200) {
        setIsUserCompetitionEnded(true);
        setFinishCompetitionModalOpen(false);
        setFullscreenPromptOpen(false);
        if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
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

  const enterFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setFullscreenPromptOpen(false);
      setFullscreenPromptDismissed(false);
    } catch {
      toast.error('进入全屏失败，请检查浏览器权限后重试');
    }
  };

  const reportFullscreenRefuse = async () => {
    if (!id) return;
    try {
      await antiCheatApi.report({
        competitionId: Number(id),
        events: [
          {
            eventType: 'FULLSCREEN_EXIT',
            startedAt: new Date().toISOString(),
            endedAt: new Date().toISOString(),
            durationSeconds: 0,
            detailJson: JSON.stringify({ reason: 'REFUSE_FULLSCREEN' }),
          },
        ],
      });
    } catch {
      // ignore
    }
  };

  const handleSkipFullscreen = async () => {
    setFullscreenPromptOpen(false);
    setFullscreenPromptDismissed(true);
    await reportFullscreenRefuse();
    toast.error('严格模式下未进入全屏，该行为会被记录');
  };

  const handleOpenProblem = (problemId: number, event?: MouseEvent<HTMLButtonElement>) => {
    if (isStrictAntiCheat && status === 'running' && !isUserCompetitionEnded && !document.fullscreenElement) {
      void reportFullscreenRefuse();
      setFullscreenPromptDismissed(false);
      setFullscreenPromptOpen(true);
      toast.error('严格模式下必须进入全屏模式后才能答题');
      return;
    }
    const problemUrl = `/competition/${id}/problem/${problemId}`;
    if (event?.ctrlKey) {
      window.open(problemUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    navigate(problemUrl);
  };

  const updateCountdown = () => {
    if (!competition) return;
    const now = new Date();
    const beginTime = new Date(competition.beginTime);
    const endTime = new Date(competition.endTime);
    if (now < beginTime) {
      setStatus('upcoming');
      setCountdown(calculateTimeRemaining(beginTime.getTime() - now.getTime()));
    } else if (now >= beginTime && now <= endTime) {
      setStatus('running');
      setCountdown(calculateTimeRemaining(endTime.getTime() - now.getTime()));
    } else {
      setStatus('ended');
      setCountdown(null);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      toast.error('请先登录！');
      navigate('/login');
      return;
    }
    loadCompetition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (competition) {
      checkPassword();
      updateCountdown();
      loadFinishStatus();
      const timer = setInterval(updateCountdown, 1000);
      return () => clearInterval(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competition]);

  useEffect(() => {
    if (passwordVerified && competition) loadProblems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passwordVerified, competition]);

  useEffect(() => {
    if (
      isStrictAntiCheat &&
      status === 'running' &&
      passwordVerified &&
      finishStatusLoaded &&
      !isUserCompetitionEnded &&
      !fullscreenPromptDismissed &&
      !document.fullscreenElement
    ) {
      setFullscreenPromptOpen(true);
    } else {
      setFullscreenPromptOpen(false);
    }
  }, [
    isStrictAntiCheat,
    status,
    passwordVerified,
    finishStatusLoaded,
    isUserCompetitionEnded,
    fullscreenPromptDismissed,
  ]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (
        isStrictAntiCheat &&
        !document.fullscreenElement &&
        status === 'running' &&
        passwordVerified &&
        finishStatusLoaded &&
        !isUserCompetitionEnded
      ) {
        toast.error('你已退出全屏模式，该行为会被记录');
        setFullscreenPromptOpen(true);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isStrictAntiCheat, status, passwordVerified, finishStatusLoaded, isUserCompetitionEnded]);

  return {
    id,
    navigate,
    competition,
    problems,
    loading,
    problemsLoading,
    passwordModalVisible,
    password,
    setPassword,
    passwordVerified,
    countdown,
    status,
    isUserCompetitionEnded,
    finishCompetitionLoading,
    finishCompetitionModalOpen,
    setFinishCompetitionModalOpen,
    fullscreenPromptOpen,
    handleVerifyPassword,
    handleFinishCompetition,
    enterFullscreen,
    handleSkipFullscreen,
    handleOpenProblem,
  };
};
