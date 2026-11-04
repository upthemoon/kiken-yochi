// 画面の動き。言葉は日本語を基本に、英語にも切り替えられる。

const TEXT = {
  ja: {
    appName: "朝の KY", reset: "最初からやり直す", progress: "進み具合",
    stepTalk: "聞き取り", stepSheet: "用紙", stepEvening: "夕方の記録",
    workType: "今日の工種", crewLangs: "作業員の言語 (用紙を母語でも出す・4 つまで)", site: "現場の位置", useGps: "今いる場所を使う", placeLabel: "地名で探す",
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
    source: (area, at) => `予報: Open-Meteo${area ? ` / 注意報・警報: 気象庁 ${area} (${at} 発表)` : area === null ? "" : " / 気象庁の注意報・警報は日本国内のみ"}`,
    warnUnknown: "気象庁の注意報・警報を確かめられませんでした",
    warnUnknownLine: "注意報・警報は、気象庁の発表を責任者が確かめてください。",
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
    workType: "Today's work", crewLangs: "Crew languages (sheet in their own language, up to 4)", site: "Job site", useGps: "Use my location", placeLabel: "Search by place",
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
    source: (area, at) => `Forecast: Open-Meteo${area ? ` / Warnings: JMA ${area} (issued ${at})` : area === null ? "" : " / JMA warnings cover Japan only"}`,
    warnUnknown: "Couldn't check JMA weather warnings",
    warnUnknownLine: "The person in charge should check the JMA warnings directly.",
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

// 作業員の言語。画面の操作は責任者が日本語か英語で行い、用紙だけを作業員の母語でも出す。
// 並びは建設業の外国人労働者の国籍の多い順 (厚労省「外国人雇用状況」令和7年10月末:
// ベトナム 36.1%・インドネシア 25.0%・フィリピン 11.0%・中国 7.6%・ミャンマー 4.8%・ブラジル 2.3%・ネパール 1.7%)。
// カンボジアは特定技能 (建設) で 5 番目に多いので入れる。見出しの訳は母語話者の確認前の下書き。
const CREW = {
  vi: { name: "Tiếng Việt", speech: "vi-VN", title: "Nguy hiểm hôm nay", act: "Chúng ta sẽ làm", motto: "Cùng hô to", read: "Đọc to" },
  id: { name: "Bahasa Indonesia", speech: "id-ID", title: "Bahaya hari ini", act: "Yang kita lakukan", motto: "Seruan bersama", read: "Bacakan" },
  fil: { name: "Filipino", speech: "fil-PH", title: "Mga panganib ngayon", act: "Gagawin natin", motto: "Sabay-sabay na sigaw", read: "Basahin nang malakas" },
  zh: { name: "中文（简体）", speech: "zh-CN", title: "今天的危险", act: "我们这样做", motto: "一起指认呼唤", read: "朗读" },
  my: { name: "မြန်မာ", speech: "my-MM", title: "ယနေ့ အန္တရာယ်များ", act: "ကျွန်ုပ်တို့ လုပ်ဆောင်မည်", motto: "အတူတကွ အော်ဆိုရန်", read: "အသံထွက် ဖတ်ရန်" },
  pt: { name: "Português (Brasil)", speech: "pt-BR", title: "Perigos de hoje", act: "O que vamos fazer", motto: "Grito em conjunto", read: "Ler em voz alta" },
  ne: { name: "नेपाली", speech: "ne-NP", title: "आजका खतराहरू", act: "हामी यसो गर्छौं", motto: "सँगै भनौं", read: "पढेर सुनाउनुहोस्" },
  km: { name: "ខ្មែរ", speech: "km-KH", title: "គ្រោះថ្នាក់ថ្ងៃនេះ", act: "យើងនឹងធ្វើ", motto: "ស្រែកជាមួយគ្នា", read: "អានឮៗ" },
};

const $ = (id) => document.getElementById(id);
const state = {
  lang: readLang(),
  workType: "assembly",
  site: null,
  conditions: null,
  conditionsFor: null,
  sessionId: null,
  sheet: null,
  step: "talk",
  crewLangs: readCrewLangs(),
};

function readCrewLangs() {
  try { return (JSON.parse(localStorage.getItem("ky-crew") ?? "[]")).filter((c) => Object.hasOwn(CREW, c)); } catch { return []; }
}

function readLang() {
  try { return localStorage.getItem("ky-lang") === "en" ? "en" : "ja"; } catch { return "ja"; }
}
const t = () => TEXT[state.lang];

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
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
  renderCrewLangs();
  if (state.conditions) renderBanner();
  if (state.sheet) renderSheet();
}

function renderCrewLangs() {
  $("crew-langs").innerHTML = Object.entries(CREW)
    .map(([k, c]) => `<label><input type="checkbox" value="${k}" ${state.crewLangs.includes(k) ? "checked" : ""}><span lang="${k}">${esc(c.name)}</span></label>`)
    .join("");
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

// 天気の要求は最後の 1 つだけ生かす。日付・時間・場所を変えたあとに、古い要求の答えが遅れて届いても反映しない。
let conditionsRequest = 0;
let conditionsAbort = null;

async function loadConditions(query) {
  const id = ++conditionsRequest;
  conditionsAbort?.abort();
  const abort = (conditionsAbort = new AbortController());
  // 要求したときの作業日と時間。答えがこれと今の画面の値に合うときだけ使う。
  const asked = { date: $("date").value, start: $("start").value, end: $("end").value };
  // 古い結果は、新しい要求の答えが来るまで (失敗したときも) 用紙や帯に残さない。
  state.conditions = null;
  state.conditionsFor = null;
  if (query.place) state.site = null;
  bannerMessage(t().loadingWx);
  const q = new URLSearchParams({ ...query, ...asked });
  try {
    const res = await fetch(`/api/conditions?${q}`, { signal: abort.signal });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    if (id !== conditionsRequest || !conditionsMatch(asked, data.date)) return;
    state.site = data.site;
    state.conditions = data;
    state.conditionsFor = asked;
    renderBanner();
  } catch (err) {
    if (id !== conditionsRequest || err.name === "AbortError") return;
    bannerMessage(err.message || t().gpsFail);
  }
}

// 画面の作業日・時間が、天気を引いたときのものと同じか
function conditionsMatch(asked, date) {
  return asked.date === $("date").value && asked.start === $("start").value && asked.end === $("end").value && (date === undefined || date === asked.date);
}

// 用紙や帯に使ってよい天気 (今の作業日・時間のもの)。合わなければ null。
function currentConditions() {
  const f = state.conditionsFor;
  return state.conditions && f && conditionsMatch(f) ? state.conditions : null;
}

function renderBanner() {
  const T = t(), c = state.conditions;
  const warnings = c.official_warnings?.active ?? [];
  // 確かめられなかったときは「出ていない」と見せず、注意の色で出す。
  const unknown = c.official_warnings?.unavailable === true;
  const stop = c.hours_over_stop_rule, thunder = c.thunder_hours;
  const alert = warnings.length > 0 || stop.length > 0 || thunder.length > 0 || unknown;
  const hours = (hs) => hs.map(T.hourUnit).join("・");

  let head = T.calm;
  if (stop.length) head = T.stopFrom(stop[0], Math.max(...c.hours.filter((h) => stop.includes(h.hour)).map((h) => h.wind_ms)).toFixed(1));
  else if (thunder.length) head = T.thunderAt(thunder[0]);
  else if (warnings.length) head = T.warnHead;
  else if (unknown) head = T.warnUnknown;

  const lines = [];
  if (stop.length) lines.push(T.stopLine(hours(stop)));
  if (thunder.length) lines.push(T.thunderLine(hours(thunder)));
  if (unknown) lines.push(T.warnUnknownLine);
  lines.push(T.gustLine(c.max_gust_ms.toFixed(1)));
  lines.push(T.upperNote);

  const ow = c.official_warnings;
  const area = ow?.area ? (state.lang === "en" ? ow.area_en : ow.area) : "";
  const at = ow?.area ? new Date(ow.issued_at).toLocaleString(state.lang === "en" ? "en-US" : "ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

  const b = $("banner");
  b.className = alert ? "banner alert" : "banner";
  b.innerHTML = `${alert ? ALERT_ICON : OK_ICON}
    <div class="banner-main">
      <strong>${esc(head)}</strong>
      ${warnings.length ? `<div class="warn-tags">${warnings.map((w) => `<span>${esc(w[state.lang])}</span>`).join("")}</div>` : ""}
      <ul>${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
      <span>${esc(T.decide)}</span>
      <span class="src">${esc(T.source(unknown ? null : area, at))}</span>
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

$("crew-langs").addEventListener("change", (e) => {
  const picked = [...$("crew-langs").querySelectorAll("input:checked")].map((i) => i.value);
  if (picked.length > 4) { e.target.checked = false; return; }
  state.crewLangs = picked;
  try { localStorage.setItem("ky-crew", JSON.stringify(picked)); } catch {}
});

// ---- 職長との聞き取り ----
function say(cls, text) {
  const li = document.createElement("li");
  li.className = cls;
  if (cls === "foreman") li.dataset.badge = t().badge;
  // 職長の返事は太字 (**…**) だけを効かせる。ほかは文字のまま出す。
  if (cls === "foreman") li.innerHTML = esc(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  else li.textContent = text;
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
      body: JSON.stringify({ sessionId: state.sessionId, text, site: state.site, workType: state.workType, lang: state.lang, crewLangs: state.crewLangs, date: $("date").value, start: Number($("start").value), end: Number($("end").value) }),
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
  const T = t(), s = state.sheet, c = currentConditions();
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
    ${crewSection(s)}
    <div class="sign" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
    <p class="final-note">${esc(T.decide)}</p>
    <div class="sheet-actions">
      <button type="button" class="secondary" id="read">${SPEAK_ICON}${esc(T.readAloud)}</button>
      <button type="button" class="primary" id="print">${PRINT_ICON}${esc(T.print)}</button>
    </div>
    <button type="button" class="secondary" id="to-evening">${esc(T.toEvening)}</button>`;
  $("sheet").hidden = false;

  $("print").addEventListener("click", () => window.print());
  $("sheet").querySelectorAll("[data-read-crew]").forEach((b) =>
    b.addEventListener("click", () => {
      const v = s.crew_versions.find((x) => x.lang === b.dataset.readCrew);
      if (v) speak(`${v.plain_reading} ${v.team_motto}`, CREW[v.lang].speech);
    }),
  );
  $("sheet").querySelectorAll("[data-crew-tab]").forEach((b) =>
    b.addEventListener("click", () => {
      $("sheet").querySelectorAll("[data-crew-tab]").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
      $("sheet").querySelectorAll("[data-crew-panel]").forEach((p) => { p.hidden = p.dataset.crewPanel !== b.dataset.crewTab; });
    }),
  );
  $("read").addEventListener("click", () => {
    speak(`${s.plain_reading} ${s.team_motto}`, T.speech);
  });
  $("to-evening").addEventListener("click", () => {
    $("evening").hidden = false;
    $("n-work").value = s.work;
    setStep("evening");
    $("evening").scrollIntoView({ block: "start", behavior: "smooth" });
  });
}

// 端末にその言語の声がなければ、読み上げボタンを出さず文字だけにする。
function hasVoice(lang) {
  if (!("speechSynthesis" in window)) return false;
  return speechSynthesis.getVoices().some((v) => v.lang.replace("_", "-").startsWith(lang.split("-")[0]));
}
if ("speechSynthesis" in window) speechSynthesis.onvoiceschanged = () => { if (state.sheet) renderSheet(); };

function speak(text, lang) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  // その言語の声が端末にあれば使う。なければ端末の既定の声で読む。
  const voice = speechSynthesis.getVoices().find((v) => v.lang.replace("_", "-").startsWith(lang.split("-")[0]));
  if (voice) u.voice = voice;
  speechSynthesis.speak(u);
}

// 作業員の母語の版。言語ごとにタブで切り替え、印刷では全部を並べる。
function crewSection(s) {
  const versions = (s.crew_versions ?? []).filter((v) => Object.hasOwn(CREW, v.lang));
  if (!versions.length) return "";
  const tabs = versions
    .map((v, i) => `<button type="button" role="tab" class="crew-tab" data-crew-tab="${v.lang}" aria-selected="${i === 0}" lang="${v.lang}">${esc(CREW[v.lang].name)}</button>`)
    .join("");
  const panels = versions
    .map((v, i) => {
      const c = CREW[v.lang];
      const items = v.hazards
        .map((h, j) => `<li><strong>${j + 1}. ${esc(h.hazard)}</strong><span>${esc(c.act)}: ${esc(h.countermeasure)}</span></li>`)
        .join("");
      return `<div class="crew-panel" role="tabpanel" data-crew-panel="${v.lang}" lang="${v.lang}" ${i === 0 ? "" : "hidden"}>
          <h3>${esc(c.title)}</h3>
          <ol>${items}</ol>
          <p class="crew-motto"><span>${esc(c.motto)}</span>${esc(v.team_motto)}</p>
          <p class="crew-plain">${esc(v.plain_reading)}</p>
          ${hasVoice(c.speech) ? `<button type="button" class="secondary" data-read-crew="${v.lang}">${SPEAK_ICON}${esc(c.read)}</button>` : ""}
        </div>`;
    })
    .join("");
  return `<section class="crew"><div class="crew-tabs" role="tablist">${tabs}</div>${panels}</section>`;
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
