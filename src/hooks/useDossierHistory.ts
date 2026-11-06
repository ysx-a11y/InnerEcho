import { useCallback, useEffect, useState } from 'react';
import type { DossierSummaryContract, SessionUser } from '../../shared/apiContracts';
import { apiGet } from '../utils/api';
import {
  clearDossierSummaryCache,
  loadDossierSummaryCache,
  saveDossierSummaryCache,
  upsertDossierSummary,
} from '../utils/dossierSummaryCache';

export type DossierListStatus = 'syncing' | 'ready' | 'stale' | 'error';

interface UseDossierHistoryOptions {
  user: SessionUser | null;
  sessionLatestDossier: DossierSummaryContract | null;
  onApplySummary: (summary: DossierSummaryContract) => void;
  onSessionExpired: () => void;
}

/** Owns lightweight dossier summaries, their user-scoped cache, and refresh state. */
export function useDossierHistory({
  user,
  sessionLatestDossier,
  onApplySummary,
  onSessionExpired,
}: UseDossierHistoryOptions) {
  const [latestDossier, setLatestDossier] = useState<DossierSummaryContract | null>(null);
  const [dossierList, setDossierList] = useState<DossierSummaryContract[]>([]);
  const [dossierListOwnerId, setDossierListOwnerId] = useState<string | null>(null);
  const [dossierListStatus, setDossierListStatus] = useState<DossierListStatus>('syncing');

  const applyDossierSummary = useCallback((summary: DossierSummaryContract) => {
    setLatestDossier(summary);
    onApplySummary(summary);
  }, [onApplySummary]);

  const seedForLogin = useCallback((nextUser: SessionUser, latest?: DossierSummaryContract) => {
    const cached = loadDossierSummaryCache(nextUser.id);
    const seeded = latest ? upsertDossierSummary(cached ?? [], latest) : cached;
    if (latest) applyDossierSummary(latest);
    setDossierList(seeded ?? []);
    setDossierListOwnerId(nextUser.id);
    setDossierListStatus(seeded === null ? 'syncing' : 'ready');
    if (seeded !== null) saveDossierSummaryCache(nextUser.id, seeded);
  }, [applyDossierSummary]);

  const recordSavedDossier = useCallback((summary: DossierSummaryContract) => {
    setLatestDossier(summary);
    if (!user) return;

    setDossierListOwnerId(user.id);
    setDossierListStatus('ready');
    setDossierList((previous) => {
      const base = dossierListOwnerId === user.id
        ? previous
        : (loadDossierSummaryCache(user.id) ?? []);
      const next = upsertDossierSummary(base, summary);
      saveDossierSummaryCache(user.id, next);
      return next;
    });
  }, [user, dossierListOwnerId]);

  const resetHistory = useCallback((ownerId?: string) => {
    if (ownerId) clearDossierSummaryCache(ownerId);
    setLatestDossier(null);
    setDossierList([]);
    setDossierListOwnerId(null);
    setDossierListStatus('syncing');
  }, []);

  const findDossierId = useCallback((bankId?: string): string | null => {
    if (bankId) {
      const matchingDossier = dossierList.find((dossier) => dossier.bankIds.includes(bankId));
      if (matchingDossier) return matchingDossier.id;
    }
    return latestDossier?.id ?? null;
  }, [dossierList, latestDossier]);

  useEffect(() => {
    if (sessionLatestDossier) applyDossierSummary(sessionLatestDossier);
  }, [sessionLatestDossier, applyDossierSummary]);

  useEffect(() => {
    if (!user) {
      setDossierList([]);
      setDossierListOwnerId(null);
      setDossierListStatus('syncing');
      return;
    }

    const cached = loadDossierSummaryCache(user.id);
    setDossierList(cached ?? []);
    setDossierListOwnerId(user.id);
    setDossierListStatus(cached === null ? 'syncing' : 'ready');

    let active = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);
    void apiGet<{ success: boolean; dossiers?: DossierSummaryContract[] }>('/api/dossiers', {
      signal: controller.signal,
      onUnauthorized: onSessionExpired,
    })
      .then(({ data }) => {
        if (!active) return;
        if (data.success) {
          const summaries = data.dossiers ?? [];
          setDossierList(summaries);
          setDossierListOwnerId(user.id);
          setDossierListStatus('ready');
          saveDossierSummaryCache(user.id, summaries);
        } else {
          setDossierListStatus(cached === null ? 'error' : 'stale');
        }
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') return;
        if (active) setDossierListStatus(cached === null ? 'error' : 'stale');
      })
      .finally(() => clearTimeout(timeoutId));

    return () => {
      active = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [user, onSessionExpired]);

  return {
    latestDossier,
    dossierList,
    dossierListOwnerId,
    dossierListStatus,
    applyDossierSummary,
    seedForLogin,
    recordSavedDossier,
    resetHistory,
    findDossierId,
  };
}
