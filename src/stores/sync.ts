import { create } from 'zustand';

export type SyncState = 'saved' | 'saving' | 'offline' | 'error';

type State = {
  state: SyncState;
  error: string | null;
  lastSyncAt: string | null;
  set: (p: Partial<Omit<State, 'set'>>) => void;
};

export const useSyncStatus = create<State>((set) => ({
  state: 'saved',
  error: null,
  lastSyncAt: null,
  set: (p) => set(p),
}));

export const SYNC_LABEL: Record<SyncState, string> = {
  saved: 'Сохранено',
  saving: 'Сохраняю',
  offline: 'Нет сети, отправлю позже',
  error: 'Ошибка',
};
