// ----- Geometry for the wheel -----
const R = 110;
const CIRC = 2 * Math.PI * R;

/* ---- Config (10s test + countdown beeps that won't pause Spotify) ---- */
const PHASE_LEN = 180;       // change to 180 for 3 minutes
const COUNTDOWN_LAST_N = 5;
const BEEP_VOL = 0.12;
const BEEP_DUR_MS = 120;
const PHASE_ALARM = true;

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
function cssVar(name){ return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

/* ---- Web Audio beeps (mix with Spotify) ---- */
let audioCtx = null;
function ensureAudioCtx(){
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch(e){ /* ignore */ }
  }
}
function beep(freq = 880, durMs = BEEP_DUR_MS, vol = BEEP_VOL){
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.frequency.value = freq;
  gain.gain.value = vol;
  osc.connect(gain).connect(audioCtx.destination);
  const now = audioCtx.currentTime;
  osc.start(now);
  gain.gain.setValueAtTime(vol, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durMs/1000);
  osc.stop(now + durMs/1000 + 0.02);
}
function phaseAlarm(){
  if (!PHASE_ALARM || !audioCtx) return;
  beep(880, 120, BEEP_VOL);
  setTimeout(()=>beep(660, 120, BEEP_VOL), 200);
}

/* ---- Utils ---- */
function format(sec){
  const m = Math.floor(sec/60).toString().padStart(2,'0');
  const s = Math.ceil(sec%60).toString().padStart(2,'0');
  return `${m}:${s}`;
}
function setPhaseUI(step){
  phaseLabel().textContent = step.name;
  arc().style.stroke = step.color;
  timeLabel().textContent = format(step.secs);
  arc().style.strokeDasharray = CIRC;
  arc().style.strokeDashoffset = 0;
  highlightSegment(stepIndex);
  lastBeepSecond = null;
}

/* ---- Plan ---- */
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

/* ---- Segmented bar ---- */
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
  ensureAudioCtx(); // unlock audio on first tap
  const startBtn = $("#startBtn"), pauseBtn = $("#pauseBtn");
  startBtn && startBtn.classList.add("active");
  pauseBtn && pauseBtn.classList.remove("active");
  statusMsg() && (statusMsg().textContent = "");
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

  timeLabel().textContent = format(remaining);
  const phaseRatio = Math.min(1, elapsed/step.secs);
  arc().style.strokeDashoffset = -CIRC * phaseRatio;

  const totalElapsed = elapsedBeforeCurrentPhase + elapsed;
  const overallRatio = Math.min(1, totalElapsed / totalSecs);
  overallFill() && (overallFill().style.width = `${overallRatio*100}%`);
  overallPct() && (overallPct().textContent = `${Math.round(overallRatio*100)}%`);
  sinceStart() && (sinceStart().textContent = format(totalElapsed));
  timeLeft() && (timeLeft().textContent   = format(totalSecs - totalElapsed));
  nextPhase() && (nextPhase().textContent  = plan[stepIndex+1]?.name ?? '—');

  const remInt = Math.ceil(remaining);
  if (remInt > 0 && remInt <= COUNTDOWN_LAST_N && remInt !== lastBeepSecond){
    lastBeepSecond = remInt;
    beep(880, BEEP_DUR_MS, BEEP_VOL);
  }

  if (remaining <= 0){
    phaseAlarm();
    if (navigator.vibrate) navigator.vibrate([200]);
    stepIndex++;
    if (stepIndex >= plan.length){
      statusMsg() && (statusMsg().textContent = "Workout complete!");
      workoutActive = false;
      startTimestamp = null; elapsedBeforePause = 0;
      highlightSegment(plan.length);
      overallFill() && (overallFill().style.width = '100%');
      overallPct() && (overallPct().textContent = '100%');
      return;
    }
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
  $("#pauseBtn") && $("#pauseBtn").classList.add("active");
  $("#startBtn") && $("#startBtn").classList.remove("active");
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
  document.querySelectorAll(".controls button").forEach(b=>b.classList.remove("active"));
  overallFill() && (overallFill().style.width = '0%');
  overallPct() && (overallPct().textContent = '0%');
  sinceStart() && (sinceStart().textContent = '0:00');
  nextPhase() && (nextPhase().textContent = plan[1]?.name ?? '—');
  timeLeft() && (timeLeft().textContent = format(totalSecs));
  statusMsg() && (statusMsg().textContent = "Reset complete");
  setPhaseUI(plan[0]);
}

/* ---- Boot ---- */
function init(){
  if (arc()){
    arc().style.strokeDasharray = CIRC;
    arc().style.strokeDashoffset = 0;
  }
  buildPlan();
  setPhaseUI(plan[0]);
  timeLeft() && (timeLeft().textContent = format(totalSecs));
  nextPhase() && (nextPhase().textContent = plan[1]?.name ?? '—');

  // Robust listeners (work even if HTML changed)
  const sb = $("#startBtn"), pb = $("#pauseBtn"), rb = $("#resetBtn");
  sb && sb.addEventListener("click", startWorkout);
  pb && pb.addEventListener("click", pauseWorkout);
  rb && rb.addEventListener("click", resetWorkout);

  // Also expose for inline onclick fallbacks if your HTML uses them
  window.startWorkout = startWorkout;
  window.pauseWorkout  = pauseWorkout;
  window.resetWorkout  = resetWorkout;
}

document.addEventListener('DOMContentLoaded', init);
