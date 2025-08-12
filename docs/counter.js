// ------ Counter logic + Spotify-friendly sound ------

let count = 0;

// DOM
const display = document.getElementById("counterDisplay");
const minusBtn = document.getElementById("minusBtn");
const plusBtn  = document.getElementById("plusBtn");

// Update UI
function render() {
  if (display) display.textContent = String(count);
}

// --------- Sound (Web Audio preferred) ----------
let audioCtx = null;
let clickAudioEl = null;

function ensureAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      audioCtx = null;
    }
  }
  if (!clickAudioEl) {
    // Low-volume fallback click (still mixes; won’t pause Spotify)
    clickAudioEl = new Audio("docs/click.mp3");
    clickAudioEl.preload = "auto";
    clickAudioEl.volume = 0.15; // gentle
  }
}

function playClick() {
  // Prefer Web Audio short blip (mixes nicely)
  if (audioCtx) {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "square";
    osc.frequency.value = 1000; // click-like
    gain.gain.value = 0.12;
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now);
    // quick envelope to avoid pops
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    osc.stop(now + 0.08);
    return;
  }
  // Fallback to HTML5 audio (short, low volume, user-gesture -> won't pause Spotify)
  if (clickAudioEl) {
    try {
      clickAudioEl.currentTime = 0;
      clickAudioEl.play();
    } catch (e) { /* ignore */ }
  }
}

// ------ Event handlers ------
function inc() {
  ensureAudio(); // unlock on first tap
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

// Attach
document.addEventListener("DOMContentLoaded", () => {
  render();
  minusBtn?.addEventListener("click", dec);
  plusBtn?.addEventListener("click", inc);

  // Also unlock audio on first touch anywhere (helps some mobile browsers)
  window.addEventListener("touchstart", ensureAudio, { once: true });
});
