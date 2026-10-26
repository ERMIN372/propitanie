import { useId, type InputHTMLAttributes } from 'react';
import s from './Field.module.css';

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string };

export function Field({ label, hint, ...input }: Props) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className={s.field}>
      <label className={s.label} htmlFor={id}>
        {label}
      </label>
      <input id={id} className={s.input} aria-describedby={hintId} {...input} />
      {hint && (
        <span id={hintId} className={s.hint}>
          {hint}
        </span>
      )}
    </div>
  );
}
