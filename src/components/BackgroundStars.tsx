import React, { useEffect, useRef } from 'react';

interface StarParticle {
  x: number;
  y: number;
  radius: number;
  baseAlpha: number;
  alphaAmplitude: number;
  speedX: number;
  speedY: number;
  breathPeriodMs: number;
  phaseOffset: number;
  color: string;
  tier: 'far' | 'mid' | 'near';
}

interface NebulaOrb {
  anchorX: number;
  anchorY: number;
  radiusRatio: number;
  maxRadiusPx: number;
  rgb: string;
  baseAlpha: number;
  alphaVariation: number;
  periodMs: number;
  phaseOffset: number;
  driftPx: number;
}

/**
 * 高奢暗夜星空与呼吸星云画布
 * 
 * 核心架构：
 * 1. 外层 fixed 0 占位容器，绝不挤占文档流，绝不下推页面任何元素；
 * 2. CSS GPU 硬件流光层提供深邃、柔和的玫红/紫罗兰星云氛围底色；
 * 3. Canvas 遵循设备物理像素比 (DPR)，绘制清晰锐利、晶莹闪烁的三层星海与动态流光核。
 */
export const BackgroundStars: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number | null = null;
    let dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    let width = window.innerWidth;
    let height = window.innerHeight;

    const updateCanvasSize = () => {
      if (!canvas) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    updateCanvasSize();

    // 浪漫深邃的三色星云呼吸光场（魅惑玫红 + 电光紫罗兰 + 暖粉香槟）
    // 保持深邃暗夜基调，移动端仅微调边缘锚点与约 15% 呼吸光感，绝不刺眼过曝
    const isNarrowScreen = width <= 640;
    const nebulae: NebulaOrb[] = [
      {
        anchorX: isNarrowScreen ? 0.18 : 0.24,
        anchorY: isNarrowScreen ? 0.14 : 0.16,
        radiusRatio: isNarrowScreen ? 0.6 : 0.54,
        maxRadiusPx: 560,
        rgb: '255, 51, 119', // 顶部偏左：绯红玫瑰主光场
        baseAlpha: isNarrowScreen ? 0.19 : 0.16,
        alphaVariation: 0.038,
        periodMs: 10500,
        phaseOffset: 0.3,
        driftPx: 24,
      },
      {
        anchorX: isNarrowScreen ? 0.84 : 0.78,
        anchorY: 0.5,
        radiusRatio: isNarrowScreen ? 0.62 : 0.56,
        maxRadiusPx: 580,
        rgb: '210, 30, 255', // 中右：魅惑紫罗兰星云
        baseAlpha: isNarrowScreen ? 0.155 : 0.125,
        alphaVariation: 0.032,
        periodMs: 13200,
        phaseOffset: 2.4,
        driftPx: 26,
      },
      {
        anchorX: isNarrowScreen ? 0.26 : 0.35,
        anchorY: 0.88,
        radiusRatio: isNarrowScreen ? 0.54 : 0.48,
        maxRadiusPx: 500,
        rgb: '255, 112, 166', // 底部：暖粉香槟柔光
        baseAlpha: isNarrowScreen ? 0.13 : 0.1,
        alphaVariation: 0.028,
        periodMs: 11800,
        phaseOffset: 4.2,
        driftPx: 20,
      },
    ];

    // 远/中/近三层晶莹星尘与柔焦散景光斑
    const totalCount = Math.min(96, Math.max(56, Math.floor((width * height) / 9000)));
    const nearCount = Math.min(8, Math.max(5, Math.floor(totalCount * 0.09)));
    const midCount = Math.floor(totalCount * 0.4);
    const farCount = Math.max(24, totalCount - nearCount - midCount);

    const farColors = ['#ff9ec4', '#dfb8cf', '#d8b4fe', '#ffffff'];
    const midColors = ['#ff3377', '#ff70a6', '#e100ff', '#ffd180', '#ffffff'];
    const nearColors = ['255, 80, 145', '225, 40, 255', '255, 160, 200', '192, 132, 252'];

    /**
     * 初始坐标生成：首帧即让粒子均匀分布在屏幕四周（上/下/左/右边缘环带）与全局空间，
     * 避免打开页面时大部分粒子被中间卡片遮挡、需要等待从边缘缓慢飘入。
     */
    const pickInitialPoint = (index: number, count: number): { x: number; y: number } => {
      // 约 65% 粒子直接布置在四周可见环带（上、下、左、右四侧），其余 35% 铺满全局
      if (index < count * 0.65) {
        const side = index % 4;
        if (side === 0) {
          // 顶部环带
          return { x: Math.random() * width, y: Math.random() * (height * 0.22) };
        }
        if (side === 1) {
          // 底部环带
          return { x: Math.random() * width, y: height * (0.78 + Math.random() * 0.22) };
        }
        if (side === 2) {
          // 左侧环带
          return { x: Math.random() * (width * 0.22), y: Math.random() * height };
        }
        // 右侧环带
        return { x: width * (0.78 + Math.random() * 0.22), y: Math.random() * height };
      }
      return { x: Math.random() * width, y: Math.random() * height };
    };

    const pickVelocity = (minSpeed: number, maxSpeed: number, upwardBias: number) => {
      const angle = Math.random() * Math.PI * 2;
      const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
      return {
        speedX: Math.cos(angle) * speed,
        speedY: Math.sin(angle) * speed - upwardBias,
      };
    };

    const particles: StarParticle[] = [];

    for (let i = 0; i < farCount; i++) {
      const pos = pickInitialPoint(i, farCount);
      const vel = pickVelocity(0.16, 0.32, 0.04);
      particles.push({
        x: pos.x,
        y: pos.y,
        radius: Math.random() * 0.8 + 0.6,
        baseAlpha: Math.random() * 0.35 + 0.28,
        alphaAmplitude: Math.random() * 0.16 + 0.06,
        speedX: vel.speedX,
        speedY: vel.speedY,
        breathPeriodMs: 5500 + Math.random() * 4000,
        phaseOffset: Math.random() * Math.PI * 2,
        color: farColors[Math.floor(Math.random() * farColors.length)],
        tier: 'far',
      });
    }

    for (let i = 0; i < midCount; i++) {
      const pos = pickInitialPoint(i, midCount);
      const vel = pickVelocity(0.28, 0.54, 0.06);
      particles.push({
        x: pos.x,
        y: pos.y,
        radius: Math.random() * 1.3 + 1.1,
        baseAlpha: Math.random() * 0.4 + 0.46,
        alphaAmplitude: Math.random() * 0.25 + 0.12,
        speedX: vel.speedX,
        speedY: vel.speedY,
        breathPeriodMs: 4800 + Math.random() * 4200,
        phaseOffset: Math.random() * Math.PI * 2,
        color: midColors[Math.floor(Math.random() * midColors.length)],
        tier: 'mid',
      });
    }

    for (let i = 0; i < nearCount; i++) {
      const pos = pickInitialPoint(i, nearCount);
      const vel = pickVelocity(0.34, 0.64, 0.08);
      particles.push({
        x: pos.x,
        y: pos.y,
        radius: Math.random() * 18 + 14,
        baseAlpha: Math.random() * 0.08 + 0.06,
        alphaAmplitude: Math.random() * 0.035 + 0.018,
        speedX: vel.speedX,
        speedY: vel.speedY,
        breathPeriodMs: 6500 + Math.random() * 3500,
        phaseOffset: Math.random() * Math.PI * 2,
        color: nearColors[i % nearColors.length],
        tier: 'near',
      });
    }

    const startTime = performance.now();

    const render = (now: number) => {
      const elapsed = now - startTime;
      ctx.clearRect(0, 0, width, height);

      // 1. 绘制动态呼吸星云光场
      for (let i = 0; i < nebulae.length; i++) {
        const orb = nebulae[i];
        const phase = (elapsed / orb.periodMs) * Math.PI * 2 + orb.phaseOffset;
        const currentAlpha = Math.max(
          0.04,
          orb.baseAlpha + Math.sin(phase) * orb.alphaVariation
        );
        const cx = orb.anchorX * width + Math.cos(phase * 0.7) * orb.driftPx;
        const cy = orb.anchorY * height + Math.sin(phase * 0.5) * orb.driftPx;
        const r = Math.min(orb.maxRadiusPx, Math.max(width, height) * orb.radiusRatio);

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, `rgba(${orb.rgb}, ${currentAlpha.toFixed(3)})`);
        grad.addColorStop(0.5, `rgba(${orb.rgb}, ${(currentAlpha * 0.44).toFixed(3)})`);
        grad.addColorStop(1, 'rgba(18, 7, 22, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. 绘制三层景深晶莹星尘
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.speedX;
        p.y += p.speedY;

        const margin = p.tier === 'near' ? p.radius : 4;
        if (p.x < -margin) p.x = width + margin;
        if (p.x > width + margin) p.x = -margin;
        if (p.y < -margin) p.y = height + margin;
        if (p.y > height + margin) p.y = -margin;

        const wave = Math.sin((elapsed / p.breathPeriodMs) * Math.PI * 2 + p.phaseOffset);
        const alpha = Math.max(0.06, Math.min(0.96, p.baseAlpha + wave * p.alphaAmplitude));

        if (p.tier === 'near') {
          const bokehGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
          bokehGrad.addColorStop(0, `rgba(${p.color}, ${(alpha * 1.2).toFixed(3)})`);
          bokehGrad.addColorStop(0.5, `rgba(${p.color}, ${(alpha * 0.5).toFixed(3)})`);
          bokehGrad.addColorStop(1, `rgba(${p.color}, 0)`);
          ctx.fillStyle = bokehGrad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;
          if (p.tier === 'mid') {
            ctx.shadowBlur = p.radius * 3.5;
            ctx.shadowColor = p.color;
          }
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    const handleResize = () => {
      const prevWidth = width || 1;
      const prevHeight = height || 1;
      updateCanvasSize();
      const scaleX = width / prevWidth;
      const scaleY = height / prevHeight;
      for (let i = 0; i < particles.length; i++) {
        particles[i].x *= scaleX;
        particles[i].y *= scaleY;
      }
      if (prefersReducedMotion) {
        render(performance.now());
      }
    };

    window.addEventListener('resize', handleResize, { passive: true });
    render(performance.now());

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
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
        background: '#120716',
      }}
      aria-hidden="true"
    >
      {/* 
        克制幽暗的底层环境微光兜底（仅提供极低饱和度的暗夜冷暖层次，不与 Canvas 星云叠加过曝）
      */}
      <div
        style={{
          position: 'absolute',
          top: '-12%',
          left: '-12%',
          width: 'max(82vw, 360px)',
          maxWidth: '620px',
          height: '48vh',
          maxHeight: '480px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 51, 119, 0.14) 0%, rgba(210, 30, 255, 0.06) 48%, transparent 70%)',
          filter: 'blur(60px)',
          WebkitFilter: 'blur(60px)',
          transform: 'translateZ(0)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '34%',
          right: '-15%',
          width: 'max(80vw, 340px)',
          maxWidth: '560px',
          height: '46vh',
          maxHeight: '450px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(170, 38, 218, 0.12) 0%, rgba(255, 112, 166, 0.05) 48%, transparent 70%)',
          filter: 'blur(65px)',
          WebkitFilter: 'blur(65px)',
          transform: 'translateZ(0)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          left: '10%',
          width: 'max(80vw, 340px)',
          maxWidth: '580px',
          height: '42vh',
          maxHeight: '420px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 112, 166, 0.1) 0%, rgba(138, 43, 226, 0.04) 50%, transparent 70%)',
          filter: 'blur(60px)',
          WebkitFilter: 'blur(60px)',
          transform: 'translateZ(0)',
          pointerEvents: 'none',
        }}
      />

      {/* 高清 DPR 动态晶莹星海画布 */}
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
