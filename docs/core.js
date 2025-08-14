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

// Build exercise list UI (this is what brings your 5 bars back)
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
function clickTone(){ ensureAudio(); tone(1000, 0.06, 0.12, 'square'); }
function phaseChime(){ ensureAudio(); tone(1200,.12,.16,'square',0); tone(800,.12,.16,'square',0.18); }
function countdownBeep(n){ ensureAudio(); const f={1:1000,2:950,3:900,4:850,5:800}[n]||880; tone(f,0.09,0.14,'square'); }
function exerciseChangeSound(){ ensureAudio(); tone(700,0.12,0.16,'square',0); tone(900,0.12,0.16,'square',0.20); tone(1100,0.12,0.16,'square',0.40); }

// ===== Plan state =====
let exIdx = 0;          // which exercise (0..4)
let setIdx = 0;         // which set within exercise (0..2)
let isBreak = false;    // false=exercise, true=break
let running = false;
let timerId = null;
let remaining = EXERCISE_SECS;
let sinceStart = 0;

// Update wheel stroke + color (EXERCISE = RED, BREAK = BLUE)
function updateWheel(){
  const r = 110, C = 2*Math.PI*r;
  const total = isBreak ? BREAK_SECS : EXERCISE_SECS;
  const ratio = 1 - (remaining / total);
  wheelProgress.style.strokeDasharray = `${C}`;
  wheelProgress.style.strokeDashoffset = `${C * (1 - ratio)}`;
  wheelProgress.setAttribute('stroke', isBreak ? '#00aaff' : '#ff2d55'); // blue break, red exercise
}

// Update UI labels & highlighting
function updateUI(){
  // Exercise list: green digital text only when in exercise phase
  Array.from(exerciseListEl.children).forEach((el,i)=>{
    el.classList.toggle("current", i === exIdx && !isBreak);
  });

  // Set dots
  const dots = setsDots.children;
  for (let i=0;i<dots.length;i++){
    dots[i].classList.toggle('done', i < setIdx);
    dots[i].classList.toggle('current', i === setIdx && !isBreak);
    if (isBreak && i === setIdx) dots[i].classList.add('done'); // just finished set
  }

  // Labels
  const name = EXERCISES[exIdx];
  phaseLabel.innerHTML = `<strong>${isBreak ? "Break" : name}</strong>`;
  timeLabel.textContent = fmt(remaining);
  sinceStartEl.textContent = fmt(sinceStart);

  updateWheel();
}

// Advance to next phase in sequence
function advance(){
  if (!isBreak){
    // finished exercise -> go to break
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
      exerciseChangeSound(); // special sound when NEW exercise starts
    }
    remaining = EXERCISE_SECS;
  }
  updateUI();
}

// One-second loop
function loop(){
  remaining -= 1;
  sinceStart += 1;

  if (remaining > 0 && remaining <= 5){
    countdownBeep(remaining); // last-5-seconds beeps
  }

  if (remaining <= 0){
    remaining = 0;
    updateUI();

    // cues at each phase end
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

// Reset everything
function resetAll(){
  clickTone();
  stop();
  exIdx = 0; setIdx = 0; isBreak = false;
  remaining = EXERCISE_SECS;
  sinceStart = 0;
  renderExerciseList(0); // re-render list to ensure bars exist & reset highlight
  buildDots();           // reset dots
  updateUI();
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  renderExerciseList(0);  // << builds the 5 exercise bars
  buildDots();            // << builds the 3 set dots
  updateUI();

  startBtn.addEventListener('click', start);
  pauseBtn.addEventListener('click', pause);
  resetBtn.addEventListener('click', resetAll);

  // Unlock audio on first touch
  window.addEventListener('touchstart', ensureAudio, { once:true });
});
