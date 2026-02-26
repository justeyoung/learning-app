// BP Isometric Protocol — app.js
// Fixed 7 exercises, 1–3 rounds (default 2), total time + time left,
// session + phase progress bars, toggle steps list, sound cues,
// save to Google Sheet (iso_sessions) via Apps Script.

const EXEC_URL = "https://script.google.com/macros/s/AKfycbx0cyqzKTaV3NIlZOfFxVKMHa5uWlebH-znDcJbbhPLlC4D0_3CSVOL0Ific-CLKtir/exec";

const EXERCISES = [
  "Wall Sit",
  "Handgrip Right",
  "Handgrip Left",
  "Forearm Plank",
  "Split Squat Right",
  "Split Squat Left",
  "Glute Bridge",
];

const PRESETS = {
  Beginner: { hold: 45, rest: 60 },
  Intermediate: { hold: 75, rest: 75 },
  Advanced: { hold: 120, rest: 90 },
  Custom: null,
};

const $ = (id) => document.getElementById(id);

const els = {
  level: $("level"),
  holdSec: $("holdSec"),
  restSec: $("restSec"),
  rounds: $("rounds"),
  soundOn: $("soundOn"),
  autoRest: $("autoRest"),

  totalTime: $("totalTime"),
  timeLeft: $("timeLeft"),
  sessionBar: $("sessionBar"),

  metaLine: $("metaLine"),
  exerciseName: $("exerciseName"),
  phaseName: $("phaseName"),
  phaseTimer: $("phaseTimer"),
  phaseBar: $("phaseBar"),
  breathCue: $("breathCue"),

  startBtn: $("startBtn"),
  pauseBtn: $("pauseBtn"),
  resetBtn: $("resetBtn"),
  skipBtn: $("skipBtn"),

  stepsList: $("stepsList"),

  notes: $("notes"),
  saveBtn: $("saveBtn"),
  saveStatus: $("saveStatus"),
};

// ---------- Audio (soft beeps + chime) ----------
let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}
function tone(freq = 880, dur = 0.08, vol = 0.08) {
  if (!els.soundOn.checked) return;
  ensureAudio();
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = "sine";
  o.frequency.value = freq;
  g.gain.value = vol;
  o.connect(g).connect(audioCtx.destination);
  o.start(t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.stop(t + dur + 0.02);
}
function beepCountdown(n) {
  // n=5..1 (slightly rising)
  const base = 820;
  tone(base + (5 - n) * 60, 0.07, 0.07);
}
function chime() {
  // gentle two-tone
  tone(660, 0.08, 0.06);
  setTimeout(() => tone(990, 0.10, 0.06), 120);
}

// unlock audio on first user gesture
window.addEventListener("pointerdown", () => {
  if (!els.soundOn.checked) return;
  ensureAudio();
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
}, { once: true });

// ---------- Time helpers ----------
function pad2(n) { return String(n).padStart(2, "0"); }
function fmtMMSS(sec) {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${pad2(m)}:${pad2(s)}`;
}
function isoNow() {
  return new Date().toISOString();
}
function dateNow() {
  return new Date().toISOString().slice(0, 10);
}
function timeNow() {
  return new Date().toISOString().slice(11, 16);
}
function uid() {
  return (crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`);
}

// ---------- Session model ----------
/**
 * We create a timeline of phases:
 * For each exercise step:
 *   HOLD (holdSec)
 *   REST (restSec) except after final step of final round if autoRest=false or end-of-session
 */
const PHASE = {
  READY: "READY",
  HOLD: "HOLD",
  REST: "REST",
  DONE: "DONE",
};

let timerId = null;

let session = {
  running: false,
  startedAtMs: null,

  level: "Intermediate",
  holdSec: 75,
  restSec: 75,
  roundsPlanned: 2,

  // timeline
  phases: [], // [{ round, stepIndex, exercise, phase, durSec }]
  phaseIndex: 0,

  phaseLeft: 0,           // seconds left in current phase
  totalPlanned: 0,        // seconds
  totalElapsed: 0,        // seconds elapsed while running
  totalLeft: 0,           // seconds
  completed: false,

  // progress counts
  roundsCompleted: 0,
  stepsCompleted: 0,
};

function readInputs() {
  const level = els.level.value;
  const holdSec = clampInt(els.holdSec.value, 10, 240, 75);
  const restSec = clampInt(els.restSec.value, 10, 240, 75);
  const rounds = clampInt(els.rounds.value, 1, 3, 2);
  return { level, holdSec, restSec, rounds };
}

function clampInt(v, min, max, fallback) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function buildTimeline({ holdSec, restSec, rounds }) {
  const includeRest = els.autoRest.checked;
  const phases = [];

  for (let r = 1; r <= rounds; r++) {
    for (let i = 0; i < EXERCISES.length; i++) {
      phases.push({
        round: r,
        stepIndex: i,
        exercise: EXERCISES[i],
        phase: PHASE.HOLD,
        durSec: holdSec,
      });

      // rest between holds (optional), but never after final step of final round
      const isLast = (r === rounds && i === EXERCISES.length - 1);
      if (includeRest && !isLast) {
        phases.push({
          round: r,
          stepIndex: i,
          exercise: EXERCISES[i],
          phase: PHASE.REST,
          durSec: restSec,
        });
      }
    }
  }

  const totalPlanned = phases.reduce((s, p) => s + p.durSec, 0);
  return { phases, totalPlanned };
}

function rebuildFromInputs() {
  const { level, holdSec, restSec, rounds } = readInputs();

  session.level = level;
  session.holdSec = holdSec;
  session.restSec = restSec;
  session.roundsPlanned = rounds;

  const { phases, totalPlanned } = buildTimeline({ holdSec, restSec, rounds });
  session.phases = phases;
  session.totalPlanned = totalPlanned;

  // reset preview state (not running)
  if (!session.running) {
    session.phaseIndex = 0;
    session.phaseLeft = phases[0]?.durSec || 0;
    session.totalElapsed = 0;
    session.totalLeft = totalPlanned;
    session.completed = false;
    session.roundsCompleted = 0;
    session.stepsCompleted = 0;
  }

  render();
}

function currentPhase() {
  return session.phases[session.phaseIndex] || null;
}

// ---------- UI: steps list ----------
function renderStepsList() {
  const p = currentPhase();
  const activeStep = p ? p.stepIndex : 0;

  // determine completed steps in total run
  // we track stepsCompleted as "holds completed" count of exercises, not rests
  // For list, mark done if we have progressed beyond step in current round *and* within overall.
  // Simpler: if phaseIndex has passed the HOLD phase of that step in current round.
  // We'll compute "current hold count completed" from phaseIndex.
  const completedHoldCount = countCompletedHolds();

  // Build list just 7 items (not repeats across rounds)
  els.stepsList.innerHTML = "";
  EXERCISES.forEach((name, i) => {
    const li = document.createElement("li");
    li.textContent = name;

    // Active = the current step index (during hold/rest)
    if (i === activeStep && !session.completed) li.classList.add("active");

    // Done = if at least i+1 holds have been completed in current round when in round 1,
    // but across rounds this gets tricky. Keep it simple: mark done if overall holds completed
    // has reached at least (currentRound-1)*7 + (i+1) when in that round.
    const cur = currentPhase();
    const curRound = cur ? cur.round : 1;
    const needed = (curRound - 1) * EXERCISES.length + (i + 1);
    if (completedHoldCount >= needed) li.classList.add("done");

    els.stepsList.appendChild(li);
  });
}

function countCompletedHolds() {
  // Count how many HOLD phases are fully completed based on phaseIndex & phaseLeft
  // All phases before current phase are completed.
  const donePhases = session.phases.slice(0, session.phaseIndex);
  return donePhases.filter(p => p.phase === PHASE.HOLD).length;
}

// ---------- Rendering ----------
function setStatus(msg, kind = "") {
  els.saveStatus.textContent = msg || "";
  els.saveStatus.className = "status" + (kind ? ` ${kind}` : "");
}

function render() {
  const p = currentPhase();

  els.totalTime.textContent = fmtMMSS(session.totalPlanned);
  els.timeLeft.textContent = fmtMMSS(session.totalLeft);

  // session bar
  const ratio = session.totalPlanned > 0 ? (session.totalElapsed / session.totalPlanned) : 0;
  els.sessionBar.style.width = `${Math.max(0, Math.min(100, ratio * 100))}%`;

  if (!p) {
    els.metaLine.textContent = `Round 0 of ${session.roundsPlanned} · Exercise 0 of 7`;
    els.exerciseName.textContent = "—";
    els.phaseName.textContent = PHASE.DONE;
    els.phaseTimer.textContent = "00:00";
    els.phaseBar.style.width = "100%";
    return;
  }

  els.metaLine.textContent = `Round ${p.round} of ${session.roundsPlanned} · Exercise ${p.stepIndex + 1} of 7`;
  els.exerciseName.textContent = p.exercise;
  els.phaseName.textContent = session.completed ? PHASE.DONE : p.phase;
  els.phaseTimer.textContent = fmtMMSS(session.phaseLeft);

  // phase bar (0..100)
  const phaseDur = p.durSec || 1;
  const phaseDone = phaseDur - session.phaseLeft;
  const phaseRatio = phaseDone / phaseDur;
  els.phaseBar.style.width = `${Math.max(0, Math.min(100, phaseRatio * 100))}%`;

  // Breath cue (simple)
  els.breathCue.textContent =
    p.phase === PHASE.HOLD
      ? "Steady breathing. Long exhale on the effort."
      : p.phase === PHASE.REST
        ? "Recover. Breathe slow and easy."
        : "Breathe steadily. Don’t hold your breath.";

  // Buttons
  els.startBtn.disabled = session.running || session.completed;
  els.pauseBtn.disabled = !session.running;
  els.resetBtn.disabled = false;
  els.skipBtn.disabled = session.completed;

  renderStepsList();
}

// ---------- Engine ----------
function start() {
  if (session.running || session.completed) return;

  // if READY state (fresh), ensure timeline exists
  if (!session.phases.length) rebuildFromInputs();

  session.running = true;
  session.startedAtMs = session.startedAtMs ?? Date.now();
  setStatus("");

  timerId = setInterval(tick, 1000);
  render();
}

function pause() {
  if (!session.running) return;
  session.running = false;
  if (timerId) clearInterval(timerId);
  timerId = null;
  render();
}

function reset() {
  if (timerId) clearInterval(timerId);
  timerId = null;

  session.running = false;
  session.startedAtMs = null;

  rebuildFromInputs(); // rebuild and reset preview
  setStatus("");
}

function skip() {
  if (session.completed) return;
  // End current phase immediately
  session.phaseLeft = 0;
  advancePhase(true);
  render();
}

function tick() {
  if (!session.running || session.completed) return;

  session.phaseLeft -= 1;
  session.totalElapsed += 1;
  session.totalLeft = Math.max(0, session.totalPlanned - session.totalElapsed);

  const p = currentPhase();
  if (p && p.phase === PHASE.HOLD) {
    // last 5 seconds countdown beeps
    if (session.phaseLeft > 0 && session.phaseLeft <= 5) {
      beepCountdown(session.phaseLeft);
    }
  }

  if (session.phaseLeft <= 0) {
    advancePhase(false);
  }

  render();
}

function advancePhase(fromSkip) {
  const p = currentPhase();
  if (!p) return;

  // If we just finished a HOLD, count a completed step
  if (p.phase === PHASE.HOLD) {
    session.stepsCompleted += 1;
  }

  // Move to next phase
  session.phaseIndex += 1;

  // Phase change chime (not on skip spam)
  if (!fromSkip) chime();

  if (session.phaseIndex >= session.phases.length) {
    // done
    finish(true);
    return;
  }

  const next = currentPhase();
  session.phaseLeft = next.durSec;

  // update rounds completed (when a round's last HOLD is completed)
  if (p.phase === PHASE.HOLD && p.stepIndex === EXERCISES.length - 1) {
    session.roundsCompleted = p.round;
  }
}

function finish(completed) {
  if (timerId) clearInterval(timerId);
  timerId = null;

  session.running = false;
  session.completed = completed;
  session.totalLeft = 0;

  // Make sure roundsCompleted is correct
  const holdsTotal = session.roundsPlanned * EXERCISES.length;
  if (session.stepsCompleted >= holdsTotal) session.roundsCompleted = session.roundsPlanned;

  render();
}

// ---------- Save to Google Sheet ----------
async function saveSession() {
  if (!EXEC_URL || EXEC_URL.includes("PASTE_YOUR_EXEC_URL_HERE")) {
    setStatus("Set EXEC_URL in app.js first.", "err");
    return;
  }

  // If user hasn't run it, allow saving as not completed
  const holdsTotal = session.roundsPlanned * EXERCISES.length;
  const totalSecActual = session.totalElapsed;

  const payload = {
    type: "iso_session",
    timestamp_iso: isoNow(),
    date: dateNow(),
    time: timeNow(),
    session_id: uid(),

    level: session.level,
    hold_sec: session.holdSec,
    rest_sec: session.restSec,

    rounds_planned: session.roundsPlanned,
    rounds_completed: session.roundsCompleted,

    steps_completed: session.stepsCompleted,

    total_sec_planned: session.totalPlanned,
    total_sec_actual: totalSecActual,

    completed: session.stepsCompleted >= holdsTotal && session.completed === true,
    notes: (els.notes.value || "").trim(),
  };

  // UX: disable button + show progress
  els.saveBtn.disabled = true;
  setStatus("Saving…");

  try {
    const res = await fetch(EXEC_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });

    // Apps Script may return HTML if it redirects; so we don't rely on JSON parsing only.
    const txt = await res.text();

    // Heuristic: if it contains '"ok":true' we call it success, otherwise still may have succeeded.
    if (txt.includes('"ok":true') || res.ok) {
      setStatus("Saved ✅", "ok");
    } else {
      setStatus("Saved? Check Sheet (response unusual).", "err");
    }
  } catch (e) {
    setStatus("Save failed. Check connection / URL.", "err");
  } finally {
    els.saveBtn.disabled = false;
  }
}

// ---------- Presets ----------
function applyPreset(level) {
  const p = PRESETS[level];
  if (!p) return; // Custom
  els.holdSec.value = String(p.hold);
  els.restSec.value = String(p.rest);
}

// ---------- Wire up ----------
function selectAllOnFocus(e) {
  // make it easy to type over numbers
  e.target.select?.();
}

els.holdSec.addEventListener("focus", selectAllOnFocus);
els.restSec.addEventListener("focus", selectAllOnFocus);
els.rounds.addEventListener("focus", selectAllOnFocus);

els.level.addEventListener("change", () => {
  const level = els.level.value;
  if (level !== "Custom") applyPreset(level);
  rebuildFromInputs();
});

["input", "change"].forEach((evt) => {
  els.holdSec.addEventListener(evt, () => { els.level.value = "Custom"; rebuildFromInputs(); });
  els.restSec.addEventListener(evt, () => { els.level.value = "Custom"; rebuildFromInputs(); });
  els.rounds.addEventListener(evt, () => rebuildFromInputs());
  els.autoRest.addEventListener(evt, () => rebuildFromInputs());
});

els.startBtn.addEventListener("click", (e) => { e.preventDefault(); start(); });
els.pauseBtn.addEventListener("click", (e) => { e.preventDefault(); pause(); });
els.resetBtn.addEventListener("click", (e) => { e.preventDefault(); reset(); });
els.skipBtn.addEventListener("click", (e) => { e.preventDefault(); skip(); });

els.saveBtn.addEventListener("click", (e) => { e.preventDefault(); saveSession(); });

// Init
(function init() {
  // Build initial steps list (static)
  rebuildFromInputs();
})();