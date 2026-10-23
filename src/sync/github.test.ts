import { describe, expect, it } from 'vitest';
import { GitHubClient, GitHubError } from './github';
import { FakeGitHub } from '../test/fakeGithub';

const TOKEN = 'fake-token-for-tests-only-0000';

function respond(status: number, json: unknown, headers: Record<string, string> = {}): typeof fetch {
  return async () => new Response(JSON.stringify(json), { status, headers });
}

async function errorOf(p: Promise<unknown>): Promise<GitHubError> {
  try {
    await p;
  } catch (e) {
    if (e instanceof GitHubError) return e;
    throw e;
  }
  throw new Error('ожидалась ошибка');
}

describe('GitHubClient: ошибки по кодам', () => {
  it.each([
    [401, {}, {}, 'auth', /Токен неверный или истёк/],
    [403, { message: 'Resource not accessible by personal access token' }, {}, 'forbidden', /нет прав/],
    [403, { message: 'API rate limit exceeded' }, { 'x-ratelimit-remaining': '0' }, 'rateLimit', /лимит/],
    [404, { message: 'Not Found' }, {}, 'repoNotFound', /не видит propitanie_bd/],
    [500, {}, {}, 'server', /GitHub сейчас отвечает с ошибкой/],
  ] as const)('%i → %s', async (status, body, headers, kind, text) => {
    const client = new GitHubClient(TOKEN, respond(status, body, headers));
    const e = await errorOf(client.getRepo());
    expect(e.kind).toBe(kind);
    expect(e.message).toMatch(text);
    expect(e.message).not.toContain(TOKEN);
  });

  it('сетевая ошибка отдельно', async () => {
    const client = new GitHubClient(TOKEN, async () => {
      throw new TypeError('Failed to fetch');
    });
    const e = await errorOf(client.getRepo());
    expect(e.kind).toBe('network');
    expect(e.message).toMatch(/Нет связи/);
  });

  it('пустой репо даёт понятный текст', async () => {
    const gh = new FakeGitHub();
    gh.empty = true;
    const client = new GitHubClient(TOKEN, gh.fetch);
    const e = await errorOf(client.getTree('main', null));
    expect(e.kind).toBe('emptyRepo');
    expect(e.message).toBe('Репозиторий propitanie_bd пустой. Создай в нём README и попробуй снова.');
  });
});

describe('GitHubClient: запросы', () => {
  it('токен только в заголовке, не в URL; запросы без кэша', async () => {
    const seen: { url: string; init: RequestInit | undefined }[] = [];
    const client = new GitHubClient(TOKEN, async (input, init) => {
      seen.push({ url: String(input), init });
      return new Response(JSON.stringify({ default_branch: 'main' }), { status: 200 });
    });
    await client.getRepo();
    expect(seen[0]!.url).not.toContain(TOKEN);
    expect((seen[0]!.init?.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);
    expect(seen[0]!.init?.cache).toBe('no-store');
  });

  it('файл с кириллицей читается, переносы base64 убираются, 404 даёт null', async () => {
    const gh = new FakeGitHub();
    gh.setJson('profiles.json', { name: 'Длинное название, чтобы base64 точно переносился на новую строку' });
    const client = new GitHubClient(TOKEN, gh.fetch);
    const f = await client.getFile('profiles.json', 'main');
    expect(f?.data).toEqual({ name: 'Длинное название, чтобы base64 точно переносился на новую строку' });
    expect(await client.getFile('nope.json', 'main')).toBeNull();
  });

  it('дерево с ETag: второй раз 304', async () => {
    const gh = new FakeGitHub();
    gh.setJson('meta.json', { schemaVersion: 1, createdAt: 'x' });
    const client = new GitHubClient(TOKEN, gh.fetch);
    const first = await client.getTree('main', null);
    expect(first.notModified).toBe(false);
    if (first.notModified) return;
    expect(first.files.get('meta.json')).toBeTruthy();
    const second = await client.getTree('main', first.etag);
    expect(second.notModified).toBe(true);
    expect(gh.calls.at(-1)?.headers['If-None-Match']).toBe(first.etag);
  });

  it('PUT без sha на существующий файл и с чужим sha считается конфликтом', async () => {
    const gh = new FakeGitHub();
    gh.setJson('profiles.json', {});
    const client = new GitHubClient(TOKEN, gh.fetch);
    expect((await errorOf(client.putFile('profiles.json', {}, { sha: null, message: 'm', branch: 'main' }))).kind).toBe('conflict');
    expect((await errorOf(client.putFile('profiles.json', {}, { sha: 'old', message: 'm', branch: 'main' }))).kind).toBe('conflict');
  });
});
