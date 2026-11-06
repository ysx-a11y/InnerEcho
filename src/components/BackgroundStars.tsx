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

export const BackgroundStars: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // 浪漫深邃的三色星云呼吸光场（魅惑玫红 + 电光紫罗兰 + 暖金余晖）
    const nebulae: NebulaOrb[] = [
      {
        anchorX: 0.24,
        anchorY: 0.16,
        radiusRatio: 0.52,
        maxRadiusPx: 540,
        rgb: '255, 51, 119', // 顶部偏左：绯红玫瑰主光场
        baseAlpha: 0.16,
        alphaVariation: 0.035,
        periodMs: 10500,
        phaseOffset: 0.3,
        driftPx: 24,
      },
      {
        anchorX: 0.78,
        anchorY: 0.52,
        radiusRatio: 0.56,
        maxRadiusPx: 580,
        rgb: '210, 30, 255', // 中右：魅惑紫罗兰星云
        baseAlpha: 0.125,
        alphaVariation: 0.03,
        periodMs: 13200,
        phaseOffset: 2.4,
        driftPx: 26,
      },
      {
        anchorX: 0.35,
        anchorY: 0.88,
        radiusRatio: 0.48,
        maxRadiusPx: 480,
        rgb: '255, 145, 175', // 底部：暖粉香槟柔光
        baseAlpha: 0.1,
        alphaVariation: 0.025,
        periodMs: 11800,
        phaseOffset: 4.2,
        driftPx: 20,
      },
    ];

    // 远/中/近三层晶莹星尘与柔焦散景光斑
    const totalCount = Math.min(82, Math.max(46, Math.floor((width * height) / 11500)));
    const nearCount = Math.min(6, Math.max(4, Math.floor(totalCount * 0.08)));
    const midCount = Math.floor(totalCount * 0.34);
    const farCount = Math.max(18, totalCount - nearCount - midCount);

    const farColors = ['#ff9ec4', '#dfb8cf', '#d8b4fe', '#ffffff'];
    const midColors = ['#ff3377', '#ff70a6', '#e100ff', '#ffd180', '#ffffff'];
    const nearColors = ['255, 80, 145', '225, 40, 255', '255, 160, 200', '192, 132, 252'];

    const particles: StarParticle[] = [];

    for (let i = 0; i < farCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 0.75 + 0.45,
        baseAlpha: Math.random() * 0.3 + 0.16,
        alphaAmplitude: Math.random() * 0.12 + 0.04,
        speedX: (Math.random() - 0.5) * 0.06,
        speedY: (Math.random() - 0.5) * 0.06 - 0.015,
        breathPeriodMs: 8500 + Math.random() * 5500,
        phaseOffset: Math.random() * Math.PI * 2,
        color: farColors[Math.floor(Math.random() * farColors.length)],
        tier: 'far',
      });
    }

    for (let i = 0; i < midCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.15 + 1.0,
        baseAlpha: Math.random() * 0.42 + 0.35,
        alphaAmplitude: Math.random() * 0.22 + 0.08,
        speedX: (Math.random() - 0.5) * 0.16,
        speedY: (Math.random() - 0.5) * 0.16 - 0.025,
        breathPeriodMs: 7000 + Math.random() * 6000,
        phaseOffset: Math.random() * Math.PI * 2,
        color: midColors[Math.floor(Math.random() * midColors.length)],
        tier: 'mid',
      });
    }

    for (let i = 0; i < nearCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 15 + 12,
        baseAlpha: Math.random() * 0.055 + 0.04,
        alphaAmplitude: Math.random() * 0.025 + 0.012,
        speedX: (Math.random() - 0.5) * 0.22,
        speedY: (Math.random() - 0.5) * 0.22 - 0.035,
        breathPeriodMs: 9500 + Math.random() * 5000,
        phaseOffset: Math.random() * Math.PI * 2,
        color: nearColors[i % nearColors.length],
        tier: 'near',
      });
    }

    const startTime = performance.now();

    const render = (now: number) => {
      const elapsed = now - startTime;
      ctx.clearRect(0, 0, width, height);

      // 1. 绘制呼吸星云光场
      for (let i = 0; i < nebulae.length; i++) {
        const orb = nebulae[i];
        const phase = (elapsed / orb.periodMs) * Math.PI * 2 + orb.phaseOffset;
        const currentAlpha = Math.max(
          0.03,
          orb.baseAlpha + Math.sin(phase) * orb.alphaVariation
        );
        const cx = orb.anchorX * width + Math.cos(phase * 0.7) * orb.driftPx;
        const cy = orb.anchorY * height + Math.sin(phase * 0.5) * orb.driftPx;
        const r = Math.min(orb.maxRadiusPx, Math.max(width, height) * orb.radiusRatio);

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, `rgba(${orb.rgb}, ${currentAlpha.toFixed(3)})`);
        grad.addColorStop(0.5, `rgba(${orb.rgb}, ${(currentAlpha * 0.42).toFixed(3)})`);
        grad.addColorStop(1, 'rgba(18, 7, 22, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. 绘制三层景深星尘
      const isMobile = width <= 640;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.speedX;
        p.y += p.speedY;

        const margin = p.tier === 'near' ? p.radius : 2;
        if (p.x < -margin) p.x = width + margin;
        if (p.x > width + margin) p.x = -margin;
        if (p.y < -margin) p.y = height + margin;
        if (p.y > height + margin) p.y = -margin;

        const wave = Math.sin((elapsed / p.breathPeriodMs) * Math.PI * 2 + p.phaseOffset);
        const alpha = Math.max(0.04, Math.min(0.92, p.baseAlpha + wave * p.alphaAmplitude));

        if (p.tier === 'near') {
          const bokehGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
          bokehGrad.addColorStop(0, `rgba(${p.color}, ${(alpha * 1.15).toFixed(3)})`);
          bokehGrad.addColorStop(0.45, `rgba(${p.color}, ${(alpha * 0.5).toFixed(3)})`);
          bokehGrad.addColorStop(1, `rgba(${p.color}, 0)`);
          ctx.fillStyle = bokehGrad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;
          if (!isMobile && p.tier === 'mid') {
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
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
};
