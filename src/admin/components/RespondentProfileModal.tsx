import React from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Layers,
  Sparkles,
  User,
  Eye,
} from 'lucide-react';
import { formatDuration, formatTime } from '../adminApi';
import { getQuestionnaireName } from '../adminUtils';
import type { AdminDossier } from '../adminTypes';

export interface UserGroupData {
  userKey: string;
  userId?: string;
  nickname: string;
  avatarUrl?: string;
  email?: string;
  deviceId?: string;
  gender?: string;
  occupation?: string;
  personaTrait?: string;
  age?: string;
  maritalStatus?: string;
  hasBoyfriend?: string;
  dossiers: AdminDossier[];
  guestDossierCount?: number;
  userDossierCount?: number;
  isPureGuest?: boolean;
}

interface RespondentProfileModalProps {
  userGroup: UserGroupData | null;
  bankNames?: Record<string, string>;
  onClose: () => void;
  onSelectDossier?: (dossier: AdminDossier) => void;
  onZoomImage?: (url: string) => void;
}

export const RespondentProfileModal: React.FC<RespondentProfileModalProps> = ({
  userGroup,
  bankNames = {},
  onClose,
  onSelectDossier,
  onZoomImage,
}) => {
  if (!userGroup) return null;

  // Extract the latest dossier for rich profile attributes
  const latestDossier = userGroup.dossiers[0];
  const surfaceTrait = latestDossier?.q_surfaceTrait || (latestDossier as any)?.dossierData?.chapter1?.surfaceTrait;
  const innerDesire = latestDossier?.q_innerDesire || (latestDossier as any)?.dossierData?.chapter1?.innerDesire;
  const boundaryText = latestDossier?.q_boundaryText || (latestDossier as any)?.dossierData?.chapter2?.boundaryText;
  const secretWords = latestDossier?.q_secretWords || (latestDossier as any)?.dossierData?.chapter3?.secretWords;
  const avatarPhotos = latestDossier?.avatarUrls || [];

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(6, 2, 10, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        className="animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '840px',
          maxHeight: '90vh',
          background: 'linear-gradient(145deg, #180922 0%, #0d0514 100%)',
          border: '1px solid rgba(255, 112, 166, 0.35)',
          borderRadius: '20px',
          boxShadow: '0 30px 90px rgba(0, 0, 0, 0.9), 0 0 40px rgba(255, 51, 119, 0.15)',
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
            padding: '1.1rem 1.4rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(255, 112, 166, 0.25), rgba(170, 38, 218, 0.35))',
                border: '1px solid rgba(255, 112, 166, 0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {userGroup.avatarUrl ? (
                <img
                  src={userGroup.avatarUrl}
                  alt={userGroup.nickname}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                  onClick={() => onZoomImage?.(userGroup.avatarUrl!)}
                />
              ) : (
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ff70a6' }}>
                  {userGroup.nickname.slice(0, 1) || '匿'}
                </span>
              )}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff0f5' }}>
                  {userGroup.nickname || '未命名访客'}
                </h3>
                {userGroup.email && (
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '0.74rem',
                      color: '#ffd180',
                      background: 'rgba(255, 209, 128, 0.12)',
                      border: '1px solid rgba(255, 209, 128, 0.3)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    {userGroup.email}
                  </span>
                )}
                {userGroup.isPureGuest ? (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: '#ffd180',
                      background: 'rgba(255, 209, 128, 0.14)',
                      border: '1px solid rgba(255, 209, 128, 0.35)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontWeight: 700,
                    }}
                  >
                    游客组
                  </span>
                ) : userGroup.guestDossierCount && userGroup.guestDossierCount > 0 ? (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: '#80f3ff',
                      background: 'rgba(128, 243, 255, 0.12)',
                      border: '1px solid rgba(128, 243, 255, 0.3)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontWeight: 600,
                    }}
                  >
                    含同设备游客卷轴 {userGroup.guestDossierCount} 份
                  </span>
                ) : null}
                <span
                  style={{
                    fontSize: '0.72rem',
                    color: '#ff70a6',
                    background: 'rgba(255, 51, 119, 0.12)',
                    border: '1px solid rgba(255, 51, 119, 0.3)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontWeight: 600,
                  }}
                >
                  共 {userGroup.dossiers.length} 份测评卷轴
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255, 240, 245, 0.5)', fontFamily: 'monospace', marginTop: '2px' }}>
                设备标识: {userGroup.deviceId || '未知'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: 'none',
              borderRadius: '8px',
              color: 'rgba(255, 255, 255, 0.6)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scroll Body */}
        <div style={{ padding: '1.4rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* 1. 基础人口学与社交面具 */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '14px',
              padding: '1.1rem',
            }}
          >
            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#ffd180', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={15} />
              <span>第一阶段 · 真实社会面具与基础登记</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.8rem' }}>
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px 12px', borderRadius: 8 }}>
                <span style={{ color: 'rgba(255,240,245,0.5)', display: 'block', fontSize: '0.7rem' }}>性别</span>
                <span style={{ color: '#ff70a6', fontWeight: 700 }}>{userGroup.gender || '保密'}</span>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px 12px', borderRadius: 8 }}>
                <span style={{ color: 'rgba(255,240,245,0.5)', display: 'block', fontSize: '0.7rem' }}>真实社会职业</span>
                <span style={{ color: '#80f3ff', fontWeight: 700 }}>{userGroup.occupation || '未填写'}</span>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px 12px', borderRadius: 8 }}>
                <span style={{ color: 'rgba(255,240,245,0.5)', display: 'block', fontSize: '0.7rem' }}>人前社交形象</span>
                <span style={{ color: '#aa26da', fontWeight: 700 }}>{userGroup.personaTrait || '未填写'}</span>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px 12px', borderRadius: 8 }}>
                <span style={{ color: 'rgba(255,240,245,0.5)', display: 'block', fontSize: '0.7rem' }}>年龄</span>
                <span style={{ color: '#fff0f5', fontWeight: 600 }}>{userGroup.age ? `${userGroup.age} 岁` : '未填写'}</span>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px 12px', borderRadius: 8 }}>
                <span style={{ color: 'rgba(255,240,245,0.5)', display: 'block', fontSize: '0.7rem' }}>婚姻状态</span>
                <span style={{ color: '#fff0f5', fontWeight: 600 }}>{userGroup.maritalStatus || '未填写'}</span>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px 12px', borderRadius: 8 }}>
                <span style={{ color: 'rgba(255,240,245,0.5)', display: 'block', fontSize: '0.7rem' }}>伴侣 / 恋爱状态</span>
                <span style={{ color: '#fff0f5', fontWeight: 600 }}>{userGroup.hasBoyfriend || '未填写'}</span>
              </div>
            </div>
          </div>

          {/* 2. 表里自白与深度心理渴望 */}
          {(surfaceTrait || innerDesire || boundaryText || secretWords) && (
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '14px',
                padding: '1.1rem',
              }}
            >
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#ff70a6', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={15} />
                <span>表里自白与隐秘暗面渴望</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {surfaceTrait && (
                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 12px', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.72rem', color: '#ffd180', fontWeight: 700, marginBottom: 4 }}>
                      人前外在性格表象：
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
                      {surfaceTrait}
                    </div>
                  </div>
                )}

                {innerDesire && (
                  <div style={{ background: 'rgba(255, 51, 119, 0.08)', border: '1px solid rgba(255, 51, 119, 0.2)', padding: '10px 12px', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.72rem', color: '#ff70a6', fontWeight: 700, marginBottom: 4 }}>
                      私密暗面真实渴望自白：
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#fff', fontStyle: 'italic', lineHeight: 1.5 }}>
                      “{innerDesire}”
                    </div>
                  </div>
                )}

                {boundaryText && (
                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 12px', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.72rem', color: '#aa26da', fontWeight: 700, marginBottom: 4 }}>
                      暗面触向与边界试探：
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
                      {boundaryText}
                    </div>
                  </div>
                )}

                {secretWords && (
                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 12px', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.72rem', color: '#80f3ff', fontWeight: 700, marginBottom: 4 }}>
                      密室第一句话 / 私密暗号：
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
                      {secretWords}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. 登记私密照或附件 (若有) */}
          {avatarPhotos.length > 0 && (
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '14px',
                padding: '1.1rem',
              }}
            >
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#ffd180', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Eye size={15} />
                <span>登记私密面具照片 ({avatarPhotos.length})</span>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {avatarPhotos.map((photo: string, idx: number) => (
                  <div
                    key={idx}
                    onClick={() => onZoomImage?.(photo)}
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 10,
                      overflow: 'hidden',
                      border: '1px solid rgba(255, 112, 166, 0.3)',
                      cursor: 'pointer',
                      background: '#000',
                    }}
                  >
                    <img src={photo} alt={`Photo ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. 该填写人的卷宗归档记录 */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '14px',
              padding: '1.1rem',
            }}
          >
            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#80f3ff', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={15} />
              <span>已提交测评卷轴列表 ({userGroup.dossiers.length})</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {userGroup.dossiers.map((d) => (
                <div
                  key={d.id}
                  onClick={() => onSelectDossier?.(d)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#80f3ff' }}>
                        {getQuestionnaireName(d, bankNames)}
                      </span>
                      {(!d.userId && !d.email) ? (
                        <span style={{ fontSize: '0.62rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(255, 209, 128, 0.15)', color: '#ffd180', border: '1px solid rgba(255, 209, 128, 0.35)', fontWeight: 700 }}>
                          游客
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.62rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(79, 209, 161, 0.12)', color: '#70dcb4', border: '1px solid rgba(79, 209, 161, 0.3)', fontWeight: 700 }}>
                          已登录
                        </span>
                      )}
                      <span style={{ fontSize: '0.74rem', color: '#ff70a6', fontWeight: 600 }}>
                        {d.archetypeTitle || '未命名人格'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,240,245,0.4)', fontFamily: 'monospace' }}>
                      提交时间: {formatTime(d.createdAt)} · 用时: {formatDuration(d.durationSeconds)}
                    </div>
                  </div>

                  <button
                    type="button"
                    style={{
                      background: 'rgba(255, 112, 166, 0.15)',
                      border: '1px solid rgba(255, 112, 166, 0.3)',
                      color: '#ff70a6',
                      borderRadius: 8,
                      padding: '4px 10px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    查看卷宗 →
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
