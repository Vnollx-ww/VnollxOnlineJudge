import { memo } from 'react';

export interface BalloonIconProps {
  color: string;
  className?: string;
  style?: React.CSSProperties;
}

const BalloonIcon = memo(({ color, className = 'h-9 w-9', style }: BalloonIconProps) => (
  <svg className={`${className} shrink-0`} viewBox="0 0 48 48" fill="none" style={style}>
    <title>{color}</title>
    <path
      d="M34 16C35 8 31.1274 4 24.1274 4C17.1274 4 13 9 14 16C15 23 21.2548 28 24.1274 28C27 28 33 24 34 16Z"
      fill={color}
      stroke="#888"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M25 28C23 28.9697 20 31.8889 20 35C20 38.1111 30 36.4444 30 39.5556C30 42.6667 19 44 19 44"
      fill="none"
      stroke="#888"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
));

BalloonIcon.displayName = 'BalloonIcon';

export default BalloonIcon;
