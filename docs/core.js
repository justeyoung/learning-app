// ===== Core Exercise Tracker (stable list, Spotify-friendly sounds, +20% vol) =====
// 5 exercises × 3 sets each; every set = 1:00 exercise + 1:00 break

// --- Config ---
const EXERCISES = [
  "Extended plank",
  "Hollow hold",
  "Wrist to knee crunch",
  "AB roll out",
  "Reverse crunch"
];
const SETS_PER_EXERCISE = 3;
const EXERCISE_SECS = 60;
const BREAK_SECS = 60;

// --- State ---
let exIdx = 0;            // 0..4
let setIdx = 0;           // 0..2
let isBreak = false;      // false=exercise, true=break
let running = false;
let timerId = null;
let remaining = EXERCISE_SECS;
let sinceStart = 0;

// --- DOM refs (assigned on DOMContentLoaded) ---
let exerciseListEl, wheelProgress, phaseLabel, timeLabel, setsDots, sinceStartEl;
let startBtn, pauseBtn, resetBtn;

// ===== Web Audio (no Spotify ducking) =====
let audioCtx = null;
function ensureAudio(){
  if (!audioCtx){
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
  }
}
// Base tone (+20% volume bump applied centrally)
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

// ===== UI builders (build once; do NOT clear every tick) =====
function buildExerciseList(){
  exerciseListEl.innerHTML = ""; // build once on init/reset ONLY
  EXERCISES.forEach((name) => {
    const item = document.createElement("div");
    item.className = "exercise-item";
    item.innerHTML = `<div class="name">${name}</div>`;
    exerciseListEl.appendChild(item);
  });
}

function buildDots(){
  setsDots.innerHTML = "";
  for (let i = 0; i < SETS_PER_EXERCISE; i++){
    const d = document.createElement("div");
    d.className = "dot";
    d.dataset.idx = i;
    setsDots.appendChild(d);
  }
}

// ===== Helpers =====
function fmt(sec){
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec/60), s = sec % 60;
  return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

// Update wheel (EXERCISE=RED, BREAK=BLUE)
function updateWheel(){
  const r = 110, C = 2 * Math.PI * r;
  const total = isBreak ? BREAK_SECS : EXERCISE_SECS;
  const ratio = 1 - (remaining / total);
  wheelProgress.style.strokeDasharray = `${C}`;
  wheelProgress.style.strokeDashoffset = `${C * (1 - ratio)}`;
  wheelProgress.setAttribute('stroke', isBreak ? '#00aaff' : '#ff2d55');
}

// Update highlights — does NOT rebuild list
function updateExerciseHighlights(){
  const items = exerciseListEl ? Array.from(exerciseListEl.children) : [];
  items.forEach((el, i) => {
    const isThis = i === exIdx;
    // exercise phase = green
    el.classList.toggle("current",       isThis && !isBreak);
    // break phase   = blue
    el.classList.toggle("break-current", isThis &&  isBreak);
    if (!isThis){
      el.classList.remove("current", "break-current");
    }
  });
}

// Update dots (no rebuild)
function updateDots(){
  const dots = setsDots ? setsDots.children : [];
  for (let i = 0; i < dots.length; i++){
    dots[i].classList.toggle('done', i < setIdx);
    dots[i].classList.toggle('current', i === setIdx && !isBreak);
    if (isBreak && i === setIdx) dots[i].classList.add('done');
  }
}

// Main UI update
function updateUI(){
  if (!phaseLabel) return; // safety if called early
  const name = EXERCISES[exIdx];
  phaseLabel.innerHTML = `<strong>${isBreak ? "Break" : name}</strong>`;
  timeLabel.textContent = fmt(remaining);
  sinceStartEl.textContent = fmt(sinceStart);

  updateWheel();
  updateExerciseHighlights();
  updateDots();
}

// ===== Phase progression =====
function advance(){
  if (!isBreak){
    // finished exercise -> break
    isBreak = true;
    remaining = BREAK_SECS;
  } else {
    // finished break -> next set or next exercise
    isBreak = false;
    setIdx += 1;
    if (setIdx >= SETS_PER_EXERCISE){
      setIdx = 0;
      exIdx += 1;
      if (exIdx >= EXERCISES.length){
        stop();
        updateUI();
        return;
      }
      exerciseChangeSound(); // distinct cue when a NEW exercise starts
    }
    remaining = EXERCISE_SECS;
  }
  updateUI();
}

// ===== Timer loop =====
function loop(){
  remaining -= 1;
  sinceStart += 1;

  if (remaining > 0 && remaining <= 5){
    countdownBeep(remaining); // last-5 beeps
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

// ===== Controls =====
function start(){
  if (running) return;
  clickTone();
  ensureAudio();
  running = true;
  startBtn.classList.add('active');
  pauseBtn.classList.remove('active');
  timerId = setInterval(loop, 1000);
}
function pause(){
  if (!running) return;
  clickTone();
  running = false;
  if (timerId){ clearInterval(timerId); timerId = null; }
  pauseBtn.classList.add('active');
  startBtn.classList.remove('active');
}
function stop(){
  running = false;
  if (timerId){ clearInterval(timerId); timerId = null; }
  startBtn.classList.remove('active');
  pauseBtn.classList.remove('active');
}
function resetAll(){
  clickTone();
  stop();
  exIdx = 0; setIdx = 0; isBreak = false;
  remaining = EXERCISE_SECS;
  sinceStart = 0;
  buildExerciseList(); // build once on reset
  buildDots();
  updateUI();
}

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
  // Wire DOM
  exerciseListEl = document.getElementById("exerciseList");
  wheelProgress  = document.getElementById("wheelProgress");
  phaseLabel     = document.getElementById("phaseLabel");
  timeLabel      = document.getElementById("timeLabel");
  setsDots       = document.getElementById("setsDots");
  sinceStartEl   = document.getElementById("sinceStart");
  startBtn       = document.getElementById("startBtn");
  pauseBtn       = document.getElementById("pauseBtn");
  resetBtn       = document.getElementById("resetBtn");

  // Build once
  buildExerciseList();
  buildDots();
  updateUI();

  // Events
  startBtn.addEventListener('click', start);
  pauseBtn.addEventListener('click', pause);
  resetBtn.addEventListener('click', resetAll);

  // Unlock audio on first touch (iOS)
  window.addEventListener('touchstart', ensureAudio, { once:true });
});
