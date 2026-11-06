import React from 'react';
import { Target, ArrowRight, Sparkles } from 'lucide-react';
import type { AdminOverview } from '../../adminTypes';

interface DashboardFunnelProps {
  overview: AdminOverview | null;
}

export const DashboardFunnel: React.FC<DashboardFunnelProps> = ({ overview }) => {
  const currentPeriod = overview?.selectedPeriod || overview?.today;
  const visitors = currentPeriod?.visitors ?? 0;
  const users = currentPeriod?.users ?? 0;
  const dossiers = currentPeriod?.dossiers ?? 0;
  const uniquePeople = currentPeriod?.uniquePeople ?? 0;
  const cardExports = overview?.eventStats?.find((e) => e.eventType === 'export_card');
  const cardExporters = cardExports?.devices ?? 0;

  const rateOf = (count: number) => (visitors > 0 ? Math.min(100, Math.round((count / visitors) * 100)) : 0);

  // Conversion Funnel steps
  const steps = [
    {
      title: '① 探索访客',
      count: visitors,
      unit: '人',
      rate: visitors > 0 ? '100%' : '0%',
      color: '#80f3ff',
      desc: '进入测试首页',
    },
    {
      title: '② 身份登记',
      count: users,
      unit: '人',
      rate: `${rateOf(users)}%`,
      color: '#ffd180',
      desc: '录入真实职业与人前形象',
    },
    {
      title: '③ 卷宗作答完成',
      count: dossiers,
      unit: '份',
      rate: `${rateOf(dossiers)}%`,
      color: '#ff70a6',
      desc: '完成 50 题极速卷宗剖析',
    },
    {
      title: '④ 仪式身价自白',
      count: uniquePeople,
      unit: '人',
      rate: `${rateOf(uniquePeople)}%`,
      color: '#aa26da',
      desc: '测算暗面身价天梯排位',
    },
    {
      title: '⑤ 导出角色卡',
      count: cardExporters,
      unit: '人',
      rate: `${rateOf(cardExporters)}%`,
      color: '#4ade80',
      desc: '生成可分享的暗面自白卡',
    },
  ];

  return (
    <div
      className="glass-card"
      style={{
        padding: '1.1rem 1.3rem',
        borderRadius: 18,
        background: 'linear-gradient(135deg, rgba(28, 14, 38, 0.7) 0%, rgba(16, 8, 22, 0.85) 100%)',
        border: '1px solid rgba(255, 112, 166, 0.2)',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 51, 119, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.8rem',
        boxSizing: 'border-box',
        width: '100%',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <Target size={16} color="#ffd180" />
          <h3 style={{ fontSize: '0.96rem', fontWeight: 800, color: '#fff', margin: 0, fontFamily: 'var(--font-heading)' }}>
            业务全链路转化漏斗
          </h3>
        </div>
        <span style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)' }}>
          从首页探索至身价自白与回响互动的完整转化率
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.65rem',
          marginTop: '0.2rem',
        }}
      >
        {steps.map((step, idx) => (
          <div
            key={step.title}
            style={{
              background: 'rgba(12, 4, 16, 0.65)',
              border: `1px solid ${step.color}28`,
              borderRadius: 14,
              padding: '0.75rem 0.85rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Top color bar */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: `linear-gradient(90deg, ${step.color} 0%, transparent 100%)`,
              }}
            />

            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: step.color, marginBottom: '0.2rem' }}>
                {step.title}
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff' }}>
                {step.count.toLocaleString()} <span style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--admin-text-muted)' }}>{step.unit}</span>
              </div>
            </div>

            <div style={{ marginTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.35rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.66rem', color: 'var(--admin-text-muted)' }}>总转化</span>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: step.color }}>{step.rate}</span>
              </div>
              <p style={{ fontSize: '0.64rem', color: 'var(--admin-text-secondary)', margin: '0.2rem 0 0 0', lineHeight: 1.3 }}>
                {step.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
