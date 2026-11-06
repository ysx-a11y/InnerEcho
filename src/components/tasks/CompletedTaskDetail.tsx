import React from 'react';
import { ChevronLeft, Pause, Play, Video } from 'lucide-react';
import type { CompletedTask, TaskCategory, TaskInfo } from './taskTypes';

interface CategoryDetails {
  icon: React.ReactNode;
  label: string;
  color: string;
  border: string;
  textColor: string;
}

interface CompletedTaskDetailProps {
  record: CompletedTask;
  task: TaskInfo | null;
  playingAudioId: string | null;
  onPlayAudio: (attachmentId: string, dataUrl: string) => void;
  onBack: () => void;
  getTaskLevelDetails: (taskId: string) => { level: number; label: string; color: string };
  getCategoryDetails: (category: TaskCategory) => CategoryDetails;
  formatDate: (isoString: string) => string;
}

export const CompletedTaskDetail: React.FC<CompletedTaskDetailProps> = ({
  record: selectedRecord,
  task: selectedTask,
  playingAudioId,
  onPlayAudio: handlePlayAudio,
  onBack,
  getTaskLevelDetails,
  getCategoryDetails,
  formatDate,
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
              <span>返回</span>
            </button>
          </div>

          <div
            className="glass-card"
            style={{
              padding: '1.25rem',
              background: '#1c0a24',
              borderRadius: 20,
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}
          >
            {selectedTask && (
              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.1rem 0.45rem',
                  borderRadius: '4px',
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  background: getTaskLevelDetails(selectedTask.id).color,
                  color: '#000',
                }}>
                  {getTaskLevelDetails(selectedTask.id).label}
                </span>

                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  padding: '0.1rem 0.45rem',
                  borderRadius: '4px',
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  background: getCategoryDetails(selectedTask.category).color,
                  border: `1px solid ${getCategoryDetails(selectedTask.category).border}`,
                  color: getCategoryDetails(selectedTask.category).textColor,
                }}>
                  {getCategoryDetails(selectedTask.category).icon}
                  {getCategoryDetails(selectedTask.category).label}
                </span>
              </div>
            )}

            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', marginBottom: '0.65rem', fontFamily: 'var(--font-heading)' }}>
              {selectedRecord.title}
            </h3>

            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '0.85rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem' }}>
              已完成成果归档记录：
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {selectedRecord.textContent && (
                <div style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                  background: 'rgba(0, 0, 0, 0.25)',
                  padding: '0.75rem 0.85rem',
                  borderRadius: 12,
                  whiteSpace: 'pre-wrap',
                  border: '1px solid rgba(255, 255, 255, 0.03)'
                }}>
                  {selectedRecord.textContent}
                </div>
              )}

              {selectedRecord.attachments && selectedRecord.attachments.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.2rem' }}>
                  {selectedRecord.attachments.map((file) => (
                    <div
                      key={file.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: 8,
                        padding: '0.35rem 0.5rem',
                      }}
                    >
                      {file.type === 'image' && (
                        <img
                          src={file.dataUrl}
                          alt={file.name}
                          style={{ width: 34, height: 34, objectFit: 'cover', borderRadius: 4, cursor: 'pointer' }}
                          onClick={() => {
                            const w = window.open();
                            if (w) w.document.write(`<img src="${file.dataUrl}" style="max-width:100%; max-height:100dvh; display:block; margin:auto;" />`);
                          }}
                        />
                      )}

                      {file.type === 'audio' && (
                        <button
                          onClick={() => handlePlayAudio(file.id, file.dataUrl)}
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: 'rgba(255, 112, 166, 0.12)',
                            border: '1px solid rgba(255, 112, 166, 0.25)',
                            color: '#ff70a6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0
                          }}
                        >
                          {playingAudioId === file.id ? <Pause size={10} /> : <Play size={10} style={{ marginLeft: 1 }} />}
                        </button>
                      )}

                      {file.type === 'video' && (
                        <button
                          onClick={() => {
                            const w = window.open();
                            if (w) {
                              w.document.write(`
                                <html>
                                  <head>
                                    <title>视频成果预览 - 镜界自白</title>
                                    <style>body{margin:0;background:#000;display:flex;align-items:center;justify-content:center;height:100vh;}video{max-width:100%;max-height:100vh;outline:none;}</style>
                                  </head>
                                  <body>
                                    <video src="${file.dataUrl}" controls autoplay></video>
                                  </body>
                                </html>
                              `);
                            }
                          }}
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: 'rgba(128, 243, 255, 0.12)',
                            border: '1px solid rgba(128, 243, 255, 0.25)',
                            color: '#80f3ff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0
                          }}
                          title="点击预览视频"
                        >
                          <Video size={10} />
                        </button>
                      )}

                      <div style={{ overflow: 'hidden', flex: 1 }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {file.name}
                        </div>
                        <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>
                          {(file.sizeBytes / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: '0.2rem' }}>
                完成时间： {formatDate(selectedRecord.completedAt)}
              </div>
            </div>
          </div>
        </div>
);
