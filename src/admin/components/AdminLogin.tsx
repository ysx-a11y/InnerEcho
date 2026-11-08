import React, { useState } from 'react';
import { Eye, EyeOff, ShieldCheck, Lock, Loader2, Command } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface AdminLoginProps {
  onLoginSuccess: (token: string) => void;
}

/**
 * 管理端登录页（基于 shadcn/ui 官方 Authentication 分割屏标准设计）
 * 左侧暗夜奢华品牌沉浸区 + 右侧极简高安全凭据验证表单
 */
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
    <div className="admin-login relative min-h-screen w-full flex flex-col items-center justify-center lg:grid lg:max-w-none lg:grid-cols-2 lg:px-0 bg-background">
      {/* 左侧：暗夜奢华品牌氛围区（移动端隐藏，大屏展示） */}
      <div className="relative hidden h-full flex-col justify-between p-10 text-white lg:flex border-r border-border/40 overflow-hidden bg-zinc-950">
        {/* 背景光晕装饰 */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple-950/20 via-zinc-950 to-zinc-950 pointer-events-none" />
        <div className="absolute -top-32 -left-32 size-96 rounded-full bg-purple-600/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 size-96 rounded-full bg-rose-600/10 blur-3xl pointer-events-none" />

        {/* 顶部 Logo 标识 */}
        <div className="relative z-20 flex items-center gap-2.5 text-base font-semibold tracking-wide">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
            <Command className="size-4" />
          </div>
          <span>深层回响 InnerEcho · 生产管控平台</span>
        </div>

        {/* 底部经典引言卡片 */}
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-3 max-w-lg border-l-2 border-purple-500/50 pl-4 py-1">
            <p className="text-sm font-light leading-relaxed text-zinc-300">
              “深层的欲望从不喧哗，它只在暗夜回响。管控真实的表里，是触碰灵魂最深处秩序的起点。”
            </p>
            <footer className="text-xs text-zinc-500 tracking-wider">
              —— 《深层回响 · 系统管理控制台》
            </footer>
          </blockquote>
        </div>
      </div>

      {/* 右侧：官方标准认证表单区 */}
      <div className="p-4 sm:p-8 w-full flex items-center justify-center">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[380px]">
          {/* 移动端专属 Logo */}
          <div className="flex lg:hidden items-center justify-center gap-2 mb-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
              <ShieldCheck className="size-5" />
            </div>
            <span className="font-bold text-base text-foreground">深层回响 InnerEcho</span>
          </div>

          {/* 表单标题 */}
          <div className="flex flex-col space-y-1.5 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              控制台身份验证
            </h1>
            <p className="text-xs text-muted-foreground">
              请输入管理员专用安全口令以进入生产管控平台
            </p>
          </div>

          {/* 认证表单 */}
          <form id="admin-login-form" autoComplete="on" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="admin-username"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                管理员身份 (Administrator)
              </label>
              <Input
                id="admin-username"
                name="adminUsername"
                type="text"
                autoComplete="section-admin username"
                value="innerecho-admin"
                readOnly
                className="bg-muted/50 cursor-not-allowed font-mono text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="admin-security-token"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                安全管理口令 (Security Password)
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
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
                  className={`pl-9 pr-10 h-9 text-xs ${
                    error ? 'border-destructive focus-visible:ring-destructive' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {error && (
                <p className="text-xs font-medium text-destructive pt-0.5">{errorMsg}</p>
              )}
            </div>

            <Button type="submit" disabled={loading} className="w-full h-9 font-medium text-xs">
              {loading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-2" />
                  口令校验中...
                </>
              ) : (
                '登入控制台'
              )}
            </Button>
          </form>

          {/* 底部合规说明 */}
          <p className="px-4 text-center text-[11px] text-muted-foreground/80 leading-relaxed">
            企业级受限管控区域，所有认证与流转操作均受实时遥测与区块链级安全链审计。
          </p>
        </div>
      </div>
    </div>
  );
};
export default AdminLogin;
