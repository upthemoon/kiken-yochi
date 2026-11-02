// ヒヤリハットの記録。手元の JSON ファイルに足していくだけ。
// 初回は data/near_misses.sample.json (架空の例) から始める。

import { existsSync, readFileSync, writeFileSync } from "node:fs";

const FILE = new URL("../data/near_misses.json", import.meta.url);
const SAMPLE = new URL("../data/near_misses.sample.json", import.meta.url);

export type NearMiss = {
  date: string;
  work: string;
  what_happened: string;
  cause: string;
  countermeasure: string;
};

function load(): NearMiss[] {
  const file = existsSync(FILE) ? FILE : SAMPLE;
  return JSON.parse(readFileSync(file, "utf8")) as NearMiss[];
}

export function findNearMisses(keywords: string[]): NearMiss[] {
  return load()
    .filter((n) => keywords.some((k) => `${n.work} ${n.what_happened} ${n.cause}`.includes(k)))
    .slice(0, 5);
}

export function addNearMiss(entry: NearMiss): void {
  writeFileSync(FILE, JSON.stringify([...load(), entry], null, 2) + "\n");
}
