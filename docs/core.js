// core.js — milestone5 + 60s phases + Exercises panel toggle + Skip autostart

window.addEventListener('DOMContentLoaded', () => {
  // ===== Config (edit these) =====
  const EX_TIME = 60;  // 60s per exercise
  const BR_TIME = 60;  // 60s per break

  const NAMES = [
    "Plank",
    "Hollow Hold",
    "Side Plank",
    "Leg Raises",
    "Extended Plank"
  ];
  const TOTAL_SETS = 3; // 3 sets per exercise

  // ===== State =====
  let tickId = null;
  let left = 0;       // seconds left in current phase
  let since = 0;      // total elapsed seconds
  let exIdx = 0;      // current exercise index
  let setIdx = 1;     // current set (1..3)
  let inBreak = false;
  let phaseCuePlayed = false; // prevents double-playing new_exercise within a break

  // ===== DOM =====
  const $ = id => document.getElementById(id);
  const statusEl = $('status') || $('phase');
  const timerEl  = $('timer')  || $('time');
  const sinceEl  = $('since');

  const rows = [ $('row0'), $('row1'), $('row2'), $('row3'), $('row4') ];
  const tics = [ $('tic1'), $('tic2'), $('tic3') ];

  const progEl = $('wheelProgress');

  const startBtn = $('start') || $('startBtn');
  const pauseBtn = $('pause') || $('pauseBtn');
  const resetBtn = $('reset') || $('resetBtn');
  const skipBtn  = $('skip')  || $('completeBtn'); // ✔

  // Exercises panel elements
  const exercisePanel = $('exercisePanel');
  const exerciseToggle = $('exerciseToggle');
  const toggleIcon = $('toggleIcon');

  // ===== Wheel setup =====
  let C = 0;
  if (progEl) {
    const r = parseFloat(progEl.getAttribute('r') || 54);
    C = 2 * Math.PI * r;
    progEl.style.strokeDasharray = `${C} ${C}`;
    progEl.style.strokeDashoffset = `${C}`; // start empty
    progEl.classList.add('exercise');
  }

  // ===== Sounds =====
  // Button click (short UI blip; Spotify-safe)
  const click = new Audio('click.mp3');
  click.preload = 'auto';
  click.volume = 0.45;
  const playClick = () => { try { click.currentTime = 0; click.play().catch(()=>{});} catch{} };

  // Countdown beep: mobile-safe + fallback tone
  const BEEP_SOURCES = ['beep.mp3', 'countdown_beep.mp3']; // tries in order
  const beepPool = [];
  for (let i = 0; i < 4; i++) {
    const src = BEEP_SOURCES[i % BEEP_SOURCES.length];
    const a = new Audio(src);
    a.preload = 'auto';
    a.volume = 0.9;
    beepPool.push(a);
  }
  let beepIdx = 0;

  // WebAudio fallback (never ducks Spotify)
  let AC = null;
  function ensureAC(){ if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch {} } }
  function tone(freq=950, dur=0.12){
    if (!AC) return;
    const t = AC.currentTime;
    const o = AC.createOscillator();
    const g = AC.createGain();
    o.type = 'square';
    o.frequency.value = freq;
    g.gain.value = 0.0001;
    o.connect(g).connect(AC.destination);
    o.start(t);
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.stop(t + dur + 0.02);
  }

  // Unlock audio on first user gesture
  let audioPrimed = false;
  function primeAudio(){
    if (audioPrimed) return;
    audioPrimed = true;
    ensureAC();
    if (AC && AC.state === 'suspended') { AC.resume().catch(()=>{}); }
    // quietly prime elements so future plays are allowed
    [...beepPool, click, newExerciseSound].forEach(a=>{
      const old = a.volume;
      a.volume = 0.01;
      a.play().then(()=>{ a.pause(); a.currentTime = 0; a.volume = old; }).catch(()=>{ a.volume = old; });
    });
  }

  function playBeep(){
    // try Audio element first; if blocked, fallback to tone
    const a = beepPool[beepIdx++ % beepPool.length];
    try {
      a.currentTime = 0;
      const p = a.play();
      if (p && typeof p.then === 'function') {
        p.then(()=> {
          // chop long files to keep it snappy
          setTimeout(()=>{ try{ a.pause(); a.currentTime = 0; }catch{} }, 220);
        }).catch(()=> {
          ensureAC(); tone(950, 0.12);
        });
      } else {
        setTimeout(()=>{ try{ a.pause(); a.currentTime = 0; }catch{} }, 220);
      }
    } catch {
      ensureAC(); tone(950, 0.12);
    }
  }

  // NEW EXERCISE announcement (voice)
  const newExerciseSound = new Audio('new_exercise.mp3');
  newExerciseSound.preload = 'auto';
  newExerciseSound.volume = 0.6;
  function playNewExerciseOnce(){
    try { newExerciseSound.currentTime = 0; newExerciseSound.play().catch(()=>{}); } catch {}
  }

  // ===== UI helpers =====
  const fmt = s => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  function updateWheel(){
    if (!progEl) return;
    const total = inBreak ? BR_TIME : EX_TIME;
    const ratio = Math.max(0, Math.min(1, 1 - (left / total))); // 0→1 fill
    progEl.style.strokeDashoffset = String(C * (1 - ratio));
    progEl.classList.toggle('break', inBreak);
    progEl.classList.toggle('exercise', !inBreak);
  }

  function paintRows(){
    rows.forEach((r,i)=>{
      if (!r) return;
      r.className = 'row';
      if (i < exIdx) r.classList.add('completed');                             // past: neutral
      if (i === exIdx) r.classList.add(inBreak ? 'current-br' : 'current-ex'); // current: LED text
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

  // ===== Phase engine =====
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

    // 🔔 5-second countdown beeps before ANY phase ends
    if (left > 0 && left <= 5) {
      playBeep();
    }

    // 🔊 During the 3rd break, if there is a next exercise, play voice once in last 5s
    if (inBreak && setIdx === TOTAL_SETS && exIdx < NAMES.length - 1 && left > 0 && left <= 5) {
      if (!phaseCuePlayed) {
        playNewExerciseOnce();
        phaseCuePlayed = true;
      }
    }

    if (left <= 0){
      advancePhase();
      phaseCuePlayed = false; // reset guard for next phase
    }
    draw();
  }

  // ===== Controls =====
  function start(){
    if (tickId) return;
    primeAudio();  // unlock sounds on first user action
    playClick();
    tickId = setInterval(tick, 1000);
  }
  function pause(){
    if (!tickId) return;
    primeAudio();
    playClick();
    clearInterval(tickId); tickId = null;
  }
  function stop(){
    if (tickId){ clearInterval(tickId); tickId = null; }
  }
  function reset(){
    primeAudio();
    playClick();
    stop();
    exIdx = 0;
    setIdx = 1;
    inBreak = false;
    left = EX_TIME;
    since = 0;
    phaseCuePlayed = false;
    draw();
  }
  function skip(){ // complete current phase immediately AND AUTOSTART next phase
    primeAudio();
    playClick();
    stop();
    left = 0;
    advancePhase();
    phaseCuePlayed = false;
    draw();
    if (!tickId) tickId = setInterval(tick, 1000); // autostart
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

  // ===== Exercises panel toggle =====
  if (exerciseToggle && exercisePanel){
    exerciseToggle.addEventListener('click', () => {
      const collapsed = exercisePanel.classList.toggle('collapsed');
      exerciseToggle.setAttribute('aria-expanded', String(!collapsed));
      // rotate chevron via CSS (class on panel controls display)
      if (toggleIcon){ /* purely visual; CSS handles rotation when .collapsed */ }
    }, { passive:true });
  }

  // ===== Init =====
  left = EX_TIME;
  since = 0;
  draw();

  console.log('[core] milestone5 + 60s + panel toggle + Skip autostart loaded');
});
