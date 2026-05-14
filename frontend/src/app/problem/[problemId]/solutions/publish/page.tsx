import { Button, Modal } from '@/components';
import { ArrowLeft, Eye, Send } from 'lucide-react';
import Input from '@/components/ui/input';
import 'highlight.js/styles/github.css';
import 'katex/dist/katex.min.css';
import { useSolutionPublish } from '@/hooks/solution/useSolutionPublish';

const { TextArea } = Input;

const SolutionPublishPage: React.FC = () => {
  const {
    navigate,
    pid,
    problemInfo,
    title,
    setTitle,
    content,
    setContent,
    submitting,
    previewVisible,
    setPreviewVisible,
    charCount,
    previewContent,
    handleSubmit,
  } = useSolutionPublish();

  return (
    <div className="min-h-full w-full">
      <div className="w-full space-y-6">
        {/* Info Card - Gemini 风格 */}
        <div className="gemini-card">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <Button
              icon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => navigate(`/problem/${pid}/solutions`, { state: { title: problemInfo?.title } })}
              className="gemini-btn gemini-btn-outlined"
            >
              返回题解列表
            </Button>
          </div>
          <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--gemini-text-primary)' }}>发布题解</h2>
          <p style={{ color: 'var(--gemini-text-secondary)' }}>
            分享你的解题思路，支持 Markdown / LaTeX。
          </p>
          <p style={{ color: 'var(--gemini-warning)' }}>
            发布题解后需管理员审核通过才会发布，注意提前保存本地备份，避免内容丢失。
          </p>
        </div>

        {/* Form Card - Gemini 风格 */}
        <div className="gemini-card">
          <div className="flex flex-col gap-6">
            <div>
              <h4 className="mb-2 text-lg font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>题目信息</h4>
              <p style={{ color: 'var(--gemini-text-secondary)' }}>
                {problemInfo ? `${problemInfo.title} (#${pid})` : '加载中...'}
              </p>
            </div>
            <div>
              <h4 className="mb-2 text-lg font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>题解标题</h4>
              <Input
                placeholder="请输入题解标题"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                className="!rounded-full"
                size="large"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="m-0 text-lg font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>题解内容</h4>
                <div className="flex items-center gap-2">
                  <span style={{ color: charCount > 4800 ? 'var(--gemini-error)' : 'var(--gemini-text-tertiary)' }}>
                    {charCount}/5000
                  </span>
                  <Button icon={<Eye className="w-4 h-4" />} onClick={() => setPreviewVisible(true)}>
                    预览
                  </Button>
                </div>
              </div>
              <TextArea
                rows={16}
                placeholder="支持 Markdown/代码块/数学公式..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="!rounded-2xl !font-mono"
              />
            </div>
            <div className="text-right">
              <Button 
                type="primary" 
                icon={<Send className="w-4 h-4" />} 
                loading={submitting} 
                onClick={handleSubmit}
                size="large"
                className="!rounded-full"
                style={{ 
                  backgroundColor: 'var(--gemini-accent)',
                  color: 'var(--gemini-accent-text)',
                  border: 'none'
                }}
              >
                发布题解
              </Button>
            </div>
          </div>
        </div>

        <Modal
          open={previewVisible}
          title="题解预览"
          onCancel={() => setPreviewVisible(false)}
          footer={<Button onClick={() => setPreviewVisible(false)}>返回编辑</Button>}
          width={900}
        >
          <div 
            className="preview-content markdown-body" 
            dangerouslySetInnerHTML={{ __html: previewContent }} 
          />
        </Modal>
      </div>
    </div>
  );
};

export default SolutionPublishPage;
