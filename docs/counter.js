// ===== Timer + Sets (Spotify‑friendly sounds) =====

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
let duration = 0;
let remaining = 0;
let timerId = null;
let running = false;

// ---- Sounds: Web Audio preferred; tiny HTML5 fallback for clicks only ----
let audioCtx = null;
let clickEl  = null;

function ensureAudio(){
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch { audioCtx = null; }
  }
  if (!clickEl) {
    clickEl = new Audio('Click.mp3'); // case must match your file
    clickEl.preload = 'auto';
    clickEl.volume = 0.15;
  }
}

function beepShort(freq = 950, dur = 0.08, vol = 0.14){
  if (!audioCtx) { try { clickEl.currentTime = 0; clickEl.play(); } catch{}; return; }
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'square';
  o.frequency.value = freq;
  g.gain.value = vol;
  o.connect(g).connect(audioCtx.destination);
  o.start(t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.stop(t + dur + 0.02);
}
function playClick(){ ensureAudio(); beepShort(1000, 0.06, 0.12); }

/* Longer “Time’s up” alert (~2.4s, 8 notes), Web Audio only (doesn't duck Spotify) */
function playAlert() {
  ensureAudio();

  // Vibration haptic
  try { navigator.vibrate && navigator.vibrate([250,120,250,120,250]); } catch {}

  if (!audioCtx) {
    // Fallback: multi-beep pattern (still stays short)
    let n = 0;
    const id = setInterval(() => {
      beepShort(n % 2 ? 700 : 950, 0.14, 0.16);
      if (++n >= 8) clearInterval(id);
    }, 300);
    return;
  }

  const ctx = audioCtx;
  const start = ctx.currentTime;
  const seq = [
    { t: 0.00, f: 880,  d: 0.18 },
    { t: 0.24, f: 660,  d: 0.18 },
    { t: 0.48, f: 990,  d: 0.18 },
    { t: 0.84, f: 880,  d: 0.22 },
    { t: 1.12, f: 660,  d: 0.22 },
    { t: 1.40, f: 1046, d: 0.20 }, // C6
    { t: 1.80, f: 880,  d: 0.25 },
    { t: 2.10, f: 660,  d: 0.25 }
  ];

  seq.forEach(({ t, f, d }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = f;
    gain.gain.value = 0.0001;  // start silent
    osc.connect(gain).connect(ctx.destination);
    osc.start(start + t);
    gain.gain.exponentialRampToValueAtTime(0.18, start + t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + t + d);
    osc.stop(start + t + d + 0.02);
  });
}

// ---- Utils ----
function fmt(sec){
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec/60);
  const s = sec % 60;
  return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}
function setDisplay(sec){ display.textContent = fmt(sec); }

// ---- Presets ----
function clearPresetActive(){ presets.forEach(b => b.classList.remove('active')); }
presets.forEach(btn=>{
  btn.addEventListener('click', ()=>{
    ensureAudio(); playClick();
    clearPresetActive();
    btn.classList.add('active');
    duration = parseInt(btn.dataset.seconds, 10) || 0;
    remaining = duration;
    setDisplay(remaining);
    timesUpEl.textContent = '';
    startBtn.classList.remove('active');
    pauseBtn.classList.remove('active');
    stopTimer();
  });
});

// ---- Core timer ----
function tick(){
  remaining -= 1;
  setDisplay(remaining);
  if (remaining <= 0){
    stopTimer();
    setDisplay(0);
    timesUpEl.textContent = "Time's up!";
    playAlert();
  }
}
function startTimer(){
  if (running) return;
  ensureAudio(); playClick();
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
  ensureAudio(); playClick();
  stopTimer();
  pauseBtn.classList.add('active');
  startBtn.classList.remove('active');
}
function resetTimer(){
  ensureAudio(); playClick();
  stopTimer();
  remaining = 0;
  setDisplay(0);
  clearPresetActive();
  startBtn.classList.remove('active');
  pauseBtn.classList.remove('active');
  timesUpEl.textContent = '';
}
function stopTimer(){
  running = false;
  if (timerId){ clearInterval(timerId); timerId = null; }
}

// ---- Custom time (prompt mm + ss) ----
customBtn.addEventListener('click', ()=>{
  ensureAudio(); playClick();
  const mm = prompt('Minutes?', '0');
  if (mm === null) return;
  const ss = prompt('Seconds?', '30');
  if (ss === null) return;
  const m = Math.max(0, parseInt(mm,10)||0);
  const s = Math.max(0, parseInt(ss,10)||0);
  duration = m*60 + s;
  remaining = duration;
  setDisplay(remaining);
  clearPresetActive();
  startBtn.classList.remove('active');
  pauseBtn.classList.remove('active');
  timesUpEl.textContent = '';
  stopTimer();
});

// ---- Controls ----
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);

// ---- Sets (toggle red on/off, click sound) ----
setsRow.addEventListener('click', (e)=>{
  const btn = e.target.closest('.set-btn');
  if (!btn) return;
  ensureAudio(); playClick();
  btn.classList.toggle('active');
});

// Init
setDisplay(0);
window.addEventListener('touchstart', ensureAudio, { once:true });
