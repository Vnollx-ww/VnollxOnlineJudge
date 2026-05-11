import { Input, Progress, Tag } from 'antd';
import { BookOpen, CalendarDays, FileText, Search } from 'lucide-react';
import { Select } from '../../components';
import { usePractices } from '@/hooks/usePractices';

const Practices: React.FC = () => {
  const {
    practices,
    loading,
    progressFilter,
    setProgressFilter,
    keyword,
    setKeyword,
    formatTime,
    calculateProgress,
    handleEnter,
  } = usePractices();

  return (
    <div className="w-full">
      <div className="rounded-3xl" style={{ backgroundColor: 'var(--gemini-surface)', boxShadow: 'var(--shadow-gemini)' }}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 px-6 py-4" style={{ borderBottom: '1px solid var(--gemini-border-light)' }}>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>
            全部练习
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={progressFilter}
              onChange={setProgressFilter}
              className="w-40"
              options={[
                { value: 'all', label: '全部' },
                { value: 'unfinished', label: '未完成' },
                { value: 'finished', label: '已完成' },
              ]}
            />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索练习"
              prefix={<Search className="w-4 h-4" />}
              className="w-56"
              allowClear
            />
          </div>
        </div>

        <ol className="divide-y" style={{ borderColor: 'var(--gemini-border-light)' }}>
          {practices.map((practice) => {
          const progress = calculateProgress(practice.solvedCount, practice.problemCount);

          return (
            <li
              key={practice.id}
              className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-6 py-5 transition-colors cursor-pointer"
              onClick={() => handleEnter(practice.id)}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--gemini-bg)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div className="flex items-center gap-5 min-w-0 flex-1">
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, var(--gemini-accent) 0%, var(--gemini-accent-strong) 100%)', boxShadow: '0 4px 12px rgba(26, 115, 232, 0.3)' }}
                >
                  <BookOpen className="w-8 h-8 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold truncate mb-3" style={{ color: 'var(--gemini-text-primary)' }}>
                    {practice.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm" style={{ color: 'var(--gemini-text-secondary)' }}>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="w-4 h-4" style={{ color: 'var(--gemini-accent-strong)' }} />
                      {formatTime(practice.createTime)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <FileText className="w-4 h-4" style={{ color: 'var(--gemini-accent-strong)' }} />
                      {practice.problemCount || 0} 道题目
                    </span>
                    <Tag color="blue" className="!rounded-full">练习</Tag>
                  </div>
                </div>
              </div>
              <div className="md:w-64">
                <div className="mb-2 flex items-center justify-between text-xs" style={{ color: 'var(--gemini-text-secondary)' }}>
                  <span>{practice.solvedCount || 0} / {practice.problemCount || 0}</span>
                  <span>{progress}%</span>
                </div>
                <Progress
                  percent={progress}
                  strokeColor={{
                    '0%': '#1a73e8',
                    '100%': '#34a853',
                  }}
                  showInfo={false}
                />
              </div>
            </li>
          );
          })}
        </ol>

        {practices.length === 0 && !loading && (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--gemini-text-disabled)' }} />
            <p style={{ color: 'var(--gemini-text-secondary)' }}>暂无练习数据</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Practices;
