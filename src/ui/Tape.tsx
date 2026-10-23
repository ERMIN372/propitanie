import type { CSSProperties, ReactNode } from 'react';
import s from './Tape.module.css';

type Props = { children: ReactNode; tilt?: number; size?: 'small' | 'normal' | 'big'; className?: string };

/** Полоска малярного скотча, на ней надпись маркером. Наклон от −3° до 3°. */
export function Tape({ children, tilt = -2, size = 'normal', className }: Props) {
  const t = Math.max(-3, Math.min(3, tilt));
  const cls = [s.tape, size === 'big' && s.big, size === 'small' && s.small, className].filter(Boolean).join(' ');
  return (
    <span className={cls} style={{ '--tilt': `${t}deg` } as CSSProperties}>
      {children}
    </span>
  );
}

/** Детерминированный наклон по строке, чтобы карточки не были одинаковыми. */
export function tiltFor(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return ((Math.abs(h) % 61) - 30) / 10;
}
