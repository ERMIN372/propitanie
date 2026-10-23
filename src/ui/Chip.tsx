import type { ReactNode } from 'react';
import s from './Chip.module.css';

type Props = { selected?: boolean; onClick?: () => void; children: ReactNode; sub?: ReactNode; label?: string; className?: string };

export function Chip({ selected = false, onClick, children, sub, label, className }: Props) {
  return (
    <button type="button" className={className ? `${s.chip} ${className}` : s.chip} aria-pressed={selected} onClick={onClick} aria-label={label}>
      <span>{children}</span>
      {sub !== undefined && <span className={s.sub}>{sub}</span>}
    </button>
  );
}
