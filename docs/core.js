// Friday-morning stable + 5s countdown beeps before every phase change
// - Animated wheel (red exercise / blue break)
// - 20s exercise / 20s break; 3 sets per exercise
// - LED text highlight only for current (green exercise / blue break); completed neutral
// - 3 dots show sets progress for the CURRENT exercise
// - Buttons: start/pause/reset/skip (icons)
// - Sounds: click on buttons + short beep at 5,4,3,2,1 before ANY phase ends

window.addEventListener('DOMContentLoaded', () => {
  // ----- State -----
  let tickId = null;
  let left = 0;                 // seconds left in current phase
  let since = 0;                // elapsed total seconds
  let exIdx = 0;                // 0..4 which exercise
  let setIdx = 1;               // 1..3 which set
  let inBreak = false;          // true when in break
  const TOTAL_SETS = 3;

  // ----- Config -----
  const EX_TIME = 20;           // change to 180 for 3 minutes
  const BR_TIME = 20;

  const NAMES = [
    "Plank",
    "Hollow Hold",
    "Side Plank",
    "Leg Raises",
    "Extended Plank"
  ];

  // ----- DOM -----
  const $ = id => document.getElementById(id);
  const statusEl = $('status') || $('phase');
  const timerEl  = $('timer')  || $('time');
  const sinceEl  = $('since');

  const rows = [
    $('row0'), $('row1'), $('row2'), $('row3'), $('row4')
  ];
  const tics = [
    $('tic1'), $('tic2'), $('tic3')
  ];

  const progEl = $('wheelProgress');

  const startBtn = $('start') || $('startBtn');
  const pauseBtn = $('pause') || $('pauseBtn');
  const resetBtn = $('reset') || $('resetBtn');
  const skipBtn  = $('skip')  || $('completeBtn'); // ✓

  // Wheel setup
  let C = 0;
  if (progEl) {
    const r = parseFloat(progEl.getAttribute('r') || 54);
    C = 2 * Math.PI * r;
    progEl.style.strokeDasharray = `${C} ${C}`;
    progEl.style.strokeDashoffset = `${C}`;
    progEl.classList.add('exercise');
  }

  // ----- Sounds -----
  const click = new Audio('click.mp3');
  click.preload = 'auto';
  click.volume = 0.45;

  const beep = new Audio('beep.mp3');       // keep it short/mono so it won't duck Spotify
  beep.preload = 'auto';
  beep.volume = 0.9;

  const playClick = () => { try { click.currentTime = 0; click.play().catch(()=>{});} catch{} };
  const playBeep  = () => { try { beep.currentTime = 0;  beep.play().catch(()=>{}); } catch{} };

  // ----- UI helpers -----
  const fmt = s => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  function updateWheel(){
    if (!progEl) return;
    const total = inBreak ? BR_TIME : EX_TIME;
    const ratio = Math.max(0, Math.min(1, 1 - (left / total)));
    progEl.style.strokeDashoffset = String(C * (1 - ratio));
    progEl.classList.toggle('break', inBreak);
    progEl.classList.toggle('exercise', !inBreak);
  }

  function paintRows(){
    rows.forEach((r,i)=>{
      if (!r) return;
      r.className = 'row';
      if (i < exIdx) r.classList.add('completed');                 // past are neutral
      if (i === exIdx) r.classList.add(inBreak ? 'current-br' : 'current-ex'); // current glows
    });
  }

  function paintTics(){
    // During exercise: dots show sets already completed (setIdx-1).
    // During break: dots show the set just completed (setIdx).
    const done = inBreak ? setIdx : (setIdx - 1);
    tics.forEach((t,i)=> t && t.classList.toggle('done', i < done));
  }

  function draw(){
    if (statusEl) statusEl.textContent = inBreak ? "Break" : NAMES[exIdx];
    if (timerEl)  timerEl.textContent  = fmt(left);
    if (sinceEl)  sinceEl.textContent  = fmt(since);
    updateWheel();
    paintRows();
    paintTics();
  }

  // ----- Phase engine -----
  function advancePhase(){
    if (inBreak){
      // finished a break
      if (setIdx < TOTAL_SETS){
        setIdx += 1;          // next set of same exercise
        inBreak = false;
        left = EX_TIME;
        return;
      }
      // finished 3 sets -> next exercise
      setIdx = 1;
      exIdx += 1;
      if (exIdx >= NAMES.length){
        stop();
        if (statusEl) statusEl.textContent = "Exercise completed.";
        left = 0;
        return;
      }
      inBreak = false;
      left = EX_TIME;
      return;
    } else {
      // finished an exercise block -> go to break
      inBreak = true;
      left = BR_TIME;
      return;
    }
  }

  function tick(){
    left -= 1;
    since += 1;

    // 🔔 5-second countdown beep before ANY phase ends (exercise→break or break→exercise)
    if (left > 0 && left <= 5) {
      playBeep();
    }

    if (left <= 0){
      advancePhase();
    }
    draw();
  }

  // ----- Controls -----
  function start(){
    if (tickId) return;
    playClick();
    tickId = setInterval(tick, 1000);
  }
  function pause(){
    if (!tickId) return;
    playClick();
    clearInterval(tickId); tickId = null;
  }
  function stop(){
    if (tickId){ clearInterval(tickId); tickId = null; }
  }
  function reset(){
    playClick();
    stop();
    exIdx = 0;
    setIdx = 1;
    inBreak = false;
    left = EX_TIME;
    since = 0;
    draw();
  }
  function skip(){ // complete current phase immediately
    playClick();
    stop();
    left = 0;
    advancePhase();
    draw();
  }

  // Bind (clone to avoid stale handlers)
  function bind(el, handler){
    if (!el) return;
    const clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
    clone.addEventListener('click', handler, { passive:true });
  }
  bind(startBtn, start);
  bind(pauseBtn, pause);
  bind(resetBtn, reset);
  bind(skipBtn,  skip);

  // Init
  left = EX_TIME;
  since = 0;
  draw();

  console.log('[core] Friday-stable + countdown beeps loaded');
});
