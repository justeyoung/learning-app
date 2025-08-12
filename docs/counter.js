// ===== Timer + Sets (with Spotify‑friendly sounds) =====

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
let duration = 0;      // seconds selected
let remaining = 0;     // seconds left
let timerId = null;
let running = false;

// --- Sounds: Web Audio preferred, HTML5 fallback ---
let audioCtx = null;
let clickEl  = null;
let alertEl  = null;

function ensureAudio(){
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch { audioCtx = null; }
  }
  if (!clickEl) {
    clickEl = new Audio('Click.mp3'); // matches your /docs filename (case sensitive)
    clickEl.preload = 'auto';
    clickEl.volume = 0.15;
  }
  if (!alertEl) {
    alertEl = new Audio('Alert.wav'); // matches your /docs filename (case sensitive)
    alertEl.preload = 'auto';
    alertEl.volume = 0.35;
  }
}

function beepShort(freq = 950, dur = 0.08, vol = 0.14){
  if (!audioCtx) { try { clickEl.currentTime = 0; clickEl.play(); } catch{}; return; }
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
function playClick(){ ensureAudio(); beepShort(1000, 0.06, 0.12); }
function playAlert(){ ensureAudio(); try { alertEl.currentTime = 0; alertEl.play(); } catch{} }

// --- Utils ---
function fmt(sec){
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec/60);
  const s = sec % 60;
  return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}
function setDisplay(sec){ display.textContent = fmt(sec); }

// --- Preset selection ---
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

// --- Core timer ---
function tick(){
  remaining -= 1;
  setDisplay(remaining);
  if (remaining <= 0){
    stopTimer();
    setDisplay(0);
    timesUpEl.textContent = "Time's up!";
    try { navigator.vibrate && navigator.vibrate([200,100,200]); } catch {}
    playAlert();
  }
}
function startTimer(){
  if (running) return;
  ensureAudio(); playClick();
  if (remaining <= 0) {
    // if nothing selected, use last duration or default 0
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

// --- Custom time (simple prompt: mm and ss) ---
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

// --- Controls ---
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);

// --- Sets (toggle red on/off, with click sound) ---
setsRow.addEventListener('click', (e)=>{
  const btn = e.target.closest('.set-btn');
  if (!btn) return;
  ensureAudio(); playClick();
  btn.classList.toggle('active');
});

// Init
setDisplay(0);
window.addEventListener('touchstart', ensureAudio, { once:true });
