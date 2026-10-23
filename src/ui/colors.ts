import type { ColorKey } from '../schemas/common';

export const COLOR_VAR: Record<ColorKey, string> = {
  tomato: 'var(--tomato)',
  cobalt: 'var(--cobalt)',
  pea: 'var(--pea)',
  mustard: 'var(--mustard)',
};

export const COLOR_NAME: Record<ColorKey, string> = {
  tomato: 'Томат',
  cobalt: 'Кобальт',
  pea: 'Горошек',
  mustard: 'Горчица',
};
