import { useState, type CSSProperties, type FormEvent } from 'react';
import { Bowl } from '../../ui/Bowl';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Field } from '../../ui/Field';
import { Notice } from '../../ui/Notice';
import { Tape } from '../../ui/Tape';
import { COLOR_NAME, COLOR_VAR } from '../../ui/colors';
import type { ColorKey } from '../../schemas/common';
import type { ProfilesDoc } from '../../schemas/docs';
import { useSession } from '../../stores/session';
import { useDoc } from '../../sync/docs';
import { errorMessage } from '../../sync/github';
import { paths } from '../../sync/paths';
import { connect, createProfile, logout, PROFILE_COLORS } from './connect';
import s from './ConnectScreen.module.css';

export function ConnectScreen() {
  const token = useSession((st) => st.token);
  return <main className={s.screen}>{token ? <PickProfile /> : <TokenStep />}</main>;
}

function TokenStep() {
  const setConnection = useSession((st) => st.setConnection);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { branch } = await connect(token);
      setConnection(token.trim(), branch);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className={s.hero}>
        <Bowl emoji="🥣" size={112} />
        <Tape size="big" tilt={-2}>
          Пропитание
        </Tape>
        <p className={s.lead}>Свой план еды под твою норму, список покупок и готовка впрок. Подключи репо с данными, чтобы начать.</p>
      </div>
      <Card>
        <form className={s.form} onSubmit={submit}>
          <Field
            label="Токен GitHub"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="github_pat_…"
            hint="Хранится только на этом устройстве."
            required
          />
          {error && <Notice tone="error">{error}</Notice>}
          <Button type="submit" block disabled={busy || token.trim().length < 20}>
            {busy ? 'Подключаю' : 'Подключить'}
          </Button>
        </form>
      </Card>
      <details className={s.help}>
        <summary>Где взять токен</summary>
        <ol>
          <li>GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens.</li>
          <li>Generate new token, в Repository access выбери Only select repositories и там propitanie_bd.</li>
          <li>В Permissions → Repository permissions поставь Contents: Read and write.</li>
          <li>Скопируй токен и вставь сюда. Второй токен выпусти так же, для второго человека.</li>
        </ol>
      </details>
    </>
  );
}

function PickProfile() {
  const setProfile = useSession((st) => st.setProfile);
  const doc = useDoc<ProfilesDoc>(paths.profiles);
  const [name, setName] = useState('');
  const [color, setColor] = useState<ColorKey>('tomato');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const profiles = doc?.profiles ?? [];

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createProfile(name, color);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <>
      <div className={s.hero}>
        <Bowl emoji="👋" size={96} />
        <Tape tilt={1.5}>Кто ты?</Tape>
      </div>
      {profiles.length > 0 && (
        <div className={s.people}>
          {profiles.map((p) => (
            <button key={p.id} type="button" className={s.person} onClick={() => setProfile(p.id)}>
              <span className={s.dot} style={{ '--c': COLOR_VAR[p.colorKey] } as CSSProperties} />
              Это я, {p.name}
            </button>
          ))}
        </div>
      )}
      <Card>
        <form className={s.form} onSubmit={create}>
          <h2 className={s.sectionTitle}>{profiles.length ? 'Или создай новый профиль' : 'Создай профиль'}</h2>
          <Field label="Имя" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="given-name" required />
          <div>
            <p className="visually-hidden">Цвет профиля</p>
            <div className={s.colors} role="group" aria-label="Цвет профиля">
              {PROFILE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={s.swatch}
                  style={{ '--c': COLOR_VAR[c] } as CSSProperties}
                  aria-pressed={color === c}
                  aria-label={COLOR_NAME[c]}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
          {error && <Notice tone="error">{error}</Notice>}
          <Button type="submit" block disabled={busy || !name.trim()}>
            Создать профиль
          </Button>
        </form>
      </Card>
      <Button variant="ghost" onClick={() => void logout()}>
        Ввести другой токен
      </Button>
    </>
  );
}
