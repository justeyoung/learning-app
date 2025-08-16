// core.js (testing version - 10s exercise/break)

const timerCircle = document.getElementById("timer-circle");
const timerText = document.getElementById("timer-text");
const exerciseName = document.getElementById("exercise-name");
const setDots = document.getElementById("set-dots");
const bars = document.querySelectorAll(".exercise-bar");

const startBtn = document.getElementById("start-btn");
const pauseBtn = document.getElementById("pause-btn");
const resetBtn = document.getElementById("reset-btn");

const sinceStartText = document.getElementById("since-start");

let interval, sinceStartInterval;
let currentExercise = 0;
let currentSet = 0;
let isBreak = false;
let timeLeft = 10; // start with test time
let totalSeconds = 0;

const EXERCISE_TIME = 10; // test: 10 seconds
const BREAK_TIME = 10;    // test: 10 seconds
const TOTAL_SETS = 3;

const exercises = [
  "Extended Plank",
  "Hollow Hold",
  "Wrist to Knee Crunch",
  "AB Roll Out",
  "Reverse Crunch"
];

// Sounds
const clickSound = new Audio("click.mp3");
clickSound.volume = 0.5;

const beepSound = new Audio("beep.mp3");
beepSound.volume = 0.7;

const changeSound = new Audio("change.mp3");
changeSound.volume = 0.8;

const newExerciseVoice = new Audio("new_exercise.mp3");
newExerciseVoice.volume = 1.0;

const churchBell = new Audio("church_bell.mp3");
churchBell.volume = 1.0;

function playClick() {
  clickSound.currentTime = 0;
  clickSound.play();
}

function playBeep() {
  beepSound.currentTime = 0;
  beepSound.play();
}

function playChange() {
  changeSound.currentTime = 0;
  changeSound.play();
}

// 🔔 Play voice + bell twice
function playNewExerciseCue() {
  for (let i = 0; i < 2; i++) {
    setTimeout(() => {
      newExerciseVoice.currentTime = 0;
      newExerciseVoice.play();
    }, i * 2500);

    setTimeout(() => {
      churchBell.currentTime = 0;
      churchBell.play();
    }, i * 2500);
  }
}

function updateDisplay() {
  let minutes = Math.floor(timeLeft / 60);
  let seconds = timeLeft % 60;
  timerText.textContent = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  exerciseName.textContent = isBreak ? "Break" : exercises[currentExercise];

  // Circle color
  timerCircle.style.stroke = isBreak ? "hsl(210, 100%, 50%)" : "hsl(0, 100%, 50%)";

  // Bars
  bars.forEach((bar, index) => {
    if (index < currentExercise) {
      bar.style.backgroundColor = "hsl(120, 100%, 40%)"; // brighter green
    } else if (index === currentExercise) {
      bar.style.backgroundColor = isBreak ? "hsl(210, 100%, 50%)" : "hsl(120, 100%, 30%)";
    } else {
      bar.style.backgroundColor = "hsl(0, 0%, 25%)";
    }
  });

  // Set dots
  setDots.innerHTML = "";
  for (let i = 0; i < TOTAL_SETS; i++) {
    const dot = document.createElement("span");
    dot.classList.add("dot");
    if (i < currentSet) dot.classList.add("done");
    setDots.appendChild(dot);
  }
}

function startTimer() {
  playClick();
  clearInterval(interval);
  clearInterval(sinceStartInterval);

  interval = setInterval(() => {
    timeLeft--;

    if (timeLeft <= 5 && timeLeft > 0) playBeep();

    // 🔔 Special cue 10s before break ends, only on 3rd break
    if (
      isBreak &&
      currentSet === 2 &&
      currentExercise === exercises.length - 1 &&
      timeLeft === 10
    ) {
      playNewExerciseCue();
    }

    if (timeLeft <= 0) {
      playChange();

      if (isBreak) {
        currentExercise++;
        if (currentExercise >= exercises.length) {
          currentExercise = 0;
          currentSet++;
          if (currentSet >= TOTAL_SETS) {
            clearInterval(interval);
            clearInterval(sinceStartInterval);
            exerciseName.textContent = "Exercise completed.";
            return;
          }
        }
        isBreak = false;
        timeLeft = EXERCISE_TIME;
      } else {
        isBreak = true;
        timeLeft = BREAK_TIME;
      }
    }

    updateDisplay();
  }, 1000);

  sinceStartInterval = setInterval(() => {
    totalSeconds++;
    let min = Math.floor(totalSeconds / 60);
    let sec = totalSeconds % 60;
    sinceStartText.textContent = `Since start: ${min}:${sec < 10 ? "0" : ""}${sec}`;
  }, 1000);
}

function pauseTimer() {
  playClick();
  clearInterval(interval);
  clearInterval(sinceStartInterval);
}

function resetTimer() {
  playClick();
  clearInterval(interval);
  clearInterval(sinceStartInterval);

  currentExercise = 0;
  currentSet = 0;
  isBreak = false;
  timeLeft = EXERCISE_TIME;
  totalSeconds = 0;

  sinceStartText.textContent = "Since start: 00:00";
  updateDisplay();
}

startBtn.addEventListener("click", startTimer);
pauseBtn.addEventListener("click", pauseTimer);
resetBtn.addEventListener("click", resetTimer);

// Init
updateDisplay();
