// ===============================
// Kegel Timer — Hold/Rest with Reps & Sets
// Soft beep during HOLD (iOS-friendly)
// ===============================

window.addEventListener("DOMContentLoaded", () => {
  // -------- DOM elements --------
  const els = {
    holdSeconds: document.getElementById("holdSeconds"),
    restSeconds: document.getElementById("restSeconds"),
    reps: document.getElementById("reps"),
    setsTarget: document.getElementById("setsTarget"),
    restEqualsHold: document.getElementById("restEqualsHold"),

    phaseLabel: document.getElementById("phaseLabel"),
    timerLabel: document.getElementById("timerLabel"),
    countsLabel: document.getElementById("countsLabel"),

    startBtn: document.getElementById("startBtn"),
    pauseBtn: document.getElementById("pauseBtn"),
    resetBtn: document.getElementById("resetBtn"),
  };

  // -------- State --------
  let intervalId = null;

  let state = {
    running: false,
    phase: "READY", // READY | HOLD | REST | DONE
    secondsLeft: 0,
    rep: 0,
    set: 0,
  };

  // -------- Helpers --------
  function toInt(value, fallback) {
    const n = parseInt(value, 10);
    return Number.isFinite(n) ? n : fallback;
  }

  function readSettings() {
    const hold = Math.max(1, toInt(els.holdSeconds?.value, 5));
    const rest = Math.max(1, toInt(els.restSeconds?.value, hold));
    const reps = Math.max(1, toInt(els.reps?.value, 10));
    const setsTarget = Math.max(1, toInt(els.setsTarget?.value, 3));
    return { hold, rest, reps, setsTarget };
  }

  function setButtons() {
    if (els.startBtn) els.startBtn.disabled = state.running;
    if (els.pauseBtn) els.pauseBtn.disabled = !state.running;
  }

  // -------- Audio (soft beep) --------
  let audioCtx = null;

  function ensureAudio() {
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        audioCtx = null;
      }
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
  }

  function playSoftBeep() {
    if (!audioCtx) return;

    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "sine";
    osc.frequency.value = 440; // pitch (Hz)

    // Gentle envelope to avoid clicks
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.05, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(t);
    osc.stop(t + 0.09);
  }

  // Prime audio on first user gesture (iOS/Safari)
  let audioPrimed = false;
  function primeAudioOnce() {
    if (audioPrimed) return;
    audioPrimed = true;
    ensureAudio();
    // tiny silent beep to unlock
    if (audioCtx) {
      const t = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      gain.gain.value = 0.0001;
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.01);
    }
  }

  // -------- UI rendering --------
  function render() {
    if (els.phaseLabel) {
      els.phaseLabel.textContent =
        state.phase === "READY" ? "Ready" :
        state.phase === "HOLD"  ? "Hold"  :
        state.phase === "REST"  ? "Rest"  :
        state.phase === "DONE"  ? "Done"  :
        state.phase;
    }

    if (els.timerLabel) {
      els.timerLabel.textContent = String(Math.max(0, state.secondsLeft)).padStart(2, "0");
    }

    const { reps, setsTarget } = readSettings();
    if (els.countsLabel) {
      els.countsLabel.textContent = `Rep ${state.rep}/${reps} · Set ${state.set}/${setsTarget}`;
    }

    setButtons();
  }

  // -------- Core logic --------
  function stopInterval() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    state.running = false;
    setButtons();
  }

  function resetAll() {
    stopInterval();
    state = {
      running: false,
      phase: "READY",
      secondsLeft: 0,
      rep: 0,
      set: 0,
    };
    render();
  }

  function startSession() {
    primeAudioOnce();
    ensureAudio();

    // Prevent double-start
    if (intervalId) return;

    const { hold } = readSettings();

    // Fresh start
    if (state.phase === "READY" || state.phase === "DONE") {
      state.set = 1;
      state.rep = 1;
      state.phase = "HOLD";
      state.secondsLeft = hold;
    }

    state.running = true;
    render();

    intervalId = setInterval(() => {
      // Beep once per second during HOLD
      if (state.phase === "HOLD") {
        playSoftBeep();
      }

      state.secondsLeft -= 1;

      if (state.secondsLeft <= 0) {
        const { hold, rest, reps, setsTarget } = readSettings();

        if (state.phase === "HOLD") {
          state.phase = "REST";
          state.secondsLeft = rest;
        } else if (state.phase === "REST") {
          if (state.rep < reps) {
            state.rep += 1;
            state.phase = "HOLD";
            state.secondsLeft = hold;
          } else if (state.set < setsTarget) {
            state.set += 1;
            state.rep = 1;
            state.phase = "HOLD";
            state.secondsLeft = hold;
          } else {
            state.phase = "DONE";
            state.secondsLeft = 0;
            stopInterval();
          }
        }
      }

      render();
    }, 1000);
  }

  function pauseSession() {
    stopInterval();
    render();
  }

  // -------- Sync rest = hold --------
  function syncRestWithHold() {
    if (els.restEqualsHold?.checked && els.restSeconds && els.holdSeconds) {
      els.restSeconds.value = els.holdSeconds.value;
    }
  }

  // -------- Event listeners --------
  els.holdSeconds?.addEventListener("input", syncRestWithHold);
  els.restEqualsHold?.addEventListener("change", syncRestWithHold);

  els.startBtn?.addEventListener("click", () => {
    if (!state.running) startSession();
  });

  els.pauseBtn?.addEventListener("click", () => {
    if (state.running) pauseSession();
  });

  els.resetBtn?.addEventListener("click", resetAll);

  // iOS: unlock audio on first touch anywhere
  window.addEventListener("touchstart", primeAudioOnce, { once: true });

  // -------- Init --------
  syncRestWithHold();
  render();
});