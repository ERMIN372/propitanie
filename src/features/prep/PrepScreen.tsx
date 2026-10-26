import { useState } from 'react';
import { Screen } from '../../ui/Screen';
import { Card } from '../../ui/Card';
import { Chip } from '../../ui/Chip';
import { Tape } from '../../ui/Tape';
import { Button } from '../../ui/Button';
import { DAY_SHORT } from '../../lib/week';
import { useToast } from '../../ui/Toast';
import s from './PrepScreen.module.css';

export function PrepScreen() {
  const [days, setDays] = useState<Set<number>>(() => new Set([6, 2]));
  const toast = useToast();

  const toggle = (i: number) =>
    setDays((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const n = days.size;
  return (
    <Screen title="Готовка">
      <Card>
        <p className={s.label}>Когда готовим</p>
        <div className={s.chips} role="group" aria-label="Дни готовки">
          {DAY_SHORT.map((d, i) => (
            <Chip key={d} selected={days.has(i)} onClick={() => toggle(i)}>
              {d}
            </Chip>
          ))}
        </div>
      </Card>
      <Card className={s.summary}>
        <Tape tilt={1.5}>{n === 0 ? 'Выбери дни' : `${n} ${n === 1 ? 'заход' : n < 5 ? 'захода' : 'заходов'}`}</Tape>
        <p className={s.summaryText}>
          Разложу блюда из твоего плана по заходам с учётом срока хранения, склею одинаковую нарезку и запущу долгие шаги первыми.
        </p>
        <Button block disabled={n === 0} onClick={() => toast('Сессии готовки появятся на этапе 7')}>
          Начать готовку
        </Button>
      </Card>
    </Screen>
  );
}
