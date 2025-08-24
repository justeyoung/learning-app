// Axis — minimal prototype logic
// Screens: Home → Level → Workout
// Features: choose level, per-exercise time adjust, rounds, style (circuit/straight),
// 3-second prep, animated progress ring, big timer, Back/Pause/Next controls.

const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

let EXERCISES = [];
let currentLevel = 1;
let perExerciseSeconds = [60, 60, 60, 60, 60, 60];
let rounds = 1;
let style  = 'circuit'; // or 'straight'

// Load data (expects /assets/data/exercises.json)
fetch('assets/data/exercises.json')
  .then(r => r.json())
  .then(data => { EXERCISES = data; });

// ---------- Navigation helpers ----------
function show(id) {
  $$('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
}

// ---------- Home: Level cards ----------
$$('.level-card').forEach(btn => {
  btn.addEventListener('click', () => {
    currentLevel = parseInt(btn.dataset.level, 10);
    openLevel(currentLevel);
  });
});

// ---------- Level screen ----------
$('#back-to-home').addEventListener('click', () => show('#screen-home'));

function openLevel(level) {
  $('#level-title').textContent = `Level ${level}`;
  const rows = EXERCISES.filter(e => e.level === level);
  perExerciseSeconds = rows.map(() => 60);

  const list = $('#exercise-list');
  list.innerHTML = '';

  rows.forEach((ex, i) => {
    const row   = document.createElement('div');
    row.className = 'exercise-row';

    const img = document.createElement('img');
    img.src   = ex.img;
    img.alt   = ex.name;
    img.onerror = () => { img.src = 'assets/img/ui/placeholder.png'; };

    const name = document.createElement('div');
    name.className = 'exercise-name';
    name.textContent = ex.name;

    const adjust = document.createElement('div');
    adjust.className = 'time-adjust';

    const minus = document.createElement('button'); minus.textContent = '−';
    const pill  = document.createElement('div'); pill.className = 'pill'; pill.textContent = ` ${perExerciseSeconds[i]}s `;
    const plus  = document.createElement('button'); plus.textContent = '+';

    minus.addEventListener('click', () => {
      perExerciseSeconds[i] = Math.max(15, perExerciseSeconds[i] - 15);
      pill.textContent = `${perExerciseSeconds[i]}s`;
    });
    plus.addEventListener('click', () => {
      perExerciseSeconds[i] = Math.min(120, perExerciseSeconds[i] + 15);
      pill.textContent = `${perExerciseSeconds[i]}s`;
    });

    adjust.append(minus, pill, plus);
    row.append(img, name, adjust);
    list.append(row);
  });

  // restore chips states
  $$('#rounds-chips .chip').forEach(c => c.classList.remove('selected'));
  $(`#rounds-chips .chip[data-rounds="${rounds}"]`).classList.add('selected');

  $$('#style-chips .chip').forEach(c => c.classList.remove('selected'));
  $(`#style-chips .chip[data-style="${style}"]`).classList.add('selected');

  show('#screen-level');
}

// Rounds chips
$('#rounds-chips').addEventListener('click', (e) => {
  const btn = e.target.closest('.chip'); if (!btn) return;
  $$('#rounds-chips .chip').forEach(c => c.classList.remove('selected'));
  btn.classList.add('selected');
  rounds = parseInt(btn.dataset.rounds, 10);
});

// Style chips
$('#style-chips').addEventListener('click', (e) => {
  const btn = e.target.closest('.chip'); if (!btn) return;
  $$('#style-chips .chip').forEach(c => c.classList.remove('selected'));
  btn.classList.add('selected');
  style = btn.dataset.style; // 'circuit' | 'straight'
});

// Start workout
$('#btn-start').addEventListener('click', () => startWorkout());

// ---------- Workout engine ----------
const player = {
  levelRows: [],
  roundIdx: 0,
  exIdx: 0,
  mode: 'prep',         // 'prep' | 'run'
  duration: 0,
  remaining: 0,
  paused: false,
  raf: null,
  startTs: 0
};

function startWorkout() {
  player.levelRows = EXERCISES.filter(e => e.level === currentLevel);
  player.roundIdx  = 0;
  player.exIdx     = 0;
  player.paused    = false;
  show('#screen-workout');
  startPrep(3);
}

function setProgressLabel() {
  $('#progress-label').textContent =
    `Exercise ${player.exIdx + 1} of 6 • Round ${player.roundIdx + 1} of ${rounds}`;
}

function setExerciseVisual() {
  const ex = player.levelRows[player.exIdx];
  $('#exercise-name').textContent = ex.name;
  const imgEl = $('#exercise-image');
  imgEl.src = ex.img;
  imgEl.alt = ex.name;
  imgEl.onerror = () => { imgEl.src = 'assets/img/ui/placeholder.png'; };
}

function animateWheel(progress) {
  // SVG arc length = 2πr (r=54) → ~339.292
  const circumference = 339.292;
  const offset = circumference * (1 - progress);
  $('#wheel .arc').style.strokeDashoffset = String(offset);
}

function startPrep(seconds) {
  player.mode = 'prep';
  player.duration = seconds;
  player.remaining = seconds;

  setExerciseVisual();
  setProgressLabel();

  $('#prep-overlay').classList.remove('hidden');
  $('#prep-overlay').textContent = String(seconds);

  // Show upcoming exercise total time on the big timer
  const nextDur = perExerciseSeconds[player.exIdx];
  $('#big-timer').textContent = `00:${String(nextDur).padStart(2, '0')}`;

  animateWheel(0); // reset arc
  tickLoop();
}

function startRun() {
  player.mode = 'run';
  const dur = perExerciseSeconds[player.exIdx];
  player.duration = dur;
  player.remaining = dur;
  $('#prep-overlay').classList.add('hidden');
  tickLoop();
}

function tickLoop() {
  player.startTs = performance.now();

  const frame = () => {
    if (player.paused) {
      player.raf = requestAnimationFrame(frame);
      return;
    }

    const elapsed = (performance.now() - player.startTs) / 1000;
    const rem = Math.max(0, player.duration - Math.floor(elapsed));

    if (rem !== player.remaining) {
      player.remaining = rem;

      if (player.mode === 'prep') {
        $('#prep-overlay').textContent = String(rem);
        if (rem === 0) startRun();
      } else {
        // RUN mode
        $('#big-timer').textContent = `00:${String(rem).padStart(2, '0')}`;
        const prog = (player.duration - rem) / player.duration;
        animateWheel(prog);

        // subtle visual pulse in last 5s
        if (rem <= 5 && rem > 0) {
          $('.image-hole').style.outline = '2px solid var(--accent)';
        } else {
          $('.image-hole').style.outline = '1px solid #1a2030';
        }

        if (rem === 0) {
          // hook: play congratulation.mp3 here
          goNext();
          return;
        }
      }
    }

    player.raf = requestAnimationFrame(frame);
  };

  player.raf = requestAnimationFrame(frame);
}

function goNext() {
  if (style === 'circuit') {
    // advance within round
    if (player.exIdx < 5) {
      player.exIdx += 1;
    } else {
      // next round
      if (player.roundIdx < rounds - 1) {
        player.roundIdx += 1;
        player.exIdx = 0;
      } else {
        finishWorkout();
        return;
      }
    }
  } else {
    // straight sets: finish all rounds of current exercise before moving on
    if (player.roundIdx < rounds - 1) {
      player.roundIdx += 1;
    } else {
      player.roundIdx = 0;
      if (player.exIdx < 5) {
        player.exIdx += 1;
      } else {
        finishWorkout();
        return;
      }
    }
  }

  startPrep(3);
}

function goPrev() {
  if (style === 'circuit') {
    if (player.exIdx > 0) {
      player.exIdx -= 1;
    } else if (player.roundIdx > 0) {
      player.roundIdx -= 1;
      player.exIdx = 5;
    } else {
      return; // at start
    }
  } else {
    if (player.roundIdx > 0) {
      player.roundIdx -= 1;
    } else if (player.exIdx > 0) {
      player.exIdx -= 1;
      player.roundIdx = rounds - 1;
    } else {
      return;
    }
  }
  startPrep(3);
}

function finishWorkout() {
  // hook: play workout_complete.mp3 here
  // Phase 1 storage (calendar/history) will be added later.
  show('#screen-home');
}

// Workout controls
$('#btn-prev').addEventListener('click', goPrev);
$('#btn-next').addEventListener('click', goNext);
$('#btn-pause').addEventListener('click', () => {
  player.paused = !player.paused;
  $('#btn-pause').textContent = player.paused ? '▶' : '⏸';
});
$('#exit-workout').addEventListener('click', () => show('#screen-home'));
