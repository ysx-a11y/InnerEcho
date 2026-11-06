// @vitest-environment happy-dom
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';
import { PersonalView } from './PersonalView';
import { TasksView } from './TasksView';
import { ChapterOneView } from './ChapterOneView';
import { apiGet, apiPost, ApiError } from '../utils/api';

vi.mock('../utils/clientErrorReport', () => ({
  reportClientError: vi.fn(),
}));

vi.mock('../utils/api', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    payload: unknown;
    constructor(message: string, status: number, payload?: unknown) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.payload = payload;
    }
  }
}));

describe('ErrorBoundary', () => {
  it('catches render errors and shows restore interface', () => {
    const BuggyComponent = () => {
      throw new Error('Test Render Error');
    };

    render(
      <ErrorBoundary onReset={() => {}}>
        <BuggyComponent />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).not.toBeNull();
    expect(screen.getByText('页面加载失败')).not.toBeNull();
  });

  it('runs the supplied safe-page callback when returning home', () => {
    const onReset = vi.fn();
    const BuggyComponent = () => {
      throw new Error('Test Render Error');
    };

    render(
      <ErrorBoundary onReset={onReset}>
        <BuggyComponent />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('返回首页'));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});

describe('PersonalView robustness', () => {
  const mockUser = { id: 'u1', email: 'test@example.com' };
  const mockData = { nickname: 'Tester', occupation: 'Teacher' };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('displays stats error and dossiers success independently', async () => {
    (apiGet as any).mockImplementation((url: string) => {
      if (url === '/api/auth/stats') {
        return Promise.reject(new Error('Stats failed'));
      }
      if (url === '/api/dossiers') {
        return Promise.resolve({
          data: {
            success: true,
            dossiers: [
              { id: 'd1', bankIds: ['bank-a'], createdAt: '2026-08-13T06:00:00Z' }
            ]
          }
        });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    render(
      <PersonalView
        data={mockData}
        user={mockUser}
        onSessionExpired={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('自白卷宗')).not.toBeNull();
    });

    expect(screen.getByText('统计数据加载失败，点击重试')).not.toBeNull();
  });

  it('allows dossiers to be retried successfully after failure', async () => {
    let failDossier = true;
    (apiGet as any).mockImplementation((url: string) => {
      if (url === '/api/auth/stats') {
        return Promise.resolve({ data: { success: true, stats: { dossierCount: 5 } } });
      }
      if (url === '/api/dossiers') {
        if (failDossier) {
          return Promise.reject(new Error('Dossiers connection failed'));
        }
        return Promise.resolve({
          data: {
            success: true,
            dossiers: [
              { id: 'd2', bankIds: ['bank-b'], createdAt: '2026-08-13T06:00:00Z' }
            ]
          }
        });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    render(
      <PersonalView
        data={mockData}
        user={mockUser}
        onSessionExpired={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('点击重试')).not.toBeNull();
    });

    failDossier = false;
    fireEvent.click(screen.getByText('点击重试'));

    await waitFor(() => {
      expect(screen.getByText('自白卷宗')).not.toBeNull();
    });
  });

  it('passes only the selected dossier summary to the detail loader', async () => {
    const onViewDossier = vi.fn();
    (apiGet as any).mockImplementation((url: string) => {
      if (url === '/api/auth/stats') {
        return Promise.resolve({ data: { success: true, stats: { dossierCount: 1 } } });
      }
      return Promise.resolve({
        data: {
          success: true,
          dossiers: [{ id: 'summary-1', bankIds: ['bank-a'], createdAt: '2026-08-13T06:00:00Z' }],
        },
      });
    });

    render(
      <PersonalView
        data={mockData}
        user={mockUser}
        onViewDossier={onViewDossier}
        onSessionExpired={vi.fn()}
      />
    );

    fireEvent.click(await screen.findByText('自白卷宗'));
    expect(onViewDossier).toHaveBeenCalledWith(expect.objectContaining({ id: 'summary-1' }));
  });

  it('cancels pending requests and isolates user data on user change', async () => {
    const firstUserExpired = vi.fn();
    let statsCallCount = 0;

    (apiGet as any).mockImplementation((url: string) => {
      statsCallCount++;
      return new Promise(() => {});
    });

    const { rerender } = render(
      <PersonalView
        data={mockData}
        user={{ id: 'user1', email: 'user1@example.com' }}
        onSessionExpired={firstUserExpired}
      />
    );

    rerender(
      <PersonalView
        data={mockData}
        user={{ id: 'user2', email: 'user2@example.com' }}
        onSessionExpired={firstUserExpired}
      />
    );

    expect(statsCallCount).toBeGreaterThanOrEqual(2);
  });
});

describe('TasksView robustness', () => {
  const mockUser = { id: 'u1', email: 'test@example.com' };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows error state instead of empty state on initial load failure', async () => {
    (apiGet as any).mockRejectedValue(new Error('Task listing connection error'));

    render(
      <TasksView
        user={mockUser}
        onLoginClick={vi.fn()}
        onSessionExpired={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('点击重试')).not.toBeNull();
    });
    expect(screen.queryByText('暂无可用任务')).toBeNull();
  });

  it('retains old data on refreshing failure with error warning', async () => {
    let shouldFail = false;
    (apiGet as any).mockImplementation(() => {
      if (shouldFail) {
        return Promise.reject(new Error('Refresh failed'));
      }
      return Promise.resolve({
        data: {
          success: true,
          tasks: [{ id: 't1', title: 'Task A', description: 'Desc A', category: 'subconscious', status: 'available' }],
          completedCount: 0,
          totalAcceptedCount: 0,
          completedHistory: []
        }
      });
    });

    (apiPost as any).mockResolvedValue({ data: { success: true } });

    render(
      <TasksView
        user={mockUser}
        onLoginClick={vi.fn()}
        onSessionExpired={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Task A')).not.toBeNull();
    });

    fireEvent.click(screen.getByText('发布新任务'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('例如：自我情绪观察日记')).not.toBeNull();
    });

    fireEvent.change(screen.getByPlaceholderText('例如：自我情绪观察日记'), { target: { value: 'Custom Title' } });
    fireEvent.change(screen.getByPlaceholderText('请输入该任务的具体细节与内容要求...'), { target: { value: 'Custom Desc' } });

    shouldFail = true;

    const form = screen.getByText('发布任务并加入列表').closest('form');
    if (form) {
      fireEvent.submit(form);
    } else {
      throw new Error('Form not found');
    }

    await waitFor(() => {
      expect(screen.getByText('操作成功，但列表刷新失败，请点击重试')).not.toBeNull();
    });
    expect(screen.getByText('Task A')).not.toBeNull();
  });

  it('triggers session expiration callback on 401 response', async () => {
    const sessionExpired = vi.fn();

    (apiGet as any).mockImplementation((url: string, options: any) => {
      if (options && options.onUnauthorized) {
        options.onUnauthorized();
      }
      return Promise.reject(new ApiError('Unauthenticated', 401));
    });

    render(
      <TasksView
        user={mockUser}
        onLoginClick={vi.fn()}
        onSessionExpired={sessionExpired}
      />
    );

    await waitFor(() => {
      expect(sessionExpired).toHaveBeenCalled();
    });
  });

  it('shows a refresh warning on the accepted-task subpage after a successful action', async () => {
    let listRequestCount = 0;
    (apiGet as any).mockImplementation(() => {
      listRequestCount += 1;
      if (listRequestCount > 1) return Promise.reject(new Error('Refresh failed'));
      return Promise.resolve({
        data: {
          success: true,
          tasks: [{ id: 't1', title: 'Task A', description: 'Desc A', category: 'subconscious', status: 'available' }],
          completedCount: 0,
          totalAcceptedCount: 0,
          completedHistory: [],
        },
      });
    });
    (apiPost as any).mockResolvedValue({ data: { success: true } });

    render(
      <TasksView
        user={mockUser}
        onLoginClick={vi.fn()}
        onSessionExpired={vi.fn()}
      />
    );

    fireEvent.click(await screen.findByText('Task A'));
    fireEvent.click(screen.getByText('确认接取该任务'));

    await waitFor(() => {
      expect(screen.getByText('操作成功，但列表刷新失败，请点击重试')).not.toBeNull();
    });
    // 接取任务后直接进入任务完成/作答界面
    expect(screen.getByPlaceholderText('在此记录具体的成果、真实感受与想法...')).not.toBeNull();
  });

  it('displays 500 safety error message correctly', async () => {
    (apiGet as any).mockRejectedValue(new ApiError('服务器崩溃', 500));

    render(
      <TasksView
        user={mockUser}
        onLoginClick={vi.fn()}
        onSessionExpired={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('服务器崩溃')).not.toBeNull();
    });
  });
});

describe('ChapterOneView submission', () => {
  it('only calls onNext once on multiple fast clicks', async () => {
    const onNextSpy = vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 200)));
    const initialData = { nickname: '' };

    render(
      <ChapterOneView
        initialData={initialData}
        onNext={onNextSpy}
      />
    );

    const input = screen.getByPlaceholderText('请输入你的名称或代号 (必填项)');
    fireEvent.change(input, { target: { value: 'Jane Doe' } });

    const button = screen.getByText('保存并前往题库');
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    expect(onNextSpy).toHaveBeenCalledTimes(1);
  });

  it('sanitizes a legacy non-numeric age to digits before submitting', async () => {
    const onNextSpy = vi.fn().mockResolvedValue(undefined);

    render(
      <ChapterOneView
        initialData={{ nickname: 'Jane', age: '25岁' }}
        onNext={onNextSpy}
      />
    );

    const input = screen.getByPlaceholderText('请输入你的名称或代号 (必填项)');
    fireEvent.change(input, { target: { value: 'Jane' } });
    fireEvent.click(screen.getByText('保存并前往题库'));

    await waitFor(() => expect(onNextSpy).toHaveBeenCalledTimes(1));
    expect(onNextSpy.mock.calls[0][0].age).toBe('25');
  });

  describe('昵称字段级校验', () => {
    const nicknameInput = () =>
      screen.getByPlaceholderText('请输入你的名称或代号 (必填项)') as HTMLInputElement;

    it('刚打开时不报错', () => {
      render(<ChapterOneView initialData={{ nickname: 'Jane' }} onNext={vi.fn()} />);

      expect(screen.queryByRole('alert')).toBeNull();
      expect(nicknameInput().getAttribute('aria-invalid')).toBe('false');
    });

    it('提交时才提示的短昵称，改为合法值后错误自动消失', () => {
      const onNextSpy = vi.fn();
      render(<ChapterOneView initialData={{ nickname: '' }} onNext={onNextSpy} />);

      fireEvent.change(nicknameInput(), { target: { value: '夜' } });
      fireEvent.click(screen.getByText('保存并前往题库'));

      expect(onNextSpy).not.toHaveBeenCalled();
      expect(screen.getByRole('alert').textContent).toContain('至少需要 2 个字符');
      expect(nicknameInput().getAttribute('aria-invalid')).toBe('true');

      fireEvent.change(nicknameInput(), { target: { value: '夜樱' } });
      expect(screen.queryByRole('alert')).toBeNull();
      expect(nicknameInput().getAttribute('aria-invalid')).toBe('false');
    });

    it('失焦后立即就地提示，无需等到提交', () => {
      render(<ChapterOneView initialData={{ nickname: 'Jane' }} onNext={vi.fn()} />);

      fireEvent.change(nicknameInput(), { target: { value: 'aa' } });
      fireEvent.blur(nicknameInput());

      expect(screen.getByRole('alert').textContent).toContain('重复字符');
    });

    it('提交被拦截时把焦点移回昵称字段', () => {
      render(<ChapterOneView initialData={{ nickname: '' }} onNext={vi.fn()} />);

      fireEvent.change(nicknameInput(), { target: { value: '夜' } });
      fireEvent.click(screen.getByText('保存并前往题库'));

      expect(document.activeElement).toBe(nicknameInput());
    });
  });
});
