// core.js

let timerInterval;
let timeLeft = 0;
let isRunning = false;
let currentExercise = 0;
let currentSet = 1;
let inBreak = false;
let totalSets = 3;

const exercises = ["Plank", "Hollow Hold", "Side Plank", "Leg Raises", "Extended Plank"];
const exerciseDuration = 20; // seconds (testing)
const breakDuration = 20;    // seconds (testing)

const timerDisplay = document.getElementById("time");
const statusDisplay = document.getElementById("status");
const sinceStartDisplay = document.getElementById("since-start");
const exerciseList = document.getElementById("exercise-list");
const setDots = document.querySelectorAll(".set-dot");

// 🔊 sounds
const clickSound = new Audio("click.mp3");
const countdownBeep = new Audio("beep.mp3");
const newExerciseSound = new Audio("new_exercise.mp3");
const rapidPing = new Audio("digital_ping.mp3");

// ensure sounds don’t duck Spotify
[clickSound, countdownBeep, newExerciseSound, rapidPing].forEach(s => {
  s.preload = "auto";
  s.volume = 0.35;
});

// helper for playing sounds safely
function playSound(sound) {
  if (sound) {
    sound.currentTime = 0;
    sound.play().catch(e => console.log("Sound blocked:", e));
  }
}

function startTimer(duration, isBreak = false) {
  timeLeft = duration;
  inBreak = isBreak; // ✅ track properly
  updateTimerDisplay();

  statusDisplay.textContent = isBreak ? "Break" : exercises[currentExercise];
  statusDisplay.className = isBreak ? "status break" : "status exercise";

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

      if (isBreak) {
        // after break
        if (currentSet < totalSets) {
          currentSet++;
          startTimer(exerciseDuration, false);
        } else {
          // all 3 sets done → move to next exercise
          setDots[currentSet - 1].classList.add("done");
          currentSet = 1;
          currentExercise++;

          if (currentExercise < exercises.length) {
            // ✅ special alert before new exercise
            playSound(newExerciseSound);
            playSound(rapidPing);

            startTimer(exerciseDuration, false);
          } else {
            statusDisplay.textContent = "Exercise completed.";
            timerDisplay.textContent = "00:00";
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

function updateTimerDisplay() {
  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const seconds = String(timeLeft % 60).padStart(2, "0");
  timerDisplay.textContent = `${minutes}:${seconds}`;
}

// 🎛️ buttons
document.getElementById("start").addEventListener("click", () => {
  if (!isRunning) {
    playSound(clickSound);
    isRunning = true;
    startTimer(exerciseDuration, false);
  }
});

document.getElementById("pause").addEventListener("click", () => {
  if (isRunning) {
    playSound(clickSound);
    clearInterval(timerInterval);
    isRunning = false;
  }
});

document.getElementById("reset").addEventListener("click", () => {
  playSound(clickSound);
  clearInterval(timerInterval);
  isRunning = false;
  currentExercise = 0;
  currentSet = 1;
  timeLeft = exerciseDuration;
  timerDisplay.textContent = "00:00";
  statusDisplay.textContent = "Ready";
  setDots.forEach(dot => dot.classList.remove("done"));
});

// ✅ tick button: skip current exercise/break
document.getElementById("skip").addEventListener("click", () => {
  playSound(clickSound);
  clearInterval(timerInterval);
  timeLeft = 0;

  if (inBreak) {
    // skip break
    if (currentSet < totalSets) {
      currentSet++;
      startTimer(exerciseDuration, false);
    } else {
      setDots[currentSet - 1].classList.add("done");
      currentSet = 1;
      currentExercise++;
      if (currentExercise < exercises.length) {
        playSound(newExerciseSound);
        playSound(rapidPing);
        startTimer(exerciseDuration, false);
      } else {
        statusDisplay.textContent = "Exercise completed.";
        timerDisplay.textContent = "00:00";
        isRunning = false;
      }
    }
  } else {
    // skip exercise → straight to break
    startTimer(breakDuration, true);
  }
});
