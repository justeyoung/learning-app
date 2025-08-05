let timerInterval;
let timeRemaining = 0;

// Update timer display
function updateDisplay() {
  const min = String(Math.floor(timeRemaining / 60)).padStart(2, '0');
  const sec = String(timeRemaining % 60).padStart(2, '0');
  document.getElementById("timer-display").innerText = `${min}:${sec}`;
}

// Play click.mp3
function playClickSound() {
  const click = document.getElementById("clickSound");
  click.currentTime = 0;
  click.play().catch(() => {});
}

// Handle time preset buttons
function setPreset(event, seconds) {
  playClickSound();
  clearInterval(timerInterval);
  timeRemaining = seconds;
  updateDisplay();
  document.getElementById("time-up").style.display = "none";

  // Unhighlight preset and control buttons
  document.querySelectorAll(".preset-buttons button, .control-buttons button").forEach(btn => {
    btn.classList.remove("active");
  });

  // Highlight clicked button
  event.target.classList.add("active");
}

// Handle custom time input
function setCustomTime() {
  const min = parseInt(document.getElementById("custom-minutes").value) || 0;
  const sec = parseInt(document.getElementById("custom-seconds").value) || 0;
  timeRemaining = min * 60 + sec;
  updateDisplay();
  document.getElementById("custom-input").style.display = "none";
  document.getElementById("time-up").style.display = "none";

  // Remove all highlights
  document.querySelectorAll(".preset-buttons button, .control-buttons button").forEach(btn => {
    btn.classList.remove("active");
  });
}

// Toggle custom input field
function toggleCustomInput(event) {
  playClickSound();
  const inputBox = document.getElementById("custom-input");
  inputBox.style.display = inputBox.style.display === "none" ? "flex" : "none";

  // Unhighlight all control buttons
  document.querySelectorAll(".control-buttons button").forEach(btn => {
    btn.classList.remove("active");
  });

  // Highlight clicked button
  if (event?.target) {
    event.target.classList.add("active");
  }
}

// Start the timer
function startTimer(event) {
  playClickSound();

  // Clear any existing timer
  clearInterval(timerInterval);
  document.getElementById("time-up").style.display = "none";

  // Unhighlight control buttons
  document.querySelectorAll(".control-buttons button").forEach(btn => {
    btn.classList.remove("active");
  });

  // Highlight start button
  if (event?.target) {
    event.target.classList.add("active");
  }

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

      // Play alarm
      const alarm = document.getElementById("alarmSound");
      alarm.currentTime = 0;
      alarm.play().catch(() => {});
    }
  }, 1000);
}

// Pause the timer
function pauseTimer(event) {
  playClickSound();
  clearInterval(timerInterval);

  // Unhighlight control buttons
  document.querySelectorAll(".control-buttons button").forEach(btn => {
    btn.classList.remove("active");
  });

  // Highlight pause
  if (event?.target) {
    event.target.classList.add("active");
  }
}

// Reset the timer
function resetTimer(event) {
  playClickSound();
  clearInterval(timerInterval);
  timeRemaining = 0;
  updateDisplay();
  document.getElementById("time-up").style.display = "none";

  // Unhighlight all buttons
  document.querySelectorAll(".preset-buttons button, .control-buttons button").forEach(btn => {
    btn.classList.remove("active");
  });
}

// Toggle 1–5 set buttons
function toggleSet(button) {
  playClickSound();
  button.classList.toggle("active");
}
