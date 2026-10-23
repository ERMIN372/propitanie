import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeGitHub } from '../test/fakeGithub';
import { db, clearLocalData } from './db';
import { GitHubClient } from './github';
import { SyncEngine, type EngineStatus } from './engine';
import { writeDoc, deleteDoc, ReadOnlyError } from './docs';
import { defaultDoc, paths } from './paths';
import { useSession } from '../stores/session';
import type { PlanDoc, ProfilesDoc, ShoppingDoc } from '../schemas/docs';

const ME = 'me_profile1';
const OTHER = 'other_prof2';
const WEEK = '2026-W43';
const PLAN = paths.plan(ME, WEEK);

const slot = (recipeId: string | null, updatedAt: string) => ({ recipeId, portions: 1, manual: true, updatedAt });

function setup() {
  const gh = new FakeGitHub();
  const statuses: EngineStatus[] = [];
  const engine = new SyncEngine({
    client: new GitHubClient('fake-token', gh.fetch),
    branch: 'main',
    authorName: async () => 'Тестер',
    hotWeeks: () => [WEEK],
    onStatus: (s) => statuses.push(s),
  });
  return { gh, engine, statuses, last: () => statuses.at(-1) };
}

beforeEach(async () => {
  await clearLocalData();
  useSession.getState().setProfile(ME);
});

describe('отправка и 409', () => {
  it('новый файл создаётся, сообщение коммита по формату, локальная копия чистая', async () => {
    const { gh, engine, last } = setup();
    await writeDoc<PlanDoc>(PLAN, (p) => ({ ...p, slots: { '1:lunch': slot('plov', '2026-10-20T10:00:00.000Z') } }));
    expect(await db.outbox.count()).toBe(1);

    await engine.syncNow();

    expect(gh.json<PlanDoc>(PLAN)?.slots['1:lunch']?.recipeId).toBe('plov');
    expect(gh.putMessages()).toEqual([`Тестер: создать ${PLAN}`]);
    expect(await db.outbox.count()).toBe(0);
    expect((await db.docs.get(PLAN))?.dirty).toBe(false);
    expect(last()).toEqual({ state: 'saved', error: null });
  });

  it('409: перечитывает, мёрджит по слотам и повторяет', async () => {
    const { gh, engine } = setup();
    // у нас: старая версия файла и новый ужин во вторник
    const oldSha = gh.setJson(PLAN, { ...(defaultDoc(PLAN) as PlanDoc), slots: { '1:lunch': slot('borsch', '2026-10-20T09:00:00.000Z') } });
    await db.docs.put({ path: PLAN, data: gh.json(PLAN), sha: oldSha, rev: 0, dirty: false, deleted: false });
    await writeDoc<PlanDoc>(PLAN, (p) => ({ ...p, slots: { ...p.slots, '2:dinner': slot('soup', '2026-10-20T11:00:00.000Z') } }));

    // на другом устройстве за это время поменяли обед в понедельник
    gh.setJson(PLAN, { ...(defaultDoc(PLAN) as PlanDoc), slots: { '1:lunch': slot('plov', '2026-10-20T10:00:00.000Z') } });

    await engine.syncNow();

    const remote = gh.json<PlanDoc>(PLAN)!;
    expect(remote.slots['1:lunch']?.recipeId).toBe('plov');
    expect(remote.slots['2:dinner']?.recipeId).toBe('soup');
    const puts = gh.calls.filter((c) => c.method === 'PUT');
    expect(puts).toHaveLength(2);
    expect(await db.outbox.count()).toBe(0);
  });

  it('после 3 конфликтов подряд сдаётся с понятной ошибкой и оставляет правку в очереди', async () => {
    const { gh, engine, last } = setup();
    gh.setJson(PLAN, defaultDoc(PLAN));
    await writeDoc<PlanDoc>(PLAN, (p) => ({ ...p, seed: 5 }));
    let n = 0;
    gh.beforePut = (path) => {
      gh.setJson(path, { ...(defaultDoc(PLAN) as PlanDoc), seed: 100 + n++ });
    };

    await engine.syncNow();

    expect(gh.calls.filter((c) => c.method === 'PUT')).toHaveLength(3);
    expect(last()?.state).toBe('error');
    expect(last()?.error).toMatch(/3 раза подряд/);
    expect(await db.outbox.count()).toBe(1);
  });

  it('без сети статус "offline", правка ждёт в очереди', async () => {
    const statuses: EngineStatus[] = [];
    const engine = new SyncEngine({
      client: new GitHubClient('fake-token', async () => {
        throw new TypeError('Failed to fetch');
      }),
      branch: 'main',
      authorName: async () => 'Тестер',
      hotWeeks: () => [WEEK],
      onStatus: (s) => statuses.push(s),
    });
    await writeDoc<PlanDoc>(PLAN, (p) => ({ ...p, seed: 1 }));
    await engine.syncNow();
    expect(statuses.at(-1)?.state).toBe('offline');
    expect(await db.outbox.count()).toBe(1);
  });

  it('удаление своего рецепта уходит DELETE', async () => {
    const { gh, engine } = setup();
    const path = paths.customRecipe('r1');
    const sha = gh.setJson(path, { any: 1 });
    await db.docs.put({ path, data: {}, sha, rev: 0, dirty: false, deleted: false });
    await deleteDoc(path);
    await engine.syncNow();
    expect(gh.files.has(path)).toBe(false);
    expect(await db.docs.get(path)).toBeUndefined();
    expect(gh.putMessages()).toEqual([`Тестер: удалить ${path}`]);
  });
});

describe('чтение', () => {
  it('тянет изменившиеся файлы, на 304 больше ничего не скачивает', async () => {
    const { gh, engine } = setup();
    const profiles: ProfilesDoc = {
      schemaVersion: 1,
      updatedAt: '2026-10-20T10:00:00.000Z',
      profiles: [{ id: OTHER, name: 'Тестерка', colorKey: 'pea', createdAt: '2026-10-20T10:00:00.000Z' }],
    };
    gh.setJson(paths.profiles, profiles);
    gh.setJson(paths.plan(OTHER, WEEK), { ...(defaultDoc(paths.plan(OTHER, WEEK)) as PlanDoc), seed: 42 });
    gh.setJson(paths.plan(OTHER, '2025-W01'), defaultDoc(paths.plan(OTHER, '2025-W01')));

    await engine.syncNow();
    expect(((await db.docs.get(paths.profiles))?.data as ProfilesDoc).profiles[0]?.name).toBe('Тестерка');
    expect(((await db.docs.get(paths.plan(OTHER, WEEK)))?.data as PlanDoc).seed).toBe(42);
    // старая неделя не горячая: не качаем, пока не откроют
    expect(await db.docs.get(paths.plan(OTHER, '2025-W01'))).toBeUndefined();

    const before = gh.calls.length;
    await engine.syncNow();
    expect(gh.calls.length - before).toBe(1);
  });

  it('битый файл в репо не попадает в кэш, остальные читаются', async () => {
    const { gh, engine, last } = setup();
    gh.setJson(paths.profile(OTHER), { schemaVersion: 1, nonsense: true });
    gh.setJson(paths.meta, { schemaVersion: 1, createdAt: 'x' });
    await engine.syncNow();
    expect(await db.docs.get(paths.profile(OTHER))).toBeUndefined();
    expect(await db.docs.get(paths.meta)).toBeTruthy();
    expect(last()?.state).toBe('error');
    expect(last()?.error).toMatch(/не прошёл проверку/);
  });

  it('свой рецепт, удалённый на другом устройстве, пропадает только после двух деревьев', async () => {
    const { gh, engine } = setup();
    const path = paths.customRecipe('r2');
    const sha = gh.setJson(path, {});
    await db.docs.put({ path, data: {}, sha, rev: 0, dirty: false, deleted: false });
    gh.files.delete(path);
    gh.setJson(paths.meta, { schemaVersion: 1, createdAt: 'x' });
    await engine.syncNow();
    expect(await db.docs.get(path)).toBeTruthy();
    gh.setJson(paths.meta, { schemaVersion: 1, createdAt: 'y' });
    await engine.syncNow();
    expect(await db.docs.get(path)).toBeUndefined();
  });
});

describe('только чтение для чужих данных', () => {
  it('чужой план записать нельзя', async () => {
    await expect(writeDoc<PlanDoc>(paths.plan(OTHER, WEEK), (p) => p)).rejects.toBeInstanceOf(ReadOnlyError);
  });

  it('список покупок у каждого свой: свой пишется, чужой нет', async () => {
    expect(paths.shopping(ME, WEEK)).toBe(`users/${ME}/shopping/${WEEK}.json`);
    await expect(writeDoc<ShoppingDoc>(paths.shopping(OTHER, WEEK), (d) => d)).rejects.toBeInstanceOf(ReadOnlyError);
    const own = await writeDoc<ShoppingDoc>(paths.shopping(ME, WEEK), (d) => d);
    expect(own.week).toBe(WEEK);
  });
});

describe('debounce', () => {
  it('несколько правок подряд уходят одним PUT через 2 с', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      const { gh, engine } = setup();
      for (let i = 0; i < 3; i++) {
        await writeDoc<PlanDoc>(PLAN, (p) => ({ ...p, seed: i }));
        engine.schedule();
      }
      await vi.advanceTimersByTimeAsync(1900);
      expect(gh.calls.filter((c) => c.method === 'PUT')).toHaveLength(0);
      await vi.advanceTimersByTimeAsync(200);
      vi.useRealTimers();
      await vi.waitFor(async () => expect(await db.outbox.count()).toBe(0));
      expect(gh.calls.filter((c) => c.method === 'PUT')).toHaveLength(1);
      expect(gh.json<PlanDoc>(PLAN)?.seed).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
