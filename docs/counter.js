let timerInterval;
let timeRemaining = 0;

// Update the timer display
function updateDisplay() {
  const min = String(Math.floor(timeRemaining / 60)).padStart(2, '0');
  const sec = String(timeRemaining % 60).padStart(2, '0');
  document.getElementById("timer-display").innerText = `${min}:${sec}`;
}

// Play click sound
function playClickSound() {
  const click = document.getElementById("clickSound");
  click.currentTime = 0;
  click.play().catch(() => {});
}

// Handle preset time buttons
function setPreset(event, seconds) {
  playClickSound();
  clearInterval(timerInterval);
  timeRemaining = seconds;
  updateDisplay();
  document.getElementById("time-up").style.display = "none";

  // Remove highlight from preset buttons
  document.querySelectorAll(".preset-buttons button").forEach(btn => {
    btn.classList.remove("active");
  });
  event.target.classList.add("active");

  // Also remove highlight from control buttons
  document.querySelectorAll(".control-buttons button").forEach(btn => {
    btn.classList.remove("active");
  });
}

// Set custom time
function setCustomTime() {
  const min = parseInt(document.getElementById("custom-minutes").value) || 0;
  const sec = parseInt(document.getElementById("custom-seconds").value) || 0;
  timeRemaining = min * 60 + sec;
  updateDisplay();
  document.getElementById("custom-input").style.display = "none";
  document.getElementById("time-up").style.display = "none";

  // Remove all button highlights
  document.querySelectorAll(".preset-buttons button, .control-buttons button").forEach(btn => {
    btn.classList.remove("active");
  });
}

// Toggle custom input visibility and highlight
function toggleCustomInput(event) {
  playClickSound();

  // Unhighlight all control buttons
  document.querySelectorAll(".control-buttons button").forEach(btn => {
    btn.classList.remove("active");
  });

  if (event && event.target) {
    event.target.classList.add("active");
  }

  const inputBox = document.getElementById("custom-input");
  inputBox.style.display = inputBox.style.display === "none" ? "flex" : "none";
}

// Start timer
function startTimer(event) {
  playClickSound();

  // Unhighlight all control buttons
  document.querySelectorAll(".control-buttons button").forEach(btn => {
    btn.classList.remove("active");
  });

  if (event && event.target) {
    event.target.classList.add("active");
  }

  clearInterval(timerInterval);
  document.getElementById("time-up").style.display = "none";

  timerInterval = setInterval(() => {
    if (timeRemaining > 0) {
      timeRemaining--;
      updateDisplay();
    } else {
      clearInterval(timerInterval);
      document.getElementById("time-up").style.display = "block";

      // Vibrate on completion
      if (navigator.vibrate) {
        navigator.vibrate([300, 200, 300]);
      }

      // Play alarm
      const alarm = document.getElementById("alarmSound");
      alarm.currentTime = 0;
      alarm.play().catch(() => {});
    }
  }, 1000);
}

// Pause timer
function pauseTimer(event) {
  playClickSound();
  clearInterval(timerInterval);

  // Unhighlight all control buttons
  document.querySelectorAll(".control-buttons button").forEach(btn => {
    btn.classList.remove("active");
  });

  if (event && event.target) {
    event.target.classList.add("active");
  }
}

// Reset timer
function resetTimer(event) {
  playClickSound();
  clearInterval(timerInterval);
  timeRemaining = 0;
  updateDisplay();
  document.getElementById("time-up").style.display = "none";

  // Unhighlight everything
  document.querySelectorAll(".preset-buttons button, .control-buttons button").forEach(btn => {
    btn.classList.remove("active");
  });
}

// Toggle sets 1–5
function toggleSet(button) {
  playClickSound();
  button.classList.toggle("active");
}
