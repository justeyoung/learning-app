// core.js — checkpoint + single "new_exercise.mp3" cue at end of 3rd break (last 5s)

window.addEventListener('DOMContentLoaded', () => {
  // ----- State -----
  let timerInterval;
  let timeLeft = 0;
  let isRunning = false;
  let currentExercise = 0;
  let currentSet = 1;
  let inBreak = false;
  const totalSets = 3;

  // Track whether we've already played a special cue in the current phase
  let phaseCuePlayed = false;

  // ----- Config -----
  const exercises = ["Plank", "Hollow Hold", "Side Plank", "Leg Raises", "Extended Plank"];
  const exerciseDuration = 13; // seconds
  const breakDuration    = 13; // seconds

  // ----- DOM (tolerant) -----
  const $ = (id) => document.getElementById(id);
  const timerDisplay  = $('time') || $('timer');
  const statusDisplay = $('status') || $('phase');
  const setDots       = document.querySelectorAll('.set-dot, .tic');
  const wheelEl       = document.getElementById('wheelProgress');

  // Wheel setup
  let C = 0;
  if (wheelEl) {
    const r = parseFloat(wheelEl.getAttribute('r') || 54);
    C = 2 * Math.PI * r;
    wheelEl.style.strokeDasharray = `${C} ${C}`;
    wheelEl.style.strokeDashoffset = `${C}`;
  }

  // ----- Sounds -----
  // Click
  const clickSound = new Audio("click.mp3");
  clickSound.preload = "auto";
  clickSound.volume = 0.45;

  // Countdown beep: try multiple filenames, fallback to WebAudio tone if blocked/missing
  const BEEP_CANDIDATES = ["beep.mp3", "countdown_beep.mp3"];
  const beepPool = BEEP_CANDIDATES.map(src => { const a = new Audio(src); a.preload="auto"; a.volume=0.9; return a; });
  let beepIdx = 0;

  // New exercise voice cue (single play when moving to next exercise)
  const newExerciseSound = new Audio("new_exercise.mp3");
  newExerciseSound.preload = "auto";
  newExerciseSound.volume = 0.6;

  // WebAudio fallback (does not duck Spotify)
  let AC = null;
  function ensureAC(){ if (!AC) { try { AC = new (window.AudioContext||window.webkitAudioContext)(); } catch {} } }
  function tone(freq=950, dur=0.12){
    if (!AC) return;
    const t = AC.currentTime;
    const o = AC.createOscillator();
    const g = AC.createGain();
    o.type = "square";
    o.frequency.value = freq;
    g.gain.value = 0.0001;
    o.connect(g).connect(AC.destination);
    o.start(t);
    g.gain.exponentialRampToValueAtTime(0.25, t+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
    o.stop(t+dur+0.02);
  }

  // Unlock audio on first user gesture
  let audioPrimed = false;
  function primeAudio(){
    if (audioPrimed) return;
    audioPrimed = true;
    ensureAC();
    if (AC && AC.state === "suspended") { AC.resume().catch(()=>{}); }
    // quick silent prime so iOS lets future plays through
    [clickSound, newExerciseSound, ...beepPool].forEach(a=>{
      a.volume = 0.01;
      a.play().then(()=>{ a.pause(); a.currentTime = 0; a.volume = a === newExerciseSound ? 0.6 : (a === clickSound ? 0.45 : 0.9); }).catch(()=>{});
    });
  }

  const playClick = ()=>{ try { clickSound.currentTime = 0; clickSound.play().catch(()=>{});} catch {} };

  // Safe beep: try audio; if blocked/missing, fallback tone
  function playBeep(){
    let tried = 0;
    function tryNext(){
      if (tried >= beepPool.length){
        ensureAC(); tone(950, 0.12);
        return;
      }
      const a = beepPool[(beepIdx + tried) % beepPool.length];
      try {
        a.currentTime = 0;
        const p = a.play();
        if (p && typeof p.then === "function"){
          p.then(()=>{
            setTimeout(()=>{ try{ a.pause(); a.currentTime=0; }catch{} }, 220);
          }).catch(()=>{
            tried++; tryNext();
          });
        } else {
          setTimeout(()=>{ try{ a.pause(); a.currentTime=0; }catch{} }, 220);
        }
      } catch {
        tried++; tryNext();
      }
    }
    tryNext();
    beepIdx = (beepIdx + 1) % beepPool.length;
  }

  function playNewExerciseOnce(){
    try {
      newExerciseSound.currentTime = 0;
      newExerciseSound.play().catch(()=>{ /* ignore; countdown still plays */ });
    } catch {}
  }

  // ----- UI helpers -----
  function updateTimerDisplay() {
    const m = String(Math.floor(timeLeft / 60)).padStart(2, "0");
    const s = String(timeLeft % 60).padStart(2, "0");
    if (timerDisplay) timerDisplay.textContent = `${m}:${s}`;
  }
  function setStatus(text, isBreakPhase) {
    if (!statusDisplay) return;
    statusDisplay.textContent = text;
    statusDisplay.className = isBreakPhase ? "status break" : "status exercise";
  }
  function updateWheel() {
    if (!wheelEl) return;
    const total = inBreak ? breakDuration : exerciseDuration;
    const ratio = Math.max(0, Math.min(1, 1 - (timeLeft / total)));
    wheelEl.style.strokeDashoffset = String(C * (1 - ratio));
    wheelEl.classList.toggle('break', inBreak);
    wheelEl.classList.toggle('exercise', !inBreak);
  }

  // ----- Engine -----
  function startTimer(duration, isBreakPhase = false) {
    timeLeft = duration;
    inBreak  = isBreakPhase;
    phaseCuePlayed = false; // reset per phase
    updateTimerDisplay();
    setStatus(isBreakPhase ? "Break" : exercises[currentExercise], isBreakPhase);
    updateWheel();

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timeLeft--;
      updateTimerDisplay();
      updateWheel();

      // Beep once each second in the last 5s of ANY phase
      if (timeLeft <= 5 && timeLeft > 0) {
        playBeep();
      }

      // NEW: during 3rd break only (and only if there IS a next exercise),
      // play "new_exercise.mp3" ONCE in the last 5s window.
      if (
        inBreak &&
        currentSet === totalSets &&                     // it's the 3rd break
        currentExercise < exercises.length - 1 &&       // there is a next exercise
        timeLeft <= 5 && timeLeft > 0 &&
        !phaseCuePlayed
      ) {
        playNewExerciseOnce();
        phaseCuePlayed = true; // ensure only once per that break
      }

      if (timeLeft <= 0) {
        clearInterval(timerInterval);

        if (inBreak) {
          // break ended
          if (currentSet < totalSets) {
            currentSet++;
            startTimer(exerciseDuration, false);
          } else {
            // finished 3 sets → next exercise
            if (setDots[currentSet - 1]) setDots[currentSet - 1].classList.add("done");
            currentSet = 1;
            currentExercise++;
            if (currentExercise < exercises.length) {
              startTimer(exerciseDuration, false);
            } else {
              setStatus("Exercise completed.", false);
              if (timerDisplay) timerDisplay.textContent = "00:00";
              isRunning = false;
              updateWheel();
            }
          }
        } else {
          // exercise ended → always break
          startTimer(breakDuration, true);
        }
      }
    }, 1000);
  }

  // ----- Buttons -----
  function bind(id1, id2, handler){
    const el = ($(id1) || $(id2));
    if (!el) return;
    const clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
    clone.addEventListener('click', (e)=>{ primeAudio(); handler(e); }, { passive: true });
  }

  bind('start','startBtn', () => {
    if (isRunning) return;
    playClick();
    isRunning = true;
    startTimer(exerciseDuration, false);
  });

  bind('pause','pauseBtn', () => {
    if (!isRunning) return;
    playClick();
    clearInterval(timerInterval);
    isRunning = false;
  });

  bind('reset','resetBtn', () => {
    playClick();
    clearInterval(timerInterval);
    isRunning = false;
    currentExercise = 0;
    currentSet = 1;
    inBreak = false;
    phaseCuePlayed = false;
    timeLeft = exerciseDuration;
    updateTimerDisplay();
    setStatus("Ready", false);
    setDots.forEach(d => d.classList && d.classList.remove("done"));
    if (wheelEl) {
      wheelEl.style.strokeDashoffset = `${C}`;
      wheelEl.classList.add('exercise');
      wheelEl.classList.remove('break');
    }
  });

  bind('skip','completeBtn', () => {
    playClick();
    clearInterval(timerInterval);
    timeLeft = 0;

    if (inBreak) {
      if (currentSet < totalSets) {
        currentSet++;
        startTimer(exerciseDuration, false);
      } else {
        if (setDots[currentSet - 1]) setDots[currentSet - 1].classList.add("done");
        currentSet = 1;
        currentExercise++;
        if (currentExercise < exercises.length) {
          startTimer(exerciseDuration, false);
        } else {
          setStatus("Exercise completed.", false);
          if (timerDisplay) timerDisplay.textContent = "00:00";
          isRunning = false;
          updateWheel();
        }
      }
    } else {
      startTimer(breakDuration, true);
    }
  });

  // Initial paint
  timeLeft = exerciseDuration;
  updateTimerDisplay();
  setStatus("Ready", false);
  updateWheel();

  console.log('[core] ready (dual countdown + new_exercise cue on 3rd break)');
});
