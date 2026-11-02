// 現場の天気予報を Open-Meteo から引く (キー不要)。
// 高所作業の中止基準は「10 分間の平均風速 10m/s 以上」。予報の 1 時間値で目安を出す。

const STOP_WIND_MS = 10;
const THUNDER_CODES = new Set([95, 96, 99]);

type Place = { name: string; latitude: number; longitude: number };

async function findPlace(placeName: string): Promise<Place | null> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", placeName);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "ja");
  url.searchParams.set("countryCode", "JP");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`地名の検索に失敗しました (${res.status})`);
  const body = (await res.json()) as { results?: Place[] };
  return body.results?.[0] ?? null;
}

export async function forecastForWork(placeName: string, date: string, startHour: number, endHour: number) {
  const place = await findPlace(placeName);
  if (!place) return { error: `「${placeName}」の場所が見つかりませんでした。市町村名で聞き直してください。` };

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(place.latitude));
  url.searchParams.set("longitude", String(place.longitude));
  url.searchParams.set("hourly", "wind_speed_10m,wind_gusts_10m,precipitation_probability,weather_code");
  url.searchParams.set("wind_speed_unit", "ms");
  url.searchParams.set("timezone", "Asia/Tokyo");
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
  };

  const hours = h.time
    .map((t, i) => ({
      hour: Number(t.slice(11, 13)),
      wind_ms: h.wind_speed_10m[i],
      gust_ms: h.wind_gusts_10m[i],
      rain_percent: h.precipitation_probability[i],
      thunder: THUNDER_CODES.has(h.weather_code[i]),
    }))
    .filter((x) => x.hour >= startHour && x.hour <= endHour);

  return {
    place: place.name,
    date,
    note: "予報の地上 10m・1 時間値。山の上の鉄塔の上部は、これより強いことが多い。",
    stop_rule: `10 分間の平均風速 ${STOP_WIND_MS}m/s 以上で高所作業を中止`,
    hours_over_stop_rule: hours.filter((x) => x.wind_ms >= STOP_WIND_MS).map((x) => x.hour),
    thunder_hours: hours.filter((x) => x.thunder).map((x) => x.hour),
    hours,
  };
}
