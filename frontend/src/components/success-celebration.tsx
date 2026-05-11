import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  speedX: number;
  speedY: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  shape: 'circle' | 'square' | 'star' | 'triangle';
}

interface SuccessCelebrationProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}

const COLORS = [
  '#E0F2FE', // Light Sky
  '#BAE6FD', // Sky Blue 200
  '#7DD3FC', // Sky Blue 300
  '#38BDF8', // Sky Blue 400
  '#60A5FA', // Blue 400
  '#93C5FD', // Blue 300
  '#BFDBFE', // Blue 200
  '#DBEAFE', // Blue 100
  '#F0F9FF', // Sky 50
  '#FFFFFF', // White
];

const SuccessCelebration: React.FC<SuccessCelebrationProps> = ({
  visible,
  onClose,
  title = '🎉 恭喜通过！',
  subtitle = 'Accepted',
}) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [showContent, setShowContent] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const createParticle = useCallback((id: number): Particle => {
    const shapes: Particle['shape'][] = ['circle', 'square', 'star', 'triangle'];
    return {
      id,
      x: Math.random() * window.innerWidth,
      y: -20 - Math.random() * 100,
      size: 8 + Math.random() * 16,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      speedX: (Math.random() - 0.5) * 4,
      speedY: 2 + Math.random() * 4,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      opacity: 0.8 + Math.random() * 0.2,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
    };
  }, []);

  useEffect(() => {
    if (visible) {
      setIsExiting(false);
      // Create initial particles
      const initialParticles = Array.from({ length: 60 }, (_, i) => createParticle(i));
      setParticles(initialParticles);

      // Show content with delay
      const contentTimer = setTimeout(() => setShowContent(true), 200);

      // Continuously add particles
      let particleId = 60;
      const addParticleInterval = setInterval(() => {
        setParticles((prev) => {
          const filtered = prev.filter((p) => p.y < window.innerHeight + 50);
          if (filtered.length < 80) {
            return [...filtered, createParticle(particleId++)];
          }
          return filtered;
        });
      }, 100);

      // Animate particles
      const animationInterval = setInterval(() => {
        setParticles((prev) =>
          prev.map((p) => ({
            ...p,
            x: p.x + p.speedX,
            y: p.y + p.speedY,
            rotation: p.rotation + p.rotationSpeed,
            speedY: p.speedY + 0.05, // gravity
          }))
        );
      }, 16);

      return () => {
        clearTimeout(contentTimer);
        clearInterval(addParticleInterval);
        clearInterval(animationInterval);
      };
    } else {
      setShowContent(false);
      setParticles([]);
    }
  }, [visible, createParticle]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
      setIsExiting(false);
    }, 400);
  };

  const renderShape = (particle: Particle) => {
    const style: React.CSSProperties = {
      position: 'absolute',
      left: particle.x,
      top: particle.y,
      width: particle.size,
      height: particle.size,
      opacity: particle.opacity,
      transform: `rotate(${particle.rotation}deg)`,
      pointerEvents: 'none',
    };

    switch (particle.shape) {
      case 'circle':
        return (
          <div
            key={particle.id}
            style={{
              ...style,
              borderRadius: '50%',
              backgroundColor: particle.color,
              boxShadow: `0 0 ${particle.size / 2}px ${particle.color}`,
            }}
          />
        );
      case 'square':
        return (
          <div
            key={particle.id}
            style={{
              ...style,
              backgroundColor: particle.color,
              borderRadius: '2px',
            }}
          />
        );
      case 'star':
        return (
          <svg
            key={particle.id}
            style={style}
            viewBox="0 0 24 24"
            fill={particle.color}
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        );
      case 'triangle':
        return (
          <div
            key={particle.id}
            style={{
              ...style,
              width: 0,
              height: 0,
              borderLeft: `${particle.size / 2}px solid transparent`,
              borderRight: `${particle.size / 2}px solid transparent`,
              borderBottom: `${particle.size}px solid ${particle.color}`,
              backgroundColor: 'transparent',
            }}
          />
        );
      default:
        return null;
    }
  };

  if (!visible) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[99999] flex items-center justify-center transition-all duration-400 ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={handleClose}
      style={{
        background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.97) 0%, rgba(248,250,252,0.98) 40%, rgba(241,245,249,0.95) 100%)',
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map(renderShape)}
      </div>

      {/* Glow rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className={`absolute w-[600px] h-[600px] rounded-full transition-all duration-1000 ${
            showContent ? 'scale-100 opacity-30' : 'scale-0 opacity-0'
          }`}
          style={{
            background: 'radial-gradient(circle, rgba(56,189,248,0.15) 0%, transparent 70%)',
            animation: showContent ? 'pulse-ring 2s ease-in-out infinite' : 'none',
          }}
        />
        <div
          className={`absolute w-[400px] h-[400px] rounded-full transition-all duration-700 delay-100 ${
            showContent ? 'scale-100 opacity-40' : 'scale-0 opacity-0'
          }`}
          style={{
            background: 'radial-gradient(circle, rgba(96,165,250,0.2) 0%, transparent 70%)',
            animation: showContent ? 'pulse-ring 2s ease-in-out infinite 0.5s' : 'none',
          }}
        />
      </div>

      {/* Main content */}
      <div
        className={`relative z-10 text-center transition-all duration-500 ${
          showContent ? 'scale-100 opacity-100 translate-y-0' : 'scale-50 opacity-0 translate-y-10'
        } ${isExiting ? 'scale-75 opacity-0 translate-y-[-20px]' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Success icon */}
        <div
          className={`mx-auto mb-6 w-32 h-32 rounded-full flex items-center justify-center transition-all duration-700 delay-200 ${
            showContent ? 'scale-100 rotate-0' : 'scale-0 rotate-180'
          }`}
          style={{
            background: 'linear-gradient(135deg, #34D399 0%, #10B981 50%, #059669 100%)',
            boxShadow: '0 0 60px rgba(52,211,153,0.4), 0 0 100px rgba(16,185,129,0.2), inset 0 -4px 20px rgba(0,0,0,0.1)',
          }}
        >
          <svg
            className={`w-16 h-16 text-white transition-all duration-500 delay-500 ${
              showContent ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
              style={{
                strokeDasharray: 30,
                strokeDashoffset: showContent ? 0 : 30,
                transition: 'stroke-dashoffset 0.6s ease-out 0.6s',
              }}
            />
          </svg>
        </div>

        {/* Title */}
        <h1
          className={`text-5xl font-bold mb-3 transition-all duration-500 delay-300 ${
            showContent ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
          style={{
            color: '#374151',
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))',
          }}
        >
          {title}
        </h1>

        {/* Subtitle */}
        <p
          className={`text-2xl font-semibold mb-8 transition-all duration-500 delay-400 ${
            showContent ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
          style={{
            color: '#6B7280',
            letterSpacing: '0.15em',
          }}
        >
          {subtitle}
        </p>

       

        {/* Close button */}
        <button
          onClick={handleClose}
          className={`px-8 py-3 rounded-full font-semibold text-lg transition-all duration-300 hover:scale-105 active:scale-95 ${
            showContent ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
          style={{
            background: '#374151',
            color: 'white',
            boxShadow: '0 4px 12px rgba(55,65,81,0.2)',
            border: 'none',
            cursor: 'pointer',
            transitionDelay: '0.6s',
          }}
        >
          太棒了！继续挑战 →
        </button>

        {/* Hint */}
        <p
          className={`mt-4 text-gray-400 text-sm transition-all duration-500 delay-700 ${
            showContent ? 'opacity-100' : 'opacity-0'
          }`}
        >
          点击任意位置关闭
        </p>
      </div>

      {/* CSS Keyframes */}
      <style>{`
        @keyframes pulse-ring {
          0%, 100% {
            transform: scale(1);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.5;
          }
        }
      `}</style>
    </div>,
    document.body
  );
};

export default SuccessCelebration;
