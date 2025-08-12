// ===== Interval Walking App =====
const CIRC = 2 * Math.PI * 110; // circumference of wheel (110 = radius in SVG)

let plan = [];
let stepIndex = 0;
let timer = null;

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
  drawTime(phase.secs, phase.secs);
}

function drawTime(remaining, total, elapsed = null) {
  if (elapsed === null) elapsed = total - remaining;
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
  if (timer) clearInterval(timer);
  clearControlHighlights();
  document.getElementById("startBtn").classList.add("active");
  statusMsg().textContent = "";

  const current = plan[stepIndex];
  setPhaseUI(current);

  const startTime = Date.now();

  timer = setInterval(() => {
    const elapsedMs = Date.now() - startTime;
    const elapsed = elapsedMs / 1000;
    const remaining = Math.max(current.secs - elapsed, 0);

    drawTime(Math.ceil(remaining), current.secs, elapsed);

    if (remaining <= 0) {
      clearInterval(timer);
      playAlarm();
      vibrate([300, 200, 300]);

      stepIndex++;
      if (stepIndex >= plan.length) {
        statusMsg().textContent = "Workout complete!";
        clearControlHighlights();
        return;
      }
      startWorkout(); // start next phase
    }
  }, 100);
}

function pauseWorkout() {
  if (timer) {
    clearInterval(timer);
    timer = null;
    clearControlHighlights();
    document.getElementById("pauseBtn").classList.add("active");
  }
}

function resetWorkout() {
  clearInterval(timer);
  timer = null;
  stepIndex = 0;
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
