import React, { useState, useRef } from 'react';
import { Volume2, VolumeX, RefreshCw } from 'lucide-react';

interface HeaderProps {
  onRestart: () => void;
  showRestart?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onRestart,
  showRestart = false,
}) => {
  const [isMuted, setIsMuted] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  /** Lazy-create the Audio object only on first user gesture. */
  const ensureAudio = (): HTMLAudioElement | null => {
    if (audioRef.current) return audioRef.current;
    try {
      const audio = new Audio('/sleep_away.mp3');
      audio.loop = true;
      audio.volume = 0.5;
      audioRef.current = audio;
      return audio;
    } catch (err) {
      console.warn('Audio init failed:', err);
      return null;
    }
  };

  const toggleSound = () => {
    const audio = ensureAudio();
    if (!audio) return;

    if (isMuted) {
      audio.play().then(() => {
        setIsMuted(false);
      }).catch((err) => {
        console.warn('Audio playback prevented/failed:', err);
      });
    } else {
      audio.pause();
      setIsMuted(true);
    }
  };

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <div onClick={onRestart} className="header-logo-wrap">
          <div className="header-logo-icon">
            E
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div className="header-logo-title">
              镜界自白
            </div>
            <div className="header-logo-subtitle">
              暗夜潜意识解构
            </div>
          </div>
        </div>

        <div className="header-actions">
          <button
            onClick={toggleSound}
            className="btn-secondary header-action-btn"
            title={isMuted ? '开音效' : '静音'}
            aria-label={isMuted ? '开音效' : '静音'}
          >
            {isMuted ? (
              <VolumeX size={12} strokeWidth={1.75} />
            ) : (
              <Volume2 size={12} strokeWidth={1.75} stroke="url(#rose-magenta-gradient)" className="icon-glow-rose" />
            )}
            <span className="btn-label-text">{isMuted ? '开音效' : '静音'}</span>
          </button>

          {showRestart && (
            <button
              onClick={onRestart}
              className="btn-secondary header-action-btn"
              title="重新测试"
              aria-label="重新测试"
            >
              <RefreshCw size={12} strokeWidth={1.75} />
              <span className="btn-label-text">重新测试</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
