import type { ReactNode } from 'react';
import { Bowl } from './Bowl';
import { Tape } from './Tape';
import s from './EmptyState.module.css';

type Props = { emoji: string; title: string; text: string; action?: ReactNode };

/** Пустой экран всегда предлагает действие. */
export function EmptyState({ emoji, title, text, action }: Props) {
  return (
    <div className={s.empty}>
      <Bowl emoji={emoji} size={96} />
      <Tape tilt={-1.5}>{title}</Tape>
      <p className={s.text}>{text}</p>
      {action}
    </div>
  );
}
