import React, { useState } from 'react';
import { 
  Loader2, 
  Compass, 
  Eye, 
  Plus,
  Bookmark,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import type { MediaAttachment } from '../types/quizEngine';
import { useTasksData } from '../hooks/useTasksData';
import { useSpecialPriceTask } from '../hooks/useSpecialPriceTask';
import type { CompletedTask, TaskCategory, TaskInfo } from './tasks/taskTypes';
import { TaskCompletionModal } from './tasks/TaskCompletionModal';
import { SpecialPriceTaskCard } from './tasks/SpecialPriceTaskCard';
import { SpecialPriceTaskModal } from './tasks/SpecialPriceTaskModal';
import { SpecialPriceLeaderboardModal } from './tasks/SpecialPriceLeaderboardModal';
import { CompletedTaskDetail } from './tasks/CompletedTaskDetail';
import { PublishTaskPage } from './tasks/PublishTaskPage';
import { TaskPreviewSubpage } from './tasks/TaskPreviewSubpage';

interface TasksViewProps {
  user?: { id: string; email: string } | null;
  onLoginClick: () => void;
  onSessionExpired: () => void;
}

export const TasksView: React.FC<TasksViewProps> = ({ user, onLoginClick, onSessionExpired }) => {
  const {
    tasks,
    completedCount,
    totalAcceptedCount,
    completedHistory,
    status: tasksStatus,
    error: tasksError,
    acceptingId,
    submittingId,
    abandoningId,
    publishing: publishLoading,
    fetchTasks,
    acceptTask,
    abandonTask,
    completeTask,
    createTask,
  } = useTasksData({ user, onSessionExpired });

  const [formError, setFormError] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  // Special price task hook & modal (身价自评)
  const {
    evaluation: specialEvaluation,
    countdown: specialCountdown,
    canEdit: specialCanEdit,
    submitting: specialSubmitting,
    submitEvaluation: submitSpecialEvaluation,
    leaderboard,
    myLeaderboardStatus,
    leaderboardLoading,
    leaderboardError,
    fetchLeaderboard,
    vote: voteSpecialEvaluation,
  } = useSpecialPriceTask('price_tag');
  const [isSpecialModalOpen, setIsSpecialModalOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);

  // Special betrothal gift task hook & modal (彩礼与伴侣自白)
  const {
    evaluation: betrothalEvaluation,
    countdown: betrothalCountdown,
    canEdit: betrothalCanEdit,
    submitting: betrothalSubmitting,
    submitEvaluation: submitBetrothalEvaluation,
    leaderboard: betrothalLeaderboard,
    myLeaderboardStatus: betrothalMyLeaderboardStatus,
    leaderboardLoading: betrothalLeaderboardLoading,
    leaderboardError: betrothalLeaderboardError,
    fetchLeaderboard: fetchBetrothalLeaderboard,
    vote: voteBetrothalEvaluation,
  } = useSpecialPriceTask('betrothal_gift');
  const [isBetrothalModalOpen, setIsBetrothalModalOpen] = useState(false);
  const [isBetrothalLeaderboardOpen, setIsBetrothalLeaderboardOpen] = useState(false);

  // Sub-page navigation router (detail pages & lists)
  // 'list' | 'accepted_list' | 'completed_list' | 'publish' | 'task_preview' | 'completed_detail'
  const [subPage, setSubPage] = useState<'list' | 'accepted_list' | 'completed_list' | 'publish' | 'task_preview' | 'completed_detail'>('list');
  const [selectedTask, setSelectedTask] = useState<TaskInfo | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<CompletedTask | null>(null);
  
  // Task completion Modal state (instead of independent page)
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);

  // Track back target
  const [backTarget, setBackTarget] = useState<'list' | 'accepted_list' | 'completed_list'>('list');

  // Publish Task form state
  const [publishTitle, setPublishTitle] = useState('');
  const [publishDesc, setPublishDesc] = useState('');
  const [publishCategory, setPublishCategory] = useState<TaskCategory>('subconscious');

  // Completion Form state (inside completion modal)
  const [formText, setFormText] = useState('');
  const [formAttachments, setFormAttachments] = useState<MediaAttachment[]>([]);

  // Audio Playback state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioRef] = useState<{ current: HTMLAudioElement | null }>({ current: null });

  // Handle Accept Task
  const handleAcceptTask = async (taskId: string) => {
    if (!user) {
      onLoginClick();
      return;
    }

    // Check if user has already accepted 2 tasks
    const activeTasksCount = tasks.filter(t => t.status === 'accepted').length;
    if (activeTasksCount >= 2) {
      setFormError('同时最多只能接取两个任务，请先完成已有任务。');
      return;
    }

    const targetTask = tasks.find(t => t.id === taskId) || selectedTask;
    const result = await acceptTask(taskId);
    if (!result.ok) {
      setFormError(result.message || '接取任务失败');
      return;
    }

    // 接取任务后直接进入任务界面（打开任务作答/提交模态框）
    if (targetTask) {
      setSelectedTask({ ...targetTask, status: 'accepted' });
      setBackTarget('list');
      setFormText('');
      setFormAttachments([]);
      setFormError(null);
      setIsCompletionModalOpen(true);
      setSubPage('list');
    } else {
      setSubPage('accepted_list');
      setSelectedTask(null);
    }
  };

  // Handle Abandon Task
  const handleAbandonTask = async (taskId: string) => {
    if (!user) return;
    const result = await abandonTask(taskId);
    if (!result.ok) {
      setFormError(result.message || '放弃任务失败');
      return;
    }
    setIsCompletionModalOpen(false);
    setSelectedTask(null);
  };

  // Handle Complete Task
  const handleCompleteTask = async (e: React.FormEvent, taskId: string) => {
    e.preventDefault();
    if (!user) return;

    // Enforce audio requirement if task specifies requireAudio
    if (selectedTask?.requireAudio) {
      const hasAudio = formAttachments.some((a) => a.type === 'audio');
      if (!hasAudio) {
        setFormError('该任务要求必须录制并上传语音音频成果');
        return;
      }
    }

    // Enforce substantial content
    if (!formText.trim()) {
      setFormError('必须填写任务文字成果内容以提交');
      return;
    }

    setFormError(null);
    const result = await completeTask(taskId, formText, formAttachments);
    if (!result.ok) {
      setFormError(result.message || '完成任务失败');
      return;
    }
    setFormText('');
    setFormAttachments([]);
    setIsCompletionModalOpen(false);
    setSubPage('completed_list');
    setSelectedTask(null);
  };

  // Handle Create Custom Task
  const handleCreateCustomTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onLoginClick();
      return;
    }

    if (!publishTitle.trim() || !publishDesc.trim()) {
      setPublishError('请完整填写标题与描述');
      return;
    }

    setPublishError(null);
    const result = await createTask(publishTitle, publishDesc, publishCategory);
    if (!result.ok) {
      setPublishError(result.message || '发布任务失败');
      return;
    }
    setPublishTitle('');
    setPublishDesc('');
    setPublishCategory('subconscious');
    setSubPage('list');
  };

  // Audio Playback helper
  const handlePlayAudio = (attachmentId: string, dataUrl: string) => {
    if (playingAudioId === attachmentId) {
      audioRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      audioRef.current?.pause();
      const audio = new Audio(dataUrl);
      audioRef.current = audio;
      audio.play();
      setPlayingAudioId(attachmentId);
      audio.onended = () => setPlayingAudioId(null);
    }
  };

  // Level mapper
  const getTaskLevelDetails = (taskId: string) => {
    if (taskId.includes('subconscious') || taskId.includes('persona') || taskId.includes('daily')) {
      return {
        level: 1,
        label: 'L1 · 日常记录',
        color: '#ff70a6',
      };
    }
    return {
      level: 2,
      label: 'L2 · 隐秘想法',
      color: '#80f3ff',
    };
  };

  // Category Details Mapper (统一收敛为「日常记录」与「隐秘想法」两类)
  const getCategoryDetails = (category: 'subconscious' | 'dream' | 'shadow' | 'persona') => {
    switch (category) {
      case 'subconscious':
      case 'persona':
      default:
        return {
          icon: <Compass size={12} stroke="url(#rose-magenta-gradient)" />,
          label: '日常记录',
          color: 'rgba(255, 112, 166, 0.05)',
          border: 'rgba(255, 112, 166, 0.15)',
          textColor: '#ff70a6',
        };
      case 'dream':
      case 'shadow':
        return {
          icon: <Eye size={12} stroke="url(#cyan-blue-gradient)" />,
          label: '隐秘想法',
          color: 'rgba(128, 243, 255, 0.05)',
          border: 'rgba(128, 243, 255, 0.15)',
          textColor: '#80f3ff',
        };
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    } catch {
      return isoStr;
    }
  };

  const activeTasks = tasks.filter((t) => t.status === 'accepted');

  return (
    <div 
      style={{ 
        maxWidth: 440, 
        margin: '0 auto', 
        padding: '0.75rem 0.75rem 2.5rem',
        boxSizing: 'border-box',
        wordBreak: 'break-word',
        overflowWrap: 'break-word'
      }}
      className="animate-fade-in"
    >
      {tasksStatus === 'error' && tasks.length > 0 && (
        <div style={{
          padding: '0.5rem 0.85rem',
          borderRadius: 12,
          background: 'rgba(251, 146, 60, 0.1)',
          border: '1px solid rgba(251, 146, 60, 0.25)',
          color: '#fed7aa',
          fontSize: '0.74rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '0.75rem',
        }}>
          <span>{tasksError || '最新任务刷新失败，已显示缓存记录'}</span>
          <button
            type="button"
            onClick={() => { void fetchTasks(); }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fb923c',
              fontSize: '0.74rem',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            重试
          </button>
        </div>
      )}
      
      {/* ===================== SUB-PAGE 1: MAIN LIST ===================== */}
      {subPage === 'list' && (
        <>
          {/* Header Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', padding: '0 0.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0, fontFamily: 'var(--font-heading)' }} className="text-gradient">
                我的任务清单
              </h2>
            </div>
            
            <button
              onClick={() => {
                if (!user) {
                  onLoginClick();
                  return;
                }
                setPublishTitle('');
                setPublishDesc('');
                setPublishCategory('subconscious');
                setPublishError(null);
                setSubPage('publish');
              }}
              className="btn-secondary"
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.74rem',
                borderRadius: 14,
                gap: '0.2rem'
              }}
            >
              <Plus size={12} />
              <span>发布新任务</span>
            </button>
          </div>

          {/* Top Dashboard Metrics */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.85rem' }}>
            {/* 1. 已接取 */}
            <button
              onClick={() => setSubPage('accepted_list')}
              className="portal-base-card"
              style={{
                flex: 1,
                padding: '0.58rem 0.5rem',
                borderRadius: 14,
                textAlign: 'center',
                background: 'linear-gradient(135deg, rgba(255, 112, 166, 0.12) 0%, rgba(18, 6, 24, 0.78) 100%)',
                border: '1px solid rgba(255, 112, 166, 0.32)',
                cursor: 'pointer',
                outline: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.12rem',
              }}
            >
              <span style={{ fontSize: '0.64rem', color: '#ff70a6', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                <span>已接取</span>
                <ChevronRight size={11} />
              </span>
              <span style={{ fontSize: '1.02rem', fontWeight: 800, color: '#fff' }}>
                {activeTasks.length} / 2
              </span>
            </button>

            {/* 2. 接取次数 */}
            <div
              className="portal-base-card"
              style={{
                flex: 1,
                padding: '0.58rem 0.5rem',
                borderRadius: 14,
                textAlign: 'center',
                background: 'rgba(18, 6, 24, 0.68)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.12rem',
              }}
            >
              <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                接取次数
              </span>
              <span style={{ fontSize: '1.02rem', fontWeight: 800, color: 'var(--text-secondary)' }}>
                {totalAcceptedCount} 次
              </span>
            </div>

            {/* 3. 已完成 */}
            <button
              onClick={() => setSubPage('completed_list')}
              className="portal-base-card"
              style={{
                flex: 1,
                padding: '0.58rem 0.5rem',
                borderRadius: 14,
                textAlign: 'center',
                background: 'linear-gradient(135deg, rgba(192, 132, 252, 0.12) 0%, rgba(18, 6, 24, 0.78) 100%)',
                border: '1px solid rgba(192, 132, 252, 0.34)',
                cursor: 'pointer',
                outline: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.12rem',
              }}
            >
              <span style={{ fontSize: '0.64rem', color: '#c084fc', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                <span>已完成</span>
                <ChevronRight size={11} />
              </span>
              <span style={{ fontSize: '1.02rem', fontWeight: 800, color: '#fff' }}>
                {completedCount} 次
              </span>
            </button>
          </div>

          {/* Special Ranking Tasks (Pinned at Top) */}
          <SpecialPriceTaskCard
            evaluation={specialEvaluation}
            countdown={specialCountdown}
            canEdit={specialCanEdit}
            onClick={() => {
              if (!user) {
                onLoginClick();
                return;
              }
              setIsSpecialModalOpen(true);
            }}
            onOpenLeaderboard={() => {
              setIsLeaderboardOpen(true);
              void fetchLeaderboard();
            }}
          />

          <SpecialPriceTaskCard
            evaluation={betrothalEvaluation}
            countdown={betrothalCountdown}
            canEdit={betrothalCanEdit}
            title="你的彩礼是多少，你觉得你的老公是什么"
            defaultDescription="撕开婚姻与温情面具，为你的彩礼明码标价，写下对伴侣最真实的隐秘定义"
            badgeText="SPECIAL · 仪式级特殊排位"
            pricePrefix="我的彩礼"
            evalPrefix="伴侣自白"
            leaderboardButtonText="查看 Top 10 彩礼自白榜"
            submitButtonText="自评"
            onClick={() => {
              if (!user) {
                onLoginClick();
                return;
              }
              setIsBetrothalModalOpen(true);
            }}
            onOpenLeaderboard={() => {
              setIsBetrothalLeaderboardOpen(true);
              void fetchBetrothalLeaderboard();
            }}
          />

          {/* List Section Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.65rem', padding: '0 0.2rem' }}>
            <Bookmark size={13} color="#ffd180" />
            <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-secondary)', margin: 0, fontFamily: 'var(--font-heading)' }}>
              全部回响任务
            </h4>
          </div>

          {/* List all tasks */}
          {tasksStatus === 'loading' && tasks.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '15dvh', color: '#ff70a6', gap: '0.5rem' }}>
              <Loader2 className="animate-spin" size={16} />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>加载中...</span>
            </div>
          ) : tasksStatus === 'error' && tasks.length === 0 ? (
            <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', boxSizing: 'border-box' }}>
              <div style={{ color: '#ef4444', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
                {tasksError || '任务列表加载失败'}
              </div>
              <button
                onClick={() => { void fetchTasks(); }}
                className="btn-secondary"
                style={{ padding: '0.4rem 1.2rem', fontSize: '0.78rem', borderRadius: 14 }}
              >
                点击重试
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {tasksStatus === 'refreshing' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.5rem', color: '#ff70a6', fontSize: '0.72rem' }}>
                  <Loader2 className="animate-spin" size={12} />
                  <span>正在刷新...</span>
                </div>
              )}
              {tasks.length === 0 ? (
                <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  暂无可用任务
                </div>
              ) : (
                tasks.map((task) => {
                  const cat = getCategoryDetails(task.category);
                  const lvl = getTaskLevelDetails(task.id);
                  
                  const handleTaskCardClick = () => {
                    setSelectedTask(task);
                    setBackTarget('list');
                    if (task.status === 'accepted') {
                      setFormText('');
                      setFormAttachments([]);
                      setFormError(null);
                      setIsCompletionModalOpen(true); // Open Modal popup!
                    } else if (task.status === 'completed') {
                      const record = completedHistory.find(ch => ch.taskId === task.id);
                      setSelectedRecord(record || null);
                      setSubPage('completed_detail');
                    } else {
                      setSubPage('task_preview');
                    }
                  };

                  let statusText = '可接取';
                  let statusColor = 'rgba(255,255,255,0.4)';
                  if (task.status === 'accepted') {
                    statusText = '进行中';
                    statusColor = '#ffd180';
                  } else if (task.status === 'completed') {
                    statusText = '已完成';
                    statusColor = '#ff70a6';
                  }

                  return (
                    <div
                      key={task.id}
                      onClick={handleTaskCardClick}
                      className="glass-card portal-base-card"
                      style={{
                        padding: '0.78rem 0.95rem',
                        borderRadius: 16,
                        borderLeft: `3.5px solid ${lvl.color}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0.06rem 0.42rem', borderRadius: 6, fontSize: '0.6rem', fontWeight: 700, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: statusColor }}>
                            {statusText}
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0.06rem 0.42rem', borderRadius: 6, fontSize: '0.6rem', fontWeight: 700, background: `${lvl.color}20`, border: `1px solid ${lvl.color}48`, color: lvl.color }}>
                            {lvl.label}
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.15rem', padding: '0.06rem 0.42rem', borderRadius: 6, fontSize: '0.6rem', fontWeight: 700, background: cat.color, border: `1px solid ${cat.border}`, color: cat.textColor }}>
                            {cat.icon}
                            {cat.label}
                          </span>
                        </div>
                        <h4 style={{ fontSize: '0.86rem', fontWeight: 800, color: '#fff', margin: 0, fontFamily: 'var(--font-heading)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {task.title}
                        </h4>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.35, margin: '0.16rem 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {task.description}
                        </p>
                      </div>
                      <ChevronRight size={15} color="rgba(255,255,255,0.35)" style={{ flexShrink: 0 }} />
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}

      {/* ===================== SUB-PAGE 2: ACCEPTED TASKS LIST ===================== */}
      {subPage === 'accepted_list' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
            <button
              onClick={() => setSubPage('list')}
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

          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: '0 0 0.2rem 0', fontFamily: 'var(--font-heading)' }} className="text-gradient">
            进行中的任务 ({activeTasks.length} / 2)
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {activeTasks.length === 0 ? (
              <div 
                className="glass-card" 
                style={{ 
                  padding: '2.5rem 1.5rem', 
                  borderRadius: 18, 
                  textAlign: 'center', 
                  fontSize: '0.8rem', 
                  color: 'var(--text-muted)',
                  border: '1px dashed var(--glass-border)',
                  background: 'rgba(255,255,255,0.01)'
                }}
              >
                您当前没有正在进行中的任务。请在主页面接取新任务。
              </div>
            ) : (
              activeTasks.map((task) => {
                const cat = getCategoryDetails(task.category);
                const lvl = getTaskLevelDetails(task.id);
                return (
                  <div 
                    key={task.id}
                    onClick={() => {
                      setSelectedTask(task);
                      setBackTarget('accepted_list');
                      setFormText('');
                      setFormAttachments([]);
                      setFormError(null);
                      setIsCompletionModalOpen(true); // Open completion modal!
                    }}
                    className="glass-card"
                    style={{
                      padding: '0.8rem 0.9rem',
                      borderRadius: 16,
                      borderLeft: `4px solid ${lvl.color}`,
                      borderTopLeftRadius: 4,
                      borderBottomLeftRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.58rem', background: lvl.color, color: '#000', padding: '0.05rem 0.35rem', borderRadius: 4, fontWeight: 800 }}>
                          {lvl.label}
                        </span>
                        <span style={{ fontSize: '0.58rem', background: cat.color, border: `1px solid ${cat.border}`, color: cat.textColor, padding: '0.05rem 0.35rem', borderRadius: 4, fontWeight: 750 }}>
                          {cat.label}
                        </span>
                      </div>
                      <h4 style={{ fontSize: '0.84rem', fontWeight: 800, color: '#fff', margin: 0 }}>{task.title}</h4>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {task.description}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAbandonTask(task.id);
                        }}
                        disabled={abandoningId === task.id}
                        style={{
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#8d879e',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          fontSize: '0.68rem',
                          cursor: abandoningId === task.id ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                        className="hover:text-[#ff4d4d] hover:border-[#ff4d4d]/40"
                      >
                        {abandoningId === task.id ? '放弃中...' : '放弃'}
                      </button>
                      <span style={{ fontSize: '0.72rem', color: '#ff70a6', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                        提交 <ChevronRight size={14} color="#ff70a6" />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ===================== SUB-PAGE 3: COMPLETED TASKS LIST ===================== */}
      {subPage === 'completed_list' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
            <button
              onClick={() => setSubPage('list')}
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

          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: '0 0 0.2rem 0', fontFamily: 'var(--font-heading)' }} className="text-gradient">
            已完成任务历史
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {completedHistory.length === 0 ? (
              <div 
                className="glass-card" 
                style={{ 
                  padding: '2.5rem 1.5rem', 
                  borderRadius: 18, 
                  textAlign: 'center', 
                  fontSize: '0.8rem', 
                  color: 'var(--text-muted)',
                  border: '1px dashed var(--glass-border)',
                  background: 'rgba(255,255,255,0.01)'
                }}
              >
                您暂无已完成的成果档案。
              </div>
            ) : (
              completedHistory.map((record) => {
                const taskDef = tasks.find(t => t.id === record.taskId);
                const cat = taskDef ? getCategoryDetails(taskDef.category) : null;
                return (
                  <div 
                    key={record.id}
                    onClick={() => {
                      setSelectedRecord(record);
                      setSelectedTask(taskDef || null);
                      setBackTarget('completed_list');
                      setSubPage('completed_detail');
                    }}
                    className="glass-card"
                    style={{
                      padding: '0.8rem 0.9rem',
                      borderRadius: 16,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {cat && (
                        <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '0.58rem', background: cat.color, border: `1px solid ${cat.border}`, color: cat.textColor, padding: '0.05rem 0.35rem', borderRadius: 4, fontWeight: 750 }}>
                            {cat.label}
                          </span>
                        </div>
                      )}
                      <h4 style={{ fontSize: '0.84rem', fontWeight: 800, color: '#fff', margin: 0 }}>{record.title}</h4>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {record.textContent}
                      </p>
                    </div>
                    <ChevronRight size={14} color="rgba(255,255,255,0.25)" />
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ===================== SUB-PAGE 4: TASK PREVIEW / ACCEPT PAGE ===================== */}
      {subPage === 'task_preview' && selectedTask && (
        <TaskPreviewSubpage
          task={selectedTask}
          onBack={() => {
            setSubPage('list');
            setSelectedTask(null);
          }}
          onAccept={handleAcceptTask}
          acceptingId={acceptingId}
          levelDetails={getTaskLevelDetails(selectedTask.id)}
          categoryDetails={getCategoryDetails(selectedTask.category)}
        />
      )}

      {/* ===================== SUB-PAGE 5: COMPLETED TASK DETAILS VIEW ===================== */}
      {subPage === 'completed_detail' && selectedRecord && (
        <CompletedTaskDetail
          record={selectedRecord}
          task={selectedTask}
          playingAudioId={playingAudioId}
          onPlayAudio={handlePlayAudio}
          onBack={() => {
            setSubPage(backTarget);
            setSelectedRecord(null);
            setSelectedTask(null);
          }}
          getTaskLevelDetails={getTaskLevelDetails}
          getCategoryDetails={getCategoryDetails}
          formatDate={formatDate}
        />
      )}

      {/* ===================== SUB-PAGE 6: PUBLISH CUSTOM TASK PAGE ===================== */}
      {subPage === 'publish' && (
        <PublishTaskPage
          title={publishTitle}
          description={publishDesc}
          category={publishCategory}
          error={publishError}
          loading={publishLoading}
          onTitleChange={setPublishTitle}
          onDescriptionChange={setPublishDesc}
          onCategoryChange={setPublishCategory}
          onSubmit={handleCreateCustomTask}
          onBack={() => setSubPage('list')}
        />
      )}

      {/* ===================== TASK COMPLETION MODAL POPUP (进行中点击提交) ===================== */}
      {isCompletionModalOpen && selectedTask && (
        <TaskCompletionModal
          task={selectedTask}
          text={formText}
          attachments={formAttachments}
          error={formError}
          submitting={submittingId === selectedTask.id}
          abandoning={abandoningId === selectedTask.id}
          level={getTaskLevelDetails(selectedTask.id)}
          category={getCategoryDetails(selectedTask.category)}
          onTextChange={setFormText}
          onAttachmentsChange={setFormAttachments}
          onClose={() => setIsCompletionModalOpen(false)}
          onSubmit={(event) => handleCompleteTask(event, selectedTask.id)}
          onAbandon={() => handleAbandonTask(selectedTask.id)}
        />
      )}

      {/* ===================== SPECIAL PRICE TASK MODAL (身价排位自评) ===================== */}
      <SpecialPriceTaskModal
        isOpen={isSpecialModalOpen}
        onClose={() => setIsSpecialModalOpen(false)}
        evaluation={specialEvaluation}
        countdown={specialCountdown}
        canEdit={specialCanEdit}
        submitting={specialSubmitting}
        onSubmit={submitSpecialEvaluation}
      />

      {/* ===================== SPECIAL PRICE LEADERBOARD MODAL (Top 10 身价榜) ===================== */}
      <SpecialPriceLeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        items={leaderboard}
        myStatus={myLeaderboardStatus}
        loading={leaderboardLoading}
        error={leaderboardError}
        onVote={voteSpecialEvaluation}
        onOpenSubmitModal={() => {
          if (!user) {
            onLoginClick();
            return;
          }
          setIsLeaderboardOpen(false);
          setIsSpecialModalOpen(true);
        }}
        onRefresh={() => { void fetchLeaderboard(); }}
      />

      {/* ===================== SPECIAL BETROTHAL GIFT TASK MODAL (彩礼与伴侣自白) ===================== */}
      <SpecialPriceTaskModal
        isOpen={isBetrothalModalOpen}
        onClose={() => setIsBetrothalModalOpen(false)}
        evaluation={betrothalEvaluation}
        countdown={betrothalCountdown}
        canEdit={betrothalCanEdit}
        submitting={betrothalSubmitting}
        onSubmit={submitBetrothalEvaluation}
        title="你的彩礼是多少，你觉得你的老公是什么"
        badgeText="SPECIAL · 仪式级特殊排位"
        descriptionPrompt="撕开婚姻与温情面具。假设在没有任何道德谴责的私密深处，面对内心的真实感知，你的彩礼是多少？你觉得你的老公到底是什么？"
        priceLabel="① 你的彩礼是多少（元）"
        pricePlaceholder="输入你的彩礼金额（元，未收/无彩礼可填 0）"
        priceStatLabel="彩礼金额"
        priceErrorText="请输入有效的彩礼金额（不能小于0）"
        selfEvalLabel="② 你觉得你的老公是什么（写下真实内心自白）"
        selfEvalPlaceholder="撕下体面与道德修饰，写下你潜意识里对老公最直白、最不加修饰的真实定义与内心自白..."
        selfEvalErrorText="请填写文字自评，写下你对老公的真实看法与内心自白"
        successToastText="彩礼与伴侣自白排位测算完成！"
        submitButtonText="测算我的全网彩礼排位"
        publicNoticeText="提交后，你的昵称、自白内容与彩礼金额将公开出现在全网榜单。请勿填写真实姓名、联系方式或其他可识别身份的信息。"
      />

      {/* ===================== SPECIAL BETROTHAL LEADERBOARD MODAL (Top 10 彩礼自白榜) ===================== */}
      <SpecialPriceLeaderboardModal
        isOpen={isBetrothalLeaderboardOpen}
        onClose={() => setIsBetrothalLeaderboardOpen(false)}
        items={betrothalLeaderboard}
        myStatus={betrothalMyLeaderboardStatus}
        loading={betrothalLeaderboardLoading}
        error={betrothalLeaderboardError}
        onVote={voteBetrothalEvaluation}
        title="全网彩礼与伴侣自白天梯 · Top 10"
        subtitle="展示近 7 天净赞数（赞 - 踩）最高的前十位彩礼与伴侣自白档案"
        loadingText="正在同步全网彩礼与伴侣自白排位..."
        priceLabel="彩礼金额"
        unsubmittedText="你尚未参与彩礼与伴侣自白评定"
        onOpenSubmitModal={() => {
          if (!user) {
            onLoginClick();
            return;
          }
          setIsBetrothalLeaderboardOpen(false);
          setIsBetrothalModalOpen(true);
        }}
        onRefresh={() => { void fetchBetrothalLeaderboard(); }}
      />

    </div>
  );
};
