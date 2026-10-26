// ISO-недели: неделя начинается с понедельника, неделя 1 содержит первый четверг года.

export type WeekId = `${number}-W${string}`;

const DAY_MS = 86_400_000;

function utcDate(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

export function isoWeekOf(date: Date): WeekId {
  const d = utcDate(date);
  const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dow);
  const year = d.getUTCFullYear();
  const yearStart = Date.UTC(year, 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / DAY_MS + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/** Понедельник недели (UTC-полночь). */
export function mondayOf(week: WeekId): Date {
  const [y, w] = week.split('-W').map(Number) as [number, number];
  const jan4 = new Date(Date.UTC(y, 0, 4));
  const jan4Dow = jan4.getUTCDay() || 7;
  return new Date(jan4.getTime() + ((1 - jan4Dow) + (w - 1) * 7) * DAY_MS);
}

export function shiftWeek(week: WeekId, delta: number): WeekId {
  return isoWeekOf(asLocal(new Date(mondayOf(week).getTime() + delta * 7 * DAY_MS)));
}

/** Даты 7 дней недели, Пн–Вс. */
export function weekDays(week: WeekId): Date[] {
  const mon = mondayOf(week).getTime();
  return Array.from({ length: 7 }, (_, i) => asLocal(new Date(mon + i * DAY_MS)));
}

function asLocal(utc: Date): Date {
  return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
}

export const DAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const;

const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

export function weekLabel(week: WeekId): string {
  const days = weekDays(week);
  const a = days[0]!;
  const b = days[6]!;
  if (a.getMonth() === b.getMonth()) return `${a.getDate()}–${b.getDate()} ${MONTHS_GEN[b.getMonth()]}`;
  return `${a.getDate()} ${MONTHS_GEN[a.getMonth()]} – ${b.getDate()} ${MONTHS_GEN[b.getMonth()]}`;
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
