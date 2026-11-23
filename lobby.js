import * as THREE from "three";

const CSS = `#lobby{position:absolute;inset:0;z-index:4;color:#e9e4d6;font-family:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;transition:opacity .45s}
#lobby canvas{display:block;width:100%;height:100%;cursor:grab;touch-action:none}
#lobby .lb-top{position:absolute;top:max(16px,env(safe-area-inset-top));left:max(20px,env(safe-area-inset-left));display:flex;align-items:center;gap:12px}
#lobby .lb-who{pointer-events:none}
#lobby .lb-av{flex:none;width:52px;height:52px;padding:0;border:2px solid #3f5b52;border-radius:50%;overflow:hidden;background:#10201c;cursor:pointer}
#lobby .lb-av:hover,#lobby .lb-av[aria-expanded=true]{border-color:#f0a45d}
#lobby .lb-av:focus-visible{outline:2px solid #e9e4d6;outline-offset:3px}
#lobby .lb-av img{display:block;width:100%;height:100%;object-fit:cover}
#lobby .lb-menu{position:absolute;top:calc(100% + 8px);left:0;min-width:150px;padding:4px;background:#172522f5;border:1px solid #3f5b52;border-radius:6px}
#lobby .lb-menu[hidden]{display:none}
#lobby .lb-menu button{display:block;width:100%;padding:8px 12px;font:inherit;font-size:15px;text-align:left;color:#e9e4d6;background:none;border:0;border-radius:4px;cursor:pointer}
#lobby .lb-menu button:hover,#lobby .lb-menu button:focus-visible{background:#243a33;outline:none}
#lobby .lb-menu .out{color:#ee9b82}
#lobby .lb-name{margin:0;font-size:21px;line-height:1.2}
#lobby .lb-meta{margin:4px 0 0;font-size:14px;font-style:italic;color:#93a89f}
#lobby .lb-role{display:inline-block;margin-left:10px;padding:1px 8px;font-size:13px;font-style:normal;color:#f0a45d;border:1px solid #f0a45d;border-radius:3px;vertical-align:middle}
#lobby .lb-hint{position:absolute;left:0;right:0;bottom:max(14px,env(safe-area-inset-bottom));margin:0;text-align:center;font-size:13px;font-style:italic;color:#6f877c;pointer-events:none}
#lobby .sr{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media(prefers-reduced-motion:reduce){#lobby{transition:none}}`;

export function createLobby({ account, onPlay, onLogout }) {
  if (!document.getElementById("lobby-css")) {
    const s = document.createElement("style"); s.id = "lobby-css"; s.textContent = CSS; document.head.appendChild(s);
  }
  const root = document.createElement("div"); root.id = "lobby";
  root.innerHTML = `<div class="lb-top">
      <button class="lb-av" aria-haspopup="menu" aria-expanded="false" aria-label="Menu profil"><img alt=""></button>
      <div class="lb-who"><p class="lb-name"></p><p class="lb-meta"></p></div>
      <div class="lb-menu" role="menu" hidden><button role="menuitem" data-k="photo">Ganti foto</button><button role="menuitem" class="out" data-k="logout">Keluar</button></div>
    </div>
    <input class="lb-file" type="file" accept="image/*" hidden>
    <p class="lb-hint"></p>
    <div class="sr"><button data-k="play">Main</button><button data-k="friends">Teman</button><button data-k="yes" disabled>Terima undangan</button><button data-k="no" disabled>Tolak undangan</button></div>`;
  const q = c => root.querySelector(c);
  q(".lb-name").textContent = account.username;
  q(".lb-meta").textContent = "ID " + account.id;
  if (account.role === "admin") { const r = document.createElement("span"); r.className = "lb-role"; r.textContent = "Admin"; q(".lb-meta").appendChild(r); }
  const hint = q(".lb-hint"), DEF = matchMedia("(pointer:coarse)").matches ? "Geser untuk memutar karakter." : "Seret untuk memutar karakter.";
  hint.textContent = DEF;

  // ---------- Renderer & scene ----------
  const lowEnd = matchMedia("(pointer:coarse)").matches || innerWidth < 800;
  const renderer = new THREE.WebGLRenderer({ antialias: devicePixelRatio < 2, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, lowEnd ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  root.prepend(renderer.domElement);
  document.querySelector("#game").appendChild(root);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x172522); scene.fog = new THREE.Fog(0x172522, 9, 27);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80);
  scene.add(new THREE.HemisphereLight(0xdceeff, 0x536044, 1.3));
  const key = new THREE.DirectionalLight(0xffe0b4, 1.8); key.position.set(-4, 6, 6); key.castShadow = true;
  key.shadow.mapSize.set(lowEnd ? 1024 : 2048, lowEnd ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5 }); scene.add(key);
  const FIRE = new THREE.Vector3(2.1, 0.25, 0.5);
  const fireLight = new THREE.PointLight(0xff9a4d, 18, 11); fireLight.position.set(FIRE.x, 0.9, FIRE.z); scene.add(fireLight);

  const mat = (c, r = 0.82, flat = false) => new THREE.MeshStandardMaterial({ color: c, roughness: r, flatShading: flat });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 48), mat(0x203229, 1)); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const PLAT = 0.25;
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3, PLAT, 40), mat(0x5b5a4d, 0.95)); plat.position.y = PLAT / 2; plat.receiveShadow = true; scene.add(plat);
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.02, 40), mat(0x6a6858, 0.95)); inner.position.y = PLAT + 0.005; inner.receiveShadow = true; scene.add(inner);

  // Pohon pinus di belakang
  let seed = 5; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  const pine = [mat(0x28443a, 0.9, true), mat(0x315548, 0.9, true)], trunk = mat(0x3a2f26, 1);
  for (let i = 0; i < 28; i++) {
    const a = Math.PI + (i / 27) * Math.PI, d = 8 + rnd() * 6, s = 0.8 + rnd() * 0.9, g = new THREE.Group();
    g.position.set(Math.cos(a) * d, 0, Math.sin(a) * d);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * s, 0.2 * s, 1.2 * s, 6), trunk); t.position.y = 0.6 * s; g.add(t);
    [[1.2, 2.6, 2.1], [0.9, 2.1, 3.4]].forEach(([r, h, y], j) => { const c = new THREE.Mesh(new THREE.ConeGeometry(r * s, h * s, 7), pine[j]); c.position.y = y * s * 0.8 + 0.4; g.add(c); });
    scene.add(g);
  }

  // Api unggun
  const logM = mat(0x4a3526, 1);
  for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.9, 6), logM); l.position.copy(FIRE).add(new THREE.Vector3(0, 0.08, 0)); l.rotation.set(Math.PI / 2 - 0.25, 0, i * 2.1); l.castShadow = true; scene.add(l); }
  for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283, st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14, 0), mat(0x6b6a5f, 1, true)); st.position.set(FIRE.x + Math.cos(a) * 0.6, PLAT + 0.05, FIRE.z + Math.sin(a) * 0.6); st.castShadow = true; scene.add(st); }
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.7, 7), new THREE.MeshBasicMaterial({ color: 0xff9a3c })); flame.position.set(FIRE.x, 0.62, FIRE.z); scene.add(flame);
  const core = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.42, 7), new THREE.MeshBasicMaterial({ color: 0xffe08a })); core.position.set(FIRE.x, 0.5, FIRE.z); scene.add(core);
  const EN = 28, ep = new Float32Array(EN * 3), ev = new Float32Array(EN);
  const respawn = i => { ep[i * 3] = FIRE.x + (rnd() - 0.5) * 0.3; ep[i * 3 + 1] = 0.6 + rnd() * 0.3; ep[i * 3 + 2] = FIRE.z + (rnd() - 0.5) * 0.3; ev[i] = 0.4 + rnd() * 0.8; };
  for (let i = 0; i < EN; i++) { respawn(i); ep[i * 3 + 1] += rnd() * 2; }
  const eg = new THREE.BufferGeometry(); eg.setAttribute("position", new THREE.BufferAttribute(ep, 3));
  scene.add(new THREE.Points(eg, new THREE.PointsMaterial({ color: 0xffb25e, size: 0.05, transparent: true, opacity: 0.85, depthWrite: false })));

  // ---------- Karakter (model sama seperti di game) ----------
  const skin = mat(0xf0c5a5), hair = mat(0x171923), jacket = mat(0x273b3d), red = mat(0xb84e3f), pants = mat(0x303b43), boots = mat(0x211f21), strap = mat(0x9b7650), dark = mat(0x20252b), white = mat(0xf4eee4);
  const glow = new THREE.MeshStandardMaterial({ color: 0xe7a35f, emissive: 0x8c3c0c, emissiveIntensity: 0.45 });
  const add = (geo, m, p, x, y, z, sx = 1, sy = 1, sz = 1) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.castShadow = o.receiveShadow = true; p.add(o); return o; };
  const cap = (p, r, l, m, x, y, z) => add(new THREE.CapsuleGeometry(r, l, 5, 8), m, p, x, y, z);
  const body = new THREE.Group(); body.position.set(0, PLAT - 0.36, 0); scene.add(body);
  const lLeg = new THREE.Group(), rLeg = new THREE.Group(); lLeg.position.set(-0.19, 1.05, 0); rLeg.position.set(0.19, 1.05, 0); body.add(lLeg, rLeg);
  for (const leg of [lLeg, rLeg]) { cap(leg, 0.115, 0.48, pants, 0, -0.32, 0); add(new THREE.BoxGeometry(0.25, 0.14, 0.43), boots, leg, 0, -0.62, 0.07); }
  const torso = new THREE.Group(); torso.position.y = 1.25; body.add(torso);
  add(new THREE.CapsuleGeometry(0.34, 0.48, 6, 10), jacket, torso, 0, 0.18, 0, 1, 0.9, 0.72);
  add(new THREE.BoxGeometry(0.48, 0.52, 0.08), red, torso, 0, 0.19, 0.265);
  add(new THREE.BoxGeometry(0.13, 0.68, 0.13), strap, torso, -0.24, 0.2, 0.22);
  add(new THREE.BoxGeometry(0.22, 0.22, 0.18), strap, torso, 0.28, 0.03, 0.12);
  add(new THREE.BoxGeometry(0.42, 0.5, 0.24), mat(0x4b4034), torso, 0, 0.15, -0.27);
  add(new THREE.BoxGeometry(0.18, 0.12, 0.08), glow, torso, 0.02, 0.28, 0.38);
  const lArm = new THREE.Group(), rArm = new THREE.Group(); lArm.position.set(-0.39, 0.42, 0); rArm.position.set(0.39, 0.42, 0); torso.add(lArm, rArm);
  for (const arm of [lArm, rArm]) { cap(arm, 0.105, 0.42, jacket, 0, -0.25, 0); add(new THREE.SphereGeometry(0.105, 10, 8), skin, arm, 0, -0.51, 0.015); add(new THREE.BoxGeometry(0.23, 0.12, 0.19), red, arm, 0, -0.43, 0.02); }
  add(new THREE.CylinderGeometry(0.105, 0.12, 0.18, 10), skin, body, 0, 1.92, 0);
  const head = new THREE.Group(); head.position.set(0, 2.22, 0); body.add(head);
  add(new THREE.SphereGeometry(0.32, 20, 16), skin, head, 0, 0, 0, 0.88, 1.08, 0.82);
  add(new THREE.SphereGeometry(0.33, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), hair, head, 0, 0.13, -0.025, 1.02, 0.88, 1);
  for (let i = 0; i < 7; i++) { const a = -1.05 + i * 0.35, sp = add(new THREE.ConeGeometry(0.105, 0.34, 6), hair, head, Math.sin(a) * 0.23, 0.26, Math.cos(a) * 0.17); sp.rotation.x = -0.35; sp.rotation.z = -Math.sin(a) * 0.55; }
  for (let i = 0; i < 3; i++) { const b = add(new THREE.ConeGeometry(0.1, 0.28, 6), hair, head, -0.17 + i * 0.17, 0.05, 0.255); b.rotation.x = Math.PI; b.rotation.z = (i - 1) * -0.22; }
  for (const x of [-0.115, 0.115]) {
    add(new THREE.SphereGeometry(0.045, 10, 8), white, head, x, -0.005, 0.267, 1, 0.72, 0.45);
    add(new THREE.SphereGeometry(0.025, 10, 8), dark, head, x, -0.008, 0.292);
    const br = add(new THREE.BoxGeometry(0.095, 0.025, 0.025), hair, head, x, 0.075, 0.27); br.rotation.z = x < 0 ? 0.12 : -0.12;
  }
  add(new THREE.SphereGeometry(0.055, 8, 8), skin, head, -0.28, -0.02, 0, 0.7, 1, 1);
  add(new THREE.SphereGeometry(0.055, 8, 8), skin, head, 0.28, -0.02, 0, 0.7, 1, 1);
  add(new THREE.BoxGeometry(0.48, 0.12, 0.38), red, body, 0, 1.91, -0.02);
  const scarf = add(new THREE.BoxGeometry(0.12, 0.42, 0.08), red, body, 0.29, 1.75, -0.12); scarf.rotation.z = -0.35;

  // ---------- UI 3D: papan kayu yang menempel di layar ----------
  const mp = window.mp, FONT = '"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif';
  scene.add(camera); const ui = new THREE.Group(); camera.add(ui);
  const signs = [], DARK = mat(0x3b2d22, 0.95), ROPE = mat(0x8c7a5a, 1), IRON = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.5, metalness: 0.6 });
  const woodTex = base => {
    const c = document.createElement("canvas"); c.width = 256; c.height = 128; const x = c.getContext("2d");
    x.fillStyle = base; x.fillRect(0, 0, 256, 128);
    for (let i = 0; i < 70; i++) { x.fillStyle = rnd() > 0.5 ? `rgba(0,0,0,${0.05 + rnd() * 0.09})` : `rgba(255,255,255,${0.03 + rnd() * 0.05})`; x.fillRect(0, rnd() * 128, 256, 1 + rnd() * 2.5); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  };
  const roundRect = (w, h, r) => { const p = new THREE.Shape(), x = -w / 2, y = -h / 2;
    p.moveTo(x + r, y); p.lineTo(x + w - r, y); p.quadraticCurveTo(x + w, y, x + w, y + r); p.lineTo(x + w, y + h - r); p.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    p.lineTo(x + r, y + h); p.quadraticCurveTo(x, y + h, x, y + h - r); p.lineTo(x, y + r); p.quadraticCurveTo(x, y, x + r, y); return p; };

  function makeSign(o) {
    const { w, h } = o, dep = o.dep || 16, g = new THREE.Group();
    const tex = woodTex(o.color); tex.repeat.set(1 / w, 1 / h); tex.offset.set(0.5, 0.5);
    const pm = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, emissive: 0xffb060, emissiveIntensity: 0 });
    const plank = new THREE.Mesh(new THREE.ExtrudeGeometry(roundRect(w, h, Math.min(h * 0.18, 12)), { depth: dep, bevelEnabled: true, bevelSize: 3, bevelThickness: 3, bevelSegments: 2 }), pm);
    plank.position.z = -dep / 2; g.add(plank);
    const cv = document.createElement("canvas"); cv.width = w * 2; cv.height = h * 2;
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
    const label = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tx, transparent: true, roughness: 1, depthWrite: false }));
    label.position.z = dep / 2 + 3.6; g.add(label);
    const nailAt = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
    for (const [sx, sy] of nailAt) { const n = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 3, 8), IRON); n.rotation.x = Math.PI / 2; n.position.set(sx * (w / 2 - 9), sy * (h / 2 - 9), dep / 2 + 4); g.add(n); }
    if (o.mount === "post") { const p = new THREE.Mesh(new THREE.BoxGeometry(18, 400, 12), DARK); p.position.set(0, -h / 2 - 190, -dep / 2 - 8); g.add(p); }
    if (o.mount === "rope") for (const sx of [-1, 1]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 300, 6), ROPE); r.position.set(sx * (w / 2 - 16), h / 2 + 150, 0); g.add(r); }
    const hit = new THREE.Mesh(new THREE.PlaneGeometry(w + 16, h + 16), new THREE.MeshBasicMaterial({ visible: false })); hit.position.z = dep; g.add(hit);
    const s = { g, pm, w, h, cv, tx, hit, th: 0, h_: 0, tp: 0, p: 0, base: 1, phase: rnd() * 6.28, enabled: o.enabled !== false, focus: false, onClick: o.onClick, ink: o.ink, cy: o.cy ?? 0.5, cx: 0 };
    hit.userData.sign = s;
    s.set = lines => {
      const c = cv.getContext("2d"), W2 = cv.width, H2 = cv.height; c.clearRect(0, 0, W2, H2);
      const fs = lines.map(l => l.s * h * 2), total = fs.reduce((a, f) => a + f * 1.15, 0); let y = H2 * s.cy - total / 2;
      lines.forEach((l, i) => {
        let f = fs[i]; const font = k => `${l.i ? "italic " : ""}${l.b === false ? 400 : 700} ${k}px ${FONT}`;
        c.font = font(f); const mw = c.measureText(l.t).width; if (mw > W2 * 0.88) { f *= W2 * 0.88 / mw; c.font = font(f); }
        c.textAlign = "center"; c.textBaseline = "middle"; y += f * 0.575;
        c.fillStyle = "rgba(255,235,200,.28)"; c.fillText(l.t, W2 / 2 + 1.5, y + 2.5);   // efek ukiran
        c.fillStyle = l.c || o.ink; c.fillText(l.t, W2 / 2, y); y += f * 0.575 + (fs[i] * 1.15 - f * 1.15);
      });
      tx.needsUpdate = true;
    };
    if (o.badge) {
      const bc = document.createElement("canvas"); bc.width = bc.height = 64;
      const bt = new THREE.CanvasTexture(bc); bt.colorSpace = THREE.SRGBColorSpace;
      const b = new THREE.Mesh(new THREE.CircleGeometry(15, 24), new THREE.MeshBasicMaterial({ map: bt, transparent: true })); b.position.set(w / 2 - 4, h / 2 - 2, dep / 2 + 9); b.visible = false; g.add(b);
      s.setBadge = n => { b.visible = n > 0; if (!n) return; const c = bc.getContext("2d"); c.clearRect(0, 0, 64, 64); c.fillStyle = "#c4553d"; c.beginPath(); c.arc(32, 32, 30, 0, 6.283); c.fill(); c.fillStyle = "#f6efe0"; c.font = `700 38px ${FONT}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(n, 32, 34); bt.needsUpdate = true; };
    }
    s.set(o.lines || []); (o.parent || ui).add(g); signs.push(s); return s;
  }

  let busy = false;
  const playLines = [{ t: "Main", s: 0.42 }], busyLines = [{ t: "Memuat…", s: 0.3 }];
  const main = makeSign({ w: 168, h: 68, color: "#a8733c", ink: "#2a1b10", lines: playLines, mount: "post", onClick: () => go() });
  const friendsS = makeSign({ w: 124, h: 52, color: "#6b5039", ink: "#f1e7d2", lines: [{ t: "Teman", s: 0.38 }], mount: "post", badge: true, onClick: () => mp?.togglePanel() });
  const card = makeSign({ w: 236, h: 134, color: "#2f3d36", ink: "#e9e4d6", dep: 10, cy: 0.34, enabled: false });
  const yes = makeSign({ w: 98, h: 38, color: "#4f7a4a", ink: "#f4efe2", lines: [{ t: "Terima", s: 0.42 }], dep: 10, parent: card.g, onClick: () => accept() });
  const no = makeSign({ w: 98, h: 38, color: "#8a3a2e", ink: "#f4efe2", lines: [{ t: "Tolak", s: 0.42 }], dep: 10, parent: card.g, onClick: () => decline() });
  yes.g.position.set(-56, -43, 12); no.g.position.set(56, -43, 12); yes.enabled = no.enabled = false; card.slide = 0; card.g.visible = false;
  if (!mp) { friendsS.g.visible = false; friendsS.enabled = false; }

  // ---------- Undangan ----------
  let pend = [], ft = 0;
  const flash = (m, err) => { hint.textContent = m; hint.style.color = err ? "#ee9b82" : "#9fd3a8"; clearTimeout(ft); ft = setTimeout(() => { hint.textContent = DEF; hint.style.color = ""; }, 3500); };
  const sr = k => q(`.sr [data-k=${k}]`);
  async function accept() { const f = pend[0]; if (!f || !mp) return; const r = await mp.accept(f.id); flash(r.m, !r.ok); }
  async function decline() { const f = pend[0]; if (!f || !mp) return; const r = await mp.decline(f.id); flash(r.m, !r.ok); }
  function setPending(list) {
    pend = list; const f = pend[0];
    if (f) card.set([{ t: "Undangan main", s: 0.11, c: "#93a89f", b: false, i: true }, { t: f.n, s: 0.2 }, ...(pend.length > 1 ? [{ t: `+${pend.length - 1} undangan lain`, s: 0.1, c: "#93a89f", b: false, i: true }] : [])]);
    yes.enabled = no.enabled = !!f; sr("yes").disabled = sr("no").disabled = !f;
  }
  if (mp) { mp.dock("lobby"); mp.onCount(n => friendsS.setBadge(n)); mp.onPending(setPending); }

  // ---------- Kamera & tata letak ----------
  let W = 1, H = 1, shift = 0, k = 1;
  const put = (s, cx, cy) => { s.g.position.set(cx - W / 2, H / 2 - cy, 0); s.base = k; s.cx = cx; };
  const layout = () => {
    W = innerWidth; H = innerHeight; renderer.setSize(W, H);
    camera.aspect = W / H; shift = W / H > 1.2 ? 1.2 : 0; camera.updateProjectionMatrix();
    const D = 4; ui.position.z = -D; ui.scale.setScalar(2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * D / H);   // 1 satuan UI = 1 piksel layar
    k = W < 600 ? 0.8 : 1; const m = 24 * k, B = 58 * k;
    put(main, W - m - main.w * k / 2, H - B - main.h * k / 2);
    put(friendsS, m + friendsS.w * k / 2, H - B - friendsS.h * k / 2);
    card.x0 = W - m - card.w * k / 2; card.y0 = H - B - main.h * k - 30 * k - card.h * k / 2; card.base = k; card.g.scale.setScalar(k);
  };
  layout(); addEventListener("resize", layout);

  // ---------- Foto profil & menu ----------
  const avBtn = q(".lb-av"), avatar = q(".lb-av img"), menu = q(".lb-menu"), file = q(".lb-file"), PK = "s3d_photo_" + account.id;
  const setMenu = open => { menu.hidden = !open; avBtn.setAttribute("aria-expanded", String(open)); };
  avBtn.onclick = e => { e.stopPropagation(); setMenu(menu.hidden); };
  const closeMenu = e => { if (!menu.hidden && !q(".lb-top").contains(e.target)) setMenu(false); };
  const onEsc = e => { if (e.key === "Escape") setMenu(false); };
  document.addEventListener("click", closeMenu); addEventListener("keydown", onEsc);
  q('[data-k="photo"]').onclick = () => { setMenu(false); file.click(); };
  q('[data-k="logout"]').onclick = () => onLogout();
  file.onchange = () => {
    const f = file.files[0]; if (!f) return;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas"); c.width = c.height = 128; const sz = Math.min(img.width, img.height);
      c.getContext("2d").drawImage(img, (img.width - sz) / 2, (img.height - sz) / 2, sz, sz, 0, 0, 128, 128);
      const url = c.toDataURL("image/jpeg", 0.8); URL.revokeObjectURL(img.src); avatar.src = url;
      try { localStorage.setItem(PK, url); } catch (_) {}
      mp?.setPhoto(url); flash("Foto profil diganti.");
    };
    img.onerror = () => flash("File itu bukan gambar yang valid.", true);
    img.src = URL.createObjectURL(f); file.value = "";
  };
  {  // potret bawaan: kepala karakter 3D difoto sekali
    lArm.rotation.z = -0.1; rArm.rotation.z = 0.1; ui.visible = false;
    const pr = renderer.getPixelRatio(), bg = scene.background, fog = scene.fog, pc = new THREE.PerspectiveCamera(22, 1, 0.1, 20);
    scene.background = new THREE.Color().setHSL((parseInt(account.id.slice(-4), 10) * 37 % 360) / 360, 0.35, 0.3); scene.fog = null;
    pc.position.set(0, 2.2, 2.7); pc.lookAt(0, 2.1, 0);
    renderer.setPixelRatio(1); renderer.setSize(128, 128, false); renderer.render(scene, pc);
    avatar.src = renderer.domElement.toDataURL("image/jpeg", 0.88);
    scene.background = bg; scene.fog = fog; ui.visible = true; renderer.setPixelRatio(pr); layout();
  }
  let saved = null; try { saved = localStorage.getItem(PK); } catch (_) {}
  if (saved) avatar.src = saved; else mp?.getPhoto().then(u => { if (typeof u === "string" && u.startsWith("data:image/")) avatar.src = u; });


  // ---------- Input: papan 3D + putar karakter ----------
  const cv = renderer.domElement, ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let drag = false, lastX = 0, spin = 0, pressed = null;
  const pick = e => {
    const r = cv.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera);
    return ray.intersectObjects(signs.filter(s => s.enabled && s.g.visible).map(s => s.hit), false)[0]?.object.userData.sign || null;
  };
  cv.addEventListener("pointerdown", e => { const s = pick(e); if (s) { pressed = s; s.tp = 1; return; } drag = true; lastX = e.clientX; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener("pointermove", e => {
    if (drag) { spin += (e.clientX - lastX) * 0.012; lastX = e.clientX; return; }
    const s = pick(e); signs.forEach(x => { x.th = (x === s || x.focus) ? 1 : 0; }); cv.style.cursor = s ? "pointer" : "grab";
  });
  const release = e => { if (pressed) { const s = e.type === "pointerup" ? pick(e) : null; pressed.tp = 0; if (s === pressed) pressed.onClick?.(); pressed = null; } drag = false; };
  cv.addEventListener("pointerup", release); cv.addEventListener("pointercancel", release);
  [["play", main, () => go()], ["friends", friendsS, () => mp?.togglePanel()], ["yes", yes, accept], ["no", no, decline]].forEach(([key, s, fn]) => {
    const b = sr(key); b.onclick = fn; b.onfocus = () => { s.focus = true; s.th = 1; }; b.onblur = () => { s.focus = false; s.th = 0; };
  });

  // ---------- Animasi ----------
  let raf = 0, last = performance.now(), alive = true;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const loop = now => {
    if (!alive) return; raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = now / 1000, m = reduce ? 0 : 1;
    if (!drag) spin += (Math.round(spin / 6.283) * 6.283 - spin) * Math.min(1, dt * 1.5);
    body.rotation.y = spin;
    const br = Math.sin(t * 1.6) * m;
    torso.position.y = 1.25 + br * 0.012; body.scale.y = 1 + br * 0.004;
    lArm.rotation.set(br * 0.03, 0, -0.1 - br * 0.015); rArm.rotation.set(-br * 0.03, 0, 0.1 + br * 0.015);
    head.rotation.y = Math.sin(t * 0.5) * 0.3 * m; head.rotation.x = Math.sin(t * 0.8) * 0.03 * m;
    scarf.rotation.x = Math.sin(t * 3) * 0.08 * m - 0.15;
    const f = 1 + Math.sin(t * 17) * 0.12 + Math.sin(t * 9.3) * 0.1;
    flame.scale.set(1, f * m + (1 - m), 1); core.scale.set(1, (2 - f) * m + (1 - m), 1); fireLight.intensity = 16 + f * 3 * m;
    for (let i = 0; i < EN; i++) { ep[i * 3 + 1] += ev[i] * dt * m; ep[i * 3] += Math.sin(t * 2 + i) * 0.003 * m; if (ep[i * 3 + 1] > 3) respawn(i); }
    eg.attributes.position.needsUpdate = true;
    // papan: membesar saat disorot, menekan saat diklik, bergoyang pelan
    for (const s of signs) {
      s.h_ += (s.th - s.h_) * Math.min(1, dt * 14); s.p += (s.tp - s.p) * Math.min(1, dt * 22);
      s.g.scale.setScalar(s.base * (1 + 0.05 * s.h_ - 0.06 * s.p)); s.g.rotation.z = Math.sin(t * 1.1 + s.phase) * 0.012 * m; s.g.rotation.y = s.h_ * 0.05; s.pm.emissiveIntensity = 0.16 * s.h_;
    }
    card.slide += ((pend.length ? 1 : 0) - card.slide) * Math.min(1, dt * (reduce ? 60 : 9));
    card.g.visible = card.slide > 0.01; card.g.position.set(card.x0 - W / 2 + (1 - card.slide) * (card.w * k + 80), H / 2 - card.y0, 0);
    const cx = shift + Math.sin(t * 0.2) * 0.3 * m;
    camera.position.set(cx, 1.75, 6.6); camera.lookAt(shift, 1.45, 0);
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(loop);

  // ---------- Tombol Main ----------
  async function go() {
    if (busy) return; busy = true; main.set(busyLines);
    try { await onPlay(); } catch (e) { console.error(e); flash("Gagal memuat game. Coba lagi.", true); main.set(playLines); busy = false; }
  }
  const onKey = e => { if (e.key === "Enter" && !/INPUT|TEXTAREA/.test(e.target.tagName)) go(); };
  addEventListener("keydown", onKey);

  const dispose = () => {
    alive = false; cancelAnimationFrame(raf); removeEventListener("resize", layout); removeEventListener("keydown", onKey); document.removeEventListener("click", closeMenu); removeEventListener("keydown", onEsc);
    if (mp) { mp.onPending(null); mp.onCount(null); mp.dock("game"); }
    renderer.dispose(); renderer.forceContextLoss(); root.remove();
  };
  return { dispose, leave() { root.style.pointerEvents = "none"; root.style.opacity = "0"; setTimeout(dispose, reduce ? 0 : 500); } };
}
