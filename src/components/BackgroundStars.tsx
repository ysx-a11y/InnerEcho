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
    if (prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
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

    const handleResize = () => {
      updateCanvasSize();
    };

    window.addEventListener('resize', handleResize, { passive: true });

    // 浪漫深邃的三色星云呼吸光场（魅惑玫红 + 电光紫罗兰 + 暖粉香槟）
    const nebulae: NebulaOrb[] = [
      {
        anchorX: 0.24,
        anchorY: 0.16,
        radiusRatio: 0.58,
        maxRadiusPx: 580,
        rgb: '255, 51, 119', // 顶部偏左：绯红玫瑰主光场
        baseAlpha: 0.28,
        alphaVariation: 0.06,
        periodMs: 9500,
        phaseOffset: 0.3,
        driftPx: 26,
      },
      {
        anchorX: 0.82,
        anchorY: 0.48,
        radiusRatio: 0.62,
        maxRadiusPx: 620,
        rgb: '210, 30, 255', // 中右：魅惑紫罗兰星云
        baseAlpha: 0.24,
        alphaVariation: 0.05,
        periodMs: 12000,
        phaseOffset: 2.4,
        driftPx: 28,
      },
      {
        anchorX: 0.32,
        anchorY: 0.86,
        radiusRatio: 0.52,
        maxRadiusPx: 520,
        rgb: '255, 112, 166', // 底部：暖粉香槟柔光
        baseAlpha: 0.2,
        alphaVariation: 0.045,
        periodMs: 11000,
        phaseOffset: 4.2,
        driftPx: 22,
      },
    ];

    // 远/中/近三层晶莹星尘与柔焦散景光斑
    const totalCount = Math.min(96, Math.max(52, Math.floor((width * height) / 9500)));
    const nearCount = Math.min(6, Math.max(4, Math.floor(totalCount * 0.08)));
    const midCount = Math.floor(totalCount * 0.38);
    const farCount = Math.max(22, totalCount - nearCount - midCount);

    const farColors = ['#ff9ec4', '#dfb8cf', '#d8b4fe', '#ffffff'];
    const midColors = ['#ff3377', '#ff70a6', '#e100ff', '#ffd180', '#ffffff'];
    const nearColors = ['255, 80, 145', '225, 40, 255', '255, 160, 200', '192, 132, 252'];

    const particles: StarParticle[] = [];

    for (let i = 0; i < farCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 0.8 + 0.6,
        baseAlpha: Math.random() * 0.35 + 0.25,
        alphaAmplitude: Math.random() * 0.16 + 0.06,
        speedX: (Math.random() - 0.5) * 0.06,
        speedY: (Math.random() - 0.5) * 0.06 - 0.015,
        breathPeriodMs: 7500 + Math.random() * 5000,
        phaseOffset: Math.random() * Math.PI * 2,
        color: farColors[Math.floor(Math.random() * farColors.length)],
        tier: 'far',
      });
    }

    for (let i = 0; i < midCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.3 + 1.1,
        baseAlpha: Math.random() * 0.4 + 0.45,
        alphaAmplitude: Math.random() * 0.25 + 0.12,
        speedX: (Math.random() - 0.5) * 0.15,
        speedY: (Math.random() - 0.5) * 0.15 - 0.02,
        breathPeriodMs: 6500 + Math.random() * 5500,
        phaseOffset: Math.random() * Math.PI * 2,
        color: midColors[Math.floor(Math.random() * midColors.length)],
        tier: 'mid',
      });
    }

    for (let i = 0; i < nearCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 18 + 14,
        baseAlpha: Math.random() * 0.08 + 0.06,
        alphaAmplitude: Math.random() * 0.035 + 0.018,
        speedX: (Math.random() - 0.5) * 0.2,
        speedY: (Math.random() - 0.5) * 0.2 - 0.03,
        breathPeriodMs: 8500 + Math.random() * 4500,
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
        grad.addColorStop(0.35, `rgba(${orb.rgb}, ${(currentAlpha * 0.62).toFixed(3)})`);
        grad.addColorStop(0.7, `rgba(${orb.rgb}, ${(currentAlpha * 0.22).toFixed(3)})`);
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

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
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
        高奢硬件合成层 CSS 径向流光（深邃暗夜紫粉底色兜底）：
        1. 纯 GPU 渲染，0 垂直占位，绝不下推任何页面元素；
        2. 确保在真机/OLED/节能模式下永远拥有充满魅力的紫红呼吸光晕，告别死黑。
      */}
      <div
        style={{
          position: 'absolute',
          top: '-15%',
          left: '-10%',
          width: '85vw',
          maxWidth: '650px',
          height: '55vh',
          maxHeight: '520px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 51, 119, 0.26) 0%, rgba(210, 30, 255, 0.12) 45%, transparent 70%)',
          filter: 'blur(60px)',
          WebkitFilter: 'blur(60px)',
          transform: 'translateZ(0)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '32%',
          right: '-15%',
          width: '80vw',
          maxWidth: '580px',
          height: '50vh',
          maxHeight: '480px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(170, 38, 218, 0.22) 0%, rgba(255, 112, 166, 0.1) 45%, transparent 70%)',
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
          left: '12%',
          width: '80vw',
          maxWidth: '600px',
          height: '45vh',
          maxHeight: '450px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 112, 166, 0.18) 0%, rgba(138, 43, 226, 0.08) 50%, transparent 70%)',
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
