import { useMemo, useState } from 'react';
import { Screen } from '../../ui/Screen';
import { Card } from '../../ui/Card';
import { Chip } from '../../ui/Chip';
import { Tape } from '../../ui/Tape';
import { Button } from '../../ui/Button';
import { MacroBars } from '../../ui/MacroBars';
import { IconChevron, IconPlus } from '../../ui/icons';
import { DAY_SHORT, isoWeekOf, sameDay, shiftWeek, weekDays, weekLabel } from '../../lib/week';
import { useToast } from '../../ui/Toast';
import s from './PlanScreen.module.css';

const MEALS = ['Завтрак', 'Обед', 'Ужин', 'Перекус'] as const;

export function PlanScreen() {
  const today = useMemo(() => new Date(), []);
  const currentWeek = isoWeekOf(today);
  const [week, setWeek] = useState(currentWeek);
  const days = weekDays(week);
  const todayIdx = days.findIndex((d) => sameDay(d, today));
  const [day, setDay] = useState(todayIdx >= 0 ? todayIdx : 0);
  const toast = useToast();

  const go = (delta: number) => {
    const next = shiftWeek(week, delta);
    setWeek(next);
    setDay(next === currentWeek ? Math.max(0, todayIdx) : 0);
  };

  const soon = () => toast('Генератор плана появится на этапе 5');

  return (
    <Screen title="План" aside={<Button onClick={soon}>Собрать неделю</Button>}>
      <div>
        <div className={s.weekNav}>
          <button type="button" className={s.navBtn} onClick={() => go(-1)} aria-label="Прошлая неделя">
            <IconChevron dir="left" />
          </button>
          <div className={s.weekLabel} aria-live="polite">
            {weekLabel(week)}
          </div>
          <button type="button" className={s.navBtn} onClick={() => go(1)} aria-label="Следующая неделя">
            <IconChevron dir="right" />
          </button>
        </div>
        {week !== currentWeek && (
          <button
            type="button"
            className={s.today}
            onClick={() => {
              setWeek(currentWeek);
              setDay(Math.max(0, days.findIndex((d) => sameDay(d, today))));
            }}
          >
            Вернуться к сегодня
          </button>
        )}
      </div>

      <div className={s.days} role="group" aria-label="Дни недели">
        {days.map((d, i) => (
          <Chip key={i} selected={i === day} onClick={() => setDay(i)} sub={d.getDate()} label={d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}>
            {DAY_SHORT[i]}
          </Chip>
        ))}
      </div>

      <Card className={s.norm}>
        <div className={s.normHead}>
          <span className={s.normCaption}>Норма дня</span>
          <Tape size="big" tilt={-2}>
            0 / 2000
          </Tape>
        </div>
        <MacroBars protein={{ eaten: 0, goal: 120 }} fat={{ eaten: 0, goal: 70 }} carbs={{ eaten: 0, goal: 220 }} />
        <p className={s.hint}>Цифры для примера. Свою норму посчитаешь в онбординге.</p>
      </Card>

      {MEALS.map((m) => (
        <section key={m}>
          <h2 className={s.mealTitle}>{m}</h2>
          <button type="button" className={s.slot} onClick={soon}>
            <IconPlus />
            Добавить блюдо
          </button>
        </section>
      ))}
    </Screen>
  );
}
