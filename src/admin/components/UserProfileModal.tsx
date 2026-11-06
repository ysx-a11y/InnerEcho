import React from 'react';
import { createPortal } from 'react-dom';
import { Z_LAYER } from '../../utils/zLayers';
import {
  X,
  RefreshCw,
  Smartphone,
  Layers,
  Target,
  Flame,
  FileText,
  Clock,
  Sparkles,
} from 'lucide-react';
import { formatTime } from '../adminApi';
import { getQuestionnaireName } from '../adminUtils';
import type { AdminUserDetails } from '../adminTypes';

interface UserProfileModalProps {
  userId: string | null;
  userDetails: AdminUserDetails | null;
  loading: boolean;
  onClose: () => void;
  onZoomImage?: (url: string) => void;
  onOpenDossier?: (dossierId: string) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  userId,
  userDetails,
  loading,
  onClose,
  onZoomImage,
  onOpenDossier,
}) => {
  if (!userId) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: Z_LAYER.userModal,
        background: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '900px',
          maxHeight: '90vh',
          background: 'var(--admin-surface)',
          border: '1px solid var(--admin-border-strong)',
          borderRadius: '18px',
          boxShadow: '0 25px 80px rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.2rem 1.5rem',
            borderBottom: '1px solid var(--admin-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--admin-surface-raised)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>👤</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--admin-text)' }}>
                  用户全维画像
                </h3>
                {userDetails && (
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '0.82rem',
                      color: '#ffb347',
                      background: 'rgba(255, 179, 71, 0.15)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    {userDetails.user.email}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', fontFamily: 'monospace', marginTop: '2px' }}>
                ID: {userId}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--admin-text-muted)', cursor: 'pointer', padding: '6px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scroll Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {loading ? (
            <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
              <RefreshCw
                size={28}
                className="animate-spin"
                style={{ margin: '0 auto 12px', display: 'block', color: 'var(--admin-accent)' }}
              />
              <span>正在合成画像...</span>
            </div>
          ) : userDetails ? (
            <>
              {/* 1. 基础信息 & 关联设备 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1rem' }}>
                {/* 账号档案 */}
                <div style={{ background: 'var(--admin-surface-raised)', border: '1px solid var(--admin-border)', borderRadius: '12px', padding: '1.1rem' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffb347', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📌 账号档案</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.78rem', fontFamily: 'monospace' }}>
                    <div>注册代次: 第{userDetails.user.generation}代</div>
                    <div>
                      状态:{' '}
                      {userDetails.user.deletedAt ? (
                        <span style={{ color: '#f07178' }}>已注销</span>
                      ) : (
                        <span style={{ color: '#4fd1a1' }}>正常</span>
                      )}
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      注册时间: {formatTime(userDetails.user.createdAt)}
                    </div>
                  </div>
                </div>

                {/* 关联设备 */}
                <div style={{ background: 'var(--admin-surface-raised)', border: '1px solid var(--admin-border)', borderRadius: '12px', padding: '1.1rem' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffb347', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Smartphone size={14} />
                    <span>关联设备指纹 ({userDetails.devices.length})</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '110px', overflowY: 'auto' }}>
                    {userDetails.devices.length === 0 ? (
                      <span style={{ fontSize: '0.76rem', color: 'var(--admin-text-muted)' }}>无设备记录</span>
                    ) : (
                      userDetails.devices.map((d, i) => (
                        <div
                          key={i}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            background: 'var(--admin-surface)',
                            border: '1px solid var(--admin-border)',
                            fontSize: '0.74rem',
                            fontFamily: 'monospace',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span style={{ color: 'var(--admin-text)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {d.deviceId}
                          </span>
                          <span style={{ color: 'var(--admin-text-muted)' }}>
                            {formatTime(d.lastLoginAt)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* 2. 第一章基础档案与表里自白 */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(128, 243, 255, 0.08) 0%, rgba(20, 10, 30, 0.85) 100%)',
                  border: '1px solid rgba(128, 243, 255, 0.25)',
                  borderRadius: '14px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#80f3ff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📋 第一章 · 访客基础档案与表里自白</span>
                  </div>
                  {userDetails.basicInfo ? (
                    <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 6, background: 'rgba(79, 209, 161, 0.15)', color: '#79ddb8', border: '1px solid rgba(79, 209, 161, 0.35)', fontWeight: 700 }}>
                      ✓ 已登记基础资料
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 6, background: 'rgba(255, 209, 128, 0.15)', color: '#ffd180', border: '1px solid rgba(255, 209, 128, 0.35)', fontWeight: 700 }}>
                      ! 暂未登记第一章
                    </span>
                  )}
                </div>

                {(() => {
                  const b = userDetails.basicInfo || (userDetails.dossiers[0] ? {
                    nickname: userDetails.dossiers[0].nickname,
                    occupation: userDetails.dossiers[0].occupation,
                    personaTrait: userDetails.dossiers[0].personaTrait,
                  } : null);

                  if (!b || (!b.nickname && !b.occupation)) {
                    return (
                      <div style={{ color: 'var(--admin-text-muted)', fontSize: '0.78rem', padding: '0.8rem 0' }}>
                        该用户尚未登记基础昵称与职业信息。
                      </div>
                    );
                  }

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.65rem' }}>
                        <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                          <span style={{ fontSize: '0.68rem', color: 'var(--admin-text-muted)', display: 'block', marginBottom: 2 }}>自白昵称</span>
                          <strong style={{ fontSize: '0.88rem', color: '#fff' }}>{b.nickname || '未填'}</strong>
                        </div>
                        <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                          <span style={{ fontSize: '0.68rem', color: 'var(--admin-text-muted)', display: 'block', marginBottom: 2 }}>真实社会职业</span>
                          <strong style={{ fontSize: '0.88rem', color: '#80f3ff' }}>{b.occupation || '未填'}</strong>
                        </div>
                        <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                          <span style={{ fontSize: '0.68rem', color: 'var(--admin-text-muted)', display: 'block', marginBottom: 2 }}>人前社交形象 / 面具</span>
                          <strong style={{ fontSize: '0.88rem', color: '#ff70a6' }}>{b.personaTrait || (b as any).surfaceTrait || '未填'}</strong>
                        </div>
                        <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                          <span style={{ fontSize: '0.68rem', color: 'var(--admin-text-muted)', display: 'block', marginBottom: 2 }}>性别 / 年龄 / 情感</span>
                          <span style={{ fontSize: '0.82rem', color: 'var(--admin-text-secondary)', fontWeight: 600 }}>
                            {b.gender || '保密'} · {b.age ? `${b.age}岁` : '年龄未填'} · {b.maritalStatus || (b.hasBoyfriend ? '有伴侣' : '单身')}
                          </span>
                        </div>
                      </div>

                      {(b as any).innerDesire && (
                        <div style={{ background: 'rgba(255, 51, 119, 0.08)', padding: '0.75rem 0.95rem', borderRadius: 8, border: '1px solid rgba(255, 51, 119, 0.2)' }}>
                          <span style={{ fontSize: '0.68rem', color: '#ff70a6', fontWeight: 700, display: 'block', marginBottom: 2 }}>无人时的暗面渴望自白</span>
                          <p style={{ margin: 0, fontSize: '0.76rem', color: '#fff', lineHeight: 1.45 }}>{(b as any).innerDesire}</p>
                        </div>
                      )}

                      {/* 自白照片 */}
                      {((b.avatarUrls && b.avatarUrls.length > 0) || b.avatarUrl) && (
                        <div>
                          <span style={{ fontSize: '0.68rem', color: 'var(--admin-text-muted)', display: 'block', marginBottom: 6 }}>
                            登记上传照片 ({(b.avatarUrls?.length || (b.avatarUrl ? 1 : 0))} 张) · <span style={{ color: 'var(--admin-accent)' }}>点击放大查阅</span>
                          </span>
                          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                            {(b.avatarUrls || (b.avatarUrl ? [b.avatarUrl] : [])).map((url, idx) => (
                              <div
                                key={idx}
                                onClick={() => onZoomImage?.(url)}
                                style={{
                                  position: 'relative',
                                  width: 58,
                                  height: 58,
                                  borderRadius: 10,
                                  overflow: 'hidden',
                                  border: '1px solid rgba(255, 112, 166, 0.35)',
                                  cursor: 'pointer',
                                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
                                  transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'scale(1.08)';
                                  e.currentTarget.style.borderColor = '#ff70a6';
                                  e.currentTarget.style.boxShadow = '0 0 16px rgba(255, 112, 166, 0.5)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'scale(1)';
                                  e.currentTarget.style.borderColor = 'rgba(255, 112, 166, 0.35)';
                                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.4)';
                                }}
                                title="点击放大查看原图"
                              >
                                <img
                                  src={url}
                                  alt="用户基础自白照片"
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* 2. 名下卷宗 */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.85rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'var(--admin-text)' }}>
                    📑 名下卷宗测评 ({userDetails.dossiers.length})
                  </h4>
                  {userDetails.dossiers.length === 0 && (
                    <span style={{ fontSize: '0.74rem', color: '#fb923c' }}>
                      （该用户尚未完成卷宗测评）
                    </span>
                  )}
                </div>

                {userDetails.dossiers.length === 0 ? (
                  <div style={{ padding: '1.5rem', borderRadius: '10px', background: 'var(--admin-surface-raised)', border: '1px solid var(--admin-border)', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '0.78rem' }}>
                    暂无卷宗记录，用户仅完成注册，尚未参与 50 题测评。
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '10px' }}>
                    {userDetails.dossiers.map((dos) => (
                      <div
                        key={dos.id}
                        style={{
                          padding: '1rem',
                          borderRadius: '10px',
                          background: 'rgba(168, 85, 247, 0.08)',
                          border: '1px solid rgba(168, 85, 247, 0.25)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'monospace', color: '#c084fc', fontWeight: 700, fontSize: '0.82rem' }}>
                              #{dos.id.slice(0, 8)}
                            </span>
                            <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(128, 243, 255, 0.1)', color: '#80f3ff', border: '1px solid rgba(128, 243, 255, 0.25)', fontWeight: 600 }}>
                              {getQuestionnaireName(dos, userDetails.bankNames)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                fontSize: '0.68rem',
                                padding: '1px 6px',
                                borderRadius: '6px',
                                background: dos.depthRating === 'deep' ? 'rgba(240, 113, 120, 0.2)' : dos.depthRating === 'medium' ? 'rgba(255, 179, 71, 0.2)' : 'rgba(79, 209, 161, 0.2)',
                                color: dos.depthRating === 'deep' ? '#f07178' : dos.depthRating === 'medium' ? '#ffb347' : '#4fd1a1',
                              }}
                            >
                              {dos.depthRating}
                            </span>
                            {onOpenDossier && (
                              <button
                                type="button"
                                onClick={() => onOpenDossier(dos.id)}
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: 5,
                                  background: 'rgba(255, 112, 166, 0.15)',
                                  border: '1px solid rgba(255, 112, 166, 0.35)',
                                  color: '#ff70a6',
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                查阅
                              </button>
                            )}
                          </div>
                        </div>

                        <div style={{ fontSize: '0.78rem', color: 'var(--admin-text-secondary)' }}>
                          昵称: <span style={{ color: 'var(--admin-text)', fontWeight: 600 }}>{dos.nickname || '未填'}</span> · 职业:{' '}
                          <span style={{ color: 'var(--admin-text)', fontWeight: 600 }}>{dos.occupation || '未填'}</span>
                        </div>

                        {dos.selectedShadowTags && dos.selectedShadowTags.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                            {dos.selectedShadowTags.map((t, idx) => (
                              <span
                                key={idx}
                                style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: 'var(--admin-surface)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' }}
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}

                        <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)', fontFamily: 'monospace' }}>
                          生成时间: {formatTime(dos.createdAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. 自建题库 / 任务 / 回响 (3 列卡片群) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                {/* 题库 */}
                <div style={{ background: 'var(--admin-surface-raised)', border: '1px solid var(--admin-border)', borderRadius: '12px', padding: '1.1rem' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffb347', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={14} />
                    <span>自建题库 ({userDetails.banks.length})</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '130px', overflowY: 'auto' }}>
                    {userDetails.banks.length === 0 ? (
                      <span style={{ fontSize: '0.76rem', color: 'var(--admin-text-muted)' }}>无自建题库</span>
                    ) : (
                      userDetails.banks.map((b) => (
                        <div
                          key={b.id}
                          style={{ padding: '6px 10px', borderRadius: '6px', background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', fontSize: '0.74rem' }}
                        >
                          <div style={{ color: 'var(--admin-text)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)', display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace', marginTop: '2px' }}>
                            <span>{b.questionCount} 题</span>
                            <span>{b.auditStatus}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 任务 */}
                <div style={{ background: 'var(--admin-surface-raised)', border: '1px solid var(--admin-border)', borderRadius: '12px', padding: '1.1rem' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffb347', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Target size={14} />
                    <span>接取任务 ({userDetails.tasks.length})</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '130px', overflowY: 'auto' }}>
                    {userDetails.tasks.length === 0 ? (
                      <span style={{ fontSize: '0.76rem', color: 'var(--admin-text-muted)' }}>无接取任务</span>
                    ) : (
                      userDetails.tasks.map((t) => (
                        <div
                          key={t.id}
                          style={{ padding: '6px 10px', borderRadius: '6px', background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', fontSize: '0.74rem', fontFamily: 'monospace' }}
                        >
                          <div style={{ color: 'var(--admin-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.taskId}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)', display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                            <span>状态: {t.status}</span>
                            <span>{formatTime(t.acceptedAt).slice(5, 10)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 深夜回响 */}
                <div style={{ background: 'var(--admin-surface-raised)', border: '1px solid var(--admin-border)', borderRadius: '12px', padding: '1.1rem' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffb347', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Flame size={14} color="#ff70a6" />
                    <span>深夜回响 ({userDetails.echoes.length})</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '130px', overflowY: 'auto' }}>
                    {userDetails.echoes.length === 0 ? (
                      <span style={{ fontSize: '0.76rem', color: 'var(--admin-text-muted)' }}>未投掷回响</span>
                    ) : (
                      userDetails.echoes.map((e) => (
                        <div
                          key={e.id}
                          style={{ padding: '6px 10px', borderRadius: '6px', background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', fontSize: '0.74rem' }}
                        >
                          <div style={{ color: 'var(--admin-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {e.shadowDesire}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)', display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace', marginTop: '2px' }}>
                            <span>💖 {e.echoCount} 共鸣</span>
                            <span>{e.auditStatus}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--admin-border)', background: 'var(--admin-surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '7px 18px',
              borderRadius: '8px',
              background: 'var(--admin-surface)',
              border: '1px solid var(--admin-border)',
              color: 'var(--admin-text)',
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            关闭画像
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
