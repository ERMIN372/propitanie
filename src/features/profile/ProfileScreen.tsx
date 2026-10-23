import { Screen } from '../../ui/Screen';
import { Card } from '../../ui/Card';
import { Chip } from '../../ui/Chip';
import { Bowl } from '../../ui/Bowl';
import { Tape } from '../../ui/Tape';
import { useTheme, type ThemeChoice } from '../../stores/theme';
import s from './ProfileScreen.module.css';

const THEMES: { key: ThemeChoice; label: string }[] = [
  { key: 'system', label: 'Как в системе' },
  { key: 'light', label: 'Эмаль' },
  { key: 'dark', label: 'Чугун' },
];

export function ProfileScreen() {
  const { theme, setTheme } = useTheme();
  return (
    <Screen title="Я">
      <Card className={s.hello}>
        <Bowl emoji="🙂" size={88} />
        <Tape tilt={2}>Профиль не подключён</Tape>
        <p className={s.muted}>Подключение к приватному репо с данными появится на этапе 2.</p>
      </Card>
      <Card>
        <p className={s.label}>Тема</p>
        <div className={s.chips} role="group" aria-label="Тема">
          {THEMES.map((t) => (
            <Chip key={t.key} selected={theme === t.key} onClick={() => setTheme(t.key)}>
              {t.label}
            </Chip>
          ))}
        </div>
      </Card>
    </Screen>
  );
}
