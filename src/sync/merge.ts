// Мёрдж при конфликте (409): локальная версия против свежей из репо.
// При равном updatedAt побеждает удалённая, чтобы устройства сходились к одному результату.
import type { PlanDoc, PrepDoc, ProfilesDoc, ShoppingDoc } from '../schemas/docs';

type Stamped = { updatedAt: string };

const fresher = <T extends Stamped>(local: T, remote: T): T => (local.updatedAt > remote.updatedAt ? local : remote);
const maxTime = (a: string, b: string) => (a > b ? a : b);

function mergeRecords<V extends Stamped>(local: Record<string, V>, remote: Record<string, V>): Record<string, V> {
  const out: Record<string, V> = { ...remote };
  for (const [k, v] of Object.entries(local)) {
    const r = out[k];
    out[k] = r ? fresher(v, r) : v;
  }
  return out;
}

/** Профиль, meta, свои рецепты и ингредиенты: файл целиком, побеждает более свежий. */
export function mergeWhole<T extends Stamped>(local: T, remote: T): T {
  return fresher(local, remote);
}

export function mergeProfiles(local: ProfilesDoc, remote: ProfilesDoc): ProfilesDoc {
  const preferLocal = local.updatedAt > remote.updatedAt;
  const byId = new Map(remote.profiles.map((p) => [p.id, p]));
  for (const p of local.profiles) {
    if (!byId.has(p.id) || preferLocal) byId.set(p.id, p);
  }
  const profiles = [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return { ...fresher(local, remote), profiles, updatedAt: maxTime(local.updatedAt, remote.updatedAt) };
}

export function mergePlan(local: PlanDoc, remote: PlanDoc): PlanDoc {
  return {
    ...fresher(local, remote),
    slots: mergeRecords(local.slots, remote.slots),
    updatedAt: maxTime(local.updatedAt, remote.updatedAt),
  };
}

export function mergeShopping(local: ShoppingDoc, remote: ShoppingDoc): ShoppingDoc {
  return {
    ...fresher(local, remote),
    items: mergeRecords(local.items, remote.items),
    updatedAt: maxTime(local.updatedAt, remote.updatedAt),
  };
}

export function mergePrep(local: PrepDoc, remote: PrepDoc): PrepDoc {
  const doneSteps = { ...remote.doneSteps };
  for (const [k, t] of Object.entries(local.doneSteps)) {
    const r = doneSteps[k];
    doneSteps[k] = r && r < t ? r : t;
  }
  return { ...fresher(local, remote), doneSteps, updatedAt: maxTime(local.updatedAt, remote.updatedAt) };
}
