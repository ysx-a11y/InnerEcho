import React, { useState, useEffect, Suspense } from 'react';
import { Sparkles, ShieldCheck, Zap, Heart, LogIn, User } from 'lucide-react';
import type { DossierSummaryContract } from '../../shared/apiContracts';
import { prioritizeAuth, prioritizeBankSelector } from '../utils/journeyPreloads';
import { progressivePreloader } from '../utils/progressiveLoading';
import { FeaturePill } from './FeaturePill';

// 登录弹窗按需加载：点登录/注册才拉取
const AuthModal = React.lazy(() => import('./AuthModal').then((m) => ({ default: m.AuthModal })));

interface WelcomeViewProps {
  /** 点击游客或开始使用进入综合入口/题库 */
  onStart: () => void;
  user?: { id: string; email: string } | null;
  onLoginSuccess?: (user: { id: string; email: string }, latestDossier?: DossierSummaryContract) => void;
  onRestoreDossier?: (summary: DossierSummaryContract) => void;
  /** 已登录态点击"继续使用"时触发 */
  onContinue?: () => void;
  /** 退出登录（含会话失效时的状态清理） */
  onLogout?: () => void;
}

export const WelcomeView: React.FC<WelcomeViewProps> = ({
  onStart,
  user,
  onLoginSuccess,
  onRestoreDossier,
  onContinue,
  onLogout,
}) => {
  const [typedText, setTypedText] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register' | null>(null);
  const fullText = '在纷乱的世界底层，探寻你未曾揭露的暗面与灵魂原型。';

  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      if (index <= fullText.length) {
        setTypedText(fullText.slice(0, index));
        index++;
      } else {
        clearInterval(timer);
      }
    }, 60);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (authMode === null) return;
    progressivePreloader.pause();
    return () => progressivePreloader.resume();
  }, [authMode]);

  const openAuth = () => {
    setAuthMode('login');
    void prioritizeAuth();
  };

  const continueAsGuest = () => {
    void prioritizeBankSelector();
    onStart();
  };

  return (
    <div
      style={{
        minHeight: 'calc(100dvh - 65px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(1rem, 3vh, 2rem) 1rem',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: 900,
        margin: '0 auto',
        boxSizing: 'border-box',
        overflowWrap: 'break-word',
        wordBreak: 'break-word',
      }}
      className="animate-fade-in welcome-container"
    >
      {/* Decorative Badge */}
      <div
        className="welcome-badge"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.4rem 1.1rem',
          borderRadius: 20,
          background: 'rgba(255, 51, 119, 0.12)',
          border: '1px solid rgba(255, 112, 166, 0.35)',
          color: '#ff70a6',
          fontSize: '0.85rem',
          fontWeight: 600,
          marginBottom: 'clamp(0.6rem, 2.2vh, 1.5rem)',
          boxShadow: '0 0 15px rgba(255, 51, 119, 0.2)',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        <Sparkles size={16} strokeWidth={1.5} stroke="url(#rose-magenta-gradient)" className="animate-icon-pulse" />
        <span>暧昧氛围 & 深层倾向诊断 2.0</span>
      </div>

      {/* Main Title */}
      <h1
        style={{
          fontSize: 'clamp(1.7rem, 6vw, 3rem)',
          fontWeight: 800,
          lineHeight: 1.15,
          letterSpacing: '-0.02em',
          maxWidth: 900,
          marginBottom: 'clamp(0.6rem, 2.2vh, 1.5rem)',
        }}
        className="text-gradient welcome-title"
      >
        镜界自白 · 匿名反差人格问卷
      </h1>

      {/* Typing Subtitle */}
      <p
        style={{
          fontSize: 'clamp(0.85rem, 2.2vw, 1.1rem)',
          color: 'var(--text-secondary)',
          maxWidth: 640,
          minHeight: '2.5rem',
          lineHeight: 1.6,
          marginBottom: 'clamp(1rem, 3.5vh, 2.5rem)',
        }}
        className="welcome-subtitle"
      >
        {typedText}
        <span style={{ opacity: 0.8 }} className="animate-pulse-glow">
          |
        </span>
      </p>

      {/* Feature Pills */}
      <div
        className="welcome-pills-container"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          justifyContent: 'center',
          maxWidth: 700,
          marginBottom: 'clamp(1rem, 3.5vh, 2.5rem)',
        }}
      >
        <FeaturePill
          icon={<Zap size={14} strokeWidth={1.5} stroke="url(#rose-magenta-gradient)" className="icon-glow-rose" />}
          text="四维心流矩阵"
        />
        <FeaturePill
          icon={<Heart size={14} strokeWidth={1.5} stroke="url(#rose-magenta-gradient)" className="icon-glow-rose" />}
          text="暧昧气场分析"
        />
        <FeaturePill
          icon={<ShieldCheck size={14} strokeWidth={1.5} stroke="url(#gold-orange-gradient)" className="icon-glow-gold" />}
          text="一键导出美学报告海报"
        />
      </div>

      {user ? (
        <div style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.65rem', wordBreak: 'break-all' }}>
            已登录为 {user.email}
          </div>
          <button
            onPointerDown={() => { void prioritizeBankSelector(); }}
            onClick={() => {
              if (onContinue) onContinue();
              else onStart();
            }}
            className="btn-glow welcome-btn"
            style={{ width: '100%', fontSize: '0.95rem', padding: '0.8rem 1.6rem', whiteSpace: 'nowrap' }}
          >
            <User size={18} strokeWidth={1.75} />
            <span>继续使用</span>
          </button>
        </div>
      ) : (
        /* 未登录入口：登录或以游客身份体验 */
        <div className="welcome-btns-container" style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 360 }}>
          <button
            onPointerDown={() => { void prioritizeAuth(); }}
            onClick={openAuth}
            className="btn-glow welcome-btn"
            style={{ fontSize: '0.95rem', padding: '0.8rem 1.6rem', flex: '1 1 130px', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            <LogIn size={18} strokeWidth={1.75} />
            <span>登录</span>
          </button>
          <button
            onPointerDown={() => { void prioritizeBankSelector(); }}
            onClick={continueAsGuest}
            className="btn-secondary welcome-btn"
            style={{ fontSize: '0.95rem', padding: '0.8rem 1.6rem', flex: '1 1 130px', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            <User size={18} strokeWidth={1.75} />
            <span>游客</span>
          </button>
        </div>
      )}

      {/* Footer Info */}
      <div className="welcome-footer" style={{ marginTop: '2.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        已有众多探索者在此完成属于自己的 <span style={{ color: '#ff70a6', fontWeight: 600 }}>镜界自白</span>
      </div>

      {/* Auth Modal */}
      <Suspense fallback={null}>
        {authMode !== null && (
          <AuthModal
            isOpen={authMode !== null}
            initialMode={authMode === 'register'}
            onClose={() => setAuthMode(null)}
            user={user ?? null}
            onLoginSuccess={(u, latestDossier) => {
              setAuthMode(null);
              onLoginSuccess?.(u, latestDossier);
            }}
            onLogout={onLogout ?? (() => {})}
            onRestoreDossier={onRestoreDossier}
            onContinue={onContinue || onStart}
          />
        )}
      </Suspense>
    </div>
  );
};
