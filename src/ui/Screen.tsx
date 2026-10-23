import type { ReactNode } from 'react';
import s from './Screen.module.css';

export function Screen({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <main className={s.screen}>
      <header className={s.head}>
        <h1 className={s.title}>{title}</h1>
        {aside}
      </header>
      <div className={s.stack}>{children}</div>
    </main>
  );
}
