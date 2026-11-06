import { afterEach, vi } from 'vitest';

/**
 * Unit/component tests must never escape to a developer machine's localhost.
 * Tests that exercise HTTP behavior replace this stub explicitly.
 */
const blockedFetch = vi.fn(() => Promise.reject(new Error('Unexpected network request in test')));
vi.stubGlobal('fetch', blockedFetch);

afterEach(() => {
  blockedFetch.mockClear();
});
