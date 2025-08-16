// core.js — 5 labelled rows, 10s test, voice+bell cue
console.log("CORE rows-10s-A");

// ===== Config (TEST) =====
const EX_TIME = 10;     // exercise seconds
const BR_TIME = 10;     // break seconds
const TOTAL_SETS = 3;

const NAMES = [
  "Extended Plank",
  "Hollow Hold",
  "Wrist to Knee Crunch",
  "AB Roll Out",
  "Reverse Crunch"
];

// ===== State =====
let exIdx = 0;               // 0..4
let setIdx = 1;              // 1..3
let isExercise = true;       // true=exercise, false=break
let left = EX_TIME;          // seconds left in current phase
let since = 0;               // total seconds since start
let timerId = null;

// ===== DOM =====
const face    = document.getElementById('face');
const statusEl= document.getElementById('status');
const timerEl = document.getElementById('timer');
const sinceEl = document.getElementById('since');

const rows = [
  document.getElementById('row0'),
  document.getElementById('row1'),
  document.getElementById('row2'),
  document.getElementById('row3'),
  document.getElementById('row4')
];

const tics = [
  document.getElementById('tic1'),
  document.getElementById('tic2'),
  document.getElementById('tic3')
];

const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');

// ===== Sounds (short so they don't duck Spotify) =====
const clickS = new Audio("click.mp3");              clickS.volume = 0.6;  clickS.preload="auto";
const beepS  = new Audio("countdown_beep.mp3");     beepS.volume  = 0.75; beepS.preload="auto";
const chgS   = new Audio("digital_ping.mp3");       chgS.volume   = 0.85; chgS.preload="auto";

const voiceCue = new Audio(encodeURI("new_exercise.mp3")); voiceCue.volume=1.0; voiceCue.preload="auto"; voiceCue.setAttribute("playsinline","");
const bellCue  = new Audio(encodeURI("church_bell.mp3"));  bellCue.volume =1.0; bellCue.preload="auto";  bellCue.setAttribute("playsinline","");

function playClick(){ try{clickS.currentTime=0; clickS.play();}catch{} }
function playBeep(){  try{beepS.currentTime=0;  beepS.play(); }catch{} }
function playChange(){try{chgS.currentTime=0;   chgS.play();  }catch{} }

function playVoiceBellTwice(){
  const go=()=>{ try{voiceCue.currentTime=0; voiceCue.play();}catch{} try{bellCue.currentTime=0; bellCue.play();}catch{} };
  go(); setTimeout(go, 2500);
}

// ===== UI =====
const fmt = s => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

function paintRing(){
  face.style.borderColor = isExercise ? "var(--ring-ex)" : "var(--ring-br)";
}
function paintRows(){
  rows.forEach((r,i)=>{
    r.classList.remove('current-ex','current-br','done');
    if (i < exIdx) r.classList.add('done');               // completed earlier in the session
    if (i === exIdx) r.classList.add(isExercise ? 'current-ex' : 'current-br');
  });
}
function paintTics(){
  tics.forEach((t,i)=>{
    t.classList.toggle('done', i < (setIdx - 1));
  });
}
function draw(){
  statusEl.textContent = isExercise ? NAMES[exIdx] : "Break";
  timerEl.textContent  = fmt(left);
  sinceEl.textContent  = fmt(since);
  paintRing();
  paintRows();
  paintTics();
}

// ===== Logic =====
function tick(){
  left -= 1;
  since += 1;

  // last 5 seconds beep
  if (left <= 5 && left > 0) playBeep();

  // Cue 10s before the end of Break #3 (with 10s breaks, that's at the start of that break)
  if (!isExercise && exIdx === 2 && setIdx === 3 && left === 10) {
    playVoiceBellTwice();
  }

  if (left <= 0){
    playChange();

    if (isExercise){
      // switch to break
      isExercise = false;
      left = BR_TIME;
    } else {
      // break -> next exercise / set / finish
      exIdx++;
      if (exIdx >= NAMES.length){
        exIdx = 0;
        setIdx++;
        if (setIdx > TOTAL_SETS){
          stop();
          statusEl.textContent = "Exercise completed.";
          left = 0;
          draw();
          return;
        }
      }
      isExercise = true;
      left = EX_TIME;
    }
  }

  draw();
}

function start(){
  if (timerId) return;
  playClick();
  timerId = setInterval(tick, 1000);
}
function pause(){
  playClick();
  if (timerId){ clearInterval(timerId); timerId = null; }
}
function stop(){
  if (timerId){ clearInterval(timerId); timerId = null; }
}
function reset(){
  playClick();
  stop();
  exIdx = 0; setIdx = 1; isExercise = true; left = EX_TIME; since = 0;
  draw();
}

// ===== Events =====
startBtn.addEventListener('click', start);
pauseBtn.addEventListener('click', pause);
resetBtn.addEventListener('click', reset);

// ===== Init =====
draw();
