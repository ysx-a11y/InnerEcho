// @vitest-environment happy-dom
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PortalView } from './PortalView';

const baseProps = {
  onGoToBasicInfo: vi.fn(),
  onOpenBanks: vi.fn(),
  onOpenTasks: vi.fn(),
  onOpenCards: vi.fn(),
  onOpenAstrolabe: vi.fn(),
};

describe('PortalView 审讯室入口', () => {
  it('游客看不到审讯室门', () => {
    render(<PortalView {...baseProps} onOpenInterrogation={vi.fn()} />);
    expect(screen.queryByText('审讯室')).toBeNull();
  });

  it('已登录用户看到门，点击进入审讯室', () => {
    const onOpenInterrogation = vi.fn();
    render(
      <PortalView
        {...baseProps}
        user={{ id: 'usr_test_interrogation', email: 'itr@example.com' }}
        onOpenInterrogation={onOpenInterrogation}
      />
    );

    // 测试功能标注必须在门牌上，避免被当成正式能力。
    expect(screen.getByText('审讯室')).toBeDefined();
    expect(screen.getByText('测试功能')).toBeDefined();

    fireEvent.click(screen.getByText('审讯室'));
    expect(onOpenInterrogation).toHaveBeenCalledTimes(1);
  });
});
