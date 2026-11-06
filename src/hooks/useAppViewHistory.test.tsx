// @vitest-environment happy-dom
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  hashForView,
  refreshViewFromHash,
  useAppViewHistory,
  viewFromHash,
} from './useAppViewHistory';

function HistoryHarness() {
  const { viewState, navigateTo } = useAppViewHistory();
  return (
    <div>
      <output aria-label="current-view">{viewState}</output>
      <button onClick={() => navigateTo('bank_select')}>explore</button>
      <button onClick={() => navigateTo('tasks_view')}>tasks</button>
      <button onClick={() => navigateTo('dynamic_quiz')}>quiz</button>
    </div>
  );
}

describe('app view history', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '#/');
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 1;
    });
  });

  it('maps stable routes and rejects unknown hashes', () => {
    expect(hashForView('personal_view')).toBe('#/personal');
    expect(viewFromHash('#/tasks')).toBe('tasks_view');
    expect(viewFromHash('#/missing')).toBeNull();
  });

  it('restores stable pages after a document refresh', () => {
    window.history.replaceState(null, '', '#/tasks');
    render(<HistoryHarness />);

    expect(screen.getByLabelText('current-view').textContent).toBe('tasks_view');
    expect(window.location.hash).toBe('#/tasks');
  });

  it('falls back from in-memory workflow pages on refresh', () => {
    expect(refreshViewFromHash('#/quiz')).toBe('bank_select');
    expect(refreshViewFromHash('#/generating')).toBe('bank_select');
    expect(refreshViewFromHash('#/result')).toBe('bank_select');

    window.history.replaceState(null, '', '#/quiz');
    render(<HistoryHarness />);

    expect(screen.getByLabelText('current-view').textContent).toBe('bank_select');
    expect(window.location.hash).toBe('#/explore');
  });

  it('uses browser Back to restore the previous stable view', async () => {
    render(<HistoryHarness />);
    fireEvent.click(screen.getByText('explore'));
    fireEvent.click(screen.getByText('tasks'));
    expect(screen.getByLabelText('current-view').textContent).toBe('tasks_view');

    await act(async () => window.history.back());

    await waitFor(() => {
      expect(screen.getByLabelText('current-view').textContent).toBe('bank_select');
      expect(window.location.hash).toBe('#/explore');
    });
  });

  it('does not re-enter a discarded transient view through browser Forward', async () => {
    render(<HistoryHarness />);
    fireEvent.click(screen.getByText('explore'));
    fireEvent.click(screen.getByText('quiz'));
    expect(screen.getByLabelText('current-view').textContent).toBe('dynamic_quiz');

    await act(async () => window.history.back());
    await waitFor(() => expect(screen.getByLabelText('current-view').textContent).toBe('bank_select'));

    await act(async () => window.history.forward());
    await waitFor(() => {
      expect(screen.getByLabelText('current-view').textContent).toBe('bank_select');
      expect(window.location.hash).toBe('#/explore');
    });
  });
});
