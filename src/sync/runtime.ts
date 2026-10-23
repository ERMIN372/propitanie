// Живой экземпляр движка: старт при подключении, чтение раз в 60 с, при возврате на вкладку и при появлении сети.
import { isoWeekOf, shiftWeek } from '../lib/week';
import { useSession } from '../stores/session';
import { useSyncStatus } from '../stores/sync';
import { db } from './db';
import { GitHubClient } from './github';
import { SyncEngine } from './engine';
import { paths } from './paths';
import type { ProfilesDoc } from '../schemas/docs';

const POLL_MS = 60_000;

let engine: SyncEngine | null = null;
let cleanup: (() => void) | null = null;

export function getEngine(): SyncEngine | null {
  return engine;
}

export async function profileName(id: string | null): Promise<string> {
  const row = await db.docs.get(paths.profiles);
  const doc = row?.data as ProfilesDoc | undefined;
  return doc?.profiles.find((p) => p.id === id)?.name ?? 'Пропитание';
}

export function startSync(token: string, branch: string): void {
  stopSync();
  const status = useSyncStatus.getState();
  const current = engine = new SyncEngine({
    client: new GitHubClient(token),
    branch,
    authorName: () => profileName(useSession.getState().profileId),
    hotWeeks: () => {
      const w = isoWeekOf(new Date());
      return [shiftWeek(w, -1), w, shiftWeek(w, 1)];
    },
    onStatus: (s) => status.set(s),
    onSynced: () => status.set({ lastSyncAt: new Date().toISOString() }),
  });

  const tick = () => {
    if (document.visibilityState === 'visible') void current.syncNow();
  };
  const onVisible = () => tick();
  const onOnline = () => void current.syncNow();
  const onOffline = () => status.set({ state: 'offline', error: null });
  const interval = setInterval(tick, POLL_MS);
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  cleanup = () => {
    clearInterval(interval);
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
    current.stop();
  };
  void current.syncNow();
}

export function stopSync(): void {
  cleanup?.();
  cleanup = null;
  engine = null;
}
