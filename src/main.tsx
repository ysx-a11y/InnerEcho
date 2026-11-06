import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { scheduleProgressiveLoad } from './utils/progressiveLoading';
import { reportClientError } from './utils/clientErrorReport';

// 全局错误留痕：事件处理器/异步异常 ErrorBoundary 抓不到，这里统一上报
window.addEventListener('error', (event) => {
  reportClientError(event.error ?? event.message);
});
window.addEventListener('unhandledrejection', (event) => {
  reportClientError(event.reason);
});

// Monitoring and decorative Latin fonts are useful, but neither may delay the first usable screen.
const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
if (sentryDsn) {
  scheduleProgressiveLoad(() => {
    void import('@sentry/react').then((Sentry) => {
      Sentry.init({
        dsn: sentryDsn,
        environment: import.meta.env.MODE,
        sendDefaultPii: false,
        integrations: [Sentry.browserTracingIntegration()],
        tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
      });
    });
  }, 8_000);
}

// The mobile UI is predominantly Chinese and already uses the system CJK font.
// Keep the optional Latin display fonts desktop-only so they never compete with a mobile tap.
if (window.matchMedia('(min-width: 769px)').matches) {
  scheduleProgressiveLoad(() => {
    void import('./assets/fonts/fonts.css');
  }, 10_000);
}

const root = document.getElementById('root')!;
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

requestAnimationFrame(() => {
  const bootScreen = document.getElementById('app-boot');
  if (!bootScreen) return;
  bootScreen.classList.add('app-boot-ready');
  window.setTimeout(() => bootScreen.remove(), 220);
});

// 静态资源预缓存（Service Worker）：首访后 JS/CSS/字体进入本地缓存，二次访问秒开
// 仅缓存 /assets 与页面外壳，绝不缓存 /api 响应
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
