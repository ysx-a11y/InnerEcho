import React, { Component, ErrorInfo, ReactNode } from 'react';
import { reportClientError } from '../utils/clientErrorReport';

interface ErrorBoundaryProps {
  children: ReactNode;
  resetKey?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]', error, errorInfo);
    reportClientError(error, { componentStack: errorInfo.componentStack ?? undefined });
  }

  public componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  private handleReload = () => {
    const url = new URL('/', window.location.origin);
    url.searchParams.set('__recover', Date.now().toString());
    window.location.replace(url);
  };

  private handleGoHome = () => {
    if (this.props.onReset) {
      try {
        this.props.onReset();
      } catch (e) {
        console.error('[ErrorBoundary reset callback failed]', e);
      }
    }
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      const isOnline = navigator.onLine;

      return (
        <div
          role="alert"
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '55vh',
            padding: '2rem 1.25rem',
            boxSizing: 'border-box',
          }}
        >
          <div
            className="glass-card glass-card-glow"
            style={{
              width: '100%',
              maxWidth: 480,
              padding: '2rem 1.75rem',
              borderRadius: 24,
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxSizing: 'border-box',
              background: 'rgba(30, 12, 38, 0.85)',
              border: '1px solid rgba(255, 112, 166, 0.3)',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'rgba(255, 51, 119, 0.08)',
                border: '1.5px solid rgba(255, 112, 166, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem',
                boxShadow: '0 0 20px rgba(255, 51, 119, 0.2)',
              }}
            >
              <span style={{ fontSize: '1.5rem', color: '#ff70a6' }}>⚠️</span>
            </div>

            <h3
              style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                color: '#fff',
                marginBottom: '0.75rem',
                fontFamily: 'var(--font-heading)',
              }}
              className="text-gradient"
            >
              页面加载失败
            </h3>

            <p
              style={{
                fontSize: '0.86rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.55,
                marginBottom: '2rem',
              }}
            >
              {!isOnline
                ? '检测到您的网络连接已断开，请检查网络设置后重试。'
                : '加载页面资源时发生异常，这可能是由于临时网络波动或资源加载超时导致的。'}
            </p>

            {this.state.error?.message && (
              <p
                style={{
                  fontSize: '0.72rem',
                  color: 'rgba(255,255,255,0.4)',
                  wordBreak: 'break-all',
                  margin: '-1rem 0 1rem',
                }}
              >
                错误信息：{this.state.error.message}
              </p>
            )}

            <div
              style={{
                display: 'flex',
                gap: '0.85rem',
                width: '100%',
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                onClick={this.handleReload}
                className="btn-glow"
                style={{
                  padding: '0.65rem 1.5rem',
                  fontSize: '0.85rem',
                  borderRadius: 20,
                  flex: 1,
                  minWidth: 120,
                  cursor: 'pointer',
                }}
              >
                刷新重试
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="btn-secondary"
                style={{
                  padding: '0.65rem 1.5rem',
                  fontSize: '0.85rem',
                  borderRadius: 20,
                  flex: 1,
                  minWidth: 120,
                  cursor: 'pointer',
                }}
              >
                返回首页
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
