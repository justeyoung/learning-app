let count = 0;

// Get the display and click sound elements
const countDisplay = document.getElementById("count");
const clickSound = document.getElementById("clickAudio");

// Function to play sound and vibrate
function playFeedback() {
  if ("vibrate" in navigator) {
    navigator.vibrate(100); // Vibrate for 100ms
  }

  if (clickSound) {
    clickSound.currentTime = 0;
    clickSound.play().catch((error) => {
      console.log("Click sound failed to play:", error);
    });
  }
}

// Update the number display
function updateDisplay() {
  countDisplay.textContent = count;
}

// Button actions
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
