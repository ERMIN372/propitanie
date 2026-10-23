import type { ReactNode } from 'react';
import s from './Notice.module.css';

/** Плашка с сообщением: что случилось и что делать. */
export function Notice({ tone = 'info', children, action }: { tone?: 'info' | 'error'; children: ReactNode; action?: ReactNode }) {
  return (
    <div className={`${s.notice} ${s[tone]}`} role={tone === 'error' ? 'alert' : 'status'}>
      <p className={s.text}>{children}</p>
      {action}
    </div>
  );
}
