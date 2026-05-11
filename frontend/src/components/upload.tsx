import { useRef, type ReactNode } from 'react';

export interface UploadRequestOption {
  file: File;
  onSuccess?: (response: unknown) => void;
  onError?: (error: Error) => void;
}

export interface UploadProps {
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  showUploadList?: boolean;
  /** 与 antd 兼容：自定义上传请求函数。 */
  customRequest?: (options: UploadRequestOption) => void | Promise<void>;
  /** 普通受控 onChange，传入选中文件列表。 */
  onFiles?: (files: File[]) => void;
  className?: string;
  children?: ReactNode;
}

/**
 * 轻量自制 Upload：点击 children 触发文件选择，复用 antd 的 customRequest 签名以兼容现有调用方。
 * 不实现上传列表/进度条/拖拽（用不到）。
 */
const Upload: React.FC<UploadProps> = ({
  accept,
  multiple = false,
  disabled = false,
  customRequest,
  onFiles,
  className = '',
  children,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files ? Array.from(event.target.files) : [];
    if (fileList.length === 0) return;
    onFiles?.(fileList);
    if (customRequest) {
      fileList.forEach((file) => {
        customRequest({
          file,
          onSuccess: () => {},
          onError: () => {},
        });
      });
    }
    // 允许同一文件再次触发 change
    event.target.value = '';
  };

  return (
    <span
      className={`inline-block ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${className}`}
      onClick={openPicker}
      role="button"
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      {children}
    </span>
  );
};

export default Upload;
