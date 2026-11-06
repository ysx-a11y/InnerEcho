import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Z_LAYER } from '../../utils/zLayers';
import {
  X,
  Shield,
  RefreshCw,
  Trash2,
  FileText,
  User,
  Sparkles,
  CheckCircle2,
  Clock,
  Activity,
  Layers,
  HelpCircle,
  MessageSquare,
  AlertCircle,
  Flame,
  Check,
} from 'lucide-react';
import type { AdminAuditStatus, AdminDossier } from '../adminTypes';
import { formatDuration, formatTime } from '../adminApi';
import { DossierMediaAttachments } from './dossier/DossierMediaAttachments';

function getRadarPolygon(d: AdminDossier) {
  const cx = 100;
  const cy = 100;
  const maxR = 75;
  const points = [
    { x: cx, y: cy - (maxR * Math.min(100, d.dominanceIndex)) / 100 },
    { x: cx + (maxR * Math.min(100, d.restraintIndex)) / 100, y: cy },
    { x: cx, y: cy + (maxR * Math.min(100, d.submissionIndex)) / 100 },
    { x: cx - (maxR * Math.min(100, d.sensoryThreshold)) / 100, y: cy },
  ];
  return points.map((p) => `${p.x},${p.y}`).join(' ');
}

interface DossierDetailModalProps {
  dossier: AdminDossier | null;
  onClose: () => void;
  onUpdateParams?: (id: string, patch: { auditStatus?: AdminAuditStatus; adminNotes?: string }) => void;
  onReanalyze?: (id: string) => void;
  onDelete?: (id: string) => void;
  reanalyzingId?: string | null;
  onZoomImage?: (url: string) => void;
}

export const DossierDetailModal: React.FC<DossierDetailModalProps> = ({
  dossier,
  onClose,
  onUpdateParams,
  onReanalyze,
  onDelete,
  reanalyzingId,
  onZoomImage,
}) => {
  const [activeTab, setActiveTab] = useState<'analysis' | 'quiz' | 'persona'>('analysis');

  if (!dossier) return null;

  const isReanalyzing = reanalyzingId === dossier.id;
  const quizPayload = dossier.quizPayload || {};
  const completedBanks = (quizPayload.completedBanks || []) as any[];
  const questionLogs = (quizPayload.questionLogs || []) as any[];
  const userTextAnswers = (quizPayload.userTextAnswers || {}) as Record<string, string>;
  const userMediaAttachments = (quizPayload.userMediaAttachments || {}) as Record<string, any[]>;
  // 可信度判定依据：由服务端算法在落库时写入，旧卷宗（重算前）为空。
  const credibilityReasons = ((dossier.diagnosticResult?.credibilityReasons ?? []) as unknown[])
    .filter((reason): reason is string => typeof reason === 'string' && reason.trim() !== '');

  // 收集所有题目上传的媒体成果列表
  const allMediaEntries = Object.entries(userMediaAttachments).flatMap(([qId, list]) =>
    Array.isArray(list) ? list.map((item) => ({ ...item, qId })) : []
  );

  // 计算总题目数
  const totalQuestionsCount = completedBanks.reduce((acc: number, b: any) => acc + (b.questions?.length || 0), 0) || questionLogs.length;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(6, 4, 10, 0.88)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: Z_LAYER.userModal,
        padding: '1.25rem',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1050px',
          height: '92vh',
          background: '#0e0b1a',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '18px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
          boxShadow: '0 25px 70px rgba(0,0,0,0.85)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部 Header 与 Tab 切换 */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(12, 9, 22, 0.95)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>卷宗全景审计报告：</span>
                <span style={{ color: '#ff70a6' }}>{dossier.nickname || '匿名访客'}</span>
              </h2>
              <span
                style={{
                  fontSize: '0.68rem',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  background: 'rgba(128,243,255,0.1)',
                  color: '#80f3ff',
                  fontFamily: 'monospace',
                  border: '1px solid rgba(128,243,255,0.2)',
                }}
              >
                {dossier.id}
              </span>
            </div>
            <p style={{ fontSize: '0.72rem', color: '#6e677c', margin: '0.25rem 0 0 0' }}>
              提交于 {formatTime(dossier.createdAt)} · 设备: <span style={{ fontFamily: 'monospace', color: '#8d879e' }}>{dossier.deviceId || '未记录'}</span>
            </p>
          </div>

          {/* 选项卡 Tabs */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(255, 255, 255, 0.04)',
              padding: '3px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            {[
              { key: 'analysis', label: '🧬 心理画像与深度解构', icon: Sparkles },
              { key: 'quiz', label: `📝 完整答卷明细 (${totalQuestionsCount})`, icon: FileText },
              { key: 'persona', label: '👤 作答者身份档案', icon: User },
            ].map((tab) => {
              const isSelected = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.45rem 0.9rem',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(255, 51, 119, 0.2)' : 'transparent',
                    color: isSelected ? '#ff70a6' : '#8d879e',
                    borderBottom: isSelected ? '1px solid #ff70a6' : '1px solid transparent',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#8d879e',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* 主体区域（左侧内容 + 右侧管理操作面板） */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }} className="dossier-modal-flex">
          
          {/* 左侧主体 Tab 内容区 */}
          <div style={{ flex: '1 1 65%', overflowY: 'auto', padding: '1.5rem', boxSizing: 'border-box' }}>
            
            {/* ===================== TAB 1: 心理画像与深度解构 ===================== */}
            {activeTab === 'analysis' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
                
                {/* 1. 核心原型与雷达图卡片 */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,51,119,0.08) 0%, rgba(170,38,218,0.05) 100%)',
                    border: '1px solid rgba(255,51,119,0.25)',
                    borderRadius: '14px',
                    padding: '1.2rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.5rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <svg width="120" height="120" viewBox="0 0 200 200" style={{ overflow: 'visible', flexShrink: 0 }}>
                    <defs>
                      <radialGradient id="modal-radar-glow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="rgba(255,51,119,0.35)" />
                        <stop offset="100%" stopColor="rgba(170,38,218,0)" />
                      </radialGradient>
                    </defs>
                    {[0.33, 0.66, 1.0].map((ratio, i) => (
                      <circle key={i} cx="100" cy="100" r={75 * ratio} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                    ))}
                    <line x1="100" y1="15" x2="100" y2="185" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                    <line x1="15" y1="100" x2="185" y2="100" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                    <polygon points={getRadarPolygon(dossier)} fill="url(#modal-radar-glow)" stroke="#ff3377" strokeWidth="2.2" />
                  </svg>

                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#ff70a6', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                      PRIMARY ARCHETYPE
                    </span>
                    <h3 style={{ fontSize: '1.4rem', color: '#ffffff', margin: '0.2rem 0', fontWeight: 800 }}>
                      {dossier.archetypeTitle || '倾向评估中'}
                    </h3>
                    {dossier.archetypeSubtitle && (
                      <p style={{ fontSize: '0.8rem', color: '#8d879e', margin: '0 0 0.8rem 0' }}>
                        {dossier.archetypeSubtitle}
                      </p>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '0.5rem', marginTop: '0.6rem' }}>
                      <div style={{ background: 'rgba(255,51,119,0.12)', border: '1px solid rgba(255,51,119,0.2)', padding: '6px 8px', borderRadius: 8 }}>
                        <span style={{ fontSize: '0.68rem', color: '#ff70a6', display: 'block' }}>支配指数</span>
                        <strong style={{ fontSize: '1rem', color: '#fff' }}>{dossier.dominanceIndex}</strong>
                      </div>
                      <div style={{ background: 'rgba(255,209,128,0.12)', border: '1px solid rgba(255,209,128,0.2)', padding: '6px 8px', borderRadius: 8 }}>
                        <span style={{ fontSize: '0.68rem', color: '#ffd180', display: 'block' }}>克制指数</span>
                        <strong style={{ fontSize: '1rem', color: '#fff' }}>{dossier.restraintIndex}</strong>
                      </div>
                      <div style={{ background: 'rgba(170,38,218,0.12)', border: '1px solid rgba(170,38,218,0.2)', padding: '6px 8px', borderRadius: 8 }}>
                        <span style={{ fontSize: '0.68rem', color: '#aa26da', display: 'block' }}>臣服指数</span>
                        <strong style={{ fontSize: '1rem', color: '#fff' }}>{dossier.submissionIndex}</strong>
                      </div>
                      <div style={{ background: 'rgba(128,243,255,0.12)', border: '1px solid rgba(128,243,255,0.2)', padding: '6px 8px', borderRadius: 8 }}>
                        <span style={{ fontSize: '0.68rem', color: '#80f3ff', display: 'block' }}>感官阈值</span>
                        <strong style={{ fontSize: '1rem', color: '#fff' }}>{dossier.sensoryThreshold}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. 深度解构三大篇章 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  {/* 人格面具解构 */}
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '12px',
                      padding: '1.2rem',
                    }}
                  >
                    <h4 style={{ fontSize: '0.85rem', color: '#80f3ff', margin: '0 0 0.6rem 0', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <User size={15} />
                      <span>🎭 人格面具深度解构 (Persona Deconstruction)</span>
                    </h4>
                    <p style={{ fontSize: '0.82rem', color: '#e0dce8', lineHeight: 1.6, margin: 0, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                      {dossier.personaDeconstruction || '暂无该维度的深度面具解构数据。'}
                    </p>
                  </div>

                  {/* 潜意识阴暗面解构 */}
                  <div
                    style={{
                      background: 'rgba(255, 51, 119, 0.03)',
                      border: '1px solid rgba(255, 51, 119, 0.15)',
                      borderRadius: '12px',
                      padding: '1.2rem',
                    }}
                  >
                    <h4 style={{ fontSize: '0.85rem', color: '#ff70a6', margin: '0 0 0.6rem 0', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Flame size={15} />
                      <span>🌑 潜意识阴暗面与隐秘渴望解构 (Shadow Deconstruction)</span>
                    </h4>
                    <p style={{ fontSize: '0.82rem', color: '#fff', lineHeight: 1.6, margin: 0, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                      {dossier.shadowDeconstruction || '暂无该维度的阴暗面解构数据。'}
                    </p>
                  </div>

                  {/* 心理升华与心流指引 */}
                  <div
                    style={{
                      background: 'rgba(170, 38, 218, 0.03)',
                      border: '1px solid rgba(170, 38, 218, 0.15)',
                      borderRadius: '12px',
                      padding: '1.2rem',
                    }}
                  >
                    <h4 style={{ fontSize: '0.85rem', color: '#aa26da', margin: '0 0 0.6rem 0', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Sparkles size={15} />
                      <span>✨ 心理升华与心流指引 (Psychological Sublimation)</span>
                    </h4>
                    <p style={{ fontSize: '0.82rem', color: '#e0dce8', lineHeight: 1.6, margin: 0, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                      {dossier.psychologicalSublimation || '暂无心理升华指引数据。'}
                    </p>
                  </div>

                </div>

                {/* 3. 心理共鸣关键词与暗面标签 */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '12px',
                    padding: '1.2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                >
                  {dossier.resonanceKeywords && dossier.resonanceKeywords.length > 0 && (
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#8d879e', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>
                        🪞 心理共鸣关键词云
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {dossier.resonanceKeywords.map((kw, i) => (
                          <span
                            key={i}
                            style={{
                              background: 'rgba(128,243,255,0.08)',
                              color: '#80f3ff',
                              border: '1px solid rgba(128,243,255,0.2)',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            #{kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {dossier.selectedShadowTags && dossier.selectedShadowTags.length > 0 && (
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#8d879e', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>
                        🏷️ 潜意识暗面标签
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {dossier.selectedShadowTags.map((tag, i) => (
                          <span
                            key={i}
                            style={{
                              background: 'rgba(255,51,119,0.08)',
                              color: '#ff70a6',
                              border: '1px solid rgba(255,51,119,0.2)',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 🪞 镜像契合度与暗面自白心声 */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 112, 166, 0.08) 0%, rgba(170, 38, 218, 0.08) 100%)',
                    border: '1px solid rgba(255, 112, 166, 0.25)',
                    borderRadius: '12px',
                    padding: '1.2rem',
                  }}
                >
                  <h4 style={{ fontSize: '0.85rem', color: '#ff70a6', margin: '0 0 0.6rem 0', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Sparkles size={15} />
                    <span>🪞 暗面镜像共鸣与用户心声 (Mirror Resonance Feedback)</span>
                  </h4>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: dossier.resonanceText ? '0.8rem' : 0 }}>
                    <span style={{ fontSize: '0.74rem', color: '#8d879e' }}>用户共鸣印记：</span>
                    {dossier.resonanceLevel === 'exact' && (
                      <span style={{ padding: '3px 9px', borderRadius: '6px', background: 'rgba(255,112,166,0.15)', border: '1px solid rgba(255,112,166,0.4)', color: '#ff70a6', fontSize: '0.75rem', fontWeight: 700 }}>
                        💎 90% 灵魂被彻底剥离 (精准击中 · 深度共鸣)
                      </span>
                    )}
                    {dossier.resonanceLevel === 'partial' && (
                      <span style={{ padding: '3px 9px', borderRadius: '6px', background: 'rgba(128,243,255,0.15)', border: '1px solid rgba(128,243,255,0.4)', color: '#80f3ff', fontSize: '0.75rem', fontWeight: 700 }}>
                        🪞 60% 隐约触碰到了暗面 (部分触动 · 隐约可见)
                      </span>
                    )}
                    {dossier.resonanceLevel === 'guarded' && (
                      <span style={{ padding: '3px 9px', borderRadius: '6px', background: 'rgba(255,209,128,0.15)', border: '1px solid rgba(255,209,128,0.4)', color: '#ffd180', fontSize: '0.75rem', fontWeight: 700 }}>
                        🛡️ 尚有防备，未完全敞开 (理性防御 · 留有保留)
                      </span>
                    )}
                    {dossier.resonanceLevel === 'custom' && (
                      <span style={{ padding: '3px 9px', borderRadius: '6px', background: 'rgba(170,38,218,0.15)', border: '1px solid rgba(170,38,218,0.4)', color: '#d383ff', fontSize: '0.75rem', fontWeight: 700 }}>
                        ✍️ 暗面另有隐衷 (手写自白 · 修正定义)
                      </span>
                    )}
                    {!dossier.resonanceLevel && (
                      <span style={{ padding: '3px 9px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#6e677c', fontSize: '0.75rem' }}>
                        访客尚未选择共鸣印记
                      </span>
                    )}
                    {dossier.resonanceAt && (
                      <span style={{ fontSize: '0.68rem', color: '#6e677c' }}>
                        (标记于 {formatTime(dossier.resonanceAt)})
                      </span>
                    )}
                  </div>

                  {dossier.resonanceText && (
                    <div
                      style={{
                        background: 'rgba(10, 4, 15, 0.85)',
                        border: '1px solid rgba(255, 112, 166, 0.3)',
                        borderRadius: '10px',
                        padding: '0.9rem 1.1rem',
                        marginTop: '0.5rem',
                      }}
                    >
                      <span style={{ fontSize: '0.7rem', color: '#ffd180', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>
                        💬 作答者手写暗面自白：
                      </span>
                      <p style={{ fontSize: '0.82rem', color: '#fff', margin: 0, lineHeight: 1.6, fontStyle: 'italic', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                        “{dossier.resonanceText}”
                      </p>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* ===================== TAB 2: 完整答卷明细与选项 ===================== */}
            {activeTab === 'quiz' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ fontSize: '0.9rem', color: '#80f3ff', margin: 0, fontWeight: 700 }}>
                    📝 用户作答全部题目与选中明细卷宗
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#8d879e' }}>
                    共 {totalQuestionsCount} 道题目记录
                  </span>
                </div>

                {/* 问卷所有媒体上传题汇总展播区 */}
                {allMediaEntries.length > 0 && (
                  <div style={{ background: 'rgba(128, 243, 255, 0.04)', border: '1px solid rgba(128, 243, 255, 0.25)', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.82rem', color: '#80f3ff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        🎬 问卷媒体上传题成果汇总 ({allMediaEntries.length} 件)
                      </span>
                      <span style={{ fontSize: '0.68rem', color: '#8d879e' }}>
                        涵盖视频 / 录音 / 照片等作答凭证
                      </span>
                    </div>
                    <DossierMediaAttachments attachments={allMediaEntries} title="全卷媒体成果汇总" onZoomImage={onZoomImage} />
                  </div>
                )}

                {/* 题库完整题目与选项渲染 */}
                {completedBanks.length > 0 ? (
                  completedBanks.map((bank: any, bIdx: number) => (
                    <div key={bank.id || bIdx} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div
                        style={{
                          background: 'rgba(255, 51, 119, 0.08)',
                          border: '1px solid rgba(255, 51, 119, 0.2)',
                          borderRadius: '10px',
                          padding: '0.8rem 1rem',
                        }}
                      >
                        <span style={{ fontSize: '0.75rem', color: '#ff70a6', fontWeight: 700 }}>
                          【题库 #{bIdx + 1}】 {bank.name || '标准倾向测试题库'}
                        </span>
                        {bank.description && (
                          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.72rem', color: '#8d879e' }}>
                            {bank.description}
                          </p>
                        )}
                      </div>

                      {/* 题目列表 */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        {(bank.questions || []).map((q: any, qIdx: number) => {
                          const log = questionLogs.find((l: any) => l.questionId === q.id) || {};
                          const userSelectedIds = log.finalValue?.selectedOptions || [];
                          const textAnswer = userTextAnswers[q.id] || log.finalValue?.textInput;
                          const questionMedia = userMediaAttachments[q.id] || log.finalValue?.attachments || [];

                          return (
                            <div
                              key={q.id || qIdx}
                              style={{
                                background: 'rgba(255, 255, 255, 0.02)',
                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                borderRadius: '12px',
                                padding: '1rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.6rem',
                              }}
                            >
                              {/* 题干 */}
                              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.8rem' }}>
                                <div>
                                  <span style={{ fontSize: '0.72rem', color: '#80f3ff', fontWeight: 700, marginRight: '0.4rem' }}>
                                    第 {qIdx + 1} 题
                                  </span>
                                  <span style={{ color: '#fff', fontSize: '0.82rem', fontWeight: 600 }}>
                                    {q.title}
                                  </span>
                                </div>
                                {log.durationMs !== undefined && (
                                  <span style={{ fontSize: '0.68rem', color: '#6e677c', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                    ⏱️ {(log.durationMs / 1000).toFixed(1)}s · {log.interactionCount || 1}次操作
                                  </span>
                                )}
                              </div>

                              {/* 情境描述 */}
                              {q.scenario && (
                                <p style={{ fontSize: '0.75rem', color: '#8d879e', margin: 0, fontStyle: 'italic', background: 'rgba(0,0,0,0.2)', padding: '6px 8px', borderRadius: 6 }}>
                                  "{q.scenario}"
                                </p>
                              )}

                              {/* 选项列表 */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.2rem' }}>
                                {(q.options || []).map((opt: any, oIdx: number) => {
                                  const isSelected = userSelectedIds.includes(opt.id) || userSelectedIds.includes(opt.text);
                                  return (
                                    <div
                                      key={opt.id || oIdx}
                                      style={{
                                        padding: '0.55rem 0.8rem',
                                        borderRadius: '8px',
                                        background: isSelected ? 'rgba(255, 51, 119, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                                        border: isSelected ? '1px solid #ff70a6' : '1px solid rgba(255, 255, 255, 0.04)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '0.6rem',
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div
                                          style={{
                                            width: 18,
                                            height: 18,
                                            borderRadius: '50%',
                                            background: isSelected ? '#ff3377' : 'rgba(255,255,255,0.05)',
                                            border: isSelected ? '1px solid #ff70a6' : '1px solid rgba(255,255,255,0.1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#fff',
                                            fontSize: '0.65rem',
                                            flexShrink: 0,
                                          }}
                                        >
                                          {isSelected ? <Check size={11} /> : String.fromCharCode(65 + oIdx)}
                                        </div>
                                        <span style={{ fontSize: '0.78rem', color: isSelected ? '#fff' : '#8d879e', fontWeight: isSelected ? 600 : 400 }}>
                                          {opt.text}
                                        </span>
                                      </div>

                                      {isSelected && (
                                        <span
                                          style={{
                                            fontSize: '0.68rem',
                                            color: '#ff70a6',
                                            background: 'rgba(255, 51, 119, 0.2)',
                                            padding: '1px 6px',
                                            borderRadius: '4px',
                                            fontWeight: 700,
                                            flexShrink: 0,
                                          }}
                                        >
                                          已选答案
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* 用户手填文本 */}
                              {textAnswer && (
                                <div
                                  style={{
                                    background: 'rgba(128, 243, 255, 0.06)',
                                    border: '1px solid rgba(128, 243, 255, 0.2)',
                                    borderRadius: '8px',
                                    padding: '0.6rem 0.8rem',
                                    marginTop: '0.2rem',
                                  }}
                                >
                                  <span style={{ fontSize: '0.68rem', color: '#80f3ff', fontWeight: 700, display: 'block', marginBottom: 2 }}>
                                    ✍️ 被测者手填自白文本:
                                  </span>
                                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#fff', wordBreak: 'break-word' }}>
                                    {textAnswer}
                                  </p>
                                </div>
                              )}

                              {/* 用户上传媒体附件 */}
                              {questionMedia && questionMedia.length > 0 && <DossierMediaAttachments attachments={questionMedia} title="本题上传成果" onZoomImage={onZoomImage} />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  /* 降级展示单题日志 */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    {questionLogs.map((log: any, idx: number) => (
                      <div
                        key={log.questionId || idx}
                        style={{
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: '10px',
                          padding: '0.8rem 1rem',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                          <strong style={{ color: '#80f3ff', fontSize: '0.8rem' }}>题目编号: {log.questionId}</strong>
                          <span style={{ fontSize: '0.68rem', color: '#6e677c' }}>⏱️ {(log.durationMs / 1000).toFixed(1)}s</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#fff' }}>
                          已选选项 ID: <span style={{ color: '#ff70a6', fontWeight: 600 }}>{(log.finalValue?.selectedOptions || []).join(', ') || '无'}</span>
                        </div>
                        {log.finalValue?.textInput && (
                          <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: '#ffd180' }}>
                            手填文本: {log.finalValue.textInput}
                          </div>
                        )}
                        {log.finalValue?.attachments && <DossierMediaAttachments attachments={log.finalValue.attachments} title="本题上传成果" onZoomImage={onZoomImage} />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ===================== TAB 3: 作答者身份档案 ===================== */}
            {activeTab === 'persona' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
                
                {/* 1. 基础信息数据表 */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '12px',
                    padding: '1.2rem',
                  }}
                >
                  <h3 style={{ fontSize: '0.85rem', color: '#80f3ff', margin: '0 0 1rem 0', fontWeight: 700 }}>
                    👤 作答者登记基本信息
                  </h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', color: '#8d879e' }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '8px 0', width: '120px', fontWeight: 600 }}>称呼与昵称:</td>
                        <td style={{ padding: '8px 0', color: '#fff', fontWeight: 600 }}>{dossier.nickname || '匿名访客'}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '8px 0', fontWeight: 600 }}>性别:</td>
                        <td style={{ padding: '8px 0', color: dossier.gender ? '#ff70a6' : '#fff', fontWeight: 600 }}>{dossier.gender || '未填写 / 保密'}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '8px 0', fontWeight: 600 }}>注册邮箱:</td>
                        <td style={{ padding: '8px 0', color: '#80f3ff' }}>{dossier.email || '未登录（匿名访客）'}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '8px 0', fontWeight: 600 }}>真实职业:</td>
                        <td style={{ padding: '8px 0', color: '#fff' }}>{dossier.q_occupation || dossier.occupation || '未填写'}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '8px 0', fontWeight: 600 }}>人前社交性格:</td>
                        <td style={{ padding: '8px 0', color: '#e100ff' }}>{dossier.personaTrait || '未填写'}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '8px 0', fontWeight: 600 }}>年龄归属:</td>
                        <td style={{ padding: '8px 0', color: '#fff' }}>{dossier.age ? `${dossier.age} 岁` : '未填写'}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '8px 0', fontWeight: 600 }}>婚姻与伴侣:</td>
                        <td style={{ padding: '8px 0', color: '#fff' }}>
                          {dossier.maritalStatus || '未填写'}{dossier.hasBoyfriend ? ` (${dossier.hasBoyfriend})` : ''}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 2. 用户上传照片 */}
                {dossier.avatarUrls && dossier.avatarUrls.length > 0 && (
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '12px',
                      padding: '1.2rem',
                    }}
                  >
                    <span style={{ fontSize: '0.8rem', color: '#ff70a6', fontWeight: 700, display: 'block', marginBottom: '0.8rem' }}>
                      📷 用户上传真实照片（共 {dossier.avatarUrls.length} 张）
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem' }}>
                      {dossier.avatarUrls.map((url, idx) => (
                        <img
                          key={idx}
                          src={url}
                          alt={`上传照片 ${idx + 1}`}
                          onClick={() => onZoomImage?.(url)}
                          className="admin-zoomable-img"
                          style={{
                            width: 100,
                            height: 100,
                            borderRadius: 10,
                            objectFit: 'cover',
                            border: '1px solid rgba(255,255,255,0.15)',
                            cursor: 'zoom-in',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. C1-C3 隐秘自白详细卡片 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {[
                    { label: '人前社交面具自述 (C1)', content: dossier.q_surfaceTrait },
                    { label: '隐秘深层渴望自白 (C1)', content: dossier.q_innerDesire, highlight: true },
                    { label: '暗面触向与边界试探 (C2)', content: dossier.q_boundaryText },
                    { label: '偏好的权责与信任交付关系 (C2)', content: dossier.q_relationPreference },
                    { label: '觉醒幻想时刻 (C2)', content: dossier.q_awakeningMoment },
                    { label: '潜意识宣泄词句 (C3)', content: dossier.q_secretWords },
                    { label: '心流规则与暗示约束 (C3)', content: dossier.q_secretRule },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: `1px solid ${item.highlight ? 'rgba(255,51,119,0.2)' : 'rgba(255,255,255,0.05)'}`,
                        borderRadius: '10px',
                        padding: '0.9rem 1rem',
                      }}
                    >
                      <span style={{ fontSize: '0.72rem', color: item.highlight ? '#ff70a6' : '#8d879e', fontWeight: 700, display: 'block', marginBottom: '0.3rem' }}>
                        {item.label}
                      </span>
                      <p style={{ fontSize: '0.82rem', color: item.highlight ? '#ff70a6' : '#fff', margin: 0, lineHeight: 1.5, wordBreak: 'break-word' }}>
                        {item.content || '未填写 / 隐私留白'}
                      </p>
                    </div>
                  ))}
                </div>

              </div>
            )}

          </div>

          {/* 右侧：管理者审计与控制中心 */}
          <div
            style={{
              flex: '1 1 35%',
              padding: '1.5rem',
              boxSizing: 'border-box',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.2rem',
              background: 'rgba(10, 8, 18, 0.4)',
              borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            {/* 遥测与防刷指标 */}
            <div
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '12px',
                padding: '1rem',
              }}
            >
              <h4 style={{ fontSize: '0.8rem', color: '#ffd180', margin: '0 0 0.8rem 0', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Activity size={14} />
                <span>🕵️ 行为遥测与可信度</span>
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', fontSize: '0.75rem' }}>
                <div>
                  <span style={{ color: '#6e677c', display: 'block', marginBottom: 2 }}>可信度等级</span>
                  <strong style={{ color: dossier.credibilityScore >= 80 ? '#4caf50' : '#ff3377', fontSize: '0.85rem' }}>
                    {dossier.credibilityLevel?.toUpperCase() || 'LOW'} ({dossier.credibilityScore}分)
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#6e677c', display: 'block', marginBottom: 2 }}>总作答耗时</span>
                  <strong style={{ color: '#fff', fontSize: '0.85rem' }}>
                    {formatDuration(dossier.durationSeconds)}
                  </strong>
                </div>
              </div>

              {/* 判定依据：让管理者看到分数是怎么来的，而不是只有一个数字 */}
              {credibilityReasons.length > 0 ? (
                <div
                  style={{
                    marginTop: '0.7rem',
                    paddingTop: '0.6rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.3rem',
                  }}
                >
                  <span style={{ color: '#6e677c', fontSize: '0.68rem' }}>判定依据</span>
                  {credibilityReasons.map((reason) => (
                    <span
                      key={reason}
                      style={{
                        fontSize: '0.7rem',
                        color: '#ffd180',
                        lineHeight: 1.5,
                        display: 'flex',
                        gap: '0.3rem',
                        alignItems: 'flex-start',
                      }}
                    >
                      <AlertCircle size={11} style={{ flexShrink: 0, marginTop: 3 }} />
                      <span>{reason}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    marginTop: '0.7rem',
                    paddingTop: '0.6rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    fontSize: '0.68rem',
                    color: '#6e677c',
                    lineHeight: 1.5,
                  }}
                >
                  该卷宗没有记录判定依据（旧数据），可在「管理者控制中心」重新诊断后生成。
                </div>
              )}
            </div>

            {/* 控制中心 */}
            <div
              style={{
                background: 'rgba(128, 243, 255, 0.03)',
                border: '1px solid rgba(128, 243, 255, 0.12)',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.9rem',
              }}
            >
              <h4 style={{ fontSize: '0.8rem', color: '#80f3ff', margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Shield size={14} />
                <span>管理者控制中心</span>
              </h4>

              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', color: '#8d879e', marginBottom: '0.3rem' }}>
                  数据审核归档状态
                </label>
                <select
                  value={dossier.auditStatus}
                  onChange={(e) => onUpdateParams?.(dossier.id, { auditStatus: e.target.value as AdminAuditStatus })}
                  style={{
                    width: '100%',
                    background: 'rgba(10,8,18,0.9)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '6px',
                    padding: '7px 10px',
                    color: '#fff',
                    fontSize: '0.8rem',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="pending">待核准 (Pending)</option>
                  <option value="approved">核准并归档 (Approved)</option>
                  <option value="flagged">标记为异常/作废 (Flagged)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', color: '#8d879e', marginBottom: '0.3rem' }}>
                  管理者审核备注 (仅内部可见)
                </label>
                <textarea
                  placeholder="添加审计结论或追踪备注..."
                  value={dossier.adminNotes}
                  onChange={(e) => onUpdateParams?.(dossier.id, { adminNotes: e.target.value })}
                  style={{
                    width: '100%',
                    height: '80px',
                    background: 'rgba(10,8,18,0.9)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '6px',
                    padding: '8px',
                    color: '#fff',
                    fontSize: '0.8rem',
                    outline: 'none',
                    resize: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.4rem' }}>
                <button
                  type="button"
                  onClick={() => onReanalyze?.(dossier.id)}
                  disabled={isReanalyzing}
                  style={{
                    width: '100%',
                    background: 'rgba(128,243,255,0.1)',
                    border: '1px solid rgba(128,243,255,0.3)',
                    borderRadius: '8px',
                    padding: '9px',
                    color: '#80f3ff',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <RefreshCw size={13} className={isReanalyzing ? 'admin-spin' : ''} />
                  <span>{isReanalyzing ? '大模型重新诊断中...' : '重新运行 LLM 深度诊断'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onDelete?.(dossier.id)}
                  style={{
                    width: '100%',
                    background: 'rgba(255,51,119,0.08)',
                    border: '1px solid rgba(255,51,119,0.25)',
                    borderRadius: '8px',
                    padding: '9px',
                    color: '#ff3377',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Trash2 size={13} />
                  <span>物理删除此卷宗</span>
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>

      <style>{`
        @media (max-width: 800px) {
          .dossier-modal-flex { flex-direction: column !important; }
          .dossier-modal-flex > div { flex: none !important; width: 100% !important; border-left: none !important; border-top: 1px solid rgba(255,255,255,0.08); }
        }
      `}</style>
    </div>,
    document.body
  );
};
