// core.js — 5 rows + tic-tacs + animated wheel + 10s test + RAPID PING + ✓ complete button
console.log("[core] 10s test + rapid ping + complete button");

window.addEventListener("DOMContentLoaded", () => {
  // ===== Config (TEST) =====
  const EX_TIME = 20;              // exercise seconds (test)
  const BR_TIME = 20;              // break seconds (test)
  const TOTAL_SETS = 3;

  const NAMES = [
    "Extended Plank",
    "Hollow Hold",
    "Wrist to Knee Crunch",
    "AB Roll Out",
    "Reverse Crunch"
  ];

  // ===== DOM =====
  const statusEl = document.getElementById('status');
  const timerEl  = document.getElementById('timer');
  const sinceEl  = document.getElementById('since');

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

  const progEl = document.getElementById('wheelProgress');

  const startBtn    = document.getElementById('startBtn');
  const pauseBtn    = document.getElementById('pauseBtn');
  const resetBtn    = document.getElementById('resetBtn');
  const completeBtn = document.getElementById('completeBtn'); // ✓ new

  // ===== State =====
  let exIdx = 0;                // 0..4 (which exercise)
  let setIdx = 1;               // 1..3 (which set within exercise)
  let isExercise = true;        // true: exercise phase, false: break phase
  let left = EX_TIME;           // seconds left in current phase
  let since = 0;                // total seconds since start
  let tickId = null;

  // ===== Sounds (short; won’t duck Spotify) =====
  const mkAudio = (src, vol=1.0) => {
    const a = new Audio(src);
    a.preload = "auto";
    a.setAttribute("playsinline", "");
    a.volume = vol;
    return a;
  };

  const clickS = mkAudio("click.mp3",            0.6);
  const beepS  = mkAudio("countdown_beep.mp3",   0.75);
  const pingS  = "digital_ping.mp3"; // used for rapid pattern

  // Small pool so rapid plays can overlap on iOS
  const pingPool = Array.from({length: 4}, () => mkAudio(pingS, 1.0));
  let pingIdx = 0;
  const play = a => { try { a.currentTime = 0; a.play(); } catch {} };

  function playClick(){ play(clickS); }
  function playBeep(){  play(beepS); }

  // 🔔 Rapid ping sequence (for NEW EXERCISE starts: Exercises 2–5)
  function playRapidPing(times = 3, gapMs = 350){
    let count = 0;
    const id = setInterval(() => {
      const a = pingPool[pingIdx++ % pingPool.length];
      play(a);
      count++;
      if (count >= times) clearInterval(id);
    }, gapMs);
  }

  // ===== UI helpers =====
  const fmt = s => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  // SVG wheel geometry
  const R = 54; const C = 2 * Math.PI * R;

  function updateWheel(){
    if (!progEl) return;
    const total = isExercise ? EX_TIME : BR_TIME;
    const ratio = Math.max(0, Math.min(1, 1 - (left / total)));
    progEl.style.strokeDasharray  = `${C} ${C}`;
    progEl.style.strokeDashoffset = String(C * (1 - ratio));
    progEl.classList.toggle('break', !isExercise);
    progEl.classList.toggle('exercise', isExercise);
  }

  function paintRows(){
    rows.forEach((r,i)=>{
      if (!r) return;
      r.className = 'row';
      if (i < exIdx) r.classList.add('done');                         // completed exercises
      if (i === exIdx) r.classList.add(isExercise ? 'current-ex' : 'current-br'); // current row
    });
  }

  function paintTics(){
    // During exercise: show sets already completed (setIdx-1).
    // During break: show the set just completed (setIdx).
    const completedSets = isExercise ? (setIdx - 1) : setIdx;
    tics.forEach((t,i)=>{
      if (!t) return;
      t.classList.toggle('done', i < completedSets);
    });
  }

  function draw(){
    if (statusEl) statusEl.textContent = isExercise ? NAMES[exIdx] : "Break";
    if (timerEl)  timerEl.textContent  = fmt(left);
    if (sinceEl)  sinceEl.textContent  = fmt(since);
    updateWheel();
    paintRows();
    paintTics();
  }

  // ===== Phase change helpers =====
  function advancePhase(){
    if (isExercise){
      // Exercise -> Break (finish one set)
      isExercise = false;
      left = BR_TIME;
      return;
    }

    // Break just ended
    if (setIdx < TOTAL_SETS){
      // Move to next set of the SAME exercise
      setIdx += 1;
      isExercise = true;
      left = EX_TIME;
      return;
    }

    // Finished 3 sets of this exercise -> move to NEXT exercise
    setIdx = 1;
    exIdx += 1;

    if (exIdx >= NAMES.length){
      // Completed all exercises
      stop();
      if (statusEl) statusEl.textContent = "Exercise completed.";
      left = 0;
      draw();
      return;
    }

    // Start the next exercise
    isExercise = true;
    left = EX_TIME;

    // 🔔 Rapid cue for a NEW EXERCISE start (Exercises 2–5 only; i.e., exIdx >= 1)
    if (exIdx >= 1) playRapidPing(3, 350);
  }

  function tick(){
    left -= 1;
    since += 1;

    // Last-5 seconds countdown beep
    if (left <= 5 && left > 0) playBeep();

    if (left <= 0){
      advancePhase();
    }

    draw();
  }

  // ===== Controls =====
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
    exIdx = 0;
    setIdx = 1;
    isExercise = true;
    left = EX_TIME;
    since = 0;
    draw();
  }

  // ✓ NEW: Complete current phase immediately
  function completeNow(){
    // Mimic phase end: play a short click + move on instantly.
    playClick();
    // If we’re at or past end, just ensure progression; else jump to end.
    left = 0;
    // Advance exactly once (exercise->break OR break->next set/exercise)
    advancePhase();
    // Keep the timer running if it was running; no need to restart interval.
    draw();
  }

  // Wire buttons
  startBtn?.addEventListener('click', start);
  pauseBtn?.addEventListener('click', pause);
  resetBtn?.addEventListener('click', reset);
  completeBtn?.addEventListener('click', completeNow); // ✓ new

  // Initial paint
  draw();
});
