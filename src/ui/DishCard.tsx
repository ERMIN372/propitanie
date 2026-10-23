import type { CSSProperties } from 'react';
import { Bowl } from './Bowl';
import { Tape, tiltFor } from './Tape';
import s from './DishCard.module.css';

type Props = {
  id: string;
  title: string;
  emoji: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  meta?: string;
  onClick?: () => void;
};

export function DishCard({ id, title, emoji, kcal, protein, fat, carbs, meta, onClick }: Props) {
  const macros = [
    { v: protein, l: 'Б', c: 'var(--protein)' },
    { v: fat, l: 'Ж', c: 'var(--fat)' },
    { v: carbs, l: 'У', c: 'var(--carbs)' },
  ];
  return (
    <button type="button" className={s.card} onClick={onClick}>
      <span className={s.bowlWrap}>
        <Bowl emoji={emoji} />
      </span>
      <Tape className={s.tape} tilt={tiltFor(id)} size="small">
        {title}
      </Tape>
      <span className={s.body}>
        <span className={s.kcal}>{Math.round(kcal)} ккал</span>
        <span className={s.macros}>
          {macros.map((m) => (
            <span key={m.l}>
              <span className={s.dot} style={{ '--c': m.c } as CSSProperties} />
              {m.l} {Math.round(m.v)}
            </span>
          ))}
        </span>
        {meta && <span className={s.meta}>{meta}</span>}
      </span>
    </button>
  );
}
