import { createRoot, type Root } from 'react-dom/client';
import { useEffect, useState, type ReactNode } from 'react';
import Modal from './modal';

export interface ConfirmOptions {
  title?: ReactNode;
  content?: ReactNode;
  okText?: ReactNode;
  cancelText?: ReactNode;
  okButtonProps?: { danger?: boolean; loading?: boolean };
  width?: number | string;
  centered?: boolean;
  /** 当 onOk 返回 Promise 时，按钮自动进入 loading；resolve 后关闭。 */
  onOk?: () => void | Promise<void> | Promise<unknown>;
  onCancel?: () => void;
}

interface ConfirmHostProps extends ConfirmOptions {
  destroy: () => void;
}

function ConfirmHost({
  title,
  content,
  okText = '确定',
  cancelText = '取消',
  okButtonProps,
  width,
  centered,
  onOk,
  onCancel,
  destroy,
}: ConfirmHostProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setOpen(true);
  }, []);

  const close = () => {
    setOpen(false);
    // 等过渡动画
    setTimeout(destroy, 220);
  };

  const handleCancel = () => {
    onCancel?.();
    close();
  };

  const handleOk = async () => {
    if (!onOk) {
      close();
      return;
    }
    try {
      const result = onOk();
      if (result instanceof Promise) {
        setLoading(true);
        await result;
      }
      close();
    } catch (error) {
      // 出错时保留 modal，让上层提示错误
      console.error('[confirm] onOk threw:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title={title}
      width={width}
      centered={centered}
      okText={okText}
      cancelText={cancelText}
      okButtonProps={{ ...okButtonProps, loading: loading || okButtonProps?.loading }}
      confirmLoading={loading}
      onOk={handleOk}
      onCancel={handleCancel}
    >
      <div className="text-sm text-slate-600">{content}</div>
    </Modal>
  );
}

/**
 * 命令式确认弹窗，等价于 antd `Modal.confirm`。
 * 用法：
 *   confirm({ title: '确认删除？', okButtonProps: { danger: true }, onOk: async () => { ... } });
 */
export function confirm(options: ConfirmOptions): { destroy: () => void } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  let root: Root | null = createRoot(container);

  const destroy = () => {
    if (root) {
      root.unmount();
      root = null;
    }
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  };

  root.render(<ConfirmHost {...options} destroy={destroy} />);

  return { destroy };
}

export default confirm;
