// @vitest-environment happy-dom
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InterrogationClosedModal } from './InterrogationClosedModal';

describe('InterrogationClosedModal', () => {
  it('关闭状态下不渲染任何内容', () => {
    render(<InterrogationClosedModal isOpen={false} onClose={() => {}} />);
    expect(screen.queryByText('暂未开启')).toBeNull();
  });

  it('打开时只给出提示与关闭按钮，点击后回调关闭', () => {
    const onClose = vi.fn();
    render(<InterrogationClosedModal isOpen onClose={onClose} />);

    expect(screen.getByText('暂未开启')).toBeTruthy();
    fireEvent.click(screen.getByText('知道了'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
