// @vitest-environment happy-dom
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SpecialPriceTaskModal } from './SpecialPriceTaskModal';

describe('SpecialPriceTaskModal', () => {
  it('prominently warns that nickname, confession and price will be public', () => {
    render(
      <SpecialPriceTaskModal
        isOpen
        onClose={vi.fn()}
        evaluation={null}
        countdown={0}
        canEdit
        submitting={false}
        onSubmit={vi.fn().mockResolvedValue({ ok: true })}
      />
    );

    const notice = screen.getByRole('note', { name: '公开展示提醒' });
    expect(notice.textContent).toContain('昵称、自白内容与身价将公开');
    expect(notice.textContent).toContain('请勿填写真实姓名、联系方式');
  });
});
