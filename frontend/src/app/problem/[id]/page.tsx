import { createPortal } from 'react-dom';
import { Table, Tag, Avatar, Modal, Button, Spin, Popconfirm, Drawer } from '@/components';
import { DifficultyBadge, JudgeStatusBadge, LanguageBadge } from '@/components/status-badge';
import PagePagination from '@/components/page-pagination';
import Input from '@/components/input';
import {
  ArrowLeft,
  MessageSquare,
  BookOpen,
  Edit,
  Minimize2,
  Copy,
  Bot,
  History,
} from 'lucide-react';
import dayjs from 'dayjs';
import 'highlight.js/styles/github.css';
import 'katex/dist/katex.min.css';
import { CodeEditor, OnlineIdeToolbar, PermissionGuard, ProblemWorkbench, SubmissionCodeBlock, WorkbenchResult } from '@/components';
import { PermissionCode } from '@/constants/permissions';
import SuccessCelebration from '@/components/success-celebration';
import {
  useProblemDetail,
  type Comment,
  type Submission,
} from '@/hooks/useProblemDetail';

const { TextArea } = Input;

const ProblemDetail: React.FC = () => {
  const {
    id,
    navigate,
    location,
    problem,
    loading,
    tags,
    languageOptions,
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
    activeExampleTab,
    modifiedExamples,
    activeBottomTab,
    setActiveBottomTab,
    currentTestInput,
    isCustomTest,
    handleTestInputChange,
    handleTestCode,
    handleSubmitCode,
    loadExampleInput,
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
    showCelebration,
    setShowCelebration,
    userInfo,
    handleOpenAiAnalysis,
    copyToClipboard,
    renderMarkdown,
  } = useProblemDetail();
  void id;
  void location;
  const renderComments = (items: Comment[] = []): React.ReactNode =>
    items.map((item) => (
      <div 
        key={item.id} 
        ref={(el) => { commentRefs.current[item.id] = el; }}
        className={`py-4 last:border-0 transition-all duration-300 ${highlightedCommentId === item.id ? 'rounded-lg' : ''}`}
        style={{ 
          borderBottom: '1px solid var(--gemini-border-light)',
          ...(highlightedCommentId === item.id ? {
            backgroundColor: 'rgba(26, 115, 232, 0.15)',
            border: '2px solid var(--gemini-accent)',
            boxShadow: '0 0 12px rgba(26, 115, 232, 0.3)',
          } : {})
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar 
              src={item.userAvatar}
              style={{ background: item.userAvatar ? 'transparent' : 'linear-gradient(135deg, var(--gemini-accent) 0%, var(--gemini-accent-strong) 100%)' }}
            >
              {item.username?.charAt(0)?.toUpperCase() || 'U'}
            </Avatar>
            <div>
              <span className="font-medium" style={{ color: 'var(--gemini-text-primary)' }}>{item.username}</span>
              <span className="ml-3 text-xs" style={{ color: 'var(--gemini-text-disabled)' }}>
                {dayjs(item.createTime).format('YYYY-MM-DD HH:mm')}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setReplyTarget(item)}
              className="text-xs transition-colors"
              style={{ color: 'var(--gemini-text-secondary)' }}
            >
              回复
            </button>
            {userInfo?.id && String(userInfo.id) === String(item.userId) && (
              <Popconfirm title="确定删除该评论？" onConfirm={() => handleDeleteComment(item.id)}>
                <button className="text-xs" style={{ color: 'var(--gemini-error)' }}>删除</button>
              </Popconfirm>
            )}
          </div>
        </div>
        <div
          className="markdown-body mt-2 pl-11"
          style={{ color: 'var(--gemini-text-primary)' }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(item.content) }}
        />
        {item.children?.length ? (
          <div className="ml-11 mt-4 pl-4" style={{ borderLeft: '2px solid var(--gemini-accent)' }}>
            {renderComments(item.children)}
          </div>
        ) : null}
      </div>
    ));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spin spinning />
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="gemini-card text-center py-12">
        <p style={{ color: 'var(--gemini-text-secondary)' }}>题目不存在</p>
      </div>
    );
  }

  const locationState = location.state as { from?: string; practiceId?: string } | null;

  // ---- 顶部操作栏 ----
  const statPillStyle: React.CSSProperties = {
    backgroundColor: 'var(--gemini-bg)',
    border: '1px solid var(--gemini-border-light)',
    borderRadius: 9999,
    padding: '4px 12px',
    color: 'var(--gemini-text-secondary)',
  };
  const mySubmissionColumns = [
    {
      title: '提交ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (submissionId: number, record: Submission) => (
        <Button type="link" size="small" onClick={() => setCurrentSubmission(record)}>
          {submissionId}
        </Button>
      ),
    },
    {
      title: '语言',
      dataIndex: 'language',
      key: 'language',
      width: 110,
      render: (lang: string) => <LanguageBadge language={lang} />,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: string) => <JudgeStatusBadge status={status} />,
    },
    {
      title: '提交时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 180,
      render: (time: string) => time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '耗时',
      dataIndex: 'time',
      key: 'time',
      width: 90,
      render: (time?: number | null) => time != null ? `${time} ms` : '-',
    },
    {
      title: '内存',
      dataIndex: 'memory',
      key: 'memory',
      width: 90,
      render: (memory?: number | null) => memory != null ? `${memory} MB` : '-',
    },
  ];
  const topBar = (
    <>
      <Button
        variant="outlined"
        className="!text-[var(--gemini-text-primary)] hover:!text-[var(--gemini-accent-strong)]"
        icon={<ArrowLeft className="w-4 h-4" />}
        onClick={() => {
          if (locationState?.from === 'practice' && locationState?.practiceId) {
            navigate(`/practice/${locationState.practiceId}`);
          } else {
            navigate('/problems');
          }
        }}
      >
        {locationState?.from === 'practice' ? '返回练习' : '返回'}
      </Button>
      <div className="flex items-center gap-3 min-w-0 flex-none">
        <span
          className="font-semibold whitespace-nowrap overflow-hidden text-ellipsis block"
          style={{ color: 'var(--gemini-text-primary)', fontSize: 15, maxWidth: 'min(18vw, 200px)' }}
          title={`#${problem.id} - ${problem.title}`}
        >
          #{problem.id} · {problem.title}
        </span>
        <DifficultyBadge difficulty={problem.difficulty} />
      </div>
      <div
        className="hidden lg:flex items-center gap-2 text-xs flex-none"
      >
        <span style={statPillStyle}>时间 {problem.timeLimit || 1000} ms</span>
        <span style={statPillStyle}>内存 {problem.memoryLimit || 256} MB</span>
        <span style={statPillStyle}>提交 {problem.submitCount ?? 0}</span>
        <span style={statPillStyle}>通过 {problem.passCount ?? 0}</span>
      </div>
      <div className="flex-auto" />
      <div className="flex items-center gap-2 flex-none">
        <PermissionGuard permission={PermissionCode.AI_CHAT}>
          <Button
            variant="outlined"
            className="!text-[var(--gemini-text-primary)] hover:!text-[var(--gemini-accent-strong)]"
            icon={<Bot className="w-4 h-4" />}
            onClick={handleOpenAiAnalysis}
          >
            AI分析
          </Button>
        </PermissionGuard>
        <Button
          variant="outlined"
          className="!text-[var(--gemini-text-primary)] hover:!text-[var(--gemini-accent-strong)]"
          icon={<History className="w-4 h-4" />}
          onClick={openMySubmissions}
        >
          本题我的提交记录
        </Button>
        <Button
          variant="outlined"
          className="!text-[var(--gemini-text-primary)] hover:!text-[var(--gemini-accent-strong)]"
          icon={<BookOpen className="w-4 h-4" />}
          onClick={() => navigate(`/problem/${problem.id}/solutions`, { state: { title: problem.title } })}
        >
          题解
        </Button>
        <Button
          variant="outlined"
          className="!text-[var(--gemini-text-primary)] hover:!text-[var(--gemini-accent-strong)]"
          icon={<Edit className="w-4 h-4" />}
          onClick={() => navigate(`/problem/${problem.id}/solutions/publish`, { state: { title: problem.title } })}
        >
          发布题解
        </Button>
        <Button
          variant="outlined"
          className="!text-[var(--gemini-text-primary)] hover:!text-[var(--gemini-accent-strong)]"
          icon={<MessageSquare className="w-4 h-4" />}
          onClick={() => setCommentsOpen(true)}
        >
          评论 {comments.length ? `(${comments.length})` : ''}
        </Button>
      </div>
    </>
  );

  // ---- 左侧题目描述面板 ----
  const leftPanel = (
    <div className="space-y-5">
      {tags.length ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--gemini-text-secondary)' }}>标签：</span>
          {tags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </div>
      ) : null}
      <section>
        <h2 className="text-base font-bold mb-2" style={{ color: 'var(--gemini-text-primary)' }}>题目描述</h2>
        <div
          className="markdown-body"
          style={{ color: 'var(--gemini-text-primary)' }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(problem.description) }}
        />
      </section>
      <section>
        <h2 className="text-base font-bold mb-2" style={{ color: 'var(--gemini-text-primary)' }}>输入格式</h2>
        <div
          className="markdown-body"
          style={{ color: 'var(--gemini-text-primary)' }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(problem.inputFormat, '暂无输入格式说明') }}
        />
      </section>
      <section>
        <h2 className="text-base font-bold mb-2" style={{ color: 'var(--gemini-text-primary)' }}>输出格式</h2>
        <div
          className="markdown-body"
          style={{ color: 'var(--gemini-text-primary)' }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(problem.outputFormat, '暂无输出格式说明') }}
        />
      </section>
      {problem.examples?.length ? (
        problem.examples.map((ex, idx) => (
          <section key={idx} className="space-y-3">
            <h2 className="text-base font-bold" style={{ color: 'var(--gemini-text-primary)' }}>示例 {idx + 1}</h2>
            <div>
              <div className="text-xs mb-1" style={{ color: 'var(--gemini-text-secondary)' }}>输入</div>
              <div className="relative">
                <pre className="rounded-xl p-3 pr-10 text-sm font-mono overflow-x-auto whitespace-pre-wrap border" style={{ backgroundColor: 'var(--gemini-bg)', borderColor: 'var(--gemini-border-light)', color: 'var(--gemini-text-primary)' }}>
{ex.input || '暂无输入样例'}
                </pre>
                <button
                  onClick={() => ex.input && copyToClipboard(ex.input, '输入样例')}
                  className="absolute top-2 right-2 p-1 rounded-md transition-colors hover:bg-black/5"
                  style={{ color: 'var(--gemini-text-secondary)' }}
                  title="复制"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: 'var(--gemini-text-secondary)' }}>输出</div>
              <div className="relative">
                <pre className="rounded-xl p-3 pr-10 text-sm font-mono overflow-x-auto whitespace-pre-wrap border" style={{ backgroundColor: 'var(--gemini-bg)', borderColor: 'var(--gemini-border-light)', color: 'var(--gemini-text-primary)' }}>
{ex.output || '暂无输出样例'}
                </pre>
                <button
                  onClick={() => ex.output && copyToClipboard(ex.output, '输出样例')}
                  className="absolute top-2 right-2 p-1 rounded-md transition-colors hover:bg-black/5"
                  style={{ color: 'var(--gemini-text-secondary)' }}
                  title="复制"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>
        ))
      ) : null}
      <section>
        <h2 className="text-base font-bold mb-2" style={{ color: 'var(--gemini-text-primary)' }}>提示</h2>
        <div
          className="markdown-body"
          style={{ color: 'var(--gemini-text-primary)' }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(problem.hint, '暂无提示') }}
        />
      </section>
    </div>
  );

  // ---- 编辑器顶部工具栏 ----
  const editorHeader = (
    <OnlineIdeToolbar
      language={language}
      languageOptions={languageOptions}
      code={code}
      settings={ideSettings}
      isFullscreen={isEditorFullscreen}
      onLanguageChange={setLanguage}
      onCodeChange={setCode}
      onSettingsChange={setIdeSettings}
      onToggleFullscreen={toggleEditorFullscreen}
    />
  );

  // ---- 自测输入区域 ----
  const inputArea = (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 [&>div]:h-full">
        <Input.TextArea
          value={currentTestInput}
          onChange={(e) => handleTestInputChange(e.target.value)}
          placeholder="请输入示例或载入测试用例"
          className="!h-full !min-h-0 !rounded-xl font-mono text-sm"
          style={{
            backgroundColor: '#fff',
            borderColor: 'var(--gemini-border-light)',
            resize: 'none',
          }}
        />
      </div>
      <div className="flex shrink-0 items-center gap-2 mt-1 flex-wrap">
        {problem.examples?.length ? (
          problem.examples.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => loadExampleInput(i)}
              className="px-3 py-1 text-xs rounded-md transition-colors"
              style={{
                backgroundColor: activeExampleTab === i && !modifiedExamples[i]
                  ? 'var(--gemini-accent)'
                  : 'var(--gemini-bg)',
                color: activeExampleTab === i && !modifiedExamples[i]
                  ? 'var(--gemini-accent-text)'
                  : 'var(--gemini-text-secondary)',
                border: `1px solid ${activeExampleTab === i && !modifiedExamples[i]
                  ? 'transparent'
                  : 'var(--gemini-border-light)'}`,
              }}
            >
              载入示例 {i + 1}
            </button>
          ))
        ) : (
          <span className="text-xs" style={{ color: 'var(--gemini-text-disabled)' }}>该题目未提供示例</span>
        )}
        {isCustomTest && (
          <span className="text-xs ml-2" style={{ color: 'var(--gemini-warning)' }}>
            自定义输入
          </span>
        )}
      </div>
    </div>
  );

  // ---- 运行结果区域 ----
  const resultsArea = runResult ? (
    <WorkbenchResult data={runResult} />
  ) : (
    <div className="text-sm" style={{ color: 'var(--gemini-text-disabled)' }}>
      点击右上角「自测运行」或「保存并提交」后，结果将显示在此处。
    </div>
  );

  // ---- Tab 右侧次级操作（自测运行） ----
  const tabActions = (
    <Button
      loading={codeLoading.test}
      onClick={handleTestCode}
      disabled={!problem.examples?.length}
      style={{ padding: '0 16px', height: 32, fontSize: 14 }}
    >
      自测运行
    </Button>
  );

  // ---- 最右主操作（保存并提交） ----
  const primaryAction = (
    <Button
      type="primary"
      loading={codeLoading.submit}
      onClick={handleSubmitCode}
      style={{
        padding: '0 18px',
        height: 34,
        fontSize: 14,
        fontWeight: 500,
        backgroundColor: 'var(--gemini-accent)',
        color: 'var(--gemini-accent-text)',
        border: 'none',
      }}
    >
      保存并提交
    </Button>
  );

  return (
    <div
      className="fixed z-[20]"
      style={{
        top: 0,
        left: 80,
        right: 0,
        bottom: 0,
        backgroundColor: 'var(--gemini-bg, #f7f8fa)',
      }}
    >
      <ProblemWorkbench
        storageKey={`problem-workbench:${problem.id}`}
        topBar={topBar}
        leftPanel={leftPanel}
        editorHeader={editorHeader}
        editor={
          isEditorFullscreen ? (
            <div className="w-full h-full flex items-center justify-center text-sm" style={{ color: 'var(--gemini-text-disabled)' }}>
              代码已在全屏中编辑…
            </div>
          ) : (
            <CodeEditor value={code} onChange={setCode} language={language} height="100%" options={editorOptions} theme={ideSettings.theme} />
          )
        }
        bottomTabs={[
          { key: 'result', label: '运行结果' },
          { key: 'input', label: '自测输入' },
        ]}
        activeBottomTab={activeBottomTab}
        onBottomTabChange={(k) => setActiveBottomTab(k as 'result' | 'input')}
        bottomContent={activeBottomTab === 'result' ? resultsArea : inputArea}
        tabActions={tabActions}
        primaryAction={primaryAction}
      />

      {/* 全屏编辑器（保留原全屏行为） */}
      {isEditorFullscreen && createPortal(
        <div className="fixed inset-0 z-[99999]" style={{ backgroundColor: 'var(--gemini-surface)' }}>
          <button
            onClick={() => {
              document.exitFullscreen();
              setIsEditorFullscreen(false);
            }}
            className="absolute bottom-4 right-4 z-[100000] px-4 py-2 rounded-full transition-colors"
            style={{ backgroundColor: 'var(--gemini-accent)', color: 'var(--gemini-accent-text)' }}
          >
            <Minimize2 className="w-4 h-4 inline mr-2" />
            退出全屏
          </button>
          <CodeEditor value={code} onChange={setCode} language={language} height="100vh" options={editorOptions} theme={ideSettings.theme} />
        </div>,
        document.body
      )}

      <Drawer
        title="本题我的提交记录"
        placement="right"
        width={Math.min(760, typeof window !== 'undefined' ? window.innerWidth : 760)}
        open={mySubmissionsOpen}
        onClose={() => setMySubmissionsOpen(false)}
        destroyOnClose={false}
      >
        <Table<Submission>
          columns={mySubmissionColumns}
          dataSource={mySubmissions}
          loading={mySubmissionsLoading}
          rowKey="id"
        />
        <PagePagination
          current={mySubmissionsPage}
          total={mySubmissionsTotal}
          pageSize={mySubmissionsPageSize}
          showQuickJumper={false}
          onChange={(page) => {
            setMySubmissionsPage(page);
            loadMySubmissions(page);
          }}
          className="mt-4"
        />
      </Drawer>

      <Modal
        title={`提交详情 #${currentSubmission?.id ?? ''}`}
        open={!!currentSubmission}
        onCancel={() => setCurrentSubmission(null)}
        footer={null}
        width={Math.min(820, typeof window !== 'undefined' ? window.innerWidth - 32 : 820)}
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {currentSubmission?.language ? <LanguageBadge language={currentSubmission.language} /> : <Tag>-</Tag>}
            {currentSubmission?.status ? <JudgeStatusBadge status={currentSubmission.status} /> : <Tag>-</Tag>}
            <span className="text-sm" style={{ color: 'var(--gemini-text-secondary)' }}>
              {currentSubmission?.createTime ? dayjs(currentSubmission.createTime).format('YYYY-MM-DD HH:mm:ss') : '-'}
            </span>
          </div>
          <SubmissionCodeBlock
            language={currentSubmission?.language}
            code={currentSubmission?.code}
            copySuccessText="代码已复制"
            copyFailText="复制失败，请手动复制"
          />
        </div>
      </Modal>

      {/* 评论抽屉 */}
      <Drawer
        title={(
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" style={{ color: 'var(--gemini-accent-strong)' }} />
            <span>评论讨论</span>
            <Tag color="blue">{comments.length}</Tag>
          </div>
        )}
        placement="right"
        width={Math.min(560, typeof window !== 'undefined' ? window.innerWidth : 560)}
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        destroyOnClose={false}
      >
        <div className="flex flex-col h-full">
          <div className="mb-4">
            {replyTarget && (
              <div className="flex items-center gap-2 mb-2 text-sm" style={{ color: 'var(--gemini-text-secondary)' }}>
                回复 @{replyTarget.username}
                <button onClick={() => setReplyTarget(null)} style={{ color: 'var(--gemini-error)' }}>
                  取消
                </button>
              </div>
            )}
            <TextArea
              rows={4}
              placeholder="分享你的想法、解题思路或遇到的问题..."
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              maxLength={500}
              className="rounded-2xl"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs" style={{ color: 'var(--gemini-text-disabled)' }}>{commentContent.length}/500</span>
              <Button
                type="primary"
                onClick={handleSubmitComment}
                loading={commentSubmitting}
                style={{ backgroundColor: 'var(--gemini-accent)', color: 'var(--gemini-accent-text)', border: 'none' }}
              >
                发表评论
              </Button>
            </div>
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid var(--gemini-border-light)', margin: '0.75rem 0' }} />
          <div className="flex-auto overflow-auto">
            {commentLoading ? (
              <div className="flex justify-center py-8">
                <Spin spinning />
              </div>
            ) : comments.length ? (
              renderComments(comments)
            ) : (
              <p className="text-center py-8" style={{ color: 'var(--gemini-text-disabled)' }}>还没有评论，快来抢沙发吧！</p>
            )}
          </div>
        </div>
      </Drawer>

      {/* 答案正确庆祝动画 */}
      <SuccessCelebration
        visible={showCelebration}
        onClose={() => setShowCelebration(false)}
        title="🎉 恭喜通过！"
        subtitle="Accepted"
      />
    </div>
  );
};

export default ProblemDetail;
