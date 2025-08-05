let timerInterval;
let timeRemaining = 0;

function updateDisplay() {
  const min = String(Math.floor(timeRemaining / 60)).padStart(2, '0');
  const sec = String(timeRemaining % 60).padStart(2, '0');
  document.getElementById("timer-display").innerText = `${min}:${sec}`;
}

function setPreset(event, seconds) {
  clearInterval(timerInterval);
  timeRemaining = seconds;
  updateDisplay();
  document.getElementById("time-up").style.display = "none";

  // Remove all active presets
  document.querySelectorAll(".preset-buttons button").forEach(btn => {
    btn.classList.remove("active");
  });

  // Mark selected
  event.target.classList.add("active");
}

function setCustomTime() {
  const min = parseInt(document.getElementById("custom-minutes").value) || 0;
  const sec = parseInt(document.getElementById("custom-seconds").value) || 0;
  timeRemaining = min * 60 + sec;
  updateDisplay();
  document.getElementById("custom-input").style.display = "none";
  document.getElementById("time-up").style.display = "none";

  // Remove preset highlights
  document.querySelectorAll(".preset-buttons button").forEach(btn => {
    btn.classList.remove("active");
  });
}

function toggleCustomInput() {
  const inputBox = document.getElementById("custom-input");
  inputBox.style.display = inputBox.style.display === "none" ? "flex" : "none";
}

function startTimer() {
  clearInterval(timerInterval);
  document.getElementById("time-up").style.display = "none";

  timerInterval = setInterval(() => {
    if (timeRemaining > 0) {
      timeRemaining--;
      updateDisplay();
    } else {
      clearInterval(timerInterval);
      document.getElementById("time-up").style.display = "block";

      // Vibrate if supported
      if (navigator.vibrate) {
        navigator.vibrate([300, 200, 300]);
      }

      // Play sound
      const alarm = document.getElementById("alarmSound");
      alarm.currentTime = 0;
      alarm.play().catch(err => {
        console.log("Audio blocked until user interaction.");
      });
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
  document.getElementById("time-up").style.display = "none";

  // Clear presets
  document.querySelectorAll(".preset-buttons button").forEach(btn => {
    btn.classList.remove("active");
  });
}

function toggleSet(button) {
  button.classList.toggle("active");
}
