/* SURVIVAL: LOST WORLD
   Satu file untuk semuanya: loading -> akun -> multiplayer -> lobby -> game.
   index.html hanya berisi layar loading + tempat form masuk. */

const $ = id => document.getElementById(id);
const NS_SVG = "http://www.w3.org/2000/svg";
let THREE = null;           // diisi saat loading selesai
let FB = null;              // modul Firebase (null bila gagal dimuat)
let M = {};                 // modul game: map, intro, hud, fishing, monsters, lobby
let started = false;

/* =====================================================================
   1. CSS (game + multiplayer) — disuntik dari sini, bukan dari index.html
   ===================================================================== */
const GAME_CSS = `
canvas{display:block;width:100%;height:100%;touch-action:none}
.hud{position:absolute;z-index:2;top:16px;left:18px;right:18px;display:flex;justify-content:space-between;align-items:center;pointer-events:none}
.brand{font-weight:950;letter-spacing:2px;font-size:16px;text-shadow:0 2px 8px #0009}.brand span{color:#f0a45d}
.status{font-size:10px;letter-spacing:1px;padding:8px 12px;border:1px solid #ffffff40;border-radius:30px;background:#091715aa;pointer-events:auto}
.status .admin-verified{color:#48aaff;font-weight:1000;text-shadow:0 0 8px #48aaff}
.status i{display:inline-block;width:7px;height:7px;border-radius:50%;background:#80e49c;margin-left:6px;box-shadow:0 0 8px #80e49c}
.status button{margin-left:10px;padding:0;font:inherit;color:#f0a45d;background:none;border:0;text-decoration:underline;cursor:pointer}
.help{position:absolute;z-index:2;bottom:16px;left:18px;background:#071311b8;border:1px solid #ffffff25;border-radius:10px;padding:10px 12px;font-size:11px;line-height:1.7;color:#dce8e0;pointer-events:none}
.help b{color:#f0a45d}.mobile{display:none}
.footer{position:absolute;right:18px;bottom:18px;color:#ffffff80;font-size:9px;letter-spacing:2px;pointer-events:none}
.joystick{width:112px;height:112px;border:1px solid #ffffff55;border-radius:50%;background:#08141177;position:relative;touch-action:none;backdrop-filter:blur(5px)}
.stick{position:absolute;left:31px;top:31px;width:48px;height:48px;border-radius:50%;background:#e9a05ccc;border:2px solid #ffe0bd;box-shadow:0 4px 16px #0007}
.mobile{position:absolute;z-index:3;left:18px;right:18px;bottom:22px;align-items:flex-end;justify-content:space-between;pointer-events:none}
.mobile>*{pointer-events:auto}.actions{display:flex;flex-direction:column;gap:10px;align-items:center}
.action{width:60px;height:60px;border-radius:50%;border:1px solid #ffffff80;background:#122522dc;color:#fff;font-weight:900;font-size:11px;touch-action:none}
.action.jump{background:#b96e39dd}.action:active{transform:scale(.94)}
.hud-r{display:flex;align-items:center;gap:8px}
.dia{display:flex;align-items:center;gap:6px;height:30px;padding:0 12px 0 9px;font-size:12px;font-weight:700;letter-spacing:.5px;font-variant-numeric:tabular-nums;border:1px solid #ffffff40;border-radius:30px;background:#091715aa;pointer-events:none}
.dia svg{display:block}
.dia.bump{animation:diaBump .32s ease-out}
@keyframes diaBump{40%{transform:scale(1.16);border-color:#4cc9f0}}
.dia-fly{position:fixed;left:0;top:0;z-index:40;pointer-events:none;will-change:transform}
html:fullscreen,body:fullscreen{background:#000}
@media(pointer:coarse),(max-width:800px){.mobile{display:flex}.help,.footer{display:none}.hud{top:12px;left:13px;right:13px}.brand{font-size:14px}}
`;

const MP_CSS = `
/* --- panel "Pemain" (teman, party, undangan) --- */
#mp{position:absolute;z-index:7;top:calc(54px + env(safe-area-inset-top));right:max(18px,env(safe-area-inset-right));display:flex;flex-direction:column;align-items:flex-end;gap:8px;pointer-events:none;color:#e9e4d6;font-family:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif}
#mp>*{pointer-events:auto}#mp button{font:inherit;cursor:pointer}
#mp .mp-btn{padding:8px 14px;font-size:15px;color:#e9e4d6;background:#10201cdd;border:1px solid #3f5b52;border-radius:4px}#mp .mp-btn b{color:#f0a45d;font-weight:600}
#mp .mp-pop{width:min(320px,calc(100vw - 36px));max-height:min(60vh,430px);overflow:auto;padding:16px;background:#172522f5;border:1px solid #3f5b52;border-radius:6px}
#mp .mp-pop[hidden]{display:none}
#mp .mp-add{display:flex;gap:8px;margin:0}
#mp .mp-add input{flex:1;min-width:0;padding:9px 10px;font:inherit;font-size:17px;letter-spacing:2px;color:#e9e4d6;background:#10201c;border:1px solid #3f5b52;border-radius:4px}
#mp .mp-add input:focus-visible,#mp button:focus-visible{outline:2px solid #f0a45d;outline-offset:2px}
#mp .mp-add button,#mp .mp-row button{padding:7px 12px;font-size:14px;color:#172522;background:#f0a45d;border:0;border-radius:4px}
#mp .mp-row button.x{color:#93a89f;background:none;text-decoration:underline;padding:4px}
#mp .mp-row button.mp-profile-action{padding:4px 7px;font-size:11px}
#mp .mp-msg{margin:8px 0 0;min-height:1.3em;font-size:14px;color:#ee9b82}#mp .mp-msg.ok{color:#9fd3a8}
#mp .mp-h{margin:12px 0 4px;font-size:14px;font-style:italic;color:#93a89f}
#mp .mp-row{display:flex;align-items:center;gap:10px;padding:6px 0;font-size:16px}
#mp .mp-row i{flex:none;width:8px;height:8px;border-radius:50%;background:#4a5f57}#mp .mp-row i.on{background:#80e49c}
#mp .mp-row span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#mp .mp-row small{display:block;font-size:12px;font-style:italic;color:#6f877c}
#mp .mp-search{width:100%;margin:0 0 8px;padding:8px 10px;color:#e9e4d6;background:#10201c;border:1px solid #3f5b52;border-radius:4px;font:inherit}
#mp.lobby{top:auto;right:auto;left:max(24px,env(safe-area-inset-left));bottom:128px;align-items:flex-start}#mp.lobby .mp-btn{display:none}#mp.game{display:none}
#mpToast{position:absolute;z-index:7;top:calc(56px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:12px;padding:10px 14px;max-width:calc(100vw - 24px);color:#e9e4d6;font:15px "Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;background:#172522f5;border:1px solid #3f5b52;border-radius:6px}
#mpToast[hidden]{display:none}#mpToast button{font:inherit;font-size:14px;padding:6px 12px;color:#172522;background:#f0a45d;border:0;border-radius:4px;cursor:pointer}#mpToast button.x{color:#93a89f;background:none;text-decoration:underline}

/* --- dock kiri: tombol Chat & Misi --- */
#mpDock{position:absolute;z-index:8;left:max(10px,env(safe-area-inset-left));top:calc(100px + env(safe-area-inset-top));width:134px;display:flex;flex-direction:column;gap:8px}
#mpDock button{position:relative;display:flex;width:100%;align-items:center;gap:7px;height:36px;padding:0 12px 0 10px;color:#d6dfd8;background:#0f1c19e6;border:1px solid #2f4a41;border-radius:8px;font:600 12px/1 "Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;letter-spacing:.3px;cursor:pointer;transition:background .15s,border-color .15s,color .15s}
#mpDock button:hover{border-color:#5f8074}
#mpDock button:focus-visible{outline:2px solid #f0a45d;outline-offset:2px}
#mpDock button[aria-pressed="true"]{color:#172522;background:#f0a45d;border-color:#f0a45d}
#mpDock .dot{position:absolute;top:-3px;right:-3px;width:9px;height:9px;border-radius:50%;background:#f0a45d;border:2px solid #172522}
#mpDock .dot[hidden]{display:none}
.ico{display:inline-flex;flex:none}

/* --- panel umum di kiri (chat, misi, profil) --- */
.mp-panel{position:absolute;z-index:9;left:calc(max(10px,env(safe-area-inset-left)) + 122px);top:calc(100px + env(safe-area-inset-top));width:min(290px,calc(100vw - 142px));max-height:calc(100% - 150px);display:flex;flex-direction:column;color:#e9e4d6;background:#12211df2;border:1px solid #2f4a41;border-radius:10px;font:13px/1.4 system-ui,sans-serif;overflow:hidden}
.mp-panel[hidden]{display:none}
.mp-ph{display:flex;align-items:center;gap:8px;padding:10px 10px 10px 14px;border-bottom:1px solid #2f4a41}
.mp-ph h3{margin:0;flex:1;font:600 15px "Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;letter-spacing:.2px}
.mp-ph small{color:#7f968b;font-size:11px}
.mp-x{display:grid;place-items:center;width:26px;height:26px;padding:0;color:#93a89f;background:none;border:0;border-radius:6px;cursor:pointer}
.mp-x:hover{color:#e9e4d6;background:#ffffff14}.mp-x:focus-visible{outline:2px solid #f0a45d}
.mp-pb{padding:12px 14px 14px;overflow:auto}

/* chat */
#mpChat .mp-pb{padding:0;display:flex;flex-direction:column}
.gc-log{height:170px;overflow:auto;padding:10px 14px;overflow-wrap:anywhere;scrollbar-width:thin;scrollbar-color:#3f5b52 transparent}
.gc-empty{margin:56px 0 0;text-align:center;font-style:italic;color:#6f877c}
.gc-line{margin:0 0 7px}
.gc-line b{font-weight:600;color:#9bb7aa}.gc-line b.me{color:#f0a45d}.gc-line b.adm{color:#70baff}
.gc-line time{margin-left:6px;font-size:10px;color:#5d756a}
.gc-line span{display:block;color:#e9e4d6}
.gc-vf{display:inline-block;vertical-align:-2px;margin-left:3px;color:#48aaff}
.gc-form{display:flex;gap:6px;padding:8px;border-top:1px solid #2f4a41}
.gc-form input{flex:1;min-width:0;height:34px;padding:0 10px;color:#fff;background:#0c1815;border:1px solid #2f4a41;border-radius:6px;font:inherit}
.gc-form input:focus-visible{outline:2px solid #f0a45d;outline-offset:-1px}
.gc-form button{display:grid;place-items:center;width:34px;height:34px;padding:0;color:#172522;background:#f0a45d;border:0;border-radius:6px;cursor:pointer}
.gc-form button:focus-visible{outline:2px solid #e9e4d6;outline-offset:2px}
.gc-note{margin:0;padding:0 12px;min-height:0;font-size:11px;color:#ee9b82}.gc-note:not(:empty){padding-bottom:8px}

/* misi */
.ms-bot{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:26px}
.ms-claim{display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 11px;font:600 12px system-ui,sans-serif;color:#172522;background:#f0a45d;border:0;border-radius:6px;cursor:pointer}
.ms-claim:disabled{opacity:.6;cursor:default}.ms-claim:focus-visible{outline:2px solid #e9e4d6;outline-offset:2px}
.ms{padding:11px 0;border-bottom:1px solid #22382f}.ms:first-child{padding-top:0}.ms:last-of-type{border-bottom:0}
.ms-top{display:flex;align-items:center;justify-content:space-between;gap:10px}
.ms-t{display:flex;align-items:center;gap:6px;font-weight:600}
.ms.done .ms-t{color:#9fd3a8}
.ms-r{display:inline-flex;align-items:center;gap:4px;font-size:12px;color:#8fdcf3;font-variant-numeric:tabular-nums}.ms.done .ms-r{color:#6f877c}
.ms-bar{height:4px;margin:8px 0 5px;background:#22382f;border-radius:2px;overflow:hidden}
.ms-bar i{display:block;height:100%;background:#f0a45d;border-radius:2px;transition:width .4s}
.ms.done .ms-bar i{background:#80e49c}
.ms-p{font-size:11px;color:#7f968b;font-variant-numeric:tabular-nums}
.ms-pips{display:flex;gap:4px;margin:8px 0 5px}
.ms-pips i{flex:1;height:4px;background:#22382f;border-radius:2px}.ms-pips i.on{background:#f0a45d}
.ms-foot{margin:10px 0 0;font-size:11px;font-style:italic;color:#6f877c}

/* profil */
.pf-row{display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid #22382f}.pf-row:last-of-type{border-bottom:0}
.pf-row span{color:#7f968b}.pf-row b{font-weight:600;text-align:right;font-variant-numeric:tabular-nums}
@media(max-width:800px){.gc-log{height:130px}}

/* di dalam game: tidak ada diamond, dock Chat/Misi, maupun panelnya (hanya di lobby) */
#game.playing #diaChip,#game.playing #mpDock,#game.playing .mp-panel,#game.playing .pf-av,#game.playing #mpNote{display:none!important}

/* foto profil di HUD lobby (di samping diamond) + panel "Profil saya" */
.pf-av{display:grid;place-items:center;flex:none;width:30px;height:30px;padding:0;border:1px solid #ffffff66;border-radius:50%;background:#1d3a33 center/cover no-repeat;color:#f0a45d;font:700 14px system-ui,sans-serif;cursor:pointer;pointer-events:auto}
.pf-av:focus-visible,.pm-av:focus-visible{outline:2px solid #f0a45d;outline-offset:2px}
#mpMine{left:auto;right:max(10px,env(safe-area-inset-right));top:calc(62px + env(safe-area-inset-top))}
.pm-top{display:flex;align-items:center;gap:14px;margin-bottom:12px}
.pm-av{position:relative;flex:none;display:grid;place-items:center;width:72px;height:72px;padding:0;border:2px solid #3f5b52;border-radius:50%;background:#1d3a33 center/cover no-repeat;color:#f0a45d;font:700 28px system-ui,sans-serif;cursor:pointer}
.pm-av.ro{cursor:default;width:56px;height:56px;font-size:22px}
.pm-info{min-width:0;display:flex;flex-direction:column;gap:4px}
.pm-name{font:600 16px "Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;overflow-wrap:anywhere}
.pm-info small{color:#7f968b;font-size:11px}
.pm-dia{display:inline-flex;align-items:center;gap:6px;font-weight:700;color:#8fdcf3;font-variant-numeric:tabular-nums}
.pm-btn{height:30px;padding:0 12px;color:#172522;background:#f0a45d;border:0;border-radius:6px;font:600 12px system-ui,sans-serif;cursor:pointer}
.pm-btn:focus-visible,.pm-namebox button:focus-visible{outline:2px solid #e9e4d6;outline-offset:2px}
.pm-namebox{margin-top:14px;padding-top:12px;border-top:1px solid #22382f}
.pm-note{margin:0 0 8px;font-size:11px;color:#7f968b}
.pm-namebox form{display:flex;gap:8px;margin:0}
.pm-namebox input{flex:1;min-width:0;height:34px;padding:0 10px;color:#fff;background:#0c1815;border:1px solid #2f4a41;border-radius:6px;font:inherit}
.pm-namebox input:focus-visible{outline:2px solid #f0a45d;outline-offset:-1px}
.pm-namebox button{height:34px;padding:0 12px;color:#172522;background:#f0a45d;border:0;border-radius:6px;font:600 12px system-ui,sans-serif;cursor:pointer}
.pm-namebox button:disabled{opacity:.6}
.pm-msg{margin:8px 0 0;min-height:1.3em;font-size:12px;color:#ee9b82}.pm-msg.ok{color:#9fd3a8}

/* --- panel Teman (di dock kiri, sama seperti Chat & Misi) --- */
.mpf{color:#e9e4d6;font-family:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif}
.mpf .mp-add{display:flex;gap:8px;margin:0}
.mpf .mp-add input{flex:1;min-width:0;padding:9px 10px;font:inherit;font-size:17px;letter-spacing:2px;color:#e9e4d6;background:#10201c;border:1px solid #3f5b52;border-radius:4px}
.mpf .mp-add input:focus-visible,.mpf button:focus-visible{outline:2px solid #f0a45d;outline-offset:2px}
.mpf .mp-add button,.mpf .mp-row button{padding:7px 12px;font-size:14px;color:#172522;background:#f0a45d;border:0;border-radius:4px}
.mpf .mp-row button.x{color:#93a89f;background:none;text-decoration:underline;padding:4px}
.mpf .mp-row button.mp-profile-action{padding:4px 7px;font-size:11px}
.mpf .mp-msg{margin:8px 0 0;min-height:1.3em;font-size:14px;color:#ee9b82}.mpf .mp-msg.ok{color:#9fd3a8}
.mpf .mp-h{margin:12px 0 4px;font-size:14px;font-style:italic;color:#93a89f}
.mpf .mp-row{display:flex;align-items:center;gap:10px;padding:6px 0;font-size:16px}
.mpf .mp-row i{flex:none;width:8px;height:8px;border-radius:50%;background:#4a5f57}.mpf .mp-row i.on{background:#80e49c}
.mpf .mp-row span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mpf .mp-row small{display:block;font-size:12px;font-style:italic;color:#6f877c}
.mpf .mp-search{width:100%;margin:0 0 8px;padding:8px 10px;color:#e9e4d6;background:#10201c;border:1px solid #3f5b52;border-radius:4px;font:inherit}
#mpDock .cnt{margin-left:auto;min-width:16px;padding:3px 5px;border-radius:9px;color:#9fd3a8;background:#ffffff14;text-align:center;font:700 10px/1 system-ui,sans-serif}
#mpDock button[aria-pressed="true"] .cnt{color:#172522;background:#17252233}

/* kartu statistik profil */
.pm-idrow{display:flex;align-items:center;gap:8px}
.pm-copy{height:20px;padding:0 8px;color:#f0a45d;background:none;border:1px solid #3f5b52;border-radius:10px;font:600 10px system-ui,sans-serif;cursor:pointer}
.pm-copy:hover{border-color:#f0a45d}.pm-copy:focus-visible{outline:2px solid #f0a45d;outline-offset:2px}
.pm-role{display:inline-block;align-self:flex-start;padding:2px 8px;font:700 9px system-ui,sans-serif;letter-spacing:1px;color:#70baff;border:1px solid #70baff66;border-radius:10px}
.pm-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 0 12px}
.pm-stat{padding:9px 8px;text-align:center;background:#0c1815;border:1px solid #22382f;border-radius:8px}
.pm-stat b{display:flex;align-items:center;justify-content:center;gap:5px;font:700 15px system-ui,sans-serif;font-variant-numeric:tabular-nums}
.pm-stat.dia b{color:#8fdcf3}
.pm-stat small{display:block;margin-top:3px;font-size:10px;color:#7f968b}
.pm-note .ico{vertical-align:-2px}
.pm-actions{display:flex;gap:8px;margin-top:12px}

/* lencana di foto profil: ceklis biru = developer, diamond = logo diamond */
.pf-av,.pt-av{position:relative}
.av-badge{position:absolute;display:block;width:44%;height:44%;min-width:12px;min-height:12px;pointer-events:none;filter:drop-shadow(0 1px 2px #000a)}
.av-badge svg{display:block;width:100%;height:100%}
.av-badge.dev{right:-4px;bottom:-4px}.av-badge.dia{left:-5px;bottom:-4px}

#mpNote{position:absolute;z-index:12;top:calc(56px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);padding:10px 14px;max-width:calc(100vw - 24px);text-align:center;color:#e9e4d6;font:14px system-ui,sans-serif;background:#172522f5;border:1px solid #f0a45d;border-radius:6px}
#mpNote[hidden]{display:none}
`;

function injectCss() {
  const s = document.createElement("style");
  s.textContent = GAME_CSS + MP_CSS;
  document.head.appendChild(s);
}

/* DOM game (HUD + kontrol sentuh). Id & kelas sama persis seperti sebelumnya,
   supaya lobby.js, hud.js dan intro.js tetap menemukannya. */
function buildGameDom() {
  const g = $("game");
  g.insertAdjacentHTML("afterbegin",
    `<div class="hud"><div class="brand">SURVIVAL <span>LOST WORLD</span></div><div class="hud-r"><div class="dia" id="diaChip" title="Diamond">${diamondSvg(16)}<span id="diaVal">0</span></div><div class="status">OFFLINE DEMO <i></i></div></div></div>
     <div class="help"><b>PC</b> W A S D / Arrow · Shift: Run · Space: Jump<br><b>Kamera</b> mengikuti arah karakter</div>`);
  g.insertAdjacentHTML("beforeend",
    `<div class="mobile">
       <div id="joystick" class="joystick"><div id="stick" class="stick"></div></div>
       <div class="actions"><button id="runBtn" class="action">RUN</button><button id="jumpBtn" class="action jump">JUMP</button></div>
     </div>
     <div class="footer">THREE.JS · CHARACTER TEST</div>`);
}

/* =====================================================================
   2. LOADING (garis kontur + progres)
   ===================================================================== */
const root = $("loading");
const el = { stage: $("ldStage"), pct: $("ldPct"), fill: $("ldFill"), g: $("contours"), summit: $("summit"), hint: $("ldHint") };
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const t0 = performance.now();

const N = 16;
let seed = 11; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
const waves = [0.11, 0.06, 0.04, 0.025].map((a, i) => ({ a, f: i + 2, p: rnd() * 6.283, d: rnd() - 0.5 }));
const ringPoint = (k, th) => {
  const t = k / N, base = 380 * (1 - t * 0.9);
  let n = 0; for (const w of waves) n += w.a * Math.sin(w.f * th + w.p + w.d * k * 0.3);
  const r = base * (1 + n);
  return [500 + 70 * t + Math.cos(th) * r, 500 - 50 * t + Math.sin(th) * r];
};
const smooth = p => {
  const n = p.length, f = v => v.toFixed(1); let d = `M${f(p[0][0])} ${f(p[0][1])}`;
  for (let i = 0; i < n; i++) {
    const a = p[(i - 1 + n) % n], b = p[i], c = p[(i + 1) % n], e = p[(i + 2) % n];
    d += `C${f(b[0] + (c[0] - a[0]) / 6)} ${f(b[1] + (c[1] - a[1]) / 6)} ${f(c[0] - (e[0] - b[0]) / 6)} ${f(c[1] - (e[1] - b[1]) / 6)} ${f(c[0])} ${f(c[1])}`;
  }
  return d + "Z";
};
const rings = [];
for (let k = 0; k < N; k++) {
  const pts = Array.from({ length: 72 }, (_, i) => ringPoint(k, i / 72 * Math.PI * 2));
  const isIdx = k % 4 === 3;
  const path = document.createElementNS(NS_SVG, "path");
  path.setAttribute("d", smooth(pts)); path.setAttribute("pathLength", "1");
  path.setAttribute("class", "c" + (isIdx ? " idx" : ""));
  el.g.appendChild(path);
  let label = null;
  if (isIdx) {
    const [x, y] = pts[Math.floor(72 * 0.62)];
    label = document.createElementNS(NS_SVG, "text");
    label.setAttribute("x", x.toFixed(1)); label.setAttribute("y", (y + 7).toFixed(1));
    label.textContent = (k + 1) * 25 + " m";
    el.g.appendChild(label);
  }
  rings.push({ path, label });
}
{ const t = (N - 1) / N, cx = 500 + 70 * t, cy = 500 - 50 * t;
  el.summit.setAttribute("d", `M${cx} ${cy - 15}L${cx + 13} ${cy + 9}L${cx - 13} ${cy + 9}Z`); }

el.hint.textContent = matchMedia("(pointer:coarse)").matches
  ? "Geser joystick di kiri untuk berjalan, tekan Run untuk berlari."
  : "W A S D untuk berjalan, tahan Shift untuk berlari, Space untuk melompat.";

const W = { engine: 0.6, net: 0.1, game: 0.3 };
const st = { engine: 0, net: 0, game: 0 };
let target = 0, shown = 0, finishing = false, dead = false, customLabel = "", lastInt = -1, lastLabel = "";
const recompute = () => { target = Math.min(1, st.engine * W.engine + st.net * W.net + st.game * W.game); };

function render() {
  rings.forEach((r, k) => {
    const p = Math.min(1, Math.max(0, shown * N - k));
    r.path.style.strokeDashoffset = 1 - p;
    r.path.classList.toggle("live", p > 0 && p < 1);
    r.label && r.label.classList.toggle("on", p >= 1);
  });
  el.fill.style.transform = `scaleX(${shown})`;
  const i = Math.round(shown * 100);
  if (i !== lastInt) { lastInt = i; el.pct.textContent = i + "%"; root.setAttribute("aria-valuenow", i); }
  const lb = customLabel || (target >= 1 && shown >= 0.999 ? "Siap"
    : st.engine < 1 ? "Mengunduh mesin 3D" : st.net < 1 ? "Menyiapkan jaringan" : st.game < 1 ? "Memuat kode game" : "Menyiapkan akun");
  if (lb !== lastLabel) { lastLabel = lb; el.stage.textContent = lb; }
}
function frame() {
  if (dead) return;
  const diff = target - shown;
  if (diff > 0) shown += reduce ? diff : Math.min(diff, diff * 0.08 + 0.0006, 0.025);
  render();
  if (target >= 1 && shown >= 0.999) { shown = 1; render(); el.summit.classList.add("on"); setTimeout(afterLoad, reduce ? 0 : 550); return; }
  requestAnimationFrame(frame);
}
function finish() {
  if (finishing || dead) return; finishing = true;
  setTimeout(() => { st.engine = st.net = st.game = 1; customLabel = ""; recompute(); }, Math.max(0, 900 - (performance.now() - t0)));
}
function hide() {
  root.style.pointerEvents = "none"; root.setAttribute("aria-busy", "false");
  root.style.opacity = "0";
  const done = () => { root.remove(); window.dispatchEvent(new Event("game:loaded")); };
  reduce ? done() : root.addEventListener("transitionend", done, { once: true });
}
function fail(error) {
  dead = true; console.error("Gagal memulai game:", error);
  document.querySelector(".ld-panel").hidden = false; $("auth").hidden = true;
  root.classList.add("failed"); root.style.opacity = "1"; root.style.transition = "none";
  el.stage.textContent = "Game gagal dimuat"; el.pct.textContent = ""; root.setAttribute("aria-busy", "false");
  const why = location.protocol === "file:" ? "Buka lewat server lokal atau hosting, bukan langsung dari file." : "Periksa koneksi internet, lalu coba lagi.";
  el.hint.textContent = why + " ";
  const d = document.createElement("span"); d.className = "ld-detail"; d.textContent = error?.message || String(error); el.hint.appendChild(d);
  const b = document.createElement("button"); b.className = "ld-retry"; b.textContent = "Coba lagi"; b.onclick = () => location.reload();
  el.hint.after(b); b.focus();
}
async function pull(url, key, estimate) {
  try {
    const res = await fetch(url);
    if (!res.ok || !res.body) return;
    const total = +res.headers.get("content-length") || estimate;
    const reader = res.body.getReader(); let got = 0;
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      got += value.length; st[key] = Math.min(0.98, got / total); recompute();
    }
  } catch (_) { /* galat sebenarnya muncul saat import */ }
  finally { st[key] = 1; recompute(); }
}

/* =====================================================================
   3. AKUN (Firebase Realtime Database lewat REST)
   ===================================================================== */
const DB = "https://survival3d-ecd3e-default-rtdb.asia-southeast1.firebasedatabase.app";
const SKEY = "s3d_session", ADMIN = "putzzdev", ADMIN_ID = "12345678", ADMIN_PASSWORD = "313068";
const A = { form: $("auth"), title: $("aTitle"), user: $("aUser"), pass: $("aPass"), conf: $("aConf"), confWrap: $("aConfWrap"), msg: $("aMsg"), go: $("aGo"), swap: $("aSwap"), ask: $("aAsk") };
let mode = "login", account = null;
const say = (t, ok) => { A.msg.textContent = t; A.msg.className = "a-msg" + (ok ? " ok" : ""); };
const b64 = u => btoa(String.fromCharCode(...u)), unb64 = t => Uint8Array.from(atob(t), c => c.charCodeAt(0));
async function hashPw(pw, salt) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveBits"]);
  return b64(new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 150000 }, key, 256)));
}
async function db(path, opt = {}) {
  const r = await fetch(`${DB}/${path}.json`, opt);
  if (r.status === 401 || r.status === 403) throw new Error("Akses database ditolak. Periksa Rules Realtime Database.");
  if (r.status !== 412 && !r.ok) throw new Error("Server bermasalah (" + r.status + ").");
  return r;
}
const claim = (path, data) => db(path, { method: "PUT", headers: { "if-match": "null_etag" }, body: JSON.stringify(data) }); // 412 = sudah dipakai

async function register(name, pw) {
  const key = name.toLowerCase(), admin = key === ADMIN;
  if (admin && pw !== ADMIN_PASSWORD) throw new Error("Password akun admin harus sesuai password khusus.");
  const salt = crypto.getRandomValues(new Uint8Array(16)), hash = await hashPw(pw, salt);
  let id = null;
  if (admin) {
    if ((await claim("ids/" + ADMIN_ID, key)).status === 412) throw new Error("Akun admin sudah dibuat.");
    id = ADMIN_ID;
  } else {
    for (let i = 0; i < 10 && !id; i++) {
      const c = String(10000000 + crypto.getRandomValues(new Uint32Array(1))[0] % 90000000);
      if (c !== ADMIN_ID && (await claim("ids/" + c, key)).status !== 412) id = c;
    }
    if (!id) throw new Error("Gagal membuat ID, coba lagi.");
  }
  const rec = { id, name: admin ? "Putzzdev" : name, salt: b64(salt), hash, created: Date.now() };
  if (admin) rec.role = "admin";
  const r = await claim("users/" + key, rec);
  if (r.status === 412) { await db("ids/" + id, { method: "DELETE" }); throw new Error("Username sudah dipakai."); }
  return { id, username: rec.name, role: admin ? "admin" : "player" };
}
async function login(name, pw) {
  const key = name.toLowerCase();
  let u = await (await db("users/" + key)).json();
  // Akun admin dibuat saat login pertama; akun yang sudah ada tidak pernah ditimpa.
  if (key === ADMIN && pw === ADMIN_PASSWORD && !u) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const rec = { id: ADMIN_ID, name: "Putzzdev", salt: b64(salt), hash: await hashPw(pw, salt), created: Date.now(), role: "admin" };
    const idClaim = await claim("ids/" + ADMIN_ID, key);
    if (idClaim.status === 412) throw new Error("ID admin sudah dipakai akun lain. Hubungi pengelola database.");
    const userClaim = await claim("users/" + key, rec);
    if (userClaim.status === 412) { await db("ids/" + ADMIN_ID, { method: "DELETE" }); u = await (await db("users/" + key)).json(); }
    else u = rec;
  }
  if (!u || await hashPw(pw, unb64(u.salt)) !== u.hash) throw new Error("Username atau password salah.");
  if (key === ADMIN && u.role !== "admin") throw new Error("Username admin sudah terdaftar sebagai akun biasa.");
  return { id: u.id, username: u.name, role: u.role === "admin" ? "admin" : "player" };
}
function paintChip(acc) {
  const chip = document.querySelector(".status"); if (!chip) return;
  chip.replaceChildren(document.createTextNode(`${acc.username}${acc.role === "admin" ? " " : ""}`));
  if (acc.role === "admin") { const verified = document.createElement("span"); verified.className = "admin-verified"; verified.textContent = "✓"; chip.append(verified); }
  chip.append(document.createTextNode(`, ID ${acc.id} `));
}
// Ganti username: pertama gratis, berikutnya berbayar diamond (dipotong oleh pemanggil), admin tidak bisa. Kunci akun (users/<nama-kecil>) dipindah ke nama baru.
async function renameAccount(acc, name, paid = false) {
  if (acc.role === "admin") throw new Error("Nama admin tetap dan tidak bisa diubah.");
  if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) throw new Error("Username 3–16 karakter: huruf, angka, atau garis bawah.");
  const oldKey = acc.username.toLowerCase(), key = name.toLowerCase();
  if (key === ADMIN) throw new Error("Username itu tidak tersedia.");
  const old = await (await db("users/" + oldKey)).json();
  if (!old) throw new Error("Akun tidak ditemukan.");
  if (old.nameChanged && !paid) throw new Error("Ganti nama berikutnya butuh diamond.");
  const changes = (Number(old.nameChanges) || (old.nameChanged ? 1 : 0)) + 1;
  if (key === oldKey) await db("users/" + oldKey, { method: "PATCH", body: JSON.stringify({ name, nameChanged: true, nameChanges: changes }) });
  else {
    if ((await claim("users/" + key, { ...old, name, nameChanged: true, nameChanges: changes })).status === 412) throw new Error("Username sudah dipakai.");
    await db("ids/" + acc.id, { method: "PUT", body: JSON.stringify(key) });
    await db("users/" + oldKey, { method: "DELETE" });
  }
  acc.username = name; window.player = acc; localStorage.setItem(SKEY, JSON.stringify(acc));
}
// Foto profil: dipotong persegi 160px, disimpan sebagai data URL kecil di profiles/<id>.
async function resizePhoto(file) {
  const bmp = await createImageBitmap(file), S = 160, c = document.createElement("canvas"); c.width = c.height = S;
  const side = Math.min(bmp.width, bmp.height);
  c.getContext("2d").drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, S, S);
  bmp.close?.(); return c.toDataURL("image/jpeg", .82);
}
const safeUrl = u => typeof u === "string" && /^(data:image\/[a-z+]+;base64,[A-Za-z0-9+/=]+|https:\/\/[^\s"'()\\]+)$/.test(u) ? u : null;
function setMode(m) {
  mode = m; const reg = m === "register";
  A.title.textContent = reg ? "Daftar akun" : "Masuk"; A.go.textContent = reg ? "Daftar" : "Masuk";
  A.confWrap.hidden = !reg; A.pass.autocomplete = reg ? "new-password" : "current-password";
  A.ask.textContent = reg ? "Sudah punya akun?" : "Belum punya akun?"; A.swap.textContent = reg ? "Masuk" : "Daftar"; say("");
}
A.swap.onclick = () => setMode(mode === "login" ? "register" : "login");
A.form.onsubmit = async e => {
  e.preventDefault();
  if (account) return enter(account);
  const name = A.user.value.trim(), pw = A.pass.value;
  if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) return say("Username 3–16 karakter: huruf, angka, atau garis bawah.");
  if (pw.length < 6) return say("Password minimal 6 karakter.");
  if (mode === "register" && pw !== A.conf.value) return say("Password tidak sama.");
  A.go.disabled = true; say(""); A.go.textContent = mode === "register" ? "Membuat akun…" : "Memeriksa…";
  try {
    const acc = await (mode === "register" ? register : login)(name, pw);
    if (mode === "login") return enter(acc);
    account = acc; say("Akun dibuat. ID kamu: " + acc.id + ". Catat ID ini.", true);
    [A.user, A.pass, A.conf].forEach(i => i.disabled = true); A.swap.parentElement.hidden = true;
    A.go.textContent = "Mulai bermain"; A.go.disabled = false;
  } catch (err) {
    say(err.name === "TypeError" ? "Tidak bisa terhubung ke server." : err.message);
    A.go.textContent = mode === "register" ? "Daftar" : "Masuk"; A.go.disabled = false;
  }
};
async function logout() {
  try { await Promise.race([window.mp?.leave(), new Promise(r => setTimeout(r, 800))]); } catch (_) {}
  localStorage.removeItem(SKEY); location.reload();
}
async function enter(acc) {
  localStorage.setItem(SKEY, JSON.stringify(acc)); window.player = acc;
  paintChip(acc);
  A.go.disabled = true; A.go.textContent = "Membuka lobby…";
  try {
    if (FB) { try { window.mp = createMultiplayer(acc); } catch (e) { console.warn("Multiplayer tidak aktif:", e); } }
    const lobby = M.lobby.createLobby({
      account: acc,
      onPlay: async () => {                                      // game baru berjalan setelah tombol Main
        const mp = window.mp;
        if (mp && !mp.canStart()) { mp.notice("Hanya pemimpin party yang bisa memulai. Tunggu pemimpin menekan Main."); return false; }
        mp?.announceStart();                                     // pemimpin memulai -> anggota party ikut masuk
        await startGame(); lobby.leave();
      },
      onLogout: logout
    });
    window.mp?.onPartyStart(async () => { await startGame(); lobby.leave(); });
    hide();
  } catch (err) { fail(err); }
}
function afterLoad() {
  let acc = null; try { acc = JSON.parse(localStorage.getItem(SKEY)); } catch (_) {}
  if (acc?.id && acc?.username) { el.stage.textContent = "Halo, " + acc.username; return enter(acc); }
  document.querySelector(".ld-panel").hidden = true; A.form.hidden = false; A.user.focus();
}

/* =====================================================================
   4. MULTIPLAYER (presence, teman, party, chat global, misi, avatar 3D)
   ===================================================================== */
const FB_CFG = {
  apiKey: "AIzaSyAmkkLXWx3AyefFFAoZjUzJc6dTVV6Qv7k",
  authDomain: "survival3d-ecd3e.firebaseapp.com",
  databaseURL: DB,
  projectId: "survival3d-ecd3e",
  storageBucket: "survival3d-ecd3e.firebasestorage.app",
  messagingSenderId: "493895128908",
  appId: "1:493895128908:web:92c5da10e06bb3e0a0e1e9"
};
const STALE = 45000, MAX_AVATARS = 24;

const ICONS = {
  userplus: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M19 8v6M16 11h6"/>',
  mail: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3.5 7l8.5 6.5L20.5 7"/>',
  chat: '<path d="M4 5.5h16v10H10l-4 3.5v-3.5H4z"/>',
  flag: '<path d="M6 21V4"/><path d="M6 5h11l-2 4 2 4H6"/>',
  send: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  coin: '<circle cx="12" cy="12" r="8"/><path d="M12 8v8"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.7a3.3 3.3 0 0 1 0 6.6M18 14.4c2 .7 3.5 2.5 3.5 5.6"/>'
};
function ico(name, size = 18) {
  const w = document.createElement("span"); w.className = "ico";
  w.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
  return w;
}
const fmtNum = n => Number(n || 0).toLocaleString("id-ID");
const fmtClock = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/* Diamond: disimpan di playerData/<id>/diamonds. Nilai hadiah misi bisa diubah admin
   lewat Firebase di config/rewards (chop5, survive10, daily). */
const DEFAULT_REWARDS = { chop5: 5, survive10: 10, daily: 10 };
let diaShown = 0, diaRaf = 0;
function diamondSvg(size = 16) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><path d="M6 3h12l4 6-10 12L2 9z" fill="#4cc9f0"/><path d="M6 3h12l4 6H2z" fill="#a6ecfb"/><path d="M2 9h20M9 3 7 9l5 12 5-12-2-6" fill="none" stroke="#0e2a33" stroke-opacity=".4" stroke-width="1" stroke-linejoin="round"/></svg>`;
}
const diaIcon = size => { const w = document.createElement("span"); w.className = "ico"; w.innerHTML = diamondSvg(size); return w; };
function paintDia() { const v = $("diaVal"); if (v) v.textContent = fmtNum(Math.round(diaShown)); }
function bumpDia() { const c = $("diaChip"); if (!c) return; c.classList.remove("bump"); void c.offsetWidth; c.classList.add("bump"); }
function setDia(n, instant) {
  n = Math.max(0, Math.floor(Number(n) || 0)); cancelAnimationFrame(diaRaf);
  const from = diaShown;
  if (instant || reduce || Math.abs(n - from) < 2) { diaShown = n; paintDia(); return; }
  const t0 = performance.now(), dur = 600;
  const step = now => {
    const k = Math.min(1, (now - t0) / dur);
    diaShown = from + (n - from) * (1 - Math.pow(1 - k, 3)); paintDia();
    if (k < 1) diaRaf = requestAnimationFrame(step); else { diaShown = n; paintDia(); bumpDia(); }
  };
  diaRaf = requestAnimationFrame(step);
}
// Diamond terbang dari tombol Klaim ke chip di atas; angka naik saat tiap diamond mendarat.
function flyDiamonds(fromRect, amount) {
  return new Promise(resolve => {
    const chip = $("diaChip");
    if (!chip || reduce || !amount) return resolve();
    const b = chip.getBoundingClientRect();
    const sx = fromRect.left + fromRect.width / 2, sy = fromRect.top + fromRect.height / 2;
    const ex = b.left + 17, ey = b.top + b.height / 2;
    const n = Math.min(amount, 10), per = amount / n; let landed = 0;
    const at = (x, y, sc) => `translate(${x - 10}px,${y - 10}px) scale(${sc})`;
    for (let i = 0; i < n; i++) {
      const p = document.createElement("span"); p.className = "dia-fly"; p.innerHTML = diamondSvg(20); document.body.appendChild(p);
      const mx = sx + (Math.random() - .5) * 120, my = Math.min(sy, ey) - 30 - Math.random() * 60;
      const a = p.animate(
        [{ transform: at(sx, sy, .4), opacity: 0 }, { transform: at(mx, my, 1.15), opacity: 1, offset: .4 }, { transform: at(ex, ey, .7), opacity: 1 }],
        { duration: 750 + Math.random() * 200, delay: i * 80, easing: "cubic-bezier(.45,0,.3,1)", fill: "both" });
      a.onfinish = () => { p.remove(); landed++; diaShown += per; paintDia(); bumpDia(); if (landed === n) resolve(); };
    }
    setTimeout(resolve, 3000);
  });
}

/* Model karakter TUNGGAL: dipakai untuk pemain sendiri DAN avatar teman,
   jadi tampilannya identik di semua layar dan tidak berubah. */
const HERO_FOOT = .37;   // tinggi telapak sepatu dari origin model
function buildHero(T) {
  const mat = (c, r = .82) => new T.MeshStandardMaterial({ color: c, roughness: r });
  const skin = mat(0xf0c5a5), hair = mat(0x171923), jacket = mat(0x273b3d);
  const red = mat(0xb84e3f), pants = mat(0x303b43), boots = mat(0x211f21);
  const strap = mat(0x9b7650), dark = mat(0x20252b), white = mat(0xf4eee4);
  const glow = new T.MeshStandardMaterial({ color: 0xe7a35f, emissive: 0x8c3c0c, emissiveIntensity: .45 });
  const body = new T.Group(); body.position.y = -HERO_FOOT;
  const add = (geo, material, parent, x, y, z, sx = 1, sy = 1, sz = 1) => {
    const o = new T.Mesh(geo, material); o.position.set(x, y, z); o.scale.set(sx, sy, sz);
    o.castShadow = true; o.receiveShadow = true; parent.add(o); return o;
  };
  const capsule = (parent, r, len, material, x, y, z) => add(new T.CapsuleGeometry(r, len, 5, 8), material, parent, x, y, z);

  const leftLeg = new T.Group(), rightLeg = new T.Group();
  leftLeg.position.set(-.19, 1.05, 0); rightLeg.position.set(.19, 1.05, 0);
  body.add(leftLeg, rightLeg);
  for (const leg of [leftLeg, rightLeg]) {
    capsule(leg, .115, .48, pants, 0, -.32, 0);
    add(new T.BoxGeometry(.25, .14, .43), boots, leg, 0, -.62, .07);
  }
  const torso = new T.Group(); torso.position.y = 1.25; body.add(torso);
  add(new T.CapsuleGeometry(.34, .48, 6, 10), jacket, torso, 0, .18, 0, 1, .9, .72);
  add(new T.BoxGeometry(.48, .52, .08), red, torso, 0, .19, .265);
  add(new T.BoxGeometry(.13, .68, .13), strap, torso, -.24, .2, .22);
  add(new T.BoxGeometry(.22, .22, .18), strap, torso, .28, .03, .12);
  add(new T.BoxGeometry(.42, .5, .24), mat(0x4b4034), torso, 0, .15, -.27);
  add(new T.BoxGeometry(.18, .12, .08), glow, torso, .02, .28, .38);

  const leftArm = new T.Group(), rightArm = new T.Group();
  leftArm.position.set(-.39, .42, 0); rightArm.position.set(.39, .42, 0);
  torso.add(leftArm, rightArm);
  for (const arm of [leftArm, rightArm]) {
    capsule(arm, .105, .42, jacket, 0, -.25, 0);
    add(new T.SphereGeometry(.105, 10, 8), skin, arm, 0, -.51, .015);
    add(new T.BoxGeometry(.23, .12, .19), red, arm, 0, -.43, .02);
  }
  add(new T.CylinderGeometry(.105, .12, .18, 10), skin, body, 0, 1.92, 0);
  const head = new T.Group(); head.position.set(0, 2.22, 0); body.add(head);
  add(new T.SphereGeometry(.32, 20, 16), skin, head, 0, 0, 0, .88, 1.08, .82);
  add(new T.SphereGeometry(.33, 16, 12, 0, Math.PI * 2, 0, Math.PI * .62), hair, head, 0, .13, -.025, 1.02, .88, 1);
  for (let i = 0; i < 7; i++) {
    const a = -1.05 + i * .35;
    const spike = add(new T.ConeGeometry(.105, .34, 6), hair, head, Math.sin(a) * .23, .26, Math.cos(a) * .17);
    spike.rotation.x = -.35; spike.rotation.z = -Math.sin(a) * .55;
  }
  for (let i = 0; i < 3; i++) {
    const bang = add(new T.ConeGeometry(.10, .28, 6), hair, head, -.17 + i * .17, .05, .255);
    bang.rotation.x = Math.PI; bang.rotation.z = (i - 1) * -.22;
  }
  for (const x of [-.115, .115]) {
    add(new T.SphereGeometry(.045, 10, 8), white, head, x, -.005, .267, 1, .72, .45);
    add(new T.SphereGeometry(.025, 10, 8), dark, head, x, -.008, .292);
    const brow = add(new T.BoxGeometry(.095, .025, .025), hair, head, x, .075, .27);
    brow.rotation.z = x < 0 ? .12 : -.12;
  }
  add(new T.SphereGeometry(.055, 8, 8), skin, head, -.28, -.02, 0, .7, 1, 1);
  add(new T.SphereGeometry(.055, 8, 8), skin, head, .28, -.02, 0, .7, 1, 1);
  add(new T.BoxGeometry(.48, .12, .38), red, body, 0, 1.91, -.02);
  const scarfTail = add(new T.BoxGeometry(.12, .42, .08), red, body, .29, 1.75, -.12);
  scarfTail.rotation.z = -.35;
  return { body, head, torso, leftLeg, rightLeg, leftArm, rightArm, scarfTail };
}

function createMultiplayer(me) {
  const { initializeApp, getDatabase, ref, set, get, remove, push, dbUpdate, onValue, onDisconnect, serverTimestamp, runTransaction } = FB;
  const db = getDatabase(initializeApp(FB_CFG, "mp")), meRef = ref(db, "online/" + me.id);
  const blankData = () => ({ diamonds: 0, chopCount: 0, survivalSeconds: 0, streak: 0, missions: {} });
  let survivalFlush = 0, survivalBuffer = 0, localBubbleCanvas = null, localBubbleTexture = null, localBubbleSprite = null;
  let others = {}, friends = {}, offset = 0, inGame = 0, G = null, last = { x: 0, y: 0, z: 0, r: 0 }, lastSend = 0, myParty = me.id, pend = [], H = {}, lastToggle = 0;
  let chatItems = [], chatReady = false, profileData = blankData(), typingTimer = 0, lastTyping = "", startFired = false, partyJoinedAt = 0;
  const alive = o => o && Date.now() + offset - (o.t || 0) < STALE;
  const beat = (extra = {}) => dbUpdate(meRef, { n: me.username, a: me.role === "admin", g: inGame, p: myParty, t: serverTimestamp(), ...extra }).catch(() => {});
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const gameEl = $("game");

  // ---------- Presence ----------
  onValue(ref(db, ".info/serverTimeOffset"), s => { offset = s.val() || 0; });
  onValue(ref(db, ".info/connected"), s => {
    if (!s.val()) return;
    onDisconnect(meRef).remove();
    set(meRef, { n: me.username, a: me.role === "admin", g: inGame, p: myParty, x: 0, y: 0, z: 0, r: 0, t: serverTimestamp() }).catch(() => {});
  });
  setInterval(() => beat(), 8000);
  onValue(ref(db, "online"), s => { others = s.val() || {}; delete others[me.id]; render(); checkStart(); });
  // Daftar teman disimpan di server DAN di perangkat; sekali ditambah, tidak hilang sampai kamu menekan Hapus.
  const FKEY = "mp_friends_" + me.id;
  const loadFr = () => { try { const o = JSON.parse(localStorage.getItem(FKEY)); return o && typeof o === "object" ? o : {}; } catch { return {}; } };
  const saveFr = () => { try { localStorage.setItem(FKEY, JSON.stringify(friends)); } catch { /* abaikan */ } };
  friends = loadFr();                                        // langsung tampil, walau koneksi lambat
  let friendsSynced = false;
  onValue(ref(db, "friends/" + me.id), s => {
    const v = s.val() || {};
    if (!friendsSynced) {
      friendsSynced = true;
      for (const [id, n] of Object.entries(friends)) if (!v[id]) { v[id] = n; set(ref(db, `friends/${me.id}/${id}`), n).catch(() => {}); }   // pulihkan teman yang hilang dari server
      friends = v; saveFr(); render(); syncFriends(); return;
    }
    friends = v; saveFr(); render();
  }, () => { friends = loadFr(); render(); });

  // ---------- Data pemain: koin & misi ----------
  const dataRef = ref(db, "playerData/" + me.id);
  let diaHold = false, diaLoaded = false, claiming = false;
  const rewards = { ...DEFAULT_REWARDS };
  onValue(dataRef, s => {
    profileData = { ...blankData(), ...(s.val() || {}) };
    if (!diaHold) setDia(profileData.diamonds, !diaLoaded);   // admin mengubah nilai di Firebase -> angka ikut berubah
    diaLoaded = true; drawMissions(); paintMine();
  });
  onValue(ref(db, "config/rewards"), s => {
    const v = s.val() || {};
    for (const k of Object.keys(DEFAULT_REWARDS)) { const n = Number(v[k]); rewards[k] = Number.isFinite(n) && n >= 0 ? Math.floor(n) : DEFAULT_REWARDS[k]; }
    drawMissions();
  });
  // Admin: buat node config/rewards otomatis supaya mudah diedit dari konsol Firebase.
  if (me.role === "admin") get(ref(db, "config/rewards")).then(s => { if (!s.exists()) set(ref(db, "config/rewards"), DEFAULT_REWARDS); }).catch(() => {});
  async function mutateData(fn) {
    const result = await runTransaction(dataRef, current => { const d = current || blankData(); fn(d); return d; });
    if (result.committed) profileData = { ...profileData, ...(result.snapshot.val() || {}) };
    drawMissions(); return result.committed;
  }
  const day = ms => new Date(ms).toISOString().slice(0, 10);
  // Login harian: hanya menghitung streak (maks 5 hari); hadiahnya diklaim manual di panel Misi.
  mutateData(d => {
    const today = day(Date.now()), yesterday = day(Date.now() - 86400000);
    if (d.lastLogin === today) return;
    d.streak = d.lastLogin === yesterday ? Math.min(5, (d.streak || 0) + 1) : 1;
    d.lastLogin = today;
  }).catch(() => {});

  onValue(ref(db, "invites/" + me.id), s => {
    pend = Object.entries(s.val() || {}).filter(([, i]) => i && Date.now() + offset - (i.t || 0) < 300000).map(([id, i]) => ({ id, n: String(i.n || id).slice(0, 16) }));
    render(); H.pending?.(pend); toast();
  });
  setInterval(() => render(), 10000);

  // ---------- Panel "Pemain" (teman / party) ----------
  const root = h("div", "game"); root.id = "mp";   // tersembunyi sampai lobby aktif
  const btn = h("button", "mp-btn"); btn.append("Pemain ", h("b", "", "0"));
  const form = h("form", "mp-add"), input = h("input"), addBtn = h("button", "", "Tambah");
  addBtn.type = "submit"; addBtn.textContent = "Kirim"; input.placeholder = "Cari username atau ID"; input.inputMode = "text"; input.maxLength = 24; input.autocomplete = "off"; input.setAttribute("aria-label", "Username atau ID teman");
  form.append(input, addBtn);
  const search = h("input", "mp-search"); search.placeholder = "Cari pemain online…"; search.oninput = render;
  const msg = h("p", "mp-msg"), list = h("div");
  msg.setAttribute("role", "status");
  // Popup "Pemain" lama diganti panel "Teman" di dock kiri (sama seperti Chat & Misi). #mp tinggal jangkar tersembunyi.
  root.append(btn); root.style.display = "none"; gameEl.appendChild(root);
  // Tiga panel terpisah: Teman Saya (daftar), Tambah Teman (cari & kirim permintaan), Permintaan Teman (terima / tolak)
  const fpanel = panel("mpFriends", "Teman Saya"), fWrap = h("div", "mpf"), fmsg = h("p", "mp-msg"); fmsg.setAttribute("role", "status");
  fWrap.append(fmsg, list); fpanel.body.append(fWrap);
  const apanel = panel("mpAdd", "Tambah Teman"), aWrap = h("div", "mpf"), aList = h("div"); aWrap.append(form, msg, search, aList); apanel.body.append(aWrap);
  const rpanel = panel("mpReq", "Permintaan Teman"), rWrap = h("div", "mpf"), rList = h("div"); rWrap.append(rList); rpanel.body.append(rWrap);
  const sayMsg = (t, ok) => { for (const e of [msg, fmsg]) { e.textContent = t; e.className = "mp-msg" + (ok ? " ok" : ""); } };

  // ---------- Permintaan teman: kirim -> penerima menekan Terima / Tolak ----------
  let reqs = [];
  onValue(ref(db, "friendReq/" + me.id), s => {
    reqs = Object.entries(s.val() || {}).filter(([id, r]) => r && !friends[id]).map(([id, r]) => ({ id, n: String(r.n || id).slice(0, 16) }));
    render();
  }, () => {});
  async function acceptReq(id, n) {
    try {
      const name = n || others[id]?.n || id;
      friends[id] = name; saveFr();
      await set(ref(db, `friends/${me.id}/${id}`), name);
      try { await set(ref(db, `friends/${id}/${me.id}`), me.username); } catch (_) { /* disinkron saat dia login */ }
      await remove(ref(db, `friendReq/${me.id}/${id}`)).catch(() => {});
      render(); return { ok: true, m: name + " sekarang temanmu." };
    } catch (e) { return { ok: false, m: "Gagal menerima. Periksa Rules database." }; }
  }
  async function declineReq(id) { await remove(ref(db, `friendReq/${me.id}/${id}`)).catch(() => {}); return { ok: true, m: "Permintaan ditolak." }; }

  async function addFriend(query) {
    const q = String(query).trim(); if (!q) return sayMsg("Masukkan username atau ID.");
    try {
      let id = /^\d{8}$/.test(q) ? q : Object.entries(others).find(([, o]) => alive(o) && String(o.n || "").toLowerCase() === q.toLowerCase())?.[0];
      if (!id && !/^\d{8}$/.test(q)) id = (await get(ref(db, "users/" + q.toLowerCase()))).val()?.id;
      if (!id) return sayMsg("Player tidak ditemukan.");
      if (id === me.id) return sayMsg("Itu ID kamu sendiri.");
      if (friends[id]) return sayMsg("Sudah ada di daftar teman.");
      const key = (await get(ref(db, "ids/" + id))).val(); if (!key) return sayMsg("ID tidak ditemukan.");
      const name = (await get(ref(db, "users/" + key))).val()?.name || others[id]?.n || key;
      const incoming = reqs.find(r => r.id === id);            // dia sudah minta duluan -> langsung berteman
      if (incoming) { const r = await acceptReq(id, incoming.n); sayMsg(r.m, r.ok); input.value = ""; return; }
      if ((await get(ref(db, `friendReq/${id}/${me.id}`))).exists()) return sayMsg("Permintaan sudah terkirim, tunggu " + name + " menerima.");
      await set(ref(db, `friendReq/${id}/${me.id}`), { n: me.username, t: serverTimestamp() });
      sayMsg("Permintaan teman dikirim ke " + name + ".", true); input.value = "";
    } catch (e) { sayMsg("Gagal terhubung. Periksa Rules database."); }
  }
  // Pertemanan dua arah: hapus juga menghapus di sisi teman; akun lama yang baru satu arah dilengkapi saat login.
  async function removeFriend(id) {
    delete friends[id]; saveFr();
    await remove(ref(db, `friends/${me.id}/${id}`)).catch(() => {});
    await remove(ref(db, `friends/${id}/${me.id}`)).catch(() => {});
  }
  async function syncFriends() {
    for (const fid of Object.keys(friends)) {
      try { const r = ref(db, `friends/${fid}/${me.id}`); if (!(await get(r)).exists()) await set(r, me.username); } catch (_) {}
    }
  }
  form.onsubmit = e => { e.preventDefault(); addFriend(input.value.trim()); };

  // ---------- Party & undangan ----------
  const isLeader = () => myParty === me.id;   // pemimpin = yang mengundang (id party = id pemimpin)
  // Anggota boleh mulai sendiri hanya bila pemimpin sudah offline atau sudah di dalam game.
  const canStart = () => { if (isLeader()) return true; const l = others[myParty]; return !alive(l) || !!l.g; };
  function checkStart() {   // pemimpin menekan Main -> anggota ikut masuk game otomatis
    if (isLeader() || playing || startFired) return;
    const l = others[myParty];
    if (alive(l) && l.p === myParty && l.go && l.go > partyJoinedAt) { startFired = true; H.partyStart?.(); }
  }
  const inParty = () => Object.entries(others).filter(([, o]) => alive(o) && o.p === myParty);
  const fOnline = () => Object.keys(friends).filter(id => alive(others[id])).length;
  async function invite(id) {
    if (inParty().length + 1 >= 4) return { ok: false, m: "Party penuh (maksimal 4 pemain)." };
    try { await set(ref(db, `invites/${id}/${me.id}`), { n: me.username, t: serverTimestamp() }); return { ok: true, m: "Undangan terkirim." }; }
    catch (e) { return { ok: false, m: "Gagal mengirim undangan. Periksa Rules database." }; }
  }
  async function accept(from) {
    const host = others[from], party = host && alive(host) ? (host.p || from) : from;
    if (Object.values(others).filter(o => alive(o) && o.p === party).length >= 4) { await decline(from); return { ok: false, m: "Party sudah penuh." }; }
    myParty = party; partyJoinedAt = Date.now() + offset; startFired = false; await beat(); await remove(ref(db, `invites/${me.id}/${from}`)).catch(() => {}); render();
    return { ok: true, m: "Kamu bergabung ke party " + (host?.n || "temanmu") + "." };
  }
  async function decline(from) { await remove(ref(db, `invites/${me.id}/${from}`)).catch(() => {}); return { ok: true, m: "Undangan ditolak." }; }
  async function leaveParty() { myParty = me.id; startFired = false; await beat(); render(); }

  const toastEl = h("div"); toastEl.id = "mpToast"; toastEl.hidden = true; gameEl.appendChild(toastEl);
  function toast() {   // undangan saat lobby 3D tidak aktif (mis. di dalam game)
    const i = pend[0]; toastEl.hidden = !i || !!H.pending; if (!i || H.pending) return;
    const ok = h("button", "", "Terima"), no = h("button", "x", "Tolak");
    ok.onclick = async () => sayMsg((await accept(i.id)).m, true); no.onclick = async () => sayMsg((await decline(i.id)).m, true);
    toastEl.replaceChildren(h("span", "", i.n + " mengundangmu main"), ok, no);
  }

  // ---------- Dock kiri + panel Chat / Misi / Profil ----------
  function panel(id, title) {
    const p = h("section", "mp-panel"); p.id = id; p.hidden = true; p.setAttribute("aria-label", title);
    const head = h("div", "mp-ph"), t = h("h3", "", title), x = h("button", "mp-x"); x.type = "button"; x.setAttribute("aria-label", "Tutup"); x.append(ico("close", 16));
    head.append(t, x);
    const body = h("div", "mp-pb"); p.append(head, body); gameEl.appendChild(p);
    return { el: p, head, body, title: t, x };
  }
  const dock = h("div"); dock.id = "mpDock";
  const chatBtn = h("button"), missionBtn = h("button"), friendBtn = h("button"), addDockBtn = h("button"), reqBtn = h("button");
  chatBtn.type = missionBtn.type = friendBtn.type = addDockBtn.type = reqBtn.type = "button";
  addDockBtn.setAttribute("aria-pressed", "false"); reqBtn.setAttribute("aria-pressed", "false");
  const reqDot = h("i", "dot"), reqCnt = h("span", "cnt", "0"); reqDot.hidden = true;
  chatBtn.setAttribute("aria-pressed", "false"); missionBtn.setAttribute("aria-pressed", "false"); friendBtn.setAttribute("aria-pressed", "false");
  const chatDot = h("i", "dot"); chatDot.hidden = true;
  const friendDot = h("i", "dot"), friendCnt = h("span", "cnt", "0"); friendDot.hidden = true;
  chatBtn.append(ico("chat", 17), "Chat", chatDot);
  missionBtn.append(ico("flag", 17), "Misi");
  friendBtn.append(ico("users", 17), "Teman", friendCnt, friendDot);
  addDockBtn.append(ico("userplus", 17), "Tambah");
  reqBtn.append(ico("mail", 17), "Permintaan", reqCnt, reqDot);
  dock.append(chatBtn, missionBtn, friendBtn, addDockBtn, reqBtn); gameEl.appendChild(dock);

  const chat = panel("mpChat", "Chat global"), missions = panel("mpMissions", "Misi"), profile = panel("mpProfile", "Profil");
  const chatCount = h("small"); chat.x.before(chatCount);
  const chatLog = h("div", "gc-log"); chatLog.setAttribute("role", "log"); chatLog.setAttribute("aria-live", "polite");
  const chatForm = h("form", "gc-form"), chatInput = h("input"), chatSend = h("button");
  chatInput.placeholder = "Tulis pesan, Enter untuk kirim"; chatInput.maxLength = 180; chatInput.autocomplete = "off"; chatInput.setAttribute("aria-label", "Pesan chat");
  chatSend.type = "submit"; chatSend.setAttribute("aria-label", "Kirim"); chatSend.append(ico("send", 16));
  chatForm.append(chatInput, chatSend);
  const chatNote = h("p", "gc-note"); chatNote.setAttribute("role", "status");
  chat.body.append(chatLog, chatForm, chatNote);

  function statBox(label, text, cls) {
    const box = h("div", "pm-stat" + (cls ? " " + cls : "")), v = h("b"); if (cls === "dia") v.append(diaIcon(15));
    v.append(String(text)); box.append(v, h("small", "", label)); return box;
  }
  // Profil saya: foto (klik untuk ganti), diamond di samping foto, ganti nama 1 kali (admin tetap)
  const mine = panel("mpMine", "Profil saya");
  let myPhoto = null, armedName = "";
  const BADGE_DEV = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#1d9bf0"/><path d="M7 12.5l3.2 3.2L17 8.8" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  // admin = ceklis biru (Developer) di foto profil; dia = logo diamond di dekat foto
  const paintAv = (el, url, name, admin = false, dia = false) => {
    el.style.backgroundImage = url ? `url("${url}")` : ""; el.textContent = url ? "" : String(name || "?").charAt(0).toUpperCase();
    if (dia) { const d = h("span", "av-badge dia"); d.innerHTML = diamondSvg("100%"); el.append(d); }
    if (admin) { const b = h("span", "av-badge dev"); b.innerHTML = BADGE_DEV; b.title = "Developer"; el.append(b); }
  };
  const avBtn = h("button", "pf-av"); avBtn.type = "button"; avBtn.setAttribute("aria-label", "Profil saya");
  const hudR = document.querySelector(".hud-r"); if (hudR) hudR.insertBefore(avBtn, $("diaChip") || hudR.firstChild);
  const fileIn = h("input"); fileIn.type = "file"; fileIn.accept = "image/*"; fileIn.hidden = true;
  const mAv = h("button", "pm-av"); mAv.type = "button"; mAv.setAttribute("aria-label", "Ganti foto profil");
  const mName = h("b", "pm-name"), mId = h("small", "", "ID " + me.id), mDia = h("span", "pm-dia"), mDiaVal = h("b", "", "0");
  const mCopy = h("button", "pm-copy", "Salin"); mCopy.type = "button";
  const mIdRow = h("div", "pm-idrow"); mIdRow.append(mId, mCopy);
  const mRole = h("span", "pm-role", me.role === "admin" ? "DEVELOPER" : "PLAYER");
  mDia.append(diaIcon(18), mDiaVal);
  const mInfo = h("div", "pm-info"); mInfo.append(mName, mIdRow, mRole, mDia);
  const mTop = h("div", "pm-top"), mStats = h("div", "pm-stats"); mTop.append(mAv, mInfo);
  const mPhotoBtn = h("button", "pm-btn", "Ganti foto"); mPhotoBtn.type = "button";
  const mNameBox = h("div", "pm-namebox"), mMsg = h("p", "pm-msg"); mMsg.setAttribute("role", "status");
  mine.body.append(mTop, mStats, mPhotoBtn, fileIn, mNameBox, mMsg);
  const mSay = (t, ok) => { mMsg.textContent = t; mMsg.className = "pm-msg" + (ok ? " ok" : ""); };
  function paintMine() {
    mName.textContent = me.username + (me.role === "admin" ? " ✓" : "");
    mDiaVal.textContent = fmtNum(profileData.diamonds);
    const done = Object.values(profileData.missions || {}).filter(Boolean).length;
    mStats.replaceChildren(
      statBox("Login streak", `${Math.min(5, profileData.streak || 0)} / 5 hari`),
      statBox("Misi selesai", `${done} / 2`),
      statBox("Pohon ditebang", fmtNum(profileData.chopCount)),
      statBox("Bertahan", fmtClock(Math.min(600, Math.floor(profileData.survivalSeconds || 0)))));
    const isAdm = me.role === "admin"; paintAv(mAv, myPhoto, me.username, isAdm, true); paintAv(avBtn, myPhoto, me.username, isAdm, true);
  }
  mCopy.onclick = async () => { try { await navigator.clipboard.writeText(me.id); mSay("ID disalin.", true); } catch (_) { mSay("ID kamu: " + me.id, true); } };
  // Ganti nama: pertama GRATIS, berikutnya RENAME_COST diamond. Kunci akun & ID tetap, hanya nama tampilan yang berubah.
  const RENAME_COST = 50;
  let nameChanges = 0;
  async function spendDiamonds(cost) {
    let ok = false;
    const r = await runTransaction(dataRef, cur => { const d = cur || blankData(); if ((d.diamonds || 0) < cost) return; d.diamonds -= cost; ok = true; return d; });
    if (r.committed && ok) { profileData = { ...profileData, ...(r.snapshot.val() || {}) }; setDia(profileData.diamonds); paintMine(); }
    return r.committed && ok;
  }
  const refundDiamonds = cost => mutateData(d => { d.diamonds = (d.diamonds || 0) + cost; }).then(() => { setDia(profileData.diamonds); paintMine(); }).catch(() => {});
  async function propagateName(newName) {   // nama baru ikut tampil di daftar teman milik temanmu
    for (const fid of Object.keys(friends)) {
      try { const r = ref(db, `friends/${fid}/${me.id}`); if ((await get(r)).exists()) await set(r, newName); } catch (_) {}
    }
  }
  function renderNameBox() {
    mNameBox.replaceChildren(); armedName = "";
    if (me.role === "admin") { mNameBox.append(h("p", "pm-note", "Nama admin tetap dan tidak bisa diubah.")); return; }
    const cost = nameChanges === 0 ? 0 : RENAME_COST;
    const f = h("form"), i = h("input"), b = h("button", "", "Simpan");
    i.value = me.username; i.maxLength = 16; i.autocomplete = "off"; i.setAttribute("aria-label", "Username baru"); b.type = "submit";
    i.oninput = () => { armedName = ""; b.textContent = "Simpan"; };
    f.append(i, b);
    f.onsubmit = async e => {
      e.preventDefault(); const nn = i.value.trim();
      if (nn === me.username) return mSay("Nama belum berubah.");
      if (armedName !== nn) { armedName = nn; b.textContent = "Yakin?"; return mSay(cost ? `Biaya ${fmtNum(cost)} diamond. Tekan lagi untuk konfirmasi.` : "Ganti nama pertama gratis. Tekan lagi untuk konfirmasi."); }
      b.disabled = true; mSay("");
      let spent = false;
      try {
        if (cost) {
          if (!(await spendDiamonds(cost))) throw new Error(`Diamond tidak cukup (butuh ${fmtNum(cost)}).`);
          spent = true;
        }
        try { await renameAccount(me, nn, cost > 0); }
        catch (err) { if (spent) { await refundDiamonds(cost); spent = false; } throw err; }   // gagal -> diamond dikembalikan
        nameChanges++; paintChip(me); paintMine(); beat(); propagateName(nn);
        mSay(`Nama diubah menjadi ${nn}` + (cost ? ` (-${fmtNum(cost)} diamond).` : " (gratis)."), true); renderNameBox();
      } catch (err) { armedName = ""; b.textContent = "Simpan"; b.disabled = false; mSay(err.name === "TypeError" ? "Tidak bisa terhubung ke server." : err.message); }
    };
    const note = h("p", "pm-note");
    if (cost) note.append("Ganti nama berikutnya: ", diaIcon(13), ` ${fmtNum(cost)} diamond`); else note.append("Ganti nama pertama GRATIS.");
    mNameBox.append(note, f);
  }
  function openMine() {
    mSay(""); paintMine();
    get(ref(db, "users/" + me.username.toLowerCase())).then(s => { const u = s.val() || {}; nameChanges = Number(u.nameChanges) || (u.nameChanged ? 1 : 0); renderNameBox(); }).catch(() => renderNameBox());
  }
  const pickPhoto = () => fileIn.click();
  mAv.onclick = mPhotoBtn.onclick = pickPhoto;
  fileIn.onchange = async () => {
    const f = fileIn.files[0]; fileIn.value = ""; if (!f) return;
    if (!f.type.startsWith("image/")) return mSay("File harus berupa gambar.");
    try { const url = await resizePhoto(f); await set(ref(db, "profiles/" + me.id), url); myPhoto = url; paintMine(); mSay("Foto profil diperbarui.", true); }
    catch (_) { mSay("Foto gagal diunggah. Coba gambar lain."); }
  };
  avBtn.onclick = e => { e.stopPropagation(); setPanel("mine"); };
  mine.x.onclick = () => { if (active === "mine") setPanel("mine"); };
  get(ref(db, "profiles/" + me.id)).then(s => { myPhoto = safeUrl(s.val()); paintMine(); }).catch(() => {});
  paintMine();

  let active = null, unread = 0, playing = false;

  // Pesan singkat (mis. "hanya pemimpin yang bisa memulai")
  const noteEl = h("div"); noteEl.id = "mpNote"; noteEl.hidden = true; noteEl.setAttribute("role", "status"); gameEl.appendChild(noteEl);
  let noteT = 0;
  function notice(t) { noteEl.textContent = t; noteEl.hidden = false; clearTimeout(noteT); noteT = setTimeout(() => { noteEl.hidden = true; }, 3500); }

  function partyMembers() {
    const mem = inParty().map(([id, o]) => ({ id, name: String(o.n || "?"), admin: !!o.a }));
    if (!mem.length) return [];
    return [{ id: me.id, name: me.username, admin: me.role === "admin" }, ...mem].sort((x, y) => (y.id === myParty) - (x.id === myParty));
  }
  function setPanel(name) {
    active = active === name ? null : name;
    chat.el.hidden = active !== "chat"; missions.el.hidden = active !== "missions"; mine.el.hidden = active !== "mine"; fpanel.el.hidden = active !== "friends"; apanel.el.hidden = active !== "add"; rpanel.el.hidden = active !== "requests"; profile.el.hidden = true;
    chatBtn.setAttribute("aria-pressed", String(active === "chat")); missionBtn.setAttribute("aria-pressed", String(active === "missions")); friendBtn.setAttribute("aria-pressed", String(active === "friends")); addDockBtn.setAttribute("aria-pressed", String(active === "add")); reqBtn.setAttribute("aria-pressed", String(active === "requests"));
    if (active === "chat") { unread = 0; chatDot.hidden = true; drawChat(); chatInput.focus(); }
    else if (active === "missions") drawMissions();
    else if (active === "mine") openMine();
    else if (active === "friends" || active === "requests") render();
    else if (active === "add") { render(); if (!matchMedia("(pointer:coarse)").matches) input.focus(); }
    else if (document.activeElement === chatInput) chatInput.blur();
  }
  chatBtn.onclick = () => setPanel("chat");
  missionBtn.onclick = () => setPanel("missions");
  friendBtn.onclick = () => setPanel("friends");
  addDockBtn.onclick = () => setPanel("add");
  reqBtn.onclick = () => setPanel("requests");
  apanel.x.onclick = () => { if (active === "add") setPanel("add"); };
  rpanel.x.onclick = () => { if (active === "requests") setPanel("requests"); };
  fpanel.x.onclick = () => { if (active === "friends") setPanel("friends"); };
  chat.x.onclick = () => { if (active === "chat") setPanel("chat"); };
  missions.x.onclick = () => { if (active === "missions") setPanel("missions"); };
  profile.x.onclick = () => { profile.el.hidden = true; };
  addEventListener("keydown", e => {
    const tag = e.target.tagName;
    if (e.key === "Escape") { if (!profile.el.hidden) profile.el.hidden = true; else if (active) setPanel(active); }
    else if (e.key === "Enter" && !playing && !/INPUT|TEXTAREA|BUTTON/.test(tag) && active !== "chat") setPanel("chat");
  });

  // Misi: hadiah diamond harus diklaim manual
  function claimRow(kind, text, claimed, ready, claimedText = "Sudah diklaim") {
    const row = h("div", "ms-bot");
    row.append(h("div", "ms-p", claimed ? claimedText : text));
    if (ready) {
      const b = h("button", "ms-claim"); b.type = "button"; b.append(diaIcon(13), "Klaim"); b.onclick = () => claimReward(kind, b);
      row.append(b);
    }
    return row;
  }
  function missionRow(kind, title, cur, max, claimed, progressText) {
    const ready = !claimed && cur >= max;
    const r = h("div", "ms" + (claimed ? " done" : ready ? " ready" : "")), top = h("div", "ms-top"), t = h("span", "ms-t");
    if (claimed) t.append(ico("check", 14)); t.append(title);
    const rw = h("span", "ms-r"); rw.append(diaIcon(13), "+" + fmtNum(rewards[kind])); top.append(t, rw);
    const bar = h("div", "ms-bar"), fill = h("i"); fill.style.width = Math.min(100, cur / max * 100) + "%"; bar.append(fill);
    r.append(top, bar, claimRow(kind, progressText, claimed, ready)); return r;
  }
  function drawMissions() {
    const m = profileData.missions || {}, streak = Math.min(5, profileData.streak || 0);
    const chop = Math.min(5, profileData.chopCount || 0), sv = Math.min(600, Math.floor(profileData.survivalSeconds || 0));
    const claimedToday = profileData.lastDailyClaim === day(Date.now());
    missions.body.replaceChildren(
      missionRow("chop5", "Tebang 5 pohon", chop, 5, !!m.chop5, `${chop} / 5 pohon`),
      missionRow("survive10", "Bertahan 10 menit", sv, 600, !!m.survive10, `${fmtClock(sv)} / 10:00`)
    );
    const dailyReady = !claimedToday && streak >= 1;
    const daily = h("div", "ms" + (claimedToday ? " done" : dailyReady ? " ready" : "")), top = h("div", "ms-top"), pips = h("div", "ms-pips");
    const dt = h("span", "ms-t"); if (claimedToday) dt.append(ico("check", 14)); dt.append("Login harian");
    const dr = h("span", "ms-r"); dr.append(diaIcon(13), "+" + fmtNum(rewards.daily)); top.append(dt, dr);
    for (let i = 0; i < 5; i++) pips.append(h("i", i < streak ? "on" : ""));
    daily.append(top, pips, claimRow("daily", `Hari ke-${streak} dari 5`, claimedToday, dailyReady, "Sudah diklaim hari ini"));
    missions.body.append(daily, h("p", "ms-foot", "Hadiah tidak masuk otomatis: tekan Klaim setelah misi selesai. Diamond tersimpan di akunmu."));
  }
  async function claimReward(kind, btn) {
    if (claiming) return;
    claiming = true; diaHold = true; btn.disabled = true;
    const from = btn.getBoundingClientRect(), today = day(Date.now());
    let ok = false, amount = 0;
    try {
      await mutateData(d => {
        ok = false; d.missions ||= {};
        if (kind === "chop5") { if (d.missions.chop5 || (d.chopCount || 0) < 5) return; d.missions.chop5 = true; }
        else if (kind === "survive10") { if (d.missions.survive10 || (d.survivalSeconds || 0) < 600) return; d.missions.survive10 = true; }
        else if (kind === "daily") { if (d.lastDailyClaim === today || !d.streak) return; d.lastDailyClaim = today; }
        else return;
        amount = Math.max(0, Math.floor(Number(rewards[kind]) || 0));
        d.diamonds = (d.diamonds || 0) + amount; ok = true;
      });
    } catch (_) { ok = false; }
    if (ok && amount > 0) await flyDiamonds(from, amount);
    diaHold = false; claiming = false;
    setDia(profileData.diamonds, true); drawMissions();
  }
  drawMissions();

  // Chat global
  const badWords = ["anjing", "bangsat", "kontol", "memek", "ngentot", "tolol", "goblok", "babi", "fuck", "shit", "bitch", "asshole"];
  const cleanMessage = value => {
    const text = String(value || "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, 180);
    const normalized = text.toLowerCase().normalize("NFKD").replace(/[0-9@!$*._-]/g, "");
    return text && !badWords.some(w => normalized.includes(w)) ? text : null;
  };
  const hhmm = ms => ms ? new Date(ms).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }).replace(".", ":") : "";
  function drawChat() {
    chatLog.replaceChildren();
    chatCount.textContent = Object.values(others).filter(alive).length + 1 + " online";
    if (!chatItems.length) { chatLog.append(h("p", "gc-empty", "Belum ada pesan.")); return; }
    for (const item of chatItems.slice(-30)) {
      const line = h("p", "gc-line"), who = h("b", item.name === me.username ? "me" : item.admin ? "adm" : "", item.name);
      if (item.admin) { const v = ico("check", 12); v.className = "ico gc-vf"; who.append(v); }
      const text = h("span", "", item.text), time = h("time", "", hhmm(item.t));
      line.append(who, time, text); chatLog.append(line);
    }
    chatLog.scrollTop = chatLog.scrollHeight;
  }
  onValue(ref(db, "globalChat"), snap => {
    const prev = chatItems.length ? chatItems[chatItems.length - 1].t : 0;
    chatItems = Object.values(snap.val() || {}).filter(v => v && typeof v.text === "string").sort((a, b) => (a.t || 0) - (b.t || 0)).slice(-30);
    const fresh = chatItems.filter(i => (i.t || 0) > prev && i.name !== me.username).length;
    if (chatReady && active !== "chat" && fresh) { unread += fresh; chatDot.hidden = false; }
    chatReady = true; if (active === "chat") drawChat();
  });
  const note = t => { chatNote.textContent = t; if (t) setTimeout(() => { if (chatNote.textContent === t) chatNote.textContent = ""; }, 3500); };
  function drawBubble(canvas, tex, sprite, display) {
    const c = canvas.getContext("2d"); c.clearRect(0, 0, 512, 100);
    if (display) { c.fillStyle = "rgba(8,20,17,.9)"; c.strokeStyle = "#d7e7df"; c.lineWidth = 3; c.beginPath(); c.roundRect(8, 8, 496, 78, 14); c.fill(); c.stroke(); c.fillStyle = "#fff"; c.font = "24px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(display.length > 42 ? display.slice(0, 39) + "…" : display, 256, 48); }
    tex.needsUpdate = true; sprite.visible = !!display;
  }
  function broadcastTyping(value) {
    const v = cleanMessage(value), display = v ? v.slice(0, 70) : "";
    if (display === lastTyping) return;
    lastTyping = display;
    dbUpdate(meRef, { say: display, sayAt: serverTimestamp() }).catch(() => {});
    if (localBubbleCanvas && localBubbleTexture && localBubbleSprite) drawBubble(localBubbleCanvas, localBubbleTexture, localBubbleSprite, display);
    clearTimeout(typingTimer);
    if (display) typingTimer = setTimeout(() => { lastTyping = ""; dbUpdate(meRef, { say: "" }).catch(() => {}); }, 5000);
  }
  chatInput.addEventListener("input", () => broadcastTyping(chatInput.value));
  chatForm.onsubmit = async e => {
    e.preventDefault(); const text = cleanMessage(chatInput.value);
    if (!text) { if (chatInput.value.trim()) note("Pesan mengandung kata yang dilarang."); return; }
    try {
      await set(push(ref(db, "globalChat")), { name: me.username, admin: me.role === "admin", text, t: serverTimestamp() });
      dbUpdate(meRef, { say: text.slice(0, 70), sayAt: serverTimestamp() }).catch(() => {});
      clearTimeout(typingTimer); typingTimer = setTimeout(() => dbUpdate(meRef, { say: "" }).catch(() => {}), 4500);
      chatInput.value = ""; lastTyping = "";
    } catch (_) { note("Pesan gagal terkirim. Periksa Rules database."); }
  };

  // Profil pemain lain
  async function inspectPlayer(id, fallback) {
    active = null; chat.el.hidden = true; missions.el.hidden = true; mine.el.hidden = true; fpanel.el.hidden = true;
    chatBtn.setAttribute("aria-pressed", "false"); missionBtn.setAttribute("aria-pressed", "false"); friendBtn.setAttribute("aria-pressed", "false"); addDockBtn.setAttribute("aria-pressed", "false"); reqBtn.setAttribute("aria-pressed", "false");
    profile.el.hidden = false; profile.title.textContent = "Memeriksa akun…"; profile.body.replaceChildren();
    try {
      const presence = others[id] || {};
      const key = (await get(ref(db, "ids/" + id))).val();
      const user = key ? (await get(ref(db, "users/" + key))).val() : null;
      const data = (await get(ref(db, "playerData/" + id))).val() || {};
      const photo = safeUrl((await get(ref(db, "profiles/" + id))).val());
      profile.title.textContent = (user?.name || presence.n || fallback || "Player") + (user?.role === "admin" ? " ✓" : "");
      const row = (k, v) => { const r = h("div", "pf-row"); r.append(h("span", "", k), h("b", "", v)); return r; };
      const av = h("div", "pm-av ro"); paintAv(av, photo, user?.name || presence.n || fallback, user?.role === "admin", true);
      av.style.margin = "0 auto 10px";
      const on = alive(presence), isFriend = !!friends[id], pmsg = h("p", "pm-msg"); pmsg.setAttribute("role", "status");
      const stats = h("div", "pm-stats");
      stats.append(
        statBox("Diamond", fmtNum(data.diamonds), "dia"),
        statBox("Login streak", `${data.streak || 0} / 5 hari`),
        statBox("Pohon ditebang", fmtNum(data.chopCount)),
        statBox("Bertahan", fmtClock(Math.min(600, Math.floor(data.survivalSeconds || 0)))));
      const actions = h("div", "pm-actions");
      if (!isFriend) { const add = h("button", "pm-btn", "Tambah teman"); add.type = "button"; add.onclick = async () => { await addFriend(id); pmsg.textContent = msg.textContent; pmsg.className = msg.className.replace("mp-msg", "pm-msg"); }; actions.append(add); }
      else if (on && presence.p !== myParty) { const inv = h("button", "pm-btn", "Undang main"); inv.type = "button"; inv.onclick = async () => { const r = await invite(id); pmsg.textContent = r.m; pmsg.className = "pm-msg" + (r.ok ? " ok" : ""); }; actions.append(inv); }
      profile.body.replaceChildren(
        av,
        row("ID", id),
        row("Peran", user?.role === "admin" ? "Developer" : "Player"),
        row("Status", on ? (presence.g ? "Sedang bermain" : "Di lobby") : "Offline"),
        stats, actions, pmsg
      );
    } catch (_) { profile.title.textContent = "Profil"; profile.body.replaceChildren(h("p", "", "Profil tidak bisa dibuka. Periksa Rules database.")); }
  }

  function row(name, sub, on, ...btns) {
    const r = h("div", "mp-row"), t = h("span", "", name);
    t.append(h("small", "", sub)); r.append(h("i", on ? "on" : ""), t);
    for (const [label, fn, cls] of btns) { const b = h("button", cls, label); b.onclick = fn; r.append(b); }
    return r;
  }
  const act = async p => { const r = await p; sayMsg(r.m, r.ok); };
  function render() {
    const on = Object.entries(others).filter(([, o]) => alive(o));
    btn.lastChild.textContent = on.length; friendCnt.textContent = fOnline(); friendDot.hidden = !pend.length; H.count?.(fOnline());
    reqCnt.textContent = reqs.length; reqCnt.hidden = !reqs.length; reqDot.hidden = !reqs.length;
    list.replaceChildren(); aList.replaceChildren(); rList.replaceChildren();
    if (!reqs.length) rList.append(h("p", "mp-h", "Belum ada permintaan teman."));
    reqs.forEach(r => rList.append(row(r.n, "ingin berteman denganmu", !!alive(others[r.id]), ["Terima", () => act(acceptReq(r.id, r.n))], ["Tolak", () => act(declineReq(r.id)), "x"])));
    if (pend.length) {
      list.append(h("p", "mp-h", "Undangan"));
      pend.forEach(i => list.append(row(i.n, "mengundangmu main", true, ["Terima", () => act(accept(i.id))], ["Tolak", () => act(decline(i.id)), "x"])));
    }
    const party = inParty();
    if (party.length) { list.append(h("p", "mp-h", `Party (${party.length + 1}/4)`)); list.append(row(party.map(([, o]) => o.n).join(", "), isLeader() ? "kamu pemimpin party" : "pemimpin: " + (others[myParty]?.n || "?"), true, ["Keluar", leaveParty, "x"])); }
    const fr = Object.entries(friends).map(([id, n]) => ({ id, n, o: alive(others[id]) ? others[id] : null })).sort((a, b) => !!b.o - !!a.o);
    list.append(h("p", "mp-h", fr.length ? "Teman" : "Belum ada teman. Buka Tambah untuk mencari teman."));
    fr.forEach(f => {
      const same = f.o && f.o.p === myParty, btns = [];
      if (f.o && !same) btns.push(["Undang", () => act(invite(f.id))]);
      btns.push(["Periksa", () => inspectPlayer(f.id, f.n), "mp-profile-action"]);
      btns.push(["Hapus", () => removeFriend(f.id), "x"]);
      list.append(row(f.n, f.o ? (same ? "satu party" : f.o.g ? "sedang main" : "di lobby") : "offline", !!f.o, ...btns));
    });
    const term = search.value.trim().toLowerCase();
    const rest = on.filter(([id, o]) => !friends[id] && (!term || String(o.n || "").toLowerCase().includes(term) || id.includes(term))).slice(0, 12);
    if (rest.length) { aList.append(h("p", "mp-h", "Online sekarang")); rest.forEach(([id, o]) => aList.append(row(o.n + (o.a ? " ✓" : ""), "ID " + id, true, ["Periksa", () => inspectPlayer(id, o.n), "mp-profile-action"], ["Tambah", () => addFriend(id)]))); }
  }
  render();

  // ---------- Pemain lain di dunia game ----------
  const avatars = new Map();
  function makeAvatar(T, id, name, isAdmin = false) {
    // Model SAMA PERSIS dengan karakter milikmu (buildHero), jadi tampilannya tidak berubah di layar teman.
    const hero = buildHero(T), g = new T.Group(), body = hero.body; g.add(body);
    const legs = [hero.leftLeg, hero.rightLeg], arms = [hero.leftArm, hero.rightArm];
    arms[0].rotation.z = -0.1; arms[1].rotation.z = 0.1;
    const cv = document.createElement("canvas"); cv.width = 512; cv.height = 80;
    const c = cv.getContext("2d"); c.font = "600 32px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
    c.lineWidth = 6; c.strokeStyle = "#0b1512"; c.strokeText(name, 256, 40); c.fillStyle = "#fff"; c.fillText(name, 256, 40);
    if (isAdmin) { c.fillStyle = "#48aaff"; c.font = "bold 34px sans-serif"; c.fillText("✓", 256 + c.measureText(name).width / 2 + 18, 40); }
    const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace;
    const tag = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false })); tag.scale.set(2.7, 0.42, 1); tag.position.y = 2.58; tag.renderOrder = 10; g.add(tag);
    const bubbleCanvas = document.createElement("canvas"); bubbleCanvas.width = 512; bubbleCanvas.height = 100;
    const bubbleTex = new T.CanvasTexture(bubbleCanvas); bubbleTex.colorSpace = T.SRGBColorSpace;
    const bubble = new T.Sprite(new T.SpriteMaterial({ map: bubbleTex, transparent: true, depthTest: false })); bubble.scale.set(3.0, 0.58, 1); bubble.position.y = 3.18; bubble.renderOrder = 11; bubble.visible = false; g.add(bubble);
    return { g, body, legs, arms, tex, tag, bubbleTex, bubbleCanvas, bubble, bubbleText: "", tx: 0, ty: 0, tz: 0, tr: 0, v: 0, ph: 0, fresh: true };
  }
  function drop(id) { const a = avatars.get(id); if (!a) return; G.scene.remove(a.g); a.tex.dispose(); a.tag.material.dispose(); a.bubbleTex.dispose(); a.bubble.material.dispose(); avatars.delete(id); }
  const addSurvival = seconds => mutateData(d => { d.survivalSeconds = Math.min(600, (d.survivalSeconds || 0) + seconds); }).catch(() => {});

  return {
    attachGame({ THREE: T, scene, player }) {
      G = { T, scene, player };
      const tagCanvas = document.createElement("canvas"); tagCanvas.width = 512; tagCanvas.height = 80;
      const lc = tagCanvas.getContext("2d"); lc.font = "700 34px sans-serif"; lc.textAlign = "center"; lc.textBaseline = "middle";
      const localName = String(me.username || "Player").slice(0, 16); lc.lineWidth = 6; lc.strokeStyle = "#081411"; lc.strokeText(localName, 256, 40); lc.fillStyle = "#fff"; lc.fillText(localName, 256, 40);
      if (me.role === "admin") { lc.fillStyle = "#48aaff"; lc.font = "bold 36px sans-serif"; lc.fillText("✓", 256 + lc.measureText(localName).width / 2 + 18, 40); }
      const localTex = new T.CanvasTexture(tagCanvas); localTex.colorSpace = T.SRGBColorSpace;
      const localTag = new T.Sprite(new T.SpriteMaterial({ map: localTex, transparent: true, depthTest: false })); localTag.scale.set(2.7, .42, 1); localTag.position.y = 2.55; localTag.renderOrder = 12; player.add(localTag);
      localBubbleCanvas = document.createElement("canvas"); localBubbleCanvas.width = 512; localBubbleCanvas.height = 100;
      localBubbleTexture = new T.CanvasTexture(localBubbleCanvas); localBubbleTexture.colorSpace = T.SRGBColorSpace;
      localBubbleSprite = new T.Sprite(new T.SpriteMaterial({ map: localBubbleTexture, transparent: true, depthTest: false })); localBubbleSprite.scale.set(3, .58, 1); localBubbleSprite.position.y = 3.15; localBubbleSprite.renderOrder = 13; localBubbleSprite.visible = false; player.add(localBubbleSprite);
      return {
        update(dt, t, activeNow) {
          const now = performance.now();
          if (activeNow) {
            survivalBuffer += dt; survivalFlush += dt;
            if (survivalFlush >= 5) { const elapsed = survivalBuffer; survivalBuffer = 0; survivalFlush = 0; if (elapsed > 0) addSurvival(elapsed); }
            const p = player.position, r = player.rotation.y;
            const moved = Math.hypot(p.x - last.x, p.z - last.z) + Math.abs(p.y - last.y) + Math.abs(r - last.r) > 0.02;
            if (now - lastSend > (moved || !inGame ? 100 : 2000)) {
              lastSend = now; inGame = 1; last = { x: p.x, y: p.y, z: p.z, r };
              beat({ x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), r: +r.toFixed(2) });
            }
          }
          const seen = new Set();
          for (const [id, o] of Object.entries(others)) {
            if (!o.g || !alive(o) || o.x == null || o.p !== myParty) continue;   // hanya yang mabar (satu party) yang muncul di map
            if (!avatars.has(id)) { if (avatars.size >= MAX_AVATARS) continue; const a = makeAvatar(G.T, id, String(o.n || "?").slice(0, 16), !!o.a); avatars.set(id, a); scene.add(a.g); }
            const a = avatars.get(id); seen.add(id); a.tx = o.x; a.ty = o.y; a.tz = o.z; a.tr = o.r || 0;
            const speech = String(o.say || "").slice(0, 70);
            if (speech !== a.bubbleText) { a.bubbleText = speech; drawBubble(a.bubbleCanvas, a.bubbleTex, a.bubble, speech); }
          }
          for (const id of [...avatars.keys()]) if (!seen.has(id)) drop(id);
          const k = 1 - Math.exp(-dt * 10);
          for (const a of avatars.values()) {
            const g = a.g, px = g.position.x, pz = g.position.z;
            if (a.fresh) { g.position.set(a.tx, a.ty, a.tz); g.rotation.y = a.tr; a.fresh = false; }
            g.position.x += (a.tx - g.position.x) * k; g.position.y += (a.ty - g.position.y) * k; g.position.z += (a.tz - g.position.z) * k;
            let d = a.tr - g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); g.rotation.y += d * k;
            const sp = Math.hypot(g.position.x - px, g.position.z - pz) / Math.max(dt, 0.001);
            a.v += (sp - a.v) * Math.min(1, dt * 8); a.ph += a.v * dt * 1.6;
            const amp = Math.min(a.v / 4, 1) * 0.8, s = Math.sin(a.ph) * amp;
            a.legs[0].rotation.x = s; a.legs[1].rotation.x = -s; a.arms[0].rotation.x = -s * 0.8; a.arms[1].rotation.x = s * 0.8;
            a.body.position.y = -0.37 + Math.abs(Math.sin(a.ph)) * 0.04 * Math.min(a.v / 4, 1);
          }
        }
      };
    },
    invite, accept, decline, leaveParty,
    isLeader, canStart, notice, partyMembers, buildHero,
    diamonds() { return Math.round(diaShown); },
    announceStart() { if (isLeader() && inParty().length) return beat({ go: serverTimestamp() }); },   // beri tahu anggota party
    onPartyStart(cb) { H.partyStart = cb; },
    partySize() { return inParty().length; },   // teman satu party (tanpa dirimu), untuk intro
    enterGame() {                                // masuk game: tutup semua panel lobby (Chat, Misi, Profil)
      playing = true; if (active) setPanel(active); profile.el.hidden = true; chatInput.blur(); broadcastTyping("");
    },
    treeChopped() {
      mutateData(d => { d.chopCount = Math.min(5, (d.chopCount || 0) + 1); }).catch(() => {});
    },
    updateSurvival(seconds) { if (seconds && seconds >= 1) addSurvival(seconds); },
    setTyping(value) { broadcastTyping(value); },
    dock(modeName) { root.classList.toggle("lobby", modeName === "lobby"); root.classList.toggle("game", modeName !== "lobby"); if (modeName !== "lobby" && (active === "friends" || active === "add" || active === "requests")) setPanel(active); },
    setPhoto(url) { return set(ref(db, "profiles/" + me.id), url).catch(() => {}); },
    getPhoto() { return get(ref(db, "profiles/" + me.id)).then(s => s.val()).catch(() => null); },
    togglePanel() { setPanel("friends"); },
    onPending(cb) { H.pending = cb; if (cb) cb(pend); toast(); },
    onCount(cb) { H.count = cb; if (cb) cb(fOnline()); },
    leave() { inGame = 0; return remove(meRef).catch(() => {}); }
  };
}

/* =====================================================================
   5. GAME (dijalankan setelah tombol Main di lobby)
   ===================================================================== */
// Di HP/tablet: masuk layar penuh lalu kunci orientasi ke landscape (miring).
// Jika browser menolak (mis. iOS Safari), tampilkan petunjuk agar pemain memutar HP sendiri.
function setupFullscreenLandscape() {
  if (!matchMedia("(pointer:coarse)").matches) return;   // PC tidak dipaksa layar penuh
  const doc = document, de = doc.documentElement;
  const portrait = matchMedia("(orientation: portrait)");
  const fsEl = () => doc.fullscreenElement || doc.webkitFullscreenElement;
  const refreshHint = () => {};   // tidak ada lagi peringatan putar layar
  const lock = async () => { try { await screen.orientation?.lock?.("landscape"); } catch (_) { /* tidak didukung */ } refreshHint(); };
  const goFull = async () => {
    try {
      if (!fsEl()) await (de.requestFullscreen?.({ navigationUI: "hide" }) ?? de.webkitRequestFullscreen?.());
    } catch (_) { /* ditolak */ }
    await lock();
  };
  portrait.addEventListener?.("change", refreshHint);
  addEventListener("orientationchange", () => setTimeout(refreshHint, 150));
  const onFsChange = () => { if (!fsEl()) { try { screen.orientation?.unlock?.(); } catch (_) {} } else lock(); refreshHint(); };
  doc.addEventListener("fullscreenchange", onFsChange);
  doc.addEventListener("webkitfullscreenchange", onFsChange);
  goFull(); refreshHint();
  // Bila pemanggilan pertama bukan dari gestur sentuh, coba lagi pada sentuhan berikutnya.
  if (!fsEl()) {
    const retry = () => { if (fsEl()) return removeEventListener("pointerdown", retry); goFull(); };
    addEventListener("pointerdown", retry, { once: true });
  }
}

async function startGame() {
  if (started) return; started = true;
  setupFullscreenLandscape();
  $("game").classList.add("playing"); window.mp?.enterGame?.();
  const { createMap } = M.map, { createIntro } = M.intro, { createInventory, createCrafting, createActionButton, createHealth, createShootButton } = M.hud;
  const { createFishing } = M.fishing, { createMonsters } = M.monsters;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, .1, 450);
  const lowEnd = matchMedia("(pointer:coarse)").matches || innerWidth < 800;
  const renderer = new THREE.WebGLRenderer({ antialias: devicePixelRatio < 2, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, lowEnd ? 1.5 : 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  $("game").prepend(renderer.domElement);

  const hemi = new THREE.HemisphereLight(0xdceeff, 0x536044, 2);
  scene.add(hemi);
  const sunLight = new THREE.DirectionalLight(0xffe0b4, 2.3);
  sunLight.position.set(-9, 16, 8);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(lowEnd ? 1024 : 2048, lowEnd ? 1024 : 2048);
  sunLight.shadow.camera.left = -35; sunLight.shadow.camera.right = 35;
  sunLight.shadow.camera.top = 35; sunLight.shadow.camera.bottom = -35;
  scene.add(sunLight);
  const world = createMap(scene, { renderer, hemi, sun: sunLight });

  const mat = (c, r = .82) => new THREE.MeshStandardMaterial({ color: c, roughness: r });

  const player = new THREE.Group();
  scene.add(player);
  const mpGame = window.mp?.attachGame({ THREE, scene, player }); // multiplayer: pemain lain + kirim posisi
  const FOOT = HERO_FOOT; // tinggi telapak sepatu dari origin model
  const { body, head, leftLeg, rightLeg, leftArm, rightArm, scarfTail } = buildHero(THREE); // model yang sama dilihat teman
  player.add(body);

  function add(geo, material, parent, x, y, z, sx = 1, sy = 1, sz = 1) {
    const o = new THREE.Mesh(geo, material);
    o.position.set(x, y, z); o.scale.set(sx, sy, sz);
    o.castShadow = true; o.receiveShadow = true; parent.add(o); return o;
  }
  function capsule(parent, r, len, material, x, y, z) {
    return add(new THREE.CapsuleGeometry(r, len, 5, 8), material, parent, x, y, z);
  }


  const shadow = new THREE.Mesh(new THREE.CircleGeometry(.52, 24), new THREE.MeshBasicMaterial({ color: 0x1b261f, transparent: true, opacity: .22 }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = .012; player.add(shadow);

  // ================= INPUT =================
  const keys = {};
  addEventListener("keydown", e => {
    if (/INPUT|TEXTAREA/.test(e.target.tagName)) return;
    keys[e.code] = true;
    if (e.code === "Space") triggerPlayerJump();
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
  });
  addEventListener("keyup", e => { keys[e.code] = false; });

  const joystickVector = new THREE.Vector2(0, 0); // x: kanan(+), y: atas(+)
  let isRunning = false;
  const physics = { velocityY: 0, isGrounded: true, gravity: -32, jumpForce: 13, jumpCount: 0, maxJumps: 2 };
  const sq = { x: 0, v: 0 };
  const moveVel = new THREE.Vector2(0, 0);
  let wasGrounded = true, walkTime = 0;

  const joystick = document.querySelector("#joystick");
  const stick = document.querySelector("#stick");
  const maxDist = 37;
  joystick.style.touchAction = "none";
  function updateKnob(x, y) {
    const dist = Math.hypot(x, y);
    if (dist > maxDist) { x = x / dist * maxDist; y = y / dist * maxDist; }
    stick.style.translate = `${x}px ${y}px`;
    joystickVector.x = x / maxDist; joystickVector.y = -y / maxDist;
  }
  function moveKnobTo(cx, cy) {
    const r = joystick.getBoundingClientRect();
    updateKnob(cx - (r.left + r.width / 2), cy - (r.top + r.height / 2));
  }
  // Analog hanya mengikuti jarinya sendiri (identifier).
  let joyId = null, mouseJoy = false;
  const findTouch = list => { for (const tc of list) if (tc.identifier === joyId) return tc; return null; };
  const handleEnd = () => { joyId = null; mouseJoy = false; joystickVector.set(0, 0); stick.style.translate = "0px 0px"; };
  joystick.addEventListener("touchstart", e => {
    e.preventDefault(); e.stopPropagation();
    if (joyId !== null) return;
    const tc = e.changedTouches[0]; joyId = tc.identifier; moveKnobTo(tc.clientX, tc.clientY);
  }, { passive: false });
  joystick.addEventListener("touchmove", e => {
    const tc = findTouch(e.changedTouches); if (!tc) return;
    e.preventDefault(); moveKnobTo(tc.clientX, tc.clientY);
  }, { passive: false });
  const endTouch = e => { if (findTouch(e.changedTouches)) handleEnd(); };
  joystick.addEventListener("touchend", endTouch);
  joystick.addEventListener("touchcancel", endTouch);
  joystick.addEventListener("mousedown", e => { e.preventDefault(); mouseJoy = true; moveKnobTo(e.clientX, e.clientY); });
  addEventListener("mousemove", e => { if (mouseJoy) moveKnobTo(e.clientX, e.clientY); });
  addEventListener("mouseup", () => { if (mouseJoy) handleEnd(); });

  const runBtn = document.querySelector("#runBtn"), jumpBtn = document.querySelector("#jumpBtn");
  runBtn.style.touchAction = "none"; jumpBtn.style.touchAction = "none";
  runBtn.addEventListener("touchstart", e => { e.preventDefault(); isRunning = true; }, { passive: false });
  runBtn.addEventListener("touchend", e => { e.preventDefault(); isRunning = false; }, { passive: false });
  runBtn.addEventListener("pointerdown", () => { isRunning = true; });
  for (const ev of ["pointerup", "pointercancel", "pointerleave"]) runBtn.addEventListener(ev, () => { isRunning = false; });

  // Lompat 2 tahap (satu dari tanah + satu di udara)
  function triggerPlayerJump() {
    if (intro.active || inv.isOpen || crafting.isOpen) return;
    const maxJumps = Math.max(2, Number(physics.maxJumps) || 2);
    let used = Math.max(0, Number(physics.jumpCount) || 0);
    if (physics.isGrounded) used = 0;
    if (used >= maxJumps) return;
    physics.jumpCount = used + 1;
    physics.velocityY = physics.jumpForce;
    physics.isGrounded = false;
    sq.v = 6;
  }
  jumpBtn.addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); triggerPlayerJump(); });

  // ================= KAMERA ORBIT (geser = putar, cubit = zoom) =================
  const UP = new THREE.Vector3(0, 1, 0);
  const camTarget = new THREE.Vector3(0, 1.5, 0);
  const orbit = { theta: Math.PI, phi: Math.acos(3 / Math.hypot(3, 6.7)), radius: Math.hypot(3, 6.7), dTheta: 0, dPhi: 0 };
  const ROT_SPEED = .9, DAMPING = 1, MIN_R = 2.5, MAX_R = 24;
  const canvas = renderer.domElement;
  canvas.style.touchAction = "none";
  const pointers = new Map();
  let pinchDist = 0;
  const pdist = () => { const [a, b] = [...pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  canvas.addEventListener("pointerdown", e => {
    if (intro.active) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    canvas.setPointerCapture(e.pointerId);
    if (pointers.size === 2) pinchDist = pdist();
  });
  canvas.addEventListener("pointermove", e => {
    const p = pointers.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (pointers.size === 1) {
      // langsung mengikuti jari (tanpa meluncur / inersia)
      orbit.theta -= 2 * Math.PI * dx / innerHeight * ROT_SPEED;
      orbit.phi = THREE.MathUtils.clamp(orbit.phi - 2 * Math.PI * dy / innerHeight * ROT_SPEED, .12, Math.PI / 2 - .05);
    } else if (pointers.size === 2) {
      const d = pdist();
      if (pinchDist > 0 && d > 0) orbit.radius = THREE.MathUtils.clamp(orbit.radius * pinchDist / d, MIN_R, MAX_R);
      pinchDist = d;
    }
  });
  const dropPointer = e => { pointers.delete(e.pointerId); pinchDist = pointers.size === 2 ? pdist() : 0; };
  canvas.addEventListener("pointerup", dropPointer);
  canvas.addEventListener("pointercancel", dropPointer);
  canvas.addEventListener("wheel", e => {
    e.preventDefault();
    if (intro.active) return;
    orbit.radius = THREE.MathUtils.clamp(orbit.radius * (e.deltaY > 0 ? 1.08 : .92), MIN_R, MAX_R);
  }, { passive: false });

  const clamp = THREE.MathUtils.clamp;
  const clock = new THREE.Clock();
  const goal = new THREE.Vector3();
  const forward = new THREE.Vector3(), right = new THREE.Vector3(), offset = new THREE.Vector3();

  // ================= TAS & MENEBANG POHON =================
  const inv = createInventory();
  world.onPickup = (id, n) => {
    const got = inv.add(id, n);
    if (got > 0) inv.notify(id, got); else inv.toast("Tas penuh!");
    return got;
  };
  // kapak: hanya tampak saat menebang
  const axe = new THREE.Group(); axe.visible = false;
  add(new THREE.BoxGeometry(.06, .62, .06), mat(0x7a5a3a), axe, 0, -.56, .05);
  add(new THREE.BoxGeometry(.05, .17, .26), mat(0x9aa3ab, .4), axe, 0, -.84, .17);
  rightArm.add(axe);
  const CHOP_RANGE = 3.4, CHOP_DUR = .62, CHOP_HIT = .27;
  let chopT = -1, chopHit = false, chopTarget = null;
  const treeChopAudio = new Audio("./sounds/chop_tree.mp3");
  treeChopAudio.preload = "auto";
  treeChopAudio.volume = 0.8;
  function playTreeChopSound() {
    try {
      treeChopAudio.pause();
      treeChopAudio.currentTime = 0;
      const sound = treeChopAudio.play();
      if (sound && typeof sound.catch === "function") sound.catch(() => {});
    } catch { /* audio opsional */ }
  }

  function startChop(tr) {                                  // tr = pohon atau monster
    if (!tr || intro.active || chopT >= 0 || inv.isOpen || crafting.isOpen || !physics.isGrounded) return;
    fishing.cancel();
    chopTarget = tr; chopT = 0; chopHit = false; axe.visible = true;
    if (!tr.isMonster) playTreeChopSound();
  }
  // aksi terdekat: serang monster > memancing > api unggun / pohon
  function pickAction() {
    const p = player.position;
    const mon = monsters.nearest(p.x, p.z, 2.6);
    if (mon) return { kind: "attack", label: "Serang", mon };
    if (inv.held === "pancing") {
      if (fishing.busy) return { kind: "fish", label: fishing.label };
      if (fishing.canCast()) return { kind: "fish", label: "Pancing" };
    }
    const f = world.findFire(p.x, p.z), tr = world.findTree(p.x, p.z, CHOP_RANGE);
    if (f && f.lit && inv.held === "daging") return { kind: "cook", label: cook ? "Memasak " + Math.ceil(COOK_T - cook.t) : "Masak", f };
    if (f && (!tr || Math.hypot(f.x - p.x, f.z - p.z) <= Math.hypot(tr.x - p.x, tr.z - p.z))) return { kind: "fire", label: f.lit ? "Tambah kayu" : "Nyalakan", f };
    if (tr) return { kind: "chop", tr };
    return { kind: null };
  }
  function doAction() {
    if (intro.active || chopT >= 0 || inv.isOpen || crafting.isOpen || !physics.isGrounded) return;
    const a = pickAction();
    if (a.kind === "attack") startChop(a.mon);
    else if (a.kind === "fish") fishing.press();
    else if (a.kind === "cook") startCook(a.f);
    else if (a.kind === "fire") {
      if (inv.count("kayu") < 1) { inv.toast("Butuh 1 kayu"); return; }
      const r = world.feedFire(a.f);
      if (r.ok) inv.remove("kayu", 1);
      inv.toast(r.text);
    } else if (a.kind === "chop") startChop(a.tr);
  }
  const chopBtn = createActionButton(doAction);
  // menu Buat: rumah / api dibangun di depan pemain, pancingan masuk ke tas
  const crafting = createCrafting(inv, r => {
    for (const [k, n] of Object.entries(r.cost)) if (inv.count(k) < n) return { ok: false, msg: "Bahan kurang" };
    if (r.kind === "build") {
      const ry = player.rotation.y, house = r.id === "rumah", dist = house ? 6.5 : 2.6;
      const res = world.build(house ? "house" : "fire", player.position.x + Math.sin(ry) * dist, player.position.z + Math.cos(ry) * dist, house ? ry + Math.PI : ry);
      if (!res.ok) return { ok: false, msg: res.why };
      for (const [k, n] of Object.entries(r.cost)) inv.remove(k, n);
      return { ok: true, msg: house ? "Rumah kayu dibangun" : "Api unggun dipasang" };
    }
    for (const [k, n] of Object.entries(r.cost)) inv.remove(k, n);
    for (const [k, n] of Object.entries(r.give || {})) {
      if (inv.add(k, n) < n) { for (const [ck, cn] of Object.entries(r.cost)) inv.add(ck, cn); return { ok: false, msg: "Tas penuh!" }; }
    }
    return { ok: true, msg: r.name + " dibuat" };
  });

  // ================= PANAH: busur di tangan kiri, bidik otomatis ke hewan di depan =================
  const ARROW_SPEED = 34, ARROW_GRAV = 5, ARROW_LIFE = 2.5, SHOOT_CD = .85, COOK_T = 4;
  const bow = new THREE.Group(); bow.visible = false;
  { const br = .38;
    add(new THREE.TorusGeometry(br, .025, 6, 18, Math.PI).rotateZ(Math.PI).rotateY(Math.PI / 2), mat(0x7a5232), bow, 0, 0, 0);
    add(new THREE.BoxGeometry(.008, .008, br * 2), mat(0xe8e0cc), bow, 0, 0, 0);
    bow.position.set(0, -.8 + br, 0); leftArm.add(bow); }
  const arrows = [], arrowMat = mat(0x8a5a2f), arrowHeadM = mat(0xb4bcc2, .4), featherM = mat(0xd65a4a);
  function makeArrow() {
    const g = new THREE.Group();
    add(new THREE.CylinderGeometry(.014, .014, 1, 6).rotateX(Math.PI / 2), arrowMat, g, 0, 0, 0);
    add(new THREE.ConeGeometry(.04, .14, 6).rotateX(Math.PI / 2), arrowHeadM, g, 0, 0, .54);
    add(new THREE.BoxGeometry(.1, .01, .16), featherM, g, 0, 0, -.43);
    add(new THREE.BoxGeometry(.01, .1, .16), featherM, g, 0, 0, -.43);
    return g;
  }
  let shootCd = 0, shootKick = 0;
  function shoot() {
    if (intro.active || inv.isOpen || crafting.isOpen || chopT >= 0 || inv.held !== "panah" || shootCd > 0) return;
    fishing.cancel();
    const p = player.position, fx = Math.sin(player.rotation.y), fz = Math.cos(player.rotation.y);
    const tgt = world.nearestAnimal(p.x, p.z, fx, fz, 30);            // bidik otomatis bila ada hewan di depan
    const o = new THREE.Vector3(p.x + fx * .6, p.y + 1.35, p.z + fz * .6), v = new THREE.Vector3(fx, .02, fz);
    if (tgt) {
      const dx = tgt.x - o.x, dz = tgt.z - o.z, tt = Math.hypot(dx, dz) / ARROW_SPEED;
      const ty = tgt.y + (tgt.type === "deer" ? 1.05 : .3) + .5 * ARROW_GRAV * tt * tt;   // imbangi jatuhnya panah
      v.set(dx, ty - o.y, dz).normalize();
      player.rotation.y = Math.atan2(dx, dz);
    }
    v.multiplyScalar(ARROW_SPEED);
    const g = makeArrow(); g.position.copy(o); scene.add(g);
    g.lookAt(o.x + v.x, o.y + v.y, o.z + v.z);
    arrows.push({ g, v, t: 0, stuck: false });
    shootCd = SHOOT_CD; shootKick = .25;
  }
  function updateArrows(dt) {
    shootCd = Math.max(0, shootCd - dt); shootKick = Math.max(0, shootKick - dt);
    for (let i = arrows.length - 1; i >= 0; i--) {
      const a = arrows[i], p = a.g.position; a.t += dt;
      if (a.stuck) { if (a.t > 1.5) { scene.remove(a.g); arrows.splice(i, 1); } continue; }
      let gone = false;
      for (let s = 0; s < 3 && !gone; s++) {                      // 3 langkah kecil agar tidak menembus hewan
        a.v.y -= ARROW_GRAV * dt / 3; p.addScaledVector(a.v, dt / 3);
        const hit = world.hitAnimal(p.x, p.y, p.z);
        if (hit) { inv.toast(hit.type === "deer" ? "Rusa terpanah! Ambil dagingnya" : "Kelinci terpanah! Ambil dagingnya"); gone = true; }
        else if (p.y <= world.groundAt(p.x, p.z) + .05) { a.stuck = true; a.t = 0; break; }
      }
      if (gone || a.t > ARROW_LIFE) { scene.remove(a.g); arrows.splice(i, 1); continue; }
      if (!a.stuck) a.g.lookAt(p.x + a.v.x, p.y + a.v.y, p.z + a.v.z);
    }
  }
  const shootBtn = createShootButton(shoot);
  addEventListener("keydown", e => {
    if (e.repeat || /INPUT|TEXTAREA/.test(e.target.tagName) || intro.active) return;
    if (e.code === "KeyQ") shoot();
    else if (/^Digit[1-4]$/.test(e.code)) inv.selectHot(+e.code[5] - 1);
    else if (e.code === "KeyT" && inv.count("panah") > 0) inv.setHeld(inv.held === "panah" ? null : "panah");
  });

  // ================= MASAK DAGING di api unggun yang menyala =================
  let cook = null;
  function startCook(f) {
    if (cook || inv.count("daging") < 1) return;
    cook = { f, t: 0 }; inv.toast("Memasak daging…");
  }
  function updateCook(dt) {
    if (!cook) return;
    const p = player.position;
    if (!cook.f.lit || inv.held !== "daging" || Math.hypot(cook.f.x - p.x, cook.f.z - p.z) > 3.6) { cook = null; inv.toast("Memasak dibatalkan"); return; }
    cook.t += dt;
    if (cook.t < COOK_T) return;
    inv.remove("daging", 1);
    const got = inv.add("daging_matang", 1);
    if (got) inv.notify("daging_matang", 1); else { inv.add("daging", 1); inv.toast("Tas penuh!"); cook = null; return; }
    if (inv.count("daging") > 0) cook.t = 0; else cook = null;
  }

  // ================= HP, MEMANCING, MONSTER MALAM =================
  const health = createHealth(100);
  const fishing = createFishing({ scene, world, player, rightArm, inv });
  const monsters = createMonsters({ scene, world });
  inv.onUse(id => {                                         // makan ikan +25 HP, daging matang +40 HP
    const hp = HEAL[id]; if (!hp) return false;
    if (health.hp >= health.max - .5) { inv.toast("HP sudah penuh"); return false; }
    health.heal(hp); inv.toast("+" + hp + " HP"); return true;
  });
  inv.onHold(id => {
    inv.toast(id === "pancing" ? "Memegang pancingan" : id === "panah" ? "Memegang panah" : id === "daging" ? "Memegang daging mentah" : "Disimpan");
    if (id !== "pancing") fishing.cancel();
  });
  monsters.onHit((dmg, dx, dz) => {                         // dihantam monster: kurangi HP + terdorong
    health.damage(dmg);
    moveVel.x += dx * 5; moveVel.y += dz * 5;
  });
  health.onDeath(() => {                                    // pingsan: bangun di titik awal dengan 60 HP
    player.position.set(0, 0, 0); moveVel.set(0, 0);
    physics.velocityY = 0; physics.isGrounded = true; physics.jumpCount = 0;
    fishing.cancel(); monsters.clearNear(0, 0, 60);
    health.set(60); inv.toast("Kamu pingsan… bangun di titik awal");
  });
  addEventListener("keydown", e => {
    if (e.repeat || /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.code === "KeyE" || e.code === "KeyF") doAction();
    else if ((e.code === "KeyB" || e.code === "KeyI") && !intro.active) inv.toggle();
    else if (e.code === "KeyC" && !intro.active) crafting.toggle();
    else if (e.code === "KeyR" && !intro.active && inv.count("pancing") > 0) inv.setHeld(inv.held === "pancing" ? null : "pancing");
  });

  // ================= INTRO SINEMATIK (intro.js) =================
  const intro = createIntro({
    scene, camera, world, player, body, head, leftLeg, rightLeg, leftArm, rightArm,
    scarfTail, shadow, FOOT, orbit,
    partyCount: window.mp?.partySize?.() || 0,
    controls: [joystick, runBtn, jumpBtn, inv.bar, inv.button, crafting.button, chopBtn.el].filter(Boolean),
    onFinish: ({ yaw }) => {
      // sambungkan kamera gameplay persis dengan kamera akhir intro
      orbit.theta = yaw + Math.PI; orbit.dTheta = 0; orbit.dPhi = 0;
      camTarget.set(player.position.x, player.position.y + 1.5, player.position.z);
      moveVel.set(0, 0);
      physics.velocityY = 0; physics.isGrounded = true; physics.jumpCount = 0; wasGrounded = true;
      pointers.clear(); pinchDist = 0;
    }
  });

  function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), .1);
    const t = clock.getElapsedTime();
    mpGame?.update(delta, t, !intro.active);

    if (intro.update(delta)) { renderer.render(scene, camera); return; }

    // ---------- Menebang: hadap target, ayun kapak, tebasan mengenai pada CHOP_HIT ----------
    if (chopT >= 0) {
      chopT += delta;
      const tr = chopTarget;
      if (tr) { let d = Math.atan2(tr.x - player.position.x, tr.z - player.position.z) - player.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); player.rotation.y += d * (1 - Math.exp(-delta * 18)); }
      if (!chopHit && chopT >= CHOP_HIT) {
        chopHit = true;
        if (chopTarget.isMonster) { if (Math.hypot(chopTarget.x - player.position.x, chopTarget.z - player.position.z) < 3) monsters.hit(chopTarget, 1, player.position.x, player.position.z); }
        else { world.chopTree(chopTarget, player.position); window.mp?.treeChopped?.(); }
      }
      if (chopT >= CHOP_DUR) {
        chopT = -1; chopTarget = null; axe.visible = false;
        treeChopAudio.pause();
        treeChopAudio.currentTime = 0;
      }
    }
    { const a = (!intro.active && chopT < 0 && !inv.isOpen && !crafting.isOpen && physics.isGrounded) ? pickAction() : { kind: null }; chopBtn.show(a.kind, a.label); }

    // ---------- Gerak ----------
    const speed = (isRunning || keys.ShiftLeft || keys.ShiftRight) ? 9 : 5;
    camera.getWorldDirection(forward); forward.y = 0; forward.normalize();
    right.crossVectors(forward, UP).normalize();

    let jx = joystickVector.x + ((keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0));
    let jy = joystickVector.y + ((keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0));
    const jl = Math.hypot(jx, jy); if (jl > 1) { jx /= jl; jy /= jl; }
    if (chopT >= 0 || inv.isOpen || crafting.isOpen) { jx = 0; jy = 0; }

    const preVy = physics.velocityY;
    let desX = 0, desZ = 0;
    if (Math.abs(jx) > .1 || Math.abs(jy) > .1) {
      const moveX = forward.x * jy + right.x * jx;
      const moveZ = forward.z * jy + right.z * jx;
      const len = Math.hypot(moveX, moveZ) || 1;
      desX = moveX / len * speed; desZ = moveZ / len * speed;
      let diff = Math.atan2(moveX, moveZ) - player.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      player.rotation.y += diff * (1 - Math.exp(-delta * 16));
    }
    const accel = 1 - Math.exp(-delta * ((desX || desZ) ? 11 : 14));
    moveVel.x += (desX - moveVel.x) * accel; moveVel.y += (desZ - moveVel.y) * accel;
    const hSpeed = moveVel.length();
    const isMoving = hSpeed > .4;
    player.position.x = clamp(player.position.x + moveVel.x * delta, world.bounds.minX, world.bounds.maxX);
    player.position.z = clamp(player.position.z + moveVel.y * delta, world.bounds.minZ, world.bounds.maxZ);
    world.collide(player.position, .45); // dinding rumah & api unggun

    // ---------- Lompat & gravitasi ----------
    if (!physics.isGrounded) {
      physics.velocityY += physics.gravity * delta;
      player.position.y += physics.velocityY * delta;
      if (player.position.y <= 0) { player.position.y = 0; physics.velocityY = 0; physics.isGrounded = true; physics.jumpCount = 0; }
    }
    if (physics.isGrounded && !wasGrounded && preVy < -4) { sq.v = -Math.min(1, -preVy / 22) * 8; }
    wasGrounded = physics.isGrounded;

    // ---------- Animasi ----------
    const k = 1 - Math.exp(-delta * 14);
    const dmp = (o, key, v) => { o[key] += (v - o[key]) * k; };
    const runK = clamp((hSpeed - 5) / 4, 0, 1);
    sq.v += (-sq.x * 220 - sq.v * 14) * delta; sq.x += sq.v * delta;
    let bob = 0, lean = 0, twist = 0, sway = 0;
    let lH = 0, rH = 0, lA = 0, rA = 0, armZ = .1, headY = 0;

    if (!physics.isGrounded) {
      const up = physics.velocityY > 0;
      lH = up ? -.9 : -.4; rH = up ? .3 : .5;
      lA = rA = up ? -1.7 : -1.0; armZ = up ? .5 : .8;
      lean = .1 + clamp(-physics.velocityY * .004, -.1, .12);
    } else if (isMoving) {
      walkTime += delta * Math.min(hSpeed, 12) * 1.7;
      const s = Math.sin(walkTime), amp = .55 + runK * .4;
      lH = s * amp; rH = -s * amp;
      lA = -s * amp * .9; rA = s * amp * .9;
      bob = Math.abs(s) * (.05 + runK * .05); lean = .06 + runK * .2; twist = -s * (.12 + runK * .1); sway = s * .04; armZ = .12;
      headY = -twist * .8;
    } else {
      const br = Math.sin(t * 2.2);
      bob = br * .008; lA = Math.sin(t * 1.3) * .04; rA = -lA; armZ = .1 + br * .015;
      sway = Math.sin(t * .8) * .015; headY = Math.sin(t * .5) * .35;
    }
    if (chopT >= 0) { // ayunan kapak: angkat -> hantam -> kembali
      const u = chopT / CHOP_DUR, L = THREE.MathUtils.lerp;
      let a = -1.4 - 1.4 * clamp(u / .4, 0, 1);
      if (u > .4) a = L(-2.8, -.6, clamp((u - .4) / .16, 0, 1));
      if (u > .6) a = L(-.6, 0, clamp((u - .6) / .4, 0, 1));
      lA = rA = a; armZ = .12; lH = rH = 0;
      lean = .12 + .28 * clamp((u - .35) / .2, 0, 1) * (1 - clamp((u - .6) / .4, 0, 1));
    }
    fishing.rod.visible = inv.held === "pancing" && chopT < 0;
    if (chopT < 0 && inv.held === "pancing") rA = fishing.armPose(t).rA;
    bow.visible = inv.held === "panah" && chopT < 0;
    if (bow.visible) lA = -1.4 - shootKick * 1.2;
    dmp(leftLeg.rotation, "x", lH); dmp(rightLeg.rotation, "x", rH);
    dmp(leftArm.rotation, "x", lA); dmp(rightArm.rotation, "x", rA);
    dmp(leftArm.rotation, "z", -armZ); dmp(rightArm.rotation, "z", armZ);
    dmp(head.rotation, "y", headY);
    dmp(body.position, "y", bob - FOOT); dmp(body.rotation, "x", lean); dmp(body.rotation, "y", twist); dmp(body.rotation, "z", sway);
    dmp(scarfTail.rotation, "x", Math.sin(t * 5) * .1 - .15 - hSpeed * .05);
    const air = physics.isGrounded ? 0 : clamp(physics.velocityY / 13, -1, 1) * .1;
    const sqv = clamp(sq.x + air, -.35, .35);
    body.scale.set(1 - sqv * .5, 1 + sqv, 1 - sqv * .5);
    const fovT = 58 + runK * 8; if (Math.abs(fovT - camera.fov) > .01) { camera.fov += (fovT - camera.fov) * k * .5; camera.updateProjectionMatrix(); }

    // Bayangan tetap di tanah, mengecil saat melompat
    shadow.position.y = .012 - player.position.y;
    const sh = 1 / (1 + player.position.y * .35);
    shadow.scale.set(sh, sh, sh); shadow.material.opacity = .22 * sh;

    // ---------- Kamera orbit mengikuti karakter ----------
    goal.set(player.position.x, player.position.y + 1.5, player.position.z);
    camTarget.lerp(goal, 1 - Math.exp(-delta * 8));
    orbit.theta += orbit.dTheta * DAMPING; orbit.dTheta *= 1 - DAMPING;
    orbit.phi = clamp(orbit.phi + orbit.dPhi * DAMPING, .12, Math.PI / 2 - .05); orbit.dPhi *= 1 - DAMPING;
    const sp = Math.sin(orbit.phi) * orbit.radius;
    offset.set(sp * Math.sin(orbit.theta), Math.cos(orbit.phi) * orbit.radius, sp * Math.cos(orbit.theta));
    camera.position.copy(camTarget).add(offset);
    camera.lookAt(camTarget);
    world.update(delta, player.position, camera);
    fishing.update(delta, t); monsters.update(delta, player.position, t); health.update(delta);
    updateArrows(delta); updateCook(delta);
    shootBtn.show(inv.held === "panah" && !inv.isOpen && !crafting.isOpen);

    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
}



/* =====================================================================
   MODUL INTERNAL: HUD, FISHING, MONSTERS (digabung langsung ke main.js)
   ===================================================================== */
M.hud = (() => {
// ============================================================================
//  HUD SURVIVAL: tas (inventori), menu Buat (crafting) & tombol aksi (tebang / api)
//  Modul berdiri sendiri: DOM + CSS dibuat di sini, jadi index.html tidak perlu diubah.
//  Posisi tombol bisa digeser lewat CSS variabel di bawah (--bag-*, --craft-*, --chop-*).
// ============================================================================

const KEY = "parkour_bag_v1";
const SLOTS = 12;

const ICON_LOG = `<svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden="true">
<rect x="6" y="16" width="32" height="16" rx="3" fill="#9a6a3c"/>
<ellipse cx="38" cy="24" rx="5" ry="8" fill="#d9b27a"/><ellipse cx="38" cy="24" rx="2.4" ry="4.6" fill="#b8884f"/>
<path d="M10 21h22M10 27h20" stroke="#7a5230" stroke-width="1.6" stroke-linecap="round"/></svg>`;
const ICON_ROD = `<svg viewBox="0 0 48 48" width="100%" height="100%" fill="none" stroke-linecap="round" aria-hidden="true">
<path d="M8 42 34 10" stroke="#9a6a3c" stroke-width="3.2"/><path d="M34 10c6 2 8 10 6 18" stroke="#e8e0cc" stroke-width="1.5"/>
<path d="M40 28c0 3-4 3-4 0" stroke="#c9d3da" stroke-width="1.7"/></svg>`;
const ICON_HOUSE = `<svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden="true">
<path d="M3 25 24 7l21 18z" fill="#5b3a29"/><rect x="9" y="24" width="30" height="17" fill="#9a6a3c"/>
<rect x="20" y="29" width="8" height="12" fill="#3b2616"/><path d="M11 30h6M31 30h6" stroke="#7a5230" stroke-width="1.6" stroke-linecap="round"/></svg>`;
const ICON_FIRE = `<svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden="true">
<path d="M24 4c2 8 11 12 11 23a11 11 0 0 1-22 0c0-6 4-9 5-15 3 2 4 4 4 6 2-4 2-9 2-14z" fill="#ff8a1f"/>
<path d="M24 22c1 5 6 6 6 12a6 6 0 0 1-12 0c0-4 4-6 6-12z" fill="#ffd24a"/>
<rect x="9" y="40" width="30" height="4" rx="2" fill="#7a5230"/></svg>`;
const ICON_BAG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
<path d="M9 6.5V6a3 3 0 0 1 6 0v.5"/><rect x="5" y="6.5" width="14" height="14.5" rx="4.5"/><path d="M9 14h6M8.5 21v-3.2a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1V21"/></svg>`;
const ICON_HAMMER = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
<path d="M3 21l9.5-9.5"/><path d="M11 5l5-2.5 5 5-2.5 5-2.5-1-4-4z" fill="currentColor"/></svg>`;
const ICON_AXE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
<path d="M5 21 15 8.5"/><path d="M12.5 6.5C14.5 3.5 18.5 2.8 21 3.5c.7 2.5 0 6-3 8z" fill="currentColor"/></svg>`;
const ICON_FLAME = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
<path d="M12 2c1 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-4 3-7 1 1 2 2 2 3 1-2 1-4 1-7z"/></svg>`;

const ICON_ARROW = `<svg viewBox="0 0 48 48" width="100%" height="100%" fill="none" stroke-linecap="round" aria-hidden="true">
<path d="M9 39 35 13" stroke="#9a6a3c" stroke-width="3"/><path d="M33 7l11-3-3 11z" fill="#aab4bb"/>
<path d="M9 39l-5-1 1-5M14 34l-5-1 1-5" stroke="#d65a4a" stroke-width="2.4"/></svg>`;
const ICON_SHOOT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
<path d="M5 19 19 5"/><path d="M12 5h7v7"/><path d="M5 19l-2-4M5 19l4 2"/></svg>`;
const HEAL = { ikan: 25, daging_matang: 40 };            // makanan: +HP
const HOLDABLE = new Set(["pancing", "panah", "daging"]);  // item yang bisa dipegang

const ITEMS = {
  kayu: { name: "Kayu", stack: 20, icon: ICON_LOG, desc: "Kayu gelondongan dari pohon yang kamu tebang." },
  pancing: { name: "Pancingan", stack: 5, icon: ICON_ROD, desc: "Joran sederhana dari kayu dan tali." },
  panah: { name: "Panah", stack: 5, icon: ICON_ARROW, desc: "Busur & panah sederhana. Pegang, lalu tekan tombol panah di bawah layar untuk menembak hewan di depanmu." },
  daging: { name: "Daging Mentah", stack: 10, icon: "🥩", desc: "Daging hewan buruan. Pegang di dekat api unggun yang menyala lalu tekan Masak." },
  daging_matang: { name: "Daging Matang", stack: 10, icon: "🍖", desc: "Daging yang sudah dimasak. Dimakan memulihkan 40 HP." },
  ikan: { name: "Ikan", stack: 10, icon: "🐟", desc: "Ikan hasil pancingan. Bisa dimakan untuk memulihkan HP." },
};

// bahan -> hasil. kind "build": dibangun di depan pemain; "item": masuk ke tas.
const RECIPES = [
  { id: "rumah", name: "Rumah Kayu", kind: "build", cost: { kayu: 20 }, icon: ICON_HOUSE,
    desc: "Pondok kayu dengan pintu, jendela, dan atap. Dibangun di depanmu." },
  { id: "pancing", name: "Pancingan", kind: "item", cost: { kayu: 5 }, give: { pancing: 1 }, icon: ICON_ROD,
    desc: "Joran sederhana untuk memancing." },
  { id: "panah", name: "Panah", kind: "item", cost: { kayu: 5 }, give: { panah: 1 }, icon: ICON_ARROW,
    desc: "Busur & panah untuk berburu rusa dan kelinci. Pegang lewat Tas." },
  { id: "api", name: "Api Unggun", kind: "build", cost: { kayu: 3 }, icon: ICON_FIRE,
    desc: "Nyalakan dengan 1 kayu: redup 2 menit. Tambah kayu agar lebih lama & lebih terang." },
];

const CSS = `
:root{--bag-top:calc(env(safe-area-inset-top,0px) + 12px);--bag-right:12px;--craft-gap:64px;
--chop-right:18px;--chop-bottom:calc(env(safe-area-inset-bottom,0px) + 210px)}
.hud-btn{position:fixed;z-index:30;width:56px;height:56px;border-radius:50%;border:1px solid rgba(255,255,255,.4);
background:rgba(0,0,0,.45);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;
padding:0;cursor:pointer;user-select:none;-webkit-user-select:none;touch-action:manipulation;-webkit-tap-highlight-color:transparent;
font:600 11px system-ui,-apple-system,sans-serif}
.hud-btn:active{transform:scale(.94);background:rgba(0,0,0,.62)}
.hud-btn svg{width:26px;height:26px;display:block}
#bagBtn{top:var(--bag-top);right:var(--bag-right)}
#craftBtn{top:calc(var(--bag-top) + var(--craft-gap));right:var(--bag-right)}
#chopBtn{right:var(--chop-right);bottom:var(--chop-bottom);width:68px;height:68px;background:rgba(184,78,63,.85);display:none;text-align:center;line-height:1.05}
#chopBtn.fire{background:rgba(214,110,30,.9)}
#shootBtn{right:96px;bottom:var(--chop-bottom);width:68px;height:68px;background:rgba(58,112,70,.9);display:none;text-align:center;line-height:1.05}
#hotbar{position:fixed;z-index:29;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 12px);display:flex;gap:8px;user-select:none;-webkit-user-select:none}
.hot-slot{position:relative;width:52px;height:52px;padding:0;color:#fff;border:2px dashed rgba(255,255,255,.6);border-radius:6px;background:rgba(0,0,0,.3);cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.hot-slot.sel{border-style:solid;border-color:#e7a35f;background:rgba(231,163,95,.28)}
.hot-ico{position:absolute;inset:7px;display:block}.hot-ico svg{width:100%;height:100%;display:block}
.hot-ico{font-size:26px;line-height:38px;text-align:center}
.hot-key{position:absolute;top:1px;left:4px;font:600 10px system-ui,sans-serif;opacity:.7}
.hot-qty{position:absolute;right:4px;bottom:1px;font:700 12px system-ui,sans-serif;color:#f6b7d4;text-shadow:0 1px 3px #000}
.bag-badge{position:absolute;top:-4px;right:-4px;min-width:20px;height:20px;border-radius:10px;padding:0 5px;box-sizing:border-box;
background:#b84e3f;color:#fff;font:700 11px/20px system-ui,sans-serif;text-align:center;display:none}
.bag-back{position:fixed;inset:0;z-index:50;background:rgba(0,0,0,.55);display:none;align-items:center;justify-content:center;
touch-action:none;font-family:system-ui,-apple-system,sans-serif}
.bag-panel{width:min(380px,calc(100% - 24px));max-height:calc(100% - 24px);overflow:auto;overscroll-behavior:contain;box-sizing:border-box;
background:rgba(24,30,32,.97);color:#fff;border:1px solid rgba(255,255,255,.14);border-radius:16px;padding:14px;touch-action:pan-y}
.bag-head{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.bag-head b{font-size:18px}.bag-cap{opacity:.65;font-size:13px;flex:1}
.bag-x{width:40px;height:40px;border-radius:50%;border:0;background:rgba(255,255,255,.1);color:#fff;font:400 24px/1 system-ui;cursor:pointer}
.bag-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.bag-slot{position:relative;aspect-ratio:1;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.07);
padding:6px;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.bag-slot.empty{cursor:default;background:rgba(255,255,255,.03)}
.bag-slot.sel{border-color:#e7a35f;background:rgba(231,163,95,.16)}
.bag-ico{display:block;width:100%;height:100%}
.bag-qty{position:absolute;right:5px;bottom:3px;font:700 12px system-ui,sans-serif;text-shadow:0 1px 3px #000}
.bag-info{margin-top:12px;min-height:74px;font-size:14px}
.bag-info .bag-name{font-weight:700;font-size:16px}.bag-info small{opacity:.65;font-weight:600}
.bag-info p{margin:4px 0 10px;opacity:.75}.bag-hint{opacity:.55;padding-top:6px}
.bag-acts{display:flex;gap:8px}
.bag-acts button{flex:1;min-height:44px;border-radius:10px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.08);color:#fff;
font:600 14px system-ui,sans-serif;cursor:pointer;touch-action:manipulation}
.rec{display:flex;align-items:center;gap:10px;padding:10px;margin-bottom:8px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06)}
.rec-ico{flex:0 0 46px;height:46px}
.rec-txt{flex:1;min-width:0;font-size:13px}.rec-txt b{font-size:15px;display:block}
.rec-txt span{display:block;opacity:.7;margin:2px 0 4px}
.rec-cost{font-weight:700;color:#8fe39a}.rec-cost.no{color:#ff8a78}
.rec-btn{flex:0 0 auto;min-width:64px;min-height:44px;border-radius:10px;border:0;background:#e7a35f;color:#1a1208;font:700 14px system-ui,sans-serif;cursor:pointer;touch-action:manipulation}
.rec-btn:disabled{background:rgba(255,255,255,.12);color:rgba(255,255,255,.4);cursor:default}
.hud-toast{position:fixed;z-index:60;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 150px);transform:translateX(-50%);
padding:8px 16px;border-radius:999px;background:rgba(0,0,0,.7);color:#fff;font:600 15px system-ui,sans-serif;
pointer-events:none;opacity:0;transition:opacity .25s;white-space:nowrap;max-width:calc(100% - 24px);overflow:hidden;text-overflow:ellipsis}
.hud-toast.show{opacity:1}
`;

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}
let cssDone = false;
function injectCss() {
  if (cssDone) return; cssDone = true;
  const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s);
}
// satu panel terbuka pada satu waktu
const panels = new Set();
const closeOthers = me => { for (const p of panels) if (p !== me) p.close(); };

// toast bersama (dipakai tas & menu Buat)
let toastEl = null, toastT = 0;
function toast(text) {
  injectCss();
  if (!toastEl) { toastEl = el("div", "hud-toast"); document.body.appendChild(toastEl); }
  toastEl.textContent = text; toastEl.classList.add("show");
  clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove("show"), 1700);
}

// ---------------------------------------------------------------- tombol aksi (tebang / api)
// show(null) menyembunyikan; show("chop") = Tebang; show("fire", "Nyalakan" | "Tambah kayu")
function createActionButton(onPress) {
  injectCss();
  const b = el("button", "hud-btn");
  b.id = "chopBtn"; b.type = "button";
  b.addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); onPress(); });
  document.body.appendChild(b);
  let key = null;
  return {
    el: b,
    show(kind, label) {
      const k = kind ? kind + "|" + (label || "") : null;
      if (k === key) return;
      key = k;
      if (!kind) { b.style.display = "none"; return; }
      b.style.display = "flex";
      b.classList.toggle("fire", kind === "fire" || kind === "cook");
      b.innerHTML = (kind === "fire" || kind === "cook" ? ICON_FLAME : ICON_AXE) + `<span>${label || "Tebang"}</span>`;
      b.setAttribute("aria-label", label || "Tebang pohon");
    },
  };
}

// tombol menembak (logo panah) di tengah bawah layar; tampil bila panah dipegang
function createShootButton(onPress) {
  injectCss();
  const b = el("button", "hud-btn", `${ICON_SHOOT}<span>Panah</span>`);
  b.id = "shootBtn"; b.type = "button"; b.setAttribute("aria-label", "Tembak panah");
  b.addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); onPress(); });
  document.body.appendChild(b);
  return { el: b, show(on) { b.style.display = on ? "flex" : "none"; } };
}

// ---------------------------------------------------------------- tas
function createInventory() {
  injectCss();
  const valid = s => (s && ITEMS[s.id] && s.n > 0) ? { id: s.id, n: Math.min(s.n | 0, ITEMS[s.id].stack) } : null;
  let slots = Array(SLOTS).fill(null);
  try {
    const a = JSON.parse(localStorage.getItem(KEY));
    if (Array.isArray(a)) slots = Array.from({ length: SLOTS }, (_, i) => valid(a[i]));
  } catch { /* penyimpanan tidak tersedia / rusak: mulai kosong */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(slots)); } catch { /* abaikan */ } };
  const listeners = [];

  const btn = el("button", "hud-btn", `${ICON_BAG}<span class="bag-badge"></span>`);
  btn.id = "bagBtn"; btn.type = "button"; btn.setAttribute("aria-label", "Tas");
  const badge = btn.querySelector(".bag-badge");
  const back = el("div", "bag-back");
  const panel = el("div", "bag-panel", `<div class="bag-head"><b>Tas</b><span class="bag-cap"></span><button class="bag-x" type="button" aria-label="Tutup">×</button></div><div class="bag-grid"></div><div class="bag-info"></div>`);
  back.appendChild(panel);
  const grid = panel.querySelector(".bag-grid"), cap = panel.querySelector(".bag-cap"), info = panel.querySelector(".bag-info");
  document.body.append(btn, back);

  let sel = -1, isOpen = false, held = null;

  // ----- hotbar: 4 kotak di bawah layar untuk senjata / alat (ketuk = pegang / simpan) -----
  const HKEY = "parkour_hotbar_v1", HN = 4;
  let hot = Array(HN).fill(null), hotLoaded = false;
  try { const a = JSON.parse(localStorage.getItem(HKEY)); if (Array.isArray(a)) { hot = Array.from({ length: HN }, (_, i) => HOLDABLE.has(a[i]) ? a[i] : null); hotLoaded = true; } } catch { /* mulai kosong */ }
  if (!hotLoaded) for (const s of slots) if (s && HOLDABLE.has(s.id) && !hot.includes(s.id) && hot.includes(null)) hot[hot.indexOf(null)] = s.id;
  const saveHot = () => { try { localStorage.setItem(HKEY, JSON.stringify(hot)); } catch { /* abaikan */ } };
  const bar = el("div", "hotbar"); bar.id = "hotbar"; document.body.appendChild(bar);
  function renderBar() {
    let changed = false;
    bar.textContent = "";
    hot.forEach((id, i) => {
      if (id && count(id) < 1) { hot[i] = null; id = null; changed = true; }   // barang habis -> kotak kosong
      const b = el("button", "hot-slot" + (id && held === id ? " sel" : ""));
      b.type = "button"; b.setAttribute("aria-label", id ? ITEMS[id].name : "Kotak kosong");
      b.innerHTML = `<span class="hot-key">${i + 1}</span>` + (id ? `<span class="hot-ico">${ITEMS[id].icon}</span><span class="hot-qty">${count(id)}</span>` : "");
      b.addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); selectHot(i); });
      bar.appendChild(b);
    });
    if (changed) saveHot();
  }
  function selectHot(i) {
    const id = hot[i];
    if (!id) { toast("Kotak kosong. Atur lewat Tas → Ke hotbar"); return; }
    setHeld(held === id ? null : id);
  }
  function toggleHot(id) {
    const i = hot.indexOf(id);
    if (i >= 0) hot[i] = null;
    else { const e = hot.indexOf(null); if (e < 0) { toast("Hotbar penuh"); return; } hot[e] = id; }
    saveHot(); render();
  }
  const useListeners = [], holdListeners = [];

  function render() {
    grid.textContent = "";
    slots.forEach((s, i) => {
      const b = el("button", "bag-slot" + (i === sel ? " sel" : "") + (s ? "" : " empty"));
      b.type = "button";
      if (s) b.innerHTML = `<span class="bag-ico">${ITEMS[s.id].icon}</span><span class="bag-qty">${s.n}</span>`;
      b.addEventListener("click", () => { sel = (s && sel !== i) ? i : -1; render(); });
      grid.appendChild(b);
    });
    const total = slots.reduce((a, s) => a + (s ? s.n : 0), 0);
    cap.textContent = `${slots.filter(Boolean).length}/${SLOTS} slot`;
    badge.textContent = total > 99 ? "99+" : total; badge.style.display = total ? "block" : "none";
    const s = slots[sel];
    info.innerHTML = s
      ? `<div class="bag-name">${ITEMS[s.id].name} <small>×${s.n}</small></div><p>${ITEMS[s.id].desc}</p><div class="bag-acts">${HEAL[s.id] ? '<button type="button" data-a="use">Makan 1</button>' : ''}${HOLDABLE.has(s.id) ? `<button type="button" data-a="hold">${held === s.id ? "Simpan" : "Pegang"}</button><button type="button" data-a="hot">${hot.includes(s.id) ? "Lepas hotbar" : "Ke hotbar"}</button>` : ''}<button type="button" data-a="one">Buang 1</button><button type="button" data-a="all">Buang semua</button></div>`
      : `<div class="bag-hint">Ketuk item untuk melihat detail.</div>`;
    renderBar();
    for (const f of listeners) f();
  }
  info.addEventListener("click", e => {
    const a = e.target.closest("button")?.dataset.a, s = slots[sel];
    if (!a || !s) return;
    if (a === "use") { for (const f of useListeners) { if (f(s.id) === true) { s.n--; if (s.n <= 0) { slots[sel] = null; sel = -1; } save(); render(); } break; } return; }
    if (a === "hot") { toggleHot(s.id); return; }
    if (a === "hold") { setHeld(held === s.id ? null : s.id); render(); return; }
    s.n -= a === "all" ? s.n : 1;
    if (s.n <= 0) { slots[sel] = null; sel = -1; }
    save(); render();
  });

  const self = { close() { isOpen = false; back.style.display = "none"; sel = -1; } };
  panels.add(self);
  function open() { closeOthers(self); isOpen = true; back.style.display = "flex"; render(); }
  const toggle = () => (isOpen ? self.close() : open());
  btn.addEventListener("click", toggle);
  panel.querySelector(".bag-x").addEventListener("click", self.close);
  back.addEventListener("click", e => { if (e.target === back) self.close(); });
  addEventListener("keydown", e => { if (e.code === "Escape" && isOpen) self.close(); });

  let pend = null, pendT = 0;
  function notify(id, n) {                      // "+3 Kayu" (jumlah menumpuk bila berturut-turut)
    pend = pend && pend.id === id ? { id, n: pend.n + n } : { id, n };
    toast(`+${pend.n} ${ITEMS[id].name}`);
    clearTimeout(pendT); pendT = setTimeout(() => { pend = null; }, 1300);
  }

  function add(id, n = 1) {                      // mengembalikan jumlah yang benar-benar masuk
    const def = ITEMS[id]; if (!def) return 0;
    let left = n;
    for (const s of slots) { if (!left) break; if (s && s.id === id && s.n < def.stack) { const t = Math.min(left, def.stack - s.n); s.n += t; left -= t; } }
    for (let i = 0; i < SLOTS && left > 0; i++) if (!slots[i]) { const t = Math.min(left, def.stack); slots[i] = { id, n: t }; left -= t; }
    const got = n - left;
    if (got && HOLDABLE.has(id) && !hot.includes(id)) { const e = hot.indexOf(null); if (e >= 0) { hot[e] = id; saveHot(); } }   // otomatis masuk hotbar
    if (got) { save(); render(); }
    return got;
  }
  function remove(id, n = 1) {                   // mengembalikan jumlah yang berhasil diambil
    let left = n;
    for (let i = SLOTS - 1; i >= 0 && left > 0; i--) {
      const s = slots[i]; if (!s || s.id !== id) continue;
      const t = Math.min(left, s.n); s.n -= t; left -= t; if (s.n <= 0) slots[i] = null;
    }
    if (left !== n) { save(); render(); }
    return n - left;
  }
  const count = id => slots.reduce((a, s) => a + (s && s.id === id ? s.n : 0), 0);
  function setHeld(id) { held = id && count(id) > 0 ? id : null; for (const f of holdListeners) f(held); render(); }

  render();
  return { button: btn, bar, selectHot, add, remove, count, name: id => ITEMS[id]?.name ?? id, toast, notify,
    open, close: self.close, toggle, onChange: f => listeners.push(f),
    onUse: f => useListeners.push(f), onHold: f => holdListeners.push(f), setHeld,
    get held() { return held && count(held) > 0 ? held : null; }, get isOpen() { return isOpen; } };
}

// ---------------------------------------------------------------- indikator HP pemain
function createHealth(max = 100) {
  injectCss();
  let hp = max, deathListeners = [];
  const wrap = el("div", "health-hud", `<span class="health-label">HP</span><div class="health-track"></div><b class="health-value"></b>`);
  Object.assign(wrap.style, { position:"fixed", zIndex:"8", top:"58px", left:"18px", width:"min(190px,42vw)", padding:"8px 10px", borderRadius:"12px", background:"#071311b8", border:"1px solid #ffffff35", color:"white", font:"700 11px system-ui", display:"grid", gridTemplateColumns:"22px 1fr 34px", gap:"7px", alignItems:"center", pointerEvents:"none" });
  const track=wrap.querySelector(".health-track"), fill=el("div","health-fill");
  Object.assign(track.style,{height:"7px",background:"#ffffff30",borderRadius:"9px",overflow:"hidden"});
  Object.assign(fill.style,{display:"block",height:"100%",width:"100%",background:"#65d68a",borderRadius:"9px",transition:"width .15s"});
  track.appendChild(fill);
  const value=wrap.querySelector(".health-value"); document.body.appendChild(wrap);
  function draw(){const pct=Math.max(0,hp/max*100);fill.style.width=pct+"%";fill.style.background=pct<30?"#e45d58":pct<60?"#e9b45d":"#65d68a";value.textContent=Math.ceil(hp)+"/"+max;}
  function set(v){const before=hp;hp=Math.max(0,Math.min(max,Number(v)||0));draw();if(before>0&&hp<=0)for(const f of deathListeners)f();}
  draw();
  return { get hp(){return hp;}, get max(){return max;}, damage(n){set(hp-n);}, heal(n){set(hp+n);}, set, update(){}, onDeath(f){deathListeners.push(f);} };
}

// ---------------------------------------------------------------- menu Buat (crafting)
// onCraft(resep) -> { ok, msg }. Resep "build" menutup menu setelah berhasil agar bangunan terlihat.
function createCrafting(inv, onCraft) {
  injectCss();
  const btn = el("button", "hud-btn", `${ICON_HAMMER}<span>Buat</span>`);
  btn.id = "craftBtn"; btn.type = "button"; btn.setAttribute("aria-label", "Buat barang");
  const back = el("div", "bag-back");
  const panel = el("div", "bag-panel", `<div class="bag-head"><b>Buat</b><span class="bag-cap">Bahan diambil dari tas</span><button class="bag-x" type="button" aria-label="Tutup">×</button></div><div class="rec-list"></div>`);
  back.appendChild(panel);
  const list = panel.querySelector(".rec-list");
  document.body.append(btn, back);

  let isOpen = false;
  function render() {
    list.textContent = "";
    for (const r of RECIPES) {
      const need = Object.entries(r.cost), can = need.every(([k, n]) => inv.count(k) >= n);
      const costTxt = need.map(([k, n]) => `${inv.name(k)} ${inv.count(k)}/${n}`).join(", ");
      const row = el("div", "rec",
        `<span class="rec-ico">${r.icon}</span><div class="rec-txt"><b>${r.name}</b><span>${r.desc}</span><div class="rec-cost${can ? "" : " no"}">${costTxt}</div></div>`);
      const b = el("button", "rec-btn", "Buat"); b.type = "button"; b.disabled = !can;
      b.addEventListener("click", () => {
        const res = onCraft(r) || { ok: false };
        if (res.msg) toast(res.msg);
        if (res.ok && r.kind === "build") self.close(); else render();
      });
      row.appendChild(b); list.appendChild(row);
    }
  }
  const self = { close() { isOpen = false; back.style.display = "none"; } };
  panels.add(self);
  function open() { closeOthers(self); isOpen = true; back.style.display = "flex"; render(); }
  const toggle = () => (isOpen ? self.close() : open());
  btn.addEventListener("click", toggle);
  panel.querySelector(".bag-x").addEventListener("click", self.close);
  back.addEventListener("click", e => { if (e.target === back) self.close(); });
  addEventListener("keydown", e => { if (e.code === "Escape" && isOpen) self.close(); });
  inv.onChange(() => { if (isOpen) render(); });
  return { button: btn, open, close: self.close, toggle, get isOpen() { return isOpen; } };
}

return {createActionButton, createShootButton, createInventory, createHealth, createCrafting};
})();
M.fishing = (() => {
// ============================================================================
//  MEMANCING: pegang pancingan (dari tas) -> hadap laut -> tombol "Pancing" -> tunggu ikan menggigit -> "TARIK!"
//  Modul berdiri sendiri: model pancingan dipasang ke tangan kanan karakter, pelampung & senar digambar di scene.
// ============================================================================
const REL = .22, FLY = .6, SEG = 10;   // detik lemparan: lepas kail, lama melayang; jumlah ruas senar

function createFishing({ scene, world, player, rightArm, inv }) {
  const { lerp, clamp } = THREE.MathUtils;   // THREE baru ada setelah loading selesai
  const M = (c, r = .8) => new THREE.MeshStandardMaterial({ color: c, roughness: r });

  // ---- model pancingan (menempel di tangan kanan, miring ke depan-atas)
  const rod = new THREE.Group();
  rod.position.set(0, -.52, .06); rod.rotation.x = .6; rod.visible = false;
  const part = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; rod.add(o); return o; };
  part(new THREE.BoxGeometry(.075, .075, .5), M(0x4a3322), 0, 0, .18);          // pegangan
  part(new THREE.BoxGeometry(.04, .04, 1.9), M(0x9a7a45), 0, 0, 1.4);           // batang
  part(new THREE.BoxGeometry(.1, .1, .09), M(0xb8c2c9, .4), 0, -.08, .3);       // gulungan senar
  const tip = new THREE.Object3D(); tip.position.set(0, 0, 2.35); rod.add(tip);
  rightArm.add(rod);

  // ---- pelampung, senar, riak air
  const bobber = new THREE.Group();
  const top = new THREE.Mesh(new THREE.SphereGeometry(.13, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(0xd8412f, .5));
  const bot = new THREE.Mesh(new THREE.SphereGeometry(.13, 10, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M(0xf4f0e6, .5));
  bobber.add(top, bot); bobber.visible = false; scene.add(bobber);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array((SEG + 1) * 3), 3));
  const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .75 }));
  line.frustumCulled = false; line.visible = false; scene.add(line);
  const ripple = new THREE.Mesh(new THREE.RingGeometry(.2, .28, 24).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .4, depthWrite: false, side: THREE.DoubleSide }));
  ripple.visible = false; scene.add(ripple);

  let state = "idle", t = 0, waitT = 0, biteT = 0, tug = 0, ox = 0, oz = 0, clk = 0;
  const target = new THREE.Vector3(), from = new THREE.Vector3(), tmp = new THREE.Vector3();
  const holding = () => inv.held === "pancing";

  function canCast() { return holding() && !!world.fishSpot(player.position.x, player.position.z, player.rotation.y); }
  function reset() { state = "idle"; bobber.visible = line.visible = ripple.visible = false; }

  function cast() {
    const sp = world.fishSpot(player.position.x, player.position.z, player.rotation.y);
    if (!sp) return;
    target.set(sp.x, world.waterY(), sp.z);
    tip.getWorldPosition(from);
    state = "cast"; t = 0; ox = player.position.x; oz = player.position.z;
    bobber.position.copy(from); bobber.visible = line.visible = true;
  }
  function catchFish() {
    const n = Math.random() < .12 ? 2 : 1;
    const got = inv.add("ikan", n);
    if (got > 0) inv.notify("ikan", got); else inv.toast("Tas penuh!");
  }
  // tombol aksi: lempar -> (batal saat menunggu) -> tarik saat ikan menggigit
  function press() {
    if (state === "idle") { if (holding()) cast(); return; }
    if (state === "wait") { reset(); inv.toast("Pancingan ditarik"); return; }
    if (state === "bite") { reset(); tug = .45; catchFish(); }
  }
  function drawLine(sag) {
    tip.getWorldPosition(tmp);
    const p = lineGeo.attributes.position, b = bobber.position;
    for (let i = 0; i <= SEG; i++) {
      const u = i / SEG;
      p.setXYZ(i, lerp(tmp.x, b.x, u), lerp(tmp.y, b.y, u) - sag * 4 * u * (1 - u), lerp(tmp.z, b.z, u));
    }
    p.needsUpdate = true;
  }
  function update(dt, time) {
    clk = time;
    if (tug > 0) tug -= dt;
    if (state === "idle") return;
    if (!holding()) { reset(); return; }
    if (Math.hypot(player.position.x - ox, player.position.z - oz) > 3.5) { reset(); inv.toast("Pancingan ditarik"); return; }
    t += dt;
    const wy = world.waterY();
    if (state === "cast") {
      if (t < REL) { tip.getWorldPosition(from); bobber.position.copy(from); }
      else {
        const u = Math.min(1, (t - REL) / FLY);
        bobber.position.lerpVectors(from, target, u); bobber.position.y += Math.sin(u * Math.PI) * 2.4;
        if (u >= 1) { state = "wait"; waitT = 3 + Math.random() * 6; ripple.visible = true; ripple.position.set(target.x, wy + .03, target.z); }
      }
      drawLine(.1);
    } else if (state === "wait") {
      bobber.position.set(target.x, wy + .04 + Math.sin(clk * 2.2) * .03, target.z);
      const k = (clk * .8) % 1; ripple.scale.setScalar(1 + k * 1.6); ripple.material.opacity = .35 * (1 - k);
      waitT -= dt;
      if (waitT <= 0) { state = "bite"; biteT = 1.4; inv.toast("Ikan menggigit! Tarik!"); }
      drawLine(.3);
    } else if (state === "bite") {
      bobber.position.set(target.x + Math.sin(clk * 40) * .05, wy - .12 + Math.sin(clk * 26) * .05, target.z);
      const k = (clk * 3) % 1; ripple.scale.setScalar(1 + k * 1.2); ripple.material.opacity = .6 * (1 - k);
      biteT -= dt;
      if (biteT <= 0) { reset(); inv.toast("Ikan lolos…"); }
      drawLine(.15);
    }
  }
  // sudut lengan kanan (rotation.x) saat memegang pancingan
  function armPose(time) {
    if (tug > 0) return { rA: -1.25 - Math.sin((1 - tug / .45) * Math.PI) * .95 };
    if (state === "cast") return { rA: t < .18 ? -2.5 : lerp(-2.5, -.7, clamp((t - .18) / .25, 0, 1)) };
    if (state === "bite") return { rA: -1.05 + Math.sin(time * 34) * .07 };
    if (state === "wait") return { rA: -1.25 + Math.sin(time * 1.4) * .025 };
    return { rA: -1.2 };
  }

  return { rod, press, update, armPose, canCast, cancel: reset,
    get busy() { return state !== "idle"; },
    get label() { return state === "bite" ? "TARIK!" : state === "wait" ? "Batal" : "…"; } };
}

return {createFishing};
})();
M.monsters = (() => {
// ============================================================================
//  MONSTER MALAM: muncul saat malam, mengejar pemain, serangan ringan (5-7 HP) dengan jeda ~1,5 detik.
//  Bisa dilawan dengan kapak (3 tebasan), kalah cepat dari pemain yang berlari, takut api unggun menyala.
//  Menghilang saat pagi. world: groundAt, inside, collide, litFireNear, inHouse, night (dari map.js).
// ============================================================================
const MAX = 4, SPEED = 3.4, ATK_RANGE = 1.28, WINDUP = .35;

function createMonsters({ scene, world }) {
  const list = [];
  let hitCb = null, spawnT = 3;
  const bodyM = new THREE.MeshStandardMaterial({ color: 0x2a2040, roughness: .85, emissive: 0x1b1030, emissiveIntensity: .7 });
  const darkM = new THREE.MeshStandardMaterial({ color: 0x120d1c, roughness: .9, emissive: 0x0a0612, emissiveIntensity: .6 });
  const eyeM = new THREE.MeshBasicMaterial({ color: 0xff3a2a });
  const gSphere = new THREE.SphereGeometry(1, 12, 10), gBox = new THREE.BoxGeometry(1, 1, 1), gCone = new THREE.ConeGeometry(1, 1, 6);
  const part = (geo, m, parent, x, y, z, sx, sy, sz) => {
    const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.castShadow = true; parent.add(o); return o;
  };

  function make() {
    const g = new THREE.Group();
    part(gSphere, bodyM, g, 0, 1.0, 0, .55, .62, .5);
    const head = new THREE.Group(); head.position.set(0, 1.85, .08); g.add(head);
    part(gSphere, bodyM, head, 0, 0, 0, .36, .34, .34);
    for (const sx of [-1, 1]) {
      part(gSphere, eyeM, head, sx * .14, .04, .27, .07, .07, .05);
      part(gCone, darkM, head, sx * .2, .34, 0, .09, .3, .09).rotation.z = -sx * .35;
    }
    const arms = [], legs = [];
    for (const sx of [-1, 1]) {
      const arm = new THREE.Group(); arm.position.set(sx * .58, 1.38, 0); g.add(arm);
      part(gBox, darkM, arm, 0, -.4, 0, .15, .8, .15);
      part(gCone, darkM, arm, 0, -.9, 0, .1, .22, .1).rotation.x = Math.PI;
      arms.push(arm);
      const leg = new THREE.Group(); leg.position.set(sx * .2, .62, 0); g.add(leg);
      part(gBox, darkM, leg, 0, -.31, 0, .2, .62, .2);
      legs.push(leg);
    }
    return { g, head, arms, legs };
  }

  function spawn(x, z) {
    const m = Object.assign(make(), { isMonster: true, x, z, y: world.groundAt(x, z), hp: 3, s: 0, cd: 1, atk: -1, kx: 0, kz: 0,
      ph: Math.random() * 6, dead: false, leaving: false });
    m.g.position.set(x, m.y, z); m.g.scale.setScalar(.01); scene.add(m.g); list.push(m);
  }
  function trySpawn(pp) {
    for (let k = 0; k < 12; k++) {
      const a = Math.random() * 6.283, d = 26 + Math.random() * 14;
      const x = pp.x + Math.sin(a) * d, z = pp.z + Math.cos(a) * d;
      if (world.inside(x, z) < 14 || world.inHouse(x, z, 1.5) || world.litFireNear(x, z, 9)) continue;
      spawn(x, z); return;
    }
  }

  function update(dt, pp, t) {
    const night = world.night;
    spawnT -= dt;
    if (night > .6 && list.length < MAX && spawnT <= 0) { spawnT = 6 + Math.random() * 6; trySpawn(pp); }
    for (let i = list.length - 1; i >= 0; i--) {
      const m = list[i];
      const dx = pp.x - m.x, dz = pp.z - m.z, d = Math.hypot(dx, dz) || .001;
      if (night < .3 || d > 95) m.leaving = true;
      if (m.dead || m.leaving) { m.s -= dt * 1.6; if (m.s <= 0) { scene.remove(m.g); list.splice(i, 1); continue; } }
      else if (m.s < 1) m.s = Math.min(1, m.s + dt * 1.3);
      m.g.scale.setScalar(Math.max(.01, m.s));
      const active = m.s >= 1 && !m.dead && !m.leaving;

      let mx = 0, mz = 0, moving = false;
      if (active && d < 45) {
        const ux = dx / d, uz = dz / d;
        if (world.litFireNear(m.x, m.z, 8)) { mx = -ux * SPEED; mz = -uz * SPEED; }        // takut api unggun
        else if (d > 1.1) { const sp = d < 12 ? SPEED * 1.15 : SPEED; mx = ux * sp; mz = uz * sp; }
        moving = mx !== 0 || mz !== 0;
      }
      mx += m.kx; mz += m.kz; const kd = Math.exp(-dt * 7); m.kx *= kd; m.kz *= kd;
      const nx = m.x + mx * dt, nz = m.z + mz * dt;
      if (world.inside(nx, nz) > 8) { m.x = nx; m.z = nz; }                                  // tidak masuk laut
      world.collide(m, .55);                                                                 // tidak tembus rumah / api
      m.y = world.groundAt(m.x, m.z);

      // serangan: aba-aba 0,35 dtk (bisa dihindari dengan bergerak menjauh), lalu jeda 1,5 dtk
      if (m.cd > 0) m.cd -= dt;
      if (m.atk >= 0) {
        m.atk -= dt;
        if (m.atk < 0) {
          m.cd = 1.5;
          if (active && d < ATK_RANGE + .02 && hitCb) hitCb(5 + Math.floor(Math.random() * 3), dx / d, dz / d);
        }
      } else if (active && m.cd <= 0 && d < ATK_RANGE) m.atk = WINDUP;

      // animasi
      const spd = Math.hypot(mx, mz);
      m.ph += dt * spd * 3;
      const sw = Math.sin(m.ph), lunge = m.atk >= 0 ? 1 - m.atk / WINDUP : 0;
      m.legs[0].rotation.x = sw * .7; m.legs[1].rotation.x = -sw * .7;
      m.arms[0].rotation.x = -1.1 - lunge * .9 - (moving ? sw * .25 : 0);
      m.arms[1].rotation.x = -1.1 - lunge * .9 + (moving ? sw * .25 : 0);
      m.head.rotation.x = Math.sin(t * 1.5 + m.ph) * .1;
      m.g.position.set(m.x, m.y + (moving ? Math.abs(sw) * .08 : Math.sin(t * 2 + m.ph) * .02), m.z);
      let df = Math.atan2(dx, dz) - m.g.rotation.y; df = Math.atan2(Math.sin(df), Math.cos(df));
      m.g.rotation.y += df * (1 - Math.exp(-dt * 8));
    }
  }

  function hit(m, dmg, fx, fz) {
    if (!m || m.dead) return;
    m.hp -= dmg;
    const dx = m.x - fx, dz = m.z - fz, d = Math.hypot(dx, dz) || 1;
    m.kx = dx / d * 8; m.kz = dz / d * 8;
    if (m.hp <= 0) m.dead = true;
  }
  function nearest(x, z, range) {
    let best = null, bd = range * range;
    for (const m of list) {
      if (m.dead || m.leaving || m.s < .9) continue;
      const dx = m.x - x, dz = m.z - z, d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  }
  function clearNear(x, z, r) { for (const m of list) if (Math.hypot(m.x - x, m.z - z) < r) m.dead = true; }

  return { update, hit, nearest, clearNear, onHit: f => { hitCb = f; }, get count() { return list.length; } };
}

return {createMonsters};
})();

/* =====================================================================
   6. BOOT
   ===================================================================== */
injectCss();
buildGameDom();
requestAnimationFrame(frame);
(async () => {
  try {
    let three = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
    try { three = import.meta.resolve("three"); } catch (_) {}

    // Firebase (opsional: bila gagal, game tetap jalan tanpa multiplayer)
    const net = (async () => {
      try {
        const base = "https://www.gstatic.com/firebasejs/13.4.0/";
        const [a, d] = await Promise.all([import(base + "firebase-app.js"), import(base + "firebase-database.js")]);
        FB = { initializeApp: a.initializeApp, getDatabase: d.getDatabase, ref: d.ref, set: d.set, get: d.get, remove: d.remove, push: d.push, dbUpdate: d.update, onValue: d.onValue, onDisconnect: d.onDisconnect, serverTimestamp: d.serverTimestamp, runTransaction: d.runTransaction };
      } catch (e) { console.warn("Firebase tidak termuat:", e); }
      finally { st.net = 1; recompute(); }
    })();

    await pull(three, "engine", 1250000);
    THREE = await import(three);

    // Modul game + lobby dimuat paralel, progres dihitung per modul
    const names = ["./map.js", "./intro.js", "./lobby.js"];
    const keysOf = ["map", "intro", "lobby"];
    let loaded = 0;
    const mods = await Promise.all(names.map(p => import(p).then(m => { st.game = ++loaded / names.length; recompute(); return m; })));
    keysOf.forEach((k, i) => { M[k] = mods[i]; });
    await net;
    finish();
  } catch (error) { fail(error); }
})();
