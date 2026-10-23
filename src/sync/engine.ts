// Движок синхронизации: отправка очереди (outbox) и чтение изменений из репо.
// Все операции идут строго по одной: параллельные коммиты в одну ветку сами рождают конфликты.
import { db, kvGet, kvSet, type DocRow } from './db';
import { GitHubError, errorMessage, type GitHubClient } from './github';
import { mergeDocs, parsePath, validateDoc } from './paths';

export const MAX_CONFLICT_RETRIES = 3;
export const DEBOUNCE_MS = 2000;

export type EngineStatus = { state: 'saved' | 'saving' | 'offline' | 'error'; error: string | null };

export type EngineDeps = {
  client: GitHubClient;
  branch: string;
  /** Имя профиля для сообщения коммита: "{имя}: {действие} {путь}" */
  authorName: () => Promise<string>;
  /** Какие недели читать сразу. Остальные подтягиваются, когда их открывают. */
  hotWeeks: () => string[];
  onStatus: (s: EngineStatus) => void;
  onSynced?: () => void;
};

const TREE_ETAG = 'treeEtag';

export class SyncEngine {
  private chain: Promise<unknown> = Promise.resolve();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private stopped = false;
  private readonly missing = new Set<string>();

  constructor(private readonly deps: EngineDeps) {}

  stop(): void {
    this.stopped = true;
    clearTimeout(this.timer);
  }

  /** Отправить очередь через 2 с после последней правки. */
  schedule(delay = DEBOUNCE_MS): void {
    if (this.stopped) return;
    this.deps.onStatus({ state: 'saving', error: null });
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.run(() => this.flush()), delay);
  }

  /** Отправить очередь и прочитать изменения. Ошибки уходят в статус, наружу не летят. */
  syncNow(): Promise<void> {
    clearTimeout(this.timer);
    return this.run(async () => {
      await this.flush();
      await this.pull();
    });
  }

  /** Подтянуть файл, которого нет локально (например, старая неделя). */
  fetchOne(path: string): Promise<void> {
    return this.run(async () => {
      const local = await db.docs.get(path);
      if (local) return;
      const remote = await this.deps.client.getFile(path, this.deps.branch);
      if (!remote) return;
      await db.docs.put({ path, data: validateDoc(path, remote.data), sha: remote.sha, rev: 0, dirty: false, deleted: false });
    });
  }

  private run(task: () => Promise<void>): Promise<void> {
    const next = this.chain.then(async () => {
      if (this.stopped) return;
      try {
        await task();
        const pending = await db.outbox.count();
        this.deps.onStatus({ state: pending > 0 ? 'saving' : 'saved', error: null });
        this.deps.onSynced?.();
      } catch (e) {
        if (e instanceof GitHubError && e.kind === 'network') this.deps.onStatus({ state: 'offline', error: null });
        else this.deps.onStatus({ state: 'error', error: errorMessage(e) });
      }
    });
    this.chain = next;
    return next;
  }

  async flush(): Promise<void> {
    const rows = await db.outbox.orderBy('queuedAt').toArray();
    for (const row of rows) await this.sendOne(row.path);
  }

  private async sendOne(path: string): Promise<void> {
    const { client, branch } = this.deps;
    for (let attempt = 1; ; attempt++) {
      const doc = await db.docs.get(path);
      if (!doc) {
        await db.outbox.delete(path);
        return;
      }
      const name = await this.deps.authorName();
      try {
        if (doc.deleted) {
          if (doc.sha) await client.deleteFile(path, { sha: doc.sha, message: `${name}: удалить ${path}`, branch });
          await this.settle(path, doc.rev, null, true);
        } else {
          const action = doc.sha ? 'обновить' : 'создать';
          const { sha } = await client.putFile(path, doc.data, { sha: doc.sha, message: `${name}: ${action} ${path}`, branch });
          await this.settle(path, doc.rev, sha, false);
        }
        return;
      } catch (e) {
        if (!(e instanceof GitHubError) || e.kind !== 'conflict') throw e;
        await db.outbox.update(path, { attempts: attempt });
        if (attempt >= MAX_CONFLICT_RETRIES) {
          throw new GitHubError('conflict', e.status, `Не смог сохранить ${path}: файл ${MAX_CONFLICT_RETRIES} раза подряд менялся на другом устройстве. Нажми "Повторить".`);
        }
        await this.rebase(doc);
      }
    }
  }

  /** После 409: перечитать файл из репо и смёрджить с локальной версией. */
  private async rebase(doc: DocRow): Promise<void> {
    const remote = await this.deps.client.getFile(doc.path, this.deps.branch);
    if (!remote) {
      await db.docs.update(doc.path, { sha: null });
      return;
    }
    const remoteData = validateDoc(doc.path, remote.data);
    const merged = doc.deleted ? doc.data : mergeDocs(doc.path, doc.data, remoteData);
    await db.docs.update(doc.path, { data: merged, sha: remote.sha });
  }

  /** Отметить отправку. Если за время запроса файл снова правили, он остаётся в очереди. */
  private async settle(path: string, sentRev: number, sha: string | null, deleted: boolean): Promise<void> {
    await db.transaction('rw', db.docs, db.outbox, async () => {
      const cur = await db.docs.get(path);
      if (!cur) return;
      if (cur.rev !== sentRev) {
        await db.docs.update(path, { sha });
        return;
      }
      if (deleted) await db.docs.delete(path);
      else await db.docs.update(path, { sha, dirty: false });
      await db.outbox.delete(path);
    });
  }

  /** Одно чтение дерева ветки, дальше скачиваем только изменившиеся файлы. */
  async pull(): Promise<void> {
    const { client, branch } = this.deps;
    const etag = (await kvGet<string>(TREE_ETAG)) ?? null;
    const tree = await client.getTree(branch, etag);
    if (tree.notModified) return;

    const hot = new Set(this.deps.hotWeeks());
    const locals = new Map((await db.docs.toArray()).map((d) => [d.path, d]));
    const errors: string[] = [];

    for (const [path, sha] of tree.files) {
      const parsed = parsePath(path);
      if (!parsed) continue;
      const local = locals.get(path);
      if (local?.sha === sha) continue;
      if (!local && parsed.week && !hot.has(parsed.week)) continue;

      const remote = await client.getFile(path, branch);
      if (!remote) continue;
      let data: unknown;
      try {
        data = validateDoc(path, remote.data);
      } catch (e) {
        errors.push(errorMessage(e));
        continue;
      }
      await db.transaction('rw', db.docs, async () => {
        const cur = await db.docs.get(path);
        if (cur?.deleted) return;
        // Мёрдж даже для чистой копии: если GitHub отдал чуть устаревшую версию сразу после нашей записи,
        // более свежие слоты и позиции по updatedAt не откатятся.
        const next = cur ? mergeDocs(path, cur.data, data) : data;
        await db.docs.put({ path, data: next, sha: remote.sha, rev: cur?.rev ?? 0, dirty: cur?.dirty ?? false, deleted: false });
      });
    }

    // Свой рецепт или ингредиент удалили на другом устройстве. Удаляем локально, только если файла
    // нет в двух деревьях подряд: сразу после записи GitHub иногда отдаёт дерево без свежего коммита.
    for (const [path, local] of locals) {
      const kind = parsePath(path)?.kind;
      if (kind !== 'customRecipe' && kind !== 'customIngredient') continue;
      if (!local.sha || local.dirty || tree.files.has(path)) {
        this.missing.delete(path);
      } else if (this.missing.has(path)) {
        this.missing.delete(path);
        await db.docs.delete(path);
      } else {
        this.missing.add(path);
      }
    }

    if (errors.length) throw new Error(errors[0]);
    await kvSet(TREE_ETAG, tree.etag);
  }
}
