// core.js — fix: reliable button wiring + full features (10s test)
console.log("[core] loading…");

// ===== Config (TEST) =====
const EX_TIME = 10;     // exercise seconds
const BR_TIME = 10;     // break seconds
const TOTAL_SETS = 3;

const NAMES = [
  "Extended Plank",
  "Hollow Hold",
  "Wrist to Knee Crunch",
  "AB Roll Out",
  "Reverse Crunch"
];

window.addEventListener("DOMContentLoaded", () => {
  console.log("[core] DOM ready");

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

  // Quick sanity log
  console.log("[core] elements:", {
    statusEl: !!statusEl, timerEl: !!timerEl, sinceEl: !!sinceEl,
    rows: rows.every(Boolean), tics: tics.every(Boolean),
    progEl: !!progEl, startBtn: !!startBtn, pauseBtn: !!pauseBtn, resetBtn: !!resetBtn
  });

  // ===== State =====
  let exIdx = 0;               // 0..4
  let setIdx = 1;              // 1..3
  let isExercise = true;       // true=exercise, false=break
  let left = EX_TIME;          // seconds left in current phase
  let since = 0;               // total seconds since start
  let tickId = null;

  // ===== Sounds (short so they don't duck Spotify) =====
  const safeAudio = (src, vol=1.0) => {
    const a = new Audio(src);
    a.preload = "auto";
    a.setAttribute("playsinline", "");
    a.volume = vol;
    return a;
  };

  const clickS = safeAudio("click.mp3", 0.6);
  const beepS  = safeAudio("countdown_beep.mp3", 0.75);
  const chgS   = safeAudio("digital_ping.mp3", 0.85);

  const voiceCue = safeAudio(encodeURI("new_exercise.mp3"), 1.0);
  const bellCue  = safeAudio(encodeURI("church_bell.mp3"), 1.0);

  const play = a => { try { a.currentTime = 0; a.play(); } catch(e) { /* ignore */ } };
  const playClick  = () => play(clickS);
  const playBeep   = () => play(beepS);
  const playChange = () => play(chgS);

  function playVoiceBellTwice(){
    const go = () => { play(voiceCue); play(bellCue); };
    go(); setTimeout(go, 2500);
  }

  // ===== UI =====
  const fmt = s => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  const R = 54; // matches r in SVG
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
      if (i < exIdx) r.classList.add('done');                 // completed earlier
      if (i === exIdx) r.classList.add(isExercise ? 'current-ex' : 'current-br');
    });
  }

  function paintTics(){
    tics.forEach((t,i)=>{
      if (!t) return;
      t.classList.toggle('done', i < (setIdx - 1));
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
  function tick(){
    left -= 1;
    since += 1;

    // last 5 seconds beep
    if (left <= 5 && left > 0) playBeep();

    // Cue 10s before the end of Break #3 (with 10s breaks, that's at start of that break)
    if (!isExercise && exIdx === 2 && setIdx === 3 && left === 10) {
      playVoiceBellTwice();
    }

    if (left <= 0){
      playChange();

      if (isExercise){
        // switch to break
        isExercise = false;
        left = BR_TIME;
      } else {
        // break -> next exercise / set / finish
        exIdx++;
        if (exIdx >= NAMES.length){
          exIdx = 0;
          setIdx++;
          if (setIdx > TOTAL_SETS){
            stop();
            if (statusEl) statusEl.textContent = "Exercise completed.";
            left = 0;
            draw();
            return;
          }
        }
        isExercise = true;
        left = EX_TIME;
      }
    }

    draw();
  }

  // ===== Controls =====
  function start(){ 
    if (tickId) return; 
    playClick(); 
    tickId = setInterval(tick, 1000); 
    console.log("[core] start");
  }
  function pause(){ 
    playClick(); 
    if (tickId){ clearInterval(tickId); tickId = null; } 
    console.log("[core] pause");
  }
  function stop(){ 
    if (tickId){ clearInterval(tickId); tickId = null; } 
  }
  function reset(){ 
    playClick(); 
    stop(); 
    exIdx=0; setIdx=1; isExercise=true; left=EX_TIME; since=0; 
    draw(); 
    console.log("[core] reset");
  }

  // ===== Wire buttons safely =====
  if (startBtn) startBtn.addEventListener('click', start);
  if (pauseBtn) pauseBtn.addEventListener('click', pause);
  if (resetBtn) resetBtn.addEventListener('click', reset);

  // Initial paint
  draw();
  console.log("[core] ready");
});
