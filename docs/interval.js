// ===== Japanese Interval Walking (10s test + countdown beeps + Spotify-friendly) =====
const R = 110;
const CIRC = 2 * Math.PI * R;

/* ---- Config ---- */
const PHASE_LEN = 10;        // ← change to 180 (3 min) when ready
const COUNTDOWN_LAST_N = 5;  // last N seconds beep
const BEEP_VOL = 0.12;       // beep volume (0..1)
const BEEP_DUR_MS = 120;     // duration of one beep
const PHASE_ALARM = true;    // phase change sound (double-beep). Set false if you want silent transitions.

/* ---- State ---- */
let plan = [];
let stepIndex = 0;
let workoutActive = false;
let startTimestamp = null;
let elapsedBeforePause = 0;
let animationFrameId = null;
let totalSecs = 0;
let elapsedBeforeCurrentPhase = 0;
let lastBeepSecond = null;

/* ---- DOM helpers ---- */
const $ = (s) => document.querySelector(s);
const phaseLabel = () => $("#phaseLabel");
const timeLabel  = () => $("#timeLabel");
const statusMsg  = () => $("#statusMsg");
const arc        = () => document.querySelector(".progress");
const segBar     = () => $("#segBar");
const overallFill= () => $("#overall-fill");
const overallPct = () => $("#overallPct");
const sinceStart = () => $("#sinceStart");
const nextPhase  = () => $("#nextPhase");
const timeLeft   = () => $("#timeLeft");

/* ---- Colors from CSS vars ---- */
function cssVar(name){ return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

/* ---- Web Audio (beeps that mix with Spotify) ---- */
let audioCtx = null;
function ensureAudioCtx(){
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch(e) { /* ignore */ }
  }
}
// One short beep
function beep(freq = 880, durMs = BEEP_DUR_MS, vol = BEEP_VOL){
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.frequency.value = freq;
  gain.gain.value = vol;
  osc.connect(gain).connect(audioCtx.destination);
  const now = audioCtx.currentTime;
  osc.start(now);
  // quick envelope to reduce clicks
  gain.gain.setValueAtTime(vol, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durMs/1000);
  osc.stop(now + durMs/1000 + 0.02);
}
// double beep for phase transitions
function phaseAlarm(){
  if (!PHASE_ALARM || !audioCtx) return;
  beep(880, 120, BEEP_VOL);
  setTimeout(()=>beep(660, 120, BEEP_VOL), 200);
}

/* ---- Utility ---- */
function format(sec){
  const m = Math.floor(sec/60).toString().padStart(2,'0');
  const s = Math.ceil(sec%60).toString().padStart(2,'0');
  return `${m}:${s}`;
}

function setPhaseUI(step){
  phaseLabel().textContent = step.name;
  arc().style.stroke = step.color;      // set color directly
  timeLabel().textContent = format(step.secs);
  arc().style.strokeDasharray = CIRC;   // reset wheel
  arc().style.strokeDashoffset = 0;
  highlightSegment(stepIndex);
  lastBeepSecond = null;                // reset countdown beeps for this phase
}

/* ---- Plan (10s per phase for testing) ---- */
function buildPlan(){
  const t = PHASE_LEN;
  plan = [
    { name:"Warm-up",  secs:t, color:cssVar('--warm') },
    { name:"Fast",     secs:t, color:cssVar('--fast') },
    { name:"Slow",     secs:t, color:cssVar('--slow') },
    { name:"Fast",     secs:t, color:cssVar('--fast') },
    { name:"Slow",     secs:t, color:cssVar('--slow') },
    { name:"Fast",     secs:t, color:cssVar('--fast') },
    { name:"Slow",     secs:t, color:cssVar('--slow') },
    { name:"Fast",     secs:t, color:cssVar('--fast') },
    { name:"Slow",     secs:t, color:cssVar('--slow') },
    { name:"Cool-down",secs:t, color:cssVar('--cool') },
  ];
  totalSecs = plan.reduce((a,p)=>a+p.secs,0);
  buildSegments();
}

/* ---- Segmented progress bar ---- */
function buildSegments(){
  if (!segBar()) return;
  segBar().innerHTML = "";
  plan.forEach(p=>{
    const d = document.createElement('div');
    d.className = 'seg';
    d.dataset.type =
      p.name.toLowerCase().includes('warm') ? 'warm' :
      p.name.toLowerCase().includes('cool') ? 'cool' :
      p.name.toLowerCase().includes('fast') ? 'fast' : 'slow';
    segBar().appendChild(d);
  });
  highlightSegment(0);
}
function highlightSegment(i){
  document.querySelectorAll('.segbar .seg').forEach((el,idx)=>{
    el.classList.toggle('current', idx===i);
    if (idx < i) el.classList.add('done'); else el.classList.remove('done');
  });
}

/* ---- Controls ---- */
function startWorkout(){
  ensureAudioCtx(); // unlocks audio on first tap, enables mixing beeps with Spotify
  $("#startBtn")?.classList.add("active");
  $("#pauseBtn")?.classList.remove("active");
  statusMsg().textContent = "";
  workoutActive = true;

  if (startTimestamp === null){
    startTimestamp = Date.now();
    elapsedBeforePause = 0;
    elapsedBeforeCurrentPhase = plan.slice(0, stepIndex).reduce((a,p)=>a+p.secs,0);
    setPhaseUI(plan[stepIndex]);
  } else {
    startTimestamp = Date.now() - elapsedBeforePause*1000;
  }

  cancelAnimationFrame(animationFrameId);
  animationFrameId = requestAnimationFrame(updateFrame);
}

function updateFrame(){
  const step = plan[stepIndex];
  const now = Date.now();
  const elapsed = Math.max(0, (now - startTimestamp)/1000);
  const remaining = Math.max(0, step.secs - elapsed);

  // Wheel
  timeLabel().textContent = format(remaining);
  const phaseRatio = Math.min(1, elapsed/step.secs);
  arc().style.strokeDashoffset = -CIRC * phaseRatio;

  // Overall progress
  const totalElapsed = elapsedBeforeCurrentPhase + elapsed;
  const overallRatio = Math.min(1, totalElapsed / totalSecs);
  overallFill().style.width = `${overallRatio*100}%`;
  overallPct()?.textContent = `${Math.round(overallRatio*100)}%`;
  sinceStart()?.textContent = format(totalElapsed);
  timeLeft()?.textContent   = format(totalSecs - totalElapsed);
  nextPhase()?.textContent  = plan[stepIndex+1]?.name ?? '—';

  // Countdown beeps (last COUNTDOWN_LAST_N seconds: 5..1)
  const remInt = Math.ceil(remaining);
  if (remInt > 0 && remInt <= COUNTDOWN_LAST_N && remInt !== lastBeepSecond){
    lastBeepSecond = remInt;
    beep(880, BEEP_DUR_MS, BEEP_VOL); // short and gentle (won't stop Spotify)
  }

  if (remaining <= 0){
    if (PHASE_ALARM) {
      // gentle double beep instead of loud file—less likely to duck music
      phaseAlarm();
    }
    vibrate([200]); // small vibration on phase change
    stepIndex++;
    if (stepIndex >= plan.length){
      statusMsg().textContent = "Workout complete!";
      workoutActive = false;
      clearControlHighlights();
      startTimestamp = null; elapsedBeforePause = 0;
      highlightSegment(plan.length);
      overallFill().style.width = '100%';
      overallPct()?.textContent = '100%';
      return;
    }
    // next phase immediately
    startTimestamp = Date.now();
    elapsedBeforePause = 0;
    elapsedBeforeCurrentPhase += step.secs;
    setPhaseUI(plan[stepIndex]);
    animationFrameId = requestAnimationFrame(updateFrame);
  } else if (workoutActive){
    animationFrameId = requestAnimationFrame(updateFrame);
  }
}

function pauseWorkout(){
  if (!workoutActive) return;
  workoutActive = false;
  $("#pauseBtn")?.classList.add("active");
  $("#startBtn")?.classList.remove("active");
  elapsedBeforePause = (Date.now() - startTimestamp)/1000;
  cancelAnimationFrame(animationFrameId);
}

function resetWorkout(){
  workoutActive = false;
  cancelAnimationFrame(animationFrameId);
  stepIndex = 0;
  startTimestamp = null;
  elapsedBeforePause = 0;
  elapsedBeforeCurrentPhase = 0;
  lastBeepSecond = null;
  clearControlHighlights();
  overallFill().style.width = '0%';
  overallPct()?.textContent = '0%';
  sinceStart()?.textContent = '0:00';
  nextPhase()?.textContent = plan[1]?.name ?? '—';
  timeLeft()?.textContent = format(totalSecs);
  statusMsg().textContent = "Reset complete";
  setPhaseUI(plan[0]);
}

function clearControlHighlights(){
  document.querySelectorAll(".controls button").forEach(b=>b.classList.remove("active"));
}

/* ---- Vibration ---- */
function vibrate(p){ if (navigator.vibrate) navigator.vibrate(p); }

/* ---- Boot ---- */
document.addEventListener('DOMContentLoaded', ()=>{
  if (arc()){
    arc().style.strokeDasharray = CIRC;
    arc().style.strokeDashoffset = 0;
  }
  buildPlan();
  setPhaseUI(plan[0]);
  timeLeft()?.textContent = format(totalSecs);
  nextPhase()?.textContent = plan[1]?.name ?? '—';

  $("#startBtn")?.addEventListener("click", ()=>{ if (!workoutActive) startWorkout(); else startWorkout(); });
  $("#pauseBtn")?.addEventListener("click", pauseWorkout);
  $("#resetBtn")?.addEventListener("click", resetWorkout);
});
