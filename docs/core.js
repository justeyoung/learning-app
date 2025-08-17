// core.js — robust selectors, safe wiring, inBreak fixed, single "new exercise" ping
// Keeps your behavior: 20s exercise, 20s break, 3 sets per exercise,
// 5s countdown ONLY for exercise→break, new exercise alert once.

window.addEventListener('DOMContentLoaded', () => {
  // ----- State -----
  let timerInterval;
  let timeLeft = 0;
  let isRunning = false;
  let currentExercise = 0;
  let currentSet = 1;
  let inBreak = false;
  const totalSets = 3;

  // ----- Config -----
  const exercises = ["Plank", "Hollow Hold", "Side Plank", "Leg Raises", "Extended Plank"];
  const exerciseDuration = 20; // seconds
  const breakDuration    = 20; // seconds

  // ----- DOM (tolerant to ID differences) -----
  const $ = (id) => document.getElementById(id);
  const timerDisplay  = $('time') || $('timer');     // support either #time or #timer
  const statusDisplay = $('status') || $('phase');   // fallback if page used a different id
  const setDots       = document.querySelectorAll('.set-dot, .tic'); // support either class

  // ----- Sounds (short; shouldn’t duck Spotify) -----
  const clickSound        = new Audio("click.mp3");
  const countdownBeep     = new Audio("beep.mp3");
  const newExerciseSound  = new Audio("new_exercise.mp3");  // play once at exercise change
  const rapidPing         = new Audio("digital_ping.mp3");  // keep single ping only

  [clickSound, countdownBeep, newExerciseSound, rapidPing].forEach(a => {
    a.preload = "auto";
    a.volume = 0.35;
  });

  const playSound = (a) => { try { a.currentTime = 0; a.play().catch(()=>{}); } catch {} };

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

  // ----- Engine -----
  function startTimer(duration, isBreakPhase = false) {
    timeLeft = duration;
    inBreak  = isBreakPhase;
    updateTimerDisplay();
    setStatus(isBreakPhase ? "Break" : exercises[currentExercise], isBreakPhase);

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timeLeft--;
      updateTimerDisplay();

      // Beeps ONLY before exercise→break (what you asked)
      if (!inBreak && timeLeft <= 5 && timeLeft > 0) {
        playSound(countdownBeep);
      }

      if (timeLeft <= 0) {
        clearInterval(timerInterval);

        if (inBreak) {
          // break ended
          if (currentSet < totalSets) {
            currentSet++;
            startTimer(exerciseDuration, false);
          } else {
            // all 3 sets done → next exercise
            if (setDots[currentSet - 1]) setDots[currentSet - 1].classList.add("done");
            currentSet = 1;
            currentExercise++;

            if (currentExercise < exercises.length) {
              // SINGLE alert before NEW exercise (not between sets)
              playSound(newExerciseSound); // comment this if you only want ping
              // playSound(rapidPing);     // OR swap to ping if you prefer that instead of voice
              startTimer(exerciseDuration, false);
            } else {
              setStatus("Exercise completed.", false);
              if (timerDisplay) timerDisplay.textContent = "00:00";
              isRunning = false;
            }
          }
        } else {
          // exercise ended → always break
          startTimer(breakDuration, true);
        }
      }
    }, 1000);
  }

  // ----- Buttons (support either id scheme) -----
  const startBtn = $('start') || $('startBtn');
  const pauseBtn = $('pause') || $('pauseBtn');
  const resetBtn = $('reset') || $('resetBtn');
  const skipBtn  = $('skip')  || $('completeBtn'); // tick/complete

  function bind(el, handler){
    if (!el) return;
    const clone = el.cloneNode(true);        // nuke any stale listeners
    el.parentNode.replaceChild(clone, el);
    clone.addEventListener('click', handler, { passive: true });
  }

  bind(startBtn, () => {
    if (isRunning) return;
    playSound(clickSound);
    isRunning = true;
    startTimer(exerciseDuration, false);
  });

  bind(pauseBtn, () => {
    if (!isRunning) return;
    playSound(clickSound);
    clearInterval(timerInterval);
    isRunning = false;
  });

  bind(resetBtn, () => {
    playSound(clickSound);
    clearInterval(timerInterval);
    isRunning = false;
    currentExercise = 0;
    currentSet = 1;
    inBreak = false;
    timeLeft = exerciseDuration;
    updateTimerDisplay();
    setStatus("Ready", false);
    setDots.forEach(d => d.classList && d.classList.remove("done"));
  });

  // Complete current phase immediately
  bind(skipBtn, () => {
    playSound(clickSound);
    clearInterval(timerInterval);
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
          playSound(newExerciseSound); // or playSound(rapidPing);
          startTimer(exerciseDuration, false);
        } else {
          setStatus("Exercise completed.", false);
          if (timerDisplay) timerDisplay.textContent = "00:00";
          isRunning = false;
        }
      }
    } else {
      // skip exercise → straight to break
      startTimer(breakDuration, true);
    }
  });

  // Initial paint (so you see 00:00 / Ready)
  timeLeft = exerciseDuration;
  updateTimerDisplay();
  setStatus("Ready", false);

  // Debug: see what got wired
  console.log('[core] wired:', {
    start: !!startBtn, pause: !!pauseBtn, reset: !!resetBtn, skip: !!skipBtn,
    timerDisplay: !!timerDisplay, statusDisplay: !!statusDisplay, setDots: setDots.length
  });
});
