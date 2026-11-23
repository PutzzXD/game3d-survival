import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import { getDatabase, ref, set, get, remove, update as dbUpdate, onValue, onDisconnect, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-database.js";

const CFG = {
  apiKey: "AIzaSyAmkkLXWx3AyefFFAoZjUzJc6dTVV6Qv7k",
  authDomain: "survival3d-ecd3e.firebaseapp.com",
  databaseURL: "https://survival3d-ecd3e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "survival3d-ecd3e",
  storageBucket: "survival3d-ecd3e.firebasestorage.app",
  messagingSenderId: "493895128908",
  appId: "1:493895128908:web:92c5da10e06bb3e0a0e1e9"
};
const STALE = 45000, MAX_AVATARS = 24;

const CSS = `#mp{position:absolute;z-index:7;top:calc(54px + env(safe-area-inset-top));right:max(18px,env(safe-area-inset-right));display:flex;flex-direction:column;align-items:flex-end;gap:8px;pointer-events:none;color:#e9e4d6;font-family:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif}
#mp>*{pointer-events:auto}#mp button{font:inherit;cursor:pointer}
#mp .mp-btn{padding:8px 14px;font-size:15px;color:#e9e4d6;background:#10201cdd;border:1px solid #3f5b52;border-radius:4px}#mp .mp-btn b{color:#f0a45d;font-weight:600}
#mp .mp-pop{width:min(320px,calc(100vw - 36px));max-height:min(60vh,430px);overflow:auto;padding:16px;background:#172522f5;border:1px solid #3f5b52;border-radius:6px}
#mp .mp-pop[hidden]{display:none}
#mp .mp-add{display:flex;gap:8px;margin:0}
#mp .mp-add input{flex:1;min-width:0;padding:9px 10px;font:inherit;font-size:17px;letter-spacing:2px;color:#e9e4d6;background:#10201c;border:1px solid #3f5b52;border-radius:4px}
#mp .mp-add input:focus-visible,#mp button:focus-visible{outline:2px solid #f0a45d;outline-offset:2px}
#mp .mp-add button,#mp .mp-row button{padding:7px 12px;font-size:14px;color:#172522;background:#f0a45d;border:0;border-radius:4px}
#mp .mp-row button.x{color:#93a89f;background:none;text-decoration:underline;padding:4px}
#mp .mp-msg{margin:8px 0 0;min-height:1.3em;font-size:14px;color:#ee9b82}#mp .mp-msg.ok{color:#9fd3a8}
#mp .mp-h{margin:12px 0 4px;font-size:14px;font-style:italic;color:#93a89f}
#mp .mp-row{display:flex;align-items:center;gap:10px;padding:6px 0;font-size:16px}
#mp .mp-row i{flex:none;width:8px;height:8px;border-radius:50%;background:#4a5f57}#mp .mp-row i.on{background:#80e49c}
#mp .mp-row span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#mp .mp-row small{display:block;font-size:12px;font-style:italic;color:#6f877c}
#mp.lobby{top:auto;right:auto;left:max(24px,env(safe-area-inset-left));bottom:128px;align-items:flex-start}#mp.lobby .mp-btn{display:none}#mp.game{display:none}
#mpToast{position:absolute;z-index:7;top:calc(56px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:12px;padding:10px 14px;max-width:calc(100vw - 24px);color:#e9e4d6;font:15px "Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;background:#172522f5;border:1px solid #3f5b52;border-radius:6px}
#mpToast[hidden]{display:none}#mpToast button{font:inherit;font-size:14px;padding:6px 12px;color:#172522;background:#f0a45d;border:0;border-radius:4px;cursor:pointer}#mpToast button.x{color:#93a89f;background:none;text-decoration:underline}`;

export function createMultiplayer(me) {
  const db = getDatabase(initializeApp(CFG, "mp")), meRef = ref(db, "online/" + me.id);
  let others = {}, friends = {}, offset = 0, inGame = 0, G = null, last = { x: 0, y: 0, z: 0, r: 0 }, lastSend = 0, myParty = me.id, pend = [], H = {}, lastToggle = 0;
  const alive = o => o && Date.now() + offset - (o.t || 0) < STALE;
  const beat = (extra = {}) => dbUpdate(meRef, { n: me.username, g: inGame, p: myParty, t: serverTimestamp(), ...extra }).catch(() => {});

  // ---------- Presence ----------
  onValue(ref(db, ".info/serverTimeOffset"), s => { offset = s.val() || 0; });
  onValue(ref(db, ".info/connected"), s => {
    if (!s.val()) return;
    onDisconnect(meRef).remove();
    set(meRef, { n: me.username, g: inGame, p: myParty, x: 0, y: 0, z: 0, r: 0, t: serverTimestamp() }).catch(() => {});
  });
  setInterval(() => beat(), 8000);
  onValue(ref(db, "online"), s => { others = s.val() || {}; delete others[me.id]; render(); });
  onValue(ref(db, "friends/" + me.id), s => { friends = s.val() || {}; render(); });
  onValue(ref(db, "invites/" + me.id), s => {
    pend = Object.entries(s.val() || {}).filter(([, i]) => i && Date.now() + offset - (i.t || 0) < 300000).map(([id, i]) => ({ id, n: String(i.n || id).slice(0, 16) }));
    render(); H.pending?.(pend); toast();
  });
  setInterval(() => render(), 10000);

  // ---------- Panel "Pemain" (pojok kanan atas) ----------
  const st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const root = h("div", "game"); root.id = "mp";   // tersembunyi sampai lobby aktif; tidak tampil di dalam game
  const btn = h("button", "mp-btn"); btn.append("Pemain ", h("b", "", "0"));
  const pop = h("div", "mp-pop"); pop.hidden = true;
  const form = h("form", "mp-add"), input = h("input"), addBtn = h("button", "", "Tambah");
  input.placeholder = "ID teman (8 digit)"; input.inputMode = "numeric"; input.maxLength = 8; input.autocomplete = "off"; input.setAttribute("aria-label", "ID teman");
  input.oninput = () => { input.value = input.value.replace(/\D/g, ""); };
  form.append(input, addBtn);
  const msg = h("p", "mp-msg"), list = h("div");
  msg.setAttribute("role", "status"); pop.append(form, msg, list); root.append(btn, pop);
  document.querySelector("#game").appendChild(root);
  btn.onclick = e => { e.stopPropagation(); pop.hidden = !pop.hidden; if (!pop.hidden) input.focus(); };
  document.addEventListener("click", e => { if (!root.contains(e.target) && performance.now() - lastToggle > 400) pop.hidden = true; });
  const say = (t, ok) => { msg.textContent = t; msg.className = "mp-msg" + (ok ? " ok" : ""); };

  async function addFriend(id) {
    if (!/^\d{8}$/.test(id)) return say("ID harus 8 digit.");
    if (id === me.id) return say("Itu ID kamu sendiri.");
    if (friends[id]) return say("Sudah ada di daftar teman.");
    try {
      const key = (await get(ref(db, "ids/" + id))).val();
      if (!key) return say("ID tidak ditemukan.");
      const name = (await get(ref(db, "users/" + key))).val()?.name || key;
      await set(ref(db, `friends/${me.id}/${id}`), name);
      say(name + " ditambahkan.", true); input.value = "";
    } catch (e) { say("Gagal terhubung. Periksa Rules database."); }
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

  const toastEl = h("div"); toastEl.id = "mpToast"; toastEl.hidden = true; document.querySelector("#game").appendChild(toastEl);
  function toast() {   // dipakai saat lobby 3D tidak aktif (misalnya di dalam game)
    const i = pend[0]; toastEl.hidden = !i || !!H.pending; if (!i || H.pending) return;
    const ok = h("button", "", "Terima"), no = h("button", "x", "Tolak");
    ok.onclick = async () => say((await accept(i.id)).m, true); no.onclick = async () => say((await decline(i.id)).m, true);
    toastEl.replaceChildren(h("span", "", i.n + " mengundangmu main"), ok, no);
  }

  function row(name, sub, on, ...btns) {
    const r = h("div", "mp-row"), t = h("span", "", name);
    t.append(h("small", "", sub)); r.append(h("i", on ? "on" : ""), t);
    for (const [label, fn, cls] of btns) { const b = h("button", cls, label); b.onclick = fn; r.append(b); }
    return r;
  }
  const act = async p => { const r = await p; say(r.m, r.ok); };
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
      btns.push(["Hapus", () => remove(ref(db, `friends/${me.id}/${f.id}`)), "x"]);
      list.append(row(f.n, f.o ? (same ? "satu party" : f.o.g ? "sedang main" : "di lobby") : "offline", !!f.o, ...btns));
    });
    const rest = on.filter(([id]) => !friends[id]).slice(0, 12);
    if (rest.length) { list.append(h("p", "mp-h", "Online sekarang")); rest.forEach(([id, o]) => list.append(row(o.n, "ID " + id, true, ["Tambah", () => addFriend(id)]))); }
  }
  render();

  // ---------- Pemain lain di dunia game ----------
  const avatars = new Map();
  function makeAvatar(T, id, name) {
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
    const cv = document.createElement("canvas"); cv.width = 256; cv.height = 64;
    const c = cv.getContext("2d"); c.font = "600 30px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
    c.lineWidth = 6; c.strokeStyle = "#0b1512"; c.strokeText(name, 128, 32); c.fillStyle = "#fff"; c.fillText(name, 128, 32);
    const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace;
    const tag = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false })); tag.scale.set(2, 0.5, 1); tag.position.y = 2.55; tag.renderOrder = 10; g.add(tag);
    return { g, body, legs, arms, tex, tag, tx: 0, ty: 0, tz: 0, tr: 0, v: 0, ph: 0, fresh: true };
  }
  function drop(id) { const a = avatars.get(id); if (!a) return; G.scene.remove(a.g); a.tex.dispose(); a.tag.material.dispose(); avatars.delete(id); }

  return {
    attachGame({ THREE, scene, player }) {
      G = { T: THREE, scene, player };
      return {
        update(dt, t, active) {
          const now = performance.now();
          if (active) {
            const p = player.position, r = player.rotation.y;
            const moved = Math.hypot(p.x - last.x, p.z - last.z) + Math.abs(p.y - last.y) + Math.abs(r - last.r) > 0.02;
            if (now - lastSend > (moved || !inGame ? 100 : 2000)) {
              lastSend = now; inGame = 1; last = { x: p.x, y: p.y, z: p.z, r };
              beat({ x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), r: +r.toFixed(2) });
            }
          }
          const seen = new Set();
          for (const [id, o] of Object.entries(others)) {
            if (!o.g || o.p !== myParty || !alive(o) || o.x == null) continue;
            if (!avatars.has(id)) { if (avatars.size >= MAX_AVATARS) continue; const a = makeAvatar(G.T, id, String(o.n || "?").slice(0, 16)); avatars.set(id, a); scene.add(a.g); }
            const a = avatars.get(id); seen.add(id); a.tx = o.x; a.ty = o.y; a.tz = o.z; a.tr = o.r || 0;
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
    dock(mode) { root.classList.toggle("lobby", mode === "lobby"); root.classList.toggle("game", mode !== "lobby"); if (mode !== "lobby") pop.hidden = true; },
    setPhoto(url) { return set(ref(db, "profiles/" + me.id), url).catch(() => {}); },
    getPhoto() { return get(ref(db, "profiles/" + me.id)).then(s => s.val()).catch(() => null); },
    togglePanel() { lastToggle = performance.now(); pop.hidden = !pop.hidden; if (!pop.hidden) input.focus(); },
    onPending(cb) { H.pending = cb; if (cb) cb(pend); toast(); },
    onCount(cb) { H.count = cb; if (cb) cb(fOnline()); },
    leave() { inGame = 0; return remove(meRef).catch(() => {}); }
  };
}
