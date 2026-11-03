// 画面と API を 1 つのサーバーで出す。手元で動かす前提 (http://localhost:8787)。

import { createServer, type IncomingMessage } from "node:http";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import type Anthropic from "@anthropic-ai/sdk";
import { runTurn, WORK_TYPES, type WorkType } from "./ky.js";
import { geocode, siteConditions } from "./weather.js";
import { addNearMiss } from "./nearMiss.js";

const PORT = 8787;
const PUBLIC = new URL("../public/", import.meta.url);
const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

// 作業員の言語として受け付けるもの (public/app.js の CREW と合わせる)
const CREW_LANGS = ["vi", "id", "fil", "zh", "my", "pt", "ne", "km"];

// 会話はこのサーバーの中だけに持つ。古いものから捨てて、たまり続けないようにする。
const sessions = new Map<string, Anthropic.Beta.BetaMessageParam[]>();
const MAX_SESSIONS = 50;
const MAX_BODY = 64 * 1024;
const MAX_FIELD = 500;

function validSite(v: any) {
  if (v?.lat == null || v?.lon == null || v.lat === "" || v.lon === "") return null;
  const lat = Number(v.lat);
  const lon = Number(v?.lon);
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : null;
}

class BadRequest extends Error {}

// 画面から送る JSON だけを受け付ける。ほかのサイトのページからの送信 (text/plain) は断る。
async function readJson(req: IncomingMessage): Promise<any> {
  if (!req.headers["content-type"]?.startsWith("application/json")) throw new BadRequest("送り方が正しくありません。");
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > MAX_BODY) throw new BadRequest("送る内容が長すぎます。");
  }
  return JSON.parse(body || "{}");
}

createServer(async (req, res) => {
  const send = (status: number, data: unknown) => {
    res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(data));
  };
  try {
    if (req.method === "POST" && req.url === "/api/ky") {
      if (!process.env.ANTHROPIC_API_KEY) return send(503, { error: "ANTHROPIC_API_KEY が設定されていません。.env.example を写して .env を作り、キーを入れてから起動し直してください。" });
      const { sessionId, text, site, workType, lang, crewLangs } = await readJson(req);
      if (typeof text !== "string" || !text.trim()) return send(400, { error: "作業の内容を入れてください。" });
      const id = typeof sessionId === "string" && sessions.has(sessionId) ? sessionId : randomUUID();
      const { turn, history } = await runTurn(sessions.get(id) ?? [], text.trim(), {
        site: validSite(site),
        workType: WORK_TYPES.includes(workType) ? (workType as WorkType) : "other",
        lang: lang === "en" ? "en" : "ja",
        crewLangs: Array.isArray(crewLangs) ? crewLangs.filter((c) => CREW_LANGS.includes(c)).slice(0, 4) : [],
      });
      sessions.delete(id);
      sessions.set(id, history);
      if (sessions.size > MAX_SESSIONS) sessions.delete(sessions.keys().next().value!);
      return send(200, { sessionId: id, ...turn });
    }
    // 画面の黄色い帯に出す、現場の予報と注意報・警報。Claude を使わないので API キーなしでも動く。
    if (req.method === "GET" && req.url?.startsWith("/api/conditions?")) {
      const q = new URL(req.url, "http://x").searchParams;
      const date = q.get("date") ?? "";
      const start = Number(q.get("start") ?? 8);
      const end = Number(q.get("end") ?? 17);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !(start >= 0 && end <= 23 && start <= end)) return send(400, { error: "日付と時間を確かめてください。" });
      const place = q.get("place");
      const site = place ? await geocode(place) : validSite({ lat: q.get("lat"), lon: q.get("lon") });
      if (!site) return send(400, { error: "現場の位置が分かりませんでした。" });
      return send(200, { site, ...(await siteConditions(site, date, start, end)) });
    }
    if (req.method === "POST" && req.url === "/api/near-miss") {
      const b = await readJson(req);
      const fields = ["work", "what_happened", "cause", "countermeasure"] as const;
      if (fields.some((f) => typeof b[f] !== "string" || !b[f].trim())) return send(400, { error: "4 つの欄をすべて書いてください。" });
      if (fields.some((f) => b[f].length > MAX_FIELD)) return send(400, { error: `1 つの欄は ${MAX_FIELD} 字までにしてください。` });
      const date = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
      addNearMiss({ date, work: b.work, what_happened: b.what_happened, cause: b.cause, countermeasure: b.countermeasure });
      return send(200, { ok: true });
    }
    if (req.method === "GET") {
      const pathname = (req.url ?? "").split("?")[0];
      const path = pathname === "/" ? "index.html" : pathname.slice(1);
      const ext = path.slice(path.lastIndexOf("."));
      if (!/^[a-z-]+\.(html|js|css)$/.test(path)) return send(404, { error: "見つかりません" });
      res.writeHead(200, { "content-type": TYPES[ext] });
      return res.end(await readFile(new URL(path, PUBLIC)));
    }
    send(404, { error: "見つかりません" });
  } catch (err) {
    if (err instanceof BadRequest || err instanceof SyntaxError) return send(400, { error: err instanceof BadRequest ? err.message : "送る内容が読めませんでした。" });
    console.error(err);
    send(500, { error: "うまく動きませんでした。少し待ってもう一度お願いします。" });
  }
// 手元の端末からだけ使う。現場の Wi-Fi のほかの端末からは届かない。
}).listen(PORT, "127.0.0.1", () => console.log(`http://localhost:${PORT}`));
