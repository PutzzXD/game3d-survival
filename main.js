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
#mpDock{position:absolute;z-index:8;left:max(10px,env(safe-area-inset-left));top:calc(62px + env(safe-area-inset-top));display:flex;gap:6px}
#mpDock button{position:relative;display:flex;align-items:center;gap:7px;height:36px;padding:0 12px 0 10px;color:#d6dfd8;background:#0f1c19e6;border:1px solid #2f4a41;border-radius:8px;font:600 12px/1 "Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;letter-spacing:.3px;cursor:pointer;transition:background .15s,border-color .15s,color .15s}
#mpDock button:hover{border-color:#5f8074}
#mpDock button:focus-visible{outline:2px solid #f0a45d;outline-offset:2px}
#mpDock button[aria-pressed="true"]{color:#172522;background:#f0a45d;border-color:#f0a45d}
#mpDock .dot{position:absolute;top:-3px;right:-3px;width:9px;height:9px;border-radius:50%;background:#f0a45d;border:2px solid #172522}
#mpDock .dot[hidden]{display:none}
.ico{display:inline-flex;flex:none}

/* --- panel umum di kiri (chat, misi, profil) --- */
.mp-panel{position:absolute;z-index:9;left:max(10px,env(safe-area-inset-left));top:calc(106px + env(safe-area-inset-top));width:min(290px,calc(100vw - 20px));max-height:calc(100% - 190px);display:flex;flex-direction:column;color:#e9e4d6;background:#12211df2;border:1px solid #2f4a41;border-radius:10px;font:13px/1.4 system-ui,sans-serif;overflow:hidden}
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
.ms-coin{display:flex;align-items:center;gap:6px;color:#f0a45d;font:600 14px "Iowan Old Style",Palatino,Georgia,serif;font-variant-numeric:tabular-nums}
.ms{padding:11px 0;border-bottom:1px solid #22382f}.ms:first-child{padding-top:0}.ms:last-of-type{border-bottom:0}
.ms-top{display:flex;align-items:center;justify-content:space-between;gap:10px}
.ms-t{display:flex;align-items:center;gap:6px;font-weight:600}
.ms.done .ms-t{color:#9fd3a8}
.ms-r{font-size:12px;color:#f0a45d;font-variant-numeric:tabular-nums}.ms.done .ms-r{color:#6f877c;text-decoration:line-through}
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
    `<div class="hud"><div class="brand">SURVIVAL <span>LOST WORLD</span></div><div class="status">OFFLINE DEMO <i></i></div></div>
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
  const chip = document.querySelector(".status");
  chip.replaceChildren(document.createTextNode(`${acc.username}${acc.role === "admin" ? " " : ""}`));
  if (acc.role === "admin") { const verified = document.createElement("span"); verified.className = "admin-verified"; verified.textContent = "✓"; chip.append(verified); }
  chip.append(document.createTextNode(`, ID ${acc.id} `));
  A.go.disabled = true; A.go.textContent = "Membuka lobby…";
  try {
    if (FB) { try { window.mp = createMultiplayer(acc); } catch (e) { console.warn("Multiplayer tidak aktif:", e); } }
    const lobby = M.lobby.createLobby({
      account: acc,
      onPlay: async () => { await startGame(); lobby.leave(); },   // game baru berjalan setelah tombol Main
      onLogout: logout
    });
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
  chat: '<path d="M4 5.5h16v10H10l-4 3.5v-3.5H4z"/>',
  flag: '<path d="M6 21V4"/><path d="M6 5h11l-2 4 2 4H6"/>',
  send: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  coin: '<circle cx="12" cy="12" r="8"/><path d="M12 8v8"/>'
};
function ico(name, size = 18) {
  const w = document.createElement("span"); w.className = "ico";
  w.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
  return w;
}
const fmtNum = n => Number(n || 0).toLocaleString("id-ID");
const fmtClock = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function createMultiplayer(me) {
  const { initializeApp, getDatabase, ref, set, get, remove, push, dbUpdate, onValue, onDisconnect, serverTimestamp, runTransaction } = FB;
  const db = getDatabase(initializeApp(FB_CFG, "mp")), meRef = ref(db, "online/" + me.id);
  const blankData = () => ({ coins: 0, chopCount: 0, survivalSeconds: 0, streak: 0, missions: {} });
  let survivalFlush = 0, survivalBuffer = 0, localBubbleCanvas = null, localBubbleTexture = null, localBubbleSprite = null;
  let others = {}, friends = {}, offset = 0, inGame = 0, G = null, last = { x: 0, y: 0, z: 0, r: 0 }, lastSend = 0, myParty = me.id, pend = [], H = {}, lastToggle = 0;
  let chatItems = [], chatReady = false, profileData = blankData(), typingTimer = 0, lastTyping = "";
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
  onValue(ref(db, "online"), s => { others = s.val() || {}; delete others[me.id]; render(); });
  onValue(ref(db, "friends/" + me.id), s => { friends = s.val() || {}; render(); });

  // ---------- Data pemain: koin & misi ----------
  const dataRef = ref(db, "playerData/" + me.id);
  onValue(dataRef, s => { profileData = { ...blankData(), ...(s.val() || {}) }; drawMissions(); });
  async function mutateData(fn) {
    const result = await runTransaction(dataRef, current => { const d = current || blankData(); fn(d); return d; });
    if (result.committed) profileData = { ...profileData, ...(result.snapshot.val() || {}) };
    drawMissions(); return result.committed;
  }
  const day = ms => new Date(ms).toISOString().slice(0, 10);
  // Login harian: 1.000 koin, streak dihitung sampai 5 hari.
  mutateData(d => {
    const today = day(Date.now()), yesterday = day(Date.now() - 86400000);
    if (d.lastLogin === today) return;
    d.streak = d.lastLogin === yesterday ? Math.min(5, (d.streak || 0) + 1) : 1;
    d.lastLogin = today; d.coins = (d.coins || 0) + 1000; d.lastDailyReward = today;
  }).catch(() => {});

  onValue(ref(db, "invites/" + me.id), s => {
    pend = Object.entries(s.val() || {}).filter(([, i]) => i && Date.now() + offset - (i.t || 0) < 300000).map(([id, i]) => ({ id, n: String(i.n || id).slice(0, 16) }));
    render(); H.pending?.(pend); toast();
  });
  setInterval(() => render(), 10000);

  // ---------- Panel "Pemain" (teman / party) ----------
  const root = h("div", "game"); root.id = "mp";   // tersembunyi sampai lobby aktif
  const btn = h("button", "mp-btn"); btn.append("Pemain ", h("b", "", "0"));
  const pop = h("div", "mp-pop"); pop.hidden = true;
  const form = h("form", "mp-add"), input = h("input"), addBtn = h("button", "", "Tambah");
  input.placeholder = "Cari username atau ID"; input.inputMode = "text"; input.maxLength = 24; input.autocomplete = "off"; input.setAttribute("aria-label", "Username atau ID teman");
  form.append(input, addBtn);
  const search = h("input", "mp-search"); search.placeholder = "Filter pemain online…"; search.oninput = render;
  const msg = h("p", "mp-msg"), list = h("div");
  msg.setAttribute("role", "status"); pop.append(form, msg, search, list); root.append(btn, pop);
  gameEl.appendChild(root);
  btn.onclick = e => { e.stopPropagation(); pop.hidden = !pop.hidden; if (!pop.hidden) input.focus(); };
  document.addEventListener("click", e => { if (!root.contains(e.target) && performance.now() - lastToggle > 400) pop.hidden = true; });
  const sayMsg = (t, ok) => { msg.textContent = t; msg.className = "mp-msg" + (ok ? " ok" : ""); };

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
      await set(ref(db, `friends/${me.id}/${id}`), name); sayMsg(name + " ditambahkan.", true); input.value = "";
    } catch (e) { sayMsg("Gagal terhubung. Periksa Rules database."); }
  }
  form.onsubmit = e => { e.preventDefault(); addFriend(input.value.trim()); };

  // ---------- Party & undangan ----------
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
    myParty = party; await beat(); await remove(ref(db, `invites/${me.id}/${from}`)).catch(() => {}); render();
    return { ok: true, m: "Kamu bergabung ke party " + (host?.n || "temanmu") + "." };
  }
  async function decline(from) { await remove(ref(db, `invites/${me.id}/${from}`)).catch(() => {}); return { ok: true, m: "Undangan ditolak." }; }
  async function leaveParty() { myParty = me.id; await beat(); render(); }

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
  const chatBtn = h("button"), missionBtn = h("button");
  chatBtn.type = missionBtn.type = "button";
  chatBtn.setAttribute("aria-pressed", "false"); missionBtn.setAttribute("aria-pressed", "false");
  const chatDot = h("i", "dot"); chatDot.hidden = true;
  chatBtn.append(ico("chat", 17), "Chat", chatDot);
  missionBtn.append(ico("flag", 17), "Misi");
  dock.append(chatBtn, missionBtn); gameEl.appendChild(dock);

  const chat = panel("mpChat", "Chat global"), missions = panel("mpMissions", "Misi"), profile = panel("mpProfile", "Profil");
  const chatCount = h("small"); chat.x.before(chatCount);
  const chatLog = h("div", "gc-log"); chatLog.setAttribute("role", "log"); chatLog.setAttribute("aria-live", "polite");
  const chatForm = h("form", "gc-form"), chatInput = h("input"), chatSend = h("button");
  chatInput.placeholder = "Tulis pesan, Enter untuk kirim"; chatInput.maxLength = 180; chatInput.autocomplete = "off"; chatInput.setAttribute("aria-label", "Pesan chat");
  chatSend.type = "submit"; chatSend.setAttribute("aria-label", "Kirim"); chatSend.append(ico("send", 16));
  chatForm.append(chatInput, chatSend);
  const chatNote = h("p", "gc-note"); chatNote.setAttribute("role", "status");
  chat.body.append(chatLog, chatForm, chatNote);

  let active = null, unread = 0;
  function setPanel(name) {
    active = active === name ? null : name;
    chat.el.hidden = active !== "chat"; missions.el.hidden = active !== "missions"; profile.el.hidden = true;
    chatBtn.setAttribute("aria-pressed", String(active === "chat")); missionBtn.setAttribute("aria-pressed", String(active === "missions"));
    if (active === "chat") { unread = 0; chatDot.hidden = true; drawChat(); chatInput.focus(); }
    else if (active === "missions") drawMissions();
    else if (document.activeElement === chatInput) chatInput.blur();
  }
  chatBtn.onclick = () => setPanel("chat");
  missionBtn.onclick = () => setPanel("missions");
  chat.x.onclick = () => { if (active === "chat") setPanel("chat"); };
  missions.x.onclick = () => { if (active === "missions") setPanel("missions"); };
  profile.x.onclick = () => { profile.el.hidden = true; };
  addEventListener("keydown", e => {
    const tag = e.target.tagName;
    if (e.key === "Escape") { if (!profile.el.hidden) profile.el.hidden = true; else if (active) setPanel(active); }
    else if (e.key === "Enter" && !/INPUT|TEXTAREA|BUTTON/.test(tag) && active !== "chat") setPanel("chat");
  });

  // Misi: kartu dengan bar progres
  function missionRow(title, reward, cur, max, done, progressText) {
    const r = h("div", "ms" + (done ? " done" : "")), top = h("div", "ms-top"), t = h("span", "ms-t");
    if (done) t.append(ico("check", 14)); t.append(title);
    top.append(t, h("span", "ms-r", "+" + fmtNum(reward)));
    const bar = h("div", "ms-bar"), fill = h("i"); fill.style.width = Math.min(100, cur / max * 100) + "%"; bar.append(fill);
    r.append(top, bar, h("div", "ms-p", progressText)); return r;
  }
  function drawMissions() {
    const m = profileData.missions || {}, streak = Math.min(5, profileData.streak || 0);
    const chop = Math.min(5, profileData.chopCount || 0), sv = Math.min(600, Math.floor(profileData.survivalSeconds || 0));
    const claimedToday = profileData.lastDailyReward === day(Date.now());
    missions.title.replaceChildren("Misi");
    const coin = h("div", "ms-coin"); coin.append(ico("coin", 16), fmtNum(profileData.coins)); coin.title = "Koin";
    missions.x.before(coin);
    missions.head.querySelectorAll(".ms-coin").forEach((c, i, all) => { if (i < all.length - 1) c.remove(); });
    missions.body.replaceChildren(
      missionRow("Tebang 5 pohon", 500, chop, 5, !!m.chop5, `${chop} / 5 pohon`),
      missionRow("Bertahan 10 menit", 1000, sv, 600, !!m.survive10, `${fmtClock(sv)} / 10:00`)
    );
    const daily = h("div", "ms"), top = h("div", "ms-top"), pips = h("div", "ms-pips");
    top.append(h("span", "ms-t", "Login harian"), h("span", "ms-r", "+" + fmtNum(1000)));
    for (let i = 0; i < 5; i++) pips.append(h("i", i < streak ? "on" : ""));
    daily.append(top, pips, h("div", "ms-p", `Hari ke-${streak} dari 5${claimedToday ? " · hadiah hari ini sudah diambil" : ""}`));
    missions.body.append(daily, h("p", "ms-foot", "Hadiah masuk otomatis begitu misi selesai."));
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
    active = null; chat.el.hidden = true; missions.el.hidden = true;
    chatBtn.setAttribute("aria-pressed", "false"); missionBtn.setAttribute("aria-pressed", "false");
    profile.el.hidden = false; profile.title.textContent = "Memeriksa akun…"; profile.body.replaceChildren();
    try {
      const presence = others[id] || {};
      const key = (await get(ref(db, "ids/" + id))).val();
      const user = key ? (await get(ref(db, "users/" + key))).val() : null;
      const data = (await get(ref(db, "playerData/" + id))).val() || {};
      profile.title.textContent = (user?.name || presence.n || fallback || "Player") + (user?.role === "admin" ? " ✓" : "");
      const row = (k, v) => { const r = h("div", "pf-row"); r.append(h("span", "", k), h("b", "", v)); return r; };
      profile.body.replaceChildren(
        row("ID", id),
        row("Status", alive(presence) ? (presence.g ? "Sedang bermain" : "Di lobby") : "Offline"),
        row("Koin", fmtNum(data.coins)),
        row("Login streak", `${data.streak || 0} / 5 hari`)
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
    btn.lastChild.textContent = on.length; H.count?.(fOnline());
    list.replaceChildren();
    if (pend.length) {
      list.append(h("p", "mp-h", "Undangan"));
      pend.forEach(i => list.append(row(i.n, "mengundangmu main", true, ["Terima", () => act(accept(i.id))], ["Tolak", () => act(decline(i.id)), "x"])));
    }
    const party = inParty();
    if (party.length) { list.append(h("p", "mp-h", `Party (${party.length + 1}/4)`)); list.append(row(party.map(([, o]) => o.n).join(", "), "kamu bermain bersama mereka", true, ["Keluar", leaveParty, "x"])); }
    const fr = Object.entries(friends).map(([id, n]) => ({ id, n, o: alive(others[id]) ? others[id] : null })).sort((a, b) => !!b.o - !!a.o);
    list.append(h("p", "mp-h", fr.length ? "Teman" : "Belum ada teman. Masukkan ID temanmu di atas."));
    fr.forEach(f => {
      const same = f.o && f.o.p === myParty, btns = [];
      if (f.o && !same) btns.push(["Undang", () => act(invite(f.id))]);
      btns.push(["Periksa", () => inspectPlayer(f.id, f.n), "mp-profile-action"]);
      btns.push(["Hapus", () => remove(ref(db, `friends/${me.id}/${f.id}`)), "x"]);
      list.append(row(f.n, f.o ? (same ? "satu party" : f.o.g ? "sedang main" : "di lobby") : "offline", !!f.o, ...btns));
    });
    const term = search.value.trim().toLowerCase();
    const rest = on.filter(([id, o]) => !friends[id] && (!term || String(o.n || "").toLowerCase().includes(term) || id.includes(term))).slice(0, 12);
    if (rest.length) { list.append(h("p", "mp-h", "Online sekarang")); rest.forEach(([id, o]) => list.append(row(o.n + (o.a ? " ✓" : ""), "ID " + id, true, ["Periksa", () => inspectPlayer(id, o.n), "mp-profile-action"], ["Tambah", () => addFriend(id)]))); }
  }
  render();

  // ---------- Pemain lain di dunia game ----------
  const avatars = new Map();
  function makeAvatar(T, id, name, isAdmin = false) {
    const m = (c, r = 0.82) => new T.MeshStandardMaterial({ color: c, roughness: r });
    const jacket = m(new T.Color().setHSL((parseInt(id.slice(-4), 10) * 47 % 360) / 360, 0.4, 0.32)), skin = m(0xf0c5a5), pants = m(0x303b43), boots = m(0x211f21), hair = m(0x171923), red = m(0xb84e3f);
    const g = new T.Group(), body = new T.Group(); body.position.y = -0.37; g.add(body);
    const add = (geo, mt, p, x, y, z, sx = 1, sy = 1, sz = 1) => { const o = new T.Mesh(geo, mt); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.castShadow = true; p.add(o); return o; };
    const cap = (p, r, l, mt, x, y, z) => add(new T.CapsuleGeometry(r, l, 5, 8), mt, p, x, y, z);
    const legs = [-0.19, 0.19].map(x => { const l = new T.Group(); l.position.set(x, 1.05, 0); body.add(l); cap(l, 0.115, 0.48, pants, 0, -0.32, 0); add(new T.BoxGeometry(0.25, 0.14, 0.43), boots, l, 0, -0.62, 0.07); return l; });
    const torso = new T.Group(); torso.position.y = 1.25; body.add(torso);
    add(new T.CapsuleGeometry(0.34, 0.48, 6, 10), jacket, torso, 0, 0.18, 0, 1, 0.9, 0.72);
    add(new T.BoxGeometry(0.42, 0.5, 0.24), m(0x4b4034), torso, 0, 0.15, -0.27);
    const arms = [-0.39, 0.39].map(x => { const a = new T.Group(); a.position.set(x, 0.42, 0); torso.add(a); cap(a, 0.105, 0.42, jacket, 0, -0.25, 0); add(new T.SphereGeometry(0.105, 10, 8), skin, a, 0, -0.51, 0.015); return a; });
    add(new T.SphereGeometry(0.32, 16, 12), skin, body, 0, 2.22, 0, 0.88, 1.08, 0.82);
    add(new T.SphereGeometry(0.33, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), hair, body, 0, 2.35, -0.025, 1.02, 0.88, 1);
    add(new T.BoxGeometry(0.48, 0.12, 0.38), red, body, 0, 1.91, -0.02);
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
  const addSurvival = seconds => mutateData(d => {
    d.survivalSeconds = Math.min(600, (d.survivalSeconds || 0) + seconds); d.missions ||= {};
    if (d.survivalSeconds >= 600 && !d.missions.survive10) { d.missions.survive10 = true; d.coins = (d.coins || 0) + 1000; }
  }).catch(() => {});

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
            if (!o.g || !alive(o) || o.x == null) continue;
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
    treeChopped() {
      mutateData(d => { d.chopCount = Math.min(5, (d.chopCount || 0) + 1); d.missions ||= {}; if (d.chopCount >= 5 && !d.missions.chop5) { d.missions.chop5 = true; d.coins = (d.coins || 0) + 500; } }).catch(() => {});
    },
    updateSurvival(seconds) { if (seconds && seconds >= 1) addSurvival(seconds); },
    setTyping(value) { broadcastTyping(value); },
    dock(modeName) { root.classList.toggle("lobby", modeName === "lobby"); root.classList.toggle("game", modeName !== "lobby"); if (modeName !== "lobby") pop.hidden = true; },
    setPhoto(url) { return set(ref(db, "profiles/" + me.id), url).catch(() => {}); },
    getPhoto() { return get(ref(db, "profiles/" + me.id)).then(s => s.val()).catch(() => null); },
    togglePanel() { lastToggle = performance.now(); pop.hidden = !pop.hidden; if (!pop.hidden) input.focus(); },
    onPending(cb) { H.pending = cb; if (cb) cb(pend); toast(); },
    onCount(cb) { H.count = cb; if (cb) cb(fOnline()); },
    leave() { inGame = 0; return remove(meRef).catch(() => {}); }
  };
}

/* =====================================================================
   5. GAME (dijalankan setelah tombol Main di lobby)
   ===================================================================== */
async function startGame() {
  if (started) return; started = true;
  const { createMap } = M.map, { createIntro } = M.intro, { createInventory, createCrafting, createActionButton, createHealth } = M.hud;
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
  const skin = mat(0xf0c5a5), hair = mat(0x171923), jacket = mat(0x273b3d);
  const red = mat(0xb84e3f), pants = mat(0x303b43), boots = mat(0x211f21);
  const strap = mat(0x9b7650), dark = mat(0x20252b), white = mat(0xf4eee4);
  const glow = new THREE.MeshStandardMaterial({ color: 0xe7a35f, emissive: 0x8c3c0c, emissiveIntensity: .45 });

  const player = new THREE.Group();
  scene.add(player);
  const mpGame = window.mp?.attachGame({ THREE, scene, player }); // multiplayer: pemain lain + kirim posisi
  const FOOT = .37; // tinggi telapak sepatu dari origin model
  const body = new THREE.Group();
  body.position.y = -FOOT;
  player.add(body);

  function add(geo, material, parent, x, y, z, sx = 1, sy = 1, sz = 1) {
    const o = new THREE.Mesh(geo, material);
    o.position.set(x, y, z); o.scale.set(sx, sy, sz);
    o.castShadow = true; o.receiveShadow = true; parent.add(o); return o;
  }
  function capsule(parent, r, len, material, x, y, z) {
    return add(new THREE.CapsuleGeometry(r, len, 5, 8), material, parent, x, y, z);
  }

  // Sumbu depan karakter adalah +Z. Kamera berada di belakang pada -Z.
  const leftLeg = new THREE.Group(), rightLeg = new THREE.Group();
  leftLeg.position.set(-.19, 1.05, 0); rightLeg.position.set(.19, 1.05, 0);
  body.add(leftLeg, rightLeg);
  for (const leg of [leftLeg, rightLeg]) {
    capsule(leg, .115, .48, pants, 0, -.32, 0);
    add(new THREE.BoxGeometry(.25, .14, .43), boots, leg, 0, -.62, .07);
  }

  const torso = new THREE.Group(); torso.position.y = 1.25; body.add(torso);
  add(new THREE.CapsuleGeometry(.34, .48, 6, 10), jacket, torso, 0, .18, 0, 1, .9, .72);
  add(new THREE.BoxGeometry(.48, .52, .08), red, torso, 0, .19, .265);
  add(new THREE.BoxGeometry(.13, .68, .13), strap, torso, -.24, .2, .22);
  add(new THREE.BoxGeometry(.22, .22, .18), strap, torso, .28, .03, .12);
  add(new THREE.BoxGeometry(.42, .5, .24), mat(0x4b4034), torso, 0, .15, -.27);
  add(new THREE.BoxGeometry(.18, .12, .08), glow, torso, .02, .28, .38);

  const leftArm = new THREE.Group(), rightArm = new THREE.Group();
  leftArm.position.set(-.39, .42, 0); rightArm.position.set(.39, .42, 0);
  torso.add(leftArm, rightArm);
  for (const arm of [leftArm, rightArm]) {
    capsule(arm, .105, .42, jacket, 0, -.25, 0);
    add(new THREE.SphereGeometry(.105, 10, 8), skin, arm, 0, -.51, .015);
    add(new THREE.BoxGeometry(.23, .12, .19), red, arm, 0, -.43, .02);
  }

  add(new THREE.CylinderGeometry(.105, .12, .18, 10), skin, body, 0, 1.92, 0);
  const head = new THREE.Group(); head.position.set(0, 2.22, 0); body.add(head);
  add(new THREE.SphereGeometry(.32, 20, 16), skin, head, 0, 0, 0, .88, 1.08, .82);
  add(new THREE.SphereGeometry(.33, 16, 12, 0, Math.PI * 2, 0, Math.PI * .62), hair, head, 0, .13, -.025, 1.02, .88, 1);
  for (let i = 0; i < 7; i++) {
    const a = -1.05 + i * .35;
    const spike = add(new THREE.ConeGeometry(.105, .34, 6), hair, head, Math.sin(a) * .23, .26, Math.cos(a) * .17);
    spike.rotation.x = -.35; spike.rotation.z = -Math.sin(a) * .55;
  }
  for (let i = 0; i < 3; i++) {
    const bang = add(new THREE.ConeGeometry(.10, .28, 6), hair, head, -.17 + i * .17, .05, .255);
    bang.rotation.x = Math.PI; bang.rotation.z = (i - 1) * -.22;
  }
  for (const x of [-.115, .115]) {
    add(new THREE.SphereGeometry(.045, 10, 8), white, head, x, -.005, .267, 1, .72, .45);
    add(new THREE.SphereGeometry(.025, 10, 8), dark, head, x, -.008, .292);
    const brow = add(new THREE.BoxGeometry(.095, .025, .025), hair, head, x, .075, .27);
    brow.rotation.z = x < 0 ? .12 : -.12;
  }
  add(new THREE.SphereGeometry(.055, 8, 8), skin, head, -.28, -.02, 0, .7, 1, 1);
  add(new THREE.SphereGeometry(.055, 8, 8), skin, head, .28, -.02, 0, .7, 1, 1);
  add(new THREE.BoxGeometry(.48, .12, .38), red, body, 0, 1.91, -.02);
  const scarfTail = add(new THREE.BoxGeometry(.12, .42, .08), red, body, .29, 1.75, -.12);
  scarfTail.rotation.z = -.35;

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
  const ROT_SPEED = .9, DAMPING = .12, MIN_R = 2.5, MAX_R = 24;
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
      orbit.dTheta -= 2 * Math.PI * dx / innerHeight * ROT_SPEED;
      orbit.dPhi -= 2 * Math.PI * dy / innerHeight * ROT_SPEED;
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
    if (f && (!tr || Math.hypot(f.x - p.x, f.z - p.z) <= Math.hypot(tr.x - p.x, tr.z - p.z))) return { kind: "fire", label: f.lit ? "Tambah kayu" : "Nyalakan", f };
    if (tr) return { kind: "chop", tr };
    return { kind: null };
  }
  function doAction() {
    if (intro.active || chopT >= 0 || inv.isOpen || crafting.isOpen || !physics.isGrounded) return;
    const a = pickAction();
    if (a.kind === "attack") startChop(a.mon);
    else if (a.kind === "fish") fishing.press();
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

  // ================= HP, MEMANCING, MONSTER MALAM =================
  const health = createHealth(100);
  const fishing = createFishing({ scene, world, player, rightArm, inv });
  const monsters = createMonsters({ scene, world });
  inv.onUse(id => {                                         // makan ikan: +25 HP
    if (id !== "ikan") return false;
    if (health.hp >= health.max - .5) { inv.toast("HP sudah penuh"); return false; }
    health.heal(25); inv.toast("+25 HP"); return true;
  });
  inv.onHold(id => { inv.toast(id === "pancing" ? "Memegang pancingan" : "Pancingan disimpan"); if (!id) fishing.cancel(); });
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
    controls: [joystick, runBtn, jumpBtn, inv.button, crafting.button, chopBtn.el].filter(Boolean),
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
    THREE = await import("three");

    // Modul game + lobby dimuat paralel, progres dihitung per modul
    const names = ["./map.js", "./intro.js", "./hud.js", "./fishing.js", "./monsters.js", "./lobby.js"];
    const keysOf = ["map", "intro", "hud", "fishing", "monsters", "lobby"];
    let loaded = 0;
    const mods = await Promise.all(names.map(p => import(p).then(m => { st.game = ++loaded / names.length; recompute(); return m; })));
    keysOf.forEach((k, i) => { M[k] = mods[i]; });
    await net;
    finish();
  } catch (error) { fail(error); }
})();
