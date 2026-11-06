import React from 'react';
import { ChevronLeft, Loader2 } from 'lucide-react';
import type { TaskInfo } from './taskTypes';

interface TaskPreviewSubpageProps {
  task: TaskInfo;
  onBack: () => void;
  onAccept: (taskId: string) => void;
  acceptingId: string | null;
  levelDetails: { label: string; color: string };
  categoryDetails: { label: string; icon: React.ReactNode; color: string; border: string; textColor: string };
}

export const TaskPreviewSubpage: React.FC<TaskPreviewSubpageProps> = ({
  task,
  onBack,
  onAccept,
  acceptingId,
  levelDetails,
  categoryDetails,
}) => {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
        <button
          onClick={onBack}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            fontSize: '0.8rem',
            padding: 0,
          }}
        >
          <ChevronLeft size={16} />
          <span>返回任务清单</span>
        </button>
      </div>

      <div
        className="glass-card"
        style={{
          padding: '1.25rem',
          border: `1px solid ${levelDetails.color}40`,
          background: '#1c0a24',
          borderRadius: 20,
        }}
      >
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.1rem 0.45rem',
              borderRadius: '4px',
              fontSize: '0.62rem',
              fontWeight: 800,
              background: levelDetails.color,
              color: '#000',
            }}
          >
            {levelDetails.label}
          </span>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.2rem',
              padding: '0.1rem 0.45rem',
              borderRadius: '4px',
              fontSize: '0.62rem',
              fontWeight: 700,
              background: categoryDetails.color,
              border: `1px solid ${categoryDetails.border}`,
              color: categoryDetails.textColor,
            }}
          >
            {categoryDetails.icon}
            {categoryDetails.label}
          </span>
        </div>

        <h3
          style={{
            fontSize: '1.15rem',
            fontWeight: 800,
            color: '#fff',
            marginBottom: '0.65rem',
            fontFamily: 'var(--font-heading)',
          }}
        >
          {task.title}
        </h3>

        <p
          style={{
            fontSize: '0.82rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            marginBottom: '1.75rem',
          }}
        >
          {task.description}
        </p>

        <button
          onClick={() => onAccept(task.id)}
          className="btn-glow"
          style={{
            width: '100%',
            padding: '0.65rem',
            fontSize: '0.85rem',
            borderRadius: 12,
            fontWeight: 700,
            background: `linear-gradient(135deg, ${levelDetails.color} 0%, #ff3377 100%)`,
          }}
          disabled={acceptingId !== null}
        >
          {acceptingId === task.id ? (
            <Loader2 className="animate-spin" size={14} />
          ) : (
            <span>确认接取该任务</span>
          )}
        </button>
      </div>
    </div>
  );
};
