// Axis — Straight Sets Only + Breaks + WebAudio Beeps (Spotify-safe)
// Defaults: 10s per exercise, 60s break, 3s prep. Voice OFF by default.
//
// Straight Sets definition:
//  - Do all ROUNDS of Exercise 1, then rest, then move to Exercise 2, etc.

const $  = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

let EXERCISES = [];
let currentLevel = 1;

// Durations
let perExerciseSeconds = [10,10,10,10,10,10];   // editable per exercise on Level screen
let rounds = 1;
let breakSeconds = 60;
const prepSeconds = 3;

// Sound profile (Spotify-safe): WebAudio beeps ON, voice OFF by default
let voiceEnabled = false;     // set true if you want spoken names (uses <audio>, may duck external audio)
let beepsEnabled = true;

// ---- Data -------------------------------------------------------------------
fetch('assets/data/exercises.json')
  .then(r => r.json())
  .then(d => { EXERCISES = d; });

// ---- Audio (Web Audio API beeps that mix with external audio) ---------------
let audioCtx = null;
function ensureAudioCtx(){
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch { audioCtx = null; }
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}

function beep(freq = 1000, ms = 150, gain = 0.12){
  if (!beepsEnabled) return;
  ensureAudioCtx();
  if (!audioCtx) return; // gracefully skip if not supported
  const osc = audioCtx.createOscillator();
  const g   = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  g.gain.value = gain;
  osc.connect(g).connect(audioCtx.destination);
  const now = audioCtx.currentTime;
  osc.start(now);
  // smooth envelope to avoid clicks
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(gain, now + 0.01);
  g.gain.setTargetAtTime(0, now + ms / 1000 - 0.03, 0.02);
  osc.stop(now + ms / 1000 + 0.02);
}

// Optional spoken names (OFF by default)
function audioKeyFromExercise(ex){
  try { return ex.img.split('/').pop().replace(/\.[^.]+$/,'').toLowerCase(); } catch { return ''; }
}
function playExerciseName(ex){
  if (!voiceEnabled || !ex) return;
  const k = audioKeyFromExercise(ex);
  // Use your names/ folder if present; if not, this silently fails
  try { new Audio(`assets/audio/names/${k}.mp3`).play(); } catch {}
}

// ---- Navigation --------------------------------------------------------------
function show(id){ $$('.screen').forEach(s=>s.classList.remove('active')); $(id).classList.add('active'); }

$$('.level-card').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    currentLevel = parseInt(btn.dataset.level, 10);
    openLevel(currentLevel);
  });
});
$('#back-to-home').addEventListener('click', ()=> show('#screen-home'));

// ---- Level screen ------------------------------------------------------------
function openLevel(level){
  $('#level-title').textContent = `Level ${level}`;
  const rows = EXERCISES.filter(e => e.level === level);

  // default every exercise on the list to 10s (user can change)
  perExerciseSeconds = rows.map(() => 10);

  // (Optional) preload spoken names (kept behind voiceEnabled flag)
  if (voiceEnabled) {
    rows.forEach(ex => { try {
      const a = new Audio(`assets/audio/names/${audioKeyFromExercise(ex)}.mp3`);
      a.preload = 'auto';
    } catch{} });
  }

  const list = $('#exercise-list'); list.innerHTML = '';
  rows.forEach((ex, i) => {
    const row   = document.createElement('div'); row.className = 'exercise-row';
    const img   = document.createElement('img'); img.src = ex.img; img.alt = ex.name; img.onerror = () => img.src = 'assets/img/ui/placeholder.png';
    const name  = document.createElement('div'); name.className = 'exercise-name'; name.textContent = ex.name;

    const adjust = document.createElement('div'); adjust.className = 'time-adjust';
    const minus  = document.createElement('button'); minus.textContent = '−';
    const pill   = document.createElement('div'); pill.className = 'pill'; pill.textContent = `${perExerciseSeconds[i]}s`;
    const plus   = document.createElement('button'); plus.textContent = '+';

    minus.addEventListener('click', () => {
      perExerciseSeconds[i] = Math.max(5, perExerciseSeconds[i] - 15);
      pill.textContent = `${perExerciseSeconds[i]}s`;
    });
    plus.addEventListener('click', () => {
      perExerciseSeconds[i] = Math.min(180, perExerciseSeconds[i] + 15);
      pill.textContent = `${perExerciseSeconds[i]}s`;
    });

    adjust.append(minus, pill, plus);
    row.append(img, name, adjust);
    list.append(row);
  });

  // Rounds
  $$('#rounds-chips .chip').forEach(c => c.classList.remove('selected'));
  $(`#rounds-chips .chip[data-rounds="${rounds}"]`)?.classList.add('selected');

  // Break control
  $('#break-pill').textContent = `${breakSeconds}s`;
  $('#break-minus').onclick = () => { breakSeconds = Math.max(0, breakSeconds - 15); $('#break-pill').textContent = `${breakSeconds}s`; };
  $('#break-plus').onclick  = () => { breakSeconds = Math.min(600, breakSeconds + 15); $('#break-pill').textContent = `${breakSeconds}s`; };

  show('#screen-level');
}

$('#rounds-chips').addEventListener('click', e => {
  const btn = e.target.closest('.chip'); if (!btn) return;
  $$('#rounds-chips .chip').forEach(c => c.classList.remove('selected'));
  btn.classList.add('selected'); rounds = parseInt(btn.dataset.rounds, 10);
});

$('#btn-start').addEventListener('click', () => { ensureAudioCtx(); startWorkout(); });

// ---- Workout engine (Straight Sets only) ------------------------------------
const player = {
  levelRows: [], exIdx: 0, roundIdx: 0,
  mode: 'prep',            // 'prep' | 'run' | 'rest'
  duration: 0, remaining: 0, startTs: 0, paused: false, raf: null,
  nextAfterRest: null
};

function startWorkout(){
  player.levelRows = EXERCISES.filter(e => e.level === currentLevel);
  player.exIdx = 0; player.roundIdx = 0; player.paused = false; player.nextAfterRest = null;
  show('#screen-workout');
  startPrep(prepSeconds);
}

function setProgressLabel(){
  $('#progress-label').textContent = `Exercise ${player.exIdx + 1} of 6 • Round ${player.roundIdx + 1} of ${rounds}`;
}

function setExerciseVisual(){
  const ex = player.levelRows[player.exIdx];
  $('#exercise-name').textContent = ex.name;
  const img = $('#exercise-image');
  img.src = ex.img; img.alt = ex.name; img.onerror = () => { img.src = 'assets/img/ui/placeholder.png'; };
  $('.image-hole').classList.remove('resting');
}

function animateWheel(progress){
  const C = 339.292; // 2πr for r=54 in the SVG
  $('#wheel .arc').style.strokeDashoffset = String(C * (1 - progress));
}

function startPrep(sec){
  player.mode = 'prep'; player.duration = sec; player.remaining = sec;
  setExerciseVisual(); setProgressLabel();
  $('#prep-overlay').classList.remove('hidden');
  $('#prep-overlay').textContent = String(sec);
  const d = perExerciseSeconds[player.exIdx];
  $('#big-timer').textContent = `00:${String(d).padStart(2,'0')}`;
  animateWheel(0);
  tickLoop();
}

function startRun(){
  player.mode = 'run';
  const d = perExerciseSeconds[player.exIdx];
  player.duration = d; player.remaining = d;
  $('#prep-overlay').classList.add('hidden');

  // Speak exercise name at the start (optional)
  playExerciseName(player.levelRows[player.exIdx]);

  tickLoop();
}

function startRest(){
  if (breakSeconds <= 0) { player.nextAfterRest?.(); return; }
  player.mode = 'rest';
  player.duration = breakSeconds; player.remaining = breakSeconds;
  $('#exercise-name').textContent = 'Rest';
  const img = $('#exercise-image');
  img.src = 'assets/img/ui/rest.png'; img.alt = 'Rest';
  $('.image-hole').classList.add('resting');
  $('#big-timer').textContent = `00:${String(breakSeconds).padStart(2,'0')}`;
  animateWheel(0);
  tickLoop();
}

function tickLoop(){
  player.startTs = performance.now();
  const frame = () => {
    if (player.paused) { player.raf = requestAnimationFrame(frame); return; }

    const elapsed = (performance.now() - player.startTs) / 1000;
    const rem = Math.max(0, player.duration - Math.floor(elapsed));

    if (rem !== player.remaining) {
      player.remaining = rem;

      if (player.mode === 'prep') {
        $('#prep-overlay').textContent = String(rem);
        if (rem === 0) startRun();

      } else if (player.mode === 'run') {
        $('#big-timer').textContent = `00:${String(rem).padStart(2,'0')}`;
        animateWheel((player.duration - rem) / player.duration);

        if (rem <= 5 && rem > 0) beep(1000, 150);

        if (rem === 0) {
          // STRAIGHT SETS ADVANCE:
          // After a work set, rest, then either next round (same exercise) or next exercise.
          player.nextAfterRest = () => {
            if (player.roundIdx < rounds - 1) {
              player.roundIdx += 1;              // stay on same exercise, next set
              startPrep(prepSeconds);
            } else if (player.exIdx < 5) {
              player.roundIdx = 0;               // move to next exercise
              player.exIdx += 1;
              startPrep(prepSeconds);
            } else {
              finishWorkout();
            }
          };
          startRest();
          return;
        }

      } else if (player.mode === 'rest') {
        $('#big-timer').textContent = `00:${String(rem).padStart(2,'0')}`;
        animateWheel((player.duration - rem) / player.duration);
        if (rem <= 5 && rem > 0) beep(800, 150);
        if (rem === 0) { player.nextAfterRest?.(); return; }
      }
    }

    player.raf = requestAnimationFrame(frame);
  };
  player.raf = requestAnimationFrame(frame);
}

// Prev/Next jump between *work* segments (ignores rest)
function goPrev(){
  if (player.mode === 'rest') { player.mode = 'run'; } // ignore while resting
  if (player.roundIdx > 0) {
    player.roundIdx -= 1;
  } else if (player.exIdx > 0) {
    player.exIdx -= 1;
    player.roundIdx = rounds - 1;
  } else { return; }
  startPrep(prepSeconds);
}

function goNext(){
  if (player.roundIdx < rounds - 1) {
    player.roundIdx += 1;
  } else if (player.exIdx < 5) {
    player.roundIdx = 0;
    player.exIdx += 1;
  } else { finishWorkout(); return; }
  startPrep(prepSeconds);
}

function finishWorkout(){
  // Simple end beeps (WebAudio) to avoid stopping Spotify
  beep(1200, 180);
  setTimeout(() => beep(1400, 180), 220);
  setTimeout(() => beep(1600, 220), 480);
  show('#screen-home');
}

// Controls
$('#btn-prev').addEventListener('click', goPrev);
$('#btn-next').addEventListener('click', goNext);
$('#btn-pause').addEventListener('click', ()=>{
  player.paused = !player.paused;
  $('#btn-pause').textContent = player.paused ? '▶' : '⏸';
});
$('#exit-workout').addEventListener('click', ()=> show('#screen-home'));
