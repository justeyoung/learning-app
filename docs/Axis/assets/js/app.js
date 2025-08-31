// Axis — Straight Sets ONLY (no rounds clicking) + Breaks + WebAudio beeps
// Flow: Level -> Start -> 3s prep -> announce -> last-5s beeps -> Rest -> next set
// After 3rd set of an exercise, move to the next exercise automatically.

const $  = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

let EXERCISES = [];
let currentLevel = 1;

// ---- Defaults (no user clicking for rounds) ----
const ROUNDS = 3;                // fixed straight sets
let breakSeconds = 60;           // adjustable in Level screen
const prepSeconds = 3;
let perExerciseSeconds = [10,10,10,10,10,10]; // editable per exercise

// Sounds: WebAudio beeps won't pause Spotify.
// Voice announcements may duck external audio; set to false to disable.
let beepsEnabled  = true;
let voiceEnabled  = true;

// ---- Load data ----
fetch('assets/data/exercises.json')
  .then(r => r.json())
  .then(d => { EXERCISES = d; });

// ---- WebAudio beeps (Spotify-safe) ----
let audioCtx = null;
function ensureAudioCtx(){
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch { audioCtx = null; }
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}
function beep(freq=1000, ms=150, gain=0.12){
  if (!beepsEnabled) return;
  ensureAudioCtx(); if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const g   = audioCtx.createGain();
  osc.type='sine'; osc.frequency.value=freq; g.gain.value=gain;
  osc.connect(g).connect(audioCtx.destination);
  const now = audioCtx.currentTime;
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(gain, now+0.01);
  g.gain.setTargetAtTime(0, now + ms/1000 - 0.03, 0.02);
  osc.start(now); osc.stop(now + ms/1000 + 0.02);
}

// ---- Voice announcements (optional) ----
function keyFromImgPath(p){ try{ return p.split('/').pop().replace(/\.[^.]+$/,'').toLowerCase(); }catch{ return ''; } }
function playExerciseName(ex){
  if (!voiceEnabled || !ex) return;
  const k = keyFromImgPath(ex.img);
  try { new Audio(`assets/audio/names/${k}.mp3`).play(); } catch {}
}

// ---- Navigation ----
function show(id){ $$('.screen').forEach(s=>s.classList.remove('active')); $(id).classList.add('active'); }

$$('.level-card').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    currentLevel = parseInt(btn.dataset.level,10);
    openLevel(currentLevel);
  });
});
$('#back-to-home').addEventListener('click', ()=> show('#screen-home'));

// ---- Level screen (no rounds UI; just times + break) ----
function openLevel(level){
  $('#level-title').textContent = `Level ${level}`;
  const rows = EXERCISES.filter(e=>e.level===level);
  perExerciseSeconds = rows.map(()=>10);

  // (Optional) preload names
  if (voiceEnabled){
    rows.forEach(ex=>{ try{
      const a = new Audio(`assets/audio/names/${keyFromImgPath(ex.img)}.mp3`);
      a.preload = 'auto';
    }catch{} });
  }

  const list = $('#exercise-list'); list.innerHTML='';
  rows.forEach((ex,i)=>{
    const row = document.createElement('div'); row.className='exercise-row';
    const img = document.createElement('img'); img.src=ex.img; img.alt=ex.name; img.onerror=()=>img.src='assets/img/ui/placeholder.png';
    const name= document.createElement('div'); name.className='exercise-name'; name.textContent=ex.name;

    const adjust=document.createElement('div'); adjust.className='time-adjust';
    const minus=document.createElement('button'); minus.textContent='−';
    const pill =document.createElement('div'); pill.className='pill'; pill.textContent=`${perExerciseSeconds[i]}s`;
    const plus =document.createElement('button'); plus.textContent='+';

    minus.onclick=()=>{ perExerciseSeconds[i]=Math.max(5,perExerciseSeconds[i]-15); pill.textContent=`${perExerciseSeconds[i]}s`; };
    plus.onclick =()=>{ perExerciseSeconds[i]=Math.min(180,perExerciseSeconds[i]+15); pill.textContent=`${perExerciseSeconds[i]}s`; };

    adjust.append(minus,pill,plus);
    row.append(img,name,adjust); list.append(row);
  });

  // Break control only
  $('#break-pill').textContent = `${breakSeconds}s`;
  $('#break-minus').onclick = ()=>{ breakSeconds=Math.max(0, breakSeconds-15);  $('#break-pill').textContent=`${breakSeconds}s`; };
  $('#break-plus').onclick  = ()=>{ breakSeconds=Math.min(600, breakSeconds+15); $('#break-pill').textContent=`${breakSeconds}s`; };

  show('#screen-level');
}

$('#btn-start').addEventListener('click', ()=>{ ensureAudioCtx(); startWorkout(); });

// ---- Prebuilt straight-sets schedule: ex1×ROUNDS → ex2×ROUNDS → … → ex6×ROUNDS ----
function buildSchedule(rows, rounds){
  const seq=[];
  for (let exIdx=0; exIdx<rows.length; exIdx++){
    for (let r=1; r<=rounds; r++){
      seq.push({ exIdx, round:r });
    }
  }
  return seq;
}

const player = {
  rows:[], schedule:[], idx:0,
  mode:'prep', duration:0, remaining:0, startTs:0, paused:false, raf:null
};

function currentItem(){ return player.schedule[player.idx]; }
function nextItem(){ return player.schedule[player.idx+1] || null; }

function startWorkout(){
  player.rows = EXERCISES.filter(e=>e.level===currentLevel);
  player.schedule = buildSchedule(player.rows, ROUNDS);
  player.idx = 0; player.paused=false;
  show('#screen-workout');
  startPrep(prepSeconds);
}

function setProgressLabel(){
  const it = currentItem();
  $('#progress-label').textContent = `Exercise ${it.exIdx+1} of 6 • Round ${it.round} of ${ROUNDS}`;
}

function setExerciseVisual(){
  const it=currentItem(); const ex=player.rows[it.exIdx];
  $('#exercise-name').textContent = ex.name;
  const img=$('#exercise-image');
  img.src = ex.img; img.alt = ex.name; img.onerror=()=>img.src='assets/img/ui/placeholder.png';
  $('.image-hole').classList.remove('resting');
}

function animateWheel(p){
  const C=339.292; $('#wheel .arc').style.strokeDashoffset = String(C*(1-p));
}

function startPrep(sec){
  player.mode='prep'; player.duration=sec; player.remaining=sec;
  setExerciseVisual(); setProgressLabel();
  $('#prep-overlay').classList.remove('hidden');
  $('#prep-overlay').textContent = String(sec);
  const d = perExerciseSeconds[currentItem().exIdx];
  $('#big-timer').textContent = `00:${String(d).padStart(2,'0')}`;
  animateWheel(0);
  tickLoop();
}

function startRun(){
  player.mode='run';
  const d = perExerciseSeconds[currentItem().exIdx];
  player.duration=d; player.remaining=d;
  $('#prep-overlay').classList.add('hidden');
  playExerciseName(player.rows[currentItem().exIdx]); // announce
  tickLoop();
}

function startRest(){
  if (breakSeconds <= 0) { advance(); return; }
  player.mode='rest'; player.duration=breakSeconds; player.remaining=breakSeconds;
  $('#exercise-name').textContent = 'Rest';
  const img=$('#exercise-image'); img.src='assets/img/ui/rest.png'; img.alt='Rest';
  $('.image-hole').classList.add('resting');
  $('#big-timer').textContent = `00:${String(breakSeconds).padStart(2,'0')}`;
  animateWheel(0);
  tickLoop();
}

function advance(){
  if (player.idx < player.schedule.length - 1){
    player.idx += 1;
    startPrep(prepSeconds);
  } else {
    finishWorkout();
  }
}

function tickLoop(){
  player.startTs = performance.now();
  const frame = () => {
    if (player.paused){ player.raf=requestAnimationFrame(frame); return; }

    const elapsed=(performance.now()-player.startTs)/1000;
    const rem=Math.max(0, player.duration - Math.floor(elapsed));

    if (rem !== player.remaining){
      player.remaining = rem;

      if (player.mode === 'prep'){
        $('#prep-overlay').textContent = String(rem);
        if (rem === 0) startRun();

      } else if (player.mode === 'run'){
        $('#big-timer').textContent = `00:${String(rem).padStart(2,'0')}`;
        animateWheel((player.duration-rem)/player.duration);
        if (rem <= 5 && rem > 0) beep(1000,150);
        if (rem === 0){ startRest(); return; }

      } else if (player.mode === 'rest'){
        $('#big-timer').textContent = `00:${String(rem).padStart(2,'0')}`;
        animateWheel((player.duration-rem)/player.duration);
        if (rem <= 5 && rem > 0) beep(800,150);
        if (rem === 0){ advance(); return; }
      }
    }

    player.raf=requestAnimationFrame(frame);
  };
  player.raf=requestAnimationFrame(frame);
}

// Prev/Next across WORK sets in the fixed schedule
function goPrev(){
  if (player.mode === 'rest') { player.mode='run'; }
  if (player.idx > 0){ player.idx -= 1; startPrep(prepSeconds); }
}
function goNext(){
  if (player.idx < player.schedule.length - 1){ player.idx += 1; startPrep(prepSeconds); }
  else { finishWorkout(); }
}

function finishWorkout(){
  // End chime via WebAudio (doesn't pause Spotify)
  beep(1200,180); setTimeout(()=>beep(1400,180),220); setTimeout(()=>beep(1600,220),480);
  show('#screen-home');
}

// Controls
$('#btn-prev').addEventListener('click', goPrev);
$('#btn-next').addEventListener('click', goNext);
$('#btn-pause').addEventListener('click', ()=>{
  player.paused = !player.paused;
  $('#btn-pause').textContent = player.paused ? '▶' : '⏸';
});
$('#exit-workout').addEventListener('click', ()=> show('#screen-home'));
