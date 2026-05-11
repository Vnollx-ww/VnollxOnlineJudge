// Layout
export { AppLayout, Header, Sidebar } from './Layout';

// Auth
export { default as AuthModal } from './auth-modal';

// AI Assistant
export { default as AIAssistant } from './ai-assistant';

// Particle Background
export { default as ParticleBackground } from './particle-background';

// Code Editor
export { default as CodeEditor } from './code-editor';

// Online IDE Toolbar
export { default as OnlineIdeToolbar } from './online-ide-toolbar';
export type { OnlineIdeLanguageOption, OnlineIdeSettings } from './online-ide-toolbar';

// Code Window (for demo)
export { default as CodeWindow } from './code-window';

// Count Up Animation
export { default as CountUp } from './count-up';

// Custom Select
export { default as Select } from './select';
export type { SelectOption } from './select';

// Custom Input
export { default as Input } from './input';

// Custom Button
export { default as Button } from './button';
export type { ButtonProps, ButtonSize, ButtonVariant } from './button';

// Custom Avatar (轻量头像，含圆形 fallback)
export { default as Avatar } from './avatar';

// Custom Space (flex 包装)
export { default as Space } from './space';

// Custom Tooltip (悬浮提示)
export { default as Tooltip } from './tooltip';
export type { TooltipProps } from './tooltip';

// Custom Progress (线性进度条)
export { default as Progress } from './progress';
export type { ProgressProps } from './progress';

// Custom Popconfirm (轻量级确认气泡)
export { default as Popconfirm } from './popconfirm';
export type { PopconfirmProps } from './popconfirm';

// Custom Divider (分隔符)
export { default as Divider } from './divider';
export type { DividerProps } from './divider';

// Custom Drawer (侧滑抽屉)
export { default as Drawer } from './drawer';
export type { DrawerProps } from './drawer';

// Custom Badge (角标)
export { default as Badge } from './badge';
export type { BadgeProps } from './badge';

// Custom Modal
export { default as Modal } from './modal';
export type { ModalProps } from './modal';

// Imperative confirm()
export { default as confirm } from './confirm';
export type { ConfirmOptions } from './confirm';

// Custom Pagination
export { default as Pagination } from './pagination';
export type { PaginationProps } from './pagination';

// Custom Upload (轻量 customRequest 兼容)
export { default as Upload } from './upload';
export type { UploadProps, UploadRequestOption } from './upload';

// Custom Dropdown
export { default as Dropdown } from './dropdown';
export type { DropdownProps, DropdownMenuItem, DropdownPlacement } from './dropdown';

// Custom Tabs
export { default as Tabs } from './tabs';

// Custom Form Item
export { default as FormItem } from './form-item';
export type { FormItemProps } from './form-item';

// Custom Toast
export { default as Toast } from './toast';
export type { ToastState, ToastType } from './toast';

// Admin UI primitives
export * from './admin-ui';

// Permission Guard
export { default as PermissionGuard } from './permission-guard';

// Problem Workbench Layout
export { default as ProblemWorkbench } from './problem-workbench';
export type { ProblemWorkbenchProps, WorkbenchTab } from './problem-workbench';

// Metric Card (统一的小指标卡片)
export { default as MetricCard } from './metric-card';
export type { MetricCardProps, MetricCardTone } from './metric-card';

// Tag Multi Select (标签多选下拉)
export { default as TagMultiSelect } from './tag-multi-select';
export type { TagMultiSelectProps, TagOption } from './tag-multi-select';

// Page Surface (统一的 Gemini 风格页面外壳)
export { default as PageSurface } from './page-surface';
export type { PageSurfaceProps } from './page-surface';

// Submission Code Block (SyntaxHighlighter + 复制按钮)
export { default as SubmissionCodeBlock } from './submission-code-block';
export type { SubmissionCodeBlockProps } from './submission-code-block';

// Page Pagination (统一的"共 X 条 + 快速跳转"分页条)
export { default as PagePagination } from './page-pagination';
export type { PagePaginationProps } from './page-pagination';

// Status / Difficulty / Language / Competition / PassRate 徽章
export {
  ToneBadge,
  JudgeStatusBadge,
  DifficultyBadge,
  CompetitionStatusBadge,
  LanguageBadge,
  PassRateBadge,
} from './status-badge';

// Workbench Result View (inline, borderless)
export { default as WorkbenchResult, mapJudgeStatusToVariant } from './workbench-result';
export type {
  WorkbenchResultData,
  WorkbenchResultMetrics,
  WorkbenchResultVariant,
} from './workbench-result';
