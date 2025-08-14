let exercises = ["Extended Plank", "Hollow Hold", "Wrist to Knee Crunch", "AB Roll Out", "Reverse Crunch"];
let currentExercise = 0;
let currentSet = 1;
let isBreak = false;
let timeLeft = 60; // 1 minute exercise or break
let totalTime = 60;
let timerInterval;
let sinceStart = 0;
let isRunning = false;
let audioCtx;

// Initialize page
function init() {
    updateDisplay();
    updateExerciseList();
}

function updateDisplay() {
    document.getElementById("exercise-name").textContent = isBreak ? "Break" : exercises[currentExercise];
    document.getElementById("time-left").textContent = formatTime(timeLeft);
    document.getElementById("since-start").textContent = formatTime(sinceStart);
    updateProgressCircle();
    updateSets();
    highlightExercise();
}

function updateExerciseList() {
    const container = document.getElementById("exercise-list");
    container.innerHTML = "";
    exercises.forEach((ex, index) => {
        const div = document.createElement("div");
        div.textContent = ex;
        div.className = "exercise-item";
        container.appendChild(div);
    });
}

function updateSets() {
    const setContainer = document.getElementById("set-tics");
    setContainer.innerHTML = "";
    for (let i = 1; i <= 3; i++) {
        const tic = document.createElement("span");
        tic.className = "tic";
        if (i <= currentSet) {
            tic.classList.add("done");
        }
        setContainer.appendChild(tic);
    }
}

function highlightExercise() {
    const items = document.querySelectorAll(".exercise-item");
    items.forEach((item, index) => {
        if (index === currentExercise && !isBreak) {
            item.style.color = "#00FF00"; // green digital clock style
            item.style.backgroundColor = "black";
        } else {
            item.style.color = "";
            item.style.backgroundColor = "";
        }
    });
}

function updateProgressCircle() {
    const circle = document.getElementById("progress-circle");
    const progress = (totalTime - timeLeft) / totalTime;
    const offset = 283 - (283 * progress);
    circle.style.strokeDashoffset = offset;
    circle.style.stroke = isBreak ? "#00BFFF" : "#FF4C4C"; // blue for break, red for exercise
}

// Start timer
function startTimer() {
    if (!isRunning) {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        isRunning = true;
        timerInterval = setInterval(() => {
            timeLeft--;
            sinceStart++;
            updateDisplay();

            if (timeLeft <= 5 && timeLeft > 0) {
                countdownBeep(); // last 5 sec beep
            }

            if (timeLeft === 0) {
                phaseChime(); // exercise to break or break to exercise sound
                if (!isBreak) {
                    isBreak = true;
                    timeLeft = 60;
                    totalTime = 60;
                } else {
                    isBreak = false;
                    currentExercise++;
                    if (currentExercise >= exercises.length) {
                        currentExercise = 0;
                        currentSet++;
                        if (currentSet > 3) {
                            resetTimer();
                            return;
                        }
                    }
                    timeLeft = 60;
                    totalTime = 60;
                }
                updateDisplay();
            }
        }, 1000);
    }
}

// Pause timer
function pauseTimer() {
    clickTone();
    clearInterval(timerInterval);
    isRunning = false;
}

// Reset timer
function resetTimer() {
    clickTone();
    clearInterval(timerInterval);
    isRunning = false;
    currentExercise = 0;
    currentSet = 1;
    isBreak = false;
    timeLeft = 60;
    totalTime = 60;
    sinceStart = 0;
    updateDisplay();
}

// Format mm:ss
function formatTime(sec) {
    const m = Math.floor(sec / 60).toString().padStart(1, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

// ---- SOUND FUNCTIONS ----

// Increase volume by 20% for all tones
function tone(freq = 950, dur = 0.1, vol = 0.14, type = 'square', when = 0){
    if (!audioCtx) return;
    vol *= 1.2; // Increase volume by 20%
    const t = audioCtx.currentTime + when;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type; 
    o.frequency.value = freq;
    g.gain.value = 0.0001;
    o.connect(g).connect(audioCtx.destination);
    o.start(t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.stop(t + dur + 0.02);
}

function clickTone(){
    tone(600, 0.08, 0.14, 'square');
}

function countdownBeep(){
    tone(800, 0.15, 0.16, 'sine');
}

function phaseChime(){
    tone(500, 0.2, 0.16, 'sine');
    tone(700, 0.2, 0.16, 'sine', 0.25);
    tone(900, 0.25, 0.16, 'sine', 0.5);
}

document.getElementById("start-btn").addEventListener("click", () => {
    clickTone();
    startTimer();
});
document.getElementById("pause-btn").addEventListener("click", pauseTimer);
document.getElementById("reset-btn").addEventListener("click", resetTimer);

init();
