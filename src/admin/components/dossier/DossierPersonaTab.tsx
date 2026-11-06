import React from 'react';
import type { AdminDossier } from '../../adminTypes';

interface DossierPersonaTabProps {
  dossier: AdminDossier;
  onZoomImage?: (url: string) => void;
}

export const DossierPersonaTab: React.FC<DossierPersonaTabProps> = ({ dossier, onZoomImage }) => {
  return (
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
              <td style={{ padding: '8px 0', color: dossier.gender ? '#ff70a6' : '#fff', fontWeight: 600 }}>
                {dossier.gender || '未填写 / 保密'}
              </td>
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
            {dossier.avatarUrls.map((url: string, idx: number) => (
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
  );
};

