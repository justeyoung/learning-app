// ============================
// CONFIG
// ============================

// Test mode: all times 10s
const EXERCISE_TIME = 10; // seconds
const BREAK_TIME = 10; // seconds
const TOTAL_SETS = 3;
const EXERCISES = [
  "Extended Plank",
  "Side Plank",
  "Russian Twist",
  "Leg Raise",
  "Mountain Climbers"
];

// ============================
// DOM ELEMENTS
// ============================
const timerDisplay = document.getElementById("timer");
const statusDisplay = document.getElementById("status");
const setIndicators = document.getElementById("setIndicators");
const exerciseList = document.getElementById("exerciseList");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");

// ============================
// SOUNDS
// ============================

// Click sound
const clickSound = new Audio("click.mp3");
clickSound.volume = 0.3; // prevent Spotify ducking

// 5-second countdown beep
const beepSound = new Audio("beep.mp3");
beepSound.volume = 0.5;

// Exercise change sound (digital ping)
const digitalPing = new Audio("digital_ping.mp3");
digitalPing.volume = 0.8; // louder for clarity

// ============================
// STATE VARIABLES
// ============================
let currentSet = 1;
let currentExerciseIndex = 0;
let isBreak = false;
let timeRemaining = EXERCISE_TIME;
let timerInterval;
let totalElapsedSeconds = 0;
let isRunning = false;

// ============================
// FUNCTIONS
// ============================

function renderExercises() {
  exerciseList.innerHTML = "";
  EXERCISES.forEach((exercise, index) => {
    const bar = document.createElement("div");
    bar.className = "exercise-bar";
    bar.textContent = exercise;
    if (index === currentExerciseIndex) {
      bar.classList.add(isBreak ? "current-break" : "current-exercise");
    }
    exerciseList.appendChild(bar);
  });
}

function updateSetIndicators() {
  setIndicators.innerHTML = "";
  for (let i = 1; i <= TOTAL_SETS; i++) {
    const tic = document.createElement("div");
    tic.className = "set-tic";
    if (i < currentSet) {
      tic.classList.add("completed");
    } else if (i === currentSet) {
      tic.classList.add("active");
    }
    setIndicators.appendChild(tic);
  }
}

function updateDisplay() {
  const mins = String(Math.floor(timeRemaining / 60)).padStart(2, "0");
  const secs = String(timeRemaining % 60).padStart(2, "0");
  timerDisplay.textContent = `${mins}:${secs}`;
  statusDisplay.textContent = isBreak
    ? "Break"
    : EXERCISES[currentExerciseIndex];
}

function startTimer() {
  if (isRunning) return;
  isRunning = true;
  clickSound.play();
  timerInterval = setInterval(() => {
    timeRemaining--;
    totalElapsedSeconds++;

    // 5-second beep before end
    if (timeRemaining > 0 && timeRemaining <= 5) {
      beepSound.play();
    }

    updateDisplay();
    renderExercises();

    if (timeRemaining <= 0) {
      clearInterval(timerInterval);

      if (isBreak) {
        // If break ended, move to next exercise
        currentExerciseIndex++;
        if (currentExerciseIndex >= EXERCISES.length) {
          currentExerciseIndex = 0;
          currentSet++;
          if (currentSet > TOTAL_SETS) {
            statusDisplay.textContent = "Exercise completed.";
            isRunning = false;
            return;
          }
        }
        isBreak = false;
        timeRemaining = EXERCISE_TIME;
      } else {
        // If exercise ended, move to break
        isBreak = true;
        timeRemaining = BREAK_TIME;

        // Trigger digital ping when leaving the 3rd break
        if (currentExerciseIndex === 2) {
          digitalPing.play();
        }
      }

      updateSetIndicators();
      updateDisplay();
      renderExercises();
      startTimer(); // auto-continue
    }
  }, 1000);
}

function pauseTimer() {
  if (!isRunning) return;
  clickSound.play();
  clearInterval(timerInterval);
  isRunning = false;
}

function resetTimer() {
  clickSound.play();
  clearInterval(timerInterval);
  isRunning = false;
  currentSet = 1;
  currentExerciseIndex = 0;
  isBreak = false;
  timeRemaining = EXERCISE_TIME;
  totalElapsedSeconds = 0;
  updateDisplay();
  renderExercises();
  updateSetIndicators();
}

// ============================
// INIT
// ============================
startBtn.addEventListener("click", startTimer);
pauseBtn.addEventListener("click", pauseTimer);
resetBtn.addEventListener("click", resetTimer);

updateDisplay();
renderExercises();
updateSetIndicators();
