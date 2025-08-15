// ===== Core Exercise Tracker (accordion, modern chime alert, Spotify-friendly, +15% tones) =====

// --- Config ---
const EXERCISES = [
  "Extended plank",
  "Hollow hold",
  "Wrist to knee crunch",
  "AB roll out",
  "Reverse crunch"
];
const SETS_PER_EXERCISE = 3;
const EXERCISE_SECS = 8;
const BREAK_SECS = 8;

// --- State ---
let exIdx = 0;            // 0..4 (5 exercises)
let setIdx = 0;           // 0..2 (3 sets per exercise)
let isBreak = false;      // false=exercise, true=break
let running = false;
let finished = false;
let timerId = null;
let remaining = EXERCISE_SECS;
let sinceStart = 0;

// --- DOM refs (assigned on DOMContentLoaded) ---
let exerciseListEl, wheelProgress, phaseLabel, timeLabel, setsDots, sinceStartEl;
let startBtn, pauseBtn, resetBtn, exToggleBtn, exArrow;

// ===== Web Audio (tones that don't duck Spotify) =====
let audioCtx = null;
function ensureAudio(){
  if (!audioCtx){
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
  }
}
/** Base tone — all tone volumes boosted by +15% */
function tone(freq = 950, dur = 0.1, vol = 0.14, type = 'square', when = 0){
  if (!audioCtx) return;
  vol *= 1.15; // +15% louder globally (per your request)
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
// (We keep exerciseChangeSound for general new-exercise cue)
function exerciseChangeSound(){ ensureAudio(); tone(700,0.12,0.16,'square',0); tone(900,0.12,0.16,'square',0.20); tone(1100,0.12,0.16,'square',0.40); }

// ===== Modern Chime (triple inside file; full volume; Spotify-friendly) =====
const modernChime = new Audio('sounds/modern_chime.mp3');
modernChime.preload = 'auto';
modernChime.setAttribute('playsinline','');
modernChime.volume = 1.0; // play at full device volume

function playModernChimeOnce(){
  // File already contains 3 chimes under 5s — play exactly once
  try { modernChime.currentTime = 0; modernChime.play(); } catch {}
}

// ===== UI builders =====
function buildExerciseList(){
  exerciseListEl.innerHTML = ""; // build on init/reset ONLY
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

// Helpers
function fmt(sec){
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec/60), s = sec % 60;
  return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

// Wheel (EXERCISE=RED, BREAK=BLUE)
function updateWheel(){
  const r = 110, C = 2 * Math.PI * r;
  const total = isBreak ? BREAK_SECS : EXERCISE_SECS;
  const ratio = finished ? 1 : (1 - (remaining / total));
  wheelProgress.style.strokeDasharray = `${C}`;
  wheelProgress.style.strokeDashoffset = `${C * (1 - ratio)}`;
  wheelProgress.setAttribute('stroke', isBreak ? '#00aaff' : '#ff2d55');
}

// Highlights (no rebuild)
function updateExerciseHighlights(){
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

// Dots (no rebuild)
function updateDots(){
  const dots = setsDots.children;
  for (let i = 0; i < dots.length; i++){
    dots[i].classList.toggle('done', i < setIdx || finished);
    dots[i].classList.toggle('current', i === setIdx && !isBreak && !finished);
    if (isBreak && i === setIdx) dots[i].classList.add('done');
  }
}

// UI update
function updateUI(){
  if (finished){
    phaseLabel.innerHTML = `<strong>Exercise completed.</strong>`;
    timeLabel.textContent = "00:00";
  } else {
    const name = EXERCISES[exIdx];
    phaseLabel.innerHTML = `<strong>${isBreak ? "Break" : name}</strong>`;
    timeLabel.textContent = fmt(remaining);
  }
  sinceStartEl.textContent = fmt(sinceStart);

  updateWheel();
  updateExerciseHighlights();
  updateDots();
}

// Phase progression
function advance(){
  if (!isBreak){
    // Finished exercise -> enter break
    isBreak = true;
    remaining = BREAK_SECS;
  } else {
    // Finished break -> start next set/exercise
    // >>> SPECIAL CHIME: end of 3rd break of the 5 exercises (between Exercise 3 and 4)
    // At this moment: exIdx === 2 (3rd exercise), setIdx === 2 (3rd set), isBreak === true
    if (exIdx === 2 && setIdx === SETS_PER_EXERCISE - 1) {
      playModernChimeOnce();
    }

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
      // General "new exercise" cue (short tones)
      exerciseChangeSound();
    }
    remaining = EXERCISE_SECS;
  }
  updateUI();
}

// Timer loop
function loop(){
  remaining -= 1;
  sinceStart += 1;

  if (remaining > 0 && remaining <= 5){
    countdownBeep(remaining);
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
  exIdx = 0; setIdx = 0; isBreak = false; finished = false;
  remaining = EXERCISE_SECS; sinceStart = 0;
  buildExerciseList();
  buildDots();
  updateUI();
}

// Accordion toggle (if you have the ▲/▼ button in HTML)
function toggleExercises(){
  const collapsed = exerciseListEl.classList.toggle('collapsed');
  exToggleBtn.setAttribute('aria-expanded', String(!collapsed));
  exArrow.textContent = collapsed ? '▼' : '▲';
  clickTone();
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  // DOM refs
  exerciseListEl = document.getElementById("exerciseList");
  wheelProgress  = document.getElementById("wheelProgress");
  phaseLabel     = document.getElementById("phaseLabel");
  timeLabel      = document.getElementById("timeLabel");
  setsDots       = document.getElementById("setsDots");
  sinceStartEl   = document.getElementById("sinceStart");
  startBtn       = document.getElementById("startBtn");
  pauseBtn       = document.getElementById("pauseBtn");
  resetBtn       = document.getElementById("resetBtn");
  exToggleBtn    = document.getElementById("exToggle");
  exArrow        = document.getElementById("exArrow");

  // Build once
  buildExerciseList();
  buildDots();
  updateUI();

  // Events
  startBtn.addEventListener('click', start);
  pauseBtn.addEventListener('click', pause);
  resetBtn.addEventListener('click', resetAll);
  if (exToggleBtn) exToggleBtn.addEventListener('click', toggleExercises);

  // Unlock audio on first touch (iOS)
  window.addEventListener('touchstart', ensureAudio, { once:true });
});
