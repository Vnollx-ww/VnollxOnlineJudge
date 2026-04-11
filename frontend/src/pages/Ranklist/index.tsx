import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ChevronRight, Crown, Medal, Trophy, TrendingUp } from 'lucide-react';
import api from '../../utils/api';
import { isAuthenticated, getUserInfo } from '../../utils/auth';
import type { ApiResponse } from '../../types';

interface RankUser {
  id: number;
  name: string;
  passCount: number;
  submitCount: number;
  avatar?: string;
}

interface DisplayRankUser extends RankUser {
  rank: number;
  passRate: number;
}

const Ranklist: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<RankUser[]>([]);
  const [topUsers, setTopUsers] = useState<RankUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      toast.error('请先登录！');
      navigate('/');
      return;
    }
    const user = getUserInfo();
    if (user?.id) {
      setCurrentUserId(parseInt(user.id));
    }
    loadRanking();
  }, [navigate]);

  const loadRanking = async () => {
    setLoading(true);
    try {
      const data = await api.get('/user/list') as ApiResponse<RankUser[]>;
      if (data.code === 200) {
        const sorted = [...data.data].sort((a, b) => {
          if (b.passCount !== a.passCount) {
            return b.passCount - a.passCount;
          }
          if (a.submitCount !== b.submitCount) {
            return a.submitCount - b.submitCount;
          }
          return a.name.localeCompare(b.name);
        });

        setTopUsers(sorted.slice(0, 3));
        setUsers(sorted.slice(3));
      }
    } catch (error) {
      toast.error('加载排行榜失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePassRateValue = (pass: number, submit: number) => {
    if (submit === 0) return 0;
    return Math.round((pass / submit) * 100);
  };

  const calculatePassRate = (pass: number, submit: number) => {
    return `${calculatePassRateValue(pass, submit)}%`;
  };

  const getRateStyle = (rate: number) => {
    if (rate >= 80) return 'bg-emerald-500 text-white';
    if (rate >= 50) return 'bg-amber-400 text-white';
    return 'bg-slate-100 text-slate-500';
  };

  const displayUsers = useMemo<DisplayRankUser[]>(() => {
    const rankedUsers = [...topUsers, ...users];

    return rankedUsers.map((user, index) => {
      const passRate = calculatePassRateValue(user.passCount, user.submitCount);

      return {
        ...user,
        rank: index + 1,
        passRate,
      };
    });
  }, [topUsers, users]);

  const podiumUsers = displayUsers.slice(0, 3);
  const listUsers = displayUsers.slice(3);
  const podiumDisplayUsers = podiumUsers.length === 3 ? [podiumUsers[1], podiumUsers[0], podiumUsers[2]] : podiumUsers;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <div className="mb-3 flex items-center justify-center gap-3">
            <Trophy className="h-9 w-9 text-amber-500" />
            <h1 className="text-4xl font-black tracking-tight text-slate-900">排行榜</h1>
          </div>
          <p className="font-medium text-slate-500">根据通过题目数量排名，通过数相同则提交更少的用户靠前</p>
        </div>

        {loading ? (
          <div className="rounded-[32px] border border-slate-100 bg-white p-10 text-center shadow-xl shadow-slate-200/40">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500"></div>
            <p className="font-medium text-slate-500">榜单加载中...</p>
          </div>
        ) : displayUsers.length === 0 ? (
          <div className="rounded-[32px] border border-slate-100 bg-white p-10 text-center shadow-xl shadow-slate-200/40">
            <Trophy className="mx-auto mb-4 h-10 w-10 text-slate-300" />
            <p className="text-lg font-bold text-slate-700">暂无排行榜数据</p>
            <p className="mt-2 text-sm text-slate-400">等第一位用户完成题目后，这里会出现排名。</p>
          </div>
        ) : (
          <>
            {podiumUsers.length > 0 && (
              <div className="mb-20 flex flex-col items-stretch justify-center gap-4 px-4 md:flex-row md:items-end">
                {podiumDisplayUsers.map((user) => (
                  <PodiumCard
                    key={user.id}
                    user={user}
                    isWinner={user.rank === 1}
                    isCurrentUser={currentUserId === user.id}
                  />
                ))}
              </div>
            )}

            <div className="overflow-hidden rounded-[32px] border border-slate-100 bg-white shadow-xl shadow-slate-200/50">
              <div className="flex flex-col gap-3 border-b border-slate-50 p-8 md:flex-row md:items-center md:justify-between">
                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                  <TrendingUp size={20} className="text-blue-500" />
                  实时排名详情
                </h3>
                <span className="text-xs font-bold tracking-widest text-slate-400">按通过题数排序，提交越少越靠前</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left">
                  <thead>
                    <tr className="text-[13px] font-bold tracking-wider text-slate-400">
                      <th className="py-4 pl-10">排名</th>
                      <th className="px-6 py-4">用户</th>
                      <th className="px-6 py-4 text-center">解题数</th>
                      <th className="px-10 py-4 text-right">通过率</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {listUsers.length > 0 ? (
                      listUsers.map((item) => (
                        <tr
                          key={item.id}
                          className={`group cursor-default transition-all ${currentUserId === item.id ? 'bg-blue-50/60 hover:bg-blue-50/80' : 'hover:bg-blue-50/30'}`}
                        >
                          <td className={`py-6 pl-10 font-bold transition-colors ${currentUserId === item.id ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-600'}`}>
                            {item.rank}
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex items-center gap-4">
                              <div
                                className={`flex h-12 w-12 items-center justify-center rounded-2xl border font-bold shadow-sm transition-all ${item.avatar ? 'bg-cover bg-center text-transparent' : 'bg-slate-100 text-slate-600'} ${currentUserId === item.id ? 'border-blue-200 bg-white' : 'border-slate-200 group-hover:border-blue-200 group-hover:bg-white'}`}
                                style={item.avatar ? { backgroundImage: `url(${item.avatar})` } : undefined}
                              >
                                {!item.avatar && (item.name?.charAt(0)?.toUpperCase() || 'U')}
                              </div>
                              <div>
                                <span className={`block font-bold ${currentUserId === item.id ? 'text-blue-600' : 'text-slate-700 group-hover:text-slate-900'}`}>
                                  {item.name}
                                </span>
                                <span className="mt-1 block text-xs font-medium text-slate-400">提交 {item.submitCount} 次</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-6 text-center">
                            <div className="inline-flex items-baseline gap-1">
                              <span className="text-lg font-black text-slate-800">{item.passCount}</span>
                              <span className="text-xs font-bold text-slate-400">通过</span>
                            </div>
                          </td>
                          <td className="px-10 py-6 text-right">
                            <span className={`inline-flex rounded-xl px-4 py-1.5 text-xs font-black shadow-sm ${getRateStyle(item.passRate)}`}>
                              {calculatePassRate(item.passCount, item.submitCount)}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-10 py-12 text-center text-sm font-medium text-slate-400">
                          目前仅有前三名用户，更多排名将在这里显示。
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-50/50 p-8 text-center">
                <button
                  type="button"
                  onClick={loadRanking}
                  className="mx-auto flex items-center gap-1 text-sm font-bold text-blue-600 transition-colors hover:text-blue-700"
                >
                  刷新实时榜单 <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const PodiumCard: React.FC<{ user: DisplayRankUser; isWinner?: boolean; isCurrentUser?: boolean }> = ({
  user,
  isWinner = false,
  isCurrentUser = false,
}) => {
  const badgeClassName = user.rank === 1
    ? 'bg-amber-100 text-amber-600'
    : user.rank === 2
      ? 'bg-slate-200 text-slate-500'
      : 'bg-orange-100 text-orange-600';

  const titleColorClassName = user.rank === 1
    ? 'text-amber-500'
    : user.rank === 2
      ? 'text-slate-400'
      : 'text-orange-400';

  const heightClassName = user.rank === 1
    ? 'min-h-[20rem] md:h-72'
    : user.rank === 2
      ? 'min-h-[18rem] md:h-64'
      : 'min-h-[17rem] md:h-56';

  return (
    <div className="flex w-full max-w-[240px] flex-col items-center transition-all duration-500 hover:-translate-y-2">
      <div
        className={`relative flex w-full flex-col items-center justify-between rounded-[32px] border-2 bg-white p-6 shadow-xl ${heightClassName} ${isWinner ? 'border-amber-300 shadow-amber-100' : 'border-slate-100 shadow-slate-200/50'} ${isCurrentUser ? 'ring-2 ring-blue-200' : ''}`}
      >
        <div className={`absolute -top-8 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl shadow-lg ${badgeClassName}`}>
          {isWinner ? <Crown size={32} /> : <Medal size={28} />}
        </div>

        <div className="mt-8 w-full text-center">
          <p className={`mb-1 text-[11px] font-black uppercase tracking-widest ${titleColorClassName}`}>第 {user.rank} 名</p>

          <h4 className={`truncate px-2 text-lg font-bold ${isCurrentUser ? 'text-blue-600' : 'text-slate-800'}`}>{user.name}</h4>
          <p className="mt-1 text-xs font-medium text-slate-400">提交 {user.submitCount} 次</p>
        </div>

        <div className="w-full">
          <div className="rounded-2xl bg-slate-50 p-4 text-center">
            <p className="text-2xl font-black text-slate-900">{user.passCount}</p>
            <p className="text-[10px] font-bold uppercase tracking-tighter text-slate-400">通过题目</p>
          </div>
        </div>

        <div className={`h-1.5 w-12 rounded-full ${isWinner ? 'bg-amber-400' : 'bg-slate-200'}`}></div>
      </div>
    </div>
  );
};

export default Ranklist;
