// ===== Interval Walking App (smooth wheel + pause/resume + direct stroke color) =====
const R = 110;
const CIRC = 2 * Math.PI * R;

let plan = [];
let stepIndex = 0;
let workoutActive = false;
let startTimestamp = null;
let elapsedBeforePause = 0;
let animationFrameId = null;

// DOM helpers
const $ = (sel) => document.querySelector(sel);
const phaseLabel = () => document.getElementById("phaseLabel");
const timeLabel  = () => document.getElementById("timeLabel");
const statusMsg  = () => document.getElementById("statusMsg");
const arc        = () => document.querySelector(".progress");

// Read an actual color from a CSS var (resolves to a real color string)
function cssVar(name){ return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

function format(sec){
  const m = Math.floor(sec/60).toString().padStart(2,'0');
  const s = Math.ceil(sec%60).toString().padStart(2,'0'); // ceil so label drops at whole seconds
  return `${m}:${s}`;
}

function setPhaseUI(step){
  // Set label and arc color directly (no var indirection)
  phaseLabel().textContent = step.name;
  arc().style.stroke = step.color;

  // Reset wheel to 0% filled at the start of the phase
  timeLabel().textContent = format(step.secs);
  arc().style.strokeDasharray = CIRC;
  arc().style.strokeDashoffset = 0;
}

function buildPlan(){
  const testTime = 5; // ← set to 180 for 3 minutes when you're done testing
  plan = [
    { name: "Warm-up",  secs: testTime, color: cssVar('--warm') },
    { name: "Fast",     secs: testTime, color: cssVar('--fast') },
    { name: "Slow",     secs: testTime, color: cssVar('--slow') },
    { name: "Fast",     secs: testTime, color: cssVar('--fast') },
    { name: "Slow",     secs: testTime, color: cssVar('--slow') },
    { name: "Fast",     secs: testTime, color: cssVar('--fast') },
    { name: "Slow",     secs: testTime, color: cssVar('--slow') },
    { name: "Fast",     secs: testTime, color: cssVar('--fast') },
    { name: "Slow",     secs: testTime, color: cssVar('--slow') },
    { name: "Cool-down",secs: testTime, color: cssVar('--cool') }
  ];
}

function startWorkout(){
  // allow resume after pause or fresh start
  document.getElementById("startBtn")?.classList.add("active");
  document.getElementById("pauseBtn")?.classList.remove("active");
  statusMsg().textContent = "";

  workoutActive = true;

  if (startTimestamp === null){
    // (re)starting the current phase from its beginning
    startTimestamp = Date.now();
    elapsedBeforePause = 0;
    setPhaseUI(plan[stepIndex]);
  } else {
    // resuming mid‑phase
    startTimestamp = Date.now() - elapsedBeforePause * 1000;
  }

  cancelAnimationFrame(animationFrameId);
  animationFrameId = requestAnimationFrame(updateFrame);
}

function updateFrame(){
  const step = plan[stepIndex];
  const now = Date.now();
  const elapsed = Math.max(0, (now - startTimestamp) / 1000);
  const remaining = Math.max(0, step.secs - elapsed);

  // Label and wheel
  timeLabel().textContent = format(remaining);
  const ratio = Math.min(1, elapsed / step.secs);
  arc().style.strokeDashoffset = -CIRC * ratio;

  if (remaining <= 0){
    // Phase done → advance immediately
    playAlarm(); vibrate([300,200,300]);
    stepIndex++;
    if (stepIndex >= plan.length){
      statusMsg().textContent = "Workout complete!";
      workoutActive = false;
      clearControlHighlights();
      startTimestamp = null;
      elapsedBeforePause = 0;
      return; // stop animation
    }
    // Next phase: reset timers and UI, continue animation
    startTimestamp = Date.now();
    elapsedBeforePause = 0;
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
  elapsedBeforePause = (Date.now() - startTimestamp) / 1000;
  cancelAnimationFrame(animationFrameId);
}

function resetWorkout(){
  workoutActive = false;
  cancelAnimationFrame(animationFrameId);
  stepIndex = 0;
  startTimestamp = null;
  elapsedBeforePause = 0;
  clearControlHighlights();
  statusMsg().textContent = "Reset complete";
  setPhaseUI(plan[0]);
}

function clearControlHighlights(){
  document.querySelectorAll(".controls button").forEach(b => b.classList.remove("active"));
}

// Sounds & vibration
function playAlarm(){
  const a = document.getElementById("alarmSound");
  if (!a) return;
  a.currentTime = 0;
  a.play().catch(()=>{});
}
function vibrate(p){
  if (navigator.vibrate) navigator.vibrate(p);
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
  // Ensure the SVG arc circumference matches what JS expects
  arc().style.strokeDasharray = CIRC;
  arc().style.strokeDashoffset = 0;

  buildPlan();
  setPhaseUI(plan[0]);

  document.getElementById("startBtn")?.addEventListener("click", () => {
    if (!workoutActive) startWorkout(); else startWorkout(); // resume or start
  });
  document.getElementById("pauseBtn")?.addEventListener("click", pauseWorkout);
  document.getElementById("resetBtn")?.addEventListener("click", resetWorkout);
});
