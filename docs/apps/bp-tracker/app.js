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

const trendBody = $("trendBody");
const avg7SysEl = $("avg7Sys");
const avg7DiaEl = $("avg7Dia");
const avg7PulEl = $("avg7Pul");

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


function fmt(v) {
  return Number.isFinite(v) ? String(v) : "—";
}

function mean(arr) {
  const xs = arr.filter((x) => Number.isFinite(x));
  if (!xs.length) return null;
  const s = xs.reduce((t, x) => t + x, 0);
  return Math.round((s / xs.length) * 10) / 10;
}

async function refreshTrendTable() {
  setStatus("Loading last 7 days…");
  try {
    const rows = await getRowsDaily(50);
    const parsed = rows.map((r) => {
      const date = String(r.date || "").trim();
      const sys = Number(r.sys_avg);
      const dia = Number(r.dia_avg);
      const pul = Number(r.pulse_avg);
      if (!date) return null;
      return { date, sys, dia, pul };
    }).filter(Boolean);

    const last7 = lastNDates(7);

    // Latest entry per date
    const byDate = new Map();
    for (const r of parsed) byDate.set(r.date, r);

    // Build table rows
    trendBody.innerHTML = "";
    const sysVals = [];
    const diaVals = [];
    const pulVals = [];

    for (const d of last7) {
      const r = byDate.get(d);
      const sys = r ? r.sys : null;
      const dia = r ? r.dia : null;
      const pul = r ? r.pul : null;

      if (Number.isFinite(sys)) sysVals.push(sys);
      if (Number.isFinite(dia)) diaVals.push(dia);
      if (Number.isFinite(pul)) pulVals.push(pul);

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${d}</td>
        <td>${fmt(sys)}</td>
        <td>${fmt(dia)}</td>
        <td>${fmt(pul)}</td>
      `;
      trendBody.appendChild(tr);
    }

    const avgSys = mean(sysVals);
    const avgDia = mean(diaVals);
    const avgPul = mean(pulVals);

    avg7SysEl.textContent = avgSys ?? "—";
    avg7DiaEl.textContent = avgDia ?? "—";
    avg7PulEl.textContent = avgPul ?? "—";

    setStatus("");
  } catch (e) {
    setStatus(`Trend load failed: ${e.message}`, "bad");
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

  // also write daily averages (so the 7-day table has data)
  const dailyPayload = {
    type: "daily",
    date,
    sys_avg: sysAvg,
    dia_avg: diaAvg,
    pulse_avg: pulAvg,
    notes: ""
  };
  await postRow(dailyPayload);

  setStatus(`Saved (${MODE}) ✅`, "ok");
  await refreshChart();
} catch (e) {
});

refreshBtn.addEventListener("click", refreshTrendTable);

modeMorningBtn.addEventListener("click", () => setMode("morning"));
modeEveningBtn.addEventListener("click", () => setMode("evening"));

// ---- init ----
setMode("morning");
computeAverages();
refreshTrendTable();
window.addEventListener("resize", () => refreshTrendTable());