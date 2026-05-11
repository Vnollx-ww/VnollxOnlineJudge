import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { competitionApi } from '@/lib';
import { isAuthenticated } from '@/utils/auth';
import { useCompetitionFirstBloodWebSocket } from '@/hooks/useCompetitionFirstBloodWebSocket';

export interface Competition {
  id: number;
  title: string;
  beginTime: string;
  endTime: string;
  needPassword: boolean;
}

export interface TeamMember {
  userId: number;
  userName: string;
  realName?: string;
}

export interface Problem {
  id: number;
  title: string;
  label?: string;
  passCount?: number;
  submitCount?: number;
}

export interface ProblemResult {
  problemId: number;
  solved: boolean;
  firstSolve: boolean;
  wrongCount: number;
  solveMinutes?: number;
  solveTime?: string;
}

export interface SubmissionRank {
  id: number;
  problemId: number;
  problemLabel?: string;
  status?: string;
  result: 'AC' | 'WA' | string;
  submitTime?: string;
  submitMinutes: number;
  displayTime: string;
}

export interface RankUser {
  id: number;
  name: string;
  type?: string;
  members?: TeamMember[];
  passCount: number;
  penaltyTime: number;
  problems?: ProblemResult[];
  submissions?: SubmissionRank[];
}

export type ProblemHeader = Problem & { color: string; label: string; stat: string };

export const balloonColors = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#38bdf8', '#2563eb',
  '#a855f7', '#dc2626', '#92400e', '#0f766e', '#db2777', '#0891b2', '#4c0519',
];

const isProblemSame = (a: Problem, b: Problem) =>
  a.id === b.id &&
  a.title === b.title &&
  a.label === b.label &&
  (a.passCount || 0) === (b.passCount || 0) &&
  (a.submitCount || 0) === (b.submitCount || 0);

const isProblemResultSame = (a?: ProblemResult, b?: ProblemResult) => {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.problemId === b.problemId &&
    a.solved === b.solved &&
    a.firstSolve === b.firstSolve &&
    (a.wrongCount || 0) === (b.wrongCount || 0) &&
    (a.solveMinutes || 0) === (b.solveMinutes || 0) &&
    a.solveTime === b.solveTime
  );
};

const isTeamMemberSame = (a?: TeamMember, b?: TeamMember) => {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.userId === b.userId && a.userName === b.userName && a.realName === b.realName;
};

const isUserSame = (a: RankUser, b: RankUser) => {
  if (
    a.id !== b.id ||
    a.name !== b.name ||
    a.type !== b.type ||
    (a.passCount || 0) !== (b.passCount || 0) ||
    (a.penaltyTime || 0) !== (b.penaltyTime || 0)
  ) {
    return false;
  }
  const aProblems = a.problems || [];
  const bProblems = b.problems || [];
  if (aProblems.length !== bProblems.length) return false;
  for (let i = 0; i < aProblems.length; i += 1) {
    if (!isProblemResultSame(aProblems[i], bProblems[i])) return false;
  }
  const aMembers = a.members || [];
  const bMembers = b.members || [];
  if (aMembers.length !== bMembers.length) return false;
  for (let i = 0; i < aMembers.length; i += 1) {
    if (!isTeamMemberSame(aMembers[i], bMembers[i])) return false;
  }
  return true;
};

export const getUserKey = (user: RankUser) => String(user.id ?? user.name);

export const useCompetitionRanklist = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [users, setUsers] = useState<RankUser[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [expandedUserKeys, setExpandedUserKeys] = useState<Set<string>>(() => new Set());
  const [ranklistSubmissions, setRanklistSubmissions] = useState<Record<string, SubmissionRank[]>>({});
  const [loadingSubmissionKeys, setLoadingSubmissionKeys] = useState<Set<string>>(() => new Set());
  useCompetitionFirstBloodWebSocket(id, passwordVerified);

  const returnTo =
    typeof (location.state as any)?.returnTo === 'string' &&
    (location.state as any).returnTo.startsWith(`/competition/${id}/problem/`)
      ? (location.state as any).returnTo
      : `/competition/${id}`;

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
      const errorMsg = error.response?.data?.msg || error.message || '密码验证失败';
      toast.error(errorMsg);
    }
  };

  const ranklistSubmissionsRef = useRef(ranklistSubmissions);
  ranklistSubmissionsRef.current = ranklistSubmissions;
  const loadingSubmissionKeysRef = useRef(loadingSubmissionKeys);
  loadingSubmissionKeysRef.current = loadingSubmissionKeys;

  const loadRanklist = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const data = await competitionApi.ranklistDetail<{ problems: Problem[]; users: RankUser[] }>(id);
      if (data.code === 200) {
        const nextProblems: Problem[] = data.data?.problems || [];
        const nextUsers: RankUser[] = data.data?.users || [];
        setProblems((prev) => {
          if (prev.length === nextProblems.length) {
            const same = prev.every((p, i) => isProblemSame(p, nextProblems[i]));
            if (same) return prev;
          }
          return nextProblems;
        });
        setUsers((prev) => {
          if (prev.length !== nextUsers.length) return nextUsers;
          let changed = false;
          const merged = nextUsers.map((u, i) => {
            if (isUserSame(prev[i], u)) return prev[i];
            changed = true;
            return u;
          });
          return changed ? merged : prev;
        });
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error('请先登录！');
        navigate('/login');
      } else {
        toast.error('加载排行榜失败');
      }
    } finally {
      if (showLoading) setLoading(false);
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
    if (competition) checkPassword();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competition]);

  useEffect(() => {
    if (passwordVerified && competition) loadRanklist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passwordVerified, competition]);

  useEffect(() => {
    if (!passwordVerified || !competition) return;
    const timer = window.setInterval(() => loadRanklist(false), 10000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passwordVerified, competition, id]);

  const problemHeaders = useMemo<ProblemHeader[]>(
    () =>
      problems.map((problem, index) => ({
        ...problem,
        label: problem.label || String.fromCharCode(65 + index),
        color: balloonColors[index % balloonColors.length],
        stat: `${problem.passCount || 0}/${problem.submitCount || 0}`,
      })),
    [problems],
  );

  const fixedColumnsWidth = 515;
  const problemColumnWidth = 90;
  const problemColumnsWidth = problemHeaders.length * problemColumnWidth;
  const ranklistTableWidth = fixedColumnsWidth + problemColumnsWidth;

  const loadRanklistSubmissions = useCallback(
    async (user: RankUser) => {
      const userKey = getUserKey(user);
      if (ranklistSubmissionsRef.current[userKey] || loadingSubmissionKeysRef.current.has(userKey)) return;
      if (!user.id) {
        toast.error('该排行榜行缺少用户/队伍 ID，无法加载提交记录');
        return;
      }
      setLoadingSubmissionKeys((current) => new Set(current).add(userKey));
      try {
        const data = await competitionApi.ranklistSubmissions<SubmissionRank[]>(id, user.id);
        if (data.code === 200) {
          setRanklistSubmissions((current) => ({ ...current, [userKey]: data.data || [] }));
        }
      } catch (error: any) {
        toast.error(error.response?.data?.msg || '加载提交记录失败');
      } finally {
        setLoadingSubmissionKeys((current) => {
          const next = new Set(current);
          next.delete(userKey);
          return next;
        });
      }
    },
    [id],
  );

  const handleToggleRow = useCallback(
    (user: RankUser) => {
      const userKey = getUserKey(user);
      setExpandedUserKeys((current) => {
        const next = new Set(current);
        if (next.has(userKey)) {
          next.delete(userKey);
        } else {
          next.add(userKey);
          loadRanklistSubmissions(user);
        }
        return next;
      });
    },
    [loadRanklistSubmissions],
  );

  return {
    id,
    navigate,
    competition,
    users,
    problems,
    loading,
    passwordModalVisible,
    password,
    setPassword,
    passwordVerified,
    expandedUserKeys,
    ranklistSubmissions,
    loadingSubmissionKeys,
    handleVerifyPassword,
    problemHeaders,
    ranklistTableWidth,
    handleToggleRow,
    returnTo,
  };
};
