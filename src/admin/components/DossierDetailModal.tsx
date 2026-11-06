import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Z_LAYER } from '../../utils/zLayers';
import { X, Sparkles, FileText, User } from 'lucide-react';
import type { AdminAuditStatus, AdminDossier } from '../adminTypes';
import { formatTime } from '../adminApi';
import { DossierAnalysisTab } from './dossier/DossierAnalysisTab';
import { DossierQuizTab } from './dossier/DossierQuizTab';
import { DossierPersonaTab } from './dossier/DossierPersonaTab';
import { DossierSidebar } from './dossier/DossierSidebar';

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

  // 收集所有题目上传的媒体成果列表
  const allMediaEntries = Object.entries(userMediaAttachments).flatMap(([qId, list]) =>
    Array.isArray(list) ? list.map((item) => ({ ...item, qId })) : []
  );

  // 计算总题目数
  const totalQuestionsCount =
    completedBanks.reduce((acc: number, b: any) => acc + (b.questions?.length || 0), 0) || questionLogs.length;

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
            background: '#0f172a',
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
                <span style={{ color: '#a5b4fc' }}>{dossier.nickname || '匿名访客'}</span>
              </h2>
              <span
                style={{
                  fontSize: '0.68rem',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  background: 'rgba(99, 102, 241, 0.1)',
                  color: '#a5b4fc',
                  fontFamily: 'monospace',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                }}
              >
                {dossier.id}
              </span>
            </div>
            <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '0.25rem 0 0 0' }}>
              提交于 {formatTime(dossier.createdAt)} · 设备: <span style={{ fontFamily: 'monospace', color: '#cbd5e1' }}>{dossier.deviceId || '未记录'}</span>
            </p>
          </div>

          {/* 选项卡 Tabs */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(255, 255, 255, 0.04)',
              padding: '3px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
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
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                    color: isSelected ? '#c7d2fe' : '#94a3b8',
                    borderBottom: isSelected ? '1px solid #6366f1' : '1px solid transparent',
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
            {activeTab === 'analysis' && <DossierAnalysisTab dossier={dossier} />}
            {activeTab === 'quiz' && (
              <DossierQuizTab
                completedBanks={completedBanks}
                questionLogs={questionLogs}
                userTextAnswers={userTextAnswers}
                userMediaAttachments={userMediaAttachments}
                allMediaEntries={allMediaEntries}
                totalQuestionsCount={totalQuestionsCount}
                onZoomImage={onZoomImage}
              />
            )}
            {activeTab === 'persona' && <DossierPersonaTab dossier={dossier} onZoomImage={onZoomImage} />}
          </div>

          {/* 右侧：管理者审计与控制中心 */}
          <DossierSidebar
            dossier={dossier}
            isReanalyzing={isReanalyzing}
            onUpdateParams={onUpdateParams}
            onReanalyze={onReanalyze}
            onDelete={onDelete}
          />
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
