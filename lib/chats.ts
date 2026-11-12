"use client";
import { useSyncExternalStore } from "react";

export type Thread = { id: string; kind: "home"; title: string; last: string; t: number; msgs: unknown[] };

const KEY = (user: string) => `snaplead-chats-${user}`;
const listeners = new Set<() => void>();
const cache = new Map<string, Thread[]>();
const EMPTY: Thread[] = [];

function read(user: string): Thread[] {
  const hit = cache.get(user); if (hit) return hit;
  let list: Thread[] = [];
  try { list = JSON.parse(localStorage.getItem(KEY(user)) ?? "[]"); } catch { /* storage blocked or corrupt */ }
  cache.set(user, list); return list;
}

export function saveThread(user: string, th: Thread) {
  const list = [th, ...read(user).filter((x) => x.id !== th.id)].slice(0, 30);
  cache.set(user, list);
  try { localStorage.setItem(KEY(user), JSON.stringify(list)); } catch { /* quota: keep in memory only */ }
  listeners.forEach((l) => l());
}

export const getThread = (user: string, id: string) => read(user).find((x) => x.id === id);

const sub = (cb: () => void) => { listeners.add(cb); return () => listeners.delete(cb); };
export function useThreads(user: string | undefined) {
  return useSyncExternalStore(sub, () => (user ? read(user) : EMPTY), () => EMPTY);
}
