import { create } from 'zustand';

export type ThemeChoice = 'system' | 'light' | 'dark';
const KEY = 'propitanie.theme';

function read(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function applyTheme(t: ThemeChoice): void {
  const root = document.documentElement;
  if (t === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', t);
}

type State = { theme: ThemeChoice; setTheme: (t: ThemeChoice) => void };

export const useTheme = create<State>((set) => ({
  theme: read(),
  setTheme: (theme) => {
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      // приватный режим: тема просто не запомнится
    }
    applyTheme(theme);
    set({ theme });
  },
}));
