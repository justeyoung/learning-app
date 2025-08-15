// Core Exercise Tracker JS

// ===== Elements =====
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const timerDisplay = document.getElementById('timer');
const sinceStartDisplay = document.getElementById('sinceStart');
const statusDisplay = document.getElementById('status');
const exerciseBars = document.querySelectorAll('.exercise-bar');
const exerciseNames = document.querySelectorAll('.exercise-name');

// Sounds (Make sure these files exist in your folder)
const clickSound = new Audio('click.mp3');
clickSound.volume = 0.5;

const countdownBeep = new Audio('beep.mp3');
countdownBeep.volume = 0.8;

const changeExerciseSound = new Audio('change.mp3');
changeExerciseSound.volume = 0.8;

const bellSound = new Audio('bell-loud.mp3'); // new boosted file
bellSound.volume = 1.0; // max volume

let intervalId, sinceStartId;
let currentExercise = 0;
let currentSet = 1;
let isBreak = false;
let timeRemaining = 0;
let totalSeconds = 0;
let exercises = [
  "Extended Plank",
  "Side Plank (Left)",
  "Side Plank (Right)",
  "Boat Pose",
  "Mountain Climbers"
];
const exerciseDuration = 60; // seconds
const breakDuration = 60; // seconds
const totalSets = 3;

// ===== Helper Functions =====
function playClick() {
  clickSound.currentTime = 0;
  clickSound.play();
}

function playCountdownBeep() {
  countdownBeep.currentTime = 0;
  countdownBeep.play();
}

function playChangeExercise() {
  changeExerciseSound.currentTime = 0;
  changeExerciseSound.play();
}

function playTripleBell() {
  let count = 0;
  function ring() {
    bellSound.currentTime = 0;
    bellSound.play();
    count++;
    if (count < 3) {
      setTimeout(ring, 400);
    }
  }
  ring();
}

function updateDisplay() {
  let minutes = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
  let seconds = (timeRemaining % 60).toString().padStart(2, '0');
  timerDisplay.textContent = `${minutes}:${seconds}`;
}

function updateSinceStart() {
  totalSeconds++;
  let minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  let seconds = (totalSeconds % 60).toString().padStart(2, '0');
  sinceStartDisplay.textContent = `Since start: ${minutes}:${seconds}`;
}

function highlightExercise() {
  exerciseBars.forEach((bar, index) => {
    bar.classList.remove('active-exercise', 'break-active', 'completed-exercise');
    exerciseNames[index].classList.remove('active-exercise-name', 'break-active-name', 'completed-exercise-name');

    if (index < currentExercise) {
      bar.classList.add('completed-exercise');
      exerciseNames[index].classList.add('completed-exercise-name');
    } else if (index === currentExercise) {
      if (isBreak) {
        bar.classList.add('break-active');
        exerciseNames[index].classList.add('break-active-name');
      } else {
        bar.classList.add('active-exercise');
        exerciseNames[index].classList.add('active-exercise-name');
      }
    }
  });
}

function startTimer() {
  clearInterval(intervalId);
  clearInterval(sinceStartId);

  sinceStartId = setInterval(updateSinceStart, 1000);

  intervalId = setInterval(() => {
    if (timeRemaining > 0) {
      timeRemaining--;

      // Last 5 seconds beep
      if (timeRemaining <= 5 && timeRemaining > 0) {
        playCountdownBeep();
      }

      updateDisplay();
    } else {
      clearInterval(intervalId);

      if (!isBreak) {
        // Exercise finished → go to break
        isBreak = true;
        timeRemaining = breakDuration;
        statusDisplay.textContent = "Break";
        highlightExercise();

        // Play change exercise sound
        playChangeExercise();

        // Special triple bell after 3rd break
        if (currentExercise === 2) {
          playTripleBell();
        }

        startTimer();
      } else {
        // Break finished → go to next exercise
        isBreak = false;
        currentExercise++;

        if (currentExercise >= exercises.length) {
          currentExercise = 0;
          currentSet++;
          if (currentSet > totalSets) {
            statusDisplay.textContent = "Exercise completed.";
            clearInterval(sinceStartId);
            return;
          }
        }

        statusDisplay.textContent = exercises[currentExercise];
        timeRemaining = exerciseDuration;
        highlightExercise();
        startTimer();
      }
    }
  }, 1000);
}

// ===== Button Handlers =====
startBtn.addEventListener('click', () => {
  playClick();
  if (!intervalId) {
    statusDisplay.textContent = exercises[currentExercise];
    highlightExercise();
    if (timeRemaining === 0) {
      timeRemaining = exerciseDuration;
      updateDisplay();
    }
    startTimer();
  }
});

pauseBtn.addEventListener('click', () => {
  playClick();
  clearInterval(intervalId);
  clearInterval(sinceStartId);
  intervalId = null;
});

resetBtn.addEventListener('click', () => {
  playClick();
  clearInterval(intervalId);
  clearInterval(sinceStartId);
  intervalId = null;
  currentExercise = 0;
  currentSet = 1;
  isBreak = false;
  timeRemaining = 0;
  totalSeconds = 0;
  sinceStartDisplay.textContent = "Since start: 00:00";
  statusDisplay.textContent = "Ready";
  timerDisplay.textContent = "00:00";
  highlightExercise();
});
