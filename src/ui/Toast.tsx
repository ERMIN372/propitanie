import { create } from 'zustand';
import s from './Toast.module.css';

type State = { text: string | null; show: (text: string) => void };

let timer: ReturnType<typeof setTimeout> | undefined;

const useToastStore = create<State>((set) => ({
  text: null,
  show: (text) => {
    clearTimeout(timer);
    set({ text });
    timer = setTimeout(() => set({ text: null }), 2600);
  },
}));

export const useToast = () => useToastStore((st) => st.show);

export function ToastHost() {
  const text = useToastStore((st) => st.text);
  return (
    <div className={s.wrap} role="status" aria-live="polite">
      {text && <div className={s.toast}>{text}</div>}
    </div>
  );
}
