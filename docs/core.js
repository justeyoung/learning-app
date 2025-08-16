// ===== Core Exercise Tracker (bars restored + reliable accordion + voice+bell cue @ T-10s of Break 3) =====

// ---------- CONFIG ----------
const EXERCISES = [
  "Extended Plank",
  "Hollow Hold",
  "Wrist to Knee Crunch",
  "AB Roll Out",
  "Reverse Crunch"
];
const TOTAL_SETS = 3;

// Test durations (change to 60 for real use)
const EXERCISE_SECS = 20;
const BREAK_SECS   = 20;

// Special voice/bell cue timing
const LEAD_CUE_SECONDS = 10;     // speak this many seconds before the end
const SPECIAL_EX_IDX   = 2;      // after 3rd exercise
const SPECIAL_SET_IDX  = TOTAL_SETS - 1; // after 3rd set

// ---------- STATE ----------
let exIdx = 0;          // 0..4
let setIdx = 0;         // 0..(TOTAL_SETS-1)
let isBreak = false;
let running = false;
let finished = false;
let timerId = null;
let remaining = EXERCISE_SECS;
let sinceStart = 0;

// One-time gate + timeout for the special cue
let leadCueFired = false;
let leadCueTimeout = null;

// ---------- DOM ----------
let timeLabel, sinceStartLabel, phaseLabel;
let wheelProgress;
let exerciseListEl, setsEl;
let startBtn, pauseBtn, resetBtn, toggleBtn, toggleArrow;

// ---------- AUDIO (non-ducking tones) ----------
let audioCtx = null;
function ensureAudio(){
  if (!audioCtx) {
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

// ---------- VOICE + CHURCH BELL (files in SAME folder as core.js) ----------
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

// Prime both on first gesture (iOS autoplay policy)
let audioPrimed = false;
function primeCueAudio(){
  if (audioPrimed) return;
  audioPrimed = true;
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

// ---------- BUILDERS (5 bars + sets) ----------
function buildExerciseBars(){
  if (!exerciseListEl) return;
  exerciseListEl.innerHTML = "";
  EXERCISES.forEach((name, i) => {
    const row = document.createElement("div");
    row.className = "exercise-bar";
    const label = document.createElement("div");
    label.className = "exercise-name";
    label.textContent = name;
    row.appendChild(label);
    exerciseListEl.appendChild(row);
  });
}

function buildSets(){
  if (!setsEl) return;
  setsEl.innerHTML = "";
  for (let i=0;i<TOTAL_SETS;i++){
    const d = document.createElement("div");
    d.className = "set-dot";
    d.dataset.idx = i;
    setsEl.appendChild(d);
  }
}

// ---------- UI HELPERS ----------
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
  wheelProgress.style.strokeDasharray = `${C}`;
  wheelProgress.style.strokeDashoffset = `${C * (1 - ratio)}`;
  wheelProgress.setAttribute('stroke', isBreak ? '#00aaff' : '#ff2d55'); // blue break / red exercise
}

function updateBars(){
  if (!exerciseListEl) return;
  const rows = Array.from(exerciseListEl.children);
  rows.forEach((row, i) => {
    row.classList.remove("current", "break-current", "completed");
    if (i < exIdx) row.classList.add("completed");
    if (i === exIdx){
      row.classList.add(isBreak ? "break-current" : "current");
    }
  });
}

function updateSetDots(){
  if (!setsEl) return;
  const dots = Array.from(setsEl.children);
  dots.forEach((d, i) => {
    d.classList.toggle("done", i < setIdx || finished);
    d.classList.toggle("current", i === setIdx && !isBreak && !finished);
    if (isBreak && i === setIdx) d.classList.add("done");
  });
}

function updateUI(){
  if (phaseLabel) {
    if (finished) phaseLabel.innerHTML = `<strong>Exercise completed.</strong>`;
    else phaseLabel.innerHTML = `<strong>${isBreak ? "Break" : EXERCISES[exIdx]}</strong>`;
  }
  if (timeLabel) timeLabel.textContent = fmt(remaining);
  if (sinceStartLabel) sinceStartLabel.textContent = fmt(sinceStart);

  updateWheel();
  updateBars();
  updateSetDots();
}

// Clear any pending cue timer
function clearLeadCueTimeout(){
  if (leadCueTimeout) {
    clearTimeout(leadCueTimeout);
    leadCueTimeout = null;
  }
}

// ---------- PHASE PROGRESSION ----------
function scheduleLeadCueIfSpecialBreak(){
  // Only for the specific break: after Exercise 3 (index 2), Set 3 (index 2)
  if (exIdx === SPECIAL_EX_IDX && setIdx === SPECIAL_SET_IDX){
    const delayMs = Math.max(0, (BREAK_SECS - LEAD_CUE_SECONDS) * 1000);
    leadCueFired = false;
    clearLeadCueTimeout();
    leadCueTimeout = setTimeout(() => {
      if (isBreak && exIdx === SPECIAL_EX_IDX && setIdx === SPECIAL_SET_IDX && !finished && !leadCueFired){
        leadCueFired = true;
        playNewExerciseCue();
      }
    }, delayMs);
  } else {
    leadCueFired = true; // not the special break; prevent accidental fire
    clearLeadCueTimeout();
  }
}

function advance(){
  if (!isBreak){
    // -> Break
    isBreak = true;
    remaining = BREAK_SECS;
    scheduleLeadCueIfSpecialBreak();
  } else {
    // Break -> next set/exercise
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
      exerciseChangeSound(); // short cue for regular transitions
    }
    remaining = EXERCISE_SECS;
  }
  updateUI();
}

// ---------- LOOP ----------
function tick(){
  remaining -= 1;
  sinceStart += 1;

  // Last 5 seconds beep
  if (remaining > 0 && remaining <= 5) countdownBeep(remaining);

  // Safety net: if timers get throttled, fire the lead cue as soon as we're inside the window
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

// ---------- CONTROLS ----------
function start(){
  if (running || finished) return;
  clickTone();
  ensureAudio();
  primeCueAudio();
  running = true;
  startBtn && startBtn.classList.add('active');
  pauseBtn && pauseBtn.classList.remove('active');
  timerId = setInterval(tick, 1000);
}
function pause(){
  if (!running) return;
  clickTone();
  running = false;
  if (timerId){ clearInterval(timerId); timerId = null; }
  pauseBtn && pauseBtn.classList.add('active');
  startBtn && startBtn.classList.remove('active');
}
function stop(){
  running = false;
  if (timerId){ clearInterval(timerId); timerId = null; }
  startBtn && startBtn.classList.remove('active');
  pauseBtn && pauseBtn.classList.remove('active');
}
function resetAll(){
  clickTone();
  stop();
  exIdx = 0; setIdx = 0; isBreak = false; finished = false;
  remaining = EXERCISE_SECS; sinceStart = 0;
  leadCueFired = false;
  clearLeadCueTimeout();
  buildExerciseBars();
  buildSets();
  exerciseListEl && exerciseListEl.classList.remove('collapsed'); // force expanded
  updateUI();
}

// ---------- ACCORDION ----------
function toggleExercises(){
  if (!exerciseListEl) return;
  const collapsed = exerciseListEl.classList.toggle('collapsed');
  if (toggleArrow) toggleArrow.textContent = collapsed ? '▼' : '▲';
  clickTone();
}

// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', () => {
  // Grab DOM
  timeLabel        = document.getElementById('time');
  sinceStartLabel  = document.getElementById('sinceStart');
  phaseLabel       = document.getElementById('exerciseTitle') || document.getElementById('phaseLabel');
  wheelProgress    = document.getElementById('wheelProgress');
  exerciseListEl   = document.getElementById('exerciseList');
  setsEl           = document.getElementById('setIndicators') || document.getElementById('setsDots');
  startBtn         = document.getElementById('startBtn');
  pauseBtn         = document.getElementById('pauseBtn');
  resetBtn         = document.getElementById('resetBtn');
  toggleBtn        = document.getElementById('toggleExercises') || document.getElementById('exToggle') || document.querySelector('.ex-accordion');
  toggleArrow      = document.getElementById('exArrow') || (toggleBtn ? toggleBtn.querySelector('.arrow') : null);

  // Build bars & sets ONCE (this restores the 5 bars)
  buildExerciseBars();
  buildSets();

  // Ensure expanded on load
  exerciseListEl && exerciseListEl.classList.remove('collapsed');

  // Initial UI
  updateUI();

  // Events
  startBtn && startBtn.addEventListener('click', start);
  pauseBtn && pauseBtn.addEventListener('click', pause);
  resetBtn && resetBtn.addEventListener('click', resetAll);
  toggleBtn && toggleBtn.addEventListener('click', toggleExercises);

  // Also prime audio on first touch (iOS)
  window.addEventListener('touchstart', primeCueAudio, { once:true });
  window.addEventListener('touchstart', ensureAudio,   { once:true });
});
