import React, { useCallback, useEffect, useState } from 'react';
import { Activity, Clock, AlertTriangle, RefreshCw, FileText } from 'lucide-react';
import { adminApi, formatDuration } from '../adminApi';
import type { AdminTelemetry, AdminTimeRange } from '../adminTypes';
import { getBankMetadataById } from '../../data/questionBanks/bankRegistry';
import { loadQuestionBankById } from '../../utils/bankLoader';
function bankTitle(bankId: string, bankNames: Record<string, string>): string {
  return bankNames[bankId] ?? getBankMetadataById(bankId)?.title ?? bankId;
}

function combinedBankTitle(bankIds: string, bankNames: Record<string, string>): string {
  const ids = (bankIds || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) return '未标注题库';
  return ids.map((id) => bankTitle(id, bankNames)).join(' + ');
}

const TIME_RANGE_LABEL: Record<string, string> = {
  '00:00 - 04:00': '深夜潜意识静谧期',
  '04:00 - 08:00': '黎明清醒期',
  '08:00 - 12:00': '社会化面具构建期',
  '12:00 - 18:00': '日间工作调试期',
  '18:00 - 24:00': '面具消解期',
};

interface TelemetryStatsProps {
  range: AdminTimeRange;
  customDate: string;
  refreshTrigger: number;
}

export const TelemetryStats: React.FC<TelemetryStatsProps> = ({ range, customDate, refreshTrigger }) => {
  const [telemetry, setTelemetry] = useState<AdminTelemetry | null>(null);
  const [questionTexts, setQuestionTexts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.telemetry(range, range === 'custom' ? customDate : undefined);
      setTelemetry(res.telemetry);
      const map: Record<string, string> = {};
      // 遥测中出现的题库（内置库 / 用户自建库）按需懒加载补齐题面文案，
      // 否则新题库会退化成 "题目 ni_q1" 这样的裸 ID。
      const bankIds = Array.from(
        new Set((res.telemetry?.topQuestions ?? []).map((q) => q.bankId).filter(Boolean))
      );
      const loadedBanks = await Promise.all(bankIds.map((id) => loadQuestionBankById(id)));
      for (const bank of loadedBanks) {
        if (!bank) continue;
        for (const q of bank.questions) map[q.id] = q.title;
      }
      setQuestionTexts(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载遥测失败');
    } finally {
      setLoading(false);
    }
  }, [range, customDate]);

  useEffect(() => {
    load();
  }, [range, customDate, load, refreshTrigger]);

  if (loading && !telemetry) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', color: '#8d879e', gap: '0.6rem' }}>
        <RefreshCw size={18} className="admin-spin" />
        <span>正在聚合遥测数据...</span>
      </div>
    );
  }

  if (error && !telemetry) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', color: '#ff3377', gap: '0.8rem' }}>
        <AlertTriangle size={28} />
        <span>{error}</span>
        <button onClick={load} style={{ background: 'rgba(255,51,119,0.1)', border: '1px solid rgba(255,51,119,0.3)', color: '#fff', borderRadius: '10px', padding: '8px 18px', cursor: 'pointer' }}>重试</button>
      </div>
    );
  }

  const banks = telemetry?.banks ?? [];
  const topQuestions = telemetry?.topQuestions ?? [];
  const timeDistribution = telemetry?.timeDistribution ?? [];
  const bankNames = telemetry?.bankNames ?? {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', width: '100%', boxSizing: 'border-box' }}>
      {/* 顶部题库遥测对比 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem' }}>
        {banks.length === 0 && (
          <div className="glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '0.82rem', padding: '2.5rem 0' }}>暂无遥测数据（完成问卷后会在此聚合）</div>
        )}
        {banks.map((b, i) => (
          <div
            key={i}
            className="glass-card"
            style={{
              background: 'linear-gradient(135deg, rgba(28, 14, 38, 0.7) 0%, rgba(16, 8, 22, 0.85) 100%)',
              border: '1px solid rgba(255, 112, 166, 0.2)',
              borderRadius: 18,
              padding: '1.1rem 1.3rem',
              position: 'relative',
              overflow: 'hidden',
              boxSizing: 'border-box',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '4px',
                height: '100%',
                backgroundColor: i % 2 === 0 ? '#ff70a6' : '#80f3ff',
                boxShadow: i % 2 === 0 ? '0 0 12px rgba(255, 112, 166, 0.6)' : '0 0 12px rgba(128, 243, 255, 0.6)',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.74rem', padding: '3px 9px', borderRadius: '6px', background: 'rgba(255, 112, 166, 0.15)', border: '1px solid rgba(255, 112, 166, 0.3)', color: '#ff70a6', fontWeight: 700 }}>
                {combinedBankTitle(b.bankId, bankNames)}
              </span>
              <span style={{ fontSize: '0.76rem', color: 'var(--admin-text-muted)' }}>累计测试 {b.count} 次</span>
            </div>

            <h3 style={{ fontSize: '1.05rem', margin: '0 0 1rem 0', fontWeight: 800, color: '#ffffff' }}>
              {combinedBankTitle(b.bankId, bankNames)}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--admin-text-secondary)', marginBottom: '0.2rem' }}>平均作答时长</span>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Clock size={15} color={i % 2 === 0 ? '#ff70a6' : '#80f3ff'} />
                  {formatDuration(b.avgDurationSeconds)}
                </span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--admin-text-secondary)', marginBottom: '0.2rem' }}>犹豫指数 (停留时长)</span>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>
                  {b.avgHesitateIndex} <span style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)' }}>/ 100</span>
                </span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--admin-text-secondary)', marginBottom: '0.2rem' }}>填空退格修改率</span>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffd180' }}>{b.avgBackspaceRate}%</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--admin-text-secondary)', marginBottom: '0.2rem' }}>选项反复横跳率</span>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ff70a6' }}>{b.avgFlipFlop}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 底部两栏：高频犹豫题目排行 + 深夜答题峰值 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1rem' }}>
        {/* 高频犹豫题目排行 */}
        <div
          className="glass-card"
          style={{
            background: 'linear-gradient(135deg, rgba(28, 14, 38, 0.7) 0%, rgba(16, 8, 22, 0.85) 100%)',
            border: '1px solid rgba(255, 112, 166, 0.2)',
            borderRadius: 18,
            padding: '1.1rem 1.3rem',
            boxSizing: 'border-box',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
          }}
        >
          <h3 style={{ fontSize: '0.95rem', margin: '0 0 0.3rem 0', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={17} color="#ffd180" />
            停留最久 / 交互最深的题目 TOP {Math.min(topQuestions.length, 5) || 5}
          </h3>
          <p style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)', margin: '0 0 0.8rem 0' }}>按平均单题停留时长排序（真实答题埋点聚合）</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {topQuestions.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '0.78rem', padding: '1.5rem 0' }}>暂无题目级埋点数据</div>
            )}
            {topQuestions.slice(0, 5).map((q, idx) => {
              const text = questionTexts[q.questionId] || `题目 ${q.questionId}`;
              return (
                <div
                  key={`${q.bankId}-${q.questionId}`}
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 112, 166, 0.12)',
                    borderRadius: '10px',
                    padding: '0.65rem 0.85rem',
                    boxSizing: 'border-box',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.35rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#ffffff' }}>#{idx + 1} · {text}</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--admin-text-muted)' }}>{bankTitle(q.bankId, bankNames)}</span>
                    </div>
                    <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#ffd180' }}>
                        平均停留 {Math.round(q.avgDurationMs / 1000)}s
                      </span>
                      <div style={{ fontSize: '0.65rem', color: 'var(--admin-text-secondary)' }}>{q.attempts} 次作答 · 人均交互 {q.avgInteractions} 次</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 答题时间段分布 */}
        <div
          className="glass-card"
          style={{
            background: 'linear-gradient(135deg, rgba(28, 14, 38, 0.7) 0%, rgba(16, 8, 22, 0.85) 100%)',
            border: '1px solid rgba(255, 112, 166, 0.2)',
            borderRadius: 18,
            padding: '1.1rem 1.3rem',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
          }}
        >
          <h3 style={{ fontSize: '0.95rem', margin: '0 0 0.3rem 0', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={17} color="#80f3ff" />
            时间光谱分布（探索心流期）
          </h3>
          <p style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)', margin: '0 0 1rem 0' }}>卷宗提交数量随时间段的百分比分布（北京时间）</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', marginTop: '0.4rem' }}>
            {timeDistribution.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '0.78rem', padding: '1.5rem 0' }}>暂无提交数据</div>
            )}
            {timeDistribution.map((t, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: '#ffffff', fontWeight: 600 }}>{t.range}</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--admin-text-muted)' }}>{TIME_RANGE_LABEL[t.range] ?? ''}</span>
                  </div>
                  <span
                    style={{
                      fontWeight: 800,
                      color: t.rate >= 40 ? '#ff70a6' : t.rate >= 20 ? '#80f3ff' : 'var(--admin-text-secondary)',
                      fontSize: '0.85rem',
                    }}
                  >
                    {t.rate}%
                  </span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '7px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${t.rate}%`,
                      height: '100%',
                      borderRadius: '4px',
                      background: t.rate >= 40
                        ? 'linear-gradient(90deg, #aa26da, #ff70a6)'
                        : 'linear-gradient(90deg, #aa26da, #80f3ff)',
                      boxShadow: t.rate >= 40
                        ? '0 0 10px rgba(255, 112, 166, 0.4)'
                        : '0 0 10px rgba(128, 243, 255, 0.3)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: '#5c566a' }}>
        <FileText size={13} />
        数据直连生产库实时聚合，刷新页面或重进页面即可看到最新结果。
      </div>

      <style>{`
        @keyframes admin-spin-kf { to { transform: rotate(360deg); } }
        .admin-spin { animation: admin-spin-kf 1s linear infinite; }
      `}</style>
    </div>
  );
};
