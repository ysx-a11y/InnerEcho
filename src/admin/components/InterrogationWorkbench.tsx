import React, { useCallback, useEffect, useState } from 'react';
import {
  Siren,
  RefreshCw,
  Save,
  MessageSquare,
  Clock,
  User,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { interrogationApi, formatTime } from '../adminApi';
import type { AdminInterrogationConfig, AdminInterrogationSession } from '../adminTypes';
import { AdminToast, type ToastMessage } from './ui/AdminToast';

const TURN_RANGE = { min: 1, max: 20 };
const INPUT_RANGE = { min: 64, max: 8000 };
const OUTPUT_RANGE = { min: 32, max: 2000 };
const PROMPT_LIMITS = { interrogatorPrompt: 4000, summaryPrompt: 1600 } as const;

const STATUS_LABEL: Record<string, string> = {
  active: '审讯中',
  exhausted: '已问完',
  summarized: '已总结',
};

const STATUS_COLOR: Record<string, string> = {
  active: '#ff70a6',
  exhausted: '#f59e0b',
  summarized: '#34d399',
};

export const InterrogationWorkbench: React.FC = () => {
  const [config, setConfig] = useState<AdminInterrogationConfig | null>(null);
  const [sessions, setSessions] = useState<AdminInterrogationSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', content: string) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, content }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [configRes, sessionsRes] = await Promise.all([
        interrogationApi.getConfig(),
        interrogationApi.listSessions(30),
      ]);
      if (configRes.success) setConfig(configRes.config);
      if (sessionsRes.success) setSessions(sessionsRes.items);
    } catch {
      addToast('error', '加载审讯室配置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const updateField = (key: 'maxTurns' | 'maxInputTokens' | 'maxOutputTokens', raw: string) => {
    if (!config) return;
    const value = Number(raw);
    setConfig({ ...config, [key]: Number.isFinite(value) ? value : 0 });
  };

  const updatePrompt = (key: 'interrogatorPrompt' | 'summaryPrompt', raw: string) => {
    if (!config) return;
    setConfig({ ...config, [key]: raw });
  };

  const validate = (): string | null => {
    if (!config) return '配置未加载';
    if (config.maxTurns < TURN_RANGE.min || config.maxTurns > TURN_RANGE.max) {
      return `对话轮数需在 ${TURN_RANGE.min}-${TURN_RANGE.max} 之间`;
    }
    if (config.maxInputTokens < INPUT_RANGE.min || config.maxInputTokens > INPUT_RANGE.max) {
      return `输入 token 需在 ${INPUT_RANGE.min}-${INPUT_RANGE.max} 之间`;
    }
    if (config.maxOutputTokens < OUTPUT_RANGE.min || config.maxOutputTokens > OUTPUT_RANGE.max) {
      return `输出 token 需在 ${OUTPUT_RANGE.min}-${OUTPUT_RANGE.max} 之间`;
    }
    if (config.interrogatorPrompt.length > PROMPT_LIMITS.interrogatorPrompt) {
      return `审讯者提示词不能超过 ${PROMPT_LIMITS.interrogatorPrompt} 个字符`;
    }
    if (config.summaryPrompt.length > PROMPT_LIMITS.summaryPrompt) {
      return `总结提示词不能超过 ${PROMPT_LIMITS.summaryPrompt} 个字符`;
    }
    return null;
  };

  const handleSave = async () => {
    if (!config) return;
    const error = validate();
    if (error) {
      addToast('error', error);
      return;
    }
    try {
      setSaving(true);
      const res = await interrogationApi.updateConfig({
        maxTurns: config.maxTurns,
        maxInputTokens: config.maxInputTokens,
        maxOutputTokens: config.maxOutputTokens,
        interrogatorPrompt: config.interrogatorPrompt,
        summaryPrompt: config.summaryPrompt,
      });
      if (res.success) {
        setConfig(res.config);
        addToast('success', '审讯室参数已保存，下一轮对话即刻生效');
      } else {
        addToast('error', '保存失败，请稍后重试');
      }
    } catch {
      addToast('error', '网络异常，保存失败');
    } finally {
      setSaving(false);
    }
  };

  /** 传空串让服务端回填默认文案，并立刻把返回的实际文本写回表单。 */
  const handleResetPrompt = async (key: 'interrogatorPrompt' | 'summaryPrompt') => {
    if (!config) return;
    try {
      setSaving(true);
      const res = await interrogationApi.updateConfig(
        key === 'interrogatorPrompt' ? { interrogatorPrompt: '' } : { summaryPrompt: '' },
      );
      if (res.success) {
        setConfig(res.config);
        addToast('success', key === 'interrogatorPrompt' ? '审讯者提示词已恢复默认' : '总结提示词已恢复默认');
      } else {
        addToast('error', '恢复默认失败，请稍后重试');
      }
    } catch {
      addToast('error', '网络异常，恢复失败');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.55rem 0.7rem',
    borderRadius: 10,
    border: '1px solid rgba(255, 112, 166, 0.22)',
    background: 'rgba(8, 3, 12, 0.65)',
    color: '#f5e9f3',
    fontSize: '0.86rem',
    outline: 'none',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="glass-card" style={{ padding: '1rem 1.1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <Siren size={18} color="#ff70a6" />
          <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '0.02em' }}>审讯室 · 测试功能</span>
          <span
            style={{
              fontSize: '0.62rem',
              padding: '1px 7px',
              borderRadius: 999,
              border: '1px solid rgba(255, 112, 166, 0.5)',
              color: '#ffb0c4',
              background: 'rgba(255, 112, 166, 0.1)',
              fontWeight: 700,
            }}
          >
            实验
          </span>
          <button
            type="button"
            className="admin-button"
            onClick={loadData}
            disabled={loading}
            style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={13} className={loading ? 'admin-spin' : undefined} />
            刷新
          </button>
        </div>
        <p style={{ margin: '0.55rem 0 0', fontSize: '0.78rem', color: 'rgba(245, 233, 243, 0.62)', lineHeight: 1.6 }}>
          用户在前端的审讯室最多交互 <b>{config?.maxTurns ?? 5}</b> 轮，之后显示「暂未开放」。这里的输入 / 输出 token
          预算是每轮的成本护栏：输入超预算直接拒绝，输出超预算会被截断。审讯者与总结的提示词也在本页维护，保存后下一轮对话即刻生效。
        </p>
      </div>

      {loading && !config ? (
        <div className="glass-card" style={{ padding: '1.6rem', textAlign: 'center', color: 'rgba(245, 233, 243, 0.6)' }}>
          <RefreshCw size={18} className="admin-spin" /> 正在读取配置…
        </div>
      ) : (
        <div className="glass-card" style={{ padding: '1rem 1.1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.85rem' }}>
            <Sparkles size={15} color="#ff70a6" />
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>对话参数</span>
            <span style={{ fontSize: '0.7rem', color: 'rgba(245, 233, 243, 0.5)' }}>
              改完保存即可，无需发版
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: '0.75rem', color: 'rgba(245, 233, 243, 0.72)' }}>
                对话轮数上限（{TURN_RANGE.min}-{TURN_RANGE.max}）
              </span>
              <input
                type="number"
                min={TURN_RANGE.min}
                max={TURN_RANGE.max}
                value={config?.maxTurns ?? ''}
                onChange={(event) => updateField('maxTurns', event.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: '0.75rem', color: 'rgba(245, 233, 243, 0.72)' }}>
                允许输入 token（{INPUT_RANGE.min}-{INPUT_RANGE.max}）
              </span>
              <input
                type="number"
                min={INPUT_RANGE.min}
                max={INPUT_RANGE.max}
                step={64}
                value={config?.maxInputTokens ?? ''}
                onChange={(event) => updateField('maxInputTokens', event.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: '0.75rem', color: 'rgba(245, 233, 243, 0.72)' }}>
                允许输出 token（{OUTPUT_RANGE.min}-{OUTPUT_RANGE.max}）
              </span>
              <input
                type="number"
                min={OUTPUT_RANGE.min}
                max={OUTPUT_RANGE.max}
                step={32}
                value={config?.maxOutputTokens ?? ''}
                onChange={(event) => updateField('maxOutputTokens', event.target.value)}
                style={inputStyle}
              />
            </label>
          </div>
          <div style={{ marginTop: '1.15rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={15} color="#ff70a6" />
              <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>提示词</span>
              <span style={{ fontSize: '0.7rem', color: 'rgba(245, 233, 243, 0.5)' }}>留空 = 默认；保存后下一轮生效</span>
            </div>
            {([
              { key: 'interrogatorPrompt', label: '审讯者提示词', limit: PROMPT_LIMITS.interrogatorPrompt, rows: 10 },
              { key: 'summaryPrompt', label: '总结提示词', limit: PROMPT_LIMITS.summaryPrompt, rows: 4 },
            ] as const).map((item) => (
              <div key={item.key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(245, 233, 243, 0.72)' }}>{item.label}</span>
                  <span
                    style={{
                      fontSize: '0.66rem',
                      marginLeft: 'auto',
                      color:
                        config && config[item.key].length > item.limit
                          ? '#f87171'
                          : 'rgba(245, 233, 243, 0.4)',
                    }}
                  >
                    {config?.[item.key].length ?? 0} / {item.limit}
                  </span>
                  <button
                    type="button"
                    className="admin-button"
                    onClick={() => void handleResetPrompt(item.key)}
                    disabled={saving}
                    style={{ fontSize: '0.68rem', padding: '2px 8px' }}
                  >
                    恢复默认
                  </button>
                </div>
                <textarea
                  value={config?.[item.key] ?? ''}
                  onChange={(event) => updatePrompt(item.key, event.target.value)}
                  rows={item.rows}
                  spellCheck={false}
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit' }}
                />
              </div>
            ))}
            <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(245, 233, 243, 0.45)', lineHeight: 1.6 }}>
              审讯者提示词里的 {'{{dossier}}'} 会被替换成来访者档案；不写这个占位符也会自动把档案追加在末尾。
              提示词只影响之后的新对话，已经生成的回复与总结不会改写。
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.9rem' }}>
            <button
              type="button"
              className="admin-button admin-button-primary"
              onClick={handleSave}
              disabled={saving}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Save size={14} />
              {saving ? '保存中…' : '保存参数'}
            </button>
            {config?.updatedAt && (
              <span style={{ fontSize: '0.7rem', color: 'rgba(245, 233, 243, 0.45)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Clock size={12} /> 上次保存：{formatTime(config.updatedAt)}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="glass-card" style={{ padding: '1rem 1.1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.8rem' }}>
          <MessageSquare size={15} color="#ff70a6" />
          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>最近审讯会话</span>
          <span style={{ fontSize: '0.7rem', color: 'rgba(245, 233, 243, 0.5)' }}>只读，最近 30 条</span>
        </div>
        {sessions.length === 0 ? (
          <div style={{ padding: '1.2rem 0', textAlign: 'center', fontSize: '0.8rem', color: 'rgba(245, 233, 243, 0.45)' }}>
            <AlertCircle size={16} /> 还没有人进过审讯室
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ color: 'rgba(245, 233, 243, 0.55)', textAlign: 'left' }}>
                  <th style={{ padding: '0.45rem 0.4rem', fontWeight: 600 }}>用户</th>
                  <th style={{ padding: '0.45rem 0.4rem', fontWeight: 600 }}>状态</th>
                  <th style={{ padding: '0.45rem 0.4rem', fontWeight: 600 }}>轮次</th>
                  <th style={{ padding: '0.45rem 0.4rem', fontWeight: 600 }}>开始</th>
                  <th style={{ padding: '0.45rem 0.4rem', fontWeight: 600 }}>总结</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id} style={{ borderTop: '1px solid rgba(255, 112, 166, 0.12)' }}>
                    <td style={{ padding: '0.5rem 0.4rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <User size={12} color="rgba(245, 233, 243, 0.5)" />
                        {session.email || session.userId}
                      </span>
                    </td>
                    <td style={{ padding: '0.5rem 0.4rem', color: STATUS_COLOR[session.status] || '#f5e9f3' }}>
                      {STATUS_LABEL[session.status] || session.status}
                    </td>
                    <td style={{ padding: '0.5rem 0.4rem' }}>{session.turnCount}</td>
                    <td style={{ padding: '0.5rem 0.4rem', color: 'rgba(245, 233, 243, 0.7)' }}>
                      {formatTime(session.createdAt)}
                    </td>
                    <td style={{ padding: '0.5rem 0.4rem', color: 'rgba(245, 233, 243, 0.7)' }}>
                      {session.summaryGeneratedAt ? formatTime(session.summaryGeneratedAt) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AdminToast toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((toast) => toast.id !== id))} />
    </div>
  );
};
