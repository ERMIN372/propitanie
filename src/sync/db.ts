import Dexie, { type Table } from 'dexie';

/** Локальная копия файла из propitanie_bd. UI читает только отсюда. */
export type DocRow = {
  path: string;
  data: unknown;
  /** sha блоба в репо, null если файла там ещё нет */
  sha: string | null;
  /** растёт на каждую локальную правку, по нему понимаем, что отправили последнюю версию */
  rev: number;
  dirty: boolean;
  deleted: boolean;
};

/** Очередь отправки: на путь одна запись, отправляется актуальное содержимое docs. */
export type OutboxRow = { path: string; queuedAt: string; attempts: number };

export type KvRow = { key: string; value: unknown };

class PropitanieDb extends Dexie {
  docs!: Table<DocRow, string>;
  outbox!: Table<OutboxRow, string>;
  kv!: Table<KvRow, string>;

  constructor() {
    super('propitanie');
    this.version(1).stores({ docs: 'path', outbox: 'path, queuedAt', kv: 'key' });
  }
}

export const db = new PropitanieDb();

export async function kvGet<T>(key: string): Promise<T | undefined> {
  return (await db.kv.get(key))?.value as T | undefined;
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  await db.kv.put({ key, value });
}

export async function clearLocalData(): Promise<void> {
  await db.transaction('rw', db.docs, db.outbox, db.kv, async () => {
    await Promise.all([db.docs.clear(), db.outbox.clear(), db.kv.clear()]);
  });
}
