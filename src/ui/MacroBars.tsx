import type { CSSProperties } from 'react';
import s from './MacroBars.module.css';

type Macro = { eaten: number; goal: number };
type Props = { protein: Macro; fat: Macro; carbs: Macro };

const ROWS = [
  { key: 'protein', name: 'Белки', color: 'var(--protein)' },
  { key: 'fat', name: 'Жиры', color: 'var(--fat)' },
  { key: 'carbs', name: 'Углеводы', color: 'var(--carbs)' },
] as const;

export function MacroBars(props: Props) {
  return (
    <div className={s.bars}>
      {ROWS.map((r) => {
        const m = props[r.key];
        const pct = m.goal > 0 ? Math.min(100, (m.eaten / m.goal) * 100) : 0;
        return (
          <div key={r.key} className={s.row}>
            <span className={s.name}>{r.name}</span>
            <span
              className={s.track}
              role="meter"
              aria-label={r.name}
              aria-valuemin={0}
              aria-valuemax={m.goal}
              aria-valuenow={m.eaten}
            >
              <span className={s.fill} style={{ '--w': `${pct}%`, '--c': r.color } as CSSProperties} />
            </span>
            <span className={s.value}>
              {Math.round(m.eaten)} / {Math.round(m.goal)} г
            </span>
          </div>
        );
      })}
    </div>
  );
}
