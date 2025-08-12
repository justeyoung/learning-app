const R = 110;
const CIRC = 2 * Math.PI * R;

let plan = [];
let stepIndex = 0;
let workoutActive = false;
let startTimestamp = null;
let elapsedBeforePause = 0;
let animationFrameId = null;
let totalSecs = 0;
let elapsedBeforeCurrentPhase = 0;

const $ = (s) => document.querySelector(s);
function cssVar(name){ return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

function format(sec){
  const m = Math.floor(sec/60).toString().padStart(2,'0');
  const s = Math.ceil(sec%60).toString().padStart(2,'0');
  return `${m}:${s}`;
}

function setPhaseUI(step){
  $("#phaseLabel").textContent = step.name;
  $(".progress").style.stroke = step.color;
  $("#timeLabel").textContent = format(step.secs);
  $(".progress").style.strokeDasharray = CIRC;
  $(".progress").style.strokeDashoffset = 0;
  highlightSegment(stepIndex);
}

function buildPlan(){
  const t = 5; // change to 180 for 3min
  plan = [
    { name:"Warm-up",  secs:t, color:cssVar('--warm') },
    { name:"Fast",     secs:t, color:cssVar('--fast') },
    { name:"Slow",     secs:t, color:cssVar('--slow') },
    { name:"Fast",     secs:t, color:cssVar('--fast') },
    { name:"Slow",     secs:t, color:cssVar('--slow') },
    { name:"Fast",     secs:t, color:cssVar('--fast') },
    { name:"Slow",     secs:t, color:cssVar('--slow') },
    { name:"Fast",     secs:t, color:cssVar('--fast') },
    { name:"Slow",     secs:t, color:cssVar('--slow') },
    { name:"Cool-down",secs:t, color:cssVar('--cool') },
  ];
  totalSecs = plan.reduce((a,p)=>a+p.secs,0);
  buildSegments();
}

function buildSegments(){
  $("#segBar").innerHTML = "";
  plan.forEach(p=>{
    const d = document.createElement('div');
    d.className = 'seg';
    d.dataset.type =
      p.name.toLowerCase().includes('warm') ? 'warm' :
      p.name.toLowerCase().includes('cool') ? 'cool' :
      p.name.toLowerCase().includes('fast') ? 'fast' : 'slow';
    $("#segBar").appendChild(d);
  });
  highlightSegment(0);
}

function highlightSegment(i){
  document.querySelectorAll('.segbar .seg').forEach((el,idx)=>{
    el.classList.toggle('current', idx===i);
    if (idx < i) el.classList.add('done'); else el.classList.remove('done');
  });
}

function startWorkout(){
  $("#startBtn").classList.add("active");
  $("#pauseBtn").classList.remove("active");
  workoutActive = true;

  if (startTimestamp === null){
    startTimestamp = Date.now();
    elapsedBeforePause = 0;
    elapsedBeforeCurrentPhase = plan.slice(0, stepIndex).reduce((a,p)=>a+p.secs,0);
    setPhaseUI(plan[stepIndex]);
  } else {
    startTimestamp = Date.now() - elapsedBeforePause*1000;
  }

  cancelAnimationFrame(animationFrameId);
  animationFrameId = requestAnimationFrame(updateFrame);
}

function updateFrame(){
  const step = plan[stepIndex];
  const now = Date.now();
  const elapsed = Math.max(0, (now - startTimestamp)/1000);
  const remaining = Math.max(0, step.secs - elapsed);

  $("#timeLabel").textContent = format(remaining);
  const phaseRatio = Math.min(1, elapsed/step.secs);
  $(".progress").style.strokeDashoffset = -CIRC * phaseRatio;

  const totalElapsed = elapsedBeforeCurrentPhase + elapsed;
  $("#overall-fill").style.width = `${(totalElapsed/totalSecs)*100}%`;

  if (remaining <= 0){
    playAlarm();
    vibrate([300,200,300]);
    stepIndex++;
    if (stepIndex >= plan.length){
      workoutActive = false;
      $("#statusMsg").textContent = "Workout complete!";
      highlightSegment(plan.length);
      $("#overall-fill").style.width = '100%';
      return;
    }
    startTimestamp = Date.now();
    elapsedBeforePause = 0;
    elapsedBeforeCurrentPhase += step.secs;
    setPhaseUI(plan[stepIndex]);
    animationFrameId = requestAnimationFrame(updateFrame);
  } else if (workoutActive){
    animationFrameId = requestAnimationFrame(updateFrame);
  }
}

function pauseWorkout(){
  if (!workoutActive) return;
  workoutActive = false;
  $("#pauseBtn").classList.add("active");
  $("#startBtn").classList.remove("active");
  elapsedBeforePause = (Date.now() - startTimestamp)/1000;
  cancelAnimationFrame(animationFrameId);
}

function playAlarm(){
  const audio = new Audio('docs/alert.wav');
  audio.play();
}
function vibrate(pattern){
  if (navigator.vibrate) navigator.vibrate(pattern);
}

document.addEventListener("DOMContentLoaded",()=>{
  buildPlan();
  $("#startBtn").addEventListener("click", startWorkout);
  $("#pauseBtn").addEventListener("click", pauseWorkout);
});
