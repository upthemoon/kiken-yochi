// 画面の動き。言葉は日本語を基本に、英語にも切り替えられる。

const TEXT = {
  ja: {
    appName: "朝の KY", reset: "最初からやり直す", progress: "進み具合",
    stepTalk: "聞き取り", stepSheet: "用紙", stepEvening: "夕方の記録",
    workType: "今日の工種", site: "現場の位置", useGps: "今いる場所を使う", placeLabel: "地名で探す",
    placePh: "または地名 (例: 飯田市)", search: "探す", date: "作業日", hours: "時間",
    answer: "職長に答える", composerPh: "今日の作業を話すか、打ってください", speak: "声で話す", send: "送る",
    types: { assembly: "組立", dismantling: "解体", foundation: "基礎", stringing: "架線 (張線)", other: "その他" },
    locating: "位置を調べています…", gpsFail: "位置が取れませんでした。地名で探してください。",
    loadingWx: "現場の天気と注意報・警報を調べています…",
    stopFrom: (h, w) => `${h}時から風速 ${w}m/s の予報`,
    thunderAt: (h) => `${h}時ごろ雷の予報`,
    warnHead: "注意報・警報が出ています",
    calm: "中止基準に当たる予報はありません",
    stopLine: (hs) => `高所作業の中止基準 (10 分間の平均風速 10m/s) に当たる時間: ${hs}`,
    thunderLine: (hs) => `雷の予報: ${hs}`,
    gustLine: (g) => `一番強い突風 ${g}m/s`,
    upperNote: "鉄塔の上や尾根は、予報 (地上 10m) より強いことが多い。",
    decide: "中止・続行の判断は現場の責任者が行います。",
    source: (area, at) => `予報: Open-Meteo${area ? ` / 注意報・警報: 気象庁 ${area} (${at} 発表)` : " / 気象庁の注意報・警報は日本国内のみ"}`,
    hourUnit: (h) => `${h}時`,
    thinking: "職長が考えています… (天気と過去のヒヤリハットも調べます)",
    sendFail: "送れませんでした。",
    badge: "職",
    sheetTitle: "今日の危険予知", key: "とくに大事", checker: "確認",
    checksTitle: "朝礼で確かめる", pastTitle: "過去のヒヤリハット", plainTitle: "やさしい日本語",
    readAloud: "読み上げる", print: "A4 で印刷", toEvening: "夕方の記録へ",
    printTitle: "危険予知 (KY) 活動表", signLabel: "作業者の確認 (読み合わせのあとに名前を書く)",
    eveningTitle: "おつかれさまでした。今日、ヒヤッとしたことは？",
    eveningLead: "小さなことでも残すと、次に同じ作業をする朝の用紙に入ります。",
    nWork: "作業", nWhat: "何があったか", nCause: "なぜ起きたか", nNext: "次はこうする", nSave: "この内容で記録する",
    nSaved: "記録しました。次に同じ作業をする朝の用紙に入ります。",
    dateFmt: (d) => d.toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" }) + " 朝礼前",
    speech: "ja-JP",
  },
  en: {
    appName: "Morning KY", reset: "Start over", progress: "Progress",
    stepTalk: "Briefing", stepSheet: "Sheet", stepEvening: "End of day",
    workType: "Today's work", site: "Job site", useGps: "Use my location", placeLabel: "Search by place",
    placePh: "or a place name", search: "Search", date: "Date", hours: "Hours",
    answer: "Reply to the foreman", composerPh: "Describe today's work", speak: "Speak", send: "Send",
    types: { assembly: "Tower erection", dismantling: "Dismantling", foundation: "Foundation", stringing: "Stringing", other: "Other" },
    locating: "Finding your location…", gpsFail: "Couldn't get your location. Search by place name instead.",
    loadingWx: "Checking site weather and official warnings…",
    stopFrom: (h, w) => `Wind ${w} m/s forecast from ${h}:00`,
    thunderAt: (h) => `Thunder forecast around ${h}:00`,
    warnHead: "Weather warnings are in effect",
    calm: "No forecast hits the stop-work criteria",
    stopLine: (hs) => `Hours at stop-work wind (10-min mean 10 m/s, JP rule): ${hs}`,
    thunderLine: (hs) => `Thunder: ${hs}`,
    gustLine: (g) => `Strongest gust ${g} m/s`,
    upperNote: "Tower tops and ridges usually see stronger wind than the 10 m forecast.",
    decide: "The person in charge makes the final stop / go call.",
    source: (area, at) => `Forecast: Open-Meteo${area ? ` / Warnings: JMA ${area} (issued ${at})` : " / JMA warnings cover Japan only"}`,
    hourUnit: (h) => `${h}:00`,
    thinking: "The foreman is thinking… (checking weather and past near misses)",
    sendFail: "Couldn't send.",
    badge: "F",
    sheetTitle: "Today's job briefing", key: "Key hazard", checker: "Checked by",
    checksTitle: "Check at the tailboard", pastTitle: "Past near misses", plainTitle: "Plain-language version",
    readAloud: "Read aloud", print: "Print A4", toEvening: "End-of-day log",
    printTitle: "Job Briefing / Hazard Recognition (KY)", signLabel: "Crew sign-off (after reading together)",
    eveningTitle: "Good work today. Any close calls?",
    eveningLead: "Even small ones help. They show up on the next morning sheet for the same work.",
    nWork: "Work", nWhat: "What happened", nCause: "Why it happened", nNext: "Next time we will", nSave: "Save this record",
    nSaved: "Saved. It will appear on the next morning sheet for the same work.",
    dateFmt: (d) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) + " · before the tailboard",
    speech: "en-US",
  },
};

const $ = (id) => document.getElementById(id);
const state = {
  lang: readLang(),
  workType: "assembly",
  site: null,
  conditions: null,
  sessionId: null,
  sheet: null,
  step: "talk",
};

function readLang() {
  try { return localStorage.getItem("ky-lang") === "en" ? "en" : "ja"; } catch { return "ja"; }
}
const t = () => TEXT[state.lang];

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

function applyLang() {
  const T = t();
  document.documentElement.lang = state.lang;
  document.title = T.appName;
  $("lang").textContent = state.lang === "ja" ? "EN" : "日本語";
  document.querySelectorAll("[data-t]").forEach((el) => { el.textContent = T[el.dataset.t]; });
  document.querySelectorAll("[data-t-ph]").forEach((el) => { el.placeholder = T[el.dataset.tPh]; });
  document.querySelectorAll("[data-t-label]").forEach((el) => el.setAttribute("aria-label", T[el.dataset.tLabel]));
  $("today").textContent = T.dateFmt(new Date());
  renderTypes();
  if (state.conditions) renderBanner();
  if (state.sheet) renderSheet();
}

function renderTypes() {
  $("types").innerHTML = Object.entries(t().types)
    .map(([k, label]) => `<label><input type="radio" name="type" value="${k}" ${k === state.workType ? "checked" : ""}><span>${esc(label)}</span></label>`)
    .join("");
}

function setStep(step) {
  state.step = step;
  const order = ["talk", "sheet", "evening"];
  document.querySelectorAll(".steps li").forEach((li) => {
    const i = order.indexOf(li.dataset.step), now = order.indexOf(step);
    li.className = i < now ? "done" : i === now ? "now" : "";
  });
}

// 作業日と時間の初期値: 今日・8 時〜17 時
function setupWhen() {
  const d = new Date();
  $("date").value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const opts = Array.from({ length: 24 }, (_, h) => `<option value="${h}">${h}:00</option>`).join("");
  $("start").innerHTML = opts;
  $("end").innerHTML = opts;
  $("start").value = "8";
  $("end").value = "17";
}

// ---- 黄色い帯 (天気の注意) ----
const ALERT_ICON = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 2 20h20z"></path><path d="M12 10v4M12 17v.5"></path></svg>';
const OK_ICON = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0B7A4B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="m8 12 3 3 5-6"></path></svg>';

function bannerMessage(text) {
  const b = $("banner");
  b.className = "banner";
  b.innerHTML = `<div class="banner-main"><span>${esc(text)}</span></div>`;
  b.hidden = false;
}

async function loadConditions(query) {
  bannerMessage(t().loadingWx);
  const q = new URLSearchParams({ ...query, date: $("date").value, start: $("start").value, end: $("end").value });
  try {
    const res = await fetch(`/api/conditions?${q}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    state.site = data.site;
    state.conditions = data;
    renderBanner();
  } catch (err) {
    bannerMessage(err.message || t().gpsFail);
  }
}

function renderBanner() {
  const T = t(), c = state.conditions;
  const warnings = c.official_warnings?.active ?? [];
  const stop = c.hours_over_stop_rule, thunder = c.thunder_hours;
  const alert = warnings.length > 0 || stop.length > 0 || thunder.length > 0;
  const hours = (hs) => hs.map(T.hourUnit).join("・");

  let head = T.calm;
  if (stop.length) head = T.stopFrom(stop[0], Math.max(...c.hours.filter((h) => stop.includes(h.hour)).map((h) => h.wind_ms)).toFixed(1));
  else if (thunder.length) head = T.thunderAt(thunder[0]);
  else if (warnings.length) head = T.warnHead;

  const lines = [];
  if (stop.length) lines.push(T.stopLine(hours(stop)));
  if (thunder.length) lines.push(T.thunderLine(hours(thunder)));
  lines.push(T.gustLine(c.max_gust_ms.toFixed(1)));
  lines.push(T.upperNote);

  const ow = c.official_warnings;
  const area = ow ? (state.lang === "en" ? ow.area_en : ow.area) : "";
  const at = ow ? new Date(ow.issued_at).toLocaleString(state.lang === "en" ? "en-US" : "ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

  const b = $("banner");
  b.className = alert ? "banner alert" : "banner";
  b.innerHTML = `${alert ? ALERT_ICON : OK_ICON}
    <div class="banner-main">
      <strong>${esc(head)}</strong>
      ${warnings.length ? `<div class="warn-tags">${warnings.map((w) => `<span>${esc(w[state.lang])}</span>`).join("")}</div>` : ""}
      <ul>${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
      <span>${esc(T.decide)}</span>
      <span class="src">${esc(T.source(area, at))}</span>
    </div>`;
  b.hidden = false;
}

$("gps").addEventListener("click", () => {
  if (!navigator.geolocation) return bannerMessage(t().gpsFail);
  bannerMessage(t().locating);
  navigator.geolocation.getCurrentPosition(
    (pos) => loadConditions({ lat: pos.coords.latitude.toFixed(5), lon: pos.coords.longitude.toFixed(5) }),
    () => bannerMessage(t().gpsFail),
    { enableHighAccuracy: true, timeout: 15000 },
  );
});

$("place-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const place = $("place").value.trim();
  if (place) loadConditions({ place });
});

// 日付や時間を変えたら、同じ現場で引き直す
["date", "start", "end"].forEach((id) =>
  $(id).addEventListener("change", () => {
    if (state.site) loadConditions({ lat: state.site.lat, lon: state.site.lon });
  }),
);

$("types").addEventListener("change", (e) => { state.workType = e.target.value; });

// ---- 職長との聞き取り ----
function say(cls, text) {
  const li = document.createElement("li");
  li.className = cls;
  if (cls === "foreman") li.dataset.badge = t().badge;
  li.textContent = text;
  $("log").append(li);
  li.scrollIntoView({ block: "end", behavior: "smooth" });
  return li;
}

$("ask").addEventListener("submit", async (e) => {
  e.preventDefault();
  const box = $("text"), button = $("send");
  const text = box.value.trim();
  if (!text) return;
  say("me", text);
  box.value = "";
  button.disabled = true;
  $("setup").hidden = true;
  const wait = say("thinking", t().thinking);
  try {
    const res = await fetch("/api/ky", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId: state.sessionId, text, site: state.site, workType: state.workType, lang: state.lang }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    state.sessionId = data.sessionId;
    if (data.reply) say("foreman", data.reply);
    if (data.sheet) {
      state.sheet = data.sheet;
      renderSheet();
      setStep("sheet");
      $("sheet").scrollIntoView({ block: "start", behavior: "smooth" });
    }
  } catch (err) {
    say("error", err.message || t().sendFail);
  } finally {
    wait.remove();
    button.disabled = false;
  }
});

$("text").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) $("ask").requestSubmit();
});

// ---- 用紙 ----
const SPEAK_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"></path></svg>';
const PRINT_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M7 14h10v7H7z"></path></svg>';

function renderSheet() {
  const T = t(), s = state.sheet, c = state.conditions;
  const pills = [];
  if (c?.hours_over_stop_rule.length) pills.push(`<span class="pill hot">${esc(T.stopFrom(c.hours_over_stop_rule[0], "≥10"))}</span>`);
  (c?.official_warnings?.active ?? []).forEach((w) => pills.push(`<span class="pill hot">${esc(w[state.lang])}</span>`));
  pills.push(`<span class="pill">${esc(T.types[s.work_type])}</span>`);

  const hazards = s.hazards
    .map((h, i) => `<article class="hazard${h.key ? " key" : ""}">
        <div class="hazard-top"><span class="num">${i + 1}</span><strong>${esc(h.hazard)}${h.key ? `<span class="key-tag">${esc(T.key)}</span>` : ""}</strong></div>
        <p>${esc(h.countermeasure)}</p>
        <p class="who">${esc(T.checker)}: ${esc(h.checker)}</p>
      </article>`)
    .join("");
  const checks = s.checks.map((x, i) => `<li><label><input type="checkbox" id="chk-${i}"><span>${esc(x)}</span></label></li>`).join("");
  const past = s.past_near_misses.length
    ? `<aside class="past"><h3>${esc(T.pastTitle)}</h3><ul>${s.past_near_misses.map((p) => `<li>${esc(p)}</li>`).join("")}</ul></aside>`
    : "";

  $("sheet").innerHTML = `
    <div class="sheet-head"><h2>${esc(T.sheetTitle)}</h2><span class="meta">${esc($("date").value)}</span></div>
    <p class="meta">${esc(s.work)} ・ ${esc(s.place_and_height)} ・ ${esc(s.crew)}</p>
    <div class="pill-row">${pills.join("")}</div>
    <p class="meta">${esc(s.weather)}</p>
    ${hazards}
    <section class="checks"><h3>${esc(T.checksTitle)}</h3><ul>${checks}</ul></section>
    ${past}
    <div class="motto">${esc(s.team_motto)}</div>
    <section class="plain"><h3>${esc(T.plainTitle)}</h3>${esc(s.plain_reading)}</section>
    <div class="sign" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
    <p class="final-note">${esc(T.decide)}</p>
    <div class="sheet-actions">
      <button type="button" class="secondary" id="read">${SPEAK_ICON}${esc(T.readAloud)}</button>
      <button type="button" class="primary" id="print">${PRINT_ICON}${esc(T.print)}</button>
    </div>
    <button type="button" class="secondary" id="to-evening">${esc(T.toEvening)}</button>`;
  $("sheet").hidden = false;

  $("print").addEventListener("click", () => window.print());
  $("read").addEventListener("click", () => {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(`${s.plain_reading} ${s.team_motto}`);
    u.lang = T.speech;
    speechSynthesis.speak(u);
  });
  $("to-evening").addEventListener("click", () => {
    $("evening").hidden = false;
    $("n-work").value = s.work;
    setStep("evening");
    $("evening").scrollIntoView({ block: "start", behavior: "smooth" });
  });
}

// ---- 夕方のヒヤリハット ----
$("near").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const res = await fetch("/api/near-miss", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(Object.fromEntries(new FormData(form))),
  });
  const data = await res.json();
  $("near-msg").textContent = res.ok ? t().nSaved : data.error;
  if (res.ok) form.reset();
});

// ---- 声で入力 (使えるブラウザだけ) ----
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (Recognition) {
  const mic = $("mic");
  mic.hidden = false;
  let rec = null;
  mic.addEventListener("click", () => {
    if (rec) return rec.stop();
    rec = new Recognition();
    rec.lang = t().speech;
    rec.interimResults = false;
    rec.onresult = (ev) => { $("text").value += ev.results[0][0].transcript; };
    rec.onend = () => { rec = null; mic.classList.remove("on"); };
    mic.classList.add("on");
    rec.start();
  });
}

$("lang").addEventListener("click", () => {
  state.lang = state.lang === "ja" ? "en" : "ja";
  try { localStorage.setItem("ky-lang", state.lang); } catch {}
  applyLang();
});

$("reset").addEventListener("click", () => location.reload());

setupWhen();
setStep("talk");
applyLang();
