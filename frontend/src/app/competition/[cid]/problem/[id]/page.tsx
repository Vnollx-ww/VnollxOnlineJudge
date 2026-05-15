import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { Card, Table, Tag, Avatar, Modal, Button, Space, Spin, Divider, Popconfirm, Drawer } from '@/components';
import { JudgeStatusBadge, LanguageBadge } from '@/components/common/status-badge';
import PagePagination from '@/components/common/page-pagination';
import { ArrowLeft, MessageSquare, History, Minimize2, Copy, Trophy, CheckCircle2 } from 'lucide-react';
import dayjs from 'dayjs';
import 'highlight.js/styles/github.css';
import 'katex/dist/katex.min.css';
import { copyTextToClipboard } from '@/utils/clipboard';
import { CodeEditor, Input, OnlineIdeToolbar, ProblemWorkbench, Select, SubmissionCodeBlock, WorkbenchResult } from '@/components';
import SuccessCelebration from '@/components/common/success-celebration';
import { useCompetitionProblemDetail, type Submission, type Comment } from '@/hooks/competition/useCompetitionProblemDetail';

const { TextArea } = Input;


const CompetitionProblemDetail: React.FC = () => {
  const {
    cid,
    navigate,
    userInfo,
    problem,
    loading,
    languageOptions,
    language,
    setLanguage,
    code,
    setCode,
    runResult,
    codeLoading,
    comments,
    commentLoading,
    commentContent,
    setCommentContent,
    replyTarget,
    setReplyTarget,
    commentSubmitting,
    isCompetitionOpen,
    isCompetitionEnd,
    isUserCompetitionEnded,
    submitDisabledReason,
    competitionStatusLoaded,
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
    setExampleInputs,
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
  } = useCompetitionProblemDetail();

  const renderComments = (items: Comment[] = []) =>
    items.map((item) => (
      <div className="border-l-2 border-gray-200 pl-4 py-3" key={item.id}>
        <div className="flex items-center justify-between mb-2">
          <Space size="middle">
            <Avatar className="!bg-blue-600">
              {item.username?.charAt(0)?.toUpperCase() || 'U'}
            </Avatar>
            <div>
              <span className="font-medium">{item.username}</span>
              <span className="text-gray-400 text-xs ml-2">
                {dayjs(item.createTime).format('YYYY-MM-DD HH:mm')}
              </span>
            </div>
          </Space>
          <Space size="small">
            <Button type="link" size="small" onClick={() => setReplyTarget(item)}>
              回复
            </Button>
            {userInfo?.id && String(userInfo.id) === String(item.userId) && (
              <Popconfirm
                title="确定删除该评论？"
                onConfirm={() => handleDeleteComment(item.id)}
              >
                <Button type="link" size="small" danger>
                  删除
                </Button>
              </Popconfirm>
            )}
          </Space>
        </div>
        <div
          className="markdown-body"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(item.content) }}
        />
        {item.children?.length ? (
          <div className="mt-3">{renderComments(item.children)}</div>
        ) : null}
      </div>
    ));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <Spin spinning />
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <Card className="!rounded-2xl !shadow-lg">题目不存在</Card>
      </div>
    );
  }

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
        <Button
          type="link"
          size="small"
          onClick={() => setCurrentSubmission(record)}
        >
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
        onClick={() => navigate(`/competition/${cid}`)}
      >
        返回题目列表
      </Button>
      <div className="flex items-center gap-3 min-w-0 flex-none" title={`#${problem.id} - ${problem.title}`}>
        <Select
          value={problem.id}
          loading={competitionProblemsLoading}
          placeholder="切换题目"
          className="w-56 max-w-[min(28vw,224px)]"
          onChange={(targetId) => {
            if (String(targetId) !== String(problem.id)) {
              navigate(`/competition/${cid}/problem/${targetId}`);
            }
          }}
          options={competitionProblems.map((item, index) => ({
            value: item.id,
            label: (
              <span className="flex min-w-0 items-center gap-2">
                <span className="min-w-0 flex-1 truncate">
                  {String.fromCharCode('A'.charCodeAt(0) + index)}. {item.title}
                </span>
                {item.isSolved && (
                  <span
                    className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: 'rgba(22, 163, 74, 0.12)',
                      color: 'var(--gemini-success, #16a34a)',
                    }}
                    title="已通过"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.6} />
                  </span>
                )}
              </span>
            ),
          }))}
        />
      </div>
      <div className="hidden lg:flex items-center gap-2 text-xs flex-none">
        <span style={statPillStyle}>时间 {problem.timeLimit || 1000} ms</span>
        <span style={statPillStyle}>内存 {problem.memoryLimit || 256} MB</span>
        <span style={statPillStyle}>提交 {currentCompetitionProblem?.submitCount ?? problem.submitCount ?? 0}</span>
        <span style={statPillStyle}>通过 {currentCompetitionProblem?.passCount ?? problem.passCount ?? 0}</span>
      </div>
      <div className="flex-auto" />
      <div className="flex items-center gap-2 flex-none">
        {isCompetitionEnd && (
          <Tag color="red">比赛已结束</Tag>
        )}
        <Button
          variant="outlined"
          className="!text-[var(--gemini-text-primary)] hover:!text-[var(--gemini-accent-strong)]"
          icon={<Trophy className="w-4 h-4" />}
          onClick={() => navigate(`/competition/${cid}/ranklist`, {
            state: { returnTo: `/competition/${cid}/problem/${problem.id}` },
          })}
        >
          排行榜
        </Button>
        <Button
          variant="outlined"
          className="!text-[var(--gemini-text-primary)] hover:!text-[var(--gemini-accent-strong)]"
          icon={<History className="w-4 h-4" />}
          onClick={openMySubmissions}
        >
          本题我的提交记录
        </Button>
        {!isCompetitionOpen && (
          <Button
            variant="outlined"
            className="!text-[var(--gemini-text-primary)] hover:!text-[var(--gemini-accent-strong)]"
            icon={<MessageSquare className="w-4 h-4" />}
            onClick={() => setCommentsOpen(true)}
          >
            评论 {comments.length ? `(${comments.length})` : ''}
          </Button>
        )}
        {!competitionStatusLoaded ? (
          <Button disabled loading>
            状态加载中
          </Button>
        ) : isUserCompetitionEnded ? (
          <Button disabled danger>
            你已结束比赛
          </Button>
        ) : !isCompetitionEnd && (
          <Button
            danger
            loading={finishCompetitionLoading}
            className="!text-red-700 hover:!text-red-800"
            onClick={() => setFinishCompetitionModalOpen(true)}
          >
            结束比赛
          </Button>
        )}
      </div>
    </>
  );

  // ---- 左侧题目描述面板 ----
  const leftPanel = (
    <div className="space-y-5">
      <section>
        <h2 className="text-base font-bold mb-2" style={{ color: 'var(--gemini-text-primary)' }}>题目描述</h2>
        <div
          className="markdown-body"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(problem.description) }}
        />
      </section>
      <section>
        <h2 className="text-base font-bold mb-2" style={{ color: 'var(--gemini-text-primary)' }}>输入格式</h2>
        <div
          className="markdown-body"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(problem.inputFormat || '', '暂无输入格式说明') }}
        />
      </section>
      <section>
        <h2 className="text-base font-bold mb-2" style={{ color: 'var(--gemini-text-primary)' }}>输出格式</h2>
        <div
          className="markdown-body"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(problem.outputFormat || '', '暂无输出格式说明') }}
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
                <Button
                  type="text"
                  size="small"
                  icon={<Copy className="w-4 h-4" />}
                  className="!absolute !top-2 !right-2"
                  onClick={async () => {
                    const ok = await copyTextToClipboard(ex.input || '');
                    if (ok) toast.success('已复制输入样例');
                    else toast.error('复制失败，请手动选择文本复制');
                  }}
                />
              </div>
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: 'var(--gemini-text-secondary)' }}>输出</div>
              <div className="relative">
                <pre className="rounded-xl p-3 pr-10 text-sm font-mono overflow-x-auto whitespace-pre-wrap border" style={{ backgroundColor: 'var(--gemini-bg)', borderColor: 'var(--gemini-border-light)', color: 'var(--gemini-text-primary)' }}>
{ex.output || '暂无输出样例'}
                </pre>
                <Button
                  type="text"
                  size="small"
                  icon={<Copy className="w-4 h-4" />}
                  className="!absolute !top-2 !right-2"
                  onClick={async () => {
                    const ok = await copyTextToClipboard(ex.output || '');
                    if (ok) toast.success('已复制输出样例');
                    else toast.error('复制失败，请手动选择文本复制');
                  }}
                />
              </div>
            </div>
          </section>
        ))
      ) : null}
      {problem.hint && (
        <section>
          <h2 className="text-base font-bold mb-2" style={{ color: 'var(--gemini-text-primary)' }}>提示</h2>
          <div
            className="markdown-body"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(problem.hint, '暂无提示') }}
          />
        </section>
      )}
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

  // 载入指定示例到程序输入
  const loadExampleInput = (i: number) => {
    if (!problem.examples?.[i]) return;
    setActiveExampleTab(i);
    setExampleInputs((prev) => ({ ...prev, [i]: problem.examples![i].input || '' }));
    setModifiedExamples((prev) => ({ ...prev, [i]: false }));
  };

  // ---- 程序输入区域 ----
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
      disabled={isCompetitionEnd || isUserCompetitionEnded || codeLoading.submit || !problem.examples?.length}
      style={{ padding: '0 16px', height: 32, fontSize: 14 }}
      title={submitDisabledReason || undefined}
    >
      {isCompetitionEnd || isUserCompetitionEnded ? (submitDisabledReason || '比赛已结束') : codeLoading.test ? '运行中...' : '自测运行'}
    </Button>
  );

  // ---- 最右主操作（保存并提交） ----
  const primaryAction = (
    <Button
      type="primary"
      loading={codeLoading.submit}
      onClick={handleSubmitCode}
      disabled={isCompetitionEnd || isUserCompetitionEnded || codeLoading.test}
      style={{ padding: '0 18px', height: 34, fontSize: 14, fontWeight: 500 }}
      title={submitDisabledReason || undefined}
    >
      {isCompetitionEnd || isUserCompetitionEnded ? (submitDisabledReason || '比赛已结束') : codeLoading.submit ? '提交中...' : '保存并提交'}
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
        storageKey={`competition-problem-workbench:${cid}:${problem.id}`}
        topBar={topBar}
        leftPanel={leftPanel}
        editorHeader={editorHeader}
        editor={
          isEditorFullscreen ? (
            <div className="w-full h-full flex items-center justify-center text-sm" style={{ color: 'var(--gemini-text-disabled)' }}>
              代码已在全屏中编辑…
            </div>
          ) : (
            <CodeEditor
              value={code}
              onChange={setCode}
              language={language}
              height="100%"
              options={editorOptions}
              theme={ideSettings.theme}
            />
          )
        }
        bottomTabs={[
          { key: 'result', label: '运行结果' },
          { key: 'input', label: '程序输入' },
        ]}
        activeBottomTab={activeBottomTab}
        onBottomTabChange={(k) => setActiveBottomTab(k as 'result' | 'input')}
        bottomContent={activeBottomTab === 'result' ? resultsArea : inputArea}
        tabActions={tabActions}
        primaryAction={primaryAction}
      />

      {/* 全屏编辑器（保留原全屏行为） */}
      {isEditorFullscreen && createPortal(
        <div className="fixed inset-0 z-[99999] bg-white">
          <Button
            icon={<Minimize2 className="w-4 h-4" />}
            onClick={() => {
              document.exitFullscreen();
              setIsEditorFullscreen(false);
            }}
            className="absolute bottom-4 right-6 z-[100000]"
          >
            退出全屏
          </Button>
          <CodeEditor
            value={code}
            onChange={setCode}
            language={language}
            height="100vh"
            options={editorOptions}
            theme={ideSettings.theme}
          />
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
        title="确认结束本场比赛？"
        open={finishCompetitionModalOpen}
        onOk={handleFinishCompetition}
        onCancel={() => setFinishCompetitionModalOpen(false)}
        okText="确认结束"
        cancelText="取消"
        okButtonProps={{ danger: true, loading: finishCompetitionLoading }}
        confirmLoading={finishCompetitionLoading}
        centered
      >
        <div className="space-y-2">
          <p>确认后你将无法再次提交本场比赛的任何题目。</p>
        </div>
      </Modal>

      <Modal
        title={`提交详情 #${currentSubmission?.id ?? ''}`}
        open={!!currentSubmission}
        onCancel={() => setCurrentSubmission(null)}
        footer={null}
        width={Math.min(820, typeof window !== 'undefined' ? window.innerWidth - 32 : 820)}
      >
        <div className="space-y-3">
          <Space wrap>
            {currentSubmission?.language ? <LanguageBadge language={currentSubmission.language} /> : <Tag>-</Tag>}
            {currentSubmission?.status ? <JudgeStatusBadge status={currentSubmission.status} /> : <Tag>-</Tag>}
            <span className="text-sm" style={{ color: 'var(--gemini-text-secondary)' }}>
              {currentSubmission?.createTime ? dayjs(currentSubmission.createTime).format('YYYY-MM-DD HH:mm:ss') : '-'}
            </span>
          </Space>
          <SubmissionCodeBlock
            language={currentSubmission?.language}
            code={currentSubmission?.code}
            copySuccessText="代码已复制"
            copyFailText="复制失败，请手动复制"
          />
        </div>
      </Modal>

      {/* 评论抽屉 — 仅比赛结束后可用 */}
      {!isCompetitionOpen && (
        <Drawer
          title={(
            <Space>
              <MessageSquare className="w-4 h-4" />
              <span>评论讨论</span>
              <Tag color="blue">{comments.length}</Tag>
            </Space>
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
                <div className="bg-blue-50 px-3 py-2 rounded-lg mb-2 flex items-center justify-between">
                  <span>回复 @{replyTarget.username}</span>
                  <Button type="link" size="small" onClick={() => setReplyTarget(null)}>
                    取消
                  </Button>
                </div>
              )}
              <TextArea
                rows={4}
                placeholder="分享你的想法、解题思路或遇到的问题..."
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                maxLength={500}
                className="!rounded-lg"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs" style={{ color: 'var(--gemini-text-disabled)' }}>{commentContent.length}/500</span>
                <Button
                  type="primary"
                  onClick={handleSubmitComment}
                  loading={commentSubmitting}
                >
                  发表评论
                </Button>
              </div>
            </div>
            <Divider />
            <div className="flex-auto overflow-auto">
              {commentLoading ? (
                <Spin spinning />
              ) : comments.length ? (
                renderComments(comments)
              ) : (
                <span style={{ color: 'var(--gemini-text-disabled)' }}>还没有评论，快来抢沙发吧！</span>
              )}
            </div>
          </div>
        </Drawer>
      )}

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

export default CompetitionProblemDetail;
