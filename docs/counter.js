let count = 0;
const countDisplay = document.getElementById("count");
const clickSound = document.getElementById("clickAudio");

function playFeedback() {
  if ("vibrate" in navigator) {
    navigator.vibrate(100); // 100ms vibration
  }
  clickSound.currentTime = 0;
  clickSound.play();
}

function updateDisplay() {
  countDisplay.textContent = count;
}

function increment() {
  count++;
  updateDisplay();
  playFeedback();
}

function decrement() {
  count = Math.max(0, count - 1);
  updateDisplay();
  playFeedback();
}

function resetCount() {
  count = 0;
  updateDisplay();
  playFeedback();
}
