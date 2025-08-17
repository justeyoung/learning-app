// core.js — same behavior, robust button wiring (supports both ID schemes), inBreak fixed

window.addEventListener('DOMContentLoaded', () => {
  let timerInterval;
  let timeLeft = 0;
  let isRunning = false;
  let currentExercise = 0;
  let currentSet = 1;
  let inBreak = false;      // keep this in sync
  const totalSets = 3;

  const exercises = ["Plank", "Hollow Hold", "Side Plank", "Leg Raises", "Extended Plank"];
  const exerciseDuration = 20; // seconds (testing)
  const breakDuration = 20;    // seconds (testing)

  const timerDisplay = document.getElementById("time");
  const statusDisplay = document.getElementById("status");
  const sinceStartDisplay = document.getElementById("since-start"); // safe if null
  const exerciseList = document.getElementById("exercise-list");    // safe if null
  const setDots = document.querySelectorAll(".set-dot");

  // 🔊 sounds
  const clickSound        = new Audio("click.mp3");
  const countdownBeep     = new Audio("beep.mp3");
  const newExerciseSound  = new Audio("new_exercise.mp3");  // spoken alert (keep/disable as you prefer)
  const rapidPing         = new Audio("digital_ping.mp3");  // short alert

  [clickSound, countdownBeep, newExerciseSound, rapidPing].forEach(s => {
    s.preload = "auto";
    s.volume = 0.35; // short effects; shouldn't duck Spotify
  });

  function playSound(sound) {
    try {
      sound.currentTime = 0;
      sound.play().catch(() => {});
    } catch {}
  }

  function updateTimerDisplay() {
    const minutes = String(Math.floor(timeLeft / 60)).padStart(2, "0");
    const seconds = String(timeLeft % 60).padStart(2, "0");
    if (timerDisplay) timerDisplay.textContent = `${minutes}:${seconds}`;
  }

  function startTimer(duration, isBreakPhase = false) {
    timeLeft = duration;
    inBreak = isBreakPhase; // ✅ keep this updated
    updateTimerDisplay();

    if (statusDisplay) {
      statusDisplay.textContent = isBreakPhase ? "Break" : exercises[currentExercise];
      statusDisplay.className = isBreakPhase ? "status break" : "status exercise";
    }

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timeLeft--;
      updateTimerDisplay();

      // ⏱️ countdown beeps (last 5 sec of any phase)
      if (timeLeft <= 5 && timeLeft > 0) playSound(countdownBeep);

      if (timeLeft <= 0) {
        clearInterval(timerInterval);

        if (isBreakPhase) {
          // after break
          if (currentSet < totalSets) {
            currentSet++;
            startTimer(exerciseDuration, false);
          } else {
            // all 3 sets done → move to next exercise
            if (setDots[currentSet - 1]) setDots[currentSet - 1].classList.add("done");
            currentSet = 1;
            currentExercise++;

            if (currentExercise < exercises.length) {
              // special alert before a NEW exercise (single hits)
              // If you want ONLY one of these, comment the other.
              playSound(newExerciseSound);
              playSound(rapidPing);

              startTimer(exerciseDuration, false);
            } else {
              if (statusDisplay) statusDisplay.textContent = "Exercise completed.";
              if (timerDisplay)  timerDisplay.textContent  = "00:00";
              isRunning = false;
            }
          }
        } else {
          // after exercise → always break
          startTimer(breakDuration, true);
        }
      }
    }, 1000);
  }

  // ---- Robust button wiring (supports both id styles) ----
  const $ = (id) => document.getElementById(id);
  const startEls   = [$('start'), $('startBtn')].filter(Boolean);
  const pauseEls   = [$('pause'), $('pauseBtn')].filter(Boolean);
  const resetEls   = [$('reset'), $('resetBtn')].filter(Boolean);
  const skipEls    = [$('skip'), $('completeBtn')].filter(Boolean); // tick/complete

  // Helper to bind safely (and avoid double-binding on hot reload)
  function bindClick(el, handler) {
    if (!el) return;
    const clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
    clone.addEventListener('click', handler, { passive: true });
  }

  // Start
  startEls.forEach(el => bindClick(el, () => {
    if (!isRunning) {
      playSound(clickSound);
      isRunning = true;
      startTimer(exerciseDuration, false);
    }
  }));

  // Pause
  pauseEls.forEach(el => bindClick(el, () => {
    if (isRunning) {
      playSound(clickSound);
      clearInterval(timerInterval);
      isRunning = false;
    }
  }));

  // Reset
  resetEls.forEach(el => bindClick(el, () => {
    playSound(clickSound);
    clearInterval(timerInterval);
    isRunning = false;
    currentExercise = 0;
    currentSet = 1;
    inBreak = false;
    timeLeft = exerciseDuration;
    if (timerDisplay)  timerDisplay.textContent  = "00:00";
    if (statusDisplay) statusDisplay.textContent = "Ready";
    setDots.forEach(dot => dot.classList.remove("done"));
  }));

  // Skip / Complete current phase
  skipEls.forEach(el => bindClick(el, () => {
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
          // single alert before next exercise
          playSound(newExerciseSound);
          playSound(rapidPing);
          startTimer(exerciseDuration, false);
        } else {
          if (statusDisplay) statusDisplay.textContent = "Exercise completed.";
          if (timerDisplay)  timerDisplay.textContent  = "00:00";
          isRunning = false;
        }
      }
    } else {
      // skip exercise → straight to break
      startTimer(breakDuration, true);
    }
  }));

  // Log what got bound (helps diagnose if still not responding)
  console.log('[core] buttons wired:', {
    start: startEls.length, pause: pauseEls.length, reset: resetEls.length, skip: skipEls.length
  });
});
