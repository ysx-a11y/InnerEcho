// @vitest-environment happy-dom
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WelcomeView } from './WelcomeView';

describe('WelcomeView Landing Experience', () => {
  it('renders login and guest entry buttons for unauthenticated visitors', () => {
    const onStart = vi.fn();

    render(<WelcomeView onStart={onStart} user={null} />);

    expect(screen.getByText('镜界自白 · 匿名反差人格问卷')).toBeDefined();
    expect(screen.getByText('四维心流矩阵')).toBeDefined();
    expect(screen.getByText('登录')).toBeDefined();

    const guestBtn = screen.getByText('游客');
    expect(guestBtn).toBeDefined();
    fireEvent.click(guestBtn);
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('renders continue button when user is already logged in', () => {
    const onContinue = vi.fn();
    const onStart = vi.fn();

    render(
      <WelcomeView
        onStart={onStart}
        onContinue={onContinue}
        user={{ id: 'u_test', email: 'user@example.com' }}
      />
    );

    expect(screen.getByText('已登录为 user@example.com')).toBeDefined();
    const continueBtn = screen.getByText('继续使用');
    expect(continueBtn).toBeDefined();
    fireEvent.click(continueBtn);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
