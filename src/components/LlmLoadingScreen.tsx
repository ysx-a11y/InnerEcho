import React, { useState, useEffect } from 'react';
import { Sparkles, Heart, Activity, Clock, ChevronLeft } from 'lucide-react';

interface LlmLoadingScreenProps {
  isReady: boolean;
  onComplete: () => void;
  onCancel?: () => void;
}

export const LlmLoadingScreen: React.FC<LlmLoadingScreenProps> = ({ isReady, onComplete, onCancel }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [bpm, setBpm] = useState(78);

  const loadingSteps = [
    { title: '【心率感应】提取表里对立参数...', subtitle: '感应社会人格面具 (Persona) 与真实心理防备心律' },
    { title: '【暗面共鸣】演算潜意识阴影 (Shadow)...', subtitle: '量化【反差属性】、隐秘幻想与边界碰撞张力' },
    { title: '【深度解构】大模型认知解构中...', subtitle: '正在分析手填文字、测算未敢言说的私密羁绊法则...' },
    { title: '【回响显影】自白卷宗生成完毕...', subtitle: '正在渲染你的专属双重奏自白与高奢暗面镜像...' },
  ];

  // Dynamic step progression & BPM pulse
  useEffect(() => {
    const bpmSteps = [78, 92, 88, 82, 76];
    let stepCount = 0;

    const interval = setInterval(() => {
      stepCount++;
      setStepIndex((prev) => {
        if (prev < loadingSteps.length - 1) {
          return prev + 1;
        }
        return prev; // Stay on final step
      });

      // Fluctuate BPM for live heartbeat feel
      const nextBpm = bpmSteps[stepCount % bpmSteps.length] + Math.floor(Math.random() * 5 - 2);
      setBpm(nextBpm);
    }, 2200);

    return () => clearInterval(interval);
  }, [loadingSteps.length]);

  // When data is ready (and at least 2.5s have passed for user immersion), trigger onComplete
  const [minTimePassed, setMinTimePassed] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimePassed(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isReady && minTimePassed) {
      onComplete();
    }
  }, [isReady, minTimePassed, onComplete]);

  const currentStep = loadingSteps[Math.min(stepIndex, loadingSteps.length - 1)];

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 80px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
        boxSizing: 'border-box',
        width: '100%',
      }}
      className="animate-fade-in"
    >
      {onCancel && (
        <div style={{ position: 'absolute', top: '1rem', left: '1rem', zIndex: 20 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 12,
              padding: '0.35rem 0.75rem',
              color: 'var(--text-secondary)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.2s ease',
            }}
          >
            <ChevronLeft size={15} />
            <span>返回首页</span>
          </button>
        </div>
      )}
      <style>{`
        @keyframes doubleHeartBeat {
          0% { transform: scale(1); filter: drop-shadow(0 0 20px rgba(255, 51, 119, 0.8)); }
          14% { transform: scale(1.24); filter: drop-shadow(0 0 45px rgba(255, 51, 119, 0.98)); }
          28% { transform: scale(1.04); filter: drop-shadow(0 0 22px rgba(255, 51, 119, 0.85)); }
          42% { transform: scale(1.18); filter: drop-shadow(0 0 35px rgba(225, 0, 255, 0.92)); }
          70% { transform: scale(1); filter: drop-shadow(0 0 20px rgba(255, 51, 119, 0.8)); }
          100% { transform: scale(1); filter: drop-shadow(0 0 20px rgba(255, 51, 119, 0.8)); }
        }

        @keyframes heartRingExpand {
          0% { transform: scale(0.6); opacity: 0.85; }
          100% { transform: scale(2.4); opacity: 0; }
        }
      `}</style>

      {/* Pure Beating Heart with Ring Diffusion Waves */}
      <div
        style={{
          width: 160,
          height: 160,
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* Ring Diffusion Waves */}
        <div
          style={{
            position: 'absolute',
            width: 100,
            height: 100,
            borderRadius: '50%',
            border: '2px solid rgba(255, 51, 119, 0.65)',
            boxShadow: '0 0 15px rgba(255, 51, 119, 0.4)',
            animation: 'heartRingExpand 1.5s infinite ease-out',
            pointerEvents: 'none',
            transformOrigin: 'center center',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 100,
            height: 100,
            borderRadius: '50%',
            border: '2px solid rgba(225, 0, 255, 0.45)',
            boxShadow: '0 0 15px rgba(225, 0, 255, 0.3)',
            animation: 'heartRingExpand 1.5s infinite ease-out 0.5s',
            pointerEvents: 'none',
            transformOrigin: 'center center',
          }}
        />

        {/* Pure Beating Heart Icon */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'doubleHeartBeat 1.2s infinite ease-in-out',
            transformOrigin: 'center center',
            zIndex: 2,
          }}
        >
          <Heart size={92} strokeWidth={1.25} stroke="url(#rose-magenta-gradient)" fill="url(#rose-magenta-gradient)" style={{ filter: 'drop-shadow(0 0 35px rgba(255, 51, 119, 0.95))' }} />
        </div>
      </div>

      {/* Live Heartbeat ECG & BPM Bar */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.6rem',
          padding: '0.4rem 1.1rem',
          borderRadius: 20,
          background: 'rgba(255, 51, 119, 0.14)',
          border: '1px solid rgba(255, 112, 166, 0.35)',
          color: '#ff70a6',
          fontSize: '0.85rem',
          fontWeight: 600,
          marginBottom: '1.25rem',
        }}
      >
        <Activity size={16} strokeWidth={1.75} stroke="url(#rose-magenta-gradient)" className="animate-pulse icon-glow-rose" />
        <span>潜意识心率感应：<strong style={{ color: '#ffffff', fontSize: '0.95rem' }}>{bpm}</strong> BPM</span>
      </div>

      {/* Dynamic Title Glass Card */}
      <div
        className="glass-card glass-card-glow"
        style={{
          padding: '2rem 2.2rem',
          maxWidth: 540,
          width: '100%',
          textAlign: 'center',
          background: 'rgba(20, 8, 26, 0.88)',
          borderRadius: 20,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.8rem', borderRadius: 20, background: 'rgba(225, 0, 255, 0.12)', border: '1px solid rgba(225, 0, 255, 0.3)', color: '#e100ff', fontSize: '0.78rem', fontWeight: 600, marginBottom: '1.1rem' }}>
          <Sparkles size={14} strokeWidth={1.5} stroke="url(#rose-magenta-gradient)" className="animate-icon-pulse" />
          <span>大模型深度倾向模型推演中...</span>
        </div>

        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.6rem', lineHeight: 1.4 }}>
          {currentStep.title}
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
          {currentStep.subtitle}
        </p>

        {/* Step dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.4rem' }}>
          {loadingSteps.map((_, idx) => (
            <div
              key={idx}
              style={{
                width: idx === stepIndex ? 22 : 8,
                height: 8,
                borderRadius: 4,
                background: idx <= stepIndex ? 'linear-gradient(90deg, #ff3377, #e100ff)' : 'rgba(255, 255, 255, 0.1)',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>

        {/* Expected duration hint */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.35rem 0.95rem',
            borderRadius: 20,
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.09)',
            color: 'rgba(255, 255, 255, 0.72)',
            fontSize: '0.78rem',
            marginTop: '1.25rem',
          }}
        >
          <Clock size={13} strokeWidth={1.75} style={{ color: '#ff70a6', flexShrink: 0 }} />
          <span>深度自白解构通常需 <strong style={{ color: '#ffd5e5', fontWeight: 600 }}>15 ~ 30 秒</strong> · 请静候潜意识回响</span>
        </div>
      </div>
    </div>
  );
};
