import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react';

export interface WorkbenchTab {
  key: string;
  label: ReactNode;
}

export interface ProblemWorkbenchProps {
  /** 顶部操作栏（左侧：返回、标题；右侧：题解、AI、评论等按钮） */
  topBar: ReactNode;
  /** 左侧面板：题目描述 / 输入输出格式 / 样例 / 提示等 */
  leftPanel: ReactNode;
  /** 编辑器顶部工具栏（语言选择、重置模板、全屏…） */
  editorHeader?: ReactNode;
  /** 代码编辑器主体 */
  editor: ReactNode;
  /** 右下面板的 Tab 列表 */
  bottomTabs: WorkbenchTab[];
  activeBottomTab: string;
  onBottomTabChange: (key: string) => void;
  /** 当前 Tab 对应的内容 */
  bottomContent: ReactNode;
  /** Tab 右侧的次级操作（如自测运行） */
  tabActions?: ReactNode;
  /** 面板最右的主操作（如保存并提交） */
  primaryAction?: ReactNode;
  /** @deprecated 兼容旧 API：等价于 primaryAction */
  bottomActions?: ReactNode;
  /** localStorage 中持久化布局尺寸的 key 前缀 */
  storageKey?: string;
  className?: string;
}

const DEFAULT_LEFT_PCT = 50;
const DEFAULT_BOTTOM_PX = 220;
const MIN_LEFT_PCT = 25;
const MAX_LEFT_PCT = 75;
const MIN_BOTTOM_PX = 52;
const MIN_EDITOR_PX = 160;

const readNumber = (key: string, fallback: number) => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const v = Number(raw);
    return Number.isFinite(v) ? v : fallback;
  } catch {
    return fallback;
  }
};

const writeNumber = (key: string, value: number) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    /* ignore */
  }
};

const ProblemWorkbench: React.FC<ProblemWorkbenchProps> = ({
  topBar,
  leftPanel,
  editorHeader,
  editor,
  bottomTabs,
  activeBottomTab,
  onBottomTabChange,
  bottomContent,
  tabActions,
  primaryAction,
  bottomActions,
  storageKey,
  className,
}) => {
  const resolvedPrimary = primaryAction ?? bottomActions;
  const leftKey = storageKey ? `${storageKey}:leftPct` : '';
  const bottomKey = storageKey ? `${storageKey}:bottomPx` : '';
  const collapseKey = storageKey ? `${storageKey}:bottomCollapsed` : '';

  const [leftPct, setLeftPct] = useState<number>(() =>
    readNumber(leftKey, DEFAULT_LEFT_PCT)
  );
  const [bottomPx, setBottomPx] = useState<number>(() =>
    readNumber(bottomKey, DEFAULT_BOTTOM_PX)
  );
  const [bottomCollapsed, setBottomCollapsed] = useState<boolean>(() => {
    if (!collapseKey || typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem(collapseKey) === '1';
    } catch {
      return false;
    }
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<'v' | 'h' | null>(null);

  useEffect(() => {
    if (leftKey) writeNumber(leftKey, leftPct);
  }, [leftKey, leftPct]);

  useEffect(() => {
    if (bottomKey) writeNumber(bottomKey, bottomPx);
  }, [bottomKey, bottomPx]);

  useEffect(() => {
    if (!collapseKey || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(collapseKey, bottomCollapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapseKey, bottomCollapsed]);

  // 监听全局鼠标事件以处理拖拽
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const mode = draggingRef.current;
      if (!mode) return;
      if (mode === 'v') {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const pct = ((e.clientX - rect.left) / rect.width) * 100;
        setLeftPct(Math.min(MAX_LEFT_PCT, Math.max(MIN_LEFT_PCT, pct)));
      } else if (mode === 'h') {
        const rect = rightRef.current?.getBoundingClientRect();
        if (!rect) return;
        const px = rect.bottom - e.clientY;
        const maxPx = Math.max(MIN_BOTTOM_PX, rect.height - MIN_EDITOR_PX);
        setBottomPx(Math.min(maxPx, Math.max(MIN_BOTTOM_PX, px)));
      }
    };
    const onUp = () => {
      if (draggingRef.current) {
        draggingRef.current = null;
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const startDrag = useCallback((mode: 'v' | 'h') => () => {
    draggingRef.current = mode;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = mode === 'v' ? 'col-resize' : 'row-resize';
  }, []);

  // 收起 / 展开 底部面板
  const toggleBottom = useCallback(() => {
    setBottomCollapsed((v) => !v);
  }, []);

  // 强制布局变化时通知子元素（如 CodeMirror）resize
  useLayoutEffect(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('resize'));
    }
  }, [leftPct, bottomPx, bottomCollapsed]);

  const effectiveBottomHeight = bottomCollapsed ? MIN_BOTTOM_PX : bottomPx;

  return (
    <div
      className={`flex flex-col w-full overflow-hidden ${className ?? ''}`}
      style={{
        height: '100%',
        backgroundColor: 'var(--gemini-bg, #f7f8fa)',
      }}
    >
      {/* 顶部操作栏 */}
      <div
        className="flex-none flex items-center gap-3 px-5 border-b"
        style={{
          minHeight: 56,
          backgroundColor: 'var(--gemini-surface, #fff)',
          borderColor: 'var(--gemini-border-light, #e5e7eb)',
        }}
      >
        {topBar}
      </div>

      {/* 主体：左 / 分割条 / 右 */}
      <div
        ref={containerRef}
        className="flex flex-row flex-auto min-h-0 overflow-hidden"
      >
        {/* 左侧题目描述区 */}
        <div
          className="flex flex-col min-h-0 overflow-hidden"
          style={{
            width: `calc(${leftPct}% - 4px)`,
            backgroundColor: 'var(--gemini-surface, #fff)',
          }}
        >
          <div className="flex-auto overflow-auto px-5 py-4">{leftPanel}</div>
        </div>

        {/* 垂直分割条 */}
        <div
          role="separator"
          aria-orientation="vertical"
          onMouseDown={startDrag('v')}
          className="flex-none flex items-center justify-center cursor-col-resize select-none group"
          style={{
            width: 8,
            backgroundColor: 'var(--gemini-bg, #f7f8fa)',
          }}
          title="拖动调整宽度"
        >
          <div
            className="w-[2px] h-12 rounded-full transition-colors group-hover:opacity-100 opacity-50"
            style={{ backgroundColor: 'var(--gemini-border, #cbd5e1)' }}
          />
        </div>

        {/* 右侧：上(编辑器) + 横向分割条 + 下(结果/输入) */}
        <div
          ref={rightRef}
          className="flex flex-col min-h-0 flex-auto overflow-hidden"
          style={{ backgroundColor: 'var(--gemini-surface, #fff)' }}
        >
          {/* 编辑器顶部工具栏 */}
          {editorHeader && (
            <div
              className="flex-none flex items-center gap-2 px-3 py-2 border-b"
              style={{
                borderColor: 'var(--gemini-border-light, #e5e7eb)',
                backgroundColor: 'var(--gemini-surface, #fff)',
              }}
            >
              {editorHeader}
            </div>
          )}

          {/* 编辑器主体 */}
          <div className="flex-auto min-h-0 overflow-hidden">{editor}</div>

          {/* 横向分割条 */}
          <div
            role="separator"
            aria-orientation="horizontal"
            onMouseDown={bottomCollapsed ? undefined : startDrag('h')}
            className={`flex-none flex items-center justify-center select-none group border-t ${
              bottomCollapsed ? '' : 'cursor-row-resize'
            }`}
            style={{
              height: 6,
              backgroundColor: 'var(--gemini-bg, #f7f8fa)',
              borderColor: 'var(--gemini-border-light, #e5e7eb)',
            }}
            title={bottomCollapsed ? '' : '拖动调整高度'}
          >
            {!bottomCollapsed && (
              <div
                className="h-[2px] w-12 rounded-full transition-colors group-hover:opacity-100 opacity-50"
                style={{ backgroundColor: 'var(--gemini-border, #cbd5e1)' }}
              />
            )}
          </div>

          {/* 底部 Tab 栏 */}
          <div
            className="flex-none flex flex-col min-h-0"
            style={{
              height: effectiveBottomHeight,
              backgroundColor: 'var(--gemini-surface, #fff)',
            }}
          >
            <div
              className="flex-none flex items-center px-3 gap-3"
              style={{
                height: MIN_BOTTOM_PX,
                borderBottom: bottomCollapsed
                  ? 'none'
                  : '1px solid var(--gemini-border-light, #e5e7eb)',
              }}
            >
              {/* 左侧折叠按钮 */}
              <button
                type="button"
                onClick={toggleBottom}
                className="flex-none p-1 rounded hover:bg-black/5 transition-colors"
                title={bottomCollapsed ? '展开' : '收起'}
                style={{ color: 'var(--gemini-text-secondary, #6b7280)' }}
              >
                {bottomCollapsed ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {/* tabs + tab 右侧的次级操作 */}
              <div className="flex items-center gap-2 flex-auto min-w-0 overflow-x-auto">
                {bottomTabs.map((tab) => {
                  const active = tab.key === activeBottomTab;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => {
                        if (bottomCollapsed) setBottomCollapsed(false);
                        onBottomTabChange(tab.key);
                      }}
                      className="px-3 py-1 text-sm rounded-md transition-colors whitespace-nowrap"
                      style={{
                        color: active
                          ? 'var(--gemini-text-primary, #1f2937)'
                          : 'var(--gemini-text-secondary, #6b7280)',
                        fontWeight: active ? 600 : 400,
                        borderBottom: active
                          ? '2px solid var(--gemini-accent, #1a73e8)'
                          : '2px solid transparent',
                        background: 'transparent',
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
                {tabActions && (
                  <div className="flex items-center gap-2 ml-2">{tabActions}</div>
                )}
              </div>

              {/* 最右侧主操作 */}
              {resolvedPrimary && (
                <div className="flex-none flex items-center">{resolvedPrimary}</div>
              )}
              <span
                className="hidden sm:inline-flex items-center text-xs flex-none"
                style={{ color: 'var(--gemini-text-disabled, #9ca3af)' }}
              >
                <GripVertical className="w-3 h-3" />
              </span>
            </div>
            {!bottomCollapsed && (
              <div className="flex-auto min-h-0 overflow-auto px-3 py-3">
                {bottomContent}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProblemWorkbench;
