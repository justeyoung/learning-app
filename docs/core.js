// core.js — LED text current-only, animated wheel, 3-sets-per-exercise,
// symbol buttons incl. ✓, iOS-safe audio, 5s countdown, short rapid ping,
// 10s test build
console.log("[core] final: led + wheel + sets + ✓ + countdown + short-rapid + 10s");

window.addEventListener("DOMContentLoaded", () => {
  // ===== Config (TEST) =====
  const EX_TIME = 10;              // exercise seconds (TEST)
  const BR_TIME = 10;              // break seconds (TEST)
  const TOTAL_SETS = 3;

  const NAMES = [
    "Extended Plank",
    "Hollow Hold",
    "Wrist to Knee Crunch",
    "AB Roll Out",
    "Reverse Crunch"
  ];

  // ===== DOM =====
  const statusEl   = document.getElementById('status');
  const timerEl    = document.getElementById('timer');
  const sinceEl    = document.getElementById('since');
  const progEl     = document.getElementById('wheelProgress');

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

  const startBtn    = document.getElementById('startBtn');
  const pauseBtn    = document.getElementById('pauseBtn');
  const resetBtn    = document.getElementById('resetBtn');
  const completeBtn = document.getElementById('completeBtn'); // ✓

  // ===== State =====
  let exIdx = 0;                // current exercise 0..4
  let setIdx = 1;               // current set    1..3
  let isExercise = true;        // true=exercise, false=break
  let left = EX_TIME;           // seconds left in current phase
  let since = 0;                // total elapsed seconds
  let tickId = null;
  let countdownScheduled = false; // to avoid duplicate countdowns

  // ===== Audio (HTMLAudio with priming; pool for overlap; Spotify-safe) =====
  function mkAudio(src, vol = 1.0) {
    const a = new Audio(src);
    a.preload = "auto";
    a.setAttribute("playsinline", "");
    a.volume = vol; // short effects, won't duck Spotify
    return a;
  }

  const clickS   = mkAudio("click.mp3", 0.9);
  const pingPath = "digital_ping.mp3"; // used for countdown & rapid cue
  const pingPool = Array.from({ length: 6 }, () => mkAudio(pingPath, 1.0));
  let pingIdx = 0;

  // iOS audio priming (unlock on first gesture)
  let audioPrimed = false;
  function primeAllAudio(){
    if (audioPrimed) return;
    audioPrimed = true;
    const toPrime = [clickS, ...pingPool];
    toPrime.forEach(a=>{
      a.volume = 0.01;
      a.play().then(()=>{ a.pause(); a.currentTime=0; a.volume=1.0; }).catch(()=>{});
    });
  }
  window.addEventListener("touchstart", primeAllAudio, { once:true });
  window.addEventListener("mousedown",  primeAllAudio, { once:true });

  const playEl = (a, rate = 1.0) => {
    try {
      a.playbackRate = rate;
      a.currentTime = 0;
      a.volume = 1.0;
      a.play().catch(()=>{});
    } catch {}
  };
  const playClick = () => playEl(clickS);

  // Short rapid ping (2 hits) when a NEW exercise starts (exIdx >= 1)
  function playRapidPing(times = 2, gapMs = 220, chopMs = 220){
    let count = 0;
    const id = setInterval(()=>{
      const a = pingPool[pingIdx++ % pingPool.length];
      playEl(a, 1.15); // snappier
      setTimeout(()=>{ try{ a.pause(); a.currentTime = 0; }catch{} }, chopMs);
      if (++count >= times) clearInterval(id);
    }, gapMs);
  }

  // 5-second countdown beeps (single ping each second)
  function playCountdown5(){
    if (countdownScheduled) return;
    countdownScheduled = true;
    let sec = 5;
    const id = setInterval(()=>{
      const a = pingPool[pingIdx++ % pingPool.length];
      playEl(a);
      if (--sec <= 0) clearInterval(id);
    }, 1000);
  }

  // ===== UI =====
  const fmt = s => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  // SVG progress circle geometry
  const R = 54, C = 2 * Math.PI * R;
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
      if (i < exIdx) r.classList.add('completed'); // neutral/dim text for past
      if (i === exIdx) r.classList.add(isExercise ? 'current-ex' : 'current-br'); // LED text for current
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
    statusEl && (statusEl.textContent = isExercise ? NAMES[exIdx] : "Break");
    timerEl  && (timerEl.textContent  = fmt(left));
    sinceEl  && (sinceEl.textContent  = fmt(since));
    updateWheel();
    paintRows();
    paintTics();
  }

  // ===== Phase engine =====
  function advancePhase(){
    // New phase — allow a fresh countdown later
    countdownScheduled = false;

    if (isExercise){
      // finish current set's exercise -> go to its break
      isExercise = false;
      left = BR_TIME;
      return;
    }

    // finished a break
    if (setIdx < TOTAL_SETS){
      // next set of SAME exercise
      setIdx += 1;
      isExercise = true;
      left = EX_TIME;
      return;
    }

    // finished 3 sets -> move to NEXT exercise
    setIdx = 1;
    exIdx += 1;

    if (exIdx >= NAMES.length){
      // workout complete
      stop();
      statusEl && (statusEl.textContent = "Exercise completed.");
      left = 0;
      draw();
      return;
    }

    // start next exercise; fire the short rapid ping (distinct from countdown)
    isExercise = true;
    left = EX_TIME;
    if (exIdx >= 1) playRapidPing(2, 220, 220);
  }

  function tick(){
    left -= 1;
    since += 1;

    // Schedule 5-second countdown once per phase when we hit 5s remaining
    if (left === 5) playCountdown5();

    if (left <= 0){
      advancePhase();
    }
    draw();
  }

  // ===== Controls =====
  function start(){
    primeAllAudio();
    if (tickId) return;
    playClick();
    tickId = setInterval(tick, 1000);
  }
  function pause(){
    primeAllAudio();
    playClick();
    if (tickId){ clearInterval(tickId); tickId = null; }
  }
  function stop(){
    if (tickId){ clearInterval(tickId); tickId = null; }
  }
  function reset(){
    primeAllAudio();
    playClick();
    stop();
    exIdx = 0;
    setIdx = 1;
    isExercise = true;
    left = EX_TIME;
    since = 0;
    countdownScheduled = false;
    draw();
  }
  function completeNow(){ // ✓ complete current phase immediately
    primeAllAudio();
    playClick();
    left = 0;          // jump to phase end
    advancePhase();    // advance exactly once
    draw();
  }

  // Wire buttons
  startBtn?.addEventListener('click', start);
  pauseBtn?.addEventListener('click', pause);
  resetBtn?.addEventListener('click', reset);
  completeBtn?.addEventListener('click', completeNow);

  // Initial paint
  draw();
});
