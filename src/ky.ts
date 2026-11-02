// 朝の危険予知 (KY) の聞き取りと用紙づくり。
// Claude がベテランの職長のように聞き返し、情報がそろったら write_ky_sheet で用紙を出す。

import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { forecastForWork } from "./weather.js";
import { findNearMisses } from "./nearMiss.js";

const client = new Anthropic();

const SYSTEM = `あなたは送電線の鉄塔工事を 30 年やってきた職長です。朝礼の前に、今日の現場の責任者と危険予知 (KY) を一緒に作ります。

進め方:
- 責任者が話した作業内容から、危険を見つけるのに足りない情報を自分で見つけて、1 回に 1〜2 個ずつ聞き返す。現場の言葉で短く聞く。
- 特に確かめること: 作業の高さと場所 (塔のどこか)、近くに充電中の線があるか、吊り上げに使う機械と荷の重さ、人数と経験の浅い人の配置、天候、作業の時間帯。
- 場所と日付と時間帯が分かったら get_forecast で天気予報を引く。中止基準に当たる時間や雷があれば、用紙を作る前に先に伝える。
- 作業の種類が分かったら find_near_misses で過去のヒヤリハットを引き、似たものがあれば用紙に入れる。
- 情報がそろったら write_ky_sheet で用紙を出す。そろうまでは出さない。
- 中止や続行の最後の判断は責任者が行う。あなたは判断を代わりにしない。
- 経験の浅い人や日本語に慣れていない人にも伝わるよう、用紙の「やさしい日本語」欄は短い文と簡単な言葉で書く。`;

const getForecast = betaZodTool({
  name: "get_forecast",
  description: "現場の市町村名・日付・作業の時間帯から、1 時間ごとの風速・突風・降水確率・雷を返す。高所作業の中止基準に当たる時間も返す。",
  inputSchema: z.object({
    place: z.string().describe("現場に近い市町村名。例: 飯田市"),
    date: z.string().describe("作業日 YYYY-MM-DD"),
    start_hour: z.number().int().min(0).max(23),
    end_hour: z.number().int().min(0).max(23),
  }),
  run: async (input) =>
    JSON.stringify(await forecastForWork(input.place, input.date, input.start_hour, input.end_hour)),
});

const findPastNearMisses = betaZodTool({
  name: "find_near_misses",
  description: "これまでに記録したヒヤリハットから、作業や危険のキーワードに合うものを最大 5 件返す。",
  inputSchema: z.object({
    keywords: z.array(z.string()).describe("例: [\"部材交換\", \"吊り上げ\", \"安全帯\"]"),
  }),
  run: async (input) => JSON.stringify(findNearMisses(input.keywords)),
});

export const KySheet = z.object({
  work: z.string().describe("今日の作業 (一文)"),
  place_and_height: z.string(),
  crew: z.string().describe("人数と配置。経験の浅い人がいれば書く"),
  weather: z.string().describe("予報の要点と中止基準に当たる時間"),
  hazards: z
    .array(
      z.object({
        hazard: z.string().describe("どんな危険か (〜して〜になる)"),
        countermeasure: z.string(),
        checker: z.string().describe("確認する人 (役割)"),
      }),
    )
    .describe("危険・対策・確認する人。3〜6 個"),
  past_near_misses: z.array(z.string()).describe("今日の作業に関係する過去のヒヤリハット (なければ空)"),
  team_motto: z.string().describe("全員で唱える一言。例: 「二丁掛け、よし!」"),
  easy_japanese: z.string().describe("やさしい日本語の読み上げ版"),
});
export type KySheet = z.infer<typeof KySheet>;

export type Turn = { reply: string; sheet: KySheet | null };

// 会話はサーバー側で、送ったとおりの形のまま持つ (考えた跡のブロックも含めて追記するだけ)。
export async function runTurn(history: Anthropic.Beta.BetaMessageParam[], userText: string): Promise<{ turn: Turn; history: Anthropic.Beta.BetaMessageParam[] }> {
  let sheet: KySheet | null = null;
  const writeSheet = betaZodTool({
    name: "write_ky_sheet",
    description: "聞き取りが終わったら、KY 用紙を作る。情報がそろうまでは呼ばない。",
    inputSchema: KySheet,
    strict: true,
    run: async (input) => {
      sheet = input;
      return "用紙を作りました。責任者に、確認して全員で読み合わせるよう短く伝えてください。";
    },
  });

  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  const runner = client.beta.messages.toolRunner({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    tools: [getForecast, findPastNearMisses, writeSheet],
    messages: [...history, { role: "user", content: `(今日は ${today})\n${userText}` }],
  });
  const final = await runner.runUntilDone();

  const messages = [...runner.params.messages];
  if (messages.at(-1)?.role !== "assistant") messages.push({ role: "assistant", content: final.content });

  if (final.stop_reason === "refusal") {
    return { turn: { reply: "この内容には答えられませんでした。言い方を変えてもう一度お願いします。", sheet: null }, history };
  }
  const reply = final.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  return { turn: { reply, sheet }, history: messages };
}
