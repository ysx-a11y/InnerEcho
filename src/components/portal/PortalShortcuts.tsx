import React from 'react';
import { Crown, Layers, Activity, ChevronRight } from 'lucide-react';

interface PortalShortcutsProps {
  onOpenTasks: () => void;
  onOpenCards: () => void;
  onOpenAstrolabe: () => void;
}

export const PortalShortcuts: React.FC<PortalShortcutsProps> = ({
  onOpenTasks,
  onOpenCards,
  onOpenAstrolabe,
}) => {
  return (
    <>
      {/* 第三层：并列双入口（流光香槟金任务 + 幻彩紫晶角色卡） */}
      <div
        style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '0.68rem',
          marginBottom: '0.75rem',
          boxSizing: 'border-box',
        }}
      >
        {/* 试炼任务 */}
        <button
          type="button"
          onClick={onOpenTasks}
          className="glass-card portal-base-card"
          style={{
            padding: '0.88rem 0.75rem 0.82rem',
            borderRadius: 16,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.36rem',
            cursor: 'pointer',
            border: '1px solid rgba(255, 209, 128, 0.32)',
            background: 'linear-gradient(145deg, rgba(255, 209, 128, 0.11) 0%, rgba(18, 6, 24, 0.72) 100%)',
            boxSizing: 'border-box',
            textAlign: 'center',
            minHeight: 102,
            fontFamily: 'inherit',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: -24,
              right: -24,
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255, 209, 128, 0.18) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(255, 209, 128, 0.15)',
              border: '1px solid rgba(255, 209, 128, 0.42)',
              boxShadow: '0 0 14px rgba(255, 209, 128, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Crown size={18} stroke="url(#gold-orange-gradient)" className="icon-glow-gold" />
          </span>
          <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#ffd180', lineHeight: 1.2 }}>
            试炼任务
          </span>
          <span style={{ fontSize: '0.67rem', color: 'var(--text-secondary)', opacity: 0.8, lineHeight: 1.2 }}>
            接取暗面悬赏与挑战
          </span>
        </button>

        {/* 自制角色卡 */}
        <button
          type="button"
          onClick={onOpenCards}
          className="glass-card portal-base-card"
          style={{
            padding: '0.88rem 0.75rem 0.82rem',
            borderRadius: 16,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.36rem',
            cursor: 'pointer',
            border: '1px solid rgba(192, 132, 252, 0.34)',
            background: 'linear-gradient(145deg, rgba(192, 132, 252, 0.12) 0%, rgba(18, 6, 24, 0.72) 100%)',
            boxSizing: 'border-box',
            textAlign: 'center',
            minHeight: 102,
            fontFamily: 'inherit',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: -24,
              right: -24,
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(192, 132, 252, 0.2) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(192, 132, 252, 0.16)',
              border: '1px solid rgba(192, 132, 252, 0.44)',
              boxShadow: '0 0 14px rgba(192, 132, 252, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Layers size={18} color="#c084fc" className="icon-glow-violet" />
          </span>
          <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#c084fc', lineHeight: 1.2 }}>
            自制角色卡
          </span>
          <span style={{ fontSize: '0.67rem', color: 'var(--text-secondary)', opacity: 0.8, lineHeight: 1.2 }}>
            生成专属自白卡片
          </span>
        </button>
      </div>

      {/* 第四层：潜意识星盘（冰晶青微光单行入口） */}
      <button
        type="button"
        onClick={onOpenAstrolabe}
        className="glass-card portal-base-card"
        style={{
          width: '100%',
          padding: '0.68rem 0.95rem',
          borderRadius: 15,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.6rem',
          cursor: 'pointer',
          border: '1px solid rgba(128, 243, 255, 0.26)',
          background: 'linear-gradient(135deg, rgba(128, 243, 255, 0.08) 0%, rgba(18, 6, 24, 0.65) 100%)',
          boxSizing: 'border-box',
          textAlign: 'left',
          fontFamily: 'inherit',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.58rem', minWidth: 0 }}>
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'rgba(128, 243, 255, 0.14)',
              border: '1px solid rgba(128, 243, 255, 0.36)',
              boxShadow: '0 0 10px rgba(128, 243, 255, 0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Activity size={14} color="#80f3ff" />
          </span>
          <div style={{ minWidth: 0 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#80f3ff' }}>
              潜意识星盘
            </span>
            <span style={{ fontSize: '0.69rem', color: 'var(--text-secondary)', opacity: 0.78, marginLeft: '0.45rem' }}>
              群体四维心流数据分布
            </span>
          </div>
        </div>

        <ChevronRight size={14} color="#80f3ff" style={{ flexShrink: 0 }} />
      </button>
    </>
  );
};

