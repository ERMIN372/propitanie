import type { ReactNode } from 'react';
import s from './Chip.module.css';

type Props = { selected?: boolean; onClick?: () => void; children: ReactNode; sub?: ReactNode; label?: string };

export function Chip({ selected = false, onClick, children, sub, label }: Props) {
  return (
    <button type="button" className={s.chip} aria-pressed={selected} onClick={onClick} aria-label={label}>
      <span>{children}</span>
      {sub !== undefined && <span className={s.sub}>{sub}</span>}
    </button>
  );
}
