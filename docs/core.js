document.addEventListener("DOMContentLoaded", () => {
    const timerDisplay = document.getElementById("time");
    const sinceStartDisplay = document.getElementById("sinceStart");
    const startBtn = document.getElementById("startBtn");
    const pauseBtn = document.getElementById("pauseBtn");
    const resetBtn = document.getElementById("resetBtn");
    const exerciseBars = document.querySelectorAll(".exercise-bar");
    const exerciseNameDisplay = document.getElementById("exerciseName");
    const setTicTacs = document.querySelectorAll(".set-tictac");

    const clickSound = new Audio("click.mp3");
    const beepSound = new Audio("beep.mp3");
    const changeSound = new Audio("change.mp3");
    const digitalPing = new Audio("digital_ping.mp3");

    clickSound.volume = 0.7;
    beepSound.volume = 0.9;
    changeSound.volume = 1.0;
    digitalPing.volume = 1.0;

    const exercises = [
        "Extended Plank",
        "Mountain Climbers",
        "Russian Twists",
        "Leg Raises",
        "Flutter Kicks"
    ];

    let exerciseDuration = 10; // For testing
    let breakDuration = 10; // For testing
    let currentExerciseIndex = 0;
    let currentSet = 1;
    let isBreak = false;
    let timer;
    let remainingTime = exerciseDuration;
    let totalSeconds = 0;

    function updateDisplay() {
        let minutes = String(Math.floor(remainingTime / 60)).padStart(2, '0');
        let seconds = String(remainingTime % 60).padStart(2, '0');
        timerDisplay.textContent = `${minutes}:${seconds}`;

        let totalMin = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
        let totalSec = String(totalSeconds % 60).padStart(2, '0');
        sinceStartDisplay.textContent = `${totalMin}:${totalSec}`;
    }

    function highlightExercise() {
        exerciseBars.forEach((bar, index) => {
            bar.classList.remove("active-exercise", "break-exercise", "completed-exercise");
            if (index < currentExerciseIndex) {
                bar.classList.add("completed-exercise");
            }
            if (index === currentExerciseIndex) {
                bar.classList.add(isBreak ? "break-exercise" : "active-exercise");
            }
        });
    }

    function startTimer() {
        clearInterval(timer);
        timer = setInterval(() => {
            remainingTime--;
            totalSeconds++;
            updateDisplay();

            if (remainingTime <= 5 && remainingTime > 0) {
                beepSound.play();
            }

            if (remainingTime <= 0) {
                clearInterval(timer);

                if (isBreak) {
                    currentExerciseIndex++;
                    if (currentExerciseIndex >= exercises.length) {
                        currentSet++;
                        if (currentSet > 3) {
                            exerciseNameDisplay.textContent = "Exercise completed.";
                            return;
                        }
                        currentExerciseIndex = 0;
                        setTicTacs[currentSet - 2].classList.add("completed-set");
                    }
                    isBreak = false;
                    remainingTime = exerciseDuration;
                } else {
                    isBreak = true;
                    remainingTime = breakDuration;

                    // Special double ping after 3rd break (index 2)
                    if (currentExerciseIndex === 2) {
                        digitalPing.play();
                        setTimeout(() => {
                            digitalPing.play();
                        }, 800);
                    } else {
                        changeSound.play();
                    }
                }

                if (!isBreak) {
                    exerciseNameDisplay.textContent = exercises[currentExerciseIndex];
                } else {
                    exerciseNameDisplay.textContent = "Break";
                }

                highlightExercise();
                startTimer();
            }
        }, 1000);
    }

    startBtn.addEventListener("click", () => {
        clickSound.play();
        startTimer();
    });

    pauseBtn.addEventListener("click", () => {
        clickSound.play();
        clearInterval(timer);
    });

    resetBtn.addEventListener("click", () => {
        clickSound.play();
        clearInterval(timer);
        currentExerciseIndex = 0;
        currentSet = 1;
        isBreak = false;
        remainingTime = exerciseDuration;
        totalSeconds = 0;
        exerciseNameDisplay.textContent = exercises[currentExerciseIndex];
        setTicTacs.forEach(t => t.classList.remove("completed-set"));
        highlightExercise();
        updateDisplay();
    });

    // Initialize
    exerciseNameDisplay.textContent = exercises[currentExerciseIndex];
    highlightExercise();
    updateDisplay();
});
