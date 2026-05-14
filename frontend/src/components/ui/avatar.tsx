import type { CSSProperties, ReactNode } from 'react';

interface AvatarProps {
  size?: number;
  src?: string | null;
  style?: CSSProperties;
  className?: string;
  children?: ReactNode;
  onClick?: () => void;
}

const Avatar: React.FC<AvatarProps> = ({
  size = 32,
  src,
  style,
  className = '',
  children,
  onClick,
}) => {
  const fontSize = Math.max(12, Math.floor(size * 0.45));
  const baseStyle: CSSProperties = {
    width: size,
    height: size,
    fontSize,
    ...style,
  };

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center justify-center overflow-hidden rounded-full bg-slate-200 text-white font-semibold select-none align-middle ${className}`}
      style={baseStyle}
    >
      {src ? (
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          onError={(event) => {
            (event.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        children
      )}
    </span>
  );
};

export default Avatar;
