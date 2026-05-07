import { Download, Maximize2, Minimize2, RotateCcw, WrapText } from 'lucide-react';
import toast from 'react-hot-toast';
import Select from '../Select';
import { copyTextToClipboard } from '@/utils/clipboard';

export interface OnlineIdeLanguageOption {
  label: string;
  value: string;
  template: string;
}

export interface OnlineIdeSettings {
  fontSize: number;
  wordWrap: boolean;
}

interface OnlineIdeToolbarProps {
  language: string;
  languageOptions: OnlineIdeLanguageOption[];
  code: string;
  settings: OnlineIdeSettings;
  isFullscreen: boolean;
  onLanguageChange: (language: string) => void;
  onCodeChange: (code: string) => void;
  onSettingsChange: (settings: OnlineIdeSettings) => void;
  onToggleFullscreen: () => void;
}

const FONT_SIZE_OPTIONS = [12, 14, 16, 18, 20].map((size) => ({ label: `${size}px`, value: String(size) }));

const getFileExtension = (language: string) => {
  if (language === 'cpp') return 'cpp';
  if (language === 'java') return 'java';
  if (language === 'python') return 'py';
  return 'txt';
};

const OnlineIdeToolbar: React.FC<OnlineIdeToolbarProps> = ({
  language,
  languageOptions,
  code,
  settings,
  isFullscreen,
  onLanguageChange,
  onCodeChange,
  onSettingsChange,
  onToggleFullscreen,
}) => {
  const handleResetTemplate = () => {
    const template = languageOptions.find((item) => item.value === language)?.template || '';
    onCodeChange(template);
    toast.success('已重置为当前语言模板');
  };

  const handleCopyCode = async () => {
    const ok = await copyTextToClipboard(code);
    if (ok) toast.success('代码已复制');
    else toast.error('复制失败，请手动复制');
  };

  const handleDownloadCode = () => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `solution.${getFileExtension(language)}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const updateSetting = <K extends keyof OnlineIdeSettings>(key: K, value: OnlineIdeSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <>
      <Select
        value={language}
        onChange={onLanguageChange}
        className="w-36"
        options={languageOptions.map((opt) => ({ value: opt.value, label: opt.label }))}
      />
      <Select
        value={String(settings.fontSize)}
        onChange={(value) => updateSetting('fontSize', Number(value))}
        className="w-24"
        options={FONT_SIZE_OPTIONS}
      />
      <button
        onClick={() => updateSetting('wordWrap', !settings.wordWrap)}
        className="inline-flex items-center gap-1 text-xs transition-colors px-2 py-1 rounded hover:bg-black/5"
        style={{ color: settings.wordWrap ? 'var(--gemini-accent-strong)' : 'var(--gemini-text-secondary)' }}
      >
        <WrapText className="w-4 h-4" />
        自动换行
      </button>
      <button
        onClick={handleResetTemplate}
        className="inline-flex items-center gap-1 text-xs transition-colors px-2 py-1 rounded hover:bg-black/5"
        style={{ color: 'var(--gemini-text-secondary)' }}
      >
        <RotateCcw className="w-4 h-4" />
        重置模板
      </button>
      <button
        onClick={handleCopyCode}
        className="text-xs transition-colors px-2 py-1 rounded hover:bg-black/5"
        style={{ color: 'var(--gemini-text-secondary)' }}
      >
        复制
      </button>
      <button
        onClick={handleDownloadCode}
        className="inline-flex items-center gap-1 text-xs transition-colors px-2 py-1 rounded hover:bg-black/5"
        style={{ color: 'var(--gemini-text-secondary)' }}
      >
        <Download className="w-4 h-4" />
        下载
      </button>
      <div className="flex-auto" />
      <button
        onClick={onToggleFullscreen}
        className="inline-flex items-center gap-1 text-xs transition-colors px-2 py-1 rounded hover:bg-black/5"
        style={{ color: 'var(--gemini-text-secondary)' }}
      >
        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        {isFullscreen ? '退出全屏' : '全屏'}
      </button>
    </>
  );
};

export default OnlineIdeToolbar;
