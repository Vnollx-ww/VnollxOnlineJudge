import Input from '../../components/input';
import { CalendarDays, Clock, Search } from 'lucide-react';
import { Select, CompetitionStatusBadge, PageSurface, Button } from '../../components';
import {
  useCompetitions,
  calculateCompetitionStatus,
  formatCompetitionTime,
  formatCompetitionDuration,
} from '@/hooks/useCompetitions';

const Competitions: React.FC = () => {
  const {
    competitions,
    loading,
    statusFilter,
    setStatusFilter,
    keyword,
    setKeyword,
    handleJoin,
  } = useCompetitions();
  const calculateStatus = calculateCompetitionStatus;
  const formatTime = formatCompetitionTime;
  const formatDuration = formatCompetitionDuration;

  return (
    <div className="w-full">
      <PageSurface
        variant="card"
        title="全部比赛"
        extra={
          <>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              className="w-40"
              options={[
                { value: 'all', label: '全部' },
                { value: '进行中', label: '进行中' },
                { value: '暂未开始', label: '暂未开始' },
                { value: '已结束', label: '已结束' },
              ]}
            />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索比赛"
              prefix={<Search className="w-4 h-4" />}
              className="w-56"
              allowClear
            />
          </>
        }
      >
        {/* 比赛列表 - Gemini 卡片风格 */}
        <ol className="divide-y" style={{ borderColor: 'var(--gemini-border-light)' }}>
          {competitions.map((comp) => {
          const status = calculateStatus(comp.beginTime, comp.endTime);

          return (
            <li
              key={comp.id}
              className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-6 py-5 transition-colors cursor-pointer"
              onClick={() => handleJoin(comp.id, status)}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--gemini-bg)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div className="flex items-center gap-5 min-w-0 flex-1">
                <img
                  src="https://oss.vnollx.top/markdown/微信图片_20260509104335_470_9.jpg"
                  alt="比赛"
                  className="h-16 w-16 flex-shrink-0 rounded-2xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold truncate mb-3" style={{ color: 'var(--gemini-text-primary)' }}>
                    {comp.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm" style={{ color: 'var(--gemini-text-secondary)' }}>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="w-4 h-4" style={{ color: 'var(--gemini-accent-strong)' }} />
                      {formatTime(comp.beginTime)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-4 h-4" style={{ color: 'var(--gemini-accent-strong)' }} />
                      {formatDuration(comp.beginTime, comp.endTime)}
                    </span>
                    <Button size="small">
                      ACM
                    </Button>
                  </div>
                </div>
              </div>
              <div className="md:w-32 md:text-center">
                <CompetitionStatusBadge status={status} />
              </div>
            </li>
          );
          })}
        </ol>

        {competitions.length === 0 && !loading && (
          <div className="text-center py-12">
            <img src="https://oss.vnollx.top/markdown/微信图片_20260509104335_470_9.jpg" alt="比赛" className="mx-auto mb-4 h-12 w-12 rounded-2xl object-cover opacity-60" />
            <p style={{ color: 'var(--gemini-text-secondary)' }}>暂无比赛数据</p>
          </div>
        )}
      </PageSurface>
    </div>
  );
};

export default Competitions;
