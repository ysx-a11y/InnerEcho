import React, { useState } from 'react';
import { Eye, EyeOff, ShieldCheck, Lock } from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: (token: string) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('口令错误，请重新输入');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const token = password.trim();
    if (!token) return;

    setLoading(true);
    setError(false);
    setErrorMsg('口令错误，请重新输入');

    try {
      // 走后端常量时间校验（与 /api/admin/* 同源鉴权），不再使用前端写死口令
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
        },
        body: JSON.stringify({}),
      });
      if (res.status === 429) {
        setErrorMsg('尝试过于频繁，请稍后再试。');
        setError(true);
        return;
      }
      if (!res.ok) {
        setError(true);
        return;
      }
      onLoginSuccess(token);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="admin-login"
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 50% 50%, #150f28 0%, #08060d 100%)',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        padding: '1.5rem',
      }}
    >
      {/* 霓虹光晕背景特效 */}
      <div
        style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(128, 243, 255, 0.08) 0%, rgba(0, 0, 0, 0) 70%)',
          top: '-10%',
          left: '-10%',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 51, 119, 0.06) 0%, rgba(0, 0, 0, 0) 70%)',
          bottom: '-10%',
          right: '-10%',
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />

      {/* 登录卡片 */}
      <div
        className={`admin-login-card ${error ? 'shake-element' : ''}`}
        style={{
          width: '100%',
          maxWidth: '420px',
          background: 'rgba(20, 16, 32, 0.65)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '24px',
          padding: '2.5rem 2rem',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          zIndex: 10,
          boxSizing: 'border-box',
          transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
        }}
      >
        {/* Logo 与标题 */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #ff3377 0%, #aa26da 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.2rem auto',
              boxShadow: '0 0 20px rgba(225, 0, 255, 0.4)',
            }}
          >
            <ShieldCheck size={32} color="#ffffff" />
          </div>
          <h1
            style={{
              fontSize: '1.8rem',
              fontWeight: 800,
              letterSpacing: '0.1em',
              margin: '0 0 0.5rem 0',
              background: 'linear-gradient(to right, #ffffff, #cda4fc)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            镜界自白 · 管理中心
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#8d879e', margin: 0 }}>
            Mirror Confession Administration Control Panel
          </p>
        </div>

        {/* 登录表单 */}
        <form id="admin-login-form" autoComplete="on" onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label
              htmlFor="admin-username"
              style={{
                display: 'block',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                color: '#8d879e',
                marginBottom: '0.6rem',
                fontWeight: 600,
              }}
            >
              管理员身份 (Administrator)
            </label>
            <input
              id="admin-username"
              name="adminUsername"
              type="text"
              autoComplete="section-admin username"
              value="innerecho-admin"
              readOnly
              style={{
                width: '100%',
                background: 'rgba(10, 8, 18, 0.55)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '12px',
                color: '#a9a3b8',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label
              htmlFor="admin-security-token"
              style={{
                display: 'block',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                color: '#8d879e',
                marginBottom: '0.6rem',
                fontWeight: 600,
              }}
            >
              安全管理口令 (Security Password)
            </label>
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#655e75',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Lock size={16} />
              </div>
              <input
                id="admin-security-token"
                name="adminSecurityToken"
                autoComplete="section-admin current-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="请输入管理口令..."
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(false);
                }}
                disabled={loading}
                style={{
                  width: '100%',
                  background: 'rgba(10, 8, 18, 0.8)',
                  border: `1px solid ${error ? '#ff3377' : 'rgba(255, 255, 255, 0.1)'}`,
                  borderRadius: '12px',
                  padding: '12px 40px 12px 36px',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'all 0.2s ease',
                  fontFamily: 'inherit',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#655e75',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  outline: 'none',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {error && (
              <span
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  color: '#ff3377',
                  marginTop: '0.5rem',
                  fontWeight: 500,
                }}
              >
                {errorMsg}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: 'linear-gradient(90deg, #ff3377 0%, #aa26da 100%)',
              border: 'none',
              borderRadius: '12px',
              padding: '12px',
              color: '#ffffff',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(225, 0, 255, 0.25)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            {loading ? (
              <>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#ffffff',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                <span>口令校验中...</span>
              </>
            ) : (
              <span>进入管理大盘</span>
            )}
          </button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.7rem', color: '#524b61', margin: 0 }}>
            授权访问区域，所有操作将被安全遥测审计
          </p>
        </div>
      </div>

      {/* 页面内嵌关键样式：密码错误震颤和 loading 旋转 */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .shake-element {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
          border-color: #ff3377 !important;
          box-shadow: 0 0 15px rgba(255, 51, 119, 0.3) !important;
        }
      `}</style>
    </div>
  );
};
