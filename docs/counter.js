let timerInterval;
let timeRemaining = 0;

function setPreset(seconds) {
  clearInterval(timerInterval);
  timeRemaining = seconds;
  updateDisplay();
}

function setCustomTime() {
  const min = parseInt(document.getElementById("custom-minutes").value) || 0;
  const sec = parseInt(document.getElementById("custom-seconds").value) || 0;
  timeRemaining = min * 60 + sec;
  updateDisplay();
  document.getElementById("custom-input").style.display = "none";
}

function toggleCustomInput() {
  const inputBox = document.getElementById("custom-input");
  inputBox.style.display = inputBox.style.display === "none" ? "block" : "none";
}

function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (timeRemaining > 0) {
      timeRemaining--;
      updateDisplay();
    } else {
      clearInterval(timerInterval);
      document.getElementById("timer-display").innerText = "Time’s up!";
    }
  }, 1000);
}

function pauseTimer() {
  clearInterval(timerInterval);
}

function resetTimer() {
  clearInterval(timerInterval);
  timeRemaining = 0;
  updateDisplay();
}

function updateDisplay() {
  const min = String(Math.floor(timeRemaining / 60)).padStart(2, '0');
  const sec = String(timeRemaining % 60).padStart(2, '0');
  document.getElementById("timer-display").innerText = `${min}:${sec}`;
}

function toggleSet(button) {
  button.classList.toggle("active");
}
