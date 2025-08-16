// core.js

// ====== Timer Variables ======
let timer;
let timeLeft = 0;
let isRunning = false;
let sinceStart = 0;

// ====== Exercise Tracking ======
const exercises = [
  "Extended Plank",
  "Side Plank",
  "Leg Raise",
  "Flutter Kick",
  "Mountain Climbers"
];

let currentExerciseIndex = 0;
let currentSet = 1;
let totalSets = 3;
let inBreak = false;

// ====== Audio Elements ======
const clickSound = new Audio("click.mp3");
clickSound.preload = "auto";
clickSound.setAttribute("playsinline", "");
clickSound.volume = 0.5;

const countdownBeep = new Audio("beep.mp3");
countdownBeep.preload = "auto";
countdownBeep.setAttribute("playsinline", "");
countdownBeep.volume = 0.6;

const exerciseChangeSound = new Audio("digital_ping.mp3");
exerciseChangeSound.preload = "auto";
exerciseChangeSound.setAttribute("playsinline", "");
exerciseChangeSound.volume = 0.7;

// ===== Voice + Church Bell cue =====
const NEW_EXERCISE_SRC = encodeURI("new_exercise.mp3");   // updated filename
const CHURCH_BELL_SRC  = encodeURI("church_bell.mp3");

const newExerciseAudio = new Audio(NEW_EXERCISE_SRC);
newExerciseAudio.preload = "auto";
newExerciseAudio.setAttribute("playsinline", "");
newExerciseAudio.volume = 1.0;

const churchBellAudio = new Audio(CHURCH_BELL_SRC);
churchBellAudio.preload = "auto";
churchBellAudio.setAttribute("playsinline", "");
churchBellAudio.volume = 1.0;

// ====== DOM Elements ======
const timerDisplay = document.getElementById("time");
const sinceStartDisplay = document.getElementById("sinceStart");
const exerciseTitle = document.getElementById("exerciseTitle");
const exerciseList = document.getElementById("exerciseList");
const setIndicators = document.getElementById("setIndicators");
const progressCircle = document.querySelector(".progress");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");
const toggleExercises = document.getElementById("toggleExercises");

// ====== Render Exercise List ======
function renderExercises() {
  exerciseList.innerHTML = "";
  exercises.forEach((ex, i) => {
    const li = document.createElement("li");
    li.textContent = ex;
    li.classList.add("exercise-item");
    if (i === currentExerciseIndex) {
      li.classList.add(inBreak ? "active-break" : "active-exercise");
    }
    exerciseList.appendChild(li);
  });
}

// ====== Render Set Indicators ======
function renderSets() {
  setIndicators.innerHTML = "";
  for (let i = 1; i <= totalSets; i++) {
    const bar = document.createElement("div");
    bar.classList.add("set-bar");
    if (i < currentSet) {
      bar.classList.add("completed");
    }
    if (i === currentSet) {
      bar.classList.add("current");
    }
    setIndicators.appendChild(bar);
  }
}

// ====== Start Timer ======
function startTimer(duration) {
  clearInterval(timer);
  timeLeft = duration;
  updateTimerDisplay();
  timer = setInterval(() => {
    timeLeft--;
    sinceStart++;
    updateTimerDisplay();
    updateSinceStart();

    // play 5 sec countdown
    if (timeLeft <= 5 && timeLeft > 0) {
      countdownBeep.currentTime = 0;
      countdownBeep.play();
    }

    // trigger new exercise cue 10 sec before 3rd break finishes
    if (
      inBreak &&
      currentExerciseIndex === 2 && // after 3rd exercise
      timeLeft === 10
    ) {
      newExerciseAudio.currentTime = 0;
      churchBellAudio.currentTime = 0;
      newExerciseAudio.play();
      churchBellAudio.play();
    }

    if (timeLeft <= 0) {
      clearInterval(timer);
      handleNext();
    }
  }, 1000);
}

// ====== Update Timer Display ======
function updateTimerDisplay() {
  let minutes = Math.floor(timeLeft / 60)
    .toString()
    .padStart(2, "0");
  let seconds = (timeLeft % 60).toString().padStart(2, "0");
  timerDisplay.textContent = `${minutes}:${seconds}`;

  let progress = ((inBreak ? 60 : 60) - timeLeft) / 60; // normalized
  progressCircle.style.setProperty("--progress", progress);

  if (inBreak) {
    progressCircle.classList.add("break");
    progressCircle.classList.remove("exercise");
  } else {
    progressCircle.classList.add("exercise");
    progressCircle.classList.remove("break");
  }
}

// ====== Update Since Start ======
function updateSinceStart() {
  let minutes = Math.floor(sinceStart / 60)
    .toString()
    .padStart(2, "0");
  let seconds = (sinceStart % 60).toString().padStart(2, "0");
  sinceStartDisplay.textContent = `${minutes}:${seconds}`;
}

// ====== Handle Next ======
function handleNext() {
  if (!inBreak) {
    // finished exercise → go to break
    inBreak = true;
    renderExercises();
    startTimer(60); // 1 min break
  } else {
    // finished break → next exercise
    inBreak = false;
    currentExerciseIndex++;
    if (currentExerciseIndex >= exercises.length) {
      currentExerciseIndex = 0;
      currentSet++;
      if (currentSet > totalSets) {
        exerciseTitle.textContent = "Exercise completed.";
        renderSets();
        return;
      }
    }
    exerciseChangeSound.currentTime = 0;
    exerciseChangeSound.play();
    renderExercises();
    renderSets();
    startTimer(60); // 1 min exercise
  }
}

// ====== Button Handlers ======
startBtn.addEventListener("click", () => {
  if (!isRunning) {
    clickSound.play();
    isRunning = true;
    if (timeLeft === 0) {
      startTimer(60);
    } else {
      startTimer(timeLeft);
    }
  }
});

pauseBtn.addEventListener("click", () => {
  if (isRunning) {
    clickSound.play();
    isRunning = false;
    clearInterval(timer);
  }
});

resetBtn.addEventListener("click", () => {
  clickSound.play();
  clearInterval(timer);
  isRunning = false;
  sinceStart = 0;
  currentExerciseIndex = 0;
  currentSet = 1;
  inBreak = false;
  timeLeft = 0;
  updateTimerDisplay();
  updateSinceStart();
  renderExercises();
  renderSets();
  exerciseTitle.textContent = "Core Exercise Tracker";
});

// ====== Toggle Exercise List ======
toggleExercises.addEventListener("click", () => {
  exerciseList.classList.toggle("collapsed");
  toggleExercises.textContent = exerciseList.classList.contains("collapsed")
    ? "▼"
    : "▲";
});

// ====== Initial Render ======
renderExercises();
renderSets();
updateTimerDisplay();
updateSinceStart();
