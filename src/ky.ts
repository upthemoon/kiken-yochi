// 朝の危険予知 (TBM-KY) の聞き取りと用紙づくり。
// Claude がベテランの職長のように聞き返し、情報がそろったら write_ky_sheet で用紙を出す。

import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { geocode, siteConditions, type Site } from "./weather.js";
import { findNearMisses } from "./nearMiss.js";

const client = new Anthropic();

export const WORK_TYPES = ["assembly", "dismantling", "foundation", "stringing", "other"] as const;
export type WorkType = (typeof WORK_TYPES)[number];
const WORK_TYPE_JA: Record<WorkType, string> = {
  assembly: "鉄塔の組立",
  dismantling: "鉄塔の解体",
  foundation: "基礎工事",
  stringing: "架線 (張線・延線)",
  other: "その他",
};

const SYSTEM = `あなたは送電線工事を 30 年やってきた職長です。朝礼 (TBM) の前に、今日の現場の責任者と危険予知 (KY) を一緒に作ります。

進め方:
- 責任者が話した作業内容から、危険を見つけるのに足りない情報を自分で見つけて、1 回に 1〜2 個ずつ聞き返す。現場の言葉で短く聞く。
- どの作業でも確かめること: 作業の高さと場所、近くに電気が通ったままの線があるか、人数と経験の浅い人・新しく入った人の配置、作業の時間帯。
- 工種ごとに確かめること:
  - 組立: 吊り上げの機械と一番重い部材、部材の落下、二丁掛けの掛け替え、ボルトの仮締め。
  - 解体: 外す順番と塔の安定、切った部材や線の垂れ下がり、吊り下ろし。
  - 基礎: 掘る深さと土の崩れ、重機と人の距離、深い穴の酸素と湧き水、型枠や鉄筋。
  - 架線: 延線車・ウインチの張力とワイヤーの跳ね、電線に乗る誘導電圧と接地・検電、道路や線路の上を渡す所の防護。
  - その他: 内容を聞いてから上のどれに近いか考える。
- 現場の位置が分かっていれば get_site_conditions で予報と気象庁の注意報・警報を引く。位置がなければ地名を聞いてから引く。中止基準に当たる時間、雷、注意報・警報があれば、用紙を作る前に先に伝える。
- 作業が分かったら find_near_misses で過去のヒヤリハットを引き、似たものがあれば用紙に入れる。
- 情報がそろったら write_ky_sheet で用紙を出す。そろうまでは出さない。
- 用紙は KYT の 4 ラウンドの形にする: どんな危険があるか (1R)、とくに大事な危険 (2R)、どうするか (3R)、私たちはこうする = 全員で指差し唱和する一言 (4R)。
- 朝礼で確かめる項目 (体調、保護具の点検、その日の作業に合わせた項目) も用紙に入れる。
- 中止や続行の最後の判断は責任者が行う。あなたは判断を代わりにしない。
- 返事と用紙は、指定された言語 (ja なら日本語、en なら英語) で書く。英語のときは、北米でいう job briefing / tailboard の言い方に合わせる。
- 作業員の言語が指定されていれば、用紙の crew_versions にその言語ごとの版を入れる。現場の道具や部位の名前は、作業員が日本の現場で聞く日本語の呼び名も括弧で添える (例: 安全帯 / ハーネス)。訳は短く、命令でなく「〜します」の形にする。`;

export const KySheet = z.object({
  work: z.string().describe("今日の作業 (一文)"),
  work_type: z.enum(WORK_TYPES),
  place_and_height: z.string(),
  crew: z.string().describe("人数と配置。経験の浅い人・新しく入った人がいれば書く"),
  weather: z.string().describe("予報の要点、中止基準に当たる時間、注意報・警報"),
  hazards: z
    .array(
      z.object({
        hazard: z.string().describe("どんな危険か (〜して〜になる)"),
        countermeasure: z.string().describe("私たちはこうする"),
        checker: z.string().describe("確認する人 (役割)"),
        key: z.boolean().describe("とくに大事な危険 (2R) なら true。1〜2 個"),
      }),
    )
    .describe("危険・対策・確認する人。3〜6 個"),
  checks: z.array(z.string()).describe("朝礼で確かめる項目。体調・保護具の点検・今日の作業に合わせた項目。4〜8 個"),
  past_near_misses: z.array(z.string()).describe("今日の作業に関係する過去のヒヤリハット (なければ空)"),
  team_motto: z.string().describe("全員で指差し唱和する一言。例: 「二丁掛け、よし!」"),
  plain_reading: z.string().describe("読み上げ用のやさしい版。日本語ならやさしい日本語、英語なら plain English"),
  crew_versions: z
    .array(
      z.object({
        lang: z.string().describe("作業員の言語コード (指定されたもの)"),
        hazards: z.array(z.object({ hazard: z.string(), countermeasure: z.string() })).describe("hazards と同じ順・同じ数を、その言語の短い文で"),
        team_motto: z.string().describe("指差し唱和の一言をその言語で。日本語の唱和も一緒に覚えられるよう、元の日本語を括弧で添える"),
        plain_reading: z.string().describe("読み上げ用のやさしい版をその言語で"),
      }),
    )
    .describe("作業員の言語ごとの版。指定がなければ空"),
});
export type KySheet = z.infer<typeof KySheet>;

export type Context = { site: Site | null; workType: WorkType; lang: "ja" | "en"; crewLangs: string[] };
export type Turn = { reply: string; sheet: KySheet | null };

// 会話はサーバー側で、送ったとおりの形のまま持つ (考えた跡のブロックも含めて追記するだけ)。
export async function runTurn(
  history: Anthropic.Beta.BetaMessageParam[],
  userText: string,
  ctx: Context,
): Promise<{ turn: Turn; history: Anthropic.Beta.BetaMessageParam[] }> {
  let sheet: KySheet | null = null;

  const getSiteConditions = betaZodTool({
    name: "get_site_conditions",
    description:
      "現場の 1 時間ごとの風速・突風・降水確率・雷と、気象庁の注意報・警報 (日本国内のみ) を返す。高所作業の中止基準に当たる時間も返す。現場の位置が分かっていれば place は空でよい。",
    inputSchema: z.object({
      place: z.string().describe("現場の位置が分からないときだけ、近くの市町村名。分かっていれば空文字"),
      date: z.string().describe("作業日 YYYY-MM-DD"),
      start_hour: z.number().int().min(0).max(23),
      end_hour: z.number().int().min(0).max(23),
    }),
    run: async (input) => {
      const site = input.place ? await geocode(input.place) : ctx.site;
      if (!site) return "現場の位置が分かりません。近くの市町村名を責任者に聞いてください。";
      return JSON.stringify(await siteConditions(site, input.date, input.start_hour, input.end_hour));
    },
  });

  const findPastNearMisses = betaZodTool({
    name: "find_near_misses",
    description: "これまでに記録したヒヤリハットから、作業や危険のキーワードに合うものを最大 5 件返す。",
    inputSchema: z.object({
      keywords: z.array(z.string()).describe("例: [\"部材交換\", \"吊り上げ\", \"安全帯\"]"),
    }),
    run: async (input) => JSON.stringify(findNearMisses(input.keywords)),
  });

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
  const where = ctx.site ? `現場の位置 ${ctx.site.lat.toFixed(4)}, ${ctx.site.lon.toFixed(4)} (GPS)` : "現場の位置は未取得";
  const runner = client.beta.messages.toolRunner({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    tools: [getSiteConditions, findPastNearMisses, writeSheet],
    messages: [
      ...history,
      {
        role: "user",
        content: `(今日は ${today}・工種: ${WORK_TYPE_JA[ctx.workType]}・${where}・言語: ${ctx.lang}・作業員の言語: ${ctx.crewLangs.length ? ctx.crewLangs.join(", ") : "なし"})\n${userText}`,
      },
    ],
  });
  const final = await runner.runUntilDone();

  const messages = [...runner.params.messages];
  if (messages.at(-1)?.role !== "assistant") messages.push({ role: "assistant", content: final.content });

  if (final.stop_reason === "refusal") {
    const reply = ctx.lang === "en" ? "I couldn't answer that. Please try saying it another way." : "この内容には答えられませんでした。言い方を変えてもう一度お願いします。";
    return { turn: { reply, sheet: null }, history };
  }
  const reply = final.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  return { turn: { reply, sheet }, history: messages };
}
