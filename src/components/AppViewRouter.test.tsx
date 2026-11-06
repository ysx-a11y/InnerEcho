// @vitest-environment happy-dom
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { AppViewRouter } from './AppViewRouter';

vi.mock('./DataView', () => ({
  DataView: () => <div>回响池与大盘已渲染</div>,
}));

vi.mock('./TasksView', () => ({
  TasksView: () => <div>任务页面已渲染</div>,
}));

const emptyDossier = {
  chapter1: { nickname: '测试用户' },
  chapter2: { boundaryText: '', fantasyText: '', relationPreference: '', awakeningMoment: '' },
  chapter3: { secretWords: '', secretRule: '' },
  selectedShadowTags: [],
  depthRating: 'medium' as const,
};

const noBasicInfoDossier = {
  ...emptyDossier,
  chapter1: { nickname: '' },
};

function createProps(
  overrides: Partial<ComponentProps<typeof AppViewRouter>> = {},
): ComponentProps<typeof AppViewRouter> {
  const noop = () => {};
  return {
    viewState: 'tasks_view',
    user: null,
    dossierData: emptyDossier,
    selectedBanks: [],
    editingBankId: null,
    bankRefreshKey: 0,
    completedBankIds: [],
    completedCounts: {},
    completionStatus: 'syncing',
    reportLoading: false,
    diagnosticResult: null,
    submissionSaved: false,
    resultNotice: null,
    navigateTo: noop,
    onLoginSuccess: noop,
    onRestoreDossier: noop,
    onContinue: noop,
    onStart: noop,
    onGoToBasicInfo: noop,
    onOpenBanks: noop,
    onOpenTasks: noop,
    onOpenCards: noop,
    onOpenAstrolabe: noop,
    onStartQuiz: noop,
    onCreateOrEditBank: noop,
    onLogout: noop,
    onBankEditorBack: noop,
    onBankMutated: noop,
    onQuizComplete: noop,
    onChapterOneNext: noop,
    onGeneratingComplete: noop,
    onEditPersonal: noop,
    onOpenAuthPanel: noop,
    onSessionExpired: noop,
    onOpenDossier: noop,
    onLoginClick: noop,
    onViewResult: noop,
    onExitResult: noop,
    ...overrides,
  };
}

describe('AppViewRouter session restoration', () => {
  it('renders the current view immediately without blocking on session restoration', async () => {
    render(
      <AppViewRouter
        {...createProps({
          user: { id: 'user-1', email: 'user@example.com' },
        })}
      />,
    );

    expect(await screen.findByText('任务页面已渲染')).not.toBeNull();
  });

  it('renders tasks and data views for guests without basic info', async () => {
    const { rerender } = render(
      <AppViewRouter {...createProps({ dossierData: noBasicInfoDossier, user: null })} />,
    );
    expect(await screen.findByText('任务页面已渲染')).not.toBeNull();

    rerender(
      <AppViewRouter
        {...createProps({
          viewState: 'data_view',
          dossierData: noBasicInfoDossier,
          user: null,
        })}
      />,
    );
    expect(await screen.findByText('回响池与大盘已渲染')).not.toBeNull();
  });
});
