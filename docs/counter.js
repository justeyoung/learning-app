let timerInterval;
let timeRemaining = 0;

function updateDisplay() {
  const min = String(Math.floor(timeRemaining / 60)).padStart(2, '0');
  const sec = String(timeRemaining % 60).padStart(2, '0');
  document.getElementById("timer-display").innerText = `${min}:${sec}`;
}

function playClickSound() {
  const click = document.getElementById("clickSound");
  click.currentTime = 0;
  click.play().catch(() => {});
}

function setPreset(event, seconds) {
  playClickSound();
  clearInterval(timerInterval);
  timeRemaining = seconds;
  updateDisplay();
  document.getElementById("time-up").style.display = "none";

  // Clear active states
  document.querySelectorAll(".preset-buttons button, .control-buttons button").forEach(btn => {
    btn.classList.remove("active");
  });

  event.target.classList.add("active");
}

function setCustomTime() {
  const min = parseInt(document.getElementById("custom-minutes").value) || 0;
  const sec = parseInt(document.getElementById("custom-seconds").value) || 0;
  timeRemaining = min * 60 + sec;
  updateDisplay();
  document.getElementById("custom-input").style.display = "none";
  document.getElementById("time-up").style.display = "none";

  // Clear highlights
  document.querySelectorAll(".preset-buttons button, .control-buttons button").forEach(btn => {
    btn.classList.remove("active");
  });
}

function toggleCustomInput(event) {
  playClickSound();
  const box = document.getElementById("custom-input");
  box.style.display = box.style.display === "none" ? "flex" : "none";

  document.querySelectorAll(".control-buttons button").forEach(btn => {
    btn.classList.remove("active");
  });

  if (event?.target) {
    event.target.classList.add("active");
  }
}

function startTimer(event) {
  playClickSound();
  clearInterval(timerInterval);
  document.getElementById("time-up").style.display = "none";

  // Clear control button highlights
  document.querySelectorAll(".control-buttons button").forEach(btn => {
    btn.classList.remove("active");
  });

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

      // Vibrate
      if (navigator.vibrate) navigator.vibrate([300, 200, 300]);

      // Play alert
      const alarm = document.getElementById("alarmSound");
      alarm.currentTime = 0;
      alarm.play().catch(() => {});
    }
  }, 1000);
}

function pauseTimer(event) {
  playClickSound();
  clearInterval(timerInterval);

  document.querySelectorAll(".control-buttons button").forEach(btn => {
    btn.classList.remove("active");
  });

  if (event?.target) {
    event.target.classList.add("active");
  }
}

function resetTimer(event) {
  playClickSound();
  clearInterval(timerInterval);
  timeRemaining = 0;
  updateDisplay();
  document.getElementById("time-up").style.display = "none";

  document.querySelectorAll(".preset-buttons button, .control-buttons button").forEach(btn => {
    btn.classList.remove("active");
  });
}

function toggleSet(button) {
  playClickSound();
  button.classList.toggle("active");
}
