// core.js — milestone6 + per-exercise start voices (5x), 5s beeps,
// “new_exercise.mp3” warning, celebration at end, skip-autostart,
// animated wheel + LED rows, 60s exercise & break

window.addEventListener('DOMContentLoaded', () => {
  // ===== Config =====
  const EX_TIME = 60;  // seconds per exercise
  const BR_TIME = 60;  // seconds per break

  const NAMES = [
    "Extended Plank",
    "Hollow Hold",
    "Wrist Elbow Crunch",
    "Reverse Crunch",
    "Ab Roller"
  ];
  const TOTAL_SETS = 3;

  // ===== State =====
  let tickId = null;
  let left = 0;         // seconds left in current phase
  let since = 0;        // elapsed seconds since start
  let exIdx = 0;        // exercise index 0..4
  let setIdx = 1;       // set index 1..3
  let inBreak = false;  // phase flag
  let phaseCuePlayed = false; // guard for “new_exercise.mp3” in last 5s of 3rd break
  let completed = false;      // session done flag

  // Per-exercise voice files (play once when each exercise starts for the first time)
  const startVoiceFiles = [
    "Extended_Plank_Starting.mp3",
    "Hollow_Hold_Starting.mp3",
    "Wrist_To_Elbow_Crunch_Starting.mp3",
    "Reverse_Crunch_Starting.mp3",
    "Abs_Roll_Out_Starting.mp3" // maps to “Ab Roller”
  ];
  const startVoices = startVoiceFiles.map(f => {
    const a = new Audio(f);
    a.preload = "auto";
    a.volume = 0.7;
    return a;
  });
  let startVoicePlayed = Array(startVoiceFiles.length).fill(false);
  function playStartVoice(i){
    try {
      if (!startVoicePlayed[i] && startVoices[i]) {
        startVoices[i].currentTime = 0;
        startVoices[i].play().catch(()=>{});
        startVoicePlayed[i] = true;
      }
    } catch {}
  }

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
  const skipBtn  = $('skip')  || $('completeBtn');

  // Expand/collapse panel
  const exercisePanel  = $('exercisePanel');
  const exerciseToggle = $('exerciseToggle');
  const toggleIcon     = $('toggleIcon');

  // ===== Wheel geometry =====
  let C = 0;
  if (progEl) {
    const r = parseFloat(progEl.getAttribute('r') || 54);
    C = 2 * Math.PI * r;
    progEl.style.strokeDasharray = `${C} ${C}`;
    progEl.style.strokeDashoffset = `${C}`; // empty start
    progEl.classList.add('exercise');
  }

  // ===== Sounds =====
  const click = new Audio('click.mp3'); click.preload = 'auto'; click.volume = 0.45;
  const playClick = () => { try { click.currentTime = 0; click.play().catch(()=>{});} catch{} };

  // 5s countdown beeps (with WebAudio fallback so it won’t duck Spotify)
  const BEEP_SOURCES = ['beep.mp3', 'countdown_beep.mp3'];
  const beepPool = [];
  for (let i = 0; i < 4; i++) {
    const a = new Audio(BEEP_SOURCES[i % BEEP_SOURCES.length]);
    a.preload = 'auto'; a.volume = 0.9; beepPool.push(a);
  }
  let beepIdx = 0;

  let AC = null;
  function ensureAC(){ if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch {} } }
  function tone(freq=950, dur=0.12){
    if (!AC) return;
    const t = AC.currentTime;
    const o = AC.createOscillator();
    const g = AC.createGain();
    o.type = 'square'; o.frequency.value = freq;
    g.gain.value = 0.0001;
    o.connect(g).connect(AC.destination);
    o.start(t);
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.stop(t + dur + 0.02);
  }

  function playBeep(){
    const a = beepPool[beepIdx++ % beepPool.length];
    try {
      a.currentTime = 0;
      const p = a.play();
      if (p && typeof p.then === 'function') {
        p.then(()=> setTimeout(()=>{ try{ a.pause(); a.currentTime = 0; }catch{} }, 220))
         .catch(()=> { ensureAC(); tone(950, 0.12); });
      } else {
        setTimeout(()=>{ try{ a.pause(); a.currentTime = 0; }catch{} }, 220);
      }
    } catch { ensureAC(); tone(950, 0.12); }
  }

  // “New exercise coming up” voice (during last 5s of 3rd break)
  const newExerciseSound = new Audio('new_exercise.mp3');
  newExerciseSound.preload = 'auto';
  newExerciseSound.volume = 0.6;
  function playNewExerciseOnce(){ try { newExerciseSound.currentTime = 0; newExerciseSound.play().catch(()=>{}); } catch {} }

  // Final celebration
  const celebration = new Audio('celebration.mp3'); celebration.preload = 'auto'; celebration.volume = 0.7;
  function playCelebration(){ try { celebration.currentTime = 0; celebration.play().catch(()=>{});} catch{} }

  // Prime audio on first user gesture
  let audioPrimed = false;
  function primeAudio(){
    if (audioPrimed) return;
    audioPrimed = true;
    ensureAC();
    if (AC && AC.state === 'suspended') { AC.resume().catch(()=>{}); }
    [...beepPool, click, celebration, newExerciseSound, ...startVoices].forEach(a=>{
      const old = a.volume; a.volume = 0.01;
      a.play().then(()=>{ a.pause(); a.currentTime = 0; a.volume = old; }).catch(()=>{ a.volume = old; });
    });
  }

  // ===== UI helpers =====
  const fmt = s => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  function updateWheel(){
    if (!progEl) return;
    const total = inBreak ? BR_TIME : EX_TIME;
    const ratio = Math.max(0, Math.min(1, 1 - (left / total))); // fill 0→1
    progEl.style.strokeDashoffset = String(C * (1 - ratio));
    progEl.classList.toggle('break', inBreak);
    progEl.classList.toggle('exercise', !inBreak);
  }

  function paintRows(){
    rows.forEach((r,i)=>{
      if (!r) return;
      r.className = 'row';
      if (i < exIdx) r.classList.add('completed');                     // past → grey
      if (i === exIdx) r.classList.add(inBreak ? 'current-br' : 'current-ex'); // current → LED
    });
  }

  function paintTics(){
    const done = inBreak ? setIdx : (setIdx - 1);
    tics.forEach((t,i)=> t && t.classList.toggle('done', i < done));
  }

  function draw(){
    if (completed){
      if (statusEl){ statusEl.textContent = "Exercise completed."; statusEl.className = "status done"; }
      if (timerEl){ timerEl.textContent = "00:00"; }
      updateWheel(); paintRows(); paintTics(); return;
    }
    if (statusEl) statusEl.textContent = inBreak ? "Break" : NAMES[exIdx];
    if (timerEl)  timerEl.textContent  = fmt(left);
    if (sinceEl)  sinceEl.textContent  = fmt(since);
    updateWheel(); paintRows(); paintTics();
  }

  // ===== Phase engine =====
  function advancePhase(){
    if (inBreak){
      // finished a break
      if (setIdx < TOTAL_SETS){
        setIdx += 1;        // next set of same exercise
        inBreak = false;
        left = EX_TIME;
        return false;
      }
      // finished 3 sets → next exercise
      setIdx = 1;
      exIdx += 1;
      if (exIdx >= NAMES.length){
        stop();
        completed = true;
        left = 0;
        playCelebration();  // final cheer
        return true;
      }
      inBreak = false;
      left = EX_TIME;
      playStartVoice(exIdx); // announce new exercise (first time only)
      return false;
    } else {
      // finished exercise → go to break
      inBreak = true;
      left = BR_TIME;
      return false;
    }
  }

  function tick(){
    if (completed) return;
    left -= 1; since += 1;

    // 5-second countdown before ANY phase ends
    if (left > 0 && left <= 5) playBeep();

    // During the 3rd break, cue “new exercise coming up” in last 5s (if there is a next exercise)
    if (inBreak && setIdx === TOTAL_SETS && exIdx < NAMES.length - 1 && left > 0 && left <= 5) {
      if (!phaseCuePlayed) { playNewExerciseOnce(); phaseCuePlayed = true; }
    }

    if (left <= 0){
      const done = advancePhase();
      phaseCuePlayed = false;
      if (done){ draw(); return; }
    }
    draw();
  }

  // ===== Controls =====
  function start(){
    if (tickId || completed) return;
    primeAudio(); playClick();
    // If starting at very beginning (first set of first exercise), play that voice once
    if (!inBreak && setIdx === 1) playStartVoice(exIdx);
    tickId = setInterval(tick, 1000);
  }
  function pause(){
    if (!tickId) return;
    primeAudio(); playClick();
    clearInterval(tickId); tickId = null;
  }
  function stop(){
    if (tickId){ clearInterval(tickId); tickId = null; }
  }
  function reset(){
    primeAudio(); playClick(); stop();
    exIdx = 0; setIdx = 1; inBreak = false; left = EX_TIME; since = 0;
    completed = false; phaseCuePlayed = false;
    startVoicePlayed = Array(startVoiceFiles.length).fill(false); // allow voices again
    draw();
  }
  function skip(){ // complete current phase immediately; autostart next unless finished
    if (completed) return;
    primeAudio(); playClick(); stop();
    left = 0;
    const done = advancePhase();
    phaseCuePlayed = false; draw();
    if (!done && !tickId) tickId = setInterval(tick, 1000);
  }

  // Safe bind (replace node to avoid duplicate handlers)
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

  // Expand/collapse exercises
  if (exerciseToggle && exercisePanel){
    exerciseToggle.addEventListener('click', () => {
      const collapsed = exercisePanel.classList.toggle('collapsed');
      exerciseToggle.setAttribute('aria-expanded', String(!collapsed));
      if (toggleIcon){ /* rotation handled by CSS via .collapsed */ }
    }, { passive:true });
  }

  // ===== Init =====
  left = EX_TIME;
  since = 0;
  draw();

  console.log('[core] milestone6 + per-exercise start voices loaded');
});
