document.addEventListener("DOMContentLoaded", () => {
    const timerDisplay = document.getElementById("timer-display");
    const exerciseName = document.getElementById("exercise-name");
    const sinceStartDisplay = document.getElementById("since-start");
    const progressBar = document.getElementById("progress-bar");
    const startBtn = document.getElementById("start-btn");
    const pauseBtn = document.getElementById("pause-btn");
    const resetBtn = document.getElementById("reset-btn");
    const exerciseBars = document.querySelectorAll(".exercise-bar");
    const setDots = document.querySelectorAll(".set-dot");

    const clickSound = new Audio("click.mp3");
    const countdownBeep = new Audio("countdown_beep.mp3");
    const changeSound = new Audio("change.mp3");

    // New sounds
    const newExerciseVoice = new Audio("new_exercise.mp3");
    const churchBell = new Audio("church_bell.mp3");

    // Boost all volumes slightly
    [clickSound, countdownBeep, changeSound, newExerciseVoice, churchBell].forEach(audio => {
        audio.volume = 0.7; // louder but not ducking Spotify
    });

    const exercises = ["Extended Plank", "Hollow Hold", "Wrist to Knee Crunch", "AB Roll Out", "Reverse Crunch"];
    const exerciseDuration = 60; // seconds
    const breakDuration = 60; // seconds
    const sets = 3;

    let currentExercise = 0;
    let currentSet = 1;
    let isBreak = false;
    let timer = exerciseDuration;
    let totalSeconds = 0;
    let intervalId = null;

    function updateDisplay() {
        const minutes = String(Math.floor(timer / 60)).padStart(2, "0");
        const seconds = String(timer % 60).padStart(2, "0");
        timerDisplay.textContent = `${minutes}:${seconds}`;

        exerciseName.textContent = isBreak ? "Break" : exercises[currentExercise];

        // Update progress ring color
        const circumference = 2 * Math.PI * 45;
        const progress = isBreak ? (timer / breakDuration) : (timer / exerciseDuration);
        progressBar.style.strokeDasharray = circumference;
        progressBar.style.strokeDashoffset = circumference * (1 - progress);
        progressBar.style.stroke = isBreak ? "hsl(210, 100%, 50%)" : "hsl(0, 100%, 50%)";

        // Update exercise bars
        exerciseBars.forEach((bar, i) => {
            bar.classList.remove("active", "completed", "break");
            if (i < currentExercise) {
                bar.classList.add("completed");
            } else if (i === currentExercise) {
                bar.classList.add(isBreak ? "break" : "active");
            }
        });

        // Update set dots
        setDots.forEach((dot, i) => {
            dot.classList.toggle("active", i + 1 === currentSet);
            dot.classList.toggle("completed", i + 1 < currentSet);
        });

        // Update "Since start"
        const totalMin = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
        const totalSec = String(totalSeconds % 60).padStart(2, "0");
        sinceStartDisplay.textContent = `${totalMin}:${totalSec}`;
    }

    function playClick() {
        clickSound.currentTime = 0;
        clickSound.play();
    }

    function playCountdownBeep() {
        countdownBeep.currentTime = 0;
        countdownBeep.play();
    }

    function playChangeSound() {
        changeSound.currentTime = 0;
        changeSound.play();
    }

    function playNewExerciseCue() {
        newExerciseVoice.currentTime = 0;
        churchBell.currentTime = 0;
        newExerciseVoice.play();
        churchBell.play();
    }

    function tick() {
        if (timer > 0) {
            timer--;
            totalSeconds++;

            // Play 5s countdown beep
            if (timer <= 5 && timer > 0) {
                playCountdownBeep();
            }

            // 🔔 New exercise cue: 10s before the 3rd break ends
            if (isBreak && currentSet === 3 && timer === 10) {
                playNewExerciseCue();
            }

            updateDisplay();
        } else {
            playChangeSound();

            if (isBreak) {
                isBreak = false;
                currentExercise++;

                if (currentExercise >= exercises.length) {
                    currentExercise = 0;
                    currentSet++;
                    if (currentSet > sets) {
                        clearInterval(intervalId);
                        exerciseName.textContent = "Exercise completed.";
                        return;
                    }
                }
                timer = exerciseDuration;
            } else {
                isBreak = true;
                timer = breakDuration;
            }

            updateDisplay();
        }
    }

    function startTimer() {
        if (!intervalId) {
            intervalId = setInterval(tick, 1000);
            playClick();
        }
    }

    function pauseTimer() {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
            playClick();
        }
    }

    function resetTimer() {
        clearInterval(intervalId);
        intervalId = null;
        currentExercise = 0;
        currentSet = 1;
        isBreak = false;
        timer = exerciseDuration;
        totalSeconds = 0;
        updateDisplay();
        playClick();
    }

    startBtn.addEventListener("click", startTimer);
    pauseBtn.addEventListener("click", pauseTimer);
    resetBtn.addEventListener("click", resetTimer);

    updateDisplay();
});
