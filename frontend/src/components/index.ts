// Layout
export { AppLayout, Header, Sidebar } from './Layout';

// Auth
export { AuthModal } from './Auth';

// AI Assistant
export { default as AIAssistant } from './AIAssistant';

// Particle Background
export { default as ParticleBackground } from './ParticleBackground';

// Code Editor
export { default as CodeEditor } from './CodeEditor';

// Code Window (for demo)
export { default as CodeWindow } from './CodeWindow';

// Count Up Animation
export { default as CountUp } from './CountUp';

// Custom Select
export { default as Select } from './Select';
export type { SelectOption } from './Select';

// Custom Input
export { default as Input } from './Input';

// Custom Button
export { default as Button } from './Button';
export type { ButtonProps, ButtonSize, ButtonVariant } from './Button';

// Custom Modal
export { default as Modal } from './Modal';
export type { ModalProps } from './Modal';

// Custom Tabs
export { default as Tabs } from './Tabs';
export type { TabItem } from './Tabs';

// Custom Form Item
export { default as FormItem } from './FormItem';
export type { FormItemProps } from './FormItem';

// Custom Toast
export { default as Toast } from './Toast';
export type { ToastState, ToastType } from './Toast';

// Permission Guard
export { default as PermissionGuard } from './PermissionGuard';

// Problem Workbench Layout
export { default as ProblemWorkbench } from './ProblemWorkbench';
export type { ProblemWorkbenchProps, WorkbenchTab } from './ProblemWorkbench/index';

// Workbench Result View (inline, borderless)
export { default as WorkbenchResult, mapJudgeStatusToVariant } from './WorkbenchResult';
export type {
  WorkbenchResultData,
  WorkbenchResultMetrics,
  WorkbenchResultVariant,
} from './WorkbenchResult/index';
