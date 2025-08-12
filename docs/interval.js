// ======= State & Plan =======
let timer = null;
let secondsLeft = 0;
let plan = [];
let stepIndex = 0;

// SVG wheel values
const R = 84;                        // radius in SVG (matches CSS)
const CIRC = 2 * Math.PI * R;        // circumference

// Elements
const timeLabel = () => document.getElementById('timeLabel');
const phaseLabel = () => document.getElementById('phaseLabel');
const progressArc = () => document.getElementById('progressArc');
const statusMsg = () => document.getElementById('statusMsg');

function playClick(){
  const a = document.getElementById('clickSound');
  a.currentTime = 0; a.play().catch(()=>{});
}
function playAlarm(){
  const a = document.getElementById('alarmSound');
  a.currentTime = 0; a.play().catch(()=>{});
}
function vibrate(pattern){ if (navigator.vibrate) navigator.vibrate(pattern); }

// Build workout plan based on UI
function rebuildPlan(){
  const sets = parseInt(document.getElementById('sets').value, 10) || 5;
  const len  = parseInt(document.getElementById('phaseLen').value, 10) || 180;

  plan = [];
  plan.push({label:'Warm‑up', type:'warm', color:getPhaseColor('warm'), secs:len});   // warm-up

  for(let i=0;i<sets;i++){
    plan.push({label:`Fast ${i+1}`, type:'fast', color:getPhaseColor('fast'), secs:len});
    plan.push({label:`Slow ${i+1}`, type:'slow', color:getPhaseColor('slow'), secs:len});
  }

  plan.push({label:'Cool‑down', type:'cool', color:getPhaseColor('cool'), secs:len}); // cool-down

  // reset view to first step
  stepIndex = 0;
  secondsLeft = plan[0].secs;
  setPhaseUI(plan[0]);
  drawTime(secondsLeft, plan[0].secs);
  statusMsg().textContent = `Plan: ${sets} sets • ${Math.round(len/60)}‑min phases`;
  // clear button active states
  clearControlHighlights();
}

// Helpers
function getPhaseColor(type){
  switch(type){
    case 'warm': return getComputedStyle(document.documentElement).getPropertyValue('--warm').trim();
    case 'fast': return getComputedStyle(document.documentElement).getPropertyValue('--fast').trim();
    case 'slow': return getComputedStyle(document.documentElement).getPropertyValue('--slow').trim();
    case 'cool': return getComputedStyle(document.documentElement).getPropertyValue('--cool').trim();
    default: return '#000';
  }
}

function setPhaseUI(step){
  phaseLabel().textContent = step.label;
  progressArc().style.stroke = step.color;
}

function format(secs){
  const m = Math.floor(secs/60);
  const s = secs%60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function drawTime(remaining, total){
  timeLabel().textContent = format(remaining);
  const ratio = 1 - (remaining/total);
  const dash = CIRC * ratio;
  progressArc().setAttribute('stroke-dasharray', `${dash} ${CIRC - dash}`);
}

// ======= Controls =======
function startWorkout(ev){
  playClick();
  clearInterval(timer);
  clearControlHighlights(); highlightButton(ev);

  const current = plan[stepIndex];
  // (re)initialize seconds if at boundary
  if (secondsLeft <= 0 || secondsLeft > current.secs) secondsLeft = current.secs;

  timer = setInterval(() => {
    secondsLeft--;
    drawTime(secondsLeft, current.secs);

    if (secondsLeft <= 0){
      // phase end
      playAlarm(); vibrate([300,200,300]);
      stepIndex++;
      if (stepIndex >= plan.length){
        clearInterval(timer);
        statusMsg().textContent = "Workout complete!";
        clearControlHighlights();
        return;
      }
      const next = plan[stepIndex];
      setPhaseUI(next);
      secondsLeft = next.secs;
      drawTime(secondsLeft, next.secs);
      statusMsg().textContent = `${next.label}`;
    }
  }, 1000);
}

function pauseWorkout(ev){
  playClick();
  clearInterval(timer);
  clearControlHighlights(); highlightButton(ev);
  statusMsg().textContent = "Paused";
}

function resetWorkout(ev){
  playClick();
  clearInterval(timer);
  clearControlHighlights(); highlightButton(ev);
  stepIndex = 0;
  secondsLeft = plan[0].secs;
  setPhaseUI(plan[0]);
  drawTime(secondsLeft, plan[0].secs);
  statusMsg().textContent = "Reset";
}

// ======= UI misc =======
function clearControlHighlights(){
  document.querySelectorAll('.controls .row button').forEach(b=>b.classList.remove('active'));
}
function highlightButton(ev){
  if (!ev || !ev.target) return;
  // ensure repaint on some Android devices
  ev.target.classList.remove('active');
  requestAnimationFrame(()=> ev.target.classList.add('active'));
}

// init
document.addEventListener('DOMContentLoaded', () => {
  // prime SVG circle length (visual)
  progressArc().setAttribute('stroke-dasharray', `0 ${CIRC}`);
  rebuildPlan();
});
