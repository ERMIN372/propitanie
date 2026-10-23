// Подключение устройства к propitanie_bd и создание профиля.
import { nanoid } from 'nanoid';
import { nowIso, type ColorKey } from '../../schemas/common';
import type { ProfileDoc, ProfilesDoc } from '../../schemas/docs';
import { useSession } from '../../stores/session';
import { clearLocalData, db } from '../../sync/db';
import { writeDoc } from '../../sync/docs';
import { GitHubClient, GitHubError } from '../../sync/github';
import { defaultDoc, paths, validateDoc } from '../../sync/paths';
import { getEngine, stopSync } from '../../sync/runtime';

/** Проверить токен, подготовить репо и вернуть ветку. Данные кладутся в локальный кэш. */
export async function connect(token: string, fetchImpl?: typeof fetch): Promise<{ branch: string }> {
  const client = new GitHubClient(token.trim(), fetchImpl);
  const repo = await client.getRepo();
  if (repo.canPush === false) throw new GitHubError('forbidden', 403);
  const branch = repo.defaultBranch;
  // в пустом репо дерево отвечает 409, это ловится как emptyRepo
  await client.getTree(branch, null);
  await ensureRemote(client, branch, paths.meta);
  await ensureRemote(client, branch, paths.profiles);
  return { branch };
}

async function ensureRemote(client: GitHubClient, branch: string, path: string): Promise<void> {
  const remote = await client.getFile(path, branch);
  if (remote) {
    await db.docs.put({ path, data: validateDoc(path, remote.data), sha: remote.sha, rev: 0, dirty: false, deleted: false });
    return;
  }
  const data = defaultDoc(path);
  const { sha } = await client.putFile(path, data, { sha: null, message: `Пропитание: создать ${path}`, branch });
  await db.docs.put({ path, data, sha, rev: 0, dirty: false, deleted: false });
}

export const PROFILE_COLORS: ColorKey[] = ['tomato', 'cobalt', 'pea', 'mustard'];

export async function createProfile(name: string, colorKey: ColorKey): Promise<string> {
  const id = nanoid(10);
  useSession.getState().setProfile(id);
  await writeDoc<ProfilesDoc>(paths.profiles, (cur) => ({
    ...cur,
    profiles: [...cur.profiles, { id, name: name.trim(), colorKey, createdAt: nowIso() }],
  }));
  await writeDoc<ProfileDoc>(paths.profile(id), (cur) => cur);
  // новый профиль сразу отправляем, чтобы его увидели на другом устройстве
  getEngine()?.schedule(0);
  return id;
}

/** "Выйти на этом устройстве": стираем токен, профиль и весь локальный кэш. */
export async function logout(): Promise<void> {
  stopSync();
  await clearLocalData();
  useSession.getState().reset();
}

/** Экспорт всех своих данных одним JSON. */
export async function exportMyData(me: string): Promise<Blob> {
  const rows = await db.docs.toArray();
  const mine = rows.filter((r) => {
    if (r.deleted) return false;
    if (r.path.startsWith(`users/${me}/`)) return true;
    const createdBy = (r.data as { createdBy?: string } | null)?.createdBy;
    return createdBy === me;
  });
  const files = Object.fromEntries(mine.map((r) => [r.path, r.data]));
  return new Blob([JSON.stringify({ exportedAt: nowIso(), profileId: me, files }, null, 2)], { type: 'application/json' });
}
