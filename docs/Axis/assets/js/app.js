// Axis — Straight Sets + Breaks + Voice Announcements + Preload names
// Defaults: each exercise 10s, break 60s. Beeps last 5s of work/rest.
// Start-of-set: announce exercise name. ~2s before end: "Next ..." cue.

const $  = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

let EXERCISES = [];
let currentLevel = 1;
let perExerciseSeconds = [10,10,10,10,10,10]; // default 10s each (editable per exercise)
let rounds = 1;
let breakSeconds = 60;                         // default break

// -------- Data --------
fetch('assets/data/exercises.json')
  .then(r => r.json())
  .then(d => { EXERCISES = d; });

// -------- Audio helpers --------
// support both new layout (system/names/cues) and old (root/next) for safety
function playOnce(paths){
  for (const p of paths) {
    try { const a = new Audio(p); a.play(); return; } catch {}
  }
}
function playBeep(){ playOnce(['assets/audio/system/beep.mp3','assets/audio/beep.mp3']); }
function playEnd(){ playOnce(['assets/audio/system/workout_complete.mp3','assets/audio/workout_complete.mp3']); }
function playCongrats(){ playOnce(['assets/audio/system/congratulation.mp3','assets/audio/congratulation.mp3']); }

function audioKeyFromExercise(ex){
  try { return ex.img.split('/').pop().replace(/\.[^.]+$/,'').toLowerCase(); } catch { return ''; }
}
function playExerciseName(ex){
  if (!ex) return;
  const k = audioKeyFromExercise(ex);
  playOnce([`assets/audio/names/${k}.mp3`]);
}
function playNextVoice(ex){
  if (!ex) return;
  const k = audioKeyFromExercise(ex);
  playOnce([`assets/audio/cues/${k}.mp3`, `assets/audio/next/${k}.mp3`]);
}
// iOS requires a user gesture before audio; ping a beep on Start.
function unlockAudio(){ playBeep(); }

// -------- Navigation scaffolding --------
function show(id){ $$('.screen').forEach(s=>s.classList.remove('active')); $(id).classList.add('active'); }

$$('.level-card').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    currentLevel = parseInt(btn.dataset.level,10);
    openLevel(currentLevel);
  });
});

$('#back-to-home').addEventListener('click', ()=> show('#screen-home'));

// -------- Level screen (with PRELOAD of names) --------
function openLevel(level){
  $('#level-title').textContent = `Level ${level}`;
  const rows = EXERCISES.filter(e=>e.level===level);
  perExerciseSeconds = rows.map(()=>10); // default 10s shown on the list

  // PRELOAD: exercise-name audio for this level (Option 5)
  rows.forEach(ex => {
    const k = audioKeyFromExercise(ex);
    try {
      const a = new Audio(`assets/audio/names/${k}.mp3`);
      a.preload = 'auto';
    } catch {}
  });

  const list = $('#exercise-list'); list.innerHTML='';
  rows.forEach((ex,i)=>{
    const row = document.createElement('div'); row.className='exercise-row';
    const img = document.createElement('img'); img.src=ex.img; img.alt=ex.name; img.onerror=()=>img.src='assets/img/ui/placeholder.png';
    const name = document.createElement('div'); name.className='exercise-name'; name.textContent=ex.name;

    const adjust = document.createElement('div'); adjust.className='time-adjust';
    const minus=document.createElement('button'); minus.textContent='−';
    const pill=document.createElement('div'); pill.className='pill'; pill.textContent=`${perExerciseSeconds[i]}s`;
    const plus=document.createElement('button'); plus.textContent='+';

    minus.addEventListener('click',()=>{
      perExerciseSeconds[i]=Math.max(5,perExerciseSeconds[i]-15);
      pill.textContent = `${perExerciseSeconds[i]}s`;
    });
    plus.addEventListener('click',()=>{
      perExerciseSeconds[i]=Math.min(180,perExerciseSeconds[i]+15);
      pill.textContent = `${perExerciseSeconds[i]}s`;
    });

    adjust.append(minus,pill,plus);
    row.append(img,name,adjust); list.append(row);
  });

  // Rounds (straight sets only)
  $$('#rounds-chips .chip').forEach(c=>c.classList.remove('selected'));
  $(`#rounds-chips .chip[data-rounds="${rounds}"]`)?.classList.add('selected');

  // Break control
  $('#break-pill').textContent = `${breakSeconds}s`;
  $('#break-minus').onclick = ()=>{ breakSeconds=Math.max(0, breakSeconds-15); $('#break-pill').textContent=`${breakSeconds}s`; };
  $('#break-plus').onclick  = ()=>{ breakSeconds=Math.min(600, breakSeconds+15); $('#break-pill').textContent=`${breakSeconds}s`; };

  show('#screen-level');
}

$('#rounds-chips').addEventListener('click', e=>{
  const btn = e.target.closest('.chip'); if(!btn) return;
  $$('#rounds-chips .chip').forEach(c=>c.classList.remove('selected'));
  btn.classList.add('selected'); rounds=parseInt(btn.dataset.rounds,10);
});

$('#btn-start').addEventListener('click', ()=>{ unlockAudio(); startWorkout(); });

// -------- Workout engine (Straight Sets + Break between work sets) --------
const player = {
  levelRows:[], roundIdx:0, exIdx:0,
  mode:'prep',                // 'prep' | 'run' | 'rest'
  duration:0, remaining:0, paused:false, raf:null, startTs:0,
  nextAfterRest:null
};

function startWorkout(){
  player.levelRows = EXERCISES.filter(e=>e.level===currentLevel);
  player.roundIdx=0; player.exIdx=0; player.paused=false; player.nextAfterRest=null;
  show('#screen-workout'); startPrep(3);
}

function setProgressLabel(){ $('#progress-label').textContent = `Exercise ${player.exIdx+1} of 6 • Round ${player.roundIdx+1} of ${rounds}`; }
function setExerciseVisual(){
  const ex = player.levelRows[player.exIdx];
  $('#exercise-name').textContent = ex.name;
  const img = $('#exercise-image'); img.src=ex.img; img.alt=ex.name; img.onerror=()=>{ console.warn('Image not found:', ex.img); img.src='assets/img/ui/placeholder.png'; };
}
function animateWheel(progress){
  const C=339.292; $('#wheel .arc').style.strokeDashoffset = String(C*(1-progress));
}

function startPrep(sec){
  player.mode='prep'; player.duration=sec; player.remaining=sec;
  setExerciseVisual(); setProgressLabel();
  $('#prep-overlay').classList.remove('hidden'); $('#prep-overlay').textContent=String(sec);
  const d = perExerciseSeconds[player.exIdx]; $('#big-timer').textContent=`00:${String(d).padStart(2,'0')}`;
  animateWheel(0); tickLoop();
}

function startRun(){
  player.mode='run';
  const d=perExerciseSeconds[player.exIdx];
  player.duration=d; player.remaining=d;
  $('#prep-overlay').classList.add('hidden');

  // Announce the exercise name at the start of the set
  playExerciseName(player.levelRows[player.exIdx]);

  tickLoop();
}

function startRest(){
  if(breakSeconds<=0){ player.nextAfterRest?.(); return; }
  player.mode='rest'; player.duration=breakSeconds; player.remaining=breakSeconds;
  $('#exercise-name').textContent='Rest';
  $('#exercise-image').src='assets/img/ui/placeholder.png';
  $('#big-timer').textContent = `00:${String(breakSeconds).padStart(2,'0')}`;
  animateWheel(0);
  tickLoop();
}

function tickLoop(){
  player.startTs = performance.now();
  let nextSpoken=false;

  const frame=()=>{
    if(player.paused){ player.raf=requestAnimationFrame(frame); return; }

    const elapsed=(performance.now()-player.startTs)/1000;
    const rem=Math.max(0, player.duration - Math.floor(elapsed));

    if(rem!==player.remaining){
      player.remaining=rem;

      if(player.mode==='prep'){
        $('#prep-overlay').textContent=String(rem);
        if(rem===0) startRun();

      } else if(player.mode==='run'){
        $('#big-timer').textContent=`00:${String(rem).padStart(2,'0')}`;
        animateWheel((player.duration-rem)/player.duration);

        if(rem<=5 && rem>0){ $('.image-hole').style.outline='2px solid var(--accent)'; playBeep(); }
        else { $('.image-hole').style.outline='1px solid #1a2030'; }

        // Speak "Next ..." ~2s before end (straight sets)
        if(!nextSpoken && rem===2){
          nextSpoken=true;
          let nextEx=null;
          if(player.roundIdx < rounds-1) nextEx = player.levelRows[player.exIdx];     // same exercise next set
          else if(player.exIdx < 5)      nextEx = player.levelRows[player.exIdx+1];  // next exercise
          playNextVoice(nextEx);
        }

        if(rem===0){
          // After work finishes, go to REST, then continue
          player.nextAfterRest = ()=>{
            if(player.roundIdx < rounds-1){ player.roundIdx+=1; startPrep(3); }
            else if(player.exIdx < 5){ player.roundIdx=0; player.exIdx+=1; startPrep(3); }
            else { finishWorkout(); }
          };
          startRest();
          return;
        }

      } else if(player.mode==='rest'){
        $('#big-timer').textContent=`00:${String(rem).padStart(2,'0')}`;
        animateWheel((player.duration-rem)/player.duration);
        if(rem<=5 && rem>0) playBeep();
        if(rem===0){ player.nextAfterRest?.(); return; }
      }
    }

    player.raf=requestAnimationFrame(frame);
  };
  player.raf=requestAnimationFrame(frame);
}

// Prev/Next jump between work sets (ignores rest)
function goPrev(){
  if(player.mode==='rest'){ player.mode='run'; } // ignore prev while resting
  if(player.roundIdx>0){ player.roundIdx-=1; }
  else if(player.exIdx>0){ player.exIdx-=1; player.roundIdx=rounds-1; }
  else return;
  startPrep(3);
}
function goNext(){
  if(player.roundIdx < rounds-1){ player.roundIdx+=1; }
  else if(player.exIdx < 5){ player.roundIdx=0; player.exIdx+=1; }
  else { finishWorkout(); return; }
  startPrep(3);
}

function finishWorkout(){
  playEnd();
  playCongrats();
  show('#screen-home');
}

// Controls
$('#btn-prev').addEventListener('click', goPrev);
$('#btn-next').addEventListener('click', goNext);
$('#btn-pause').addEventListener('click', ()=>{
  player.paused=!player.paused;
  $('#btn-pause').textContent = player.paused ? '▶' : '⏸';
});
$('#exit-workout').addEventListener('click', ()=> show('#screen-home'));
