let sessionId = null;
const log = document.getElementById("log");
const sheetEl = document.getElementById("sheet");

function say(who, text) {
  const li = document.createElement("li");
  li.className = who;
  li.textContent = text;
  log.append(li);
  li.scrollIntoView({ block: "end" });
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

function showSheet(s) {
  const rows = s.hazards
    .map((h) => `<tr><td>${esc(h.hazard)}</td><td>${esc(h.countermeasure)}</td><td>${esc(h.checker)}</td></tr>`)
    .join("");
  const past = s.past_near_misses.length
    ? `<h3>過去のヒヤリハット</h3><ul>${s.past_near_misses.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>`
    : "";
  sheetEl.innerHTML = `
    <h2>危険予知 (KY) 用紙</h2>
    <dl>
      <dt>作業</dt><dd>${esc(s.work)}</dd>
      <dt>場所・高さ</dt><dd>${esc(s.place_and_height)}</dd>
      <dt>人数・配置</dt><dd>${esc(s.crew)}</dd>
      <dt>天気</dt><dd>${esc(s.weather)}</dd>
    </dl>
    <table><thead><tr><th>危険</th><th>対策</th><th>確認する人</th></tr></thead><tbody>${rows}</tbody></table>
    ${past}
    <p class="motto">${esc(s.team_motto)}</p>
    <h3>やさしい日本語</h3><p class="easy">${esc(s.easy_japanese)}</p>
    <button type="button" onclick="window.print()">印刷する</button>`;
  sheetEl.hidden = false;
}

document.getElementById("ask").addEventListener("submit", async (e) => {
  e.preventDefault();
  const box = document.getElementById("text");
  const button = document.getElementById("send");
  const text = box.value.trim();
  if (!text) return;
  say("me", text);
  box.value = "";
  button.disabled = true;
  button.textContent = "考えています…";
  try {
    const res = await fetch("/api/ky", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId, text }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    sessionId = data.sessionId;
    if (data.reply) say("foreman", data.reply);
    if (data.sheet) showSheet(data.sheet);
  } catch (err) {
    say("error", err.message || "送れませんでした。");
  } finally {
    button.disabled = false;
    button.textContent = "送る";
  }
});

document.getElementById("near").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const msg = document.getElementById("near-msg");
  const res = await fetch("/api/near-miss", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(Object.fromEntries(new FormData(form))),
  });
  const data = await res.json();
  msg.textContent = res.ok ? "記録しました。明日の同じ作業の用紙に入ります。" : data.error;
  if (res.ok) form.reset();
});
