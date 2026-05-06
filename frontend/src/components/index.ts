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

// Permission Guard
export { default as PermissionGuard } from './PermissionGuard';

// Judge outcome (submit / sample test)
export { default as JudgeOutcomeCard, mapJudgeStatusToVariant } from './JudgeOutcomeCard';
export type { JudgeOutcomeData, JudgeOutcomeMetrics, JudgeOutcomeVariant } from './JudgeOutcomeCard';
