// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RetestComparisonModal } from './RetestComparisonModal';

const attempts = [
  {
    dossierId: 'dos_first',
    createdAt: '2026-08-16T07:08:46.830Z',
    depthRating: 'medium',
    archetypeTitle: '暗光萌芽者',
    archetypeSubtitle: '初识暗面',
    disparityScore: 55,
    dominanceIndex: 40,
    submissionIndex: 50,
    restraintIndex: 70,
    sensoryThreshold: 30,
    selectedShadowTags: ['角色互换'],
  },
  {
    dossierId: 'dos_latest',
    createdAt: '2026-10-04T14:56:07.495Z',
    depthRating: 'deep',
    archetypeTitle: '暗夜破局者',
    archetypeSubtitle: '边界已移动',
    disparityScore: 78,
    dominanceIndex: 40,
    submissionIndex: 66,
    restraintIndex: 52,
    sensoryThreshold: null,
    selectedShadowTags: ['角色互换', '深度臣服'],
  },
];

function mockFetchOnce(payload: unknown, ok = true, status = 200) {
  vi.stubGlobal('fetch', vi.fn(() =>
    Promise.resolve({
      ok,
      status,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve(payload),
    })
  ));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('RetestComparisonModal', () => {
  it('renders the first-versus-latest comparison', async () => {
    mockFetchOnce({ success: true, bankId: 'standard_bdsm_50', bankTitle: '标准卷宗', attempts });

    render(
      <RetestComparisonModal bankId="standard_bdsm_50" bankTitle="标准卷宗" onClose={vi.fn()} />
    );

    await waitFor(() => expect(screen.getByText('暗夜破局者')).toBeTruthy());
    expect(screen.getByText('暗光萌芽者')).toBeTruthy();
    // 称号发生变化时给出标记
    expect(screen.getByText('已变化')).toBeTruthy();
    // 反差张力 55 → 78，差值 +23
    expect(screen.getByText('+23')).toBeTruthy();
    // 支配指数 40 → 40，持平
    expect(screen.getAllByText('持平').length).toBeGreaterThan(0);
    // 新增标签单独标记
    expect(screen.getByText('+ 深度臣服')).toBeTruthy();
    // 深度等级变化（"→ 深度" 在子元素里，按容器整体文本断言）
    expect(screen.getByText('深度等级：中度').parentElement?.textContent).toContain('深度');
  });

  it('explains when the bank only has one attempt', async () => {
    mockFetchOnce({ success: true, bankId: 'bank_x', bankTitle: '单次卷宗', attempts: [attempts[0]] });

    render(<RetestComparisonModal bankId="bank_x" bankTitle="单次卷宗" onClose={vi.fn()} />);

    await waitFor(() => expect(screen.getByText(/只有一次记录/)).toBeTruthy());
  });

  it('shows an error state when loading fails', async () => {
    mockFetchOnce({ success: false, message: '该题库暂无作答记录' }, false, 404);

    render(<RetestComparisonModal bankId="bank_y" bankTitle="未知卷宗" onClose={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('该题库暂无作答记录')).toBeTruthy());
  });
});
