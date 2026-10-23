import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { FakeGitHub } from '../../test/fakeGithub';
import { clearLocalData, db } from '../../sync/db';
import { paths } from '../../sync/paths';
import type { ProfilesDoc } from '../../schemas/docs';
import { connect, createProfile, exportMyData } from './connect';
import { useSession } from '../../stores/session';

beforeEach(async () => {
  await clearLocalData();
  useSession.getState().reset();
});

describe('подключение', () => {
  it('в новом репо создаёт meta.json и profiles.json', async () => {
    const gh = new FakeGitHub();
    gh.setJson('README.md.json', {}); // репо не пустой
    const { branch } = await connect('fake-token', gh.fetch);
    expect(branch).toBe('main');
    expect(gh.json(paths.meta)).toMatchObject({ schemaVersion: 1 });
    expect(gh.json<ProfilesDoc>(paths.profiles)?.profiles).toEqual([]);
    expect(gh.putMessages()).toEqual(['Пропитание: создать meta.json', 'Пропитание: создать profiles.json']);
    expect(await db.docs.get(paths.profiles)).toBeTruthy();
  });

  it('существующие файлы не перезаписывает', async () => {
    const gh = new FakeGitHub();
    gh.setJson(paths.meta, { schemaVersion: 1, createdAt: '2026-01-01T00:00:00.000Z' });
    gh.setJson(paths.profiles, { schemaVersion: 1, updatedAt: '2026-01-01T00:00:00.000Z', profiles: [] });
    await connect('fake-token', gh.fetch);
    expect(gh.putMessages()).toEqual([]);
  });

  it('пустой репо: просит создать README', async () => {
    const gh = new FakeGitHub();
    gh.empty = true;
    await expect(connect('fake-token', gh.fetch)).rejects.toThrow('Создай в нём README и попробуй снова');
  });

  it('неверный токен: 401', async () => {
    const gh = new FakeGitHub();
    gh.repoStatus = 401;
    await expect(connect('fake-token', gh.fetch)).rejects.toThrow('Токен неверный или истёк');
  });
});

describe('профиль', () => {
  it('создание профиля пишет profiles.json и profile.json в очередь', async () => {
    const id = await createProfile('  Тестер ', 'cobalt');
    expect(useSession.getState().profileId).toBe(id);
    const profiles = (await db.docs.get(paths.profiles))?.data as ProfilesDoc;
    expect(profiles.profiles[0]).toMatchObject({ id, name: 'Тестер', colorKey: 'cobalt' });
    expect(await db.docs.get(paths.profile(id))).toBeTruthy();
    expect((await db.outbox.toArray()).map((r) => r.path).sort()).toEqual([paths.profile(id), paths.profiles].sort());
  });

  it('экспорт содержит только свои файлы', async () => {
    const id = await createProfile('Тестер', 'pea');
    await db.docs.put({ path: 'users/someone/profile.json', data: {}, sha: 'x', rev: 0, dirty: false, deleted: false });
    const json = JSON.parse(await (await exportMyData(id)).text()) as { files: Record<string, unknown> };
    expect(Object.keys(json.files)).toEqual([paths.profile(id)]);
  });
});
