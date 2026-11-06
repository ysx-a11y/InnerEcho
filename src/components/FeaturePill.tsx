import React from 'react';

interface FeaturePillProps {
  icon: React.ReactNode;
  text: string;
}

export const FeaturePill: React.FC<FeaturePillProps> = ({ icon, text }) => {
  return (
    <div
      className="glass-card welcome-pill"
      style={{
        padding: '0.65rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        fontSize: '0.85rem',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <span className="icon-badge" style={{ flexShrink: 0 }}>
        {icon}
      </span>
      <span
        style={{
          boxSizing: 'border-box',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
          maxWidth: '100%',
        }}
      >
        {text}
      </span>
    </div>
  );
};
