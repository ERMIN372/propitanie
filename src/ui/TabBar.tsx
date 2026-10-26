import { NavLink } from 'react-router';
import { IconBook, IconCart, IconMe, IconPlan, IconPot } from './icons';
import s from './TabBar.module.css';

const TABS = [
  { to: '/', label: 'План', Icon: IconPlan },
  { to: '/shopping', label: 'Покупки', Icon: IconCart },
  { to: '/prep', label: 'Готовка', Icon: IconPot },
  { to: '/recipes', label: 'Рецепты', Icon: IconBook },
  { to: '/me', label: 'Я', Icon: IconMe },
] as const;

export function TabBar() {
  return (
    <nav className={s.bar} aria-label="Разделы">
      <ul className={s.list}>
        {TABS.map(({ to, label, Icon }) => (
          <li key={to}>
            <NavLink to={to} end={to === '/'} className={({ isActive }) => [s.link, isActive && s.active].filter(Boolean).join(' ')}>
              <span className={s.icon}>
                <Icon />
              </span>
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
