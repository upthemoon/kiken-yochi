// 現場の位置 (GPS の緯度・経度) から、天気予報と気象の注意報・警報を引く。
// 予報は Open-Meteo (世界中・キー不要)。注意報・警報は日本国内なら気象庁の公開データ。
// 高所作業の中止基準は「10 分間の平均風速 10m/s 以上」。予報の 1 時間ごとの 10m 風速を目安として比べる (10 分平均そのものではない)。

const STOP_WIND_MS = 10;
const THUNDER_CODES = new Set([95, 96, 99]);

// 気象庁の注意報・警報のコード (2026 年からの新しい体系・データは warning/data/r8/)。
// 名前は気象庁の警報ページの表と同じ。工事に関係あるかどうかはこちらで決めず、発表中のものは全種類返す。
const JMA_WARNINGS: Record<string, { ja: string; en: string }> = {
  "10": { ja: "レベル２大雨注意報", en: "Heavy Rain Advisory (Level 2)" },
  "03": { ja: "レベル３大雨警報", en: "Heavy Rain Warning (Level 3)" },
  "43": { ja: "レベル４大雨危険警報", en: "Heavy Rain Urgent Warning (Level 4)" },
  "33": { ja: "レベル５大雨特別警報", en: "Heavy Rain Emergency Warning (Level 5)" },
  "29": { ja: "レベル２土砂災害注意報", en: "Landslide Advisory (Level 2)" },
  "09": { ja: "レベル３土砂災害警報", en: "Landslide Warning (Level 3)" },
  "49": { ja: "レベル４土砂災害危険警報", en: "Landslide Urgent Warning (Level 4)" },
  "39": { ja: "レベル５土砂災害特別警報", en: "Landslide Emergency Warning (Level 5)" },
  "19": { ja: "レベル２高潮注意報", en: "Storm Surge Advisory (Level 2)" },
  "08": { ja: "レベル３高潮警報", en: "Storm Surge Warning (Level 3)" },
  "48": { ja: "レベル４高潮危険警報", en: "Storm Surge Urgent Warning (Level 4)" },
  "38": { ja: "レベル５高潮特別警報", en: "Storm Surge Emergency Warning (Level 5)" },
  "15": { ja: "強風注意報", en: "Gale Advisory" },
  "05": { ja: "暴風警報", en: "Storm Warning" },
  "35": { ja: "暴風特別警報", en: "Storm Emergency Warning" },
  "13": { ja: "風雪注意報", en: "Gale and Snow Advisory" },
  "02": { ja: "暴風雪警報", en: "Snowstorm Warning" },
  "32": { ja: "暴風雪特別警報", en: "Snowstorm Emergency Warning" },
  "12": { ja: "大雪注意報", en: "Heavy Snow Advisory" },
  "06": { ja: "大雪警報", en: "Heavy Snow Warning" },
  "36": { ja: "大雪特別警報", en: "Heavy Snow Emergency Warning" },
  "16": { ja: "波浪注意報", en: "High Waves Advisory" },
  "07": { ja: "波浪警報", en: "High Waves Warning" },
  "37": { ja: "波浪特別警報", en: "High Waves Emergency Warning" },
  "14": { ja: "雷注意報", en: "Thunderstorm Advisory" },
  "17": { ja: "融雪注意報", en: "Snowmelt Advisory" },
  "20": { ja: "濃霧注意報", en: "Dense Fog Advisory" },
  "21": { ja: "乾燥注意報", en: "Dry Air Advisory" },
  "22": { ja: "なだれ注意報", en: "Avalanche Advisory" },
  "23": { ja: "低温注意報", en: "Low Temperature Advisory" },
  "24": { ja: "霜注意報", en: "Frost Advisory" },
  "25": { ja: "着氷注意報", en: "Ice Accretion Advisory" },
  "26": { ja: "着雪注意報", en: "Snow Accretion Advisory" },
};
// 気象庁の発表の状態。「発表警報・注意報はなし」は code のない行で来る。
const STATUS_NONE = "発表警報・注意報はなし";
const STATUS_CANCELED = "解除";

export type Site = { lat: number; lon: number };

type JmaArea = { parent: string; name: string; enName: string };
let areaTable: { class10s: Record<string, JmaArea>; class15s: Record<string, JmaArea>; class20s: Record<string, JmaArea> } | null = null;
type JmaKind = { code?: string; status: string };
type JmaReport = { reportDatetime: string; warning: { class20Items: { areaCode: string; kinds: JmaKind[] }[] } };

// 国土地理院の逆ジオコーダーで市区町村コードを引き、気象庁の地域コードに直して注意報・警報を読む。
// 日本の外なら null (予報だけで判断する)。日本の中で読めなかったときは unavailable で返し、画面で「確かめられなかった」と出す。
async function jmaWarnings(site: Site) {
  const geo = await fetch(
    `https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=${site.lat}&lon=${site.lon}`,
  ).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  // 国土地理院に届かなかったときは、日本の外と区別できないので「確かめられなかった」にする。
  if (!geo) return { unavailable: true as const };
  const muni: string | undefined = geo.results?.muniCd;
  if (!muni) return null;
  return readJmaWarnings(muni).catch((err) => {
    console.error(err);
    return { unavailable: true as const };
  });
}

async function readJmaWarnings(muni: string) {
  if (!areaTable) {
    const res = await fetch("https://www.jma.go.jp/bosai/common/const/area.json");
    if (!res.ok) throw new Error(`気象庁の地域表を読めません (${res.status})`);
    const table = await res.json();
    if (!isRecord(table?.class10s) || !isRecord(table?.class15s) || !isRecord(table?.class20s)) throw new Error("気象庁の地域表の形が違います");
    areaTable = table;
  }
  // ふつうは市区町村コード + "00"。区域を分けている市町村は同じ頭の地域をまとめて見る。
  // 政令市は区のコード (市のコードのすぐ上・3 桁目が 1) が返るので、10 ずつ下げて市のコードを探す。
  // 例: 大阪市北区 27127 → 27120 → 27110 → 27100 (大阪市)、浜松市天竜区 22140 → 22130 (浜松市)。
  const all = Object.keys(areaTable!.class20s);
  const has = (p: string) => all.some((c) => c.startsWith(p));
  let prefix = muni.padStart(5, "0");
  if (!has(prefix) && prefix[2] === "1") {
    for (let n = Math.floor(Number(prefix.slice(3)) / 10) * 10; n >= 0; n -= 10) {
      const city = prefix.slice(0, 3) + String(n).padStart(2, "0");
      if (has(city)) {
        prefix = city;
        break;
      }
    }
  }
  const codes = all.filter((c) => c.startsWith(prefix));
  if (codes.length === 0) throw new Error(`気象庁の地域コードが見つかりません (${muni})`);
  const city = areaTable!.class20s[codes.includes(prefix + "00") ? prefix + "00" : codes[0]];
  const class15 = areaTable!.class15s[city.parent];
  const class10 = class15 && areaTable!.class10s[class15.parent];
  if (!class10) throw new Error(`気象庁の地域表で上位の区域をたどれません (${muni})`);
  const office = class10.parent;

  // 雨・土砂・風・波などの種類ごとに報が分かれて並んでいる。古い順に重ねて、区域ごと・種類ごとに最後の状態を採る。
  const res = await fetch(`https://www.jma.go.jp/bosai/warning/data/r8/${office}.json`);
  if (!res.ok) throw new Error(`気象庁の警報データを読めません (${res.status})`);
  const reports = parseJmaReports(await res.json(), codes);
  const state = new Map<string, { code: string; area: string }>();
  for (const report of [...reports].sort((a, b) => Date.parse(a.reportDatetime) - Date.parse(b.reportDatetime))) {
    for (const item of report.warning.class20Items) {
      if (!codes.includes(item.areaCode)) continue;
      for (const k of item.kinds) {
        if (!k.code) continue;
        const key = `${item.areaCode}:${k.code}`;
        if (k.status === STATUS_CANCELED) state.delete(key);
        else state.set(key, { code: k.code, area: item.areaCode });
      }
    }
  }
  // 発表中の種類ごとに、出ている区域を持たせる。見ている区域の一部だけなら、名前の後ろに区域を添える。
  const names = (list: string[], lang: "name" | "enName") => list.map((c) => areaTable!.class20s[c][lang]).join("・");
  const byCode = new Map<string, string[]>();
  for (const { code, area } of state.values()) byCode.set(code, [...(byCode.get(code) ?? []), area]);
  const active = [...byCode].map(([code, areas]) => {
    const base = JMA_WARNINGS[code] ?? { ja: `不明な注意報・警報が発表中 (コード ${code})`, en: `Unrecognized warning or advisory in effect (code ${code})` };
    const partial = areas.length < codes.length;
    return {
      code,
      ja: partial ? `${base.ja} (${names(areas, "name")})` : base.ja,
      en: partial ? `${base.en} (${names(areas, "enName")})` : base.en,
    };
  });
  const issued_at = reports.map((r) => r.reportDatetime).sort((a, b) => Date.parse(a) - Date.parse(b)).at(-1)!;
  return { unavailable: false as const, area: names(codes, "name"), area_en: names(codes, "enName"), issued_at, active };
}

function isRecord(v: unknown): v is Record<string, any> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// 気象庁の警報データの形を確かめる。欠けていたり形が違ったりしたら例外にして、呼び出し側で「確かめられなかった」にする。
// 正当な「発表なし」(code のない行) と、データが欠けているのとは区別する。
function parseJmaReports(raw: unknown, codes: string[]): JmaReport[] {
  if (!Array.isArray(raw) || raw.length === 0) throw new Error("気象庁の警報データが空か、形が違います");
  for (const report of raw) {
    if (!isRecord(report) || typeof report.reportDatetime !== "string" || Number.isNaN(Date.parse(report.reportDatetime))) throw new Error("気象庁の警報データに報の日時がありません");
    const items = report.warning?.class20Items;
    if (!Array.isArray(items)) throw new Error("気象庁の警報データに市町村の区域がありません");
    for (const item of items) {
      if (!isRecord(item) || typeof item.areaCode !== "string" || !Array.isArray(item.kinds)) throw new Error("気象庁の警報データの区域の形が違います");
      // 空の kinds は「発表なし」ではなく、読めなかったものとして扱う。発表なしは STATUS_NONE の 1 行だけ。
      if (item.kinds.length === 0) throw new Error("気象庁の警報データの区域に種類がありません");
      const none = item.kinds.filter((k: any) => isRecord(k) && k.code === undefined);
      if (none.length > 0 && item.kinds.length !== 1) throw new Error("気象庁の警報データで「発表なし」と種類が混ざっています");
      const seen = new Set<string>();
      for (const k of item.kinds) {
        if (!isRecord(k) || typeof k.status !== "string" || k.status === "") throw new Error("気象庁の警報データの状態がありません");
        if (k.code === undefined) {
          if (k.status !== STATUS_NONE) throw new Error("気象庁の警報データの種類の形が違います");
        } else if (typeof k.code !== "string" || !/^\d{2}$/.test(k.code) || k.status === STATUS_NONE || seen.has(k.code)) {
          throw new Error("気象庁の警報データの種類の形が違います");
        } else seen.add(k.code);
      }
    }
    const areaCodes = items.map((i: any) => i.areaCode);
    if (new Set(areaCodes).size !== areaCodes.length) throw new Error("気象庁の警報データで区域が重複しています");
    // 見ている区域がどれか欠けていれば、その報では「ない」のか分からない。
    for (const c of codes) if (!items.some((i: any) => i.areaCode === c)) throw new Error(`気象庁の警報データに見ている区域がありません (${c})`);
  }
  return raw as JmaReport[];
}

export async function siteConditions(site: Site, date: string, startHour: number, endHour: number) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(site.lat));
  url.searchParams.set("longitude", String(site.lon));
  url.searchParams.set("hourly", "wind_speed_10m,wind_gusts_10m,precipitation_probability,weather_code,temperature_2m");
  url.searchParams.set("wind_speed_unit", "ms");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("start_date", date);
  url.searchParams.set("end_date", date);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`天気予報の取得に失敗しました (${res.status})`);
  const h = (await res.json())?.hourly;
  // 配列の長さがそろっているか、対象の時間の値が数として入っているかを確かめる。欠けた予報を「安全」と見せない。
  const series = ["wind_speed_10m", "wind_gusts_10m", "precipitation_probability", "weather_code", "temperature_2m"] as const;
  if (!Array.isArray(h?.time) || series.some((k) => !Array.isArray(h[k]) || h[k].length !== h.time.length)) throw new Error("天気予報の形が違います");

  const rows = (h.time as unknown[]).map((t, i) => {
    if (typeof t !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(t)) throw new Error("天気予報の時刻の形が違います");
    return { date: t.slice(0, 10), hour: Number(t.slice(11, 13)), i };
  });
  // 指定した時間のそれぞれに、その日の時刻がちょうど 1 件あり、値がすべて数であること。欠けた時間や重複は予報として使わない。
  const hours = [];
  for (let hour = startHour; hour <= endHour; hour++) {
    const hit = rows.filter((r) => r.date === date && r.hour === hour);
    if (hit.length !== 1) throw new Error(`天気予報の ${hour} 時の値が ${hit.length === 0 ? "ありません" : "重複しています"}`);
    const i = hit[0].i;
    const v = [h.wind_speed_10m[i], h.wind_gusts_10m[i], h.precipitation_probability[i], h.temperature_2m[i], h.weather_code[i]] as unknown[];
    if (!v.every((n) => typeof n === "number" && Number.isFinite(n))) throw new Error(`天気予報の ${hour} 時に欠けた値があります`);
    hours.push({ hour, wind_ms: v[0] as number, gust_ms: v[1] as number, rain_percent: v[2] as number, temp_c: v[3] as number, thunder: THUNDER_CODES.has(v[4] as number) });
  }

  return {
    date,
    note: "予報は地上 10m の 1 時間値。鉄塔の上部や山の尾根は、これより強いことが多い。",
    stop_rule: `10 分間の平均風速 ${STOP_WIND_MS}m/s 以上で高所作業を中止`,
    hours_over_stop_rule: hours.filter((x) => x.wind_ms >= STOP_WIND_MS).map((x) => x.hour),
    thunder_hours: hours.filter((x) => x.thunder).map((x) => x.hour),
    max_gust_ms: Math.max(...hours.map((x) => x.gust_ms)),
    max_temp_c: Math.max(...hours.map((x) => x.temp_c)),
    official_warnings: await jmaWarnings(site),
    hours,
  };
}

export type SiteConditions = Awaited<ReturnType<typeof siteConditions>>;

// GPS が使えないときのために、地名から緯度・経度を引く。
export async function geocode(place: string): Promise<(Site & { name: string }) | null> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", place);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "ja");
  const hit = (await fetch(url).then((r) => r.json())).results?.[0];
  return hit ? { lat: hit.latitude, lon: hit.longitude, name: hit.name } : null;
}
