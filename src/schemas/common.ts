import { z } from 'zod';

export const SCHEMA_VERSION = 1;

export const isoTime = z.string().min(1);
export const weekId = z.string().regex(/^\d{4}-W\d{2}$/);
export const mealType = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);
export type MealType = z.infer<typeof mealType>;

export const exclusionKey = z.enum(['fish', 'seafood', 'pork', 'beef', 'mushrooms', 'dairy', 'eggs', 'gluten', 'nuts']);
export type ExclusionKey = z.infer<typeof exclusionKey>;

export const colorKey = z.enum(['tomato', 'cobalt', 'pea', 'mustard']);
export type ColorKey = z.infer<typeof colorKey>;

/** Время в ISO. Вынесено, чтобы тесты могли подменять часы. */
export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Миграции: на входе любой JSON из репо, на выходе объект текущей версии или ошибка.
 * Пока версия одна, миграция только проверяет, что файл не из будущего.
 */
export function migrateVersion(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null) return raw;
  const v = (raw as { schemaVersion?: unknown }).schemaVersion;
  if (typeof v === 'number' && v > SCHEMA_VERSION) {
    throw new Error(`Файл записан более новой версией приложения (schemaVersion ${v}). Обнови приложение.`);
  }
  return raw;
}
