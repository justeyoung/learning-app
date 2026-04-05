/* ======================================
   BP Isometric Protocol – app.js  v2
   requestAnimationFrame · SVG arc · WebAudio beeps · 3-sec prep
   ====================================== */

const EXEC_URL = "https://script.google.com/macros/s/AKfycbx0cyqzKTaV3NIlZOfFxVKMHa5uWlebH-znDcJbbhPLlC4D0_3CSVOL0Ific-CLKtir/exec";

const ROUTINE = [
  { key: "wall_sit",      name: "Wall Sit" },
  { key: "handgrip_1",   name: "Handgrip Hold" },
  { key: "plank",        name: "Forearm Plank" },
  { key: "split_left",   name: "Split Squat (Left)" },
  { key: "split_right",  name: "Split Squat (Right)" },
  { key: "glute_bridge", name: "Glute Bridge" },
  { key: "handgrip_2",   name: "Handgrip Hold" },
];

const LEVEL_PRESETS = {
  beginner:     { hold: 45,  rest: 60 },
  intermediate: { hold: 75,  rest: 75 },
  advanced:     { hold: 120, rest: 90 },
};

const PREP_SEC = 3;
const ARC_C   = 339.292; // 2π × 54

/* ---- DOM ---- */
const $ = (id) => document.getElementById(id);

const els = {
  level: $("level"), holdSeconds: $("holdSeconds"), restSeconds: $("restSeconds"),
  rounds: $("rounds"), includeRest: $("includeRest"), notes: $("notes"),
  totalTime: $("totalTime"), timeLeft: $("timeLeft"),
  roundInfo: $("roundInfo"), exerciseName: $("exerciseName"),
  phaseLabel: $("phaseLabel"), mainTimer: $("mainTimer"),
  progressArc: $("progressArc"), prepOverlay: $("prepOverlay"),
  exerciseList: $("exerciseList"),
  startBtn: $("startBtn"), pauseBtn: $("pauseBtn"),
  resetBtn: $("resetBtn"), skipBtn: $("skipBtn"),
  saveSessionBtn: $("saveSessionBtn"),
};

/* ---- WebAudio beeps ---- */
let audioCtx = null;

function ensureAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch { audioCtx = null; }
  }
  if (audioCtx?.state === "suspended") audioCtx.resume();
}

function beep(freq = 1000, ms = 150, vol = 0.12) {
  ensureAudio();
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const g   = audioCtx.createGain();
  osc.type = "sine"; osc.frequency.value = freq; g.gain.value = vol;
  osc.connect(g).connect(audioCtx.destination);
  const t = audioCtx.currentTime;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.setTargetAtTime(0, t + ms / 1000 - 0.03, 0.02);
  osc.start(t); osc.stop(t + ms / 1000 + 0.02);
}

/* ---- State ---- */
let rafId = null;

const st = {
  running: false,
  phase: "IDLE",           // IDLE | PREP | HOLD | REST | DONE
  round: 1,
  stepIndex: 0,

  phaseDuration: 0,        // total seconds for current phase
  phaseStartTs: null,      // performance.now() when this phase's timer started
  phaseElapsedPaused: 0,   // seconds elapsed before the last pause

  completedSec: 0,         // seconds from all fully-completed billable phases

  stepsCompleted: 0,
  roundsCompleted: 0,
  completed: false,

  lastBeepAt: -1,
};

/* ---- Helpers ---- */
function clamp(v, lo, hi, fb) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : fb;
}
function pad2(n) { return String(n).padStart(2, "0"); }
function mmss(s) { s = Math.max(0, Math.round(s)); return `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`; }

function settings() {
  const lv = els.level?.value || "intermediate";
  return {
    level: lv,
    hold:  clamp(els.holdSeconds?.value, 10, 300, LEVEL_PRESETS[lv].hold),
    rest:  clamp(els.restSeconds?.value,  0, 300, LEVEL_PRESETS[lv].rest),
    rounds:clamp(els.rounds?.value,       1,   3, 2),
    includeRest: !!els.includeRest?.checked,
    notes: (els.notes?.value || "").trim(),
  };
}

function plannedTotal() {
  const { hold, rest, rounds, includeRest } = settings();
  const holds = rounds * ROUTINE.length;
  const rests = (includeRest && rest > 0) ? Math.max(0, holds - 1) : 0;
  return holds * hold + rests * rest;
}

function phaseElapsed() {
  if (st.phaseStartTs === null) return st.phaseElapsedPaused;
  return (performance.now() - st.phaseStartTs) / 1000 + st.phaseElapsedPaused;
}

function phaseRemaining() { return Math.max(0, st.phaseDuration - phaseElapsed()); }

/* ---- Arc ---- */
function updateArc(rem, phase) {
  if (!els.progressArc) return;
  const progress = st.phaseDuration > 0
    ? Math.max(0, Math.min(1, (st.phaseDuration - rem) / st.phaseDuration))
    : 0;
  els.progressArc.style.strokeDashoffset = String(ARC_C * (1 - progress));
  els.progressArc.dataset.phase = phase;
}

/* ---- Render ---- */
function render() {
  const { rounds, hold } = settings();
  const total = plannedTotal();

  // Only HOLD and REST count toward billable elapsed time
  const billable = (st.phase === "HOLD" || st.phase === "REST")
    ? st.completedSec + phaseElapsed()
    : st.completedSec;

  if (els.totalTime) els.totalTime.textContent = mmss(total);
  if (els.timeLeft)  els.timeLeft.textContent  = mmss(Math.max(0, total - billable));

  const rn = Math.min(st.round, rounds);
  const en = Math.min(st.stepIndex + 1, ROUTINE.length);
  if (els.roundInfo) els.roundInfo.textContent =
    `Round ${rn} of ${rounds} · Exercise ${en} of ${ROUTINE.length}`;

  const ex = ROUTINE[st.stepIndex] || ROUTINE[ROUTINE.length - 1];
  if (els.exerciseName) els.exerciseName.textContent = ex.name;

  if (els.phaseLabel) {
    const label = st.completed ? "DONE" : st.phase === "PREP" ? "GET READY" : st.phase;
    els.phaseLabel.textContent = label;
    els.phaseLabel.dataset.phase = st.completed ? "DONE" : st.phase;
  }

  const rem = phaseRemaining();

  if (st.phase === "PREP") {
    if (els.prepOverlay) {
      els.prepOverlay.classList.remove("hidden");
      els.prepOverlay.textContent = String(Math.max(1, Math.ceil(rem)));
    }
    if (els.mainTimer) els.mainTimer.textContent = mmss(hold);
    updateArc(0, "PREP");
  } else {
    if (els.prepOverlay) els.prepOverlay.classList.add("hidden");
    if (els.mainTimer) els.mainTimer.textContent = mmss(rem);
    updateArc(rem, st.phase);
  }

  els.startBtn.disabled = st.running || st.completed;
  els.pauseBtn.disabled = !st.running;
  els.skipBtn.disabled  = st.completed;
}

/* ---- rAF loop ---- */
function loop() {
  rafId = requestAnimationFrame(loop);

  if (!st.running || st.completed) {
    render();
    return;
  }

  const rem = phaseRemaining();

  // Beeps: last 5 seconds of HOLD and REST
  if ((st.phase === "HOLD" || st.phase === "REST") && rem > 0 && rem <= 5) {
    const at = Math.ceil(rem);
    if (at !== st.lastBeepAt) {
      st.lastBeepAt = at;
      beep(st.phase === "HOLD" ? 1000 : 800, 150);
    }
  }

  // Soft tick during PREP countdown
  if (st.phase === "PREP" && rem > 0) {
    const at = Math.ceil(rem);
    if (at !== st.lastBeepAt) {
      st.lastBeepAt = at;
      beep(600, 60, 0.07);
    }
  }

  render();

  if (rem <= 0) advancePhase();
}

/* ---- Phase transitions ---- */
function beginPhase(phase, duration) {
  st.phase = phase;
  st.phaseDuration = duration;
  st.phaseElapsedPaused = 0;
  st.lastBeepAt = -1;
  st.phaseStartTs = st.running ? performance.now() : null;
}

function advancePhase() {
  const { hold, rest, rounds, includeRest } = settings();

  if (st.phase === "PREP") {
    beginPhase("HOLD", hold);
    return;
  }

  if (st.phase === "HOLD") {
    st.completedSec += hold;
    const isLast = st.round === rounds && st.stepIndex === ROUTINE.length - 1;
    if (isLast) { finishSession(); return; }
    if (!includeRest || rest === 0) { nextExercise(hold, rounds); return; }
    beginPhase("REST", rest);
    return;
  }

  if (st.phase === "REST") {
    st.completedSec += rest;
    nextExercise(hold, rounds);
  }
}

function nextExercise(hold, rounds) {
  st.stepsCompleted += 1;
  if (st.stepIndex < ROUTINE.length - 1) {
    st.stepIndex += 1;
  } else {
    st.roundsCompleted = Math.max(st.roundsCompleted, st.round);
    if (st.round < rounds) {
      st.round += 1;
      st.stepIndex = 0;
    } else {
      finishSession();
      return;
    }
  }
  beginPhase("PREP", PREP_SEC);
}

function finishSession() {
  st.completed = true;
  st.running = false;
  st.phase = "DONE";
  beep(1200, 180);
  setTimeout(() => beep(1400, 180), 220);
  setTimeout(() => beep(1600, 220), 480);
}

/* ---- Controls ---- */
function start() {
  if (st.running || st.completed) return;
  ensureAudio();
  st.running = true;
  if (st.phase === "IDLE") {
    beginPhase("PREP", PREP_SEC);
  } else {
    // Resume: restart phase clock from where we paused
    st.phaseStartTs = performance.now();
  }
}

function pause() {
  if (!st.running) return;
  st.phaseElapsedPaused = phaseElapsed();
  st.phaseStartTs = null;
  st.running = false;
}

function reset() {
  const { hold } = settings();
  st.running = false;
  st.phase = "IDLE";
  st.round = 1; st.stepIndex = 0;
  st.phaseDuration = hold;
  st.phaseStartTs = null; st.phaseElapsedPaused = 0;
  st.completedSec = 0;
  st.stepsCompleted = 0; st.roundsCompleted = 0; st.completed = false;
  st.lastBeepAt = -1;
  renderExerciseList();
}

function skip() {
  if (st.completed) return;
  const wasRunning = st.running;
  const { hold, rest, rounds, includeRest } = settings();

  // Add partial elapsed time for billable phases
  if (st.phase === "HOLD") {
    st.completedSec += phaseElapsed();
    const isLast = st.round === rounds && st.stepIndex === ROUTINE.length - 1;
    if (isLast) { finishSession(); return; }
    if (!includeRest || rest === 0) { nextExercise(hold, rounds); }
    else { beginPhase("REST", rest); }
  } else if (st.phase === "REST") {
    st.completedSec += phaseElapsed();
    nextExercise(hold, rounds);
  } else {
    // PREP or IDLE: just advance
    advancePhase();
  }

  // If we were paused, stay paused in the new phase
  if (!wasRunning && !st.completed) {
    st.running = false;
    st.phaseStartTs = null;
  }
}

/* ---- Exercise list ---- */
function renderExerciseList() {
  if (!els.exerciseList) return;
  els.exerciseList.innerHTML = "";
  ROUTINE.forEach((ex) => {
    const li = document.createElement("li");
    li.textContent = ex.name;
    els.exerciseList.appendChild(li);
  });
}

/* ---- Save to Google Sheet ---- */
function setSaveBtn(mode, msg) {
  if (!els.saveSessionBtn) return;
  const def = "Save session to Google Sheet";
  if (mode === "saving") {
    els.saveSessionBtn.disabled = true;
    els.saveSessionBtn.textContent = msg || "Saving…";
    return;
  }
  if (mode === "ok") {
    els.saveSessionBtn.disabled = false;
    els.saveSessionBtn.textContent = msg || "Saved ✅";
    setTimeout(() => { els.saveSessionBtn.textContent = def; }, 1800);
    return;
  }
  if (mode === "error") {
    els.saveSessionBtn.disabled = false;
    els.saveSessionBtn.textContent = msg || "Save failed — try again";
    setTimeout(() => { els.saveSessionBtn.textContent = def; }, 2400);
    return;
  }
  els.saveSessionBtn.disabled = false;
  els.saveSessionBtn.textContent = def;
}

async function saveSession() {
  if (!EXEC_URL || EXEC_URL.includes("PASTE_YOUR")) {
    setSaveBtn("error", "Set EXEC_URL in app.js first");
    return;
  }
  setSaveBtn("saving");
  const s = settings();
  const payload = {
    type: "iso_session",
    timestamp_iso: new Date().toISOString(),
    level: s.level,
    hold_sec: s.hold,
    rest_sec: s.rest,
    include_rest: s.includeRest,
    rounds_planned: s.rounds,
    rounds_completed: st.roundsCompleted,
    steps_completed: st.stepsCompleted,
    total_sec_planned: plannedTotal(),
    total_sec_actual: Math.round(st.completedSec),
    completed: st.completed,
    notes: s.notes,
  };
  try {
    const res = await fetch(EXEC_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    if (!res.ok) { setSaveBtn("error", `Save failed (${res.status})`); return; }
    setSaveBtn("ok");
  } catch (err) {
    console.warn(err);
    setSaveBtn("error", "Save failed — offline?");
  }
}

/* ---- Settings change handlers ---- */
function applyPreset() {
  const lv = els.level?.value || "intermediate";
  const p  = LEVEL_PRESETS[lv] || LEVEL_PRESETS.intermediate;
  if (els.holdSeconds) els.holdSeconds.value = p.hold;
  if (els.restSeconds) els.restSeconds.value = p.rest;
  if (!st.running && !st.completed && st.phase === "IDLE") {
    st.phaseDuration = p.hold;
  }
}

/* ---- Init ---- */
document.addEventListener("DOMContentLoaded", () => {
  renderExerciseList();
  reset();

  // Start the continuous rAF loop
  rafId = requestAnimationFrame(loop);

  els.startBtn?.addEventListener("click",  (e) => { e.preventDefault(); start(); });
  els.pauseBtn?.addEventListener("click",  (e) => { e.preventDefault(); pause(); });
  els.resetBtn?.addEventListener("click",  (e) => { e.preventDefault(); reset(); });
  els.skipBtn?.addEventListener("click",   (e) => { e.preventDefault(); skip(); });
  els.saveSessionBtn?.addEventListener("click", (e) => { e.preventDefault(); saveSession(); });

  els.level?.addEventListener("change", applyPreset);
  els.holdSeconds?.addEventListener("input", () => {});
  els.restSeconds?.addEventListener("input", () => {});
  els.rounds?.addEventListener("input", () => {});
  els.includeRest?.addEventListener("change", () => {});

  setSaveBtn("idle");
});
