import { useCallback, useEffect, useRef, useState } from 'react';

export type AppViewState =
  | 'welcome'
  | 'portal'
  | 'bank_select'
  | 'dynamic_quiz'
  | 'chapter1'
  | 'generating'
  | 'result'
  | 'personal_view'
  | 'tasks_view'
  | 'data_view'
  | 'cards'
  | 'interrogation'
  | 'bank_editor';

const VIEW_HASH: Record<AppViewState, string> = {
  welcome: '#/welcome',
  portal: '#/',
  bank_select: '#/explore',
  dynamic_quiz: '#/quiz',
  chapter1: '#/basic-info',
  generating: '#/generating',
  result: '#/result',
  personal_view: '#/personal',
  tasks_view: '#/tasks',
  data_view: '#/data',
  cards: '#/cards',
  interrogation: '#/interrogation',
  bank_editor: '#/bank-editor',
};

const HASH_VIEW = new Map<string, AppViewState>([
  ...Object.entries(VIEW_HASH).map(([view, hash]) => [hash, view as AppViewState] as [string, AppViewState]),
  ['#/home', 'portal'],
]);

const REFRESH_SAFE_VIEWS = new Set<AppViewState>([
  'welcome',
  'portal',
  'bank_select',
  'chapter1',
  'personal_view',
  'tasks_view',
  'data_view',
  'cards',
  'interrogation',
]);

const HISTORY_MARKER = 'innerecho-view-v1';

interface AppHistoryState {
  marker: typeof HISTORY_MARKER;
  runtimeId: string;
  view: AppViewState;
  scrollY: number;
}

export interface NavigateOptions {
  replace?: boolean;
}

function createRuntimeId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function isAppHistoryState(value: unknown): value is AppHistoryState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AppHistoryState>;
  return candidate.marker === HISTORY_MARKER
    && typeof candidate.runtimeId === 'string'
    && typeof candidate.view === 'string'
    && typeof candidate.scrollY === 'number';
}

export function hashForView(view: AppViewState): string {
  return VIEW_HASH[view];
}

export function viewFromHash(hash: string): AppViewState | null {
  const normalized = hash === '' || hash === '#' ? '#/' : hash.toLowerCase();
  return HASH_VIEW.get(normalized) ?? null;
}

export function refreshViewFromHash(hash: string): AppViewState {
  const requested = viewFromHash(hash);
  if (!requested) return 'portal';
  return REFRESH_SAFE_VIEWS.has(requested) ? requested : 'bank_select';
}

export function isTransientView(view: AppViewState): boolean {
  return !REFRESH_SAFE_VIEWS.has(view);
}

/**
 * Keeps the single-page view state aligned with browser history without
 * requiring server-side route rewrites. A new document lifecycle only restores
 * pages that can be rebuilt from durable state. History navigation or a new
 * document lifecycle never re-enters an in-memory workflow page after its
 * component state has been discarded; those entries fall back to the bank
 * selector instead of rendering an incomplete screen.
 */
export function useAppViewHistory(): {
  viewState: AppViewState;
  navigateTo: (view: AppViewState, options?: NavigateOptions) => void;
} {
  const runtimeIdRef = useRef(createRuntimeId());
  const [viewState, setViewState] = useState<AppViewState>(() => {
    if (typeof window === 'undefined') return 'portal';
    return refreshViewFromHash(window.location.hash);
  });
  const viewRef = useRef(viewState);
  const lastHandledSignatureRef = useRef('');

  const buildState = useCallback((view: AppViewState, scrollY: number): AppHistoryState => ({
    marker: HISTORY_MARKER,
    runtimeId: runtimeIdRef.current,
    view,
    scrollY,
  }), []);

  const navigateTo = useCallback((nextView: AppViewState, options: NavigateOptions = {}) => {
    if (typeof window === 'undefined') return;

    const nextHash = hashForView(nextView);
    const currentView = viewRef.current;
    const currentState = isAppHistoryState(window.history.state)
      ? window.history.state
      : buildState(currentView, window.scrollY);

    // Preserve the page position on the entry being left so browser Back feels
    // native even though the application itself is state-driven.
    window.history.replaceState(
      { ...currentState, view: currentView, scrollY: window.scrollY },
      '',
      window.location.href
    );

    const nextState = buildState(nextView, 0);
    if (options.replace) {
      window.history.replaceState(nextState, '', nextHash);
    } else if (window.location.hash !== nextHash || currentView !== nextView) {
      window.history.pushState(nextState, '', nextHash);
    } else {
      window.history.replaceState(nextState, '', nextHash);
    }

    lastHandledSignatureRef.current = `${window.location.hash}|${nextState.runtimeId}|${nextView}`;
    viewRef.current = nextView;
    setViewState(nextView);
  }, [buildState]);

  useEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';

    const initialView = viewRef.current;
    const initialState = buildState(initialView, window.scrollY);
    window.history.replaceState(initialState, '', hashForView(initialView));
    lastHandledSignatureRef.current = `${window.location.hash}|${initialState.runtimeId}|${initialView}`;

    const restoreLocation = () => {
      const requestedView = viewFromHash(window.location.hash) ?? 'portal';
      const state = window.history.state;
      const belongsToCurrentRuntime = isAppHistoryState(state)
        && state.runtimeId === runtimeIdRef.current;
      const nextView = isTransientView(requestedView) ? 'bank_select' : requestedView;
      const signature = `${window.location.hash}|${belongsToCurrentRuntime ? state.runtimeId : ''}|${nextView}`;
      if (signature === lastHandledSignatureRef.current) return;
      lastHandledSignatureRef.current = signature;

      if (nextView !== requestedView) {
        const fallbackState = buildState(nextView, 0);
        window.history.replaceState(fallbackState, '', hashForView(nextView));
      }

      viewRef.current = nextView;
      setViewState(nextView);

      const scrollY = belongsToCurrentRuntime && isAppHistoryState(state)
        ? Math.max(0, state.scrollY)
        : 0;
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: 'auto' }));
      });
    };

    const saveCurrentScroll = () => {
      const state = window.history.state;
      if (!isAppHistoryState(state) || state.runtimeId !== runtimeIdRef.current) return;
      window.history.replaceState({ ...state, scrollY: window.scrollY }, '', window.location.href);
    };

    window.addEventListener('popstate', restoreLocation);
    window.addEventListener('hashchange', restoreLocation);
    window.addEventListener('pagehide', saveCurrentScroll);
    return () => {
      window.removeEventListener('popstate', restoreLocation);
      window.removeEventListener('hashchange', restoreLocation);
      window.removeEventListener('pagehide', saveCurrentScroll);
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, [buildState]);

  return { viewState, navigateTo };
}
