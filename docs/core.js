// core.js (TEST MODE - 10s exercise & 10s break)

const EXERCISE_TIME = 10; // 🔹 Testing value
const BREAK_TIME = 10;    // 🔹 Testing value
const TOTAL_SETS = 3;

let currentExercise = 0;
let currentSet = 1;
let isExercise = true;
let timeLeft = EXERCISE_TIME;
let timerInterval;
let totalTime = 0;

// Sounds
const clickSound = new Audio("click.mp3");
clickSound.volume = 0.6;

const countdownSound = new Audio("countdown_beep.mp3");
countdownSound.volume = 0.7;

const exerciseChangeSound = new Audio("digital_ping.mp3");
exerciseChangeSound.volume = 0.8;

const newExerciseVoice = new Audio("new_exercise.mp3");
newExerciseVoice.volume = 1.0;

const bellSound = new Audio("church_bell.mp3");
bellSound.volume = 1.0;

function playClick() {
  clickSound.currentTime = 0;
  clickSound.play();
}

function updateDisplay() {
  document.getElementById("timer").textContent = formatTime(timeLeft);
  document.getElementById("status").textContent = isExercise
    ? `Exercise ${currentExercise + 1}`
    : "Break";

  // Highlight exercise bar
  const bars = document.querySelectorAll(".exercise-bar");
  bars.forEach((bar, index) => {
    bar.classList.remove("active", "break", "completed");
    if (index < currentExercise) {
      bar.classList.add("completed"); // already done
    }
    if (index === currentExercise) {
      bar.classList.add(isExercise ? "active" : "break");
    }
  });

  // Highlight tic-tacs for sets
  const tics = document.querySelectorAll(".set-tic");
  tics.forEach((tic, index) => {
    tic.classList.remove("done");
    if (index < currentSet - 1) {
      tic.classList.add("done");
    }
  });

  // Update since start
  document.getElementById("sinceStart").textContent = formatTime(totalTime);
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function startTimer() {
  playClick();
  if (timerInterval) return;
  timerInterval = setInterval(() => {
    timeLeft--;
    totalTime++;
    updateDisplay();

    // Beep for last 5s
    if (timeLeft <= 5 && timeLeft > 0) {
      countdownSound.currentTime = 0;
      countdownSound.play();
    }

    // Special cue: 10s before the 3rd break finishes
    if (
      !isExercise &&
      currentExercise === 2 && // after 3rd exercise
      currentSet <= TOTAL_SETS &&
      timeLeft === 10
    ) {
      newExerciseVoice.currentTime = 0;
      newExerciseVoice.play();
      bellSound.currentTime = 0;
      bellSound.play();
    }

    // Time up
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;

      if (isExercise) {
        exerciseChangeSound.currentTime = 0;
        exerciseChangeSound.play();
      }

      if (isExercise) {
        isExercise = false;
        timeLeft = BREAK_TIME;
      } else {
        currentExercise++;
        if (currentExercise >= 5) {
          currentExercise = 0;
          currentSet++;
          if (currentSet > TOTAL_SETS) {
            document.getElementById("status").textContent =
              "Exercise completed.";
            return;
          }
        }
        isExercise = true;
        timeLeft = EXERCISE_TIME;
      }
      startTimer();
    }
  }, 1000);
}

function pauseTimer() {
  playClick();
  clearInterval(timerInterval);
  timerInterval = null;
}

function resetTimer() {
  playClick();
  clearInterval(timerInterval);
  timerInterval = null;
  currentExercise = 0;
  currentSet = 1;
  isExercise = true;
  timeLeft = EXERCISE_TIME;
  totalTime = 0;
  updateDisplay();
}

document.getElementById("startBtn").addEventListener("click", startTimer);
document.getElementById("pauseBtn").addEventListener("click", pauseTimer);
document.getElementById("resetBtn").addEventListener("click", resetTimer);

updateDisplay();
