// core.js — Friday morning state + fixed beeps

window.addEventListener('DOMContentLoaded', () => {
  let timerInterval;
  let timeLeft = 0;
  let isRunning = false;
  let currentExercise = 0;
  let currentSet = 1;
  let inBreak = false;
  const totalSets = 3;

  const exercises = ["Plank", "Hollow Hold", "Side Plank", "Leg Raises", "Extended Plank"];
  const exerciseDuration = 20; // seconds
  const breakDuration = 20;    // seconds

  const timerDisplay = document.getElementById("time");
  const statusDisplay = document.getElementById("status");
  const setDots = document.querySelectorAll(".set-dot");

  // 🔊 sounds
  const click = new Audio("click.mp3");
  click.preload = "auto";
  click.volume = 0.4;

  const newExerciseSound = new Audio("new_exercise.mp3");
  newExerciseSound.preload = "auto";
  newExerciseSound.volume = 0.35;

  const rapidPing = new Audio("digital_ping.mp3");
  rapidPing.preload = "auto";
  rapidPing.volume = 0.35;

  // ⏱️ beeps: create fresh audio each time
  function playBeep() {
    try {
      const b = new Audio("beep.mp3");
      b.volume = 0.9;
      b
