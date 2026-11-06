import React from 'react';
import { Compass, Library, ListTodo, User } from 'lucide-react';

export type BottomTab = 'home' | 'banks' | 'tasks' | 'personal';

interface BottomNavProps {
  activeTab: BottomTab;
  onTabChange: (tab: BottomTab) => void;
}

const TABS: { id: BottomTab; label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number; stroke?: string; className?: string; color?: string }> }[] = [
  { id: 'home', label: '首页', icon: Compass },
  { id: 'banks', label: '题库', icon: Library },
  { id: 'tasks', label: '任务', icon: ListTodo },
  { id: 'personal', label: '个人', icon: User },
];

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <div
      role="tablist"
      aria-label="底栏导航"
      style={{
        position: 'fixed',
        bottom: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 24px)',
        maxWidth: 460,
        height: 54,
        borderRadius: 18,
        background: 'rgba(18, 6, 24, 0.55)',
        backdropFilter: 'blur(24px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 40,
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 112, 166, 0.04)',
      }}
    >
      {TABS.map((tab) => {
        const IconComp = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            role="tab"
            aria-selected={isActive}
            style={{
              flex: 1,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: isActive ? '#ff70a6' : 'rgba(255, 255, 255, 0.35)',
              transition: 'color 0.25s ease, transform 0.15s ease',
              position: 'relative',
            }}
          >
            <IconComp
              size={19}
              strokeWidth={isActive ? 1.75 : 1.5}
              stroke={isActive ? 'url(#rose-magenta-gradient)' : 'rgba(255, 255, 255, 0.45)'}
              className={`bottom-nav-icon ${isActive ? 'icon-glow-rose' : ''}`}
            />
            <span style={{ fontSize: '0.62rem', fontWeight: isActive ? 600 : 400, letterSpacing: '0.02em' }}>
              {tab.label}
            </span>
            {isActive && (
              <span
                style={{
                  position: 'absolute',
                  bottom: 3,
                  width: 18,
                  height: 2,
                  borderRadius: 1,
                  background: '#ff70a6',
                  boxShadow: '0 0 8px rgba(255, 112, 166, 0.8)',
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
