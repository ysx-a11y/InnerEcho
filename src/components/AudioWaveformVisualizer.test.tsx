// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { AudioWaveformVisualizer } from './AudioWaveformVisualizer';

describe('AudioWaveformVisualizer', () => {
  it('renders nothing when inactive', () => {
    const { container } = render(
      <AudioWaveformVisualizer isActive={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders canvas element when active', () => {
    const { container } = render(
      <AudioWaveformVisualizer isActive={true} height={24} barCount={16} />
    );
    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
    expect(canvas?.getAttribute('height')).toBe('24');
  });
});
