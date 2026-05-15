import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import type { CSSProperties } from 'react';
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
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyTextToClipboard(code || '');
    if (ok) {
      toast.success(copySuccessText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error(copyFailText);
    }
  };

  const borderColor = 'var(--gemini-border-light)';

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
      <div className={`rounded-xl border overflow-hidden ${className}`} style={{ borderColor, ...style }}>
        <div
          className="flex items-center justify-between border-b px-4 py-2.5"
          style={{ backgroundColor: 'var(--gemini-bg)', borderColor }}
        >
          <span className="text-xs font-medium" style={{ color: 'var(--gemini-text-secondary)' }}>
            {language || '源代码'}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
            style={{
              color: 'var(--gemini-text-secondary)',
              backgroundColor: 'var(--gemini-surface)',
              border: '1px solid var(--gemini-border-light)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--gemini-surface-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--gemini-surface)'; }}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? '已复制' : '复制'}
          </button>
        </div>
        {highlighter}
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-xl border overflow-hidden ${className}`}
      style={{ borderColor, ...style }}
    >
      <button
        type="button"
        onClick={handleCopy}
        className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all"
        style={{
          color: 'rgba(255,255,255,0.9)',
          backgroundColor: 'rgba(30,30,30,0.85)',
          border: '1px solid rgba(255,255,255,0.15)',
          backdropFilter: 'blur(4px)',
        }}
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? '已复制' : '复制'}
      </button>
      {highlighter}
    </div>
  );
}
