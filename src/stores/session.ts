// Сессия устройства: токен, ветка репо и выбранный профиль лежат в localStorage этого устройства.
import { create } from 'zustand';

const KEYS = { token: 'propitanie.token', branch: 'propitanie.branch', profile: 'propitanie.profile' } as const;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // хранилище недоступно (приватный режим): сессия проживёт до перезагрузки
  }
}

type State = {
  token: string | null;
  branch: string | null;
  profileId: string | null;
  /** Чей план сейчас на экране. Свой редактируешь, чужой только смотришь. */
  viewId: string | null;
  setConnection: (token: string, branch: string) => void;
  setProfile: (id: string | null) => void;
  setView: (id: string) => void;
  reset: () => void;
};

export const useSession = create<State>((set) => ({
  token: read(KEYS.token),
  branch: read(KEYS.branch),
  profileId: read(KEYS.profile),
  viewId: read(KEYS.profile),
  setConnection: (token, branch) => {
    write(KEYS.token, token);
    write(KEYS.branch, branch);
    set({ token, branch });
  },
  setProfile: (id) => {
    write(KEYS.profile, id);
    set({ profileId: id, viewId: id });
  },
  setView: (id) => set({ viewId: id }),
  reset: () => {
    Object.values(KEYS).forEach((k) => write(k, null));
    set({ token: null, branch: null, profileId: null, viewId: null });
  },
}));

export const useIsReadOnly = () => useSession((s) => s.viewId !== null && s.viewId !== s.profileId);
