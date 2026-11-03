// 現場の位置 (GPS の緯度・経度) から、天気予報と気象の注意報・警報を引く。
// 予報は Open-Meteo (世界中・キー不要)。注意報・警報は日本国内なら気象庁の公開データ。
// 高所作業の中止基準は「10 分間の平均風速 10m/s 以上」。予報の 1 時間値で目安を出す。

const STOP_WIND_MS = 10;
const THUNDER_CODES = new Set([95, 96, 99]);

// 気象庁の注意報・警報のコード (2026 年からの新しい体系・データは warning/data/r8/)。
// 屋外の工事に関係するものだけ。名前は気象庁の警報ページの表と同じ。
const JMA_WARNINGS: Record<string, { ja: string; en: string }> = {
  "10": { ja: "レベル２大雨注意報", en: "Heavy Rain Advisory (Level 2)" },
  "03": { ja: "レベル３大雨警報", en: "Heavy Rain Warning (Level 3)" },
  "43": { ja: "レベル４大雨危険警報", en: "Heavy Rain Urgent Warning (Level 4)" },
  "33": { ja: "レベル５大雨特別警報", en: "Heavy Rain Emergency Warning (Level 5)" },
  "29": { ja: "レベル２土砂災害注意報", en: "Landslide Advisory (Level 2)" },
  "09": { ja: "レベル３土砂災害警報", en: "Landslide Warning (Level 3)" },
  "49": { ja: "レベル４土砂災害危険警報", en: "Landslide Urgent Warning (Level 4)" },
  "39": { ja: "レベル５土砂災害特別警報", en: "Landslide Emergency Warning (Level 5)" },
  "15": { ja: "強風注意報", en: "Gale Advisory" },
  "05": { ja: "暴風警報", en: "Storm Warning" },
  "35": { ja: "暴風特別警報", en: "Storm Emergency Warning" },
  "13": { ja: "風雪注意報", en: "Gale and Snow Advisory" },
  "02": { ja: "暴風雪警報", en: "Snowstorm Warning" },
  "32": { ja: "暴風雪特別警報", en: "Snowstorm Emergency Warning" },
  "12": { ja: "大雪注意報", en: "Heavy Snow Advisory" },
  "06": { ja: "大雪警報", en: "Heavy Snow Warning" },
  "36": { ja: "大雪特別警報", en: "Heavy Snow Emergency Warning" },
  "14": { ja: "雷注意報", en: "Thunderstorm Advisory" },
  "20": { ja: "濃霧注意報", en: "Dense Fog Advisory" },
  "22": { ja: "なだれ注意報", en: "Avalanche Advisory" },
  "25": { ja: "着氷注意報", en: "Ice Accretion Advisory" },
  "26": { ja: "着雪注意報", en: "Snow Accretion Advisory" },
};

export type Site = { lat: number; lon: number };

type JmaArea = { parent: string; name: string; enName: string };
let areaTable: { class10s: Record<string, JmaArea>; class15s: Record<string, JmaArea>; class20s: Record<string, JmaArea> } | null = null;
type JmaReport = {
  reportDatetime: string;
  warning?: { class20Items?: { areaCode: string; kinds: { code?: string; status: string }[] }[] };
};

// 国土地理院の逆ジオコーダーで市区町村コードを引き、気象庁の地域コードに直して注意報・警報を読む。
// 日本の外、または読めなかったときは null (予報だけで判断する)。
async function jmaWarnings(site: Site) {
  const geo = await fetch(
    `https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=${site.lat}&lon=${site.lon}`,
  ).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const muni: string | undefined = geo?.results?.muniCd;
  if (!muni) return null;

  areaTable ??= await fetch("https://www.jma.go.jp/bosai/common/const/area.json").then((r) => r.json());
  // ふつうは市区町村コード + "00"。区域を分けている市町村は同じ頭の地域をまとめて見る。
  // 政令市は区のコードが返るので、見つからなければ市のコード (末尾 0) で探す。
  const all = Object.keys(areaTable!.class20s);
  let prefix = muni.padStart(5, "0");
  if (!all.some((c) => c.startsWith(prefix))) prefix = prefix.slice(0, 4) + "0";
  const codes = all.filter((c) => c.startsWith(prefix));
  if (codes.length === 0) return null;
  const city = areaTable!.class20s[codes.includes(prefix + "00") ? prefix + "00" : codes[0]];
  const office = areaTable!.class10s[areaTable!.class15s[city.parent].parent].parent;

  // 雨・土砂・風・波などの種類ごとに報が分かれて並んでいるので、全部から拾う。
  const reports: JmaReport[] = await fetch(`https://www.jma.go.jp/bosai/warning/data/r8/${office}.json`).then((r) => r.json());
  const active = new Map<string, { ja: string; en: string }>();
  for (const report of reports) {
    for (const item of report.warning?.class20Items ?? []) {
      if (!codes.includes(item.areaCode)) continue;
      for (const k of item.kinds) {
        if (k.code && k.status !== "解除" && JMA_WARNINGS[k.code]) active.set(k.code, JMA_WARNINGS[k.code]);
      }
    }
  }
  const issued_at = reports.map((r) => r.reportDatetime).sort().at(-1) ?? "";
  return { area: city.name, area_en: city.enName, issued_at, active: [...active.values()] };
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
  const h = (await res.json()).hourly as {
    time: string[];
    wind_speed_10m: number[];
    wind_gusts_10m: number[];
    precipitation_probability: number[];
    weather_code: number[];
    temperature_2m: number[];
  };

  const hours = h.time
    .map((t, i) => ({
      hour: Number(t.slice(11, 13)),
      wind_ms: h.wind_speed_10m[i],
      gust_ms: h.wind_gusts_10m[i],
      rain_percent: h.precipitation_probability[i],
      temp_c: h.temperature_2m[i],
      thunder: THUNDER_CODES.has(h.weather_code[i]),
    }))
    .filter((x) => x.hour >= startHour && x.hour <= endHour);

  return {
    date,
    note: "予報は地上 10m の 1 時間値。鉄塔の上部や山の尾根は、これより強いことが多い。",
    stop_rule: `10 分間の平均風速 ${STOP_WIND_MS}m/s 以上で高所作業を中止`,
    hours_over_stop_rule: hours.filter((x) => x.wind_ms >= STOP_WIND_MS).map((x) => x.hour),
    thunder_hours: hours.filter((x) => x.thunder).map((x) => x.hour),
    max_gust_ms: Math.max(...hours.map((x) => x.gust_ms)),
    max_temp_c: Math.max(...hours.map((x) => x.temp_c)),
    official_warnings: await jmaWarnings(site).catch(() => null),
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
