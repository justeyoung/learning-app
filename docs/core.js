// core.js — TEST BUILD (10s exercise + 10s break)
console.log("CORE 10s TEST BUILD R1");
document.title = (document.title.split(" | ")[0] || document.title) + " | 10s";

// ---------- CONFIG ----------
const EXERCISE_TIME = 10;   // test duration
const BREAK_TIME    = 10;   // test duration
const TOTAL_SETS    = 3;

const EXERCISES = [
  "Extended Plank",
  "Hollow Hold",
  "Wrist to Knee Crunch",
  "AB Roll Out",
  "Reverse Crunch"
];

// ---------- STATE ----------
let iExercise = 0;      // 0..4
let iSet = 1;           // 1..3
let isExercise = true;  // exercise vs break
let timeLeft = EXERCISE_TIME;
let totalElapsed = 0;
let tickId = null;

// ---------- DOM ----------
const timerEl   = document.getElementById("timer");        // e.g. "00:10"
const statusEl  = document.getElementById("status");       // exercise name / Break
const sinceEl   = document.getElementById("sinceStart");   // since start time
const bars      = Array.from(document.querySelectorAll(".exercise-bar")); // 5 bars
const tics      = Array.from(document.querySelectorAll(".set-tic"));      // 3 dots
const faceEl    = document.getElementById("timer-face");   // ring (border)
const startBtn  = document.getElementById("startBtn");
const pauseBtn  = document.getElementById("pauseBtn");
const resetBtn  = document.getElementById("resetBtn");

// ---------- SOUNDS (kept short so they don't duck Spotify) ----------
const clickS   = new Audio("click.mp3");          clickS.preload="auto"; clickS.volume=0.6;
const beepS    = new Audio("countdown_beep.mp3"); beepS.preload="auto";  beepS.volume=0.75;
const changeS  = new Audio("digital_ping.mp3");   changeS.preload="auto"; changeS.volume=0.85;

// Voice + bell cue (two plays) — filenames must exist next to core.js
const voiceCue = new Audio(encodeURI("new_exercise.mp3"));
voiceCue.preload="auto"; voiceCue.setAttribute("playsinline",""); voiceCue.volume=1.0;

const bellCue  = new Audio(encodeURI("church_bell.mp3"));
bellCue.preload="auto";  bellCue.setAttribute("playsinline","");  bellCue.volume=1.0;

function playClick(){ try{ clickS.currentTime=0; clickS.play(); }catch{} }
function playBeep(){  try{ beepS.currentTime=0;  beepS.play();  }catch{} }
function playChange(){try{ changeS.currentTime=0;changeS.play();}catch{} }

// Play voice + bell twice
function playNewExerciseCueTwice(){
  const playPair = () => {
    try{ voiceCue.currentTime=0; voiceCue.play(); }catch{}
    try{ bellCue.currentTime=0;  bellCue.play();  }catch{}
  };
  playPair();
  setTimeout(playPair, 2500); // play again ~2.5s later
}

// ---------- UI ----------
function formatTime(s){
  const m = Math.floor(s/60).toString().padStart(2,"0");
  const ss = (s%60).toString().padStart(2,"0");
  return `${m}:${ss}`;
}

function paintRing(){
  if (!faceEl) return;
  faceEl.style.borderColor = isExercise ? "#ff2d55" : "#00aaff"; // red exercise / blue break
}

function paintBars(){
  bars.forEach((bar, idx) => {
    bar.classList.remove("active","break","completed");
    if (idx < iExercise) bar.classList.add("completed");
    if (idx === iExercise) bar.classList.add(isExercise ? "active" : "break");
  });
}

function paintTics(){
  tics.forEach((tic, idx) => {
    tic.classList.toggle("done", idx < (iSet - 1));
  });
}

function updateDisplay(){
  if (timerEl)  timerEl.textContent  = formatTime(timeLeft);
  if (statusEl) statusEl.textContent = isExercise ? EXERCISES[iExercise] : "Break";
  if (sinceEl)  sinceEl.textContent  = formatTime(totalElapsed);

  paintRing();
  paintBars();
  paintTics();
}

// ---------- TIMER ----------
function tick(){
  timeLeft--;
  totalElapsed++;

  if (timeLeft <= 5 && timeLeft > 0) playBeep();

  // Cue 10s before end of the 3rd break (iSet=3). With 10s breaks, this fires at the start of that break.
  if (!isExercise && iExercise === 2 && iSet === 3 && timeLeft === 10){
    playNewExerciseCueTwice();
  }

  if (timeLeft <= 0){
    playChange();

    if (isExercise){
      // Exercise finished -> Break
      isExercise = false;
      timeLeft = BREAK_TIME;
    } else {
      // Break finished -> next exercise / next set / finish
      iExercise++;
      if (iExercise >= EXERCISES.length){
        iExercise = 0;
        iSet++;
        if (iSet > TOTAL_SETS){
          stop();
          if (statusEl) statusEl.textContent = "Exercise completed.";
          timeLeft = 0;
          updateDisplay();
          return;
        }
      }
      isExercise = true;
      timeLeft = EXERCISE_TIME;
    }
  }

  updateDisplay();
}

function start(){
  if (tickId) return;
  playClick();
  tickId = setInterval(tick, 1000);
}

function pause(){
  playClick();
  if (tickId){ clearInterval(tickId); tickId = null; }
}

function stop(){
  if (tickId){ clearInterval(tickId); tickId = null; }
}

function reset(){
  playClick();
  stop();
  iExercise = 0;
  iSet = 1;
  isExercise = true;
  timeLeft = EXERCISE_TIME;
  totalElapsed = 0;
  updateDisplay();
}

// ---------- EVENTS ----------
startBtn?.addEventListener("click", start);
pauseBtn?.addEventListener("click", pause);
resetBtn?.addEventListener("click", reset);

// ---------- INIT ----------
updateDisplay();
