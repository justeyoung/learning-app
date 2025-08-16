:root{
  --bg:#111; --fg:#eee; --muted:#9aa0a6;

  --ring-track:#2b2b2b;
  --ring-ex:#ff2d55;   /* red */
  --ring-br:#00aaff;   /* blue */

  --row-bg:#1f1f1f;
  --row-muted:#2a2a2a;
  --row-text:#ddd;

  --row-green:#16c060;      /* exercise (current) */
  --row-green-dim:#109b4d;  /* completed */
  --row-blue:#1e88ff;       /* break (current) */
}

*{box-sizing:border-box}
html,body{height:100%}
body{margin:0;background:var(--bg);color:var(--fg);font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif}
.wrap{max-width:700px;margin:24px auto;padding:16px}
h1{text-align:center;margin:8px 0 12px;font-size:24px}

/* Wheel */
.wheel-wrap{position:relative;width:260px;height:260px;margin:12px auto}
.wheel{width:100%;height:100%}
.track{
  fill:none;
  stroke:var(--ring-track);
  stroke-width:12;
}
.progress{
  fill:none;
  stroke:var(--ring-ex);
  stroke-width:12;
  stroke-linecap:round;
  transform:rotate(-90deg);
  transform-origin:50% 50%;
  stroke-dasharray:0 999; /* will be set in JS */
}
.progress.break{ stroke:var(--ring-br); }
.progress.exercise{ stroke:var(--ring-ex); }

.wheel-center{
  position:absolute; inset:0;
  display:flex; flex-direction:column; align-items:center; justify-content:center;
}
#status{font-size:14px;opacity:.9;margin-bottom:6px}
#timer{font-size:48px;font-weight:800;letter-spacing:1px}

/* Sets + since start */
.sets-line{
  display:flex; align-items:center; justify-content:center; gap:18px;
  margin:6px 0 14px; flex-wrap:wrap;
}
.sets{display:flex;gap:10px;align-items:center}
.tic{width:12px;height:12px;border-radius:50%;background:#333}
.tic.done{background:var(--row-green)}
.since{display:flex;gap:8px;align-items:center}
.since .label{color:var(--muted)}

/* Exercise rows (labelled list) */
.rows{display:flex;flex-direction:column;gap:10px;margin:12px 0 8px;padding:0 12px}
.row{
  display:flex;align-items:center;min-height:44px;border-radius:10px;
  background:var(--row-bg);color:var(--row-text);
  padding:10px 14px;transition:background .18s ease, color .18s ease;
  box-shadow: inset 0 0 0 1px #0006;
}
.row .name{font-size:16px}
.row.current-ex{background:var(--row-green);color:#fff}
.row.current-br{background:var(--row-blue);color:#fff}
.row.done{background:var(--row-green-dim);color:#eaffef}

/* Buttons */
.btns{display:flex;gap:12px;justify-content:center;margin:14px 0 8px}
button{background:#2f2f2f;color:#fff;border:0;border-radius:12px;padding:10px 18px;font-size:16px}
button:active{transform:translateY(1px)}
.home-wrap{text-align:center;margin-top:6px}
a.home{display:inline-block;background:#2f2f2f;color:#fff;padding:10px 18px;border-radius:12px;text-decoration:none}

/* Mobile */
@media (max-width:420px){
  .wheel-wrap{width:220px;height:220px}
  #timer{font-size:42px}
  .row{min-height:40px}
}
