// ===== Core Exercise Tracker (everything restored + robust) =====

// ------------ CONFIG ------------
const EXERCISES = [
  "Extended Plank",
  "Hollow Hold",
  "Wrist to Knee Crunch",
  "AB Roll Out",
  "Reverse Crunch"
];
const TOTAL_SETS = 3;

// TEST durations (change to 60 for real use)
const EXERCISE_SECS = 20;
const BREAK_SECS   = 20;

// Special cue: speak/bell this many seconds before end of Break 3
const LEAD_CUE_SECONDS = 10;
const SPECIAL_EX_IDX   = 2;                  // 3rd exercise (0-based)
const SPECIAL_SET_IDX  = TOTAL_SETS - 1;     // 3rd set (0-based)

// ------------ STATE ------------
let exIdx = 0;                // 0..4
let setIdx = 0;               // 0..2
let isBreak = false;
let running = false;
let finished = false;
let tickId = null;
let remaining = EXERCISE_SECS;
let sinceStart = 0;

let leadCueFired = false;
let leadCueTimeout = null;

// ------------ DOM (with fallbacks) ------------
let timeEl, sinceEl, phaseEl;
let wheelProgress;
let exerciseListEl, setsEl;
let startBtn, pauseBtn, resetBtn, toggleBtn, toggleArrow;

// ------------ AUDIO (beeps that don't duck Spotify) ------------
let audioCtx = null;
function ensureAudio(){
  if (!audioCtx){
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
  }
}
function tone(freq=950, dur=0.1, vol=0.14, type='square', when=0){
  if (!audioCtx) return;
  vol *= 1.2; // +20%
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

// ------------ VOICE + CHURCH BELL (same folder as core.js) ------------
const NEW_EXERCISE_SRC = encodeURI("new_exercise.mp3");
const CHURCH_BELL_SRC  = encodeURI("church_bell.mp3");

const newExerciseAudio = new Audio(NEW_EXERCISE_SRC);
newExerciseAudio.preload = "auto";
newExerciseAudio.setAttribute("playsinline", "");
newExerciseAudio.volume = 1.0;

const churchBellAudio = new Audio(CHURCH_BELL_SRC);
churchBellAudio.preload = "auto";
churchBellAudio.setAttribute("playsinline", "");
churchBellAudio.volume = 1.0;

let cuePrimed = false;
function primeCueAudio(){
  if (cuePrimed) return;
  cuePrimed = true;
  const prime = a => a.play().then(()=>{ a.pause(); a.currentTime=0; }).catch(()=>{});
  prime(newExerciseAudio);
  prime(churchBellAudio);
}
function playNewExerciseCue(){
  try {
    newExerciseAudio.pause(); newExerciseAudio.currentTime = 0;
    churchBellAudio.pause();  churchBellAudio.currentTime  = 0;
    newExerciseAudio.play().catch(()=>{});
    setTimeout(()=> churchBellAudio.play().catch(()=>{}), 200);
  } catch {}
}

// ------------ BUILDERS (5 bars + 3 tic-tacs) ------------
function buildExerciseBars(){
  if (!exerciseListEl) return;
  exerciseListEl.innerHTML = "";
  EXERCISES.forEach(name => {
    const row = document.createElement("div");
    row.className = "exercise-bar";
    const nm = document.createElement("div");
    nm.className = "exercise-name";
    nm.textContent = name;
    row.appendChild(nm);
    exerciseListEl.appendChild(row);
  });
}
function buildSetDots(){
  if (!setsEl) return;
  setsEl.innerHTML = "";
  for (let i=0;i<TOTAL_SETS;i++){
    const d = document.createElement("div");
    d.className = "set-dot";
    d.dataset.idx = i;
    setsEl.appendChild(d);
  }
}

// ------------ UI HELPERS ------------
function fmt(sec){
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec/60), s = sec % 60;
  return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}
function updateWheel(){
  if (!wheelProgress) return;
  const r = 110, C = 2*Math.PI*r;
  const total = isBreak ? BREAK_SECS : EXERCISE_SECS;
  const ratio = finished ? 1 : (1 - (remaining / total));
  wheelProgress.style.strokeDasharray  = `${C}`;
  wheelProgress.style.strokeDashoffset = `${C * (1 - ratio)}`;
  wheelProgress.setAttribute('stroke', isBreak ? '#00aaff' : '#ff2d55'); // blue break / red exercise
}
function updateBars(){
  if (!exerciseListEl) return;
  const rows = Array.from(exerciseListEl.children);
  rows.forEach((row, i) => {
    row.classList.remove("current","break-current","completed");
    if (i < exIdx) row.classList.add("completed");
    if (i === exIdx){
      row.classList.add(isBreak ? "break-current" : "current");
    }
  });
}
function updateSetDots(){
  if (!setsEl) return;
  const dots = Array.from(setsEl.children);
  dots.forEach((d,i)=>{
    d.classList.toggle("done", i < setIdx || finished);
    d.classList.toggle("current", i === setIdx && !isBreak && !finished);
    if (isBreak && i === setIdx) d.classList.add("done");
  });
}
function updateUI(){
  if (phaseEl){
    if (finished) phaseEl.innerHTML = `<strong>Exercise completed.</strong>`;
    else phaseEl.innerHTML = `<strong>${isBreak ? "Break" : EXERCISES[exIdx]}</strong>`;
  }
  if (timeEl) timeEl.textContent = fmt(remaining);
  if (sinceEl) sinceEl.textContent = fmt(sinceStart);

  updateWheel();
  updateBars();
  updateSetDots();
}

// ------------ CUE SCHEDULING ------------
function clearLeadCueTimeout(){
  if (leadCueTimeout){ clearTimeout(leadCueTimeout); leadCueTimeout = null; }
}
function scheduleLeadCueIfSpecialBreak(){
  if (exIdx === SPECIAL_EX_IDX && setIdx === SPECIAL_SET_IDX){
    // schedule at (BREAK - LEAD) seconds from break start
    const delay = Math.max(0, (BREAK_SECS - LEAD_CUE_SECONDS) * 1000);
    leadCueFired = false;
    clearLeadCueTimeout();
    leadCueTimeout = setTimeout(()=>{
      if (isBreak && exIdx === SPECIAL_EX_IDX && setIdx === SPECIAL_SET_IDX && !finished && !leadCueFired){
        leadCueFired = true;
        playNewExerciseCue();
      }
    }, delay);
  } else {
    // not the special break; ensure nothing fires
    leadCueFired = true;
    clearLeadCueTimeout();
  }
}

// ------------ PHASE PROGRESSION ------------
function advance(){
  if (!isBreak){
    // exercise -> break
    isBreak = true;
    remaining = BREAK_SECS;
    scheduleLeadCueIfSpecialBreak();
  } else {
    // break -> next set/exercise
    isBreak = false;
    clearLeadCueTimeout();

    setIdx += 1;
    if (setIdx >= TOTAL_SETS){
      setIdx = 0;
      exIdx += 1;
      if (exIdx >= EXERCISES.length){
        finished = true;
        stop();
        updateUI();
        return;
      }
      exerciseChangeSound();
    }
    remaining = EXERCISE_SECS;
  }
  updateUI();
}

// ------------ TICK LOOP (1 Hz) ------------
function tick(){
  remaining -= 1;
  sinceStart += 1;

  // Last-5s beeps
  if (remaining > 0 && remaining <= 5) countdownBeep(remaining);

  // Safety net for the special cue (in case setTimeout is throttled)
  if (isBreak && exIdx === SPECIAL_EX_IDX && setIdx === SPECIAL_SET_IDX && !leadCueFired){
    if (remaining <= LEAD_CUE_SECONDS && remaining > 0){
      leadCueFired = true;
      playNewExerciseCue();
      clearLeadCueTimeout();
    }
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

// ------------ CONTROLS ------------
function start(){
  if (running || finished) return;
  clickTone();
  ensureAudio();
  primeCueAudio();
  running = true;
  // If not started yet (0), start the exercise timer
  if (remaining <= 0) remaining = EXERCISE_SECS;
  startBtn && startBtn.classList.add('active');
  pauseBtn && pauseBtn.classList.remove('active');
  clearInterval(tickId);
  tickId = setInterval(tick, 1000);
}
function pause(){
  if (!running) return;
  clickTone();
  running = false;
  if (tickId){ clearInterval(tickId); tickId = null; }
  pauseBtn && pauseBtn.classList.add('active');
  startBtn && startBtn.classList.remove('active');
}
function stop(){
  running = false;
  if (tickId){ clearInterval(tickId); tickId = null; }
  startBtn && startBtn.classList.remove('active');
  pauseBtn && pauseBtn.classList.remove('active');
}
function resetAll(){
  clickTone();
  stop();
  exIdx = 0; setIdx = 0; isBreak = false; finished = false;
  remaining = EXERCISE_SECS; sinceStart = 0;
  leadCueFired = false; clearLeadCueTimeout();
  buildExerciseBars();
  buildSetDots();
  exerciseListEl && exerciseListEl.classList.remove('collapsed');
  updateUI();
}

// ------------ ACCORDION ------------
function toggleExercises(){
  if (!exerciseListEl) return;
  const collapsed = exerciseListEl.classList.toggle('collapsed');
  if (toggleArrow) toggleArrow.textContent = collapsed ? '▼' : '▲';
  clickTone();
}

// ------------ INIT ------------
document.addEventListener('DOMContentLoaded', () => {
  // Time / labels
  timeEl       = document.getElementById('time')   || document.getElementById('timer');
  sinceEl      = document.getElementById('sinceStart');
  phaseEl      = document.getElementById('exerciseTitle') || document.getElementById('phaseLabel');

  // Wheel (SVG circle path)
  wheelProgress = document.getElementById('wheelProgress');

  // Lists
  exerciseListEl = document.getElementById('exerciseList');
  setsEl         = document.getElementById('setsDots') || document.getElementById('setIndicators');

  // Buttons
  startBtn   = document.getElementById('startBtn');
  pauseBtn   = document.getElementById('pauseBtn');
  resetBtn   = document.getElementById('resetBtn');
  toggleBtn  = document.getElementById('exToggle') || document.getElementById('toggleExercises') || document.querySelector('.ex-accordion');
  toggleArrow= document.getElementById('exArrow')  || (toggleBtn ? toggleBtn.querySelector('.arrow') : null);

  // Build once (5 bars + 3 tic-tacs)
  buildExerciseBars();
  buildSetDots();

  // Force expanded on load
  exerciseListEl && exerciseListEl.classList.remove('collapsed');

  // Initial UI
  updateUI();

  // Events
  startBtn && startBtn.addEventListener('click', start);
  pauseBtn && pauseBtn.addEventListener('click', pause);
  resetBtn && resetBtn.addEventListener('click', resetAll);
  toggleBtn && toggleBtn.addEventListener('click', toggleExercises);

  // Prime audio + audiocontext on first touch (iOS)
  window.addEventListener('touchstart', primeCueAudio, { once:true });
  window.addEventListener('touchstart', ensureAudio,   { once:true });
});
