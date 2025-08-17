// core.js — LED text highlight only for current; no background highlight; no highlight for completed
// Keeps: 5 rows, 3 tic-tacs, animated wheel, 10s test, ✓ button, rapid ping on NEW exercise
console.log("[core] LED-text-current-only / 10s test / rapid-ping / tick-btn");

window.addEventListener("DOMContentLoaded", () => {
  // ===== Config (TEST) =====
  const EX_TIME = 10;              // exercise seconds (test)
  const BR_TIME = 10;              // break seconds (test)
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
  const completeBtn = document.getElementById('completeBtn'); // ✓

  // ===== State =====
  let exIdx = 0;                // 0..4 which exercise
  let setIdx = 1;               // 1..3 which set of current exercise
  let isExercise = true;        // true exercise; false break
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
  const clickS = mkAudio("click.mp3",          0.6);
  const beepS  = mkAudio("countdown_beep.mp3", 0.75);
  const pingS  = "digital_ping.mp3";

  // pool for rapid ping overlap
  const pingPool = Array.from({length: 4}, () => mkAudio(pingS, 1.0));
  let pingIdx = 0;
  const play = a => { try { a.currentTime = 0; a.play(); } catch {} };
  const playClick = ()=>play(clickS);
  const playBeep  = ()=>play(beepS);

  function playRapidPing(times=3, gapMs=350){
    let count=0;
    const id=setInterval(()=>{
      const a = pingPool[pingIdx++ % pingPool.length];
      play(a);
      if (++count >= times) clearInterval(id);
    }, gapMs);
  }

  // ===== UI helpers =====
  const fmt = s => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  // SVG wheel geometry
  const R = 54, C = 2*Math.PI*R;
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
      // reset all classes
      r.className = 'row';
      // mark previously finished exercises as "completed" only (neutral dim text), NO highlight
      if (i < exIdx) r.classList.add('completed');
      // only the current one gets LED text, green (exercise) or blue (break)
      if (i === exIdx) r.classList.add(isExercise ? 'current-ex' : 'current-br');
    });
  }

  function paintTics(){
    // During exercise: dots show sets already completed (setIdx-1).
    // During break: dots show the set just completed (setIdx).
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

  // ===== Phase engine =====
  function advancePhase(){
    if (isExercise){
      // Finish current set's exercise -> go to its break
      isExercise = false;
      left = BR_TIME;
      return;
    }
    // Finished break
    if (setIdx < TOTAL_SETS){
      // Next set of SAME exercise
      setIdx += 1;
      isExercise = true;
      left = EX_TIME;
      return;
    }
    // Completed 3 sets of this exercise -> move to NEXT exercise
    setIdx = 1;
    exIdx += 1;

    if (exIdx >= NAMES.length){
      // All done
      stop();
      if (statusEl) statusEl.textContent = "Exercise completed.";
      left = 0;
      draw();
      return;
    }
    // Start next exercise and fire rapid ping (new exercise starts: 2–5)
    isExercise = true;
    left = EX_TIME;
    if (exIdx >= 1) playRapidPing(3, 350);
  }

  function tick(){
    left -= 1;
    since += 1;

    if (left <= 5 && left > 0) playBeep();   // last 5 seconds beep

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
  function completeNow(){ // ✓ completes current phase immediately
    playClick();
    left = 0;
    advancePhase();
    draw();
  }

  // Wire buttons
  startBtn?.addEventListener('click', start);
  pauseBtn?.addEventListener('click', pause);
  resetBtn?.addEventListener('click', reset);
  completeBtn?.addEventListener('click', completeNow);

  // Init
  draw();
});
