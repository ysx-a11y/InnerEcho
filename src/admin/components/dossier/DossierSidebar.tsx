import React from 'react';
import { Activity, AlertCircle, Shield, RefreshCw, Trash2 } from 'lucide-react';
import type { AdminAuditStatus, AdminDossier } from '../../adminTypes';
import { formatDuration } from '../../adminApi';

interface DossierSidebarProps {
  dossier: AdminDossier;
  isReanalyzing: boolean;
  onUpdateParams?: (id: string, patch: { auditStatus?: AdminAuditStatus; adminNotes?: string }) => void;
  onReanalyze?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const DossierSidebar: React.FC<DossierSidebarProps> = ({
  dossier,
  isReanalyzing,
  onUpdateParams,
  onReanalyze,
  onDelete,
}) => {
  const credibilityReasons = ((dossier.diagnosticResult?.credibilityReasons ?? []) as unknown[])
    .filter((reason): reason is string => typeof reason === 'string' && reason.trim() !== '');

  return (
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

        {/* 判定依据 */}
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
  );
};

