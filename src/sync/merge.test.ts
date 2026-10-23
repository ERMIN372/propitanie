import { describe, expect, it } from 'vitest';
import type { PlanDoc, PrepDoc, ProfilesDoc, ShoppingDoc, ShoppingItem } from '../schemas/docs';
import { mergePlan, mergePrep, mergeProfiles, mergeShopping, mergeWhole } from './merge';

const T1 = '2026-10-20T10:00:00.000Z';
const T2 = '2026-10-20T11:00:00.000Z';
const T3 = '2026-10-20T12:00:00.000Z';

const plan = (slots: PlanDoc['slots'], updatedAt = T1, seed = 1): PlanDoc => ({
  schemaVersion: 1,
  updatedAt,
  week: '2026-W43',
  seed,
  mealsPerDay: 4,
  slots,
});

const slot = (recipeId: string | null, updatedAt: string) => ({ recipeId, portions: 1, manual: true, updatedAt });

describe('мёрдж плана по слотам', () => {
  it('объединяет разные слоты и берёт свежий в общем', () => {
    const local = plan({ '1:lunch': slot('plov', T2), '2:dinner': slot('soup', T1) }, T2);
    const remote = plan({ '1:lunch': slot('borsch', T1), '3:breakfast': slot('syrniki', T3) }, T3, 7);
    const m = mergePlan(local, remote);
    expect(m.slots['1:lunch']?.recipeId).toBe('plov');
    expect(m.slots['2:dinner']?.recipeId).toBe('soup');
    expect(m.slots['3:breakfast']?.recipeId).toBe('syrniki');
    expect(m.seed).toBe(7);
    expect(m.updatedAt).toBe(T3);
  });

  it('удаление (null) побеждает, если оно свежее', () => {
    const local = plan({ '1:lunch': slot(null, T3) });
    const remote = plan({ '1:lunch': slot('plov', T2) });
    expect(mergePlan(local, remote).slots['1:lunch']?.recipeId).toBeNull();
  });

  it('при равном времени побеждает удалённая версия, мёрдж симметричен по результату', () => {
    const a = plan({ '1:lunch': slot('a', T1) });
    const b = plan({ '1:lunch': slot('b', T1) });
    expect(mergePlan(a, b).slots['1:lunch']?.recipeId).toBe('b');
  });
});

const item = (checked: boolean, updatedAt: string, amount = 500): ShoppingItem => ({
  name: 'Куриное филе',
  ingredientId: 'chicken-fillet',
  amount,
  unit: 'g',
  category: 'Мясо и птица',
  staple: false,
  usedIn: [],
  checked,
  manual: false,
  removed: false,
  updatedAt,
});

const shop = (items: ShoppingDoc['items'], updatedAt = T1): ShoppingDoc => ({
  schemaVersion: 1,
  updatedAt,
  week: '2026-W43',
  sourceProfiles: ['p1', 'p2'],
  items,
});

describe('мёрдж списка покупок по позициям', () => {
  it('отметка "куплено" с одного устройства и новая позиция с другого', () => {
    const local = shop({ chicken: item(true, T2) }, T2);
    const remote = shop({ chicken: item(false, T1), milk: { ...item(false, T3), name: 'Молоко', ingredientId: 'milk' } }, T3);
    const m = mergeShopping(local, remote);
    expect(m.items.chicken?.checked).toBe(true);
    expect(m.items.milk?.name).toBe('Молоко');
  });
});

describe('мёрдж сессии готовки', () => {
  it('объединяет выполненные шаги', () => {
    const base: PrepDoc = { schemaVersion: 1, updatedAt: T1, week: '2026-W43', cookDays: [7], forProfiles: ['p1'], doneSteps: {} };
    const local = { ...base, doneSteps: { s1: T2, s2: T2 } };
    const remote = { ...base, updatedAt: T2, doneSteps: { s2: T1, s3: T3 } };
    const m = mergePrep(local, remote);
    expect(Object.keys(m.doneSteps).sort()).toEqual(['s1', 's2', 's3']);
    expect(m.doneSteps.s2).toBe(T1);
  });
});

describe('мёрдж профилей и целых файлов', () => {
  it('profiles.json: объединение по id', () => {
    const p = (id: string, name: string) => ({ id, name, colorKey: 'tomato' as const, createdAt: id === 'a' ? T1 : T2 });
    const local: ProfilesDoc = { schemaVersion: 1, updatedAt: T2, profiles: [p('a', 'Тестер')] };
    const remote: ProfilesDoc = { schemaVersion: 1, updatedAt: T1, profiles: [p('b', 'Тестерка')] };
    const m = mergeProfiles(local, remote);
    expect(m.profiles.map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('профиль целиком: побеждает более свежий', () => {
    expect(mergeWhole({ updatedAt: T3, v: 'local' }, { updatedAt: T2, v: 'remote' }).v).toBe('local');
    expect(mergeWhole({ updatedAt: T1, v: 'local' }, { updatedAt: T2, v: 'remote' }).v).toBe('remote');
  });
});
