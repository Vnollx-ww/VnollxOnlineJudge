import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import type { CSSProperties } from 'react';
import Button from '../ui/button';
import { copyTextToClipboard } from '@/utils/clipboard';
import { getCodeHighlightLanguage } from '@/constants/badges';

export type SubmissionCodeBlockProps = {
  language?: string;
  code?: string;
  /** 代码区最大高度（默认 60vh）。 */
  maxHeight?: string | number;
  /** 复制按钮放置位置。 */
  copyPlacement?: 'floating' | 'top-bar';
  /** 复制成功 / 失败的提示文字。 */
  copySuccessText?: string;
  copyFailText?: string;
  className?: string;
  style?: CSSProperties;
};

/**
 * 提交代码展示块。封装 SyntaxHighlighter + 复制按钮。
 *
 * - `floating` 模式：复制按钮悬浮在代码右上角（用于详情 Modal 内紧凑展示）。
 * - `top-bar`  模式：复制按钮在代码块上方一行（用于 Submissions 列表的大尺寸详情）。
 */
export default function SubmissionCodeBlock({
  language,
  code,
  maxHeight = '60vh',
  copyPlacement = 'floating',
  copySuccessText = '代码已复制到剪贴板',
  copyFailText = '复制失败',
  className = '',
  style,
}: SubmissionCodeBlockProps) {
  const handleCopy = async () => {
    const ok = await copyTextToClipboard(code || '');
    if (ok) toast.success(copySuccessText);
    else toast.error(copyFailText);
  };

  const highlighter = (
    <div className="overflow-auto bg-[#1e1e1e]" style={{ maxHeight }}>
      <SyntaxHighlighter
        language={getCodeHighlightLanguage(language)}
        style={vscDarkPlus}
        showLineNumbers
        customStyle={{ margin: 0, borderRadius: 0, fontSize: 14, minHeight: '100%' }}
      >
        {code || '（暂无代码）'}
      </SyntaxHighlighter>
    </div>
  );

  if (copyPlacement === 'top-bar') {
    return (
      <div className={className} style={style}>
        <div className="mb-2 flex gap-2">
          <Button icon={<Copy className="w-4 h-4" />} onClick={handleCopy}>
            复制代码
          </Button>
        </div>
        <div className="rounded-xl border border-gray-800 overflow-hidden bg-[#1e1e1e]">{highlighter}</div>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-xl border border-gray-800 overflow-hidden ${className}`}
      style={style}
    >
      <Button
        size="small"
        type="text"
        icon={<Copy className="w-4 h-4" />}
        className="!absolute !top-3 !right-3 !z-10"
        style={{
          backgroundColor: 'rgba(255,255,255,0.9)',
          border: '1px solid rgba(255,255,255,0.35)',
          color: '#0f172a',
        }}
        onClick={handleCopy}
      />
      {highlighter}
    </div>
  );
}
