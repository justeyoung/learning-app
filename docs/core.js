// core.js — per-exercise 3 sets before next; tic-tacs correct; 10s test; wheel anim; voice+bell cue
console.log("[core] per-exercise-3-sets / 10s test");

window.addEventListener("DOMContentLoaded", () => {
  // ===== Config (TEST) =====
  const EX_TIME   = 10;         // exercise seconds (test)
  const BR_TIME   = 10;         // break seconds (test)
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

  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const resetBtn = document.getElementById('resetBtn');

  // ===== State =====
  let exIdx = 0;               // current exercise index 0..4
  let setIdx = 1;              // current set index 1..3
  let isExercise = true;       // phase: true=exercise, false=break
  let left = EX_TIME;          // seconds left in phase
  let since = 0;               // total seconds since start
  let tickId = null;

  // ===== Sounds (short; don’t duck Spotify) =====
  const mkAudio = (src, vol=1.0) => { const a = new Audio(src); a.preload="auto"; a.setAttribute("playsinline",""); a.volume=vol; return a; };
  const clickS = mkAudio("click.mp3",              0.6);
  const beepS  = mkAudio("countdown_beep.mp3",     0.75);
  const chgS   = mkAudio("digital_ping.mp3",       0.85);
  const voice  = mkAudio(encodeURI("new_exercise.mp3"), 1.0);
  const bell   = mkAudio(encodeURI("church_bell.mp3"),  1.0);
  const play = a => { try{ a.currentTime = 0; a.play(); }catch{} };

  function playVoiceBellTwice(){
    const go = () => { play(voice); play(bell); };
    go(); setTimeout(go, 2500);
  }

  // ===== UI helpers =====
  const fmt = s => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  const R = 54; // match SVG r
  const C = 2 * Math.PI * R;

  function updateWheel(){
    if (!progEl) return;
    const total = isExercise ? EX_TIME : BR_TIME;
    const ratio = Math.max(0, Math.min(1, 1 - (left / total)));
    progEl.style.strokeDasharray = `${C} ${C}`;
    progEl.style.strokeDashoffset = String(C * (1 - ratio));
    progEl.classList.toggle('break', !isExercise);
    progEl.classList.toggle('exercise', isExercise);
  }

  function paintRows(){
    rows.forEach((r,i)=>{
      if (!r) return;
      r.className = 'row';
      if (i < exIdx) r.classList.add('done'); // finished exercises
      if (i === exIdx) r.classList.add(isExercise ? 'current-ex' : 'current-br');
    });
  }

  function paintTics(){
    // During exercise: dots show sets already completed (setIdx-1)
    // During break: dots show the set just completed as lit (setIdx)
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

  // ===== Logic =====
  function advancePhase(){
    // Called whenever a phase ends and we need to advance.
    if (isExercise){
      // Finished one set's exercise -> enter its break
      isExercise = false;
      left = BR_TIME;
      return;
    }

    // Finished the break -> either next set of SAME exercise, or move to NEXT exercise
    if (setIdx < TOTAL_SETS){
      setIdx += 1;                 // next set of current exercise
      isExercise = true;
      left = EX_TIME;
    } else {
      // Completed all 3 sets of this exercise -> move to next exercise
      setIdx = 1;
      exIdx += 1;
      if (exIdx >= NAMES.length){
        // Workout finished
        stop();
        if (statusEl) statusEl.textContent = "Exercise completed.";
        left = 0;
        draw();
        return;
      }
      isExercise = true;
      left = EX_TIME;
    }
  }

  function tick(){
    left -= 1;
    since += 1;

    // last 5 seconds beep
    if (left <= 5 && left > 0) play(beepS);

    // Voice+bell: 10s before the end of the break that follows Set 3 of Exercise 3
    // With 10s test breaks, this fires right at the start of that break.
    if (!isExercise && exIdx === 2 && setIdx === 3 && left === 10){
      playVoiceBellTwice();
    }

    if (left <= 0){
      play(chgS);
      advancePhase();
    }

    draw();
  }

  // ===== Controls =====
  function start(){ if (tickId) return; play(clickS); tickId = setInterval(tick, 1000); }
  function pause(){ play(clickS); if (tickId){ clearInterval(tickId); tickId = null; } }
  function stop(){ if (tickId){ clearInterval(tickId); tickId = null; } }
  function reset(){
    play(clickS);
    stop();
    exIdx = 0; setIdx = 1; isExercise = true; left = EX_TIME; since = 0;
    draw();
  }

  // ===== Wire buttons =====
  startBtn?.addEventListener('click', start);
  pauseBtn?.addEventListener('click', pause);
  resetBtn?.addEventListener('click', reset);

  // ===== Init =====
  draw();
});
