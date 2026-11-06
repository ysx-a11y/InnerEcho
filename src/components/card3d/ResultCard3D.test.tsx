// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResultCard3D } from './ResultCard3D';
import { Card3DControls } from './Card3DControls';
import type { Card3DConfig } from './types';

const mockConfig: Card3DConfig = {
  title: '暗夜掌控者',
  subtitle: '潜意识深度解构',
  username: '测试倾诉者',
  occupation: '建筑设计师',
  personaTrait: '高冷精英',
  surfaceTrait: '日常严谨冷静',
  innerDesire: '渴望在绝对安全中放下防备',
  dominanceIndex: 85,
  submissionIndex: 25,
  restraintIndex: 78,
  sensoryThreshold: 90,
  opennessPercent: 92,
  opennessTrait: '深度坦诚',
  dossierId: 'ECHO-998811',
  imageUrl: 'https://example.com/test.jpg',
  imageScale: 1.0,
  imageX: 0,
  imageY: 0,
  imageFilter: 'none',
  holographic: true,
  isFlipped: false,
  contentMode: 'dimensions',
  stampType: 'ink-circle',
  stampTextTop: '深层回响 · 绝密卷宗',
  stampTextBottom: 'SUB-CONSCIOUS ARCHIVE',
  stampTextCenter: '暗夜掌控',
  stampColor: '#8a1515',
  stampClarity: 'medium',
  stampX: 75,
  stampY: 60,
  stampRotation: 15,
  stampScale: 1.0,
  accentColor: '#ff70a6',
};

describe('ResultCard3D Component', () => {
  it('renders front face with streamlined top capsule nickname and title correctly', () => {
    const exportRef = { current: null };
    const onChange = vi.fn();

    render(
      <ResultCard3D
        config={mockConfig}
        onChange={onChange}
        exportRef={exportRef}
      />
    );

    // Check streamlined top capsule
    expect(screen.getAllByText(/测试倾诉者/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/NO\. 998811/).length).toBeGreaterThanOrEqual(1);

    // Check main title & persona
    expect(screen.getByText('暗夜掌控者')).toBeTruthy();
    expect(screen.getAllByText(/建筑设计师/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/高冷精英/).length).toBeGreaterThanOrEqual(1);

    // Check 4-dimension mini badges
    expect(screen.getByText('DOM 支配')).toBeTruthy();
    expect(screen.getByText('85%')).toBeTruthy();
    expect(screen.getByText('SUB 臣服')).toBeTruthy();
    expect(screen.getByText('25%')).toBeTruthy();
    expect(screen.getByText('RES 克制')).toBeTruthy();
    expect(screen.getByText('78%')).toBeTruthy();
    expect(screen.getByText('SEN 感官')).toBeTruthy();
    expect(screen.getByText('90%')).toBeTruthy();

    // Check stamp center LLM assessment text
    expect(screen.getByText('暗夜掌控')).toBeTruthy();
  });

  it('renders desire quote mode when contentMode is desire', () => {
    const exportRef = { current: null };
    const onChange = vi.fn();

    render(
      <ResultCard3D
        config={{ ...mockConfig, contentMode: 'desire' }}
        onChange={onChange}
        exportRef={exportRef}
      />
    );

    expect(screen.getAllByText(/渴望在绝对安全中放下防备/).length).toBeGreaterThanOrEqual(1);
  });
});

describe('Card3DControls Component', () => {
  it('triggers flip, holographic, content mode and export callbacks', () => {
    const onChange = vi.fn();
    const onExport = vi.fn();
    const onReset = vi.fn();

    render(
      <Card3DControls
        config={mockConfig}
        onChange={onChange}
        onExport={onExport}
        isExporting={false}
        onResetToDefault={onReset}
      />
    );

    // Flip button
    const flipBtn = screen.getByText('翻转背面');
    fireEvent.click(flipBtn);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ isFlipped: true }));

    // Holographic button
    const holoBtn = screen.getByText('全息光斑');
    fireEvent.click(holoBtn);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ holographic: false }));

    // Content mode toggle
    const toggleBtn = screen.getByText('看自白金句');
    fireEvent.click(toggleBtn);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ contentMode: 'desire' }));

    // Export button
    const exportBtn = screen.getByText('保存卡片');
    fireEvent.click(exportBtn);
    expect(onExport).toHaveBeenCalled();
  });
});
