import React, { useState } from 'react';
import { Clock, Edit3 } from 'lucide-react';
import { UserBankSummaryDTO } from '../utils/userBanks';

interface MyBankItemProps {
  bank: UserBankSummaryDTO;
  onClick: (bankId: string) => void;
}

export const MyBankItem: React.FC<MyBankItemProps> = ({ bank, onClick }) => {
  const [hovered, setHovered] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(bank.id);
    }
  };

  const dynamicBorder = hovered ? '#c084fc' : 'rgba(255, 255, 255, 0.08)';

  return (
    <div
      onClick={() => onClick(bank.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onKeyDown={handleKeyDown}
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: `1px solid ${dynamicBorder}`,
        borderRadius: 12,
        padding: '0.85rem 1rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.85rem',
        transition: 'all 0.2s ease',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
      role="button"
      tabIndex={0}
      aria-label={`${bank.title}, ${bank.auditStatus === 'approved' ? '已通过' : bank.auditStatus === 'pending' ? '审核中' : bank.auditStatus === 'rejected' ? '未通过' : '草稿'}, ${bank.questionCount} 题`}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Top meta tags */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
          <span
            style={{
              padding: '0.15rem 0.55rem',
              borderRadius: 6,
              fontSize: '0.7rem',
              fontWeight: 600,
              background: bank.auditStatus === 'approved'
                ? 'rgba(34, 197, 94, 0.15)'
                : bank.auditStatus === 'pending'
                  ? 'rgba(124, 140, 255, 0.15)'
                  : bank.auditStatus === 'rejected'
                    ? 'rgba(239, 68, 68, 0.12)'
                    : 'rgba(245, 158, 11, 0.15)',
              color: bank.auditStatus === 'approved'
                ? '#22c55e'
                : bank.auditStatus === 'pending'
                  ? '#7c8cff'
                  : bank.auditStatus === 'rejected'
                    ? '#e58a90'
                    : '#f59e0b',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {bank.auditStatus === 'approved'
              ? '已通过'
              : bank.auditStatus === 'pending'
                ? '审核中'
                : bank.auditStatus === 'rejected'
                  ? '未通过'
                  : '草稿'}
          </span>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {bank.questionCount} 题
          </span>
          {bank.estimatedMinutes && (
            <span
              style={{
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <Clock size={10} style={{ flexShrink: 0 }} /> {bank.estimatedMinutes} 分钟
            </span>
          )}
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: '0.92rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: '0.2rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {bank.title}
        </div>

        {/* Subtitle */}
        {bank.subtitle && (
          <div
            style={{
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {bank.subtitle}
          </div>
        )}
      </div>
      <Edit3 size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
    </div>
  );
};
