// BP Tracker — app.js (no libraries)
// Morning: saves to raw (3 readings)
// Evening: saves to evening (2 readings + averages + notes)
// Chart: reads daily via ?list=daily&n=...

const ENDPOINT =
  "https://script.google.com/macros/s/AKfycbx0cyqzKTaV3NIlZOfFxVKMHa5uWlebH-znDcJbbhPLlC4D0_3CSVOL0Ific-CLKtir/exec";

// ---- DOM helpers ----
const $ = (id) => document.getElementById(id);

const inputs = {
  sys1: $("sys1"), dia1: $("dia1"), pul1: $("pul1"),
  sys2: $("sys2"), dia2: $("dia2"), pul2: $("pul2"),
  sys3: $("sys3"), dia3: $("dia3"), pul3: $("pul3"),
};

const avgEls = {
  sys: $("avgSys"),
  dia: $("avgDia"),
  pul: $("avgPul"),
};

const saveBtn = $("saveBtn");
const refreshBtn = $("refreshBtn");
const statusMsg = $("statusMsg");

const canvas = $("chart");
const ctx = canvas.getContext("2d");

const modeMorningBtn = $("modeMorningBtn");
const modeEveningBtn = $("modeEveningBtn");
const triplet3 = $("triplet3");

let MODE = "morning"; // "morning" | "evening"

// ---- utils ----
function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function todayYMD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function nowHHMM() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function mean3(a, b, c) {
  const arr = [a, b, c].filter((x) => typeof x === "number");
  if (arr.length !== 3) return null;
  const s = arr.reduce((t, x) => t + x, 0);
  return Math.round((s / 3) * 10) / 10; // 1dp
}

function mean2(a, b) {
  const arr = [a, b].filter((x) => typeof x === "number");
  if (arr.length !== 2) return null;
  const s = arr[0] + arr[1];
  return Math.round((s / 2) * 10) / 10; // 1dp
}

function setStatus(text, kind = "muted") {
  statusMsg.textContent = text || "";
  statusMsg.style.color =
    kind === "ok" ? "#22c55e" :
    kind === "bad" ? "#fb7185" :
    "#aab2c0";
}

function setMode(mode) {
  MODE = mode;

  if (MODE === "evening") {
    modeEveningBtn.classList.add("primary");
    modeMorningBtn.classList.remove("primary");
    if (triplet3) triplet3.style.display = "none";
  } else {
    modeMorningBtn.classList.add("primary");
    modeEveningBtn.classList.remove("primary");
    if (triplet3) triplet3.style.display = "";
  }

  computeAverages();
  setStatus("");
}

// ---- averages ----
function computeAverages() {
  const s1 = num(inputs.sys1.value), d1 = num(inputs.dia1.value), p1 = num(inputs.pul1.value);
  const s2 = num(inputs.sys2.value), d2 = num(inputs.dia2.value), p2 = num(inputs.pul2.value);
  const s3 = num(inputs.sys3.value), d3 = num(inputs.dia3.value), p3 = num(inputs.pul3.value);

  let sysAvg, diaAvg, pulAvg;

  if (MODE === "evening") {
    sysAvg = mean2(s1, s2);
    diaAvg = mean2(d1, d2);
    pulAvg = mean2(p1, p2);
  } else {
    sysAvg = mean3(s1, s2, s3);
    diaAvg = mean3(d1, d2, d3);
    pulAvg = mean3(p1, p2, p3);
  }

  avgEls.sys.textContent = sysAvg ?? "—";
  avgEls.dia.textContent = diaAvg ?? "—";
  avgEls.pul.textContent = pulAvg ?? "—";

  return { sysAvg, diaAvg, pulAvg };
}

Object.values(inputs).forEach((el) => {
  el.addEventListener("input", () => {
    computeAverages();
    setStatus("");
  });
});

// ---- API calls ----
async function postRow(payload) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });

  const text = await res.text();

  let json;
  try { json = JSON.parse(text); }
  catch { json = { ok: false, error: text }; }

  if (!res.ok) throw new Error(`HTTP ${res.status}: ${json.error || text}`);
  if (!json.ok) throw new Error(json.error || "Unknown error");
  return json;
}

async function getRowsDaily(n = 50) {
  const url = `${ENDPOINT}?list=daily&n=${encodeURIComponent(String(Math.max(1, Math.min(50, n))))}`;
  const res = await fetch(url, { method: "GET" });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Failed to load rows");
  return json.rows || [];
}

// ---- chart (weekly last 7 days) ----
function parseRow(r) {
  const date = String(r.date || "").trim(); // yyyy-mm-dd
  const sys = Number(r.sys_avg);
  const dia = Number(r.dia_avg);
  if (!date || !Number.isFinite(sys) || !Number.isFinite(dia)) return null;
  return { date, sys, dia };
}

function lastNDates(n) {
  const out = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d);
    x.setDate(d.getDate() - i);
    const y = x.getFullYear();
    const m = String(x.getMonth() + 1).padStart(2, "0");
    const day = String(x.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${day}`);
  }
  return out;
}

function drawChart(points) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(320, Math.floor(rect.width));
  const h = Math.max(240, Math.floor(rect.width * 0.45));
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.clearRect(0, 0, w, h);

  const padL = 44, padR = 12, padT = 18, padB = 32;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const vals = [];
  for (const p of points) {
    if (Number.isFinite(p.sys)) vals.push(p.sys);
    if (Number.isFinite(p.dia)) vals.push(p.dia);
  }
  const minV = vals.length ? Math.floor(Math.min(...vals) - 5) : 60;
  const maxV = vals.length ? Math.ceil(Math.max(...vals) + 5) : 140;

  function x(i) {
    if (points.length <= 1) return padL;
    return padL + (i / (points.length - 1)) * plotW;
  }
  function y(v) {
    const t = (v - minV) / (maxV - minV || 1);
    return padT + (1 - t) * plotH;
  }

  ctx.strokeStyle = "rgba(170,178,192,0.18)";
  ctx.lineWidth = 1;
  const gridCount = 4;
  for (let i = 0; i <= gridCount; i++) {
    const gy = padT + (i / gridCount) * plotH;
    ctx.beginPath();
    ctx.moveTo(padL, gy);
    ctx.lineTo(padL + plotW, gy);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(170,178,192,0.85)";
  ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let i = 0; i <= gridCount; i++) {
    const v = Math.round(maxV - (i / gridCount) * (maxV - minV));
    const gy = padT + (i / gridCount) * plotH;
    ctx.fillText(String(v), padL - 8, gy);
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (let i = 0; i < points.length; i++) {
    const lab = points[i].label.slice(5);
    ctx.fillText(lab, x(i), padT + plotH + 10);
  }

  function drawLine(key, stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < points.length; i++) {
      const v = points[i][key];
      if (!Number.isFinite(v)) continue;
      const px = x(i);
      const py = y(v);
      if (!started) { ctx.moveTo(px, py); started = true; }
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    ctx.fillStyle = stroke;
    for (let i = 0; i < points.length; i++) {
      const v = points[i][key];
      if (!Number.isFinite(v)) continue;
      ctx.beginPath();
      ctx.arc(x(i), y(v), 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawLine("sys", "rgba(96,165,250,0.95)");
  drawLine("dia", "rgba(244,114,182,0.95)");

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(230,232,238,0.9)";
  ctx.fillText("Systolic", padL, padT - 4);
  ctx.fillStyle = "rgba(96,165,250,0.95)";
  ctx.fillRect(padL - 16, padT - 14, 10, 10);

  ctx.fillStyle = "rgba(230,232,238,0.9)";
  ctx.fillText("Diastolic", padL + 110, padT - 4);
  ctx.fillStyle = "rgba(244,114,182,0.95)";
  ctx.fillRect(padL + 94, padT - 14, 10, 10);
}

async function refreshChart() {
  setStatus("Loading chart…");
  try {
    const rows = await getRowsDaily(50);
    const parsed = rows.map(parseRow).filter(Boolean);

    const last7 = lastNDates(7);

    const byDate = new Map();
    for (const r of parsed) byDate.set(r.date, r);

    const points = last7.map((d) => {
      const row = byDate.get(d);
      return { label: d, sys: row ? row.sys : null, dia: row ? row.dia : null };
    });

    drawChart(points);
    setStatus("");
  } catch (e) {
    setStatus(`Chart load failed: ${e.message}`, "bad");
  }
}

// ---- save flow ----
saveBtn.addEventListener("click", async () => {
  const { sysAvg, diaAvg, pulAvg } = computeAverages();

  const s1 = num(inputs.sys1.value), d1 = num(inputs.dia1.value), p1 = num(inputs.pul1.value);
  const s2 = num(inputs.sys2.value), d2 = num(inputs.dia2.value), p2 = num(inputs.pul2.value);
  const s3 = num(inputs.sys3.value), d3 = num(inputs.dia3.value), p3 = num(inputs.pul3.value);

  const required = (MODE === "evening")
    ? [s1, d1, p1, s2, d2, p2]
    : [s1, d1, p1, s2, d2, p2, s3, d3, p3];

  if (!required.every((x) => typeof x === "number")) {
    setStatus(`Please fill all ${MODE === "evening" ? "6" : "9"} numbers before saving.`, "bad");
    return;
  }
  if (sysAvg === null || diaAvg === null || pulAvg === null) {
    setStatus("Averages missing—please complete the readings.", "bad");
    return;
  }

  const ts = new Date().toISOString();
  const date = todayYMD();
  const time = nowHHMM();

  let payload;

  if (MODE === "evening") {
    payload = {
      type: "evening",
      timestamp: ts,
      date,
      time,
      systolic1: s1, diastolic1: d1, pulse1: p1,
      systolic2: s2, diastolic2: d2, pulse2: p2,
      sys_avg: sysAvg,
      dia_avg: diaAvg,
      pulse_avg: pulAvg,
      notes: ""
    };
  } else {
    payload = {
      type: "raw",
      timestamp: ts,
      date,
      time,
      systolic1: s1, diastolic1: d1, pulse1: p1,
      systolic2: s2, diastolic2: d2, pulse2: p2,
      systolic3: s3, diastolic3: d3, pulse3: p3
    };
  }

  saveBtn.disabled = true;
  refreshBtn.disabled = true;
  setStatus("Saving…");

  try {
    await postRow(payload);
    setStatus(`Saved (${MODE}) ✅`, "ok");
    await refreshChart();
  } catch (e) {
    setStatus(`Save failed: ${e.message}`, "bad");
  } finally {
    saveBtn.disabled = false;
    refreshBtn.disabled = false;
  }
});

refreshBtn.addEventListener("click", refreshChart);

modeMorningBtn.addEventListener("click", () => setMode("morning"));
modeEveningBtn.addEventListener("click", () => setMode("evening"));

// ---- init ----
setMode("morning");
computeAverages();
refreshChart();
window.addEventListener("resize", () => refreshChart());