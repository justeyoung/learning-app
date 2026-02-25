// interval1.js — Japanese Interval Walking (3-min phases) + mp3 cues + 5s beep + skip
// Audio files live in: /assets/audio/
// This JS lives in:     /assets/js/
// So audio paths use:   ../audio/<file>

const PHASE_LEN = 180; // seconds (3 minutes)

const plan = [
  { name: "Warm-up",  type: "warm", secs: PHASE_LEN, audio: "../audio/Warm_up.mp3" },
  { name: "Fast",     type: "fast", secs: PHASE_LEN, audio: "../audio/Walk_faster.mp3" },
  { name: "Slow",     type: "slow", secs: PHASE_LEN, audio: "../audio/Walk_slowly.mp3" },
  { name: "Fast",     type: "fast", secs: PHASE_LEN, audio: "../audio/Walk_faster.mp3" },
  { name: "Slow",     type: "slow", secs: PHASE_LEN, audio: "../audio/Walk_slowly.mp3" },
  { name: "Fast",     type: "fast", secs: PHASE_LEN, audio: "../audio/Walk_faster.mp3" },
  { name: "Slow",     type: "slow", secs: PHASE_LEN, audio: "../audio/Walk_slowly.mp3" },
  { name: "Fast",     type: "fast", secs: PHASE_LEN, audio: "../audio/Walk_faster.mp3" },
  { name: "Slow",     type: "slow", secs: PHASE_LEN, audio: "../audio/Walk_slowly.mp3" },
  { name: "Cool-down",type: "cool", secs: PHASE_LEN, audio: "../audio/Cool_down.mp3" },
];

const celebrationSrc = "../audio/celebration.mp3";
const totalSecs = plan.reduce((s, p) => s + p.secs, 0);

// --- DOM helpers ---
const $ = (id) => document.getElementById(id);

const phaseLabel = $("phaseLabel");
const timeLabel = $("timeLabel");
const overallPct = $("overallPct");
const sinceStartEl = $("sinceStart");
const nextPhaseEl = $("nextPhase");
const timeLeftEl = $("timeLeft");
const segBar = $("segBar");
const overallFill = $("overall-fill");
const statusMsg = $("statusMsg");
const wheelProgress = $("wheelProgress");

const startBtn = $("startBtn");
const pauseBtn = $("pauseBtn");
const resetBtn = $("resetBtn");
const skipBtn = $("skipBtn");

// --- Build segments once ---
function buildSegments() {
  if (!segBar) return;
  segBar.innerHTML = "";
  plan.forEach((p, i) => {
    const seg = document.createElement("div");
    seg.className = "seg";
    seg.dataset.type = p.type;
    seg.dataset.idx = String(i);
    segBar.appendChild(seg);
  });
}
buildSegments();

// --- State ---
let stepIndex = 0;
let phaseElapsed = 0;   // seconds elapsed in current phase
let workoutElapsed = 0; // seconds since workout start (excluding paused)
let running = false;
let rafId = null;
let lastTs = null;

// --- Web Audio beep (Spotify-friendly) ---
let audioCtx = null;
function ensureAudioCtx() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      audioCtx = null;
    }
  }
}
function beepShort(freq = 900, dur = 0.08, vol = 0.15) {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.frequency.value = freq;
  o.type = "sine";
  g.gain.value = vol;
  o.connect(g).connect(audioCtx.destination);
  o.start(t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.stop(t + dur + 0.02);
}

// --- MP3 cues (reuse single Audio element for reliability) ---
const cue = new Audio();
cue.preload = "auto";
cue.volume = 0.9;

function playMp3(src) {
  if (!src) return;
  try {
    // Reset source each time
    if (cue.src !== src) cue.src = src;
    cue.currentTime = 0;
    cue.play().catch((err) => console.warn("Audio play error:", err));
  } catch (e) {
    console.warn("Audio init error:", e);
  }
}

function playPhaseCue(step) {
  playMp3(step?.audio);
}
function playCelebration() {
  playMp3(celebrationSrc);
}

// Prime audio on first user gesture (important for iOS)
let primed = false;
function primeAudio() {
  if (primed) return;
  primed = true;

  ensureAudioCtx();
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }

  // Quiet warm-up play/pause so later playback is allowed
  try {
    const a = new Audio(celebrationSrc);
    a.volume = 0.01;
    a.play()
      .then(() => {
        a.pause();
        a.currentTime = 0;
      })
      .catch(() => {});
  } catch {}
}

// --- Utilities ---
function fmtMMSS(sec) {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function setPhaseColors(type) {
  const colors = {
    warm: "#ffa043",
    fast: "#ff2d55",
    slow: "#4da3ff",
    cool: "#34d399",
  };
  if (wheelProgress) wheelProgress.setAttribute("stroke", colors[type] || "#00bcd4");
}

function updateUI() {
  const step = plan[stepIndex] || plan[plan.length - 1];

  if (phaseLabel) phaseLabel.textContent = step.name;
  if (timeLabel) timeLabel.textContent = fmtMMSS(step.secs - phaseElapsed);

  if (segBar) {
    const children = segBar.children;
    for (let i = 0; i < children.length; i++) {
      children[i].classList.toggle("done", i < stepIndex);
    }
  }

  const next = plan[stepIndex + 1];
  if (nextPhaseEl) nextPhaseEl.textContent = next ? next.name : "—";

  const pctVal = Math.floor((workoutElapsed / totalSecs) * 100);
  const pct = Math.min(100, Math.max(0, pctVal));
  if (overallPct) overallPct.textContent = `${pct}%`;
  if (overallFill) overallFill.style.width = `${pct}%`;

  if (sinceStartEl) sinceStartEl.textContent = fmtMMSS(workoutElapsed);
  if (timeLeftEl) timeLeftEl.textContent = fmtMMSS(totalSecs - workoutElapsed);

  if (wheelProgress) {
    const r = 110;
    const C = 2 * Math.PI * r;
    const ratio = Math.min(1, Math.max(0, phaseElapsed / step.secs));
    wheelProgress.style.strokeDasharray = `${C}`;
    wheelProgress.style.strokeDashoffset = `${C * (1 - ratio)}`;
  }
}

// --- Phase transitions ---
let lastBeepSecond = null;

function advancePhase() {
  if (segBar) {
    const currentSeg = segBar.children[stepIndex];
    if (currentSeg) currentSeg.classList.add("done");
  }

  stepIndex += 1;
  phaseElapsed = 0;
  lastBeepSecond = null;

  if (stepIndex >= plan.length) {
    // Finished
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;

    if (statusMsg) statusMsg.textContent = "Workout complete!";
    startBtn?.classList.remove("active");
    pauseBtn?.classList.remove("active");

    playCelebration();
    updateUI();
    return true;
  }

  const next = plan[stepIndex];
  setPhaseColors(next.type);
  if (statusMsg) statusMsg.textContent = `${next.name}!`;
  playPhaseCue(next);
  return false;
}

function tick(ts) {
  if (!running) return;
  if (!lastTs) lastTs = ts;

  const dt = (ts - lastTs) / 1000;
  lastTs = ts;

  phaseElapsed += dt;
  workoutElapsed += dt;

  const step = plan[stepIndex];

  // last 5-second countdown beep (once per second)
  const remaining = Math.ceil(step.secs - phaseElapsed);
  if (remaining <= 5 && remaining > 0) {
    const secNow = Math.floor(phaseElapsed);
    if (secNow !== lastBeepSecond) {
      lastBeepSecond = secNow;
      beepShort(remaining === 1 ? 1200 : 900);
    }
  }

  if (phaseElapsed >= step.secs) {
    const done = advancePhase();
    if (done) return;
  }

  updateUI();
  rafId = requestAnimationFrame(tick);
}

// --- Controls ---
function startWorkout() {
  primeAudio();
  if (running) return;

  ensureAudioCtx();
  running = true;
  lastTs = null;
  lastBeepSecond = null;

  if (statusMsg) statusMsg.textContent = "";
  startBtn?.classList.add("active");
  pauseBtn?.classList.remove("active");

  setPhaseColors(plan[stepIndex].type);
  playPhaseCue(plan[stepIndex]); // cue at start
  rafId = requestAnimationFrame(tick);
}

function pauseWorkout() {
  if (!running) return;

  running = false;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;

  pauseBtn?.classList.add("active");
  startBtn?.classList.remove("active");
  if (statusMsg) statusMsg.textContent = "Paused";
}

function resetWorkout() {
  running = false;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;

  stepIndex = 0;
  phaseElapsed = 0;
  workoutElapsed = 0;
  lastTs = null;
  lastBeepSecond = null;

  if (statusMsg) statusMsg.textContent = "";

  if (segBar) Array.from(segBar.children).forEach((el) => el.classList.remove("done"));
  startBtn?.classList.remove("active");
  pauseBtn?.classList.remove("active");

  setPhaseColors(plan[0].type);
  updateUI();
}

function skipPhase() {
  primeAudio();
  // Advance immediately whether running or not
  const done = advancePhase();
  if (!done) updateUI();
}

// --- Wire up ---
document.addEventListener("DOMContentLoaded", () => {
  if (segBar && !segBar.children.length) buildSegments();
  setPhaseColors(plan[0].type);
  updateUI();

  startBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    startWorkout();
  });
  pauseBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    pauseWorkout();
  });
  resetBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    resetWorkout();
  });
  skipBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    skipPhase();
  });

  window.addEventListener("touchstart", primeAudio, { once: true });
});

// Optional exports
window.startWorkout = startWorkout;
window.pauseWorkout = pauseWorkout;
window.resetWorkout = resetWorkout;
window.skipPhase = skipPhase;