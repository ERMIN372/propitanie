import type { CSSProperties } from 'react';
import { Button } from '../../ui/Button';
import { Notice } from '../../ui/Notice';
import { COLOR_VAR } from '../../ui/colors';
import type { ProfilesDoc } from '../../schemas/docs';
import { useSession } from '../../stores/session';
import { SYNC_LABEL, useSyncStatus, type SyncState } from '../../stores/sync';
import { useDoc } from '../../sync/docs';
import { paths } from '../../sync/paths';
import { getEngine } from '../../sync/runtime';
import s from './TopBar.module.css';

const LIGHT: Record<SyncState, string> = {
  saved: 'var(--pea)',
  saving: 'var(--mustard)',
  offline: 'var(--ink-2)',
  error: 'var(--tomato)',
};

/** Шапка: переключатель профиля и индикатор синка. */
export function TopBar() {
  const { profileId, viewId, setView } = useSession();
  const profiles = useDoc<ProfilesDoc>(paths.profiles)?.profiles ?? [];
  const { state, error } = useSyncStatus();
  const viewed = profiles.find((p) => p.id === viewId);
  const readOnly = viewId !== profileId;

  return (
    <div className={s.bar}>
      <div className={s.row}>
        <div className={s.people} role="group" aria-label="Чьи данные смотреть">
          {profiles.map((p) => (
            <button key={p.id} type="button" className={s.person} aria-pressed={p.id === viewId} onClick={() => setView(p.id)}>
              <span className={s.dot} style={{ '--c': COLOR_VAR[p.colorKey] } as CSSProperties} />
              {p.id === profileId ? 'Я' : p.name}
            </button>
          ))}
        </div>
        <button type="button" className={s.sync} onClick={() => void getEngine()?.syncNow()} aria-label={`${SYNC_LABEL[state]}. Синхронизировать сейчас`}>
          <span className={s.light} style={{ '--c': LIGHT[state] } as CSSProperties} />
          {SYNC_LABEL[state]}
        </button>
      </div>
      {state === 'error' && error && (
        <Notice tone="error" action={<Button variant="secondary" onClick={() => void getEngine()?.syncNow()}>Повторить</Button>}>
          {error}
        </Notice>
      )}
      {readOnly && viewed && (
        <Notice>
          Смотришь данные: {viewed.name}. Менять их можно только из профиля {viewed.name}.
        </Notice>
      )}
    </div>
  );
}
