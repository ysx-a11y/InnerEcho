import React, { useEffect, useState, useCallback } from 'react';
import {
  User, Briefcase, Heart, Sparkles, Edit3, ChevronLeft, ChevronRight,
  KeyRound, LogOut, Trash2, Mail, Image as ImageIcon, ChevronRight as Chevron,
  FileText, Clock, Calendar, Shield, Loader2, LogIn, Layers,
} from 'lucide-react';
import { ChapterOneData } from '../data/chapterStructure';
import { apiGet } from '../utils/api';
import type { DossierSummaryContract } from '../../shared/apiContracts';
import { PersonalCardDeck } from './personal/PersonalCardDeck';

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'refreshing' | 'error';

interface PersonalViewProps {
  data: ChapterOneData;
  onEdit?: () => void;
  user?: { id: string; email: string } | null;
  onLogout?: () => void;
  onChangePassword?: () => void;
  onDeleteAccount?: () => void;
  onViewDossier?: (dossier: DossierSummaryContract) => void;
  onSessionExpired: () => void;
  onLoginClick?: () => void;
  onStartQuiz?: () => void;
}

interface UserStatsPayload {
  userId: string;
  email: string;
  nickname: string | null;
  avatarUrls: string[];
  dossierCount: number;
  lastDossierAt: string | null;
  createdAt: string;
}

function formatTime(iso: string | null): string {
  if (!iso) return '暂无';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '暂无';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return '暂无';
  }
}

export const PersonalView: React.FC<PersonalViewProps> = ({
  data,
  onEdit,
  user,
  onLogout,
  onChangePassword,
  onDeleteAccount,
  onViewDossier,
  onSessionExpired,
  onLoginClick,
  onStartQuiz,
}) => {
  const [photoIndex, setPhotoIndex] = React.useState(0);
  const photos = data.avatarUrls ?? (data.avatarUrl ? [data.avatarUrl] : []);

  const [stats, setStats] = useState<UserStatsPayload | null>(null);
  const [statsStatus, setStatsStatus] = useState<LoadStatus>('idle');
  const [statsError, setStatsError] = useState<string | null>(null);

  const [dossiers, setDossiers] = useState<DossierSummaryContract[]>([]);
  const [dossiersStatus, setDossiersStatus] = useState<LoadStatus>('idle');
  const [dossiersError, setDossiersError] = useState<string | null>(null);
  const [dossierViewMode, setDossierViewMode] = useState<'deck' | 'list'>('list');

  const statsAbortControllerRef = React.useRef<AbortController | null>(null);
  const dossiersAbortControllerRef = React.useRef<AbortController | null>(null);

  const loadStats = useCallback(async () => {
    if (!user) return;

    statsAbortControllerRef.current?.abort();
    const controller = new AbortController();
    statsAbortControllerRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    setStatsError(null);
    setStatsStatus(stats ? 'refreshing' : 'loading');

    try {
      const { data: resData } = await apiGet<{ success: boolean; stats?: UserStatsPayload; message?: string }>('/api/auth/stats', {
        signal: controller.signal,
        onUnauthorized: onSessionExpired,
      });

      if (statsAbortControllerRef.current !== controller) return;

      if (resData?.success && resData.stats) {
        setStats(resData.stats);
        setStatsStatus('ready');
      } else {
        throw new Error(resData?.message || '获取数据失败');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      if (statsAbortControllerRef.current !== controller) return;
      console.error('Failed to load stats:', err);
      setStatsError(err instanceof Error ? err.message : '加载统计数据失败');
      setStatsStatus('error');
    } finally {
      clearTimeout(timeoutId);
    }
  }, [user, stats, onSessionExpired]);

  const loadDossiers = useCallback(async () => {
    if (!user) return;

    dossiersAbortControllerRef.current?.abort();
    const controller = new AbortController();
    dossiersAbortControllerRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    setDossiersError(null);
    setDossiersStatus(dossiers.length > 0 ? 'refreshing' : 'loading');

    try {
      const { data: resData } = await apiGet<{ success: boolean; dossiers?: DossierSummaryContract[]; message?: string }>('/api/dossiers', {
        signal: controller.signal,
        onUnauthorized: onSessionExpired,
      });

      if (dossiersAbortControllerRef.current !== controller) return;

      if (resData?.success && resData.dossiers) {
        setDossiers(resData.dossiers);
        setDossiersStatus('ready');
      } else {
        throw new Error(resData?.message || '获取卷宗失败');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      if (dossiersAbortControllerRef.current !== controller) return;
      console.error('Failed to load dossiers:', err);
      setDossiersError(err instanceof Error ? err.message : '加载历史卷宗失败');
      setDossiersStatus('error');
    } finally {
      clearTimeout(timeoutId);
    }
  }, [user, dossiers, onSessionExpired]);

  useEffect(() => {
    setStats(null);
    setDossiers([]);
    setStatsError(null);
    setDossiersError(null);
    setStatsStatus('idle');
    setDossiersStatus('idle');

    if (user) {
      loadStats();
      loadDossiers();
    }

    return () => {
      statsAbortControllerRef.current?.abort();
      dossiersAbortControllerRef.current?.abort();
    };
  }, [user?.id]);

  const switchPhoto = (dir: 'prev' | 'next') => {
    if (photos.length <= 1) return;
    setPhotoIndex((prev) => dir === 'prev' ? (prev - 1 + photos.length) % photos.length : (prev + 1) % photos.length);
  };

  const displayName = user
    ? (stats?.nickname || data.nickname || user.email.split('@')[0])
    : (data.nickname || '访客');
  const avatar = stats?.avatarUrls?.[0] || photos[photoIndex];

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '1rem 0.9rem 4rem' }} className="animate-fade-in">
      {/* ============ 1. 个人资料头部（高定水晶名片卡） ============ */}
      <div
        className="glass-card portal-hero-card"
        style={{
          background:
            'linear-gradient(135deg, rgba(255, 51, 119, 0.14) 0%, rgba(168, 85, 247, 0.1) 48%, rgba(18, 6, 26, 0.85) 100%)',
          border: '1px solid rgba(255, 112, 166, 0.34)',
          borderRadius: 20,
          padding: '1.25rem 1.2rem',
          marginBottom: '0.68rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.95rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: -32,
            right: -24,
            width: 130,
            height: 130,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255, 112, 166, 0.24) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        {/* 头像 */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {avatar ? (
            <img
              src={avatar}
              alt="头像"
              style={{
                width: 64, height: 64, borderRadius: '50%', objectFit: 'cover',
                border: '2px solid rgba(255, 112, 166, 0.5)',
                boxShadow: '0 4px 18px rgba(255, 51, 119, 0.28)',
              }}
            />
          ) : (
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(255, 112, 166, 0.22), rgba(168, 85, 247, 0.18))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid rgba(255, 112, 166, 0.38)',
              boxShadow: '0 0 18px rgba(255, 112, 166, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
            }}>
              <User size={26} color="#ff70a6" />
            </div>
          )}
          {user && (
            <div style={{
              position: 'absolute', bottom: -1, right: -1,
              width: 18, height: 18, borderRadius: '50%',
              background: '#22c55e', border: '2.5px solid #120716',
              boxShadow: '0 0 8px rgba(34, 197, 94, 0.5)',
            }} title="已登录" />
          )}
        </div>

        {/* 名称 + 邮箱 */}
        <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
          <div style={{ fontSize: '1.12rem', fontWeight: 800, color: '#fff', wordBreak: 'break-word' }}>
            {displayName}
          </div>
          {user && (
            <div style={{
              fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.2rem',
              wordBreak: 'break-all', display: 'flex', alignItems: 'center', gap: '0.3rem', opacity: 0.85,
            }}>
              <Mail size={11} color="#ff70a6" /> {user.email}
            </div>
          )}
          {data.occupation && (
            <div style={{
              fontSize: '0.73rem', color: '#e9d5ff', marginTop: '0.28rem',
              display: 'inline-flex', alignItems: 'center', gap: '0.28rem',
              background: 'rgba(192, 132, 252, 0.14)', border: '1px solid rgba(192, 132, 252, 0.3)',
              padding: '1px 8px', borderRadius: 999,
            }}>
              <Briefcase size={10} color="#c084fc" /> {data.occupation}
            </div>
          )}
        </div>

        {/* 编辑按钮 */}
        {onEdit && (
          <button
            onClick={onEdit}
            style={{
              flexShrink: 0,
              background: 'rgba(255, 112, 166, 0.16)',
              border: '1px solid rgba(255, 112, 166, 0.42)',
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.2)',
              borderRadius: 999,
              padding: '0.36rem 0.72rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              color: '#ffd6e7',
              fontSize: '0.73rem',
              fontWeight: 700,
              position: 'relative',
            }}
          >
            <Edit3 size={12} /> 编辑
          </button>
        )}
      </div>

      {/* ============ 2. 数据统计（三栏紧凑） ============ */}
      {user && (
        <>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.6rem',
          }}>
            <StatCell
              icon={<FileText size={14} color="#ff70a6" />}
              label="卷宗"
              value={statsStatus === 'loading' ? '...' : stats ? String(stats.dossierCount) : statsStatus === 'error' ? '加载失败' : '0'}
            />
            <StatCell
              icon={<Clock size={14} color="#c084fc" />}
              label="上次诊断"
              value={statsStatus === 'loading' ? '...' : stats ? formatTime(stats.lastDossierAt) : statsStatus === 'error' ? '加载失败' : '暂无'}
            />
            <StatCell
              icon={<Calendar size={14} color="#2dd4bf" />}
              label="注册"
              value={statsStatus === 'loading' ? '...' : stats ? formatTime(stats.createdAt) : statsStatus === 'error' ? '加载失败' : '-'}
            />
          </div>
          {statsStatus === 'error' && (
            <div style={{ textAlign: 'center', marginBottom: '0.6rem' }}>
              <button
                onClick={() => { void loadStats(); }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ff70a6',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                {stats ? '统计数据刷新失败，已保留上次数据；点击重试' : '统计数据加载失败，点击重试'}
              </button>
            </div>
          )}
        </>
      )}

      {/* ============ 3. 照片轮播（如有） ============ */}
      {photos.length > 0 && (
        <SectionCard>
          <SectionHeader icon={<ImageIcon size={15} color="#ff70a6" />} title="形象照片" />
          <div style={{ position: 'relative', width: '100%', height: 200, borderRadius: 12, overflow: 'hidden', background: 'rgba(0,0,0,0.3)' }}>
            <img src={photos[photoIndex]} alt={`照片 ${photoIndex + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {photos.length > 1 && (
              <>
                <button onClick={() => switchPhoto('prev')} style={navBtnStyle}>
                  <ChevronLeft size={20} color="#fff" />
                </button>
                <button onClick={() => switchPhoto('next')} style={{ ...navBtnStyle, right: 8, left: 'auto' }}>
                  <ChevronRight size={20} color="#fff" />
                </button>
                <span style={{
                  position: 'absolute', bottom: 8, right: 12, fontSize: '0.7rem', color: '#fff', fontWeight: 600,
                  background: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: 8,
                }}>
                  {photoIndex + 1} / {photos.length}
                </span>
              </>
            )}
          </div>
        </SectionCard>
      )}

      {/* ============ 4. 个人信息列表（iOS 设置页风格） ============ */}
      <SectionCard>
        <SectionHeader icon={<User size={15} color="#ff70a6" />} title="基础信息" />
        <InfoRow icon={<User size={14} color="var(--text-muted)" />} label="昵称" value={data.nickname} />
        {data.gender && <InfoRow icon={<User size={14} color="var(--text-muted)" />} label="性别" value={data.gender} />}
        <InfoRow icon={<Briefcase size={14} color="var(--text-muted)" />} label="职业" value={data.occupation} />
        {data.age && <InfoRow icon={<Sparkles size={14} color="var(--text-muted)" />} label="年龄" value={data.age} />}
        {data.maritalStatus && (
          <InfoRow icon={<Heart size={14} color="var(--text-muted)" />} label="状态" value={data.maritalStatus === '已婚' ? '已婚' : (data.hasBoyfriend || '单身')} />
        )}
        {data.surfaceTrait && (
          <InfoRow icon={<Sparkles size={14} color="var(--text-muted)" />} label="人前形象" value={data.surfaceTrait} />
        )}
        {data.innerDesire && (
          <InfoRow icon={<Heart size={14} color="var(--text-muted)" />} label="暗面渴望" value={data.innerDesire} />
        )}
      </SectionCard>

      {/* ============ 历史自白卷宗与人格卡槽 (双管制) ============ */}
      {user && (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.65rem',
              padding: '0 0.2rem',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff' }}>
                已封印人格卡
              </span>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.55rem',
                  borderRadius: 12,
                  background: 'rgba(255, 51, 119, 0.16)',
                  border: '1px solid rgba(255, 112, 166, 0.38)',
                  color: '#ff70a6',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {dossiers.length} 张
              </span>
            </div>

            {/* 双管制切换胶囊按键 */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 20,
                padding: 2,
                boxSizing: 'border-box',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                onClick={() => setDossierViewMode('deck')}
                style={{
                  background: dossierViewMode === 'deck' ? 'linear-gradient(135deg, #ff3377, #ff70a6)' : 'transparent',
                  color: dossierViewMode === 'deck' ? '#fff' : 'var(--text-muted)',
                  border: 'none',
                  borderRadius: 16,
                  padding: '0.22rem 0.65rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  transition: 'all 0.2s ease',
                  boxShadow: dossierViewMode === 'deck' ? '0 0 10px rgba(255, 51, 119, 0.4)' : 'none',
                }}
              >
                <Layers size={12} />
                <span>卡牌槽</span>
              </button>
              <button
                type="button"
                onClick={() => setDossierViewMode('list')}
                style={{
                  background: dossierViewMode === 'list' ? 'linear-gradient(135deg, #ff3377, #ff70a6)' : 'transparent',
                  color: dossierViewMode === 'list' ? '#fff' : 'var(--text-muted)',
                  border: 'none',
                  borderRadius: 16,
                  padding: '0.22rem 0.65rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  transition: 'all 0.2s ease',
                  boxShadow: dossierViewMode === 'list' ? '0 0 10px rgba(255, 51, 119, 0.4)' : 'none',
                }}
              >
                <FileText size={12} />
                <span>清单</span>
              </button>
            </div>
          </div>

          {dossiersStatus === 'error' && dossiers.length > 0 && (
            <div style={{
              padding: '0.5rem 0.85rem',
              borderRadius: 10,
              background: 'rgba(251, 146, 60, 0.1)',
              border: '1px solid rgba(251, 146, 60, 0.25)',
              color: '#fed7aa',
              fontSize: '0.74rem',
              marginBottom: '0.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span>最新数据刷新失败，已显示缓存记录</span>
              <button
                onClick={() => { void loadDossiers(); }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fb923c',
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontWeight: 600,
                }}
              >
                重试
              </button>
            </div>
          )}

          {dossiersStatus === 'loading' && dossiers.length === 0 ? (
            <SectionCard>
              <div style={{ padding: '0.65rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center' }}>
                <Loader2 size={16} className="animate-spin" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '0.4rem', color: '#ff70a6' }} />
                <span>加载中...</span>
              </div>
            </SectionCard>
          ) : dossiersStatus === 'error' && dossiers.length === 0 ? (
            <SectionCard>
              <div style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '0.6rem' }}>
                  {dossiersError || '加载历史自白卷宗失败'}
                </div>
                <button
                  onClick={() => { void loadDossiers(); }}
                  className="btn-secondary"
                  style={{ padding: '0.35rem 1rem', fontSize: '0.74rem', borderRadius: 12 }}
                >
                  点击重试
                </button>
              </div>
            </SectionCard>
          ) : dossierViewMode === 'deck' ? (
            <PersonalCardDeck
              dossiers={dossiers}
              onViewDossier={onViewDossier}
              onStartQuiz={onStartQuiz}
            />
          ) : (
            <SectionCard>
              {dossiers.length === 0 ? (
                <div style={{ padding: '0.85rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', fontStyle: 'italic' }}>
                  暂无历史自白卷宗记录
                </div>
              ) : (
                dossiers.map((dos) => {
                  const title = dos.chapter1?.nickname
                    ? `${dos.chapter1.nickname}的自白卷宗`
                    : '自白卷宗';
                  const date = formatTime(dos.createdAt);
                  return (
                    <SettingsRow
                      key={dos.id}
                      icon={<FileText size={16} color="#ff70a6" />}
                      iconBg="rgba(255, 112, 166, 0.12)"
                      label={title}
                      subtitle={`生成于 ${date}`}
                      onClick={() => onViewDossier?.(dos)}
                    />
                  );
                })
              )}
            </SectionCard>
          )}
        </>
      )}

      {/* ============ 5. 账号管理（仅登录用户，iOS 设置页风格） ============ */}
      {user && (
        <>
          <SectionLabel>账号与安全</SectionLabel>
          <SectionCard>
            {onChangePassword && (
              <SettingsRow
                icon={<KeyRound size={16} color="#c084fc" />}
                iconBg="rgba(147, 51, 234, 0.12)"
                label="修改密码"
                onClick={onChangePassword}
              />
            )}
            {onLogout && (
              <SettingsRow
                icon={<LogOut size={16} color="#fb923c" />}
                iconBg="rgba(251, 146, 60, 0.12)"
                label="退出登录"
                onClick={onLogout}
              />
            )}
          </SectionCard>

          <SectionLabel>危险区域</SectionLabel>
          <SectionCard>
            {onDeleteAccount && (
              <SettingsRow
                icon={<Trash2 size={16} color="#ef4444" />}
                iconBg="rgba(239, 68, 68, 0.12)"
                label="注销账号"
                subtitle="注销后账号将无法再登录"
                onClick={onDeleteAccount}
                danger
              />
            )}
          </SectionCard>
        </>
      )}

      {!user && (
        <div style={{
          textAlign: 'center', padding: '1.4rem 1.2rem', color: 'var(--text-muted)', fontSize: '0.82rem',
          background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px dashed rgba(255,255,255,0.1)',
        }}>
          <Shield size={32} color="rgba(255, 112, 166, 0.35)" style={{ marginBottom: '0.5rem' }} />
          <div style={{ marginBottom: '0.85rem' }}>登录后可同步卷宗至云端并管理账号</div>
          {onLoginClick && (
            <button
              onClick={onLoginClick}
              className="btn-glow"
              style={{
                fontSize: '0.82rem',
                padding: '0.5rem 1.4rem',
                borderRadius: 14,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                cursor: 'pointer',
              }}
            >
              <LogIn size={14} />
              <span>立即登录 / 注册</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ============ 复用样式组件 ============

const navBtnStyle: React.CSSProperties = {
  position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
  background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%',
  width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer',
};

const SectionCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    className="glass-card portal-base-card"
    style={{
      background: 'rgba(18, 6, 26, 0.72)',
      border: '1px solid rgba(255, 112, 166, 0.16)',
      borderRadius: 16,
      padding: '0.88rem 1.05rem',
      marginBottom: '0.68rem',
    }}
  >
    {children}
  </div>
);

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '0.45rem',
    marginBottom: '0.6rem', paddingBottom: '0.5rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
  }}>
    {icon}
    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>{title}</span>
  </div>
);

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    fontSize: '0.7rem', fontWeight: 700, color: '#ff70a6',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    padding: '0.75rem 0.3rem 0.35rem', opacity: 0.85,
  }}>
    {children}
  </div>
);

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value?: string }> = ({ icon, label, value }) => (
  <div style={{
    display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
    padding: '0.42rem 0',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 74, flexShrink: 0 }}>
      {icon}
      <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>{label}</span>
    </div>
    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff', wordBreak: 'break-word', flex: 1 }}>
      {value || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontWeight: 400 }}>未填写</span>}
    </span>
  </div>
);

const StatCell: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div
    className="glass-card portal-base-card"
    style={{
      background: 'linear-gradient(145deg, rgba(255, 112, 166, 0.08) 0%, rgba(18, 6, 26, 0.75) 100%)',
      border: '1px solid rgba(255, 112, 166, 0.2)',
      borderRadius: 14,
      padding: '0.65rem 0.5rem',
      textAlign: 'center',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.22rem' }}>
      {icon}
    </div>
    <div style={{ fontSize: '0.64rem', color: 'var(--text-secondary)', marginBottom: '0.12rem' }}>{label}</div>
    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#fff' }}>{value}</div>
  </div>
);

const SettingsRow: React.FC<{
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  subtitle?: string;
  onClick?: () => void;
  danger?: boolean;
}> = ({ icon, iconBg, label, subtitle, onClick, danger }) => (
  <button
    onClick={onClick}
    style={{
      width: '100%',
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      padding: '0.65rem 0',
      background: 'transparent', border: 'none', cursor: 'pointer',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      color: danger ? '#ef4444' : 'var(--text-primary)',
    }}
  >
    <div style={{
      width: 32, height: 32, borderRadius: 8,
      background: iconBg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {icon}
    </div>
    <div style={{ flex: 1, textAlign: 'left' }}>
      <div style={{ fontSize: '0.86rem', fontWeight: 600 }}>{label}</div>
      {subtitle && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{subtitle}</div>}
    </div>
    <Chevron size={16} color="var(--text-muted)" />
  </button>
);
