import { getOrCreateDeviceId } from './deviceId';

/** 前端运行时错误上报（尽力而为，不影响主流程）。 */
export function reportClientError(
  error: unknown,
  info?: { componentStack?: string; view?: string }
): void {
  try {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? (error.stack ?? '') : '';
    void fetch('/api/client-error', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': getOrCreateDeviceId(),
      },
      credentials: 'include',
      body: JSON.stringify({
        message: message.slice(0, 1000),
        stack: stack.slice(0, 8000),
        url: window.location.href.slice(0, 500),
        view: info?.view ?? window.location.hash.slice(0, 100),
      }),
    }).catch(() => {});
  } catch {
    // 上报本身失败时静默，避免循环上报
  }
}
