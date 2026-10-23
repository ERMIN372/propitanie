import { useState, type CSSProperties } from 'react';
import { Screen } from '../../ui/Screen';
import { Card } from '../../ui/Card';
import { Chip } from '../../ui/Chip';
import { Button } from '../../ui/Button';
import { Tape } from '../../ui/Tape';
import { Notice } from '../../ui/Notice';
import { COLOR_VAR } from '../../ui/colors';
import { useToast } from '../../ui/Toast';
import { useTheme, type ThemeChoice } from '../../stores/theme';
import { useSession } from '../../stores/session';
import { SYNC_LABEL, useSyncStatus } from '../../stores/sync';
import type { ProfilesDoc } from '../../schemas/docs';
import { useDoc } from '../../sync/docs';
import { paths } from '../../sync/paths';
import { getEngine } from '../../sync/runtime';
import { exportMyData, logout } from '../connect/connect';
import s from './ProfileScreen.module.css';

const THEMES: { key: ThemeChoice; label: string }[] = [
  { key: 'system', label: 'Как в системе' },
  { key: 'light', label: 'Эмаль' },
  { key: 'dark', label: 'Чугун' },
];

export function ProfileScreen() {
  const { theme, setTheme } = useTheme();
  const { profileId, setProfile } = useSession();
  const me = useDoc<ProfilesDoc>(paths.profiles)?.profiles.find((p) => p.id === profileId);
  const sync = useSyncStatus();
  const toast = useToast();
  const [confirmLogout, setConfirmLogout] = useState(false);

  const download = async () => {
    if (!profileId) return;
    const blob = await exportMyData(profileId);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `propitanie-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Данные скачаны');
  };

  const lastSync = sync.lastSyncAt
    ? new Date(sync.lastSyncAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <Screen title="Я">
      <Card className={s.hello}>
        <span className={s.avatar} style={{ '--c': me ? COLOR_VAR[me.colorKey] : 'var(--surface-2)' } as CSSProperties} aria-hidden />
        <Tape tilt={2}>{me?.name ?? 'Профиль'}</Tape>
        <p className={s.muted}>Параметры тела и норма появятся вместе с онбордингом на этапе 3.</p>
        <Button variant="secondary" onClick={() => setProfile(null)}>
          Сменить профиль
        </Button>
      </Card>

      <Card className={s.section}>
        <p className={s.label}>Синхронизация</p>
        <p className={s.muted}>
          {SYNC_LABEL[sync.state]}
          {lastSync && `, последний обмен в ${lastSync}`}
        </p>
        {sync.state === 'error' && sync.error && <Notice tone="error">{sync.error}</Notice>}
        <Button variant="secondary" onClick={() => void getEngine()?.syncNow()}>
          Синхронизировать сейчас
        </Button>
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

      <Card className={s.section}>
        <p className={s.label}>Данные</p>
        <Button variant="secondary" onClick={() => void download()}>
          Скачать мои данные
        </Button>
        {confirmLogout ? (
          <Notice
            tone="error"
            action={
              <div className={s.chips}>
                <Button onClick={() => void logout()}>Выйти и стереть</Button>
                <Button variant="ghost" onClick={() => setConfirmLogout(false)}>
                  Остаться
                </Button>
              </div>
            }
          >
            Сотру токен и локальную копию на этом устройстве. Данные в репо останутся. Неотправленные правки пропадут.
          </Notice>
        ) : (
          <Button variant="ghost" onClick={() => setConfirmLogout(true)}>
            Выйти на этом устройстве
          </Button>
        )}
      </Card>
    </Screen>
  );
}
