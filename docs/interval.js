// ----- Geometry for the wheel -----
const R = 110;
const CIRC = 2 * Math.PI * R;

// ----- State -----
let plan = [];
let stepIndex = 0;
let workoutActive = false;
let startTimestamp = null;
let elapsedBeforePause = 0;
let animationFrameId = null;
let totalSecs = 0;
let elapsedBeforeCurrentPhase = 0; // sum of previous phases

// ----- DOM helpers -----
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

// ----- Utilities -----
function format(sec){
  const m = Math.floor(sec/60).toString().padStart(2,'0');
  const s = Math.ceil(sec%60).toString().padStart(2,'0');
  return `${m}:${s}`;
}

function setPhaseUI(step){
  phaseLabel().textContent = step.name;
  arc().style.stroke = step.color;              // set color directly
  timeLabel().textContent = format(step.secs);
  arc().style.strokeDasharray = CIRC;           // wheel reset
  arc().style.strokeDashoffset = 0;
  highlightSegment(stepIndex);
}

// ----- Build the workout plan (5s test; switch to 180s later) -----
function buildPlan(){
  const t = 5; // change to 180 for 3 minutes per phase
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

// ----- Segmented bar -----
function buildSegments(){
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
  });
}

// ----- Controls -----
function startWorkout(){
  document.getElementById("startBtn")?.classList.add("active");
  document.getElementById("pauseBtn")?.classList.remove("active");
  statusMsg().textContent = "";

  workoutActive = true;

  if (startTimestamp === null){
    // Begin current phase from start
    startTimestamp = Date.now();
    elapsedBeforePause = 0;
    // sum of previous phases (for overall bar)
    elapsedBeforeCurrentPhase = plan.slice(0, stepIndex).reduce((a,p)=>a+p.secs,0);
    setPhaseUI(plan[stepIndex]);
  } else {
    // Resume
    startTimestamp = Date.now() - elapsedBeforePause*1000;
  }

  cancelAnimationFrame(animationFrameId);
  animationFrameId = requestAnimationFrame(updateFrame);
}

function updateFrame(){
  const step = plan[stepIndex];
  const now = Date.now();
  const elapsed = Math.max(0, (now - startTimestamp)/1000);  // in this phase
  const remaining = Math.max(0, step.secs - elapsed);

  // Wheel
  timeLabel().textContent = format(remaining);
  const phaseRatio = Math.min(1, elapsed/step.secs);
  arc().style.strokeDashoffset = -CIRC * phaseRatio;

  // Overall progress
  const totalElapsed = elapsedBeforeCurrentPhase + elapsed;
  const overallRatio = Math.min(1, totalElapsed / totalSecs);
  overallFill().style.width = `${overallRatio*100}%`;
  overallPct().textContent = `${Math.round(overallRatio*100)}%`;
  sinceStart().textContent = format(totalElapsed);
  timeLeft().textContent   = format(totalSecs - totalElapsed);
  nextPhase().textContent  = plan[stepIndex+1]?.name ?? '—';

  if (remaining <= 0){
    playAlarm(); vibrate([300,200,300]);
    stepIndex++;
    if (stepIndex >= plan.length){
      statusMsg().textContent = "Workout complete!";
      workoutActive = false;
      clearControlHighlights();
      startTimestamp = null; elapsedBeforePause = 0;
      highlightSegment(plan.length-1);
      overallFill().style.width = '100%';
      overallPct().textContent = '100%';
      return;
    }
    // Next phase immediately
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
  document.getElementById("pauseBtn")?.classList.add("active");
  document.getElementById("startBtn")?.classList.remove("active");
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
  clearControlHighlights();
  overallFill().style.width = '0%';
  overallPct().textContent = '0%';
  sinceStart().textContent = '0:00';
  nextPhase().textContent = plan[1]?.name ?? '—';
  timeLeft().textContent = format(totalSecs);
  statusMsg().textContent = "Reset complete";
  setPhaseUI(plan[0]);
}

function clearControlHighlights(){
  document.querySelectorAll(".controls button").forEach(b=>b.classList.remove("active"));
}

// ----- Sound & vibration -----
function playAlarm(){
  const a = document.getElementById("alarmSound");
  if (!a) return;
  a.currentTime = 0;
  a.play().catch(()=>{});
}
function vibrate(p){ if (navigator.vibrate) navigator.vibrate(p); }

// ----- Boot -----
document.addEventListener('DOMContentLoaded', ()=>{
  // prime arc
  arc().style.strokeDasharray = CIRC;
  arc().style.strokeDashoffset = 0;

  buildPlan();                   // create plan (5s each for testing)
  setPhaseUI(plan[0]);           // show first phase
  timeLeft().textContent = format(totalSecs);
  nextPhase().textContent = plan[1]?.name ?? '—';

  document.getElementById("startBtn").addEventListener("click", ()=>{ if (!workoutActive) startWorkout(); else startWorkout(); });
  document.getElementById("pauseBtn").addEventListener("click", pauseWorkout);
  document.getElementById("resetBtn").addEventListener("click", resetWorkout);
});
