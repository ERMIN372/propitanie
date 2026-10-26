import type { ButtonHTMLAttributes } from 'react';
import s from './Button.module.css';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
  block?: boolean;
};

export function Button({ variant = 'primary', block, className, type = 'button', ...rest }: Props) {
  const cls = [s.btn, s[variant], block && s.block, className].filter(Boolean).join(' ');
  return <button type={type} className={cls} {...rest} />;
}
