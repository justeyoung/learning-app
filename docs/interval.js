// ===== Interval Walking App =====
const CIRC = 2 * Math.PI * 110; // circumference of wheel (110 = radius in SVG)

let plan = [];
let stepIndex = 0;
let workoutActive = false;
let startTimestamp = null;
let elapsedBeforePause = 0;
let animationFrameId = null;

// DOM shortcuts
const phaseLabel = () => document.getElementById("phaseLabel");
const timeLabel = () => document.getElementById("timeLabel");
const statusMsg = () => document.getElementById("statusMsg");
const progressArc = () => document.querySelector(".progress");

function format(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function setPhaseUI(phase) {
  phaseLabel().textContent = phase.name;
  document.documentElement.style.setProperty("--fast", phase.color);
  drawTime(phase.secs, phase.secs, 0);
}

function drawTime(remaining, total, elapsed) {
  timeLabel().textContent = format(remaining);
  const ratio = elapsed / total;
  const dash = CIRC * ratio;
  progressArc().setAttribute("stroke-dasharray", `${dash} ${CIRC - dash}`);
}

// ===== Workout Control =====
function buildPlan() {
  plan = [
    { name: "Warm-up", secs: 180, color: "var(--warm)" },
    { name: "Fast", secs: 180, color: "var(--fast)" },
    { name: "Slow", secs: 180, color: "var(--slow)" },
    { name: "Fast", secs: 180, color: "var(--fast)" },
    { name: "Slow", secs: 180, color: "var(--slow)" },
    { name: "Fast", secs: 180, color: "var(--fast)" },
    { name: "Slow", secs: 180, color: "var(--slow)" },
    { name: "Fast", secs: 180, color: "var(--fast)" },
    { name: "Slow", secs: 180, color: "var(--slow)" },
    { name: "Cool-down", secs: 180, color: "var(--cool)" }
  ];
}

function startWorkout() {
  if (!workoutActive) {
    // Starting a new workout or resuming from pause
    workoutActive = true;
    document.getElementById("startBtn").classList.add("active");
    document.getElementById("pauseBtn").classList.remove("active");
    statusMsg().textContent = "";

    if (startTimestamp === null) {
      // brand new phase
      startTimestamp = Date.now();
      elapsedBeforePause = 0;
      setPhaseUI(plan[stepIndex]);
    } else {
      // resuming from pause
      startTimestamp = Date.now() - elapsedBeforePause * 1000;
    }

    requestAnimationFrame(updateFrame);
  }
}

function updateFrame() {
  const current = plan[stepIndex];
  const now = Date.now();
  const elapsed = (now - startTimestamp) / 1000;
  const remaining = Math.max(current.secs - elapsed, 0);

  drawTime(Math.ceil(remaining), current.secs, elapsed);

  if (remaining <= 0) {
    playAlarm();
    vibrate([300, 200, 300]);
    stepIndex++;
    if (stepIndex >= plan.length) {
      statusMsg().textContent = "Workout complete!";
      workoutActive = false;
      clearControlHighlights();
      startTimestamp = null;
      elapsedBeforePause = 0;
      return;
    }
    startTimestamp = null;
    elapsedBeforePause = 0;
    setPhaseUI(plan[stepIndex]);
    requestAnimationFrame(updateFrame);
  } else {
    animationFrameId = requestAnimationFrame(updateFrame);
  }
}

function pauseWorkout() {
  if (workoutActive) {
    workoutActive = false;
    document.getElementById("pauseBtn").classList.add("active");
    document.getElementById("startBtn").classList.remove("active");
    elapsedBeforePause = (Date.now() - startTimestamp) / 1000;
    cancelAnimationFrame(animationFrameId);
  }
}

function resetWorkout() {
  workoutActive = false;
  cancelAnimationFrame(animationFrameId);
  stepIndex = 0;
  startTimestamp = null;
  elapsedBeforePause = 0;
  clearControlHighlights();
  statusMsg().textContent = "Reset complete";
  setPhaseUI(plan[0]);
}

function clearControlHighlights() {
  document.querySelectorAll(".controls button").forEach(btn =>
    btn.classList.remove("active")
  );
}

// ===== Sound & Vibration =====
function playAlarm() {
  const audio = document.getElementById("alarmSound");
  audio.currentTime = 0;
  audio.play().catch(() => {});
}
function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

// ===== Init =====
document.addEventListener("DOMContentLoaded", () => {
  buildPlan();
  setPhaseUI(plan[0]);
  document.getElementById("startBtn").addEventListener("click", startWorkout);
  document.getElementById("pauseBtn").addEventListener("click", pauseWorkout);
  document.getElementById("resetBtn").addEventListener("click", resetWorkout);
});
