import React from 'react';
import { ChevronLeft, Compass, Eye, FileText, Loader2 } from 'lucide-react';
import type { TaskCategory } from './taskTypes';

interface PublishTaskPageProps {
  title: string;
  description: string;
  category: TaskCategory;
  error: string | null;
  loading: boolean;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCategoryChange: (value: TaskCategory) => void;
  onSubmit: (event: React.FormEvent) => void;
  onBack: () => void;
}

export const PublishTaskPage: React.FC<PublishTaskPageProps> = ({
  title: publishTitle,
  description: publishDesc,
  category: publishCategory,
  error: publishError,
  loading: publishLoading,
  onTitleChange: setPublishTitle,
  onDescriptionChange: setPublishDesc,
  onCategoryChange: setPublishCategory,
  onSubmit: handleCreateCustomTask,
  onBack,
}) => (
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
                padding: 0
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
              border: '1px solid rgba(255, 112, 166, 0.25)',
              background: '#1c0a24',
              borderRadius: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}>
              <FileText size={18} color="#ff70a6" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0, fontFamily: 'var(--font-heading)' }} className="text-gradient">
                发布新任务
              </h3>
            </div>

            <form onSubmit={handleCreateCustomTask}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.45rem' }}>
                  任务分类：
                </label>

                {/* Modern Pill Grid Selector */}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.35rem' }}>
                  {[
                    { value: 'subconscious', label: '日常记录', icon: <Compass size={14} />, activeColor: '#ff70a6', activeBg: 'rgba(255, 112, 166, 0.08)' },
                    { value: 'dream', label: '隐秘想法', icon: <Eye size={14} />, activeColor: '#80f3ff', activeBg: 'rgba(128, 243, 255, 0.08)' }
                  ].map(item => {
                    const isActive = publishCategory === item.value;
                    return (
                      <button
                        type="button"
                        key={item.value}
                        onClick={() => setPublishCategory(item.value as TaskCategory)}
                        style={{
                          flex: 1,
                          padding: '0.65rem 0.5rem',
                          borderRadius: 12,
                          background: isActive ? item.activeBg : 'rgba(255, 255, 255, 0.01)',
                          border: isActive ? `1px solid ${item.activeColor}` : '1px solid rgba(255, 255, 255, 0.08)',
                          color: isActive ? item.activeColor : 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                          cursor: 'pointer',
                          fontSize: '0.76rem',
                          fontWeight: isActive ? 800 : 500,
                          transition: 'all 0.2s',
                          outline: 'none',
                          boxShadow: isActive ? `0 0 10px ${item.activeColor}15` : 'none'
                        }}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
                  任务标题：
                </label>
                <input
                  type="text"
                  value={publishTitle}
                  onChange={(e) => setPublishTitle(e.target.value)}
                  placeholder="例如：自我情绪观察日记"
                  maxLength={100}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.65rem',
                    borderRadius: 10,
                    background: 'rgba(18, 6, 24, 0.4)',
                    border: '1px solid rgba(255, 112, 166, 0.25)',
                    color: '#fff',
                    fontSize: '0.78rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
                  任务描述：
                </label>
                <textarea
                  value={publishDesc}
                  onChange={(e) => setPublishDesc(e.target.value)}
                  placeholder="请输入该任务的具体细节与内容要求..."
                  maxLength={1000}
                  style={{
                    width: '100%',
                    height: 100,
                    padding: '0.6rem 0.7rem',
                    borderRadius: 12,
                    background: 'rgba(18, 6, 24, 0.4)',
                    border: '1px solid rgba(255, 112, 166, 0.25)',
                    color: '#fff',
                    fontSize: '0.78rem',
                    fontFamily: 'inherit',
                    resize: 'none',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {publishError && (
                <div style={{ color: '#ff4d4d', fontSize: '0.72rem', marginBottom: '0.85rem' }}>
                  ⚠️ {publishError}
                </div>
              )}

              <button
                type="submit"
                className="btn-glow"
                style={{
                  width: '100%',
                  padding: '0.65rem',
                  fontSize: '0.85rem',
                  borderRadius: 12,
                  fontWeight: 700,
                }}
                disabled={publishLoading}
              >
                {publishLoading ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : (
                  <span>发布任务并加入列表</span>
                )}
              </button>
            </form>
          </div>
        </div>
);
