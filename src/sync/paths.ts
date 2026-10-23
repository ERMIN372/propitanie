// Реестр типов файлов propitanie_bd: путь → схема, дефолт, мёрдж.
import type { z } from 'zod';
import { migrateVersion, nowIso } from '../schemas/common';
import {
  customIngredientSchema,
  customRecipeSchema,
  metaSchema,
  planSchema,
  prepSchema,
  profileSchema,
  profilesSchema,
  shoppingSchema,
  type PlanDoc,
  type PrepDoc,
  type ProfileDoc,
  type ProfilesDoc,
  type ShoppingDoc,
} from '../schemas/docs';
import { mergePlan, mergePrep, mergeProfiles, mergeShopping, mergeWhole } from './merge';

export type DocKind = 'meta' | 'profiles' | 'profile' | 'plan' | 'prep' | 'shopping' | 'customRecipe' | 'customIngredient';

type Parsed = { kind: DocKind; owner: string | null; week: string | null };

const PATTERNS: { re: RegExp; kind: DocKind; owner?: number; week?: number }[] = [
  { re: /^meta\.json$/, kind: 'meta' },
  { re: /^profiles\.json$/, kind: 'profiles' },
  { re: /^users\/([\w-]+)\/profile\.json$/, kind: 'profile', owner: 1 },
  { re: /^users\/([\w-]+)\/plans\/(\d{4}-W\d{2})\.json$/, kind: 'plan', owner: 1, week: 2 },
  { re: /^users\/([\w-]+)\/prep\/(\d{4}-W\d{2})\.json$/, kind: 'prep', owner: 1, week: 2 },
  { re: /^users\/([\w-]+)\/shopping\/(\d{4}-W\d{2})\.json$/, kind: 'shopping', owner: 1, week: 2 },
  { re: /^recipes\/custom\/[\w-]+\.json$/, kind: 'customRecipe' },
  { re: /^ingredients\/custom\/[\w-]+\.json$/, kind: 'customIngredient' },
];

export function parsePath(path: string): Parsed | null {
  for (const p of PATTERNS) {
    const m = p.re.exec(path);
    if (m) return { kind: p.kind, owner: p.owner ? m[p.owner]! : null, week: p.week ? m[p.week]! : null };
  }
  return null;
}

const SCHEMAS: Record<DocKind, z.ZodType> = {
  meta: metaSchema,
  profiles: profilesSchema,
  profile: profileSchema,
  plan: planSchema,
  prep: prepSchema,
  shopping: shoppingSchema,
  customRecipe: customRecipeSchema,
  customIngredient: customIngredientSchema,
};

/** Всё, что пришло из репо, проходит миграцию и zod до использования. */
export function validateDoc(path: string, raw: unknown): unknown {
  const parsed = parsePath(path);
  if (!parsed) throw new Error(`Неизвестный тип файла: ${path}`);
  const res = SCHEMAS[parsed.kind].safeParse(migrateVersion(raw));
  if (!res.success) {
    const issue = res.error.issues[0];
    throw new Error(`Файл ${path} не прошёл проверку: ${issue?.path.join('.') || 'корень'}: ${issue?.message ?? ''}`);
  }
  return res.data;
}

export function mergeDocs(path: string, local: unknown, remote: unknown): unknown {
  const kind = parsePath(path)?.kind;
  switch (kind) {
    case 'profiles':
      return mergeProfiles(local as ProfilesDoc, remote as ProfilesDoc);
    case 'plan':
      return mergePlan(local as PlanDoc, remote as PlanDoc);
    case 'shopping':
      return mergeShopping(local as ShoppingDoc, remote as ShoppingDoc);
    case 'prep':
      return mergePrep(local as PrepDoc, remote as PrepDoc);
    default:
      return mergeWhole(local as { updatedAt: string }, remote as { updatedAt: string });
  }
}

export const paths = {
  meta: 'meta.json',
  profiles: 'profiles.json',
  profile: (pid: string) => `users/${pid}/profile.json`,
  plan: (pid: string, week: string) => `users/${pid}/plans/${week}.json`,
  prep: (pid: string, week: string) => `users/${pid}/prep/${week}.json`,
  shopping: (pid: string, week: string) => `users/${pid}/shopping/${week}.json`,
  customRecipe: (id: string) => `recipes/custom/${id}.json`,
  customIngredient: (id: string) => `ingredients/custom/${id}.json`,
};

/** Дефолт для файла, которого нет в репо. Для своих рецептов дефолта нет. */
export function defaultDoc(path: string): unknown {
  const p = parsePath(path);
  const t = nowIso();
  if (!p) return null;
  switch (p.kind) {
    case 'meta':
      return { schemaVersion: 1, createdAt: t };
    case 'profiles':
      return { schemaVersion: 1, updatedAt: t, profiles: [] } satisfies ProfilesDoc;
    case 'profile':
      return defaultProfile(p.owner!, t);
    case 'plan':
      return { schemaVersion: 1, updatedAt: t, week: p.week!, seed: 0, mealsPerDay: 4, slots: {} } satisfies PlanDoc;
    case 'prep':
      return { schemaVersion: 1, updatedAt: t, week: p.week!, cookDays: [], doneSteps: {} } satisfies PrepDoc;
    case 'shopping':
      return { schemaVersion: 1, updatedAt: t, week: p.week!, items: {} } satisfies ShoppingDoc;
    default:
      return null;
  }
}

export function defaultProfile(id: string, t = nowIso()): ProfileDoc {
  return {
    schemaVersion: 1,
    updatedAt: t,
    id,
    onboardingDone: false,
    sex: null,
    age: null,
    heightCm: null,
    weightHistory: [],
    activity: 2,
    goal: 'maintain',
    kcalAdjust: 0,
    likes: [],
    dislikes: [],
    exclusions: { preset: [], custom: [] },
    mealsPerDay: 4,
    kitchen: { burners: 4, ovens: 1 },
  };
}
