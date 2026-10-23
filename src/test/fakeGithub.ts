// Фейковый GitHub REST API в памяти: ровно те эндпоинты, которыми пользуется клиент.
import { decodeBase64Utf8, encodeBase64Utf8 } from '../sync/base64';

type File = { sha: string; text: string };
export type Call = { method: string; path: string; headers: Record<string, string>; body: Record<string, unknown> | null };

const PREFIX = 'https://api.github.com/repos/ERMIN372/propitanie_bd';

export class FakeGitHub {
  files = new Map<string, File>();
  calls: Call[] = [];
  empty = false;
  repoStatus = 200;
  /** Вызывается перед каждым PUT: можно подменить файл, будто его изменили на другом устройстве. */
  beforePut: ((path: string) => void) | null = null;
  private seq = 0;
  private version = 0;

  setJson(path: string, data: unknown): string {
    const sha = `sha${++this.seq}`;
    this.files.set(path, { sha, text: JSON.stringify(data) });
    this.version++;
    return sha;
  }

  json<T = unknown>(path: string): T | undefined {
    const f = this.files.get(path);
    return f ? (JSON.parse(f.text) as T) : undefined;
  }

  fetch: typeof fetch = async (input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
    const rel = url.slice(PREFIX.length);
    this.calls.push({ method, path: rel, headers, body });

    if (this.repoStatus !== 200) return res(this.repoStatus, { message: 'Bad credentials' });
    if (rel === '' && method === 'GET') return res(200, { default_branch: 'main', permissions: { push: true } });

    if (rel.startsWith('/git/trees/')) {
      if (this.empty) return res(409, { message: 'Git Repository is empty.' });
      const etag = `W/"v${this.version}"`;
      if (headers['If-None-Match'] === etag) return new Response(null, { status: 304 });
      const tree = [...this.files].map(([path, f]) => ({ path, type: 'blob', sha: f.sha }));
      return res(200, { tree, truncated: false }, { ETag: etag });
    }

    const m = /^\/contents\/([^?]+)/.exec(rel);
    if (!m) return res(404, { message: 'Not Found' });
    const path = decodeURIComponent(m[1]!);
    if (this.empty) return res(404, { message: 'This repository is empty.' });
    const cur = this.files.get(path);

    if (method === 'GET') {
      if (!cur) return res(404, { message: 'Not Found' });
      // как настоящий GitHub: base64 с переносами каждые 60 символов
      const content = encodeBase64Utf8(cur.text).replace(/(.{60})/g, '$1\n');
      return res(200, { type: 'file', encoding: 'base64', sha: cur.sha, content });
    }

    if (method === 'PUT') {
      this.beforePut?.(path);
      const now = this.files.get(path);
      if (now && !body?.sha) return res(422, { message: 'Invalid request.\n\n"sha" wasn\'t supplied.' });
      if (now && body?.sha !== now.sha) return res(409, { message: `${path} does not match ${String(body?.sha)}` });
      if (!now && body?.sha) return res(404, { message: 'Not Found' });
      const sha = `sha${++this.seq}`;
      this.files.set(path, { sha, text: decodeBase64Utf8(String(body?.content)) });
      this.version++;
      return res(now ? 200 : 201, { content: { sha, path } });
    }

    if (method === 'DELETE') {
      if (!cur) return res(404, { message: 'Not Found' });
      if (body?.sha !== cur.sha) return res(409, { message: 'does not match' });
      this.files.delete(path);
      this.version++;
      return res(200, { content: null });
    }
    return res(405, { message: 'Method not allowed' });
  };

  putMessages(): string[] {
    return this.calls.filter((c) => c.method === 'PUT' || c.method === 'DELETE').map((c) => String(c.body?.message));
  }
}

function res(status: number, json: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(json), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}
