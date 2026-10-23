// Чтение и запись документов для UI. Запись: сразу локально, потом в очередь на отправку.
import { liveQuery } from 'dexie';
import { useEffect, useMemo, useState } from 'react';
import { nowIso } from '../schemas/common';
import { useSession } from '../stores/session';
import { db, type DocRow } from './db';
import { defaultDoc, parsePath, validateDoc } from './paths';
import { getEngine } from './runtime';

export class ReadOnlyError extends Error {
  constructor() {
    super('Это чужие данные, их можно только смотреть. Переключись на свой профиль.');
  }
}

export function canWrite(path: string, me: string | null): boolean {
  const p = parsePath(path);
  if (!p || !me) return false;
  return p.owner === null || p.owner === me;
}

async function save(path: string, build: (cur: DocRow | undefined) => unknown): Promise<unknown> {
  if (!canWrite(path, useSession.getState().profileId)) throw new ReadOnlyError();
  const data = await db.transaction('rw', db.docs, db.outbox, async () => {
    const cur = await db.docs.get(path);
    const next = validateDoc(path, build(cur));
    await db.docs.put({ path, data: next, sha: cur?.sha ?? null, rev: (cur?.rev ?? 0) + 1, dirty: true, deleted: false });
    const queued = await db.outbox.get(path);
    await db.outbox.put({ path, queuedAt: queued?.queuedAt ?? nowIso(), attempts: 0 });
    return next;
  });
  getEngine()?.schedule();
  return data;
}

/** Изменить документ. Если его нет ни локально, ни в репо, берётся дефолт. */
export async function writeDoc<T extends { updatedAt: string }>(path: string, update: (cur: T) => T): Promise<T> {
  return (await save(path, (cur) => {
    const base = (cur && !cur.deleted ? cur.data : defaultDoc(path)) as T | null;
    if (base === null) throw new Error(`Нет данных для ${path}`);
    return { ...update(structuredClone(base)), updatedAt: nowIso() };
  })) as T;
}

/** Записать документ целиком (свои рецепты и ингредиенты). */
export async function putDoc<T extends { updatedAt: string }>(path: string, data: T): Promise<T> {
  return (await save(path, () => ({ ...data, updatedAt: nowIso() }))) as T;
}

export async function deleteDoc(path: string): Promise<void> {
  if (!canWrite(path, useSession.getState().profileId)) throw new ReadOnlyError();
  await db.transaction('rw', db.docs, db.outbox, async () => {
    const cur = await db.docs.get(path);
    if (!cur) return;
    if (!cur.sha) {
      await db.docs.delete(path);
      await db.outbox.delete(path);
      return;
    }
    await db.docs.put({ ...cur, rev: cur.rev + 1, dirty: true, deleted: true });
    await db.outbox.put({ path, queuedAt: nowIso(), attempts: 0 });
  });
  getEngine()?.schedule();
}

/**
 * Живое чтение документа из IndexedDB. Пока файла нет локально, просит движок подтянуть его,
 * а на экран отдаёт дефолт (как будто файл пустой).
 */
export function useDoc<T>(path: string | null): T | undefined {
  const [state, setState] = useState<{ path: string; row: DocRow | undefined } | null>(null);

  useEffect(() => {
    if (!path) return;
    let asked = false;
    const sub = liveQuery(() => db.docs.get(path)).subscribe({
      next: (row) => {
        setState({ path, row });
        if (!row && !asked) {
          asked = true;
          void getEngine()?.fetchOne(path);
        }
      },
    });
    return () => sub.unsubscribe();
  }, [path]);

  // дефолт мемоизирован, иначе каждый рендер получал бы новый объект
  const fallback = useMemo(() => (path ? (defaultDoc(path) ?? undefined) : undefined), [path]);
  if (!path || state?.path !== path) return undefined;
  if (state.row && !state.row.deleted) return state.row.data as T;
  return fallback as T | undefined;
}
