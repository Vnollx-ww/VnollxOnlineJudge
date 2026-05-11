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

// Custom Modal
export { default as Modal } from './modal';
export type { ModalProps } from './modal';

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

// Workbench Result View (inline, borderless)
export { default as WorkbenchResult, mapJudgeStatusToVariant } from './workbench-result';
export type {
  WorkbenchResultData,
  WorkbenchResultMetrics,
  WorkbenchResultVariant,
} from './workbench-result';
