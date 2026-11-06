import React, { useState, useEffect } from 'react';
import {
  X, User, Lock, LogIn, UserPlus,
  Eye, EyeOff, KeyRound, ChevronLeft, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { getOrCreateDeviceId, evaluatePasswordStrength } from '../utils/deviceId';
import { apiPost, ApiError } from '../utils/api';
import type { DossierSummaryContract } from '../../shared/apiContracts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: { id: string; email: string } | null;
  onLoginSuccess: (user: { id: string; email: string }, latestDossier?: DossierSummaryContract) => void;
  onLogout: () => void;
  onRestoreDossier?: (summary: DossierSummaryContract) => void;
  initialMode?: boolean;
  /** 已登录态点击"继续使用"时触发（通常导航到题库选择页）。未传则退化为 onClose。 */
  onContinue?: () => void;
  /** 打开时直接进入的子面板（用于从个人页跳到修改密码/注销）。 */
  initialPanel?: Panel;
}

type Panel = 'main' | 'change_password' | 'delete_account';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  user,
  onLoginSuccess,
  onLogout,
  onRestoreDossier,
  initialMode = false,
  onContinue,
  initialPanel = 'main',
}) => {
  const [isRegisterMode, setIsRegisterMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 已登录态：子面板
  const [panel, setPanel] = useState<Panel>('main');
  // 登录/注册刚成功 — 显示成功提示而非立即切换到已登录面板（避免瞬时闪现"继续使用"）
  const [justLoggedIn, setJustLoggedIn] = useState(false);

  // 修改密码表单
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  // 注销账号：邮箱确认
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // 弹窗打开时同步模式 (登录/注册) 与初始面板
  useEffect(() => {
    if (isOpen) {
      setIsRegisterMode(initialMode);
      setErrorMsg('');
      setSuccessMsg('');
      setJustLoggedIn(false);
      setPanel(initialPanel);
    } else {
      // 关闭时清空敏感字段
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setDeleteConfirmEmail('');
      setShowPassword(false);
      setShowOld(false);
      setShowNew(false);
      setShowConfirm(false);
    }
  }, [isOpen, initialMode, initialPanel]);

  // 切换用户时重置 panel
  useEffect(() => {
    if (!user) {
      setPanel('main');
    }
  }, [user]);

  if (!isOpen) return null;

  const passwordStrength = evaluatePasswordStrength(password);
  const newPasswordStrength = evaluatePasswordStrength(newPassword);

  const handleGenerateQuickAccount = () => {
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const newUsername = `echo_user_${randomSuffix}`;
    setEmail(newUsername);
    navigator.clipboard.writeText(newUsername).catch(() => {});
    setSuccessMsg('已自动为您生成随机账号并复制到剪贴板，请设置您的密码。');
    setErrorMsg('');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim()) {
      setErrorMsg('请填写账号名');
      return;
    }

    if (password.length < 8) {
      setErrorMsg('密码至少需要 8 位（字母+数字）');
      return;
    }

    setLoading(true);
    const endpoint = isRegisterMode ? '/api/auth/register' : '/api/auth/login';
    const deviceId = getOrCreateDeviceId();

    try {
      const { data } = await apiPost<{ success: boolean; user?: { id: string; email: string }; message?: string; latestDossier?: DossierSummaryContract }>(
        endpoint,
        { email: email.trim(), password: password.trim() },
        { headers: { 'X-Device-Id': deviceId } }
      );
      if (data.success && data.user) {
        setSuccessMsg(data.message || (isRegisterMode ? '注册成功！' : '登录成功！'));
        setJustLoggedIn(true);
        onLoginSuccess(data.user, data.latestDossier);

        if (data.latestDossier && onRestoreDossier) {
          // 轻量摘要直接回传：解锁基础信息/标记已完成即可，报告全文按需拉取
          onRestoreDossier(data.latestDossier);
        }

        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        setErrorMsg(data.message || '请求失败，请重试');
      }
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : '网络请求异常，请检查后端服务是否启动');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!oldPassword || !newPassword || !confirmPassword) {
      setErrorMsg('请填写全部密码字段');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMsg('新密码至少需要 8 位');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('两次输入的新密码不一致');
      return;
    }
    if (oldPassword === newPassword) {
      setErrorMsg('新密码不能与旧密码相同');
      return;
    }

    setPwLoading(true);
    try {
      const { data } = await apiPost<{ success: boolean; message?: string }>(
        '/api/auth/change-password',
        { oldPassword, newPassword, confirmPassword },
        { onUnauthorized: () => { setErrorMsg('登录已失效，请重新登录'); onLogout(); } }
      );
      if (data.success) {
        setSuccessMsg(data.message || '密码修改成功');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setPanel('main');
          setSuccessMsg('');
        }, 1500);
      } else {
        setErrorMsg(data.message || '修改失败');
      }
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : '网络请求异常');
    } finally {
      setPwLoading(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!deleteConfirmEmail.trim()) {
      setErrorMsg('请输入账号名以确认注销');
      return;
    }
    if (deleteConfirmEmail.trim().toLowerCase() !== user?.email) {
      setErrorMsg('邮箱不匹配，已拒绝注销');
      return;
    }

    setDeleteLoading(true);
    try {
      const { data } = await apiPost<{ success: boolean; message?: string }>(
        '/api/auth/delete-account',
        { confirmEmail: deleteConfirmEmail.trim() },
        { onUnauthorized: () => { setErrorMsg('登录已失效，请重新登录'); onLogout(); } }
      );
      if (data.success) {
        setSuccessMsg(data.message || '账号已注销');
        setTimeout(() => {
          onLogout();
          onClose();
        }, 1200);
      } else {
        setErrorMsg(data.message || '注销失败');
      }
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : '网络请求异常');
    } finally {
      setDeleteLoading(false);
    }
  };

  // 退出登录：父组件 (Header) 已封装后端 /logout 调用 + 前端状态清空 + 关闭弹窗
  // AuthModal 这里直接调用 props.onLogout 即可，避免重复请求

  // ============ 已登录态：修改密码子面板 ============
  const renderChangePasswordPanel = () => (
    <form onSubmit={handleChangePassword}>
      <button
        type="button"
        onClick={() => { setPanel('main'); setErrorMsg(''); setSuccessMsg(''); }}
        style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', marginBottom: '0.8rem', padding: 0 }}
      >
        <ChevronLeft size={14} />
        <span>返回个人中心</span>
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
        <KeyRound size={20} color="#ff70a6" />
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }} className="text-gradient">修改密码</h3>
      </div>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1.1rem', lineHeight: 1.5 }}>
        修改成功后，<b style={{ color: '#ff70a6' }}>其他设备的登录态将立即失效</b>，当前设备保持登录。
      </p>

      {errorMsg && <div style={errorBoxStyle}>{errorMsg}</div>}
      {successMsg && <div style={successBoxStyle}>{successMsg}</div>}

      <PasswordField
        label="旧密码"
        value={oldPassword}
        onChange={setOldPassword}
        show={showOld}
        onToggle={() => setShowOld(!showOld)}
        autocomplete="current-password"
        placeholder="请输入当前密码"
      />
      <PasswordField
        label="新密码"
        value={newPassword}
        onChange={setNewPassword}
        show={showNew}
        onToggle={() => setShowNew(!showNew)}
        autocomplete="new-password"
        placeholder="至少 8 位，含字母与数字"
        strength={newPasswordStrength}
      />
      <PasswordField
        label="确认新密码"
        value={confirmPassword}
        onChange={setConfirmPassword}
        show={showConfirm}
        onToggle={() => setShowConfirm(!showConfirm)}
        autocomplete="new-password"
        placeholder="再次输入新密码"
      />

      <button
        type="submit"
        disabled={pwLoading}
        className="btn-glow"
        style={{ width: '100%', padding: '0.7rem', fontSize: '0.88rem', marginTop: '0.4rem', opacity: pwLoading ? 0.7 : 1 }}
      >
        {pwLoading ? '处理中...' : '确认修改'}
      </button>
    </form>
  );

  // ============ 已登录态：注销账号子面板 ============
  const renderDeleteAccountPanel = () => (
    <form onSubmit={handleDeleteAccount}>
      <button
        type="button"
        onClick={() => { setPanel('main'); setErrorMsg(''); setSuccessMsg(''); setDeleteConfirmEmail(''); }}
        style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', marginBottom: '0.8rem', padding: 0 }}
      >
        <ChevronLeft size={14} />
        <span>返回个人中心</span>
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
        <AlertTriangle size={20} color="#fb923c" />
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fb923c' }}>注销账号</h3>
      </div>

      <div style={{ background: 'rgba(251, 146, 60, 0.08)', border: '1px solid rgba(251, 146, 60, 0.3)', borderRadius: 12, padding: '0.85rem 1rem', marginBottom: '1rem' }}>
        <ul style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.7, paddingLeft: '1rem', margin: 0 }}>
          <li>账号注销后，您将无法再使用该账号登录系统；</li>
          <li>注销完成后，我们会停止为该账号提供服务，相关信息将按产品规则妥善处理。</li>
        </ul>
      </div>

      {errorMsg && <div style={errorBoxStyle}>{errorMsg}</div>}
      {successMsg && <div style={successBoxStyle}>{successMsg}</div>}

      <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        <User size={14} color="#fb923c" />
        <span>请输入您的账号名以确认：</span>
      </label>
      <input
        type="text"
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        placeholder={user?.email ?? ''}
        value={deleteConfirmEmail}
        onChange={(e) => setDeleteConfirmEmail(e.target.value)}
        style={inputStyle('#fb923c')}
      />

      <button
        type="submit"
        disabled={deleteLoading}
        style={{
          width: '100%',
          padding: '0.7rem',
          fontSize: '0.88rem',
          marginTop: '1rem',
          background: 'linear-gradient(135deg, #ef4444 0%, #fb923c 100%)',
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          cursor: deleteLoading ? 'wait' : 'pointer',
          opacity: deleteLoading ? 0.7 : 1,
          fontWeight: 600,
          boxShadow: '0 6px 20px rgba(239, 68, 68, 0.35)',
        }}
      >
        {deleteLoading ? '处理中...' : '我已了解，确认注销'}
      </button>
    </form>
  );

  // ============ 已登录态：主面板（精简 — 仅账号 + 继续使用） ============
  // 账号管理（修改密码/退出/注销/统计）已移至 PersonalView 个人页面
  const renderLoggedInMain = () => {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.2rem' }}>
          <User size={22} color="#ff70a6" />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }} className="text-gradient">
            已登录
          </h3>
        </div>

        {/* 账号信息（仅邮箱，无头像/统计/云端标识） */}
        <div style={{ background: 'rgba(255, 51, 119, 0.06)', border: '1px solid rgba(255, 112, 166, 0.2)', borderRadius: 12, padding: '1rem', marginBottom: '1.2rem' }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>当前账号</div>
          <div style={{ fontSize: '0.96rem', fontWeight: 600, color: '#fff', wordBreak: 'break-all' }}>
            {user?.email}
          </div>
        </div>

        <button
          onClick={() => { onContinue?.(); onClose(); }}
          className="btn-glow"
          style={{ width: '100%', padding: '0.7rem', fontSize: '0.9rem' }}
        >
          <span>继续使用</span>
        </button>
      </div>
    );
  };

  // ============ 未登录态：登录/注册表单 ============
  const renderAuthForm = () => (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
        {isRegisterMode ? <UserPlus size={20} color="#ff70a6" /> : <LogIn size={20} color="#ff70a6" />}
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }} className="text-gradient">
          {isRegisterMode ? '注册新账号' : '登录《镜界自白》'}
        </h3>
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
        {isRegisterMode
          ? '无需真实邮箱验证，填入唯一账号名即可注册并登录。'
          : '登录后可自动恢复您上一次生成的专属私密诊断卷宗。'}
      </p>

      {errorMsg && <div style={errorBoxStyle}>{errorMsg}</div>}
      {successMsg && <div style={successBoxStyle}>{successMsg}</div>}

      {/* Account Field */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
          <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem', margin: 0 }}>
            <User size={14} color="#ff70a6" />
            <span>账号名：</span>
          </label>
          {isRegisterMode && (
            <button
              type="button"
              onClick={handleGenerateQuickAccount}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ff70a6',
                fontSize: '0.75rem',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: 0
              }}
            >
              一键生成随机账号
            </button>
          )}
        </div>
        <input
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder={isRegisterMode ? "例如：my_secret_account" : "请输入您的账号名"}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle()}
        />
      </div>

      {/* Password Field */}
      <div style={{ marginBottom: '1.35rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
          <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Lock size={14} color="#e100ff" />
            <span>设置密码：</span>
          </label>
          {password.length > 0 && (
            <span style={{ fontSize: '0.72rem', color: passwordStrength.color, fontWeight: 600 }}>
              {passwordStrength.label}
            </span>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <input
            type={showPassword ? 'text' : 'password'}
            autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
            placeholder="请输入密码（至少 8 位，含字母与数字）"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              ...inputStyle(password.length > 0 ? passwordStrength.color : undefined),
              paddingRight: '2.4rem',
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? '隐藏密码' : '显示密码'}
            style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: '0.65rem', display: 'flex', alignItems: 'center',
            }}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-glow"
        style={{ width: '100%', padding: '0.7rem', fontSize: '0.9rem', marginBottom: '1rem', opacity: loading ? 0.7 : 1 }}
      >
        <span>{loading ? '处理中...' : isRegisterMode ? '立即注册并登录' : '登 录'}</span>
      </button>

      <div style={{ textAlign: 'center' }}>
        <button
          type="button"
          onClick={() => {
            setIsRegisterMode(!isRegisterMode);
            setErrorMsg('');
            setSuccessMsg('');
            setShowPassword(false);
          }}
          style={{
            background: 'transparent', border: 'none', color: '#ff70a6',
            fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline',
          }}
        >
          {isRegisterMode ? '已有账号？直接登录' : '没有账号？直接注册一个'}
        </button>
      </div>
    </form>
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
      className="animate-fade-in"
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: 440,
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '1.75rem 1.5rem',
          position: 'relative',
          border: '1px solid rgba(255, 112, 166, 0.3)',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.8), 0 0 30px rgba(255, 51, 119, 0.25)',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '1rem', right: '1rem',
            background: 'transparent', border: 'none', color: 'var(--text-secondary)',
            cursor: 'pointer', padding: '0.2rem', zIndex: 2,
          }}
        >
          <X size={18} />
        </button>

        {/* Modal Content */}
        {justLoggedIn ? (
          // 登录/注册成功 — 显示成功提示，800ms 后自动关闭
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(34, 197, 94, 0.12)',
              border: '2px solid rgba(34, 197, 94, 0.3)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '1rem',
            }}>
              <CheckCircle2 size={28} color="#22c55e" />
            </div>
            <p style={{ fontSize: '1rem', fontWeight: 600, color: '#22c55e' }}>
              {successMsg || '操作成功'}
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
              正在进入...
            </p>
          </div>
        ) : user ? (
          panel === 'change_password' ? renderChangePasswordPanel()
          : panel === 'delete_account' ? renderDeleteAccountPanel()
          : renderLoggedInMain()
        ) : (
          renderAuthForm()
        )}
      </div>
    </div>
  );
};

// ============ 复用小组件 ============

const PasswordField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  autocomplete: string;
  placeholder?: string;
  strength?: { label: string; color: string };
}> = ({ label, value, onChange, show, onToggle, autocomplete, placeholder, strength }) => (
  <div style={{ marginBottom: '0.9rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
      <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        <Lock size={14} color="#e100ff" />
        <span>{label}：</span>
      </label>
      {strength && value.length > 0 && (
        <span style={{ fontSize: '0.72rem', color: strength.color, fontWeight: 600 }}>{strength.label}</span>
      )}
    </div>
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        autoComplete={autocomplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle(), paddingRight: '2.4rem' }}
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={show ? '隐藏密码' : '显示密码'}
        style={{
          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--text-muted)', padding: '0.65rem', display: 'flex', alignItems: 'center',
        }}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  </div>
);

// ============ 样式常量 ============

const inputStyle = (accent?: string): React.CSSProperties => ({
  width: '100%',
  background: 'rgba(255, 255, 255, 0.05)',
  border: `1px solid ${accent || 'rgba(255, 112, 166, 0.3)'}`,
  borderRadius: 10,
  padding: '0.65rem 0.85rem',
  color: '#fff',
  fontSize: '0.88rem',
  outline: 'none',
  transition: 'border-color 0.25s ease',
  boxSizing: 'border-box' as const,
});

const errorBoxStyle: React.CSSProperties = {
  background: 'rgba(239, 68, 68, 0.15)',
  border: '1px solid rgba(239, 68, 68, 0.3)',
  color: '#f87171',
  padding: '0.55rem 0.8rem',
  borderRadius: 8,
  fontSize: '0.8rem',
  marginBottom: '1rem',
};

const successBoxStyle: React.CSSProperties = {
  background: 'rgba(74, 222, 128, 0.15)',
  border: '1px solid rgba(74, 222, 128, 0.3)',
  color: '#4ade80',
  padding: '0.55rem 0.8rem',
  borderRadius: 8,
  fontSize: '0.8rem',
  marginBottom: '1rem',
};
