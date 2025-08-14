// ===== Core Exercise Tracker =====
// 5 exercises × 3 sets each; every set = 1:00 exercise + 1:00 break

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

// DOM
const exerciseListEl = document.getElementById("exerciseList");
const wheelProgress = document.getElementById("wheelProgress");
const phaseLabel = document.getElementById("phaseLabel");
const timeLabel = document.getElementById("timeLabel");
const setsDots = document.getElementById("setsDots");
const sinceStartEl = document.getElementById("sinceStart");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");

// Build exercise list UI
function renderExerciseList(currentIndex = 0){
  exerciseListEl.innerHTML = "";
  EXERCISES.forEach((name, i) => {
    const item = document.createElement("div");
    item.className = "exercise-item" + (i === currentIndex ? " current" : "");
    item.innerHTML = `<div class="name">${name}</div>`;
    exerciseListEl.appendChild(item);
  });
}

// Build 3 dots for sets
function buildDots(){
  setsDots.innerHTML = "";
  for (let i = 0; i < SETS_PER_EXERCISE; i++){
    const d = document.createElement("div");
    d.className = "dot";
    d.dataset.idx = i;
    setsDots.appendChild(d);
  }
}

// Format mm:ss
function fmt(sec){
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec/60), s = sec % 60;
  return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

// Web Audio beeps (no Spotify ducking)
let audioCtx = null;
function ensureAudio(){
  if (!audioCtx){
    try{ audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }catch{}
  }
}
function beep(freq = 950, dur = 0.1, vol = 0.14){
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'square'; o.frequency.value = freq;
  g.gain.value = vol;
  o.connect(g).connect(audioCtx.destination);
  o.start(t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.stop(t + dur + 0.02);
}

// Plan state
let exIdx = 0;          // which exercise (0..4)
let setIdx = 0;         // which set within exercise (0..2)
let isBreak = false;    // false=exercise, true=break
let running = false;
let timerId = null;
let remaining = EXERCISE_SECS;
let sinceStart = 0;

// Update wheel stroke
function updateWheel(){
  const r = 110, C = 2*Math.PI*r;
  const total = isBreak ? BREAK_SECS : EXERCISE_SECS;
  const ratio = 1 - (remaining / total);
  wheelProgress.style.strokeDasharray = `${C}`;
  wheelProgress.style.strokeDashoffset = `${C * (1 - ratio)}`;
  // color per phase
  wheelProgress.setAttribute('stroke', isBreak ? '#ffa043' : '#4da3ff'); // orange for break, blue for exercise
}

// Update UI labels & highlighting
function updateUI(){
  // exercise list highlight
  Array.from(exerciseListEl.children).forEach((el,i)=>{
    el.classList.toggle("current", i === exIdx && !isBreak);
  });

  // dots
  const dots = setsDots.children;
  for (let i=0;i<dots.length;i++){
    dots[i].classList.toggle('done', i < setIdx);
    // pulse the current set only during the exercise minute
    dots[i].classList.toggle('current', i === setIdx && !isBreak);
    // during break, the just-finished set counts as done
    if (isBreak && i === setIdx) dots[i].classList.add('done');
  }

  // labels
  const name = EXERCISES[exIdx];
  // >>> CHANGE: show just "Break" during rest <<<
  phaseLabel.innerHTML = `<strong>${isBreak ? "Break" : name}</strong>`;
  timeLabel.textContent = fmt(remaining);
  sinceStartEl.textContent = fmt(sinceStart);

  updateWheel();
}

// Advance to next phase in sequence
function advance(){
  if (!isBreak){
    // finished exercise minute -> go to break
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
        // all done
        stop();
        updateUI();
        return;
      }
    }
    remaining = EXERCISE_SECS;
  }
  updateUI();
}

// One-second loop
function loop(){
  remaining -= 1;
  sinceStart += 1;

  if (remaining <= 0){
    remaining = 0;
    updateUI();

    // cues at phase end
    ensureAudio();
    try { navigator.vibrate && navigator.vibrate([180,120,180]); } catch {}
    beep(1200, .12, .16); setTimeout(()=>beep(800,.12,.16),180);

    advance();
  } else {
    // last 5 seconds beep
    if (remaining <= 5) { ensureAudio(); beep(900, .08, .12); }
    updateUI();
  }
}

function start(){
  if (running) return;
  ensureAudio();
  running = true;
  startBtn.classList.add('active');
  pauseBtn.classList.remove('active');
  timerId = setInterval(loop, 1000);
}
function pause(){
  if (!running) return;
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

// Reset everything
function resetAll(){
  stop();
  exIdx = 0; setIdx = 0; isBreak = false;
  remaining = EXERCISE_SECS;
  sinceStart = 0;
  updateUI();
}

// Wire up
document.addEventListener('DOMContentLoaded', () => {
  renderExerciseList(0);
  buildDots();
  updateUI();

  startBtn.addEventListener('click', start);
  pauseBtn.addEventListener('click', pause);
  resetBtn.addEventListener('click', resetAll);

  // Unlock audio on first touch
  window.addEventListener('touchstart', ensureAudio, { once:true });
});
