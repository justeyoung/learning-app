// ===== Core Exercise Tracker (Spotify-friendly sounds, +20% volume) =====
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

// Build exercise list UI (5 bars)
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
function exerciseChangeSound(){ ensureAudio(); tone(700,0.12,0.16
