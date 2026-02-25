// ===== Timer + Sets (Spotify-friendly sounds) =====

// Elements
const display   = document.getElementById('timeDisplay');
const presets   = document.querySelectorAll('.preset');
const startBtn  = document.getElementById('startBtn');
const pauseBtn  = document.getElementById('pauseBtn');
const resetBtn  = document.getElementById('resetBtn');
const customBtn = document.getElementById('customBtn');
const setsRow   = document.getElementById('setsRow');
const timesUpEl = document.getElementById('timesUp');

// State
let duration  = 0;     // seconds selected
let remaining = 0;     // seconds left
let timerId   = null;
let running   = false;

// ===== Web Audio (no Spotify ducking) =====
let audioCtx = null;
let clickFallback = null; // tiny fallback if Web Audio unavailable

function ensureAudio(){
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch { audioCtx = null; }
  }
  if (!clickFallback) {
    // Low-volume click fallback – browsers treat short effects leniently
    clickFallback = new Audio('click.mp3'); // case must match your file
    clickFallback.preload = 'auto';
    clickFallback.volume = 0.15;
  }
}

function tone({freq=950, dur=0.1, vol=0.14, type='square', when=0} = {}){
  if (!audioCtx) { try { clickFallback.currentTime = 0; clickFallback.play(); } catch{}; return; }
  const t = audioCtx.currentTime + when;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = 0.0001;                       // start silent (no click)
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.stop(t + dur + 0.02);
}

function clickTone(){ ensureAudio(); tone({freq: 1000, dur: 0.06, vol: 0.12}); }

function countdownBeep(n){ // n = 5..1
  ensureAudio();
  const freq = ({5:800,4:850,3:900,2:950,1:1000})[n] || 900;
  tone({freq, dur:0.09, vol:0.14});
}

// Clear, longer time-up chime (~2.4s, 8 notes) – still Web Audio only
function timeUpChime(){
  ensureAudio();
  try { navigator.vibrate && navigator.vibrate([240,120,240]); } catch {}
  if (!audioCtx) { // fallback quick series
    let n = 0; const id = setInterval(()=>{ countdownBeep((n%5)+1); if(++n>=8) clearInterval(id); }, 240);
    return;
  }
  const start = audioCtx.currentTime;
  const seq = [
    { t: 0.00, f: 880,  d: 0.16 },
    { t: 0.22, f: 660,  d: 0.16 },
    { t: 0.44, f: 990,  d: 0.16 },
    { t: 0.72, f: 880,  d: 0.20 },
    { t: 1.02, f: 660,  d: 0.20 },
    { t: 1.34, f: 1046, d: 0.18 }, // C6
    { t: 1.70, f: 880,  d: 0.22 },
    { t: 2.04, f: 660,  d: 0.22 }
  ];
  seq.forEach(({t,f,d}) => tone({freq:f, dur:d, vol:0.16, when:t}));
}

// ===== Utils =====
function fmt(sec){
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec/60);
  const s = sec % 60;
  return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}
function setDisplay(sec){ display.textContent = fmt(sec); }
function stopTimer(){ running = false; if (timerId){ clearInterval(timerId); timerId = null; } }

// ===== Presets =====
function clearPresetActive(){ presets.forEach(b => b.classList.remove('active')); }

presets.forEach(btn=>{
  btn.addEventListener('click', ()=>{
    ensureAudio(); clickTone();
    clearPresetActive();
    btn.classList.add('active');
    duration  = parseInt(btn.dataset.seconds, 10) || 0;
    remaining = duration;
    setDisplay(remaining);
    timesUpEl.textContent = '';
    startBtn.classList.remove('active');
    pauseBtn.classList.remove('active');
    stopTimer();
  });
});

// ===== Core timer =====
function tick(){
  remaining -= 1;
  setDisplay(remaining);

  if (remaining > 0 && remaining <= 5){
    // beep on each of last 5 seconds
    countdownBeep(remaining);
  }

  if (remaining <= 0){
    stopTimer();
    setDisplay(0);
    timesUpEl.textContent = "Time's up!";
    timeUpChime();
  }
}

function startTimer(){
  if (running) return;
  ensureAudio(); clickTone();
  if (remaining <= 0) {
    remaining = duration || 0;
    setDisplay(remaining);
  }
  if (remaining <= 0) return; // nothing to run
  running = true;
  startBtn.classList.add('active');
  pauseBtn.classList.remove('active');
  timesUpEl.textContent = '';
  timerId = setInterval(tick, 1000);
}

function pauseTimer(){
  if (!running) return;
  ensureAudio(); clickTone();
  stopTimer();
  pauseBtn.classList.add('active');
  startBtn.classList.remove('active');
}

function resetTimer(){
  ensureAudio(); clickTone();
  stopTimer();
  remaining = 0;
  setDisplay(0);
  clearPresetActive();
  startBtn.classList.remove('active');
  pauseBtn.classList.remove('active');
  timesUpEl.textContent = '';
}

// ===== Custom time (simple prompts) =====
customBtn.addEventListener('click', ()=>{
  ensureAudio(); clickTone();
  const mm = prompt('Minutes?', '0');
  if (mm === null) return;
  const ss = prompt('Seconds?', '30');
  if (ss === null) return;
  const m = Math.max(0, parseInt(mm,10) || 0);
  const s = Math.max(0, parseInt(ss,10) || 0);
  duration  = m*60 + s;
  remaining = duration;
  setDisplay(remaining);
  clearPresetActive();
  startBtn.classList.remove('active');
  pauseBtn.classList.remove('active');
  timesUpEl.textContent = '';
  stopTimer();
});

// ===== Controls =====
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);

// ===== Sets toggles (click sound + red active) =====
setsRow.addEventListener('click', (e)=>{
  const btn = e.target.closest('.set-btn');
  if (!btn) return;
  ensureAudio(); clickTone();
  btn.classList.toggle('active');
});

// ===== Init =====
setDisplay(0);
// Unlock audio on first touch (iOS)
window.addEventListener('touchstart', ensureAudio, { once:true });
