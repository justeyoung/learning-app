// core.js — stable build + fixed countdown beeps
window.addEventListener('DOMContentLoaded', () => {
  let timerInterval;
  let timeLeft = 0;
  let isRunning = false;
  let currentExercise = 0;
  let currentSet = 1;
  let inBreak = false;
  const totalSets = 3;

  const exercises = ["Plank", "Hollow Hold", "Wrist to knee crunch", "Ab roller", "Reversed crunch"];
  const exerciseDuration = 20;
  const breakDuration    = 20;

  const $ = (id) => document.getElementById(id);
  const timerDisplay  = $('time') || $('timer');
  const statusDisplay = $('status') || $('phase');
  const setDots       = document.querySelectorAll('.set-dot, .tic');
  const wheelEl       = document.getElementById('wheelProgress');

  // wheel setup
  let C = 0;
  if (wheelEl) {
    const r = parseFloat(wheelEl.getAttribute('r') || 54);
    C = 2 * Math.PI * r;
    wheelEl.style.strokeDasharray = `${C} ${C}`;
    wheelEl.style.strokeDashoffset = `${C}`;
  }

  // sounds
  const clickSound    = new Audio("click.mp3");
  const countdownBeep = new Audio("beep.mp3");
  [clickSound, countdownBeep].forEach(a => {
    a.preload = "auto";
    a.volume = 0.35;
  });
  const playSound = (a) => { try { a.currentTime = 0; a.play().catch(()=>{}); } catch {} };

  // helpers
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
    const ratio = 1 - (timeLeft / total);
    wheelEl.style.strokeDashoffset = String(C * (1 - ratio));
    wheelEl.classList.toggle('break', inBreak);
    wheelEl.classList.toggle('exercise', !inBreak);
  }

  // engine
  function startTimer(duration, isBreakPhase = false) {
    timeLeft = duration;
    inBreak  = isBreakPhase;
    updateTimerDisplay();
    setStatus(isBreakPhase ? "Break" : exercises[currentExercise], isBreakPhase);
    updateWheel();

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timeLeft--;
      updateTimerDisplay();
      updateWheel();

      // 🔔 countdown beeps reliably trigger in last 5 sec
      if (timeLeft <= 5 && timeLeft > 0) {
        playSound(countdownBeep);
      }

      if (timeLeft <= 0) {
        clearInterval(timerInterval);

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
      }
    }, 1000);
  }

  // buttons
  function bind(id1, id2, handler){
    const el = $(id1) || $(id2);
    if (!el) return;
    el.addEventListener('click', handler, { passive: true });
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
    isRunning = false;
  });

  bind('reset','resetBtn', () => {
    playSound(clickSound);
    clearInterval(timerInterval);
    isRunning = false;
    currentExercise = 0;
    currentSet = 1;
    inBreak = false;
    timeLeft = exerciseDuration;
    updateTimerDisplay();
    setStatus("Ready", false);
    setDots.forEach(d => d.classList.remove("done"));
    if (wheelEl) {
      wheelEl.style.strokeDashoffset = `${C}`;
      wheelEl.classList.add('exercise');
      wheelEl.classList.remove('break');
    }
  });

  bind('skip','completeBtn', () => {
    playSound(clickSound);
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

  // initial
  timeLeft = exerciseDuration;
  updateTimerDisplay();
  setStatus("Ready", false);
  updateWheel();

  console.log('[core] ready (click + countdown beeps)');
});
