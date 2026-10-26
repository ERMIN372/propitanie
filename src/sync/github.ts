// Тонкий клиент GitHub REST API для репо с данными.
// Токен живёт только в заголовке Authorization: в URL, тексты ошибок и логи он не попадает.
import { decodeBase64Utf8, encodeBase64Utf8 } from './base64';

export const DATA_REPO = { owner: 'ERMIN372', name: 'propitanie_bd' } as const;
const API = 'https://api.github.com';

export type GitHubErrorKind =
  | 'auth'
  | 'forbidden'
  | 'rateLimit'
  | 'repoNotFound'
  | 'conflict'
  | 'emptyRepo'
  | 'network'
  | 'invalid'
  | 'server';

export class GitHubError extends Error {
  constructor(
    readonly kind: GitHubErrorKind,
    readonly status: number,
    message = ERROR_TEXT[kind],
  ) {
    super(message);
    this.name = 'GitHubError';
  }
}

export const ERROR_TEXT: Record<GitHubErrorKind, string> = {
  auth: 'Токен неверный или истёк. Выпусти новый и подключись заново.',
  forbidden: 'У токена нет прав на запись. Проверь, что выдан доступ Contents: Read and write к propitanie_bd.',
  rateLimit: 'Упёрлись в лимит запросов GitHub. Подожди минут 10–15, я повторю сам.',
  repoNotFound: 'Токен не видит propitanie_bd. Проверь, что при выпуске токена выбран именно этот репозиторий.',
  conflict: 'Файл одновременно изменили на другом устройстве. Повтори через минуту.',
  emptyRepo: 'Репозиторий propitanie_bd пустой. Создай в нём README и попробуй снова.',
  network: 'Нет связи с GitHub. Проверь интернет, отправлю, когда сеть вернётся.',
  invalid: 'GitHub отклонил запрос. Повтори, а если не поможет, выйди и подключись заново.',
  server: 'GitHub сейчас отвечает с ошибкой. Повтори через пару минут.',
};

export type RemoteFile = { sha: string; data: unknown };
export type TreeResult = { notModified: true } | { notModified: false; etag: string | null; files: Map<string, string> };

type ReqOpts = { body?: unknown; etag?: string | null; scope: 'repo' | 'file' };

export class GitHubClient {
  constructor(
    private readonly token: string,
    private readonly fetchImpl: typeof fetch = (...a) => fetch(...a),
  ) {}

  private base = `${API}/repos/${DATA_REPO.owner}/${DATA_REPO.name}`;

  private async req(method: string, url: string, opts: ReqOpts): Promise<{ status: number; json: unknown; etag: string | null }> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${this.token}`,
    };
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    if (opts.etag) headers['If-None-Match'] = opts.etag;

    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        method,
        headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
        cache: 'no-store',
      });
    } catch {
      throw new GitHubError('network', 0);
    }
    if (res.status === 304) return { status: 304, json: null, etag: opts.etag ?? null };

    const json: unknown = await res.json().catch(() => null);
    const etag = res.headers.get('ETag');
    if (res.ok) return { status: res.status, json, etag };

    const msg = String((json as { message?: unknown } | null)?.message ?? '').toLowerCase();
    if (opts.scope === 'file' && res.status === 404 && !msg.includes('empty')) return { status: 404, json, etag };
    throw classify(res.status, msg, res.headers, opts.scope);
  }

  async getRepo(): Promise<{ defaultBranch: string; canPush: boolean | null }> {
    const { json } = await this.req('GET', this.base, { scope: 'repo' });
    const repo = json as { default_branch?: string; permissions?: { push?: boolean } };
    return { defaultBranch: repo.default_branch ?? 'main', canPush: repo.permissions?.push ?? null };
  }

  /** Дерево ветки целиком: путь → sha блоба. Один запрос вместо опроса каждого файла. */
  async getTree(branch: string, etag: string | null): Promise<TreeResult> {
    const url = `${this.base}/git/trees/${encodeURIComponent(branch)}?recursive=1`;
    const res = await this.req('GET', url, { scope: 'repo', etag });
    if (res.status === 304) return { notModified: true };
    const tree = (res.json as { tree?: { path: string; type: string; sha: string }[] }).tree ?? [];
    const files = new Map<string, string>();
    for (const t of tree) if (t.type === 'blob' && t.path.endsWith('.json')) files.set(t.path, t.sha);
    return { notModified: false, etag: res.etag, files };
  }

  async getFile(path: string, branch: string): Promise<RemoteFile | null> {
    const res = await this.req('GET', `${this.base}/contents/${encodePath(path)}?ref=${encodeURIComponent(branch)}`, { scope: 'file' });
    if (res.status === 404) return null;
    const f = res.json as { sha?: string; content?: string; encoding?: string };
    if (!f.sha || f.encoding !== 'base64' || typeof f.content !== 'string') {
      throw new GitHubError('invalid', res.status, `Файл ${path} слишком большой или повреждён.`);
    }
    let data: unknown;
    try {
      data = JSON.parse(decodeBase64Utf8(f.content));
    } catch {
      throw new GitHubError('invalid', res.status, `Файл ${path} не читается как JSON. Поправь его в репо или удали.`);
    }
    return { sha: f.sha, data };
  }

  async putFile(path: string, data: unknown, o: { sha: string | null; message: string; branch: string }): Promise<{ sha: string }> {
    const body: Record<string, string> = {
      message: o.message,
      content: encodeBase64Utf8(JSON.stringify(data, null, 2) + '\n'),
      branch: o.branch,
    };
    if (o.sha) body.sha = o.sha;
    const res = await this.req('PUT', `${this.base}/contents/${encodePath(path)}`, { scope: 'file', body });
    // 404 при известном sha: файл удалили на другом устройстве, движок перечитает и создаст заново
    if (res.status === 404) throw new GitHubError(o.sha ? 'conflict' : 'repoNotFound', 404);
    const sha = (res.json as { content?: { sha?: string } }).content?.sha;
    if (!sha) throw new GitHubError('invalid', 200);
    return { sha };
  }

  /** false, если файла уже нет. */
  async deleteFile(path: string, o: { sha: string; message: string; branch: string }): Promise<boolean> {
    const res = await this.req('DELETE', `${this.base}/contents/${encodePath(path)}`, {
      scope: 'file',
      body: { message: o.message, sha: o.sha, branch: o.branch },
    });
    return res.status !== 404;
  }
}

function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

function classify(status: number, msg: string, headers: Headers, scope: ReqOpts['scope']): GitHubError {
  if ((status === 404 || status === 409) && msg.includes('empty')) return new GitHubError('emptyRepo', status);
  if (status === 401) return new GitHubError('auth', status);
  if (status === 429 || (status === 403 && (headers.get('x-ratelimit-remaining') === '0' || msg.includes('rate limit')))) {
    return new GitHubError('rateLimit', status);
  }
  if (status === 403) return new GitHubError('forbidden', status);
  if (status === 404) return new GitHubError(scope === 'repo' ? 'repoNotFound' : 'invalid', status);
  if (status === 409) return new GitHubError('conflict', status);
  // 422 на устаревший или отсутствующий sha: по сути тот же конфликт
  if (status === 422 && msg.includes('sha')) return new GitHubError('conflict', status);
  if (status >= 500) return new GitHubError('server', status);
  return new GitHubError('invalid', status);
}

export function errorMessage(e: unknown): string {
  if (e instanceof GitHubError) return e.message;
  if (e instanceof Error) return e.message;
  return 'Что-то пошло не так. Повтори ещё раз.';
}
