// ===== Core Exercise Tracker =====

const phases = [
  { name: "Extended Plank", type: "exercise" },
  { name: "Break", type: "break" },
  { name: "Side Plank", type: "exercise" },
  { name: "Break", type: "break" },
  { name: "Bridge", type: "exercise" },
  { name: "Break", type: "break" },
  { name: "Flutter Kicks", type: "exercise" },
  { name: "Break", type: "break" },
  { name: "Leg Raise", type: "exercise" },
  { name: "Break", type: "break" }
];

let currentPhaseIndex = 0;
let currentSet = 1;
const totalSets = 3;

const exerciseDuration = 60; // 1 minute in seconds
const breakDuration = 60; // 1 minute in seconds

let timeLeft = exerciseDuration;
let timerInterval;
let startTime;
let sinceStart = 0;

const timeLabel = document.querySelector(".time-label");
const phaseLabel = document.querySelector(".phase-label");
const progressCircle = document.querySelector(".progress");
const dots = document.querySelectorAll(".dot");
const exerciseItems = document.querySelectorAll(".exercise-item .name");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");

const clickSound = new Audio("click.mp3");
clickSound.preload = "auto";
clickSound.volume = 0.3;

const beepSound = new Audio("beep.mp3");
beepSound.preload = "auto";
beepSound.volume = 0.4;

const changeSound = new Audio("change.mp3");
changeSound.preload = "auto";
changeSound.volume = 0.5;

function playSound(sound) {
  sound.currentTime = 0;
  sound.play().catch(() => {});
}

function updateWheelColor() {
  const currentPhase = phases[currentPhaseIndex];
  if (currentPhase.type === "exercise") {
    progressCircle.style.stroke = "#ff2d55"; // RED for exercise
  } else {
    progressCircle.style.stroke = "#00aaff"; // BLUE for break
  }
}

function updateDisplay() {
  let minutes = Math.floor(timeLeft / 60);
  let seconds = timeLeft % 60;
  timeLabel.textContent = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  phaseLabel.textContent =
    phases[currentPhaseIndex].type === "break"
      ? "Break"
      : phases[currentPhaseIndex].name;

  exerciseItems.forEach((item, index) => {
    const phaseIndexInExerciseList = Math.floor(currentPhaseIndex / 2);
    if (index === phaseIndexInExerciseList && phases[currentPhaseIndex].type === "exercise") {
      item.parentElement.classList.add("current");
    } else {
      item.parentElement.classList.remove("current");
    }
  });

  updateWheelColor();
}

function updateProgressBar() {
  const duration =
    phases[currentPhaseIndex].type === "exercise"
      ? exerciseDuration
      : breakDuration;
  const progress = ((duration - timeLeft) / duration) * 691;
  progressCircle.style.strokeDashoffset = progress;
}

function nextPhase() {
  playSound(changeSound);

  currentPhaseIndex++;
  if (currentPhaseIndex >= phases.length) {
    currentPhaseIndex = 0;
    currentSet++;
    if (currentSet > totalSets) {
      stopTimer();
      return;
    }
    dots[currentSet - 2].classList.add("done");
    dots[currentSet - 1].classList.add("current");
  }

  timeLeft =
    phases[currentPhaseIndex].type === "exercise"
      ? exerciseDuration
      : breakDuration;
  updateDisplay();
}

function startTimer() {
  playSound(clickSound);

  if (!timerInterval) {
    startTime = Date.now();
    timerInterval = setInterval(() => {
      timeLeft--;
      sinceStart++;
      updateDisplay();
      updateProgressBar();

      if (timeLeft <= 5 && timeLeft > 0) {
        playSound(beepSound);
      }

      if (timeLeft <= 0) {
        nextPhase();
      }
    }, 1000);
  }
}

function pauseTimer() {
  playSound(clickSound);
  clearInterval(timerInterval);
  timerInterval = null;
}

function resetTimer() {
  playSound(clickSound);
  clearInterval(timerInterval);
  timerInterval = null;
  currentPhaseIndex = 0;
  currentSet = 1;
  timeLeft = exerciseDuration;
  sinceStart = 0;
  dots.forEach((dot) => dot.classList.remove("done", "current"));
  dots[0].classList.add("current");
  updateDisplay();
  updateProgressBar();
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

startBtn.addEventListener("click", startTimer);
pauseBtn.addEventListener("click", pauseTimer);
resetBtn.addEventListener("click", resetTimer);

resetTimer(); // initialize display
