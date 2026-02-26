/* ======================================
   BP Isometric Protocol – app.js
   7 exercises · configurable hold/rest · rounds
   One toggle: include rest between phases
   Saves session to Google Sheet via Apps Script Web App
   ====================================== */

/* ========= CONFIG: put your Apps Script URL here ========= */
const EXEC_URL = "https://script.google.com/macros/s/AKfycbx0cyqzKTaV3NIlZOfFxVKMHa5uWlebH-znDcJbbhPLlC4D0_3CSVOL0Ific-CLKtir/exec";

/* ========= Fixed routine (7 steps) ========= */
const ROUTINE = [
  { key: "wall_sit", name: "Wall Sit" },
  { key: "handgrip_1", name: "Handgrip Hold" },
  { key: "plank", name: "Forearm Plank" },
  { key: "split_left", name: "Split Squat (Left)" },
  { key: "split_right", name: "Split Squat (Right)" },
  { key: "glute_bridge", name: "Glute Bridge" },
  { key: "handgrip_2", name: "Handgrip Hold" },
];

/* ========= Level presets ========= */
const LEVEL_PRESETS = {
  beginner: { hold: 45, rest: 60 },
  intermediate: { hold: 75, rest: 75 },
  advanced: { hold: 120, rest: 90 },
};

/* ========= DOM ========= */
const $ = (id) => document.getElementById(id);

const els = {
  // settings
  level: $("level"),
  holdSeconds: $("holdSeconds"),
  restSeconds: $("restSeconds"),
  rounds: $("rounds"),
  includeRest: $("includeRest"),
  notes: $("notes"),

  // ui
  totalTime: $("totalTime"),
  timeLeft: $("timeLeft"),
  roundInfo: $("roundInfo"),
  exerciseName: $("exerciseName"),
  phaseLabel: $("phaseLabel"),
  mainTimer: $("mainTimer"),
  exerciseList: $("exerciseList"),

  // buttons
  startBtn: $("startBtn"),
  pauseBtn: $("pauseBtn"),
  resetBtn: $("resetBtn"),
  skipBtn: $("skipBtn"),
  saveSessionBtn: $("saveSessionBtn"),
};

/* ========= State ========= */
let tickId = null;

const state = {
  running: false,
  startedAtMs: null, // when session started
  elapsedSec: 0,     // actual elapsed (counts time passing while running)
  // session structure
  round: 1,
  stepIndex: 0,      // 0..6
  phase: "HOLD",     // HOLD | REST | DONE
  leftSec: 0,        // seconds left in current phase
  // bookkeeping
  stepsCompleted: 0,
  roundsCompleted: 0,
  completed: false,
};

/* ========= Helpers ========= */
function clampInt(v, min, max, fallback) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function fmtMMSS(totalSec) {
  totalSec = Math.max(0, Math.round(totalSec));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${pad2(m)}:${pad2(s)}`;
}

function readSettings() {
  const level = els.level?.value || "intermediate";
  const hold = clampInt(els.holdSeconds?.value, 10, 300, LEVEL_PRESETS[level].hold);
  const rest = clampInt(els.restSeconds?.value, 0, 300, LEVEL_PRESETS[level].rest);
  const rounds = clampInt(els.rounds?.value, 1, 3, 2);
  const includeRest = !!els.includeRest?.checked;
  const notes = (els.notes?.value || "").trim();

  return { level, hold, rest, rounds, includeRest, notes };
}

/* Compute planned total seconds based on settings */
function computePlannedTotalSec() {
  const { hold, rest, rounds, includeRest } = readSettings();
  const stepsPerRound = ROUTINE.length;
  const holdTotal = rounds * stepsPerRound * hold;

  if (!includeRest || rest === 0) return holdTotal;

  // rest happens after each hold EXCEPT after the very last hold of the entire session
  const totalHolds = rounds * stepsPerRound;
  const restCount = Math.max(0, totalHolds - 1);
  return holdTotal + restCount * rest;
}

function setButtons() {
  els.startBtn.disabled = state.running || state.completed;
  els.pauseBtn.disabled = !state.running;
  // reset always available
  els.skipBtn.disabled = state.completed;
}

function renderExerciseList() {
  if (!els.exerciseList) return;
  els.exerciseList.innerHTML = "";
  ROUTINE.forEach((ex, idx) => {
    const li = document.createElement("li");
    li.textContent = ex.name;
    if (idx < state.stepIndex || state.round > 1 && idx === ROUTINE.length - 1 && state.stepIndex === 0) {
      // keep simple; main indicator is header
    }
    els.exerciseList.appendChild(li);
  });
}

function render() {
  const { rounds } = readSettings();
  const plannedTotal = computePlannedTotalSec();
  const timeLeft = Math.max(0, plannedTotal - state.elapsedSec);

  if (els.totalTime) els.totalTime.textContent = fmtMMSS(plannedTotal);
  if (els.timeLeft) els.timeLeft.textContent = fmtMMSS(timeLeft);

  if (els.roundInfo) {
    const r = Math.min(state.round, rounds);
    const exNum = Math.min(state.stepIndex + 1, ROUTINE.length);
    els.roundInfo.textContent = `Round ${r} of ${rounds} · Exercise ${exNum} of ${ROUTINE.length}`;
  }

  const currentEx = ROUTINE[state.stepIndex] || ROUTINE[ROUTINE.length - 1];
  if (els.exerciseName) els.exerciseName.textContent = currentEx.name;

  if (els.phaseLabel) {
    els.phaseLabel.textContent = state.completed ? "DONE" : state.phase;
  }

  if (els.mainTimer) {
    els.mainTimer.textContent = fmtMMSS(state.leftSec);
  }

  setButtons();
}

/* ========= Phase engine ========= */
function initSessionFresh() {
  const { hold } = readSettings();
  state.running = false;
  state.startedAtMs = null;
  state.elapsedSec = 0;

  state.round = 1;
  state.stepIndex = 0;
  state.phase = "HOLD";
  state.leftSec = hold;

  state.stepsCompleted = 0;
  state.roundsCompleted = 0;
  state.completed = false;

  renderExerciseList();
  render();
}

function advancePhase() {
  const { hold, rest, rounds, includeRest } = readSettings();

  if (state.completed) return;

  // When HOLD ends
  if (state.phase === "HOLD") {
    // If rest disabled or rest=0: go directly to next hold
    if (!includeRest || rest === 0) {
      goNextHold(hold, rounds);
      return;
    }

    // Otherwise: go to REST (unless this was the last hold of entire session)
    const isLastHoldOfSession =
      state.round === rounds && state.stepIndex === ROUTINE.length - 1;

    if (isLastHoldOfSession) {
      finishSession();
      return;
    }

    state.phase = "REST";
    state.leftSec = rest;
    render();
    return;
  }

  // When REST ends -> next HOLD
  if (state.phase === "REST") {
    goNextHold(hold, rounds);
    return;
  }
}

function goNextHold(hold, rounds) {
  // Mark one exercise step completed
  state.stepsCompleted += 1;

  // Move to next exercise
  if (state.stepIndex < ROUTINE.length - 1) {
    state.stepIndex += 1;
    state.phase = "HOLD";
    state.leftSec = hold;
    render();
    return;
  }

  // End of round
  state.roundsCompleted = Math.max(state.roundsCompleted, state.round);
  if (state.round < rounds) {
    state.round += 1;
    state.stepIndex = 0;
    state.phase = "HOLD";
    state.leftSec = hold;
    render();
    return;
  }

  // End of session
  finishSession();
}

function finishSession() {
  state.completed = true;
  state.running = false;
  state.phase = "DONE";
  state.leftSec = 0;
  stopTick();
  render();
}

/* ========= Timer loop ========= */
function tick() {
  if (!state.running || state.completed) return;

  state.leftSec -= 1;
  state.elapsedSec += 1;

  if (state.leftSec <= 0) {
    advancePhase();
  }

  render();
}

function startTick() {
  if (tickId) return;
  tickId = setInterval(tick, 1000);
}

function stopTick() {
  if (!tickId) return;
  clearInterval(tickId);
  tickId = null;
}

/* ========= Controls ========= */
function start() {
  if (state.running || state.completed) return;
  state.running = true;
  if (!state.startedAtMs) state.startedAtMs = Date.now();
  startTick();
  render();
}

function pause() {
  if (!state.running) return;
  state.running = false;
  stopTick();
  render();
}

function reset() {
  stopTick();
  initSessionFresh();
}

function skip() {
  if (state.completed) return;

  // treat as finishing current phase immediately (counts no extra time)
  state.leftSec = 0;
  advancePhase();
  render();
}

/* ========= Save to Google Sheet ========= */
function setSaveButtonState(mode, msg) {
  // mode: idle | saving | ok | error
  if (!els.saveSessionBtn) return;

  if (mode === "saving") {
    els.saveSessionBtn.disabled = true;
    els.saveSessionBtn.textContent = msg || "Saving…";
    return;
  }

  if (mode === "ok") {
    els.saveSessionBtn.disabled = false;
    els.saveSessionBtn.textContent = msg || "Saved ✅";
    setTimeout(() => {
      els.saveSessionBtn.textContent = "Save session to Google Sheet";
    }, 1800);
    return;
  }

  if (mode === "error") {
    els.saveSessionBtn.disabled = false;
    els.saveSessionBtn.textContent = msg || "Save failed — try again";
    setTimeout(() => {
      els.saveSessionBtn.textContent = "Save session to Google Sheet";
    }, 2400);
    return;
  }

  // idle
  els.saveSessionBtn.disabled = false;
  els.saveSessionBtn.textContent = "Save session to Google Sheet";
}

function buildSessionPayload() {
  const s = readSettings();

  const plannedTotalSec = computePlannedTotalSec();
  const payload = {
    type: "iso_session",
    timestamp_iso: new Date().toISOString(),

    level: s.level,
    hold_sec: s.hold,
    rest_sec: s.rest,
    include_rest: s.includeRest,
    rounds_planned: s.rounds,

    rounds_completed: state.roundsCompleted,
    steps_completed: state.stepsCompleted,

    total_sec_planned: plannedTotalSec,
    total_sec_actual: state.elapsedSec,

    completed: state.completed,
    notes: s.notes,
  };

  return payload;
}

async function saveSession() {
  if (!EXEC_URL || EXEC_URL.includes("PASTE_YOUR_WEB_APP_EXEC_URL_HERE")) {
    setSaveButtonState("error", "Set EXEC_URL in app.js first");
    return;
  }

  setSaveButtonState("saving", "Saving…");

  const payload = buildSessionPayload();

  try {
    const res = await fetch(EXEC_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}

    if (!res.ok) {
      setSaveButtonState("error", `Save failed (${res.status})`);
      return;
    }

    if (json && json.ok) {
      setSaveButtonState("ok", "Saved ✅");
      return;
    }

    // some deployments return plain text or non-json even when successful
    setSaveButtonState("ok", "Saved ✅");
  } catch (err) {
    console.warn(err);
    setSaveButtonState("error", "Save failed — offline?");
  }
}

/* ========= Wiring ========= */
function applyPresetFromLevel() {
  const level = els.level?.value || "intermediate";
  const preset = LEVEL_PRESETS[level] || LEVEL_PRESETS.intermediate;

  // only set if fields exist
  if (els.holdSeconds) els.holdSeconds.value = String(preset.hold);
  if (els.restSeconds) els.restSeconds.value = String(preset.rest);

  // reset phase timer to match new hold if not running
  if (!state.running && !state.completed) {
    state.leftSec = preset.hold;
  }
  render();
}

function onSettingsChange() {
  // If user edits hold/rest/rounds or toggles rest:
  // - recalc planned total
  // - if not running, update leftSec to current phase baseline
  const { hold, rest, includeRest } = readSettings();

  if (!state.running && !state.completed) {
    if (state.phase === "HOLD") state.leftSec = hold;
    if (state.phase === "REST") state.leftSec = includeRest ? rest : hold;
  }

  render();
}

document.addEventListener("DOMContentLoaded", () => {
  // initial list render
  renderExerciseList();

  // init state using default values from HTML
  initSessionFresh();

  // bindings
  els.startBtn?.addEventListener("click", (e) => { e.preventDefault(); start(); });
  els.pauseBtn?.addEventListener("click", (e) => { e.preventDefault(); pause(); });
  els.resetBtn?.addEventListener("click", (e) => { e.preventDefault(); reset(); });
  els.skipBtn?.addEventListener("click", (e) => { e.preventDefault(); skip(); });

  els.saveSessionBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    saveSession();
  });

  // settings change hooks
  els.level?.addEventListener("change", applyPresetFromLevel);
  els.holdSeconds?.addEventListener("input", onSettingsChange);
  els.restSeconds?.addEventListener("input", onSettingsChange);
  els.rounds?.addEventListener("input", onSettingsChange);
  els.includeRest?.addEventListener("change", onSettingsChange);

  // default save button label
  setSaveButtonState("idle");
});