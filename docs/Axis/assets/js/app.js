// Axis — Straight Sets only + adjustable Break between work sets.
// Beeps last 5s of both WORK and BREAK. "Next exercise" voice remains.

const $  = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

let EXERCISES = [];
let currentLevel = 1;
let perExerciseSeconds = [60,60,60,60,60,60];
let rounds = 1;
let breakSeconds = 60;     // NEW: configurable break
const STYLE = 'straight';  // fixed

// Load data
fetch('assets/data/exercises.json')
  .then(r => r.json())
  .then(d => { EXERCISES = d; });

// ---------- Audio ----------
const AUDIO = {
  beep:     new Audio('assets/audio/beep.mp3'),
  end:      new Audio('assets/audio/workout_complete.mp3'),
  congrats: new Audio('assets/audio/congratulation.mp3')
};
function playBeep(){ try{ AUDIO.beep.currentTime=0; AUDIO.beep.play(); }catch{} }
function playEnd(){ try{ AUDIO.end.currentTime=0; AUDIO.end.play(); }catch{} }
function playCongrats(){ try{ AUDIO.congrats.currentTime=0; AUDIO.congrats.play(); }catch{} }

// “Next exercise” voice
function audioKeyFromExercise(ex){ try{ return ex.img.split('/').pop().replace(/\.[^.]+$/,'').toLowerCase(); } catch { return ''; } }
function playNextVoice(nextEx){ if(!nextEx) return; const k=audioKeyFromExercise(nextEx); try{ new Audio(`assets/audio/next/${k}.mp3`).play(); }catch{} }
// iOS unlock
function unlockAudio(){ try{ AUDIO.beep.play().then(()=>AUDIO.beep.pause()).catch(()=>{}); }catch{} }

// ---------- Navigation ----------
function show(id){ $$('.screen').forEach(s=>s.classList.remove('active')); $(id).classList.add('active'); }

$$('.level-card').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    currentLevel = parseInt(btn.dataset.level,10);
    openLevel(currentLevel);
  });
});

$('#back-to-home').addEventListener('click', ()=> show('#screen-home'));

// ---------- Level screen ----------
function openLevel(level){
  $('#level-title').textContent = `Level ${level}`;
  const rows = EXERCISES.filter(e=>e.level===level);
  perExerciseSeconds = rows.map(()=>60);

  const list = $('#exercise-list'); list.innerHTML='';
  rows.forEach((ex,i)=>{
    const row = document.createElement('div'); row.className='exercise-row';
    const img = document.createElement('img'); img.src=ex.img; img.alt=ex.name; img.onerror=()=>img.src='assets/img/ui/placeholder.png';
    const name = document.createElement('div'); name.className='exercise-name'; name.textContent=ex.name;
    const adjust = document.createElement('div'); adjust.className='time-adjust';
    const minus=document.createElement('button'); minus.textContent='−';
    const pill=document.createElement('div'); pill.className='pill'; pill.textContent=`${perExerciseSeconds[i]}s`;
    const plus=document.createElement('button'); plus.textContent='+';
    minus.addEventListener('click',()=>{ perExerciseSeconds[i]=Math.max(15,perExerciseSeconds[i]-15); pill.textContent=`${perExerciseSeconds[i]}s`; });
    plus.addEventListener('click',()=>{ perExerciseSeconds[i]=Math.min(120,perExerciseSeconds[i]+15); pill.textContent=`${perExerciseSeconds[i]}s`; });
    adjust.append(minus,pill,plus);
    row.append(img,name,adjust); list.append(row);
  });

  // rounds chips
  $$('#rounds-chips .chip').forEach(c=>c.classList.remove('selected'));
  $(`#rounds-chips .chip[data-rounds="${rounds}"]`).classList.add('selected');

  // break control
  $('#break-pill').textContent = `${breakSeconds}s`;
  $('#break-minus').onclick = ()=>{ breakSeconds=Math.max(0, breakSeconds-15); $('#break-pill').textContent=`${breakSeconds}s`; };
  $('#break-plus').onclick  = ()=>{ breakSeconds=Math.min(180, breakSeconds+15); $('#break-pill').textContent=`${breakSeconds}s`; };

  show('#screen-level');
}

$('#rounds-chips').addEventListener('click', e=>{
  const btn = e.target.closest('.chip'); if(!btn) return;
  $$('#rounds-chips .chip').forEach(c=>c.classList.remove('selected'));
  btn.classList.add('selected'); rounds=parseInt(btn.dataset.rounds,10);
});

$('#btn-start').addEventListener('click', ()=>{ unlockAudio(); startWorkout(); });

// ---------- Workout engine ----------
const player = {
  levelRows:[], roundIdx:0, exIdx:0,
  mode:'prep',                // 'prep' | 'run' | 'rest'
  duration:0, remaining:0, paused:false, raf:null, startTs:0,
  nextAfterRest:null          // function to call after rest finishes
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
function animateWheel(progress){ const C=339.292; $('#wheel .arc').style.strokeDashoffset = String(C*(1-progress)); }

function startPrep(sec){
  player.mode='prep'; player.duration=sec; player.remaining=sec;
  setExerciseVisual(); setProgressLabel();
  $('#prep-overlay').classList.remove('hidden'); $('#prep-overlay').textContent=String(sec);
  const d=perExerciseSeconds[player.exIdx]; $('#big-timer').textContent=`00:${String(d).padStart(2,'0')}`;
  animateWheel(0); tickLoop();
}
function startRun(){
  player.mode='run'; const d=perExerciseSeconds[player.exIdx]; player.duration=d; player.remaining=d;
  $('#prep-overlay').classList.add('hidden'); tickLoop();
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

        // Next voice ~2s before end (straight sets)
        if(!nextSpoken && rem===2){
          nextSpoken=true;
          let nextEx=null;
          if(player.roundIdx < rounds-1) nextEx = player.levelRows[player.exIdx];           // same exercise next set
          else if(player.exIdx < 5)      nextEx = player.levelRows[player.exIdx+1];        // next exercise
          playNextVoice(nextEx);
        }

        if(rem===0){
          // decide what's next and insert REST before it
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

function goPrev(){
  // Straight sets: step back to previous work segment; rest will trigger as normal afterwards
  if(player.mode==='rest'){ player.mode='run'; } // ignore prev during rest
  if(player.roundIdx>0){ player.roundIdx-=1; }
  else if(player.exIdx>0){ player.exIdx-=1; player.roundIdx=rounds-1; }
  else return;
  startPrep(3);
}
function goNext(){
  // Skip to next work segment, ignoring current
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

$('#btn-prev').addEventListener('click', goPrev);
$('#btn-next').addEventListener('click', goNext);
$('#btn-pause').addEventListener('click', ()=>{
  player.paused=!player.paused;
  $('#btn-pause').textContent = player.paused ? '▶' : '⏸';
});
$('#exit-workout').addEventListener('click', ()=> show('#screen-home'));
