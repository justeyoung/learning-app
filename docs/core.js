// ===== Core Exercise Tracker (with Spotify-friendly sounds) =====
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
const wheelProgress  = document.getElementById("wheelProgress");
const phaseLabel     = document.getElementById("phaseLabel");
const timeLabel      = document.getElementById("timeLabel");
const setsDots       = document.getElementById("setsDots");
const sinceStartEl   = document.getElementById("sinceStart");

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

// ===== Web Audio (no Spotify ducking) =====
let audioCtx = null;
function ensureAudio(){
  if (!audioCtx){
    try{ audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }catch{}
  }
}
function tone(freq = 950, dur = 0.1, vol = 0.14, type = 'square', when = 0){
  if (!audioCtx) return;
  const t = audioCtx.currentTime + when;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.value = 0.0001;                 
  o.connect(g).connect(audioCtx.destination);
  o.start(t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.stop(t + dur + 0.02);
}

// click sound for buttons
function clickTone(){ ensureAudio(); tone(1000, 0.06, 0.12, 'square'); }
// two-note chime at phase change
function phaseChime(){
  ensureAudio();
  tone(1200, .12, .16, 'square', 0.00);
  tone( 800, .12, .16, 'square', 0.18);
}
// countdown beep for last 5 seconds
function countdownBeep(n){ 
  ensureAudio();
  const freq = ({1:1000,2:950,3:900,4:850,5:800})[n] || 850;
  tone(freq, 0.09, 0.14, 'square');
}
// special triple-tone for NEW exercise
function exerciseChangeSound(){
  ensureAudio();
  tone(700, 0.12, 0.16, 'square', 0.00);
  tone(900, 0.12, 0.16, 'square', 0.20);
  tone(1100, 0.12, 0.16, 'square', 0.40);
}

// ===== Plan state =====
let exIdx = 0;         
let setIdx = 0;        
let isBreak = false;   
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
  wheelProgress.setAttribute('stroke', isBreak ? '#ffa043' : '#4da3ff'); 
}

// Update UI
function updateUI(){
  Array.from(exerciseListEl.children).forEach((el,i)=>{
    el.classList.toggle("current", i === exIdx && !isBreak);
  });

  const dots = setsDots.children;
  for (let i=0;i<dots.length;i++){
    dots[i].classList.toggle('done', i < setIdx);
    dots[i].classList.toggle('current', i === setIdx && !isBreak);
    if (isBreak && i === setIdx) dots[i].classList.add('done');
  }

  const name = EXERCISES[exIdx];
  phaseLabel.innerHTML = `<strong>${isBreak ? "Break" : name}</strong>`;
  timeLabel.textContent = fmt(remaining);
  sinceStartEl.textContent = fmt(sinceStart);

  updateWheel();
}

// Advance phase
function advance(){
  if (!isBreak){
    // finished exercise
    isBreak = true;
    remaining = BREAK_SECS;
  } else {
    // finished break -> next set/exercise
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
      exerciseChangeSound(); // <<< special sound when NEW exercise starts
    }
    remaining = EXERCISE_SECS;
  }
  updateUI();
}

// Loop
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
  updateUI();
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  renderExerciseList(0);
  buildDots();
  updateUI();

  startBtn.addEventListener('click', start);
  pauseBtn.addEventListener('click', pause);
  resetBtn.addEventListener('click', resetAll);

  window.addEventListener('touchstart', ensureAudio, { once:true });
});
