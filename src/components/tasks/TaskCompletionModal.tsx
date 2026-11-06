import { useEffect, useId, useRef } from 'react';
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Send, X } from 'lucide-react';
import type { MediaAttachment, MediaUploadConfig } from '../../types/quizEngine';
import { MediaUploader } from '../MediaUploader';
import type { TaskInfo } from './taskTypes';

const MEDIA_CONFIG: MediaUploadConfig = {
  allowedTypes: ['image', 'audio', 'video', 'document'],
  maxSizeBytes: 30 * 1024 * 1024,
  maxTotalSizeBytes: 30 * 1024 * 1024,
  maxFileCount: 3,
};

interface BadgeDetails {
  label: string;
  color: string;
}

interface CategoryDetails extends BadgeDetails {
  icon: ReactNode;
  border: string;
  textColor: string;
}

interface TaskCompletionModalProps {
  task: TaskInfo;
  text: string;
  attachments: MediaAttachment[];
  error: string | null;
  submitting: boolean;
  abandoning?: boolean;
  level: BadgeDetails;
  category: CategoryDetails;
  onTextChange: (value: string) => void;
  onAttachmentsChange: (attachments: MediaAttachment[]) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
  onAbandon?: () => void;
}

/** Portal-backed task completion form, isolated from the task page router. */
export function TaskCompletionModal({
  task,
  text,
  attachments,
  error,
  submitting,
  abandoning = false,
  level,
  category,
  onTextChange,
  onAttachmentsChange,
  onClose,
  onSubmit,
  onAbandon,
}: TaskCompletionModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();
  const textareaId = useId();

  const hasAudioAttachment = attachments.some((a) => a.type === 'audio');

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    textareaRef.current?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onCloseRef.current();
    };
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.body.style.overflow = previousBodyOverflow;
      previouslyFocused?.focus();
    };
  }, []);

  const keepFocusInsideDialog = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;
    const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusableElements?.length) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10, 4, 15, 0.55)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        overflowY: 'auto',
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-busy={submitting || abandoning}
        tabIndex={-1}
        className="glass-card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: 390,
          padding: '1.25rem',
          border: `1px solid ${level.color}40`,
          background: '#1c0a24',
          boxShadow: '0 15px 40px rgba(0,0,0,0.6)',
          borderRadius: 20,
          position: 'relative',
          margin: 'auto',
        }}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={keepFocusInsideDialog}
      >
        <button
          type="button"
          aria-label="关闭任务提交窗口"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: 4,
          }}
        >
          <X size={18} />
        </button>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.65rem' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.1rem 0.45rem',
            borderRadius: '4px',
            fontSize: '0.62rem',
            fontWeight: 800,
            background: level.color,
            color: '#000',
          }}>
            {level.label}
          </span>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.2rem',
            padding: '0.1rem 0.45rem',
            borderRadius: '4px',
            fontSize: '0.62rem',
            fontWeight: 700,
            background: category.color,
            border: `1px solid ${category.border}`,
            color: category.textColor,
          }}>
            {category.icon}
            {category.label}
          </span>
          {task.requireAudio && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.1rem 0.45rem',
              borderRadius: '4px',
              fontSize: '0.62rem',
              fontWeight: 700,
              background: 'rgba(255, 112, 166, 0.15)',
              border: '1px solid rgba(255, 112, 166, 0.4)',
              color: '#ff70a6',
            }}>
              🎙️ 必录语音成果
            </span>
          )}
        </div>

        <h3 id={titleId} style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem', fontFamily: 'var(--font-heading)', paddingRight: '1.5rem' }}>
          {task.title}
        </h3>
        <p id={descriptionId} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: '0.85rem' }}>
          {task.description}
        </p>

        <form onSubmit={onSubmit} style={{ borderTop: '1px dashed rgba(255, 255, 255, 0.08)', paddingTop: '0.85rem' }}>
          <div style={{ marginBottom: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <label htmlFor={textareaId} style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                {task.requireAudio ? '成果记录（录制语音并写下感受）：' : '成果记录（写下文字，可配合录音/上传）：'}
              </label>
              {task.requireAudio && (
                <span style={{ fontSize: '0.66rem', fontWeight: 700, color: hasAudioAttachment ? '#4fd1a1' : '#ff70a6' }}>
                  {hasAudioAttachment ? '✓ 语音已就绪' : '⚠️ 需录制语音'}
                </span>
              )}
            </div>
            
            <div style={{
              borderRadius: 14,
              background: 'rgba(18, 6, 24, 0.45)',
              border: `1px solid ${level.color}30`,
              padding: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}>
              {/* 录音与媒体控件与文本输入紧密整合，录音置顶最显眼 */}
              <MediaUploader
                config={MEDIA_CONFIG}
                attachments={attachments}
                onChange={onAttachmentsChange}
              />
              
              <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '0.5rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 600 }}>
                  心得 / 想法描述：
                </div>
                <textarea
                  ref={textareaRef}
                  id={textareaId}
                  value={text}
                  onChange={(event) => onTextChange(event.target.value)}
                  placeholder={task.requireAudio ? '在此记录录制时的心理感受、身体反应与具体想法...' : '在此记录具体的成果、真实感受与想法...'}
                  style={{
                    width: '100%',
                    height: 75,
                    padding: '0.4rem 0.5rem',
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8,
                    color: '#fff',
                    fontSize: '0.78rem',
                    fontFamily: 'inherit',
                    resize: 'none',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>

          {error && (
            <div style={{ color: '#ff4d4d', fontSize: '0.7rem', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.4rem', alignItems: 'center' }}>
            {onAbandon && (
              <button
                type="button"
                onClick={onAbandon}
                disabled={submitting || abandoning}
                style={{
                  flex: 1,
                  padding: '0.6rem',
                  fontSize: '0.78rem',
                  borderRadius: 12,
                  fontWeight: 600,
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: 'var(--text-muted)',
                  cursor: (submitting || abandoning) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.3rem',
                }}
                className="hover:text-[#ff4d4d] hover:border-[#ff4d4d]/40"
              >
                {abandoning ? <Loader2 className="animate-spin" size={12} /> : null}
                <span>放弃任务</span>
              </button>
            )}
            <button
              type="submit"
              className="btn-glow"
              style={{
                flex: onAbandon ? 2 : 1,
                padding: '0.6rem',
                fontSize: '0.82rem',
                borderRadius: 12,
                fontWeight: 700,
                background: `linear-gradient(135deg, ${level.color} 0%, #ff3377 100%)`,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: (submitting || abandoning) ? 'not-allowed' : 'pointer',
              }}
              disabled={submitting || abandoning}
            >
              {submitting ? <Loader2 className="animate-spin" size={14} /> : (
                <>
                  <Send size={12} />
                  <span style={{ marginLeft: 4 }}>提交任务</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
