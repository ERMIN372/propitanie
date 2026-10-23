import { Screen } from '../../ui/Screen';
import { EmptyState } from '../../ui/EmptyState';
import { Button } from '../../ui/Button';
import { useNavigate } from 'react-router';
import { isoWeekOf, weekLabel } from '../../lib/week';
import s from './ShoppingScreen.module.css';

export function ShoppingScreen() {
  const nav = useNavigate();
  const week = isoWeekOf(new Date());
  return (
    <Screen title="Покупки">
      <div className={s.receipt}>
        <div className={s.head}>
          <span className={s.store}>Список на неделю</span>
          <span className={s.date}>{weekLabel(week)}</span>
        </div>
        <EmptyState
          emoji="🧾"
          title="Список пуст"
          text="Собери план на неделю, и список покупок сложится сам: по отделам магазина и с отметками для двоих."
          action={<Button onClick={() => nav('/')}>Открыть план</Button>}
        />
      </div>
    </Screen>
  );
}
