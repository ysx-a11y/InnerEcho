import React, { useEffect, useState, useCallback } from 'react';
import {
  Bookmark,
  CheckCircle,
  Clock,
  Compass,
  Eye,
  Mail,
  RefreshCw,
  User,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Music,
  AlertTriangle,
  Video,
  Crown,
  ListTodo,
} from 'lucide-react';
import { adminApi, formatTime } from '../adminApi';
import type { AdminTaskSummary } from '../adminTypes';
import { SpecialPriceLadder } from './tasks/SpecialPriceLadder';
import { AdminImageLightbox } from './ui/AdminImageLightbox';
import { DictBadge } from './ui/DictBadge';

const PAGE_SIZE = 10;

interface TaskListProps {
  refreshTrigger?: number;
}

export const TaskList: React.FC<TaskListProps> = ({ refreshTrigger }) => {
  const [activeTab, setActiveTab] = useState<'regular' | 'special_ladder'>('regular');
  const [tasks, setTasks] = useState<AdminTaskSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtering states
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Image Zoom State
  const [zoomedImg, setZoomedImg] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.listTasks({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        category: filterCategory !== 'all' ? filterCategory : undefined,
      });
      setTasks(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载任务失败');
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterCategory]);

  useEffect(() => {
    if (activeTab === 'regular') {
      load();
    }
  }, [load, refreshTrigger, activeTab]);

  // Use server-side filtered and paginated tasks directly
  const filteredTasks = tasks;

  const getCategoryDetails = (category: string) => {
    switch (category) {
      case 'dream':
      case 'shadow':
        return { label: '隐秘想法', bg: 'rgba(128, 243, 255, 0.12)', fg: '#80f3ff', icon: <Eye size={12} /> };
      case 'subconscious':
      case 'persona':
      default:
        return { label: '日常记录', bg: 'rgba(255, 112, 166, 0.12)', fg: '#ff70a6', icon: <Compass size={12} /> };
    }
  };

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', boxSizing: 'border-box' }}>
      {/* Sub-tab switcher */}
      <div
        className="glass-card"
        style={{
          display: 'flex',
          gap: '0.4rem',
          padding: '0.35rem',
          background: 'linear-gradient(135deg, rgba(28, 14, 38, 0.75) 0%, rgba(16, 8, 22, 0.85) 100%)',
          border: '1px solid rgba(255, 112, 166, 0.2)',
          borderRadius: 14,
          width: 'fit-content',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('regular')}
          style={{
            padding: '0.45rem 1rem',
            borderRadius: 10,
            fontSize: '0.78rem',
            fontWeight: activeTab === 'regular' ? 800 : 500,
            background: activeTab === 'regular' ? 'linear-gradient(135deg, rgba(255, 112, 166, 0.3), rgba(225, 0, 255, 0.25))' : 'transparent',
            border: `1px solid ${activeTab === 'regular' ? '#ff70a6' : 'transparent'}`,
            color: activeTab === 'regular' ? '#fff' : 'var(--admin-text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.2s ease',
          }}
        >
          <ListTodo size={14} />
          <span>常规任务记录 (日常 / 隐秘)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('special_ladder')}
          style={{
            padding: '0.45rem 1rem',
            borderRadius: 10,
            fontSize: '0.78rem',
            fontWeight: activeTab === 'special_ladder' ? 800 : 500,
            background: activeTab === 'special_ladder' ? 'linear-gradient(135deg, rgba(255, 209, 128, 0.3), rgba(255, 112, 166, 0.25))' : 'transparent',
            border: `1px solid ${activeTab === 'special_ladder' ? '#ffd180' : 'transparent'}`,
            color: activeTab === 'special_ladder' ? '#ffd180' : 'var(--admin-text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.2s ease',
          }}
        >
          <Crown size={14} color="#ffd180" />
          <span>身价天梯榜单与自白</span>
        </button>
      </div>

      {/* Render active subtab */}
      {activeTab === 'special_ladder' ? (
        <SpecialPriceLadder refreshTrigger={refreshTrigger} />
      ) : (
        <>
          {/* 头部面板与过滤器 */}
          <div
            className="glass-card"
            style={{
              background: 'linear-gradient(135deg, rgba(28, 14, 38, 0.75) 0%, rgba(16, 8, 22, 0.85) 100%)',
              border: '1px solid rgba(255, 112, 166, 0.2)',
              borderRadius: 16,
              padding: '1rem 1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.8rem',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#fff' }}>任务成果列表</span>
                <span style={{ fontSize: '0.68rem', color: 'var(--admin-accent)', background: 'rgba(255,112,166,0.12)', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                  共 {total} 条
                </span>
              </div>
              <button
                onClick={() => load()}
                disabled={loading}
                style={{
                  background: 'rgba(255, 112, 166, 0.12)',
                  border: '1px solid rgba(255, 112, 166, 0.3)',
                  borderRadius: '9px',
                  padding: '5px 10px',
                  color: '#ff70a6',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.2s',
                }}
              >
                <RefreshCw size={13} className={loading ? 'spin-rotate' : ''} />
                <span>刷新</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-secondary)', fontWeight: 600 }}>条件筛选：</span>
              <select
                value={filterCategory}
                onChange={(e) => {
                  setFilterCategory(e.target.value);
                  setPage(0);
                }}
                style={{
                  background: 'rgba(12, 6, 16, 0.85)',
                  border: '1px solid rgba(255, 112, 166, 0.25)',
                  borderRadius: '10px',
                  padding: '7px 10px',
                  color: '#fff0f5',
                  fontSize: '0.76rem',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="all">所有分类</option>
                <option value="routine">日常记录 (日常/人设)</option>
                <option value="secret">隐秘想法 (梦境/暗影)</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(0);
                }}
                style={{
                  background: 'rgba(12, 6, 16, 0.85)',
                  border: '1px solid rgba(255, 112, 166, 0.25)',
                  borderRadius: '10px',
                  padding: '7px 10px',
                  color: '#fff0f5',
                  fontSize: '0.76rem',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="all">所有状态</option>
                <option value="accepted">进行中 (已接取)</option>
                <option value="completed">已完成</option>
                <option value="abandoned">已放弃</option>
              </select>
            </div>
          </div>

          {/* 数据加载状态 */}
          {loading && tasks.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', color: '#8d879e', gap: '0.6rem' }}>
              <RefreshCw size={18} className="admin-spin" />
              <span>正在加载任务记录...</span>
            </div>
          ) : error ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', color: '#ff3377', gap: '0.8rem' }}>
              <AlertTriangle size={28} />
              <span>{error}</span>
              <button
                onClick={() => load()}
                style={{
                  background: 'rgba(255,51,119,0.1)',
                  border: '1px solid rgba(255,51,119,0.3)',
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '8px 18px',
                  cursor: 'pointer',
                }}
              >
                重试
              </button>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', color: '#6e677c', fontSize: '0.85rem' }}>
              暂无匹配的用户任务记录
            </div>
          ) : (
            /* 任务记录卡片列表 */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredTasks.map((task) => {
                const cat = getCategoryDetails(task.category);
                const isCompleted = task.status === 'completed';
                const isAbandoned = task.status === 'abandoned';

                return (
                  <div
                    key={task.id}
                    className="glass-card"
                    style={{
                      background: 'linear-gradient(135deg, rgba(28, 14, 38, 0.7) 0%, rgba(16, 8, 22, 0.85) 100%)',
                      border: isCompleted
                        ? '1px solid rgba(128, 243, 255, 0.25)'
                        : isAbandoned
                        ? '1px solid rgba(255, 51, 119, 0.3)'
                        : '1px solid rgba(255, 112, 166, 0.2)',
                      borderRadius: '16px',
                      padding: '1.25rem',
                      boxSizing: 'border-box',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
                      transition: 'border-color 0.2s ease',
                    }}
                  >
                    {/* 卡片头部信息 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.8rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: '0.62rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'rgba(255,255,255,0.05)',
                              color: '#8d879e',
                              fontFamily: 'monospace',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                            }}
                          >
                            {task.id}
                          </span>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              background: cat.bg,
                              color: cat.fg,
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                            }}
                          >
                            {cat.icon}
                            {cat.label}
                          </span>
                          <DictBadge dictCode="task_progress_status" value={task.status} size="xs" />
                        </div>
                        <h4 style={{ fontSize: '1rem', margin: '0.2rem 0 0 0', fontWeight: 700, color: '#fff' }}>
                          {task.title || '无标题任务'}
                        </h4>
                        <p style={{ fontSize: '0.75rem', color: '#8d879e', margin: 0 }}>
                          预设要求: {task.description}
                        </p>
                      </div>

                      {/* 用户信息 */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '0.72rem', color: '#8d879e', gap: '0.2rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#fff', fontWeight: 600 }}>
                          <User size={12} color="#80f3ff" />
                          <span>{task.nickname || '神秘客'}</span>
                        </div>
                        {task.email && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Mail size={12} />
                            <span>{task.email}</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.64rem', color: '#6e677c' }}>
                          <Clock size={11} />
                          <span>接取: {formatTime(task.acceptedAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* 成果区 (已完成展示) */}
                    {isCompleted ? (
                      <div
                        style={{
                          background: 'rgba(255, 255, 255, 0.015)',
                          border: '1px solid rgba(255, 255, 255, 0.04)',
                          borderRadius: '12px',
                          padding: '1rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.8rem',
                        }}
                      >
                        <span style={{ fontSize: '0.7rem', color: '#4fd1a1', fontWeight: 700, display: 'block' }}>
                          ✍️ 用户提交成果自白
                        </span>
                        <p
                          style={{
                            fontSize: '0.82rem',
                            color: '#e5e9f0',
                            margin: 0,
                            lineHeight: 1.5,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                            maxWidth: '100%',
                            boxSizing: 'border-box',
                          }}
                        >
                          {task.textContent || '（未提交文字描述）'}
                        </p>

                        {/* 成果附件 */}
                        {task.attachments && task.attachments.length > 0 && (
                          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.04)', paddingTop: '0.8rem', marginTop: '0.2rem' }}>
                            <span style={{ fontSize: '0.68rem', color: '#8d879e', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                              📎 附件成果 ({task.attachments.length} 个)
                            </span>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem' }}>
                              {task.attachments.map((att: any, idx: number) => {
                                if (att.type === 'image' || att.dataUrl?.startsWith('data:image')) {
                                  return (
                                    <div key={att.id || idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                      <img
                                        src={att.dataUrl}
                                        alt="成果图片"
                                        onClick={() => setZoomedImg(att.dataUrl)}
                                        className="admin-zoomable-img"
                                        style={{ width: 120, height: 120, borderRadius: 8, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)', cursor: 'zoom-in' }}
                                      />
                                      <span style={{ fontSize: '0.58rem', color: '#6e677c', textAlign: 'center', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.1rem' }}>
                                        <ImageIcon size={10} /> 图片成果
                                      </span>
                                    </div>
                                  );
                                } else if (att.type === 'audio' || att.dataUrl?.startsWith('data:audio') || att.type?.startsWith('audio/')) {
                                  return (
                                    <div key={att.id || idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '0.5rem 0.8rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: '220px' }}>
                                      <span style={{ fontSize: '0.64rem', color: '#8d879e', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                        <Music size={11} color="#ff70a6" />
                                        录音成果 ({att.durationSeconds ? `${Math.round(att.durationSeconds)}s` : '音频'})
                                      </span>
                                      <audio
                                        src={att.dataUrl}
                                        controls
                                        style={{
                                          height: '28px',
                                          width: '100%',
                                          outline: 'none',
                                        }}
                                        onError={() => setMediaError('音频加载失败：录音格式可能不被当前浏览器支持。')}
                                      />
                                      {mediaError && (
                                        <span style={{ fontSize: '0.6rem', color: '#ff4d4d' }}>
                                          {mediaError}
                                        </span>
                                      )}
                                    </div>
                                  );
                                } else if (att.type === 'video' || att.dataUrl?.startsWith('data:video') || att.type?.startsWith('video/')) {
                                  return (
                                    <div key={att.id || idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '0.5rem 0.8rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: '220px', maxWidth: '320px' }}>
                                      <span style={{ fontSize: '0.64rem', color: '#8d879e', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                        <Video size={11} color="#80f3ff" />
                                        视频成果
                                      </span>
                                      <video
                                        src={att.dataUrl}
                                        controls
                                        style={{
                                          width: '100%',
                                          maxHeight: '180px',
                                          objectFit: 'contain',
                                          borderRadius: '6px',
                                          outline: 'none',
                                        }}
                                      />
                                    </div>
                                  );
                                }
                                return (
                                  <div key={idx} style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.04)', borderRadius: '6px', fontSize: '0.64rem', color: '#8d879e' }}>
                                    未知附件类型 ({att.type || 'unknown'})
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {task.completedAt && (
                          <div style={{ fontSize: '0.64rem', color: '#6e677c', textAlign: 'right', marginTop: '0.4rem' }}>
                            完成于: {formatTime(task.completedAt)}
                          </div>
                        )}
                      </div>
                    ) : isAbandoned ? (
                      <div
                        style={{
                          background: 'rgba(255, 77, 77, 0.04)',
                          border: '1px dashed rgba(255, 77, 77, 0.25)',
                          borderRadius: '12px',
                          padding: '1rem',
                          color: '#ff8a8a',
                          fontSize: '0.78rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        <AlertTriangle size={14} color="#ff4d4d" />
                        <span>用户已放弃该任务（未提交自白成果）</span>
                      </div>
                    ) : (
                      <div
                        style={{
                          background: 'rgba(255, 255, 255, 0.01)',
                          border: '1px dashed rgba(255, 255, 255, 0.08)',
                          borderRadius: '12px',
                          padding: '1rem',
                          color: '#6e677c',
                          fontSize: '0.78rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                        }}
                      >
                        <Clock size={14} />
                        <span>该任务目前已被用户接取，正在撰写自白成果中...</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 分页控制 */}
          {total > PAGE_SIZE && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', fontSize: '0.8rem', color: '#8d879e', marginTop: '0.5rem' }}>
              <button
                disabled={page <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  color: page <= 0 ? '#4a4458' : '#fff',
                  cursor: page <= 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                }}
              >
                <ChevronLeft size={14} />
                上一页
              </button>
              <span>{page + 1} / {pageCount}（共 {total} 条记录）</span>
              <button
                disabled={page + 1 >= pageCount}
                onClick={() => setPage((p) => p + 1)}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  color: page + 1 >= pageCount ? '#4a4458' : '#fff',
                  cursor: page + 1 >= pageCount ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                }}
              >
                下一页
                <ChevronRight size={14} />
              </button>
            </div>
          )}

          {/* 图片放大 Modal */}
          <AdminImageLightbox imageUrl={zoomedImg} onClose={() => setZoomedImg(null)} />
        </>
      )}
    </div>
  );
};
