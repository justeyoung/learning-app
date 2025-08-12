// ===== Exercise Counter (with Spotify‑friendly click sound) =====

let count = 0;

// DOM
const display  = document.getElementById("counterDisplay");
const minusBtn = document.getElementById("minusBtn");
const plusBtn  = document.getElementById("plusBtn");

// Render
function render() {
  display.textContent = String(count);
}

// ---- Sound: Web Audio (preferred) with HTML5 fallback ----
let audioCtx = null;
let clickAudioEl = null;

function ensureAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      audioCtx = null; // fallback will be used
    }
  }
  if (!clickAudioEl) {
    // Low-volume fallback file (keeps Spotify playing)
    clickAudioEl = new Audio("Click.mp3"); // path matches your /docs listing (case sensitive)
    clickAudioEl.preload = "auto";
    clickAudioEl.volume = 0.15;
  }
}

function playClick() {
  if (audioCtx) {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "square";
    osc.frequency.value = 1000;
    gain.gain.value = 0.12;
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    osc.stop(now + 0.08);
  } else if (clickAudioEl) {
    try { clickAudioEl.currentTime = 0; clickAudioEl.play(); } catch {}
  }
}

// Handlers
function inc() {
  ensureAudio();
  count += 1;
  render();
  playClick();
}
function dec() {
  ensureAudio();
  count = Math.max(0, count - 1);
  render();
  playClick();
}

// Wire up
document.addEventListener("DOMContentLoaded", () => {
  render();
  minusBtn?.addEventListener("click", dec);
  plusBtn?.addEventListener("click", inc);

  // Some mobile browsers require a user gesture to unlock Web Audio
  window.addEventListener("touchstart", ensureAudio, { once: true });
});
