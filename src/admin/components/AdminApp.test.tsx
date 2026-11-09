// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import AdminApp from '../AdminApp';
import { ThemeProvider } from './theme-provider';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('AdminApp render test', () => {
  it('renders logged in view without throwing error', () => {
    sessionStorage.setItem('innerecho_admin_token', 'test-token');
    const { container } = render(
      <ThemeProvider>
        <AdminApp />
      </ThemeProvider>
    );
    expect(container).toBeDefined();
    expect(container.querySelector('[data-slot="sidebar-wrapper"]')).not.toBeNull();
  });

  it('opens Chinese Theme Settings drawer (ConfigDrawer) and updates theme/layout preferences', () => {
    sessionStorage.setItem('innerecho_admin_token', 'test-token');
    render(
      <ThemeProvider>
        <AdminApp />
      </ThemeProvider>
    );

    const trigger = screen.getByRole('button', { name: '主题设置' });
    fireEvent.click(trigger);

    expect(screen.getByText('主题模式')).toBeTruthy();
    expect(screen.getByText('侧边栏样式')).toBeTruthy();
    expect(screen.getByText('布局模式')).toBeTruthy();
    expect(screen.getByText('排版方向')).toBeTruthy();

    fireEvent.click(screen.getByRole('radio', { name: '暗夜深色' }));
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    fireEvent.click(screen.getByRole('radio', { name: '从右到左' }));
    expect(document.documentElement.dir).toBe('rtl');

    fireEvent.click(screen.getByRole('button', { name: '恢复默认设置' }));
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('renders login view when not logged in', () => {
    sessionStorage.removeItem('innerecho_admin_token');
    localStorage.removeItem('innerecho_admin_token_v2');
    const { container } = render(
      <ThemeProvider>
        <AdminApp />
      </ThemeProvider>
    );
    expect(container).toBeDefined();
    expect(container.querySelector('.admin-login')).not.toBeNull();
  });
});
