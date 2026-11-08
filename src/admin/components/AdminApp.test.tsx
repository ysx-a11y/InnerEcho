// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import AdminApp from '../AdminApp';
import { MantineProvider, createTheme } from '@mantine/core';
import { ThemeProvider } from './theme-provider';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
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
    const theme = createTheme({});
    const { container } = render(
      <ThemeProvider>
        <MantineProvider theme={theme}>
          <AdminApp />
        </MantineProvider>
      </ThemeProvider>
    );
    expect(container).toBeDefined();
    expect(container.querySelector('[data-slot="sidebar-wrapper"]')).not.toBeNull();
  });

  it('renders login view when not logged in', () => {
    sessionStorage.removeItem('innerecho_admin_token');
    const theme = createTheme({});
    const { container } = render(
      <ThemeProvider>
        <MantineProvider theme={theme}>
          <AdminApp />
        </MantineProvider>
      </ThemeProvider>
    );
    expect(container).toBeDefined();
    expect(container.querySelector('.admin-login')).not.toBeNull();
  });
});
