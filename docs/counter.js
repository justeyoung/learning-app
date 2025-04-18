document.addEventListener("DOMContentLoaded", () => {
  const countDisplay = document.getElementById("count");
  const clickSound = document.getElementById("clickAudio");

  let count = 0;

  function playFeedback() {
    if ("vibrate" in navigator) {
      navigator.vibrate(100);
    }

    if (clickSound) {
      clickSound.currentTime = 0;
      clickSound.play().catch((e) => {
        console.log("Sound failed:", e);
      });
    }
  }

  function updateDisplay() {
    countDisplay.textContent = count;
  }

  window.increment = function () {
    count++;
    updateDisplay();
    playFeedback();
  };

  window.decrement = function () {
    count = Math.max(0, count - 1);
    updateDisplay();
    playFeedback();
  };

  window.resetCount = function () {
    count = 0;
    updateDisplay();
    playFeedback();
  };

  updateDisplay();
});
