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

const ITEMS = {
  kayu: { name: "Kayu", stack: 20, icon: ICON_LOG, desc: "Kayu gelondongan dari pohon yang kamu tebang." },
  pancing: { name: "Pancingan", stack: 5, icon: ICON_ROD, desc: "Joran sederhana dari kayu dan tali." },
  ikan: { name: "Ikan", stack: 10, icon: "🐟", desc: "Ikan hasil pancingan. Bisa dimakan untuk memulihkan HP." },
};

// bahan -> hasil. kind "build": dibangun di depan pemain; "item": masuk ke tas.
const RECIPES = [
  { id: "rumah", name: "Rumah Kayu", kind: "build", cost: { kayu: 20 }, icon: ICON_HOUSE,
    desc: "Pondok kayu dengan pintu, jendela, dan atap. Dibangun di depanmu." },
  { id: "pancing", name: "Pancingan", kind: "item", cost: { kayu: 5 }, give: { pancing: 1 }, icon: ICON_ROD,
    desc: "Joran sederhana untuk memancing." },
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
export function createActionButton(onPress) {
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
      b.classList.toggle("fire", kind === "fire");
      b.innerHTML = (kind === "fire" ? ICON_FLAME : ICON_AXE) + `<span>${label || "Tebang"}</span>`;
      b.setAttribute("aria-label", label || "Tebang pohon");
    },
  };
}

// ---------------------------------------------------------------- tas
export function createInventory() {
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
      ? `<div class="bag-name">${ITEMS[s.id].name} <small>×${s.n}</small></div><p>${ITEMS[s.id].desc}</p><div class="bag-acts">${s.id === "ikan" ? '<button type="button" data-a="use">Makan 1</button>' : ''}${s.id === "pancing" ? `<button type="button" data-a="hold">${held === "pancing" ? "Simpan" : "Pegang"}</button>` : ''}<button type="button" data-a="one">Buang 1</button><button type="button" data-a="all">Buang semua</button></div>`
      : `<div class="bag-hint">Ketuk item untuk melihat detail.</div>`;
    for (const f of listeners) f();
  }
  info.addEventListener("click", e => {
    const a = e.target.closest("button")?.dataset.a, s = slots[sel];
    if (!a || !s) return;
    if (a === "use") { for (const f of useListeners) { if (f(s.id) === true) { s.n--; if (s.n <= 0) { slots[sel] = null; sel = -1; } save(); render(); } break; } return; }
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
  return { button: btn, add, remove, count, name: id => ITEMS[id]?.name ?? id, toast, notify,
    open, close: self.close, toggle, onChange: f => listeners.push(f),
    onUse: f => useListeners.push(f), onHold: f => holdListeners.push(f), setHeld,
    get held() { return held; }, get isOpen() { return isOpen; } };
}

// ---------------------------------------------------------------- indikator HP pemain
export function createHealth(max = 100) {
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
export function createCrafting(inv, onCraft) {
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
