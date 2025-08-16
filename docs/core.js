// ===== Core Exercise Tracker (voice cue 10s before end of 3rd break, 10s test, Spotify-friendly) =====

// --- Config ---
const EXERCISES = [
  "Extended plank",
  "Hollow hold",
  "Wrist to knee crunch",
  "AB roll out",
  "Reverse crunch"
];
const SETS_PER_EXERCISE = 3;

// *** TEST MODE: 10 seconds each ***
const EXERCISE_SECS = 10;
const BREAK_SECS = 10;

// Lead time for voice cue (seconds before a phase ends)
const LEAD_CUE_SECONDS = 10; // <- your request

// --- State ---
let exIdx = 0;
let setIdx = 0;
let isBreak = false;
let running = false;
let finished = false;
let timerId = null;
let remaining = EXERCISE_SECS;
let sinceStart = 0;
// one-time gate for the voice cue during the special break
let leadCueFired = false;

// --- DOM refs ---
let exerciseListEl, wheelProgress, phaseLabel, timeLabel, setsDots, sinceStartEl;
let startBtn, pauseBtn, resetBtn, exToggleBtn, exArrow;

// ===== Web Audio tones (Spotify-friendly) =====
let audioCtx = null;
function ensureAudio(){
  if (!audioCtx){
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
  }
}
function tone(freq = 950, dur = 0.1, vol = 0.14, type = 'square', when = 0){
  if (!audioCtx) return;
  vol *= 1.2; // +20% louder globally
  const t = audioCtx.currentTime + when;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.value = 0.0001;
  o.connect(g).connect(audioCtx.destination);
  o.start(t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.stop(t + dur + 0.02);
}
function clickTone(){ ensureAudio(); tone(1000, 0.06, 0.12, 'square'); }
function phaseChime(){ ensureAudio(); tone(1200,.12,.16,'square',0); tone(800,.12,.16,'square',0.18); }
function countdownBeep(n){ ensureAudio(); const f={1:1000,2:950,3:900,4:850,5:800}[n]||880; tone(f,0.09,0.14,'square'); }
function exerciseChangeSound(){ ensureAudio(); tone(700,0.12,0.16,'square',0); tone(900,0.12,0.16,'square',0.20); tone(1100,0.12,0.16,'square',0.40); }

// ===== Voice MP3 cue =====
const newExerciseAudio = new Audio("new exercise coming up.mp3"); // same folder as core.js
newExerciseAudio.volume = 1.0;
function playNewExerciseCue(){
  try {
    newExerciseAudio.pause();
    newExerciseAudio.currentTime = 0;
    newExerciseAudio.play().catch(()=>{});
  } catch {}
}

// ===== UI builders =====
function buildExerciseList(){
  if (!exerciseListEl) return;
  exerciseListEl.innerHTML = "";
  EXERCISES.forEach((name) => {
    const item = document.createElement("div");
    item.className = "exercise-item";
    item.innerHTML = `<div class="name">${name}</div>`;
    exerciseListEl.appendChild(item);
  });
}
function buildDots(){
  if (!setsDots) return;
  setsDots.innerHTML = "";
  for (let i = 0; i < SETS_PER_EXERCISE; i++){
    const d = document.createElement("div");
    d.className = "dot";
    d.dataset.idx = i;
    setsDots.appendChild(d);
  }
}

// Helpers
function fmt(sec){
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec/60), s = sec % 60;
  return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

// Wheel
function updateWheel(){
  if (!wheelProgress) return;
  const r = 110, C = 2 * Math.PI * r;
  const total = isBreak ? BREAK_SECS : EXERCISE_SECS;
  const ratio = finished ? 1 : (1 - (remaining / total));
  wheelProgress.style.strokeDasharray = `${C}`;
  wheelProgress.style.strokeDashoffset = `${C * (1 - ratio)}`;
  wheelProgress.setAttribute('stroke', isBreak ? '#00aaff' : '#ff2d55');
}
function updateExerciseHighlights(){
  if (!exerciseListEl) return;
  const items = Array.from(exerciseListEl.children);
  items.forEach((el, i) => {
    const isThis = i === exIdx;
    el.classList.toggle("current",       isThis && !isBreak && !finished);
    el.classList.toggle("break-current", isThis &&  isBreak && !finished);
    if (!isThis || finished){
      el.classList.remove("current", "break-current");
    }
  });
}
function updateDots(){
  if (!setsDots) return;
  const dots = setsDots.children;
  for (let i = 0; i < dots.length; i++){
    dots[i].classList.toggle('done', i < setIdx || finished);
    dots[i].classList.toggle('current', i === setIdx && !isBreak && !finished);
    if (isBreak && i === setIdx) dots[i].classList.add('done');
  }
}
function updateUI(){
  if (phaseLabel && timeLabel){
    if (finished){
      phaseLabel.innerHTML = `<strong>Exercise completed.</strong>`;
      timeLabel.textContent = "00:00";
    } else {
      const name = EXERCISES[exIdx];
      phaseLabel.innerHTML = `<strong>${isBreak ? "Break" : name}</strong>`;
      timeLabel.textContent = fmt(remaining);
    }
  }
  if (sinceStartEl) sinceStartEl.textContent = fmt(sinceStart);
  updateWheel(); updateExerciseHighlights(); updateDots();
}

// Phase progression
function advance(){
  if (!isBreak){
    // Enter break
    isBreak = true;
    remaining = BREAK_SECS;
    // Reset the one-time cue gate at the start of *every* break
    leadCueFired = false;
  } else {
    // Leaving break -> next set/exercise
    isBreak = false;
    setIdx += 1;
    if (setIdx >= SETS_PER_EXERCISE){
      setIdx = 0;
      exIdx += 1;
      if (exIdx >= EXERCISES.length){
        finished = true;
        stop();
        updateUI();
        return;
      }
      exerciseChangeSound(); // general cue for new exercise
    }
    remaining = EXERCISE_SECS;
  }
  updateUI();
}

// Timer loop
function loop(){
  remaining -= 1;
  sinceStart += 1;

  // Last-5 seconds beep for any phase
  if (remaining > 0 && remaining <= 5){
    countdownBeep(remaining);
  }

  // SPECIAL: Speak 10s before end of the 3rd break (exIdx=2, setIdx=2, in break)
  if (
    isBreak &&
    exIdx === 2 &&
    setIdx === SETS_PER_EXERCISE - 1 &&
    remaining === LEAD_CUE_SECONDS &&
    !leadCueFired
  ){
    leadCueFired = true;
    playNewExerciseCue();
  }

  if (remaining <= 0){
    remaining = 0;
    updateUI();
    try { navigator.vibrate && navigator.vibrate([180,120,180]); } catch {}
    phaseChime();
    advance();
  } else {
    updateUI();
  }
}

// Controls
function start(){
  if (running || finished) return;
  clickTone();
  ensureAudio();
  running = true;
  if (startBtn) startBtn.classList.add('active');
  if (pauseBtn) pauseBtn.classList.remove('active');
  timerId = setInterval(loop, 1000);
}
function pause(){
  if (!running) return;
  clickTone();
  running = false;
  if (timerId){ clearInterval(timerId); timerId = null; }
  if (pauseBtn) pauseBtn.classList.add('active');
  if (startBtn) startBtn.classList.remove('active');
}
function stop(){
  running = false;
  if (timerId){ clearInterval(timerId); timerId = null; }
  if (startBtn) startBtn.classList.remove('active');
  if (pauseBtn) pauseBtn.classList.remove('active');
}
function resetAll(){
  clickTone();
  stop();
  exIdx = 0; setIdx = 0; isBreak = false; finished = false;
  remaining = EXERCISE_SECS; sinceStart = 0;
  leadCueFired = false;
  buildExerciseList();
  buildDots();
  if (exerciseListEl) exerciseListEl.classList.remove('collapsed');
  updateUI();
}

// Accordion
function toggleExercises(){
  if (!exerciseListEl) return;
  const collapsed = exerciseListEl.classList.toggle('collapsed');
  if (exToggleBtn) exToggleBtn.setAttribute('aria-expanded', String(!collapsed));
  if (exArrow) exArrow.textContent = collapsed ? '▼' : '▲';
  clickTone();
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  exerciseListEl = document.getElementById("exerciseList");
  wheelProgress  = document.getElementById("wheelProgress");
  phaseLabel     = document.getElementById("phaseLabel");
  timeLabel      = document.getElementById("timeLabel");
  setsDots       = document.getElementById("setsDots");
  sinceStartEl   = document.getElementById("sinceStart");
  startBtn       = document.getElementById("startBtn");
  pauseBtn       = document.getElementById("pauseBtn");
  resetBtn       = document.getElementById("resetBtn");
  exToggleBtn    = document.getElementById("exToggle") || document.querySelector(".ex-accordion");
  exArrow        = document.getElementById("exArrow") || (exToggleBtn ? exToggleBtn.querySelector(".arrow") : null);

  buildExerciseList();
  buildDots();
  if (exerciseListEl) exerciseListEl.classList.remove('collapsed');
  updateUI();

  if (startBtn) startBtn.addEventListener('click', start);
  if (pauseBtn) pauseBtn.addEventListener('click', pause);
  if (resetBtn) resetBtn.addEventListener('click', resetAll);
  if (exToggleBtn) exToggleBtn.addEventListener('click', toggleExercises);

  window.addEventListener('touchstart', ensureAudio, { once:true });
});
