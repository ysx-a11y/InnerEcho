import React, { useEffect, useRef } from 'react';

/**
 * 极致性能优化的星空暗夜流光背景组件
 * 
 * 关键健壮性保障：
 * 所有定位属性必须通过行内 style 强制声明为 position: fixed / absolute，
 * 绝不依赖任何外部 CSS 类，确保在任何网络/加载时序下 100% 脱离正常文档流，
 * 绝不挤占垂直空间或将 Header / 主体内容下推。
 */
interface Star {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  alpha: number;
  twinkleSpeed: number;
  vx: number;
  vy: number;
}

export const BackgroundStars: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId: number;
    let stars: Star[] = [];
    let w = 0;
    let h = 0;
    let isDestroyed = false;
    let lastDrawTime = 0;
    const FRAME_INTERVAL = 1000 / 30; // 30fps 节流

    const resize = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.scale(dpr, dpr);
      initStars();
    };

    const initStars = () => {
      const count = Math.min(40, Math.max(20, Math.floor((w * h) / 35000)));
      stars = [];
      for (let i = 0; i < count; i++) {
        const baseAlpha = 0.15 + Math.random() * 0.45;
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          size: Math.random() < 0.2 ? 1.6 : 1.0,
          baseAlpha,
          alpha: baseAlpha,
          twinkleSpeed: 0.008 + Math.random() * 0.015,
          vx: (Math.random() - 0.5) * 0.08,
          vy: -0.04 - Math.random() * 0.08,
        });
      }
    };

    let startTimer: ReturnType<typeof setTimeout>;

    const render = (time: number) => {
      if (isDestroyed) return;

      const delta = time - lastDrawTime;
      if (delta >= FRAME_INTERVAL) {
        lastDrawTime = time - (delta % FRAME_INTERVAL);

        ctx.clearRect(0, 0, w, h);

        for (let i = 0; i < stars.length; i++) {
          const s = stars[i];
          s.alpha = s.baseAlpha + Math.sin(time * s.twinkleSpeed) * 0.25;
          s.x += s.vx;
          s.y += s.vy;

          if (s.y < 0) s.y = h;
          if (s.x < 0) s.x = w;
          if (s.x > w) s.x = 0;

          const currentAlpha = Math.max(0.05, Math.min(0.7, s.alpha));
          ctx.fillStyle = `rgba(244, 114, 182, ${currentAlpha.toFixed(2)})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(render);
    };

    window.addEventListener('resize', resize, { passive: true });
    resize();

    startTimer = setTimeout(() => {
      animId = requestAnimationFrame(render);
    }, 100);

    return () => {
      isDestroyed = true;
      clearTimeout(startTimer);
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        overflow: 'hidden',
        userSelect: 'none',
        zIndex: 0,
      }}
      aria-hidden="true"
    >
      {/* 
        GPU 硬件合成层 CSS 径向渐变：
        1. 0 CPU 消耗，移动端 60fps 丝滑
        2. 绝对定位强制脱离正常文档流，绝不撑开任何垂直页面高度
      */}
      <div 
        style={{
          position: 'absolute',
          width: 600,
          height: 600,
          top: -160,
          left: -160,
          borderRadius: '50%',
          filter: 'blur(100px)',
          WebkitFilter: 'blur(100px)',
          opacity: 0.25,
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.4) 0%, rgba(168, 85, 247, 0) 70%)',
          pointerEvents: 'none',
          willChange: 'transform',
        }}
      />
      <div 
        style={{
          position: 'absolute',
          width: 500,
          height: 500,
          top: '35%',
          right: -130,
          borderRadius: '50%',
          filter: 'blur(110px)',
          WebkitFilter: 'blur(110px)',
          opacity: 0.2,
          background: 'radial-gradient(circle, rgba(236, 72, 153, 0.35) 0%, rgba(236, 72, 153, 0) 70%)',
          pointerEvents: 'none',
          willChange: 'transform',
        }}
      />
      <div 
        style={{
          position: 'absolute',
          width: 700,
          height: 700,
          bottom: -190,
          left: '25%',
          borderRadius: '50%',
          filter: 'blur(120px)',
          WebkitFilter: 'blur(120px)',
          opacity: 0.15,
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, rgba(99, 102, 241, 0) 70%)',
          pointerEvents: 'none',
          willChange: 'transform',
        }}
      />

      {/* 轻量星尘画布 */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};
