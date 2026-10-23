import type { CSSProperties } from 'react';
import s from './Bowl.module.css';

/** Эмалированная миска с кобальтовым кантом и эмодзи блюда. */
export function Bowl({ emoji, size = 72, label }: { emoji: string; size?: number; label?: string }) {
  return (
    <span className={s.bowl} style={{ '--size': `${size}px` } as CSSProperties} role="img" aria-label={label}>
      {emoji}
    </span>
  );
}
