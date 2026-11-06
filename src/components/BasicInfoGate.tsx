import React from 'react';
import { ArrowRight, Lock } from 'lucide-react';

interface BasicInfoGateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onFill: () => void;
}

/** 未填写基础信息时的功能门禁：引导用户先完成第一章填写。 */
export const BasicInfoGate: React.FC<BasicInfoGateProps> = ({
  title = '先完成基础信息填写',
  description = '填写昵称与基础资料后，才能接取任务、查看数据。',
  actionLabel = '去填写基础信息',
  onFill,
}) => (
  <div
    style={{
      maxWidth: 420,
      margin: '2.2rem auto',
      padding: '1.8rem 1.5rem',
      textAlign: 'center',
      boxSizing: 'border-box',
      background: 'rgba(255, 255, 255, 0.03)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: 18,
    }}
  >
    <div
      style={{
        width: 44,
        height: 44,
        margin: '0 auto 0.8rem',
        display: 'grid',
        placeItems: 'center',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, rgba(255,112,166,0.2), rgba(225,0,255,0.2))',
        color: '#ff70a6',
      }}
    >
      <Lock size={20} />
    </div>
    <h3 style={{ margin: '0 0 0.4rem', fontSize: '1rem', color: '#fff' }}>{title}</h3>
    <p style={{ margin: '0 0 1.1rem', fontSize: '0.82rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.6)' }}>
      {description}
    </p>
    <button
      onClick={onFill}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '0.55rem 1.1rem',
        borderRadius: 10,
        border: 'none',
        background: 'linear-gradient(135deg, #ff70a6, #e100ff)',
        color: '#fff',
        fontWeight: 700,
        fontSize: '0.84rem',
        cursor: 'pointer',
      }}
    >
      <ArrowRight size={14} />
      {actionLabel}
    </button>
  </div>
);
