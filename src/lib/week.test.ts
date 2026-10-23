import { describe, expect, it } from 'vitest';
import { isoWeekOf, mondayOf, shiftWeek, weekDays, weekLabel } from './week';

describe('ISO-недели', () => {
  it('считает номер недели, включая переход года', () => {
    expect(isoWeekOf(new Date(2026, 9, 23))).toBe('2026-W43');
    // 1 января 2027 пятница, это ещё 53-я неделя 2026
    expect(isoWeekOf(new Date(2027, 0, 1))).toBe('2026-W53');
    // 29 декабря 2025 понедельник, это уже 1-я неделя 2026
    expect(isoWeekOf(new Date(2025, 11, 29))).toBe('2026-W01');
  });

  it('понедельник недели', () => {
    const mon = mondayOf('2026-W43');
    expect(mon.toISOString().slice(0, 10)).toBe('2026-10-19');
  });

  it('листает недели через год', () => {
    expect(shiftWeek('2026-W53', 1)).toBe('2027-W01');
    expect(shiftWeek('2027-W01', -1)).toBe('2026-W53');
    expect(shiftWeek('2026-W43', 0)).toBe('2026-W43');
  });

  it('семь дней с понедельника и подпись', () => {
    const days = weekDays('2026-W43');
    expect(days).toHaveLength(7);
    expect(days[0]!.getDay()).toBe(1);
    expect(days[6]!.getDay()).toBe(0);
    expect(weekLabel('2026-W43')).toBe('19–25 октября');
    expect(weekLabel('2026-W44')).toBe('26 октября – 1 ноября');
  });
});
