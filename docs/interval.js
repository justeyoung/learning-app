// ===== Japanese Interval Walking – 3 min phases =====

// --- Plan (total 30:00): Warm-up, (Fast/Slow)x4, Cool-down ---
const PHASE_LEN = 180; // seconds (3 minutes)
const plan = [
  { name: 'Warm-up', type: 'warm', secs: PHASE_LEN },
  { name: 'Fast',    type: 'fast', secs: PHASE_LEN },
  { name: 'Slow',    type: 'slow', secs: PHASE_LEN },
  { name: 'Fast',    type: 'fast', secs: PHASE_LEN },
  { name: 'Slow',    type: 'slow', secs: PHASE_LEN },
  { name: 'Fast',    type: 'fast', secs: PHASE_LEN },
  { name: 'Slow',    type: 'slow', secs: PHASE_LEN },
  { name: 'Fast',    type: 'fast', secs: PHASE_LEN },
  { name: 'Slow',    type: 'slow', secs: PHASE_LEN },
  { name: 'Cool-down', type: 'cool', secs: PHASE_LEN }
];

const totalSecs = plan.reduce((s,p)=>s+p.secs,0);

// --- DOM helpers ---
const $ = id => document.getElementById(id);
const phaseLabel   = $('phaseLabel');
const timeLabel    = $('timeLabel');
const overallPct   = $('overallPct');
const sinceStartEl = $('sinceStart');
const nextPhaseEl  = $('nextPhase');
const timeLeftEl   = $('timeLeft');
const segBar       = $('segBar');
const overallFill  = $('overall-fill');
const statusMsg    = $('statusMsg');
const wheelProgress = $('wheelProgress');

const startBtn = $('startBtn');
const pauseBtn = $('pauseBtn');
const resetBtn = $('resetBtn');

// --- Build segments once ---
function buildSegments(){
  segBar.innerHTML = '';
  plan.forEach((p, i) => {
    const seg = document.createElement('div');
    seg.className = 'seg';
    seg.dataset.type = p.type;
    seg.dataset.idx = i;
    segBar.appendChild(seg);
  });
}
buildSegments();

// --- State ---
let stepIndex = 0;
let phaseElapsed = 0;           // seconds elapsed in current step
let workoutElapsed = 0;         // seconds since workout start (not counting paused)
let running = false;
let rafId = null;
let lastTs = null;

// --- Web Audio beep (Spotify-friendly) ---
let audioCtx = null;
function ensureAudio(){
  if (!audioCtx) {
    try{ audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch(e){ audioCtx = null; }
  }
}
function beepShort(freq = 880, dur = 0.08, vol = 0.15){
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.frequency.value = freq;
  o.type = 'sine';
  g.gain.value = vol;
  o.connect(g).connect(audioCtx.destination);
  o.start(t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.stop(t + dur + 0.02);
}

// --- Utilities ---
function fmtMMSS(sec){
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec/60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2,'0')}`;
}
function setPhaseColors(type){
  // you can tune colors per phase if desired
  const colors = {
    warm: '#ffa043',
    fast: '#ff2d55',
    slow: '#4da3ff',
    cool: '#34d399'
  };
  if (wheelProgress) wheelProgress.setAttribute('stroke', colors[type] || '#00bcd4');
}

// --- Core loop ---
function updateUI(){
  const step = plan[stepIndex] || plan[plan.length-1];

  // phase + time
  phaseLabel.textContent = step.name;
  timeLabel.textContent  = fmtMMSS(step.secs - phaseElapsed);

  // segbar
  const children = segBar.children;
  for (let i=0;i<children.length;i++){
    children[i].classList.toggle('done', i < stepIndex);
  }

  // next label
  const next = plan[stepIndex+1];
  nextPhaseEl.textContent = next ? next.name : '—';

  // overall progress
  const overallPctVal = Math.floor((workoutElapsed / totalSecs) * 100);
  overallPct.textContent = `${Math.min(100, Math.max(0, overallPctVal))}%`;
  overallFill.style.width = `${overallPctVal}%`;

  // since start + time left
  sinceStartEl.textContent = fmtMMSS(workoutElapsed);
  timeLeftEl.textContent   = fmtMMSS(totalSecs - workoutElapsed);

  // wheel progress for this phase
  const r = 110, C = 2*Math.PI*r;
  const phaseRatio = Math.min(1, Math.max(0, phaseElapsed / step.secs)); // 0..1
  const dashoffset = C * (1 - phaseRatio);
  wheelProgress.style.strokeDasharray = `${C}`;
  wheelProgress.style.strokeDashoffset = `${dashoffset}`;
}

function tick(ts){
  if (!running) return;
  if (!lastTs) lastTs = ts;

  const dt = (ts - lastTs) / 1000; // seconds
  lastTs = ts;

  phaseElapsed += dt;
  workoutElapsed += dt;

  const step = plan[stepIndex];

  // last 5-second countdown beep
  const remaining = Math.ceil(step.secs - phaseElapsed);
  if (remaining <= 5 && remaining > 0) {
    // beep once per second
    const frac = Math.abs(phaseElapsed - Math.round(phaseElapsed));
    if (frac < 0.05) { // near the second tick
      beepShort(remaining === 1 ? 1200 : 900);
    }
  }

  if (phaseElapsed >= step.secs) {
    // mark segment done
    const currentSeg = segBar.children[stepIndex];
    if (currentSeg) currentSeg.classList.add('done');

    // advance
    stepIndex += 1;
    phaseElapsed = 0;

    if (stepIndex >= plan.length) {
      // finished
      running = false;
      cancelAnimationFrame(rafId);
      rafId = null;
      statusMsg.textContent = 'Workout complete!';
      startBtn.classList.remove('active');
      pauseBtn.classList.remove('active');
      updateUI(); // final UI
      return;
    } else {
      // phase change cue
      const next = plan[stepIndex];
      setPhaseColors(next.type);
      statusMsg.textContent = `${next.name}!`;
    }
  }

  updateUI();
  rafId = requestAnimationFrame(tick);
}

// --- Controls (public API) ---
function startWorkout(){
  ensureAudio();
  if (running) return;
  running = true;
  lastTs = null;
  statusMsg.textContent = '';
  startBtn.classList.add('active');
  pauseBtn.classList.remove('active');
  // set color for current phase
  setPhaseColors(plan[stepIndex].type);
  rafId = requestAnimationFrame(tick);
}

function pauseWorkout(){
  if (!running) return;
  running = false;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  pauseBtn.classList.add('active');
  startBtn.classList.remove('active');
  statusMsg.textContent = 'Paused';
}

function resetWorkout(){
  running = false;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;

  stepIndex = 0;
  phaseElapsed = 0;
  workoutElapsed = 0;
  statusMsg.textContent = '';

  // clear segments
  Array.from(segBar.children).forEach(el => el.classList.remove('done'));

  startBtn.classList.remove('active');
  pauseBtn.classList.remove('active');

  setPhaseColors(plan[0].type);
  updateUI();
}

// --- Wire up buttons safely ---
document.addEventListener('DOMContentLoaded', () => {
  // Build segments on load (already done once, but safe)
  if (!segBar.children.length) buildSegments();

  setPhaseColors(plan[0].type);
  updateUI();

  startBtn?.addEventListener('click', (e)=>{ e.preventDefault(); startWorkout(); });
  pauseBtn?.addEventListener('click', (e)=>{ e.preventDefault(); pauseWorkout(); });
  resetBtn?.addEventListener('click', (e)=>{ e.preventDefault(); resetWorkout(); });

  // Unlock audio on first touch anywhere
  window.addEventListener('touchstart', ensureAudio, { once:true });
});

// Expose for any other scripts (optional)
window.startWorkout = startWorkout;
window.pauseWorkout = pauseWorkout;
window.resetWorkout = resetWorkout;
