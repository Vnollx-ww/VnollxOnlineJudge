import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';

interface ParticleBackgroundProps {
  style?: CSSProperties;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  hue: number;
  alpha: number;
  pulseSpeed: number;
  pulsePhase: number;
}

interface Mouse {
  x: number | null;
  y: number | null;
  radius: number;
}

const ParticleBackground: React.FC<ParticleBackgroundProps> = ({ 
  style = {},
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    let time = 0;
    const mouse: Mouse = { x: null, y: null, radius: 200 };

    // 渐变色调范围 (蓝色到紫色到粉色)
    const baseHue = 220;

    const handleMouseMove = (event: MouseEvent) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = null;
      mouse.y = null;
    };

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      const particleCount = Math.min(Math.floor((canvas.width * canvas.height) / 15000), 100);
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 2.5 + 1,
          hue: baseHue + Math.random() * 60 - 30,
          alpha: Math.random() * 0.4 + 0.2,
          pulseSpeed: Math.random() * 0.02 + 0.01,
          pulsePhase: Math.random() * Math.PI * 2
        });
      }
    };

    const drawParticles = () => {
      time += 0.01;
      
      // 创建渐变背景
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, 'rgba(240, 244, 249, 1)');
      gradient.addColorStop(1, 'rgba(240, 244, 249, 1)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach((p, i) => {
        // 脉动效果
        const pulse = Math.sin(time * 3 + p.pulsePhase) * 0.3 + 1;
        const currentSize = p.size * pulse;
        const currentAlpha = p.alpha * (0.7 + pulse * 0.3);
        
        // 缓慢移动
        p.x += p.vx;
        p.y += p.vy;

        // 鼠标交互 - 吸引效果
        if (mouse.x != null && mouse.y != null) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < mouse.radius) {
            const force = (mouse.radius - distance) / mouse.radius;
            const angle = Math.atan2(dy, dx);
            
            // 粒子被轻微吸引
            p.x += Math.cos(angle) * force * 0.8;
            p.y += Math.sin(angle) * force * 0.8;

            // 绘制到鼠标的连线
            const lineAlpha = 0.15 * (1 - distance / mouse.radius);
            const lineGradient = ctx.createLinearGradient(p.x, p.y, mouse.x, mouse.y);
            lineGradient.addColorStop(0, `hsla(${p.hue}, 70%, 60%, ${lineAlpha})`);
            lineGradient.addColorStop(1, `hsla(${p.hue + 30}, 70%, 60%, ${lineAlpha * 0.5})`);
            
            ctx.beginPath();
            ctx.strokeStyle = lineGradient;
            ctx.lineWidth = 1.5;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }

        // 边界处理 - 平滑穿越
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;
        if (p.y < -10) p.y = canvas.height + 10;
        if (p.y > canvas.height + 10) p.y = -10;

        // 绘制粒子 - 发光效果
        const glowGradient = ctx.createRadialGradient(
          p.x, p.y, 0,
          p.x, p.y, currentSize * 4
        );
        glowGradient.addColorStop(0, `hsla(${p.hue}, 70%, 65%, ${currentAlpha})`);
        glowGradient.addColorStop(0.4, `hsla(${p.hue}, 70%, 65%, ${currentAlpha * 0.4})`);
        glowGradient.addColorStop(1, `hsla(${p.hue}, 70%, 65%, 0)`);
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentSize * 4, 0, Math.PI * 2);
        ctx.fillStyle = glowGradient;
        ctx.fill();

        // 绘制核心
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${currentAlpha * 1.2})`;
        ctx.fill();

        // 连接附近粒子
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            const lineAlpha = 0.08 * (1 - distance / 150);
            const avgHue = (p.hue + p2.hue) / 2;
            
            ctx.beginPath();
            ctx.strokeStyle = `hsla(${avgHue}, 60%, 60%, ${lineAlpha})`;
            ctx.lineWidth = 1;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      });

      // 绘制鼠标光晕
      if (mouse.x != null && mouse.y != null) {
        const mouseGlow = ctx.createRadialGradient(
          mouse.x, mouse.y, 0,
          mouse.x, mouse.y, mouse.radius
        );
        const hue = baseHue + Math.sin(time) * 20;
        mouseGlow.addColorStop(0, `hsla(${hue}, 70%, 70%, 0.08)`);
        mouseGlow.addColorStop(0.5, `hsla(${hue + 20}, 70%, 70%, 0.03)`);
        mouseGlow.addColorStop(1, `hsla(${hue + 40}, 70%, 70%, 0)`);
        
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, mouse.radius, 0, Math.PI * 2);
        ctx.fillStyle = mouseGlow;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(drawParticles);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    drawParticles();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 0,
        ...style
      }}
    />
  );
};

export default ParticleBackground;

