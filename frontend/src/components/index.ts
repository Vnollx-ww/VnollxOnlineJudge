// Layout
export { AppLayout, Header, Sidebar } from './layout';

// Auth
export { default as AuthModal } from './auth/auth-modal';

// AI Assistant
export { default as AIAssistant } from './assistant/ai-assistant';

// Particle Background
export { default as ParticleBackground } from './common/particle-background';

// Code Editor
export { default as CodeEditor } from './editor/code-editor';

// Online IDE Toolbar
export { default as OnlineIdeToolbar } from './editor/online-ide-toolbar';
export type { OnlineIdeLanguageOption, OnlineIdeSettings } from './editor/online-ide-toolbar';

// Code Window (for demo)
export { default as CodeWindow } from './editor/code-window';

// Count Up Animation
export { default as CountUp } from './common/count-up';

// Custom Select
export { default as Select } from './ui/select';
export type { SelectOption } from './ui/select';

// Custom Input
export { default as Input } from './ui/input';

// Custom Button
export { default as Button } from './ui/button';
export type { ButtonProps, ButtonSize, ButtonVariant } from './ui/button';

// Custom Avatar (轻量头像，含圆形 fallback)
export { default as Avatar } from './ui/avatar';

// Custom Space (flex 包装)
export { default as Space } from './ui/space';

// Custom Tooltip (悬浮提示)
export { default as Tooltip } from './ui/tooltip';
export type { TooltipProps } from './ui/tooltip';

// Custom Progress (线性进度条)
export { default as Progress } from './ui/progress';
export type { ProgressProps } from './ui/progress';

// Custom Popconfirm (轻量级确认气泡)
export { default as Popconfirm } from './ui/popconfirm';
export type { PopconfirmProps } from './ui/popconfirm';

// Custom Divider (分隔符)
export { default as Divider } from './ui/divider';
export type { DividerProps } from './ui/divider';

// Custom Drawer (侧滑抽屉)
export { default as Drawer } from './ui/drawer';
export type { DrawerProps } from './ui/drawer';

// Custom Badge (角标)
export { default as Badge } from './ui/badge';
export type { BadgeProps } from './ui/badge';

// Custom Modal
export { default as Modal } from './ui/modal';
export type { ModalProps } from './ui/modal';

// Imperative confirm()
export { default as confirm } from './ui/confirm';
export type { ConfirmOptions } from './ui/confirm';

// Custom Pagination
export { default as Pagination } from './ui/pagination';
export type { PaginationProps } from './ui/pagination';

// Custom Upload (轻量 customRequest 兼容)
export { default as Upload } from './ui/upload';
export type { UploadProps, UploadRequestOption } from './ui/upload';

// Custom Dropdown
export { default as Dropdown } from './ui/dropdown';
export type { DropdownProps, DropdownMenuItem, DropdownPlacement } from './ui/dropdown';

// Custom Tabs
export { default as Tabs } from './ui/tabs';

// Custom Form Item
export { default as FormItem } from './ui/form-item';
export type { FormItemProps } from './ui/form-item';

// Custom Toast
export { default as Toast } from './ui/toast';
export type { ToastState, ToastType } from './ui/toast';

// Admin UI primitives
export * from './admin/admin-ui';

// Permission Guard
export { default as PermissionGuard } from './common/permission-guard';

// Problem Workbench Layout
export { default as ProblemWorkbench } from './editor/problem-workbench';
export type { ProblemWorkbenchProps, WorkbenchTab } from './editor/problem-workbench';

// Metric Card (统一的小指标卡片)
export { default as MetricCard } from './common/metric-card';
export type { MetricCardProps, MetricCardTone } from './common/metric-card';

// Tag Multi Select (标签多选下拉)
export { default as TagMultiSelect } from './common/tag-multi-select';
export type { TagMultiSelectProps, TagOption } from './common/tag-multi-select';

// Page Surface (统一的 Gemini 风格页面外壳)
export { default as PageSurface } from './common/page-surface';
export type { PageSurfaceProps } from './common/page-surface';

// Submission Code Block (SyntaxHighlighter + 复制按钮)
export { default as SubmissionCodeBlock } from './editor/submission-code-block';
export type { SubmissionCodeBlockProps } from './editor/submission-code-block';

// Page Pagination (统一的"共 X 条 + 快速跳转"分页条)
export { default as PagePagination } from './common/page-pagination';
export type { PagePaginationProps } from './common/page-pagination';

// Status / Difficulty / Language / Competition / PassRate 徽章
export {
  ToneBadge,
  JudgeStatusBadge,
  DifficultyBadge,
  CompetitionStatusBadge,
  LanguageBadge,
  PassRateBadge,
} from './common/status-badge';

// Balloon Icon (比赛气球)
export { default as BalloonIcon } from './common/balloon-icon';
export type { BalloonIconProps } from './common/balloon-icon';

// Workbench Result View (inline, borderless)
export { default as WorkbenchResult, mapJudgeStatusToVariant } from './editor/workbench-result';
export type {
  WorkbenchResultData,
  WorkbenchResultMetrics,
  WorkbenchResultVariant,
} from './editor/workbench-result';
