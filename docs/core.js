// core.js — safe wiring + inBreak fix, keeps your behavior intact

window.addEventListener('DOMContentLoaded', () => {
  let timerInterval;
  let timeLeft = 0;
  let isRunning = false;
  let currentExercise = 0;
  let currentSet = 1;
  let inBreak = false;      // <-- will now be updated correctly
  const totalSets = 3;

  const exercises = ["Plank", "Hollow Hold", "Side Plank", "Leg Raises", "Extended Plank"];
  const exerciseDuration = 20; // seconds (testing)
  const breakDuration = 20;    // seconds (testing)

  const timerDisplay = document.getElementById("time");
  const statusDisplay = document.getElementById("status");
  const sinceStartDisplay = document.getElementById("since-start"); // (unused by your snippet, but kept)
  const exerciseList = document.getElementById("exercise-list");    // (unused by your snippet, but kept)
  const setDots = document.querySelectorAll(".set-dot");

  // 🔊 sounds
  const clickSound        = new Audio("click.mp3");
  const countdownBeep     = new Audio("beep.mp3");
  const newExerciseSound  = new Audio("new_exercise.mp3");  // spoken alert
  const rapidPing         = new Audio("digital_ping.mp3");  // short alert

  // ensure sounds don’t duck Spotify
  [clickSound, countdownBeep, newExerciseSound, rapidPing].forEach(s => {
    s.preload = "auto";
    s.volume = 0.35;
  });

  // helper for playing sounds safely
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
    inBreak = isBreakPhase; // ✅ keep this in sync
    updateTimerDisplay();

    if (statusDisplay) {
      statusDisplay.textContent = isBreakPhase ? "Break" : exercises[currentExercise];
      statusDisplay.className = isBreakPhase ? "status break" : "status exercise";
    }

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timeLeft--;
      updateTimerDisplay();

      // ⏱️ countdown beeps (last 5 sec)
      if (timeLeft <= 5 && timeLeft > 0) {
        playSound(countdownBeep);
      }

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
              // special alert before a NEW exercise (single fire each)
              playSound(newExerciseSound);
              playSound(rapidPing); // if you later want only one, remove the other line

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

  // 🎛️ buttons (IDs exactly as in your snippet)
  const startEl = document.getElementById("start");
  const pauseEl = document.getElementById("pause");
  const resetEl = document.getElementById("reset");
  const skipEl  = document.getElementById("skip");

  if (startEl) startEl.addEventListener("click", () => {
    if (!isRunning) {
      playSound(clickSound);
      isRunning = true;
      startTimer(exerciseDuration, false);
    }
  });

  if (pauseEl) pauseEl.addEventListener("click", () => {
    if (isRunning) {
      playSound(clickSound);
      clearInterval(timerInterval);
      isRunning = false;
    }
  });

  if (resetEl) resetEl.addEventListener("click", () => {
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
  });

  // ✅ tick/skip: complete current phase immediately
  if (skipEl) skipEl.addEventListener("click", () => {
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
  });
});
