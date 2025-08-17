// core.js — stable build + countdown before exercise end AND break end
// Keeps: animated wheel, 20s exercise/20s break, 3 sets per exercise,
// buttons start/pause/reset/skip, skip completes current phase.

window.addEventListener('DOMContentLoaded', () => {
  // ----- State -----
  let timerInterval;
  let timeLeft = 0;
  let isRunning = false;
  let currentExercise = 0;
  let currentSet = 1;
  let inBreak = false;
  const totalSets = 3;

  // countdown scheduler
  let countdownId = null;

  // ----- Config -----
  const exercises = ["Plank", "Hollow Hold", "Side Plank", "Leg Raises", "Extended Plank"];
  const exerciseDuration = 20; // seconds
  const breakDuration    = 20; // seconds

  // ----- DOM (tolerant) -----
  const $ = (id) => document.getElementById(id);
  const timerDisplay  = $('time') || $('timer');     // support #time or #timer
  const statusDisplay = $('status') || $('phase');   // support #status or #phase
  const setDots       = document.querySelectorAll('.set-dot, .tic');

  // SVG progress circle for the wheel
  const wheelEl = document.getElementById('wheelProgress');
  let C = 0;
  if (wheelEl) {
    const rAttr = wheelEl.getAttribute('r');
    const r = rAttr ? parseFloat(rAttr) : 54;
    C = 2 * Math.PI * r;
    wheelEl.style.strokeDasharray = `${C} ${C}`;
    wheelEl.style.strokeDashoffset = `${C}`; // start empty
  }

  // ----- Sounds (only click + beep) -----
  const clickSound    = new Audio("click.mp3");
  const countdownBeep = new Audio("beep.mp3");
  [clickSound, countdownBeep].forEach(a => {
    a.preload = "auto";
    a.volume = 0.35; // short UI effects; should not duck Spotify
  });
  const playSound = (a) => { try { a.currentTime = 0; a.play().catch(()=>{}); } catch {} };

  // ----- Countdown helpers -----
  function clearCountdown(){
    if (countdownId){ clearInterval(countdownId); countdownId = null; }
  }
  function startCountdown5(){
    if (countdownId) return; // already running
    let secs = 5;
    countdownId = setInterval(()=>{
      playSound(countdownBeep); // one ping each second
      secs--;
      if (secs <= 0) clearCountdown();
    }, 1000);
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
    const ratio = Math.max(0, Math.min(1, 1 - (timeLeft / total))); // 0→1 fill
    wheelEl.style.strokeDashoffset = String(C * (1 - ratio));
    wheelEl.classList.toggle('break', inBreak);
    wheelEl.classList.toggle('exercise', !inBreak);
  }

  // ----- Engine -----
  function startTimer(duration, isBreakPhase = false) {
    timeLeft = duration;
    inBreak  = isBreakPhase;
    updateTimerDisplay();
    setStatus(isBreakPhase ? "Break" : exercises[currentExercise], isBreakPhase);
    updateWheel();
    clearCountdown(); // fresh phase → allow a new countdown later

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timeLeft--;
      updateTimerDisplay();
      updateWheel();

      // 🔔 start a 5s countdown for BOTH phase ends (exercise→break and break→exercise)
      if (timeLeft === 5) startCountdown5();

      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        clearCountdown();

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

  // ----- Buttons (keep your IDs) -----
  function bind(id1, id2, handler){
    const el = $(id1) || $(id2);
    if (!el) return;
    const clone = el.cloneNode(true);     // avoid stale/double listeners
    el.parentNode.replaceChild(clone, el);
    clone.addEventListener('click', handler, { passive: true });
  }

  bind('start','startBtn', () => {
    if (isRunning) return;
    playSound(clickSound);
    isRunning = true;
    startTimer(exerciseDuration, false);
  });

  bind('pause','pauseBtn', () => {
    if (!isRunning) return;
    playSound(clickSound);
    clearInterval(timerInterval);
    clearCountdown();
    isRunning = false;
  });

  bind('reset','resetBtn', () => {
    playSound(clickSound);
    clearInterval(timerInterval);
    clearCountdown();
    isRunning = false;
    currentExercise = 0;
    currentSet = 1;
    inBreak = false;
    timeLeft = exerciseDuration;
    updateTimerDisplay();
    setStatus("Ready", false);
    setDots.forEach(d => d.classList && d.classList.remove("done"));
    if (wheelEl) {
      wheelEl.classList.remove('break');
      wheelEl.classList.add('exercise');
      wheelEl.style.strokeDashoffset = `${C}`;
    }
  });

  // Skip / Complete current phase immediately
  bind('skip','completeBtn', () => {
    playSound(clickSound);
    clearInterval(timerInterval);
    clearCountdown();
    timeLeft = 0;

    if (inBreak) {
      // skip break
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
      // skip exercise → straight to break
      startTimer(breakDuration, true);
    }
  });

  // Initial paint
  timeLeft = exerciseDuration;
  updateTimerDisplay();
  setStatus("Ready", false);
  updateWheel();

  console.log('[core] ready (wheel + dual countdown)');
});
