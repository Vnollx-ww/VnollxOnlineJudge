import { Fragment, useState, useEffect, useMemo, memo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Spin, Empty, Modal, Space } from '@/components';
import { ArrowLeft, Lock } from 'lucide-react';
import Input from '@/components/input';
import {
  useCompetitionRanklist,
  getUserKey,
  type ProblemResult,
  type ProblemHeader,
  type SubmissionRank,
  type RankUser as User,
} from '@/hooks/useCompetitionRanklist';


type DetailSubmission = {
  id: number;
  problem: ProblemHeader;
  label: string;
  color: string;
  time: string;
  minutes: number;
  submitTimestamp: number;
  status: 'AC' | 'WA';
};

const BalloonIcon = memo(({ color, className = 'h-9 w-9', style }: { color: string; className?: string; style?: React.CSSProperties }) => (
  <svg className={`${className} shrink-0`} viewBox="0 0 48 48" fill="none" style={style}>
    <title>{color}</title>
    <path
      d="M34 16C35 8 31.1274 4 24.1274 4C17.1274 4 13 9 14 16C15 23 21.2548 28 24.1274 28C27 28 33 24 34 16Z"
      fill={color}
      stroke="#888"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M25 28C23 28.9697 20 31.8889 20 35C20 38.1111 30 36.4444 30 39.5556C30 42.6667 19 44 19 44"
      fill="none"
      stroke="#888"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
));

const LED_RECTS = [
  <rect key="0" x="20" y="10" width="80" height="14" rx="5" />,  // 0: Top
  <rect key="1" x="96" y="20" width="14" height="75" rx="5" />,  // 1: TR
  <rect key="2" x="96" y="105" width="14" height="75" rx="5" />, // 2: BR
  <rect key="3" x="20" y="176" width="80" height="14" rx="5" />, // 3: Bottom
  <rect key="4" x="10" y="105" width="14" height="75" rx="5" />, // 4: BL
  <rect key="5" x="10" y="20" width="14" height="75" rx="5" />,  // 5: TL
  <rect key="6" x="20" y="93" width="80" height="14" rx="5" />,  // 6: Middle
];

const digitSegments = [
  [0, 1, 2, 3, 4, 5],       // 0
  [1, 2],                   // 1
  [0, 1, 6, 4, 3],          // 2
  [0, 1, 6, 2, 3],          // 3
  [5, 6, 1, 2],             // 4
  [0, 5, 6, 2, 3],          // 5
  [0, 2, 3, 4, 5, 6],       // 6
  [0, 1, 2],                // 7
  [0, 1, 2, 3, 4, 5, 6],    // 8
  [0, 1, 2, 3, 5, 6],       // 9
];

const getActiveSegments = (digit: string) => {
  const num = Number.parseInt(digit, 10);
  return Number.isNaN(num) ? [] : digitSegments[num];
};

const LedDigitSvg = memo(({ digit, fontSize, digitColor, withGlow, glowColor }: { digit: string; fontSize: number; digitColor: string; withGlow?: boolean; glowColor?: string }) => {
  const activeSegments = getActiveSegments(digit);
  const isOne = digit === '1';
  const viewBox = isOne ? "70 0 50 200" : "0 0 120 200";

  return (
    <svg
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      style={{
        height: fontSize,
        width: fontSize * 0.6,
        margin: `0 ${fontSize * 0.05}px`,
        filter: withGlow ? `drop-shadow(0 0 6px ${glowColor})` : 'none',
        transform: 'translateZ(0)',
      }}
      className="inline-block flex-shrink-0"
    >
      <g fill={digitColor} opacity={0.06}>
        {LED_RECTS}
      </g>
      <g fill={digitColor}>
        {activeSegments.map(i => LED_RECTS[i])}
      </g>
    </svg>
  );
});

const LedSeparatorSvg = memo(({ fontSize, digitColor, withGlow, glowColor }: { fontSize: number; digitColor: string; withGlow?: boolean; glowColor?: string }) => (
  <svg
    viewBox="0 0 40 200"
    style={{
      height: fontSize,
      width: fontSize * 0.2,
      margin: `0 ${fontSize * 0.05}px`,
      filter: withGlow ? `drop-shadow(0 0 4px ${glowColor})` : 'none',
      transform: 'translateZ(0)'
    }}
    className="inline-block flex-shrink-0"
  >
    <circle cx="20" cy="55" r="14" fill={digitColor} />
    <circle cx="20" cy="145" r="14" fill={digitColor} />
  </svg>
));

const LedTimeDisplay = memo(({ value, fontSize = 42, digitColor = '#00ff00', glowColor = 'rgba(0,255,0,0.7)' }: { value: string; fontSize?: number; digitColor?: string; glowColor?: string }) => {
  const [hours = '00', minutes = '00', seconds = '00'] = value.split(':');
  const digits = `${hours.padStart(2, '0')}${minutes.padStart(2, '0')}${seconds.padStart(2, '0')}`.slice(0, 6);

  return (
    <div
      className="flex items-center justify-center rounded border-4 border-inset border-[#333] bg-black px-2 py-1 shadow-[0_0_10px_rgba(0,0,0,0.5)]"
      style={{ height: fontSize + 18 }}
    >
      <LedDigitSvg digit={digits[0]} fontSize={fontSize} digitColor={digitColor} glowColor={glowColor} withGlow={true} />
      <LedDigitSvg digit={digits[1]} fontSize={fontSize} digitColor={digitColor} glowColor={glowColor} withGlow={true} />
      <LedSeparatorSvg fontSize={fontSize} digitColor={digitColor} glowColor={glowColor} withGlow={true} />
      <LedDigitSvg digit={digits[2]} fontSize={fontSize} digitColor={digitColor} glowColor={glowColor} withGlow={true} />
      <LedDigitSvg digit={digits[3]} fontSize={fontSize} digitColor={digitColor} glowColor={glowColor} withGlow={true} />
      <LedSeparatorSvg fontSize={fontSize} digitColor={digitColor} glowColor={glowColor} withGlow={true} />
      <LedDigitSvg digit={digits[4]} fontSize={fontSize} digitColor={digitColor} glowColor={glowColor} withGlow={true} />
      <LedDigitSvg digit={digits[5]} fontSize={fontSize} digitColor={digitColor} glowColor={glowColor} withGlow={true} />
    </div>
  );
});

const InlineLedNumber = memo(({ value, fontSize = 19, digitColor = '#000' }: { value?: string | number; fontSize?: number; digitColor?: string }) => {
  const text = String(value ?? '');

  return (
    <span className="inline-flex items-center justify-center align-middle" style={{ height: fontSize }}>
      {Array.from(text).map((char, index) => {
        if (/\d/.test(char)) {
          return (
            <LedDigitSvg
              key={`${char}-${index}`}
              digit={char}
              fontSize={fontSize}
              digitColor={digitColor}
            />
          );
        }

        if (char === ':') {
          return (
            <LedSeparatorSvg
              key={`${char}-${index}`}
              fontSize={fontSize}
              digitColor={digitColor}
            />
          );
        }

        return (
          <span key={`${char}-${index}`} className="font-['Digital-7',sans-serif] leading-none" style={{ color: digitColor, fontSize }}>
            {char}
          </span>
        );
      })}
    </span>
  );
});

const formatHMS = (seconds: number) => {
  if (!seconds || seconds < 0) return '00:00:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const CountdownDisplay = memo(({ endTime }: { endTime?: string }) => {
  const [value, setValue] = useState(() => {
    if (!endTime) return '00:00:00';
    const end = new Date(endTime).getTime();
    if (Number.isNaN(end)) return '00:00:00';
    const diff = Math.floor((end - Date.now()) / 1000);
    return formatHMS(diff);
  });

  useEffect(() => {
    const tick = () => {
      if (!endTime) {
        setValue('00:00:00');
        return;
      }
      const end = new Date(endTime).getTime();
      if (Number.isNaN(end)) {
        setValue('00:00:00');
        return;
      }
      const diff = Math.floor((end - Date.now()) / 1000);
      setValue(formatHMS(diff));
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [endTime]);

  return <LedTimeDisplay value={value} />;
});

const EMPTY_SUBMISSIONS: SubmissionRank[] = [];

const getSubmissionTimestamp = (submitTime?: string) => {
  if (!submitTime) return 0;
  const timestamp = Date.parse(submitTime.replace(/-/g, '/'));
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const compareSubmissionsDesc = (a: DetailSubmission, b: DetailSubmission) => {
  const timeCompare = b.submitTimestamp - a.submitTimestamp;
  if (timeCompare !== 0) return timeCompare;
  return b.id - a.id;
};

const setRecentSubmissionHighlighted = (submissionId: number, highlighted: boolean) => {
  const recentTarget = document.getElementById(`rs-${submissionId}`);
  const problemTarget = document.getElementById(`ps-${submissionId}`);
  recentTarget?.classList.toggle('bg-blue-100', highlighted);
  problemTarget?.classList.toggle('bg-blue-100', highlighted);
};

const formatBoardTime = (seconds: number) => {
  if (!seconds) return '0';
  return String(seconds);
};

const getProblemCellClassName = (result?: ProblemResult) => {
  const baseClassName = "relative h-[52px] whitespace-nowrap px-1.5 py-2 text-center font-['Digital-7',sans-serif] text-[20px] leading-none text-[#222]";
  if (!result) return `${baseClassName} bg-white`;
  if (result.solved) {
    return `${baseClassName} ${result.firstSolve ? 'bg-[#98e6b1]' : (result.wrongCount || 0) > 0 ? 'bg-[#c7efd3]' : 'bg-[#e4f8e9]'}`;
  }
  if ((result.wrongCount || 0) > 0) {
    return `${baseClassName} bg-[#f7b2b2]`;
  }
  return `${baseClassName} bg-white`;
};

const renderProblemCell = (result?: ProblemResult) => {
  if (!result) return <span className="flex h-full items-center justify-center"><span className="block h-1.5 w-1.5 rounded-full bg-[#ccc]" /></span>;
  if (result.solved) {
    return (
      <span className="flex items-center justify-center gap-1.5">
        <InlineLedNumber value={result.solveTime} />
        <span className="self-start -mt-1.5 text-[12px] leading-none text-[#222]">+{result.wrongCount || 0}</span>
      </span>
    );
  }
  if ((result.wrongCount || 0) > 0) {
    return <span className="text-[20px] leading-none text-[#222]">+{result.wrongCount}</span>;
  }
  return <span className="flex h-full items-center justify-center"><span className="block h-1.5 w-1.5 rounded-full bg-[#ccc]" /></span>;
};

const scrollToRecentSubmission = (submissionId: number) => {
  const target = document.getElementById(`rs-${submissionId}`);
  if (!target) return;
  const container = target.closest('[data-recent-submissions]');
  if (!container) return;
  const containerRect = container.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const scrollTop = container.scrollTop + (targetRect.top - containerRect.top) - (containerRect.height / 2) + (targetRect.height / 2);
  container.scrollTo({ top: scrollTop, behavior: 'smooth' });
};

const renderDetailStatus = (status: 'AC' | 'WA') => (
  <span className={`font-mono text-[19px] font-normal leading-none border-b-[1.5px] pb-[1px] ${status === 'AC' ? 'border-[#22c55e] text-[#22c55e]' : 'border-[#ef4444] text-[#ef4444]'}`}>
    {status}
  </span>
);

interface RanklistRowProps {
  user: User;
  rank: number;
  expanded: boolean;
  problemHeaders: ProblemHeader[];
  submissions: SubmissionRank[];
  submissionsLoading: boolean;
  onToggle: (user: User) => void;
}

const RanklistRow = memo(function RanklistRow({
  user,
  rank,
  expanded,
  problemHeaders,
  submissions,
  submissionsLoading,
  onToggle,
}: RanklistRowProps) {
  const problemHeaderMap = useMemo(() => {
    const map = new Map<number, ProblemHeader>();
    for (const problem of problemHeaders) {
      map.set(problem.id, problem);
    }
    return map;
  }, [problemHeaders]);

  const detailSubmissions = useMemo<DetailSubmission[]>(() => {
    if (!expanded) return [];
    return submissions.flatMap((submission) => {
      const problem = problemHeaderMap.get(submission.problemId);
      if (!problem) return [];
      const status: 'AC' | 'WA' = submission.result === 'AC' ? 'AC' : 'WA';
      return [{
        id: submission.id,
        problem,
        label: submission.problemLabel || problem?.label || '',
        color: problem?.color || '#adb5bd',
        time: submission.displayTime,
        minutes: submission.submitMinutes || 0,
        submitTimestamp: getSubmissionTimestamp(submission.submitTime),
        status,
      }];
    }).sort(compareSubmissionsDesc);
  }, [expanded, submissions, problemHeaderMap]);

  const submissionsByProblem = useMemo(() => {
    const map = new Map<number, DetailSubmission[]>();
    if (!expanded) return map;
    for (const s of detailSubmissions) {
      const arr = map.get(s.problem.id);
      if (arr) arr.push(s);
      else map.set(s.problem.id, [s]);
    }
    return map;
  }, [detailSubmissions, expanded]);

  const recentSubmissions = useMemo(
    () => (expanded ? detailSubmissions.slice(0, 24) : []),
    [detailSubmissions, expanded],
  );

  const teamMembers = useMemo(() => (user.members || []).slice(0, 3), [user.members]);

  const handleClick = useCallback(() => onToggle(user), [onToggle, user]);

  return (
    <Fragment>
      <tr className="cursor-pointer" onClick={handleClick}>
        <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-1.5 py-3 text-center text-lg font-medium text-black">
          <span className="flex items-center justify-center">{rank}</span>
        </td>
        <td className="sticky left-[55px] z-10 w-[300px] truncate whitespace-nowrap bg-white py-3 pl-5 pr-1.5 text-left text-lg font-medium text-[#444]">
          <button
            type="button"
            className={`max-w-full truncate text-left font-inherit text-inherit ${expanded ? 'underline' : ''}`}
          >
            {user.name}
          </button>
        </td>
        <td className="sticky left-[355px] z-10 whitespace-nowrap bg-white px-1.5 py-3 text-center font-['Digital-7',sans-serif] text-[20px] leading-none text-[#222]">
          <span className="flex items-center justify-center">{user.passCount || 0}</span>
        </td>
        <td className="sticky left-[435px] z-10 whitespace-nowrap bg-white px-1.5 py-3 text-center font-['Digital-7',sans-serif] text-[20px] leading-none text-[#222]">
          <span className="flex items-center justify-center"><InlineLedNumber value={formatBoardTime(user.penaltyTime || 0)} /></span>
        </td>
        {problemHeaders.map((problem, problemIndex) => {
          const result = user.problems?.[problemIndex];
          return (
            <td key={problem.id} className={getProblemCellClassName(result)}>
              {renderProblemCell(result)}
            </td>
          );
        })}
      </tr>
      
      {/* 彻底剥离所有动画状态，基于 expanded 属性直接渲染内容 */}
      {expanded ? (
        <tr>
          <td colSpan={4} className="sticky left-0 z-10 bg-[#f3f4f8] p-0" id={`detail-${user.id}`}>
            <div className="w-[515px] px-4 py-5" style={{ height: 430, contain: 'strict' }}>
              <div className="relative flex h-[390px] w-full flex-col rounded-xl bg-white p-5 text-gray-800 shadow-sm">
                <div className="flex min-h-0 flex-1 gap-4">
                  <div className="flex w-24 shrink-0 flex-col justify-between">
                    {[0, 1, 2].map((memberIndex) => {
                      const member = teamMembers[memberIndex];
                      return (
                        <div key={member?.userId || memberIndex}>
                          <div className="mb-1 text-[14px] text-gray-400">成员 {memberIndex + 1}</div>
                          <div className="truncate text-[17px] text-gray-700">{member ? (member.realName || member.userName) : '-'}</div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                    <div className="mb-2 text-[14px] text-gray-400">最近提交</div>
                    <div data-recent-submissions className="min-h-0 flex-1 overflow-y-auto pr-2 -mr-2 [&::-webkit-scrollbar-thumb:hover]:bg-gray-500 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-400 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5">
                      {recentSubmissions.map((submission) => (
                        <div
                          key={submission.id}
                          className="flex items-center text-[16px] rounded px-1 -mx-1 py-[7px] border-b border-gray-200 last:border-b-0 transition-colors"
                          id={`rs-${submission.id}`}
                          data-submission-id={submission.id}
                          data-problem-id={submission.problem.id}
                          onMouseEnter={() => setRecentSubmissionHighlighted(submission.id, true)}
                          onMouseLeave={() => setRecentSubmissionHighlighted(submission.id, false)}
                        >
                          <BalloonIcon color={submission.color} className="h-[28px] w-7" />
                          <span className="ml-1 w-3 text-gray-800">{submission.label}</span>
                          <span className="ml-auto text-gray-500"><InlineLedNumber value={submission.time} fontSize={19} digitColor="currentColor" /></span>
                          <span className="ml-3 w-5 text-center">{renderDetailStatus(submission.status)}</span>
                        </div>
                      ))}
                      {recentSubmissions.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-400">
                          {submissionsLoading ? (
                            <>
                              <svg className="h-6 w-6 animate-spin text-gray-300" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                                <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                              </svg>
                              <span className="text-[13px]">提交记录加载中</span>
                            </>
                          ) : (
                            <>
                              <svg className="h-10 w-10 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                                <path d="M14 3v6h6" />
                                <path d="M9 14h6" />
                                <path d="M9 17h4" />
                              </svg>
                              <span className="text-[13px]">暂无提交记录</span>
                            </>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </td>
          
          {problemHeaders.map((problem) => {
            const problemSubmissions = submissionsByProblem.get(problem.id) || [];
            return (
              <td key={`score-${rank}-${problem.id}`} className="w-[90px] bg-[#f3f4f8] p-0 align-top">
                <div className="w-[90px]" style={{ height: 430, contain: 'strict' }}>
                  <div className="score flex h-[423px] flex-col gap-px overflow-y-auto bg-white [&::-webkit-scrollbar-thumb:hover]:bg-gray-500 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-400 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1">
                    {problemSubmissions.map((submission) => (
                      <button
                        key={submission.id}
                        type="button"
                        className="flex h-[52px] w-full shrink-0 cursor-pointer items-center justify-center gap-1.5 bg-[#f3f4f8] px-1 font-['Digital-7',sans-serif] text-[20px] leading-none transition-colors hover:bg-blue-100"
                        id={`ps-${submission.id}`}
                        data-submission-id={submission.id}
                        data-problem-id={problem.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          scrollToRecentSubmission(submission.id);
                        }}
                        onMouseEnter={() => setRecentSubmissionHighlighted(submission.id, true)}
                        onMouseLeave={() => setRecentSubmissionHighlighted(submission.id, false)}
                      >
                        <span className="text-[#495057]"><InlineLedNumber value={submission.time} fontSize={19} digitColor="currentColor" /></span>
                        <span className={`font-mono text-[19px] font-normal leading-none underline underline-offset-2 ${submission.status === 'AC' ? 'text-[#16a34a]' : 'text-[#dc2626]'}`}>
                          {submission.status}
                        </span>
                      </button>
                    ))}
                    {problemSubmissions.length < 8 && Array.from({ length: 8 - problemSubmissions.length }).map((_, emptyIndex) => (
                      <div key={`empty-${problem.id}-${emptyIndex}`} className="flex h-[52px] w-full shrink-0 items-center justify-center bg-[#f3f4f8] font-mono text-[15px] text-[#ccc]">-</div>
                    ))}
                  </div>
                </div>
              </td>
            );
          })}
        </tr>
      ) : null}
    </Fragment>
  );
});

const CompetitionRanklist: React.FC = () => {
  const {
    navigate,
    competition,
    users,
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
  } = useCompetitionRanklist();

  if (loading && !competition) {
    return createPortal(
      <div className="fixed inset-0 flex items-center justify-center bg-white" style={{ zIndex: 9999 }}>
        <Spin spinning />
      </div>,
      document.body
    );
  }

  if (!competition) {
    return createPortal(
      <div className="fixed inset-0 flex items-center justify-center bg-white" style={{ zIndex: 9999 }}>
        <Empty description="比赛不存在" />
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 min-w-0 overflow-hidden bg-white text-[#333]" style={{ zIndex: 9999 }}>
      <div className="min-w-0 h-full w-full max-w-full">
        {passwordVerified ? (
          <div className="flex h-full min-w-0 w-full max-w-full flex-col overflow-hidden bg-white p-5">
            <div className="mb-6 flex min-w-0 max-w-full items-center justify-between gap-4 overflow-hidden">
              <button
                type="button"
                onClick={() => navigate(returnTo)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900"
                title="返回比赛详情"
                aria-label="返回比赛详情"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div
                className="ml-2 hidden h-20 w-[19rem] shrink-0 bg-contain bg-left bg-no-repeat md:block"
                style={{ backgroundImage: 'url("http://111.230.105.54:9000/cover/6b1e0341-7a1c-4bbb-9716-015f86c00cd1.png")' }}
              >
              </div>
              <div className="min-w-0 flex-1 text-center">
                <h1 className="m-0 truncate text-xl font-bold tracking-[0.08em] text-gray-800 sm:text-2xl lg:text-3xl lg:tracking-[0.25em]">
                  {competition.title}
                </h1>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-3">
                <CountdownDisplay endTime={competition.endTime} />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center rounded-lg py-16">
                <Spin spinning />
              </div>
            ) : users.length === 0 ? (
              <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg">
                <Empty description="暂无排名数据" />
              </div>
            ) : (
              <div className="min-h-0 flex-1 w-full max-w-full overflow-auto rounded-2xl [scrollbar-gutter:stable]">
                <table className="table-fixed border-separate border-spacing-[1px]" style={{ width: ranklistTableWidth, minWidth: ranklistTableWidth }}>
                  <thead>
                    <tr>
                      <th className="sticky left-0 top-0 z-30 w-[55px] bg-white py-2.5 text-center text-[16px] font-normal text-black">排名</th>
                      <th className="sticky left-[55px] top-0 z-30 w-[300px] bg-white py-2.5 pl-5 text-left text-[16px] font-normal text-black">队伍</th>
                      <th className="sticky left-[355px] top-0 z-30 w-20 bg-white py-2.5 text-center text-[16px] font-normal text-black">过题数</th>
                      <th className="sticky left-[435px] top-0 z-30 w-20 bg-white py-2.5 text-center text-[16px] font-normal text-black">总用时</th>
                      {problemHeaders.map((problem) => (
                        <th key={problem.id} className="group cursor-pointer sticky top-0 z-20 w-[90px] bg-white py-2.5 text-center text-[13px] font-normal text-[#777]">
                          <div className="flex items-center justify-center -space-x-1">
                            <span className="inline-block transition-transform duration-150 ease-out group-hover:-translate-y-1">
                              <BalloonIcon color={problem.color} />
                            </span>
                            <div className="flex flex-col items-center leading-tight">
                              <span className="text-base font-bold text-gray-700">{problem.label}</span>
                              <span className="block text-[11px] text-[#999]">{problem.stat}</span>
                            </div>
                            <div className="w-2"></div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, index) => {
                      const userKey = getUserKey(user);
                      const expanded = expandedUserKeys.has(userKey);
                      return (
                        <RanklistRow
                          key={userKey}
                          user={user}
                          rank={index + 1}
                          expanded={expanded}
                          problemHeaders={problemHeaders}
                          submissions={ranklistSubmissions[userKey] || EMPTY_SUBMISSIONS}
                          submissionsLoading={loadingSubmissionKeys.has(userKey)}
                          onToggle={handleToggleRow}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="gemini-card text-center py-12">
            <span style={{ color: 'var(--gemini-text-tertiary)' }}>请输入密码以查看排行榜</span>
          </div>
        )}
      </div>

      <Modal
        title={
          <Space>
            <Lock className="w-4 h-4" />
            <span>请输入比赛密码</span>
          </Space>
        }
        open={passwordModalVisible}
        onOk={handleVerifyPassword}
        onCancel={() => navigate('/competitions')}
        okText="验证"
        cancelText="取消"
        closable={false}
        maskClosable={false}
      >
        <Input.Password
          placeholder="请输入比赛访问密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onPressEnter={handleVerifyPassword}
          autoFocus
          className="!rounded-full"
        />
      </Modal>
    </div>,
    document.body
  );
};

export default CompetitionRanklist;