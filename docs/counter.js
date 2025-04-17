let count = 0;

function updateDisplay() {
  document.getElementById("count").textContent = count;
}

function increment() {
  count++;
  updateDisplay();
}

function decrement() {
  count = Math.max(0, count - 1);
  updateDisplay();
}
