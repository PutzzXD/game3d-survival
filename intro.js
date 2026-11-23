import * as THREE from "three";

// ============================================================================
//  INTRO CINEMATIC
//  Pesawat terbang di atas laut -> mesin mati -> karakter melompat -> parasut
//  -> mendarat di pulau. Setelah itu kontrol, joystick & kamera normal aktif.
//  Modul ini berdiri sendiri: main.js hanya memanggil createIntro() dan
//  intro.update(delta) di tiap frame.
// ============================================================================

const { clamp, lerp, smoothstep } = THREE.MathUtils;
const ss = (a, b, x) => smoothstep(x, a, b);
const ease = x => { x = clamp(x, 0, 1); return x * x * x * (x * (x * 6 - 15) + 10); };
const outBack = x => { x = clamp(x, 0, 1); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2; };
const angDiff = d => Math.atan2(Math.sin(d), Math.cos(d));
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// Garis waktu (detik)
const T = { warn: 2.4, bang: 3.2, stand: 8.0, toDoor: 8.7, leap: 9.4, deploy: 14.0, land: 22.2, end: 24.4 };
const PLANE_X0 = -275, PLANE_Y0 = 195, PLANE_Z = 4, SPEED = 24;
const LAND = V(0, 0, 0);          // titik mendarat (area spawn biasa)
const PC = 1.05;                  // titik putar badan (dada) di atas telapak kaki
const SEAT = { y: -1.23, z: -0.2 };
const E = 4.2;                    // tambahan panjang kabin untuk penumpang party (mabar)

export function createIntro(ctx) {
  const { scene, camera, world, player, body, head, leftLeg, rightLeg, leftArm, rightArm,
    scarfTail, shadow, FOOT, orbit, controls = [], onFinish, partyCount = 0 } = ctx;
  const nPass = clamp(Math.floor(partyCount) || 0, 0, 3);   // teman satu party yang ikut di pesawat

  let seed = 20260;
  const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  let time = 0, finished = false, jumped = false, deployed = false, guided = false, landed = false;
  let skipping = -1, tailT = 0, tailDone = false, lastYaw = Math.PI / 2, yawChute = Math.PI / 2;
  let fovKick = 0, shakeKick = 0, emitAcc = 0, cloudK = 1, redI = 0, collapseT = -1;

  // Audio intro dibuat secara prosedural (tanpa file audio eksternal).
  // Browser mobile baru mengizinkan audio setelah sentuhan/klik pertama.
  let audioCtx = null, audioMaster = null, engineGain = null, windGain = null;
  let audioStarted = false, bangPlayed = false, chutePlayed = false, nextBeep = T.warn;
  let engineOscA = null, engineOscB = null;
  function startAudio() {
    if (audioStarted || finished) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      audioCtx = new AC();
      audioMaster = audioCtx.createGain(); audioMaster.gain.value = 0.42; audioMaster.connect(audioCtx.destination);
      engineGain = audioCtx.createGain(); engineGain.gain.value = 0; engineGain.connect(audioMaster);
      engineOscA = audioCtx.createOscillator(); engineOscA.type = "sawtooth"; engineOscA.frequency.value = 58;
      engineOscB = audioCtx.createOscillator(); engineOscB.type = "triangle"; engineOscB.frequency.value = 116;
      const engineFilter = audioCtx.createBiquadFilter(); engineFilter.type = "lowpass"; engineFilter.frequency.value = 260;
      engineOscA.connect(engineFilter); engineOscB.connect(engineFilter); engineFilter.connect(engineGain);
      engineOscA.start(); engineOscB.start();

      const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 2, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.55;
      const noise = audioCtx.createBufferSource(); noise.buffer = buffer; noise.loop = true;
      const windFilter = audioCtx.createBiquadFilter(); windFilter.type = "lowpass"; windFilter.frequency.value = 520;
      windGain = audioCtx.createGain(); windGain.gain.value = 0.0001;
      noise.connect(windFilter); windFilter.connect(windGain); windGain.connect(audioMaster); noise.start();
      audioStarted = true;
      bangPlayed = time >= T.bang;
      chutePlayed = time >= T.deploy;
      nextBeep = Math.max(T.warn, time);
      audioCtx.resume().catch(() => {});
    } catch (_) { audioCtx = null; audioStarted = false; }
  }
  function audioBurst(freq, duration, volume, type = "sine") {
    if (!audioStarted || !audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain); gain.connect(audioMaster); osc.start(now); osc.stop(now + duration + 0.04);
  }
  function updateAudio(t) {
    if (!audioStarted || !audioCtx) return;
    const now = audioCtx.currentTime;
    const engineLevel = t < T.bang ? 0.12 : t < 6.2 ? 0.12 * (1 - (t - T.bang) / (6.2 - T.bang)) : 0.0001;
    engineGain.gain.setTargetAtTime(Math.max(0.0001, engineLevel), now, 0.18);
    const windLevel = t < T.leap ? 0.025 : t < T.land ? 0.075 : 0.012;
    windGain.gain.setTargetAtTime(windLevel, now, 0.35);
    if (!bangPlayed && t >= T.bang) {
      bangPlayed = true;
      audioBurst(72, 0.75, 0.19, "sawtooth");
      audioBurst(180, 0.28, 0.09, "triangle");
    }
    if (t >= T.warn && t < T.leap && t >= nextBeep) {
      audioBurst(720, 0.16, 0.055, "square");
      nextBeep = t + 0.82;
    }
    if (!chutePlayed && t >= T.deploy) {
      chutePlayed = true;
      audioBurst(125, 0.55, 0.12, "triangle");
      audioBurst(420, 0.24, 0.045, "sine");
    }
  }
  const audioUnlock = () => startAudio();
  window.addEventListener("pointerdown", audioUnlock, { once: true, passive: true });
  window.addEventListener("keydown", audioUnlock, { once: true });

  const planePos = V(PLANE_X0, PLANE_Y0, PLANE_Z), planeVel = V(SPEED, 0, 0);
  const charVel = V(), charWorld = V(), trk = V(), prevC = V(), velEff = V(), focus = V(), P1 = V(), outward = V();
  const tmpA = V(), tmpB = V(), UP = V(0, 1, 0), FWD = V(1, 0, 0), RGT = V(0, 0, -1);

  // ---------------------------------------------------------------- materials
  const M = (c, r = .7, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: .05, ...o });
  const white = M(0xf1ede2, .55), redM = M(0xb84e3f, .6), dark = M(0x252a31, .7);
  const seatM = M(0x5a3a30, .9), metal = M(0x8c939b, .4, { metalness: .5 });
  const glass = M(0x9fd6ff, .1, { transparent: true, opacity: .16, depthWrite: false, side: THREE.DoubleSide });
  const lampM = M(0x400000, .5, { emissive: 0xff1a10, emissiveIntensity: 0 });
  const gaugeM = M(0x10202c, .4, { emissive: 0x2a8fb0, emissiveIntensity: .5 });

  // ---------------------------------------------------------------- pesawat
  const plane = new THREE.Group();
  plane.rotation.order = "YXZ";
  scene.add(plane);
  const bx = (w, h, d, m, x, y, z, p = plane) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); p.add(o); return o;
  };
  const cyl = (rt, rb, h, seg, m, x, y, z, p = plane) => {
    const g = new THREE.CylinderGeometry(rt, rb, h, seg); g.rotateX(Math.PI / 2);
    const o = new THREE.Mesh(g, m); o.position.set(x, y, z); p.add(o); return o;
  };
  // kabin
  bx(2.6, .14, 4.3 + E, dark, 0, -1.0, -.35 - E / 2);
  for (const s of [-1, 1]) {
    bx(.12, .95, 4.3 + E, white, s * 1.3, -.52, -.35 - E / 2);
    bx(.125, .18, 4.3 + E, redM, s * 1.3, -.35, -.35 - E / 2);
    bx(.12, 1.4, .12, white, s * 1.25, .6, 1.62);   // tiang kaca depan
    bx(.12, 1.4, .12, white, s * 1.3, .6, -2.45 - E);   // tiang belakang
  }
  bx(2.8, .14, 4.4 + E, white, 0, 1.3, -.35 - E / 2);                   // atap
  bx(2.7, .12, .12, white, 0, 1.22, 1.4);                   // bingkai kaca depan
  bx(2.6, 2.3, .12, white, 0, .15, -2.55 - E);                  // sekat belakang
  bx(2.5, .45, .7, dark, 0, -.62, 1.4);                     // dashboard
  bx(2.5, .12, .5, dark, 0, -.34, 1.18);
  for (const x of [-.7, -.2, .3]) bx(.3, .03, .3, gaugeM, x, -.27, 1.18);
  const lamp = bx(.2, .07, .2, lampM, .72, -.27, 1.18);      // lampu peringatan
  const wind = bx(2.5, 1.4, .04, glass, 0, .55, 1.78); wind.rotation.x = -.35;
  bx(1.2, .22, 1.1, seatM, 0, -.78, SEAT.z);                // kursi
  bx(1.2, 1.1, .18, seatM, 0, -.1, -.8);
  bx(.08, .08, .9, metal, 0, -.14, .85);                    // tuas kemudi
  bx(.9, .07, .07, dark, 0, -.14, .38);
  const PASS_SEATS = [[-.6, -3.2], [.6, -3.2], [0, -5.2]];   // kursi penumpang (3 teman party)
  for (const [sx, sz] of PASS_SEATS) { bx(.9, .22, .9, seatM, sx, -.78, sz); bx(.9, .9, .16, seatM, sx, -.15, sz - .55); }
  // hidung & baling-baling
  cyl(1.05, 1.2, 2.2, 14, white, 0, -.1, 2.85);
  cyl(.0, .32, .8, 10, redM, 0, -.1, 4.35);
  cyl(1.08, 1.08, .12, 14, dark, 0, -.1, 3.9);
  const prop = new THREE.Group(); prop.position.set(0, -.1, 4.05); plane.add(prop);
  bx(.24, 3.5, .05, dark, 0, 0, 0, prop);
  bx(.26, .5, .055, redM, 0, 1.5, 0, prop); bx(.26, .5, .055, redM, 0, -1.5, 0, prop);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.8, 24),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .14, side: THREE.DoubleSide, depthWrite: false }));
  disc.position.set(0, -.1, 4.08); plane.add(disc);
  // ekor, sayap, roda
  cyl(1.15, .3, 5.4, 10, white, 0, .1, -5.2 - E);
  bx(.12, 1.9, 1.5, redM, 0, 1.25, -7.4 - E);
  bx(5.6, .1, 1.5, white, 0, .2, -7.5 - E);
  bx(26, .2, 3, white, 0, 1.5, .3);
  for (const s of [-1, 1]) {
    bx(.9, .22, 3, redM, s * 12.55, 1.5, .3);
    const st = bx(.1, 3.86, .1, metal, s * 2.85, .25, .3); st.rotation.z = -s * .93;
    bx(.1, 1.0, .1, dark, s * 1.05, -1.5, .6);
    const wg = new THREE.CylinderGeometry(.45, .45, .25, 12); wg.rotateZ(Math.PI / 2);
    const w = new THREE.Mesh(wg, dark); w.position.set(s * 1.15, -2.0, .6); plane.add(w);
  }
  // pintu kanan (berengsel di depan, terbuka ke luar-belakang)
  const door = new THREE.Group(); door.position.set(1.34, .55, 1.0); plane.add(door);
  bx(.03, 1.15, 2.3, glass, 0, 0, -1.2, door);
  bx(.07, .08, 2.4, white, 0, .62, -1.2, door); bx(.07, .08, 2.4, white, 0, -.62, -1.2, door);
  bx(.07, 1.3, .08, white, 0, 0, -.02, door);  bx(.07, 1.3, .08, white, 0, 0, -2.38, door);
  bx(.09, .1, .3, metal, .02, -.2, -2.0, door);
  // lampu merah di kabin (dibiarkan ada sepanjang game agar shader tidak dikompilasi ulang)
  const warnLight = new THREE.PointLight(0xff2a1a, 0, 9, 1.6); warnLight.position.set(0, .2, .6); plane.add(warnLight);

  // penumpang = teman satu party: duduk di kabin belakang, lalu ikut melompat setelah pemain
  const passengers = [];
  {
    const skinP = M(0xf0c5a5, .8), pantsP = M(0x303b43, .8), hairP = M(0x171923, .8);
    const JACKETS = [0x3b6ea5, 0x5b8a4a, 0x8a5aa5];
    for (let i = 0; i < nPass; i++) {
      const g = new THREE.Group(); g.rotation.order = "YXZ";
      const jm = M(JACKETS[i], .8);
      bx(.72, .82, .42, jm, 0, 1.0, 0, g);
      bx(.46, .5, .44, skinP, 0, 1.78, 0, g);
      bx(.5, .2, .48, hairP, 0, 2.08, -.02, g);
      const legs = [-.19, .19].map(x => { const l = new THREE.Group(); l.position.set(x, .68, 0); l.rotation.x = -1.42; bx(.22, .7, .22, pantsP, 0, -.35, 0, l); g.add(l); return l; });
      const arms = [-.46, .46].map(x => { const a = new THREE.Group(); a.position.set(x, 1.35, 0); a.rotation.x = -1.1; bx(.18, .6, .18, jm, 0, -.3, 0, a); g.add(a); return a; });
      g.position.set(PASS_SEATS[i][0], SEAT.y, PASS_SEATS[i][1]);
      plane.add(g);
      passengers.push({ g, legs, arms, seat: PASS_SEATS[i], leapT: T.leap + .9 + i * .8, jumped: false, gone: false, vel: V() });
    }
  }
  function stepPassengers(t, dt) {
    for (const p of passengers) {
      if (p.gone) continue;
      const g = p.g;
      if (!p.jumped) {
        const k = ease((t - (p.leapT - 1.0)) / 1.0);
        if (k > 0) {
          g.position.set(lerp(p.seat[0], 1.55, k), lerp(SEAT.y, -.93, k) + 1.2 * Math.sin(Math.PI * k), lerp(p.seat[1], -.35, k));
          g.rotation.y = lerp(0, Math.PI / 2, k);
        }
        if (t >= p.leapT) {
          g.updateWorldMatrix(true, false); g.getWorldPosition(tmpA);
          plane.remove(g); scene.add(g);
          outward.set(1, 0, 0).transformDirection(plane.matrixWorld);
          p.vel.copy(planeVel).addScaledVector(outward, 4 + R() * 3); p.vel.y += 2;
          g.position.copy(tmpA); g.rotation.set(0, Math.atan2(outward.x, outward.z), 0);
          p.jumped = true;
        }
      } else {
        p.vel.y += (-38 - p.vel.y) / 1.5 * dt;
        const dk = Math.exp(-.9 * dt); p.vel.x *= dk; p.vel.z *= dk;
        g.position.addScaledVector(p.vel, dt);
        g.rotation.x = damp(g.rotation.x, 1.25, 3, dt);
        p.arms[0].rotation.z = damp(p.arms[0].rotation.z, -1.25, 9, dt); p.arms[1].rotation.z = damp(p.arms[1].rotation.z, 1.25, 9, dt);
        p.legs[0].rotation.x = damp(p.legs[0].rotation.x, .45, 9, dt); p.legs[1].rotation.x = damp(p.legs[1].rotation.x, .45, 9, dt);
        if (t > T.deploy + .2) { g.visible = false; p.gone = true; }
      }
    }
  }

  // ---------------------------------------------------------------- partikel
  const tex = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.45, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const puffs = [];
  for (let i = 0; i < 56; i++) {
    const m = new THREE.SpriteMaterial({ map: tex, color: 0x222222, transparent: true, opacity: 0, depthWrite: false });
    const s = new THREE.Sprite(m); s.visible = false; scene.add(s);
    puffs.push({ s, m, life: 0, max: 2, v: V(), g0: 1, g1: 6, dark: .1 });
  }
  let puffIdx = 0;
  function emit(pos, dk) {
    const p = puffs[puffIdx++ % puffs.length];
    p.s.position.copy(pos); p.s.visible = true; p.life = 0; p.max = 1.6 + R() * .8;
    p.v.set((R() - .5) * 1.2, .8 + R() * 1.2, (R() - .5) * 1.2);
    p.g0 = .8 + R() * .6; p.g1 = 4.5 + R() * 3; p.dark = lerp(.5, .1, dk);
  }
  const fire = [];
  for (let i = 0; i < 4; i++) {
    const m = new THREE.SpriteMaterial({ map: tex, color: 0xff8a30, transparent: true, opacity: .9, depthWrite: false, blending: THREE.AdditiveBlending });
    const s = new THREE.Sprite(m); s.position.set((R() - .5) * .5, .5 + R() * .2, 3.6 + R() * .3); s.visible = false; plane.add(s); fire.push(s);
  }

  // garis angin (relatif terhadap kamera)
  const NS = 72, BX = 18, BY = 11;
  const spts = new Float32Array(NS * 3), slen = new Float32Array(NS), sfac = new Float32Array(NS);
  for (let i = 0; i < NS; i++) {
    spts[i * 3] = (R() - .5) * 2 * BX; spts[i * 3 + 1] = (R() - .5) * 2 * BY; spts[i * 3 + 2] = (R() - .5) * 2 * BX;
    slen[i] = 1.2 + R() * 2.4; sfac[i] = .8 + R() * .6;
  }
  const windGeo = new THREE.BufferGeometry();
  windGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(NS * 6), 3));
  const windMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, fog: false });
  const windLines = new THREE.LineSegments(windGeo, windMat);
  windLines.frustumCulled = false; windLines.visible = false; scene.add(windLines);

  // ---------------------------------------------------------------- awan dekoratif
  const cloudList = [];
  const addCluster = (cx, cy, cz, size) => {
    const n = 4 + Math.floor(R() * 3);
    for (let k = 0; k < n; k++) cloudList.push({ x: cx + (R() - .5) * size * 1.7, y: cy + (R() - .5) * size * .3, z: cz + (R() - .5) * size * 1.2, s: size * (.5 + R() * .5) });
  };
  for (let i = 0; i < 24; i++) {          // sepanjang jalur terbang
    const side = R() < .5 ? -1 : 1, lat = 22 + R() * (i < 8 ? 20 : 95);
    addCluster(lerp(PLANE_X0 + 40, 40, R()), lerp(125, 215, R()), PLANE_Z + side * lat, 7 + R() * 9);
  }
  for (let i = 0; i < 7; i++)             // koridor jatuh bebas: karakter menembus awan
    addCluster(lerp(-62, -18, R()), lerp(72, 125, R()), PLANE_Z + lerp(-8, 6, R()), 9 + R() * 6);
  const skyClouds = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1),
    new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), cloudList.length);
  skyClouds.frustumCulled = false; scene.add(skyClouds);
  const dummy = new THREE.Object3D();
  function writeClouds(k) {
    cloudList.forEach((c, i) => {
      dummy.position.set(c.x, c.y, c.z); dummy.rotation.set(0, 0, 0);
      dummy.scale.set(c.s * 1.35 * k, c.s * .75 * k, c.s * k); dummy.updateMatrix(); skyClouds.setMatrixAt(i, dummy.matrix);
    });
    skyClouds.instanceMatrix.needsUpdate = true;
  }
  writeClouds(1);

  // ---------------------------------------------------------------- parasut
  const NG = 12, CY = 4.9 - PC;
  const cm = [M(0xd8532f, .8, { side: THREE.DoubleSide, transparent: true }), M(0xf3ead2, .8, { side: THREE.DoubleSide, transparent: true })];
  const canopy = new THREE.Group(); canopy.visible = false; player.add(canopy);
  for (let i = 0; i < NG; i++) {
    const g = new THREE.SphereGeometry(3.4, 3, 8, i * Math.PI * 2 / NG, Math.PI * 2 / NG, 0, Math.PI / 2.05);
    const m = new THREE.Mesh(g, cm[i % 2]); m.scale.set(1, .72, 1); canopy.add(m);
  }
  const lineGeo = new THREE.BufferGeometry();
  const lpos = new Float32Array(NG * 6);
  lineGeo.setAttribute("position", new THREE.BufferAttribute(lpos, 3));
  const lineMat = new THREE.LineBasicMaterial({ color: 0xe8e0cc });
  const chuteLines = new THREE.LineSegments(lineGeo, lineMat); chuteLines.frustumCulled = false; chuteLines.visible = false; player.add(chuteLines);
  function updateChute(s) {
    const cs = clamp(s, 0, 1);
    canopy.scale.set(s, s * (1 + .03 * Math.sin(time * 3)), s);
    canopy.position.set(0, lerp(1.7 - PC, CY, cs), lerp(-.5, 0, cs));
    const R0 = 3.4 * s, ry = canopy.position.y + .06 * s;
    for (let i = 0; i < NG; i++) {
      const a = i * Math.PI * 2 / NG, o = i * 6, cx = Math.cos(a);
      lpos[o] = R0 * cx; lpos[o + 1] = ry; lpos[o + 2] = R0 * Math.sin(a) + canopy.position.z;
      lpos[o + 3] = Math.sign(cx || 1) * .18; lpos[o + 4] = 1.75 - PC; lpos[o + 5] = 0;
    }
    lineGeo.attributes.position.needsUpdate = true;
  }

  // ---------------------------------------------------------------- UI overlay
  const mk = (tag, css) => { const e = document.createElement(tag); e.style.cssText = css; return e; };
  const ui = mk("div", "position:fixed;inset:0;z-index:40;pointer-events:none;overflow:hidden;font-family:system-ui,-apple-system,sans-serif");
  const redV = mk("div", "position:absolute;inset:0;opacity:0;background:radial-gradient(ellipse at center,rgba(255,0,0,0) 42%,rgba(255,25,10,.6) 100%)");
  const flash = mk("div", "position:absolute;inset:0;opacity:0;background:#ffc27a");
  const barT = mk("div", "position:absolute;left:0;right:0;top:0;height:0;background:#000");
  const barB = mk("div", "position:absolute;left:0;right:0;bottom:0;height:0;background:#000");
  const cap = mk("div", "position:absolute;left:0;right:0;bottom:calc(11vh + 22px);text-align:center;font-weight:600;font-size:clamp(15px,4vw,24px);letter-spacing:.02em;text-shadow:0 2px 8px rgba(0,0,0,.85);opacity:0;padding:0 16px;color:#fff");
  const black = mk("div", "position:absolute;inset:0;background:#000;opacity:1");
  const skipBtn = mk("button", "position:absolute;top:calc(env(safe-area-inset-top,0px) + 12px);right:12px;pointer-events:auto;padding:8px 16px;border-radius:999px;border:1px solid rgba(255,255,255,.4);background:rgba(0,0,0,.45);color:#fff;font:600 14px system-ui,sans-serif;letter-spacing:.03em;touch-action:manipulation");
  skipBtn.textContent = "Lewati \u203a";
  ui.append(redV, flash, barT, barB, cap, black, skipBtn);
  document.body.appendChild(ui);
  skipBtn.addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); skip(); });
  const onKey = e => { if (e.code === "Escape" || e.code === "Enter") skip(); };
  addEventListener("keydown", onKey);
  for (const c of controls) { c.style.transition = "opacity .8s"; c.style.opacity = "0"; c.style.pointerEvents = "none"; }

  const CAPS = [
    [1.7, 3.3, "Terbang di atas lautan lepas\u2026", 0],
    [3.5, 6.4, "Mesin mati! Pesawat kehilangan tenaga!", 1],
    [7.9, 9.4, "Tidak ada pilihan lain \u2014 lompat!", 0],
    [14.15, 16.5, "Parasut terbuka!", 0],
    [17.8, 21.2, "Sebuah pulau\u2026 dan perjuangan bertahan hidup dimulai.", 0],
  ];
  function updateUI(t, dt) {
    if (skipping >= 0) { skipping += dt; black.style.opacity = Math.min(1, skipping / .35); }
    else black.style.opacity = 1 - ss(.6, 1.9, t);
    const bar = lerp(0, 11, ease((t - .3) / 1.4)) * (1 - ease((t - (T.end - 1.3)) / 1.3));
    barT.style.height = barB.style.height = bar + "vh";
    let a = 0, txt = null, warnC = 0;
    for (const [s, e, x, w] of CAPS) if (t >= s && t <= e) { a = Math.min(ss(s, s + .35, t), 1 - ss(e - .35, e, t)); txt = x; warnC = w; }
    if (txt !== null && cap.textContent !== txt) cap.textContent = txt;
    cap.style.opacity = a; cap.style.color = warnC ? "#ff8a78" : "#fff";
    const warn = t > T.warn && t < T.leap + .3;
    const bl = warn ? .5 + .5 * Math.sin(t * 9) : 0;
    redI = damp(redI, warn ? .3 + .6 * bl : 0, 8, dt);
    redV.style.opacity = redI;
    flash.style.opacity = t >= T.bang ? .85 * Math.exp(-(t - T.bang) * 7) : 0;
  }

  // ---------------------------------------------------------------- awal: karakter duduk di kokpit
  plane.add(player);
  player.rotation.order = "YXZ";
  player.position.set(0, SEAT.y, SEAT.z);
  player.rotation.set(0, 0, 0);
  body.position.y = -FOOT;
  shadow.visible = false;

  // ---------------------------------------------------------------- pose karakter
  const S = (o, k, v, dt, rate = 12) => { o[k] = damp(o[k], v, rate, dt); };

  function poseSeated(t, dt) {
    const tr = ss(T.warn, T.bang + .4, t);
    S(leftLeg.rotation, "x", -1.42, dt); S(rightLeg.rotation, "x", -1.42, dt);
    S(leftLeg.rotation, "z", -.06, dt); S(rightLeg.rotation, "z", .06, dt);
    S(leftArm.rotation, "x", -1.12 + Math.sin(t * 31) * .05 * tr, dt, 20);
    S(rightArm.rotation, "x", -1.12 - Math.sin(t * 29) * .05 * tr, dt, 20);
    S(leftArm.rotation, "z", -.12, dt); S(rightArm.rotation, "z", .12, dt);
    S(head.rotation, "y", t < T.warn ? Math.sin(t * .55) * .28 : Math.sin((t - T.warn) * 3.1) * .6 * tr, dt, 8);
    S(head.rotation, "x", 0, dt);
    body.rotation.z = Math.sin(t * 23) * .025 * tr;
    body.rotation.x = .04 + Math.sin(t * 19) * .02 * tr;
    body.position.y = -FOOT + Math.sin(t * 40) * .01 * tr;
    scarfTail.rotation.x = Math.sin(t * 5) * .1 - .15 - tr * .3;
  }

  function stepChar(t, dt) {
    if (!jumped && t >= T.leap) leap(t);
    if (!jumped) {
      const a = ease((t - T.stand) / (T.toDoor - T.stand)), b = ease((t - T.toDoor) / (T.leap - T.toDoor));
      if (t < T.stand) poseSeated(t, dt);
      else {
        player.position.set(lerp(0, 1.55, b), lerp(SEAT.y, -.93, a) + 1.5 * Math.sin(Math.PI * b) + .9 * b * b, lerp(SEAT.z, -.35, a));
        player.rotation.y = lerp(0, Math.PI / 2, ease(b * 1.4));
        body.rotation.x = .5 * a * (1 - b); body.rotation.z = 0;
        S(leftLeg.rotation, "x", lerp(lerp(-1.42, -.15, a), -.9, b), dt, 20); S(rightLeg.rotation, "x", lerp(lerp(-1.42, -.15, a), -.9, b), dt, 20);
        S(leftArm.rotation, "x", lerp(lerp(-1.12, -.5, a), -2.2, b), dt, 20); S(rightArm.rotation, "x", lerp(lerp(-1.12, -.5, a), -2.2, b), dt, 20);
        S(leftArm.rotation, "z", -.1 - b * .6, dt, 20); S(rightArm.rotation, "z", .1 + b * .6, dt, 20);
        scarfTail.rotation.x = Math.sin(t * 11) * .3 - .5;
      }
      player.getWorldPosition(charWorld); charWorld.y += 1.2;
      focus.copy(planePos);
      return;
    }

    // ---- sudah di luar pesawat ----
    const fall = t - T.leap;
    if (t < T.deploy) {                                   // jatuh bebas
      charVel.y += (-38 - charVel.y) / 1.5 * dt;
      const dk = Math.exp(-.9 * dt); charVel.x *= dk; charVel.z *= dk;
      player.position.addScaledVector(charVel, dt);
      player.rotation.y += angDiff(Math.PI / 2 - player.rotation.y) * (1 - Math.exp(-dt * 2.2));
      S(player.rotation, "x", 1.25 + .25 * Math.sin(fall * 3) * Math.exp(-fall * .7), dt, 4);
      S(player.rotation, "z", .22 * Math.sin(fall * 2.1) * (1 + Math.exp(-fall)), dt, 6);
      S(leftArm.rotation, "x", -.45, dt, 9); S(rightArm.rotation, "x", -.45, dt, 9);
      S(leftArm.rotation, "z", -1.25, dt, 9); S(rightArm.rotation, "z", 1.25, dt, 9);
      S(leftLeg.rotation, "x", .45, dt, 9); S(rightLeg.rotation, "x", .45, dt, 9);
      S(leftLeg.rotation, "z", -.28, dt, 9); S(rightLeg.rotation, "z", .28, dt, 9);
      S(head.rotation, "x", -1.0, dt, 8); S(head.rotation, "y", 0, dt, 8);
      scarfTail.rotation.x = -.5 + Math.sin(t * 30) * .35;
      body.rotation.set(0, 0, 0);
    } else {
      if (!deployed) { deployed = true; canopy.visible = true; chuteLines.visible = true; shakeKick = .2; fovKick = -9; }
      const dtp = t - T.deploy;
      if (!landed) updateChute(.04 + .96 * outBack(dtp / .75));
      if (dtp < 1) {                                      // hentakan parasut
        charVel.y += (-6.5 - charVel.y) / .28 * dt;
        const dk = Math.exp(-2.2 * dt); charVel.x *= dk; charVel.z *= dk;
        player.position.addScaledVector(charVel, dt);
      } else if (t < T.land) {                            // meluncur terpandu ke titik mendarat
        if (!guided) {
          guided = true; P1.copy(player.position); P1.y -= PC;
          yawChute = Math.atan2(LAND.x - P1.x, LAND.z - P1.z);
        }
        const u = clamp((t - (T.deploy + 1)) / (T.land - T.deploy - 1), 0, 1), e = ease(u);
        const dx = LAND.x - P1.x, dz = LAND.z - P1.z, dl = Math.hypot(dx, dz) || 1;
        const sw = 1.6 * Math.sin(u * 7.5) * (1 - u) * ss(0, .15, u);
        player.position.set(lerp(P1.x, LAND.x, e) - dz / dl * sw, P1.y * Math.pow(1 - u, 1.25) + PC, lerp(P1.z, LAND.z, e) + dx / dl * sw);
      }
      if (t < T.land) {
        player.rotation.y += angDiff((guided ? yawChute : Math.PI / 2) - player.rotation.y) * (1 - Math.exp(-dt * 3));
        const flare = ss(T.land - 1.2, T.land - .5, t);
        S(player.rotation, "x", lerp(.07 + .04 * Math.sin(t * 1.2), -.12, flare), dt, 6);
        S(player.rotation, "z", .06 * Math.sin(t * 1.1) * (1 - flare), dt, 6);
        S(leftArm.rotation, "x", lerp(-2.6, -2.1, flare), dt, 10); S(rightArm.rotation, "x", lerp(-2.6, -2.1, flare), dt, 10);
        S(leftArm.rotation, "z", -.18, dt, 10); S(rightArm.rotation, "z", .18, dt, 10);
        S(leftLeg.rotation, "x", lerp(.12 + Math.sin(t * 1.7) * .08, -.85, flare), dt, 8);
        S(rightLeg.rotation, "x", lerp(.12 - Math.sin(t * 1.7) * .08, -.85, flare), dt, 8);
        S(leftLeg.rotation, "z", -.07, dt, 8); S(rightLeg.rotation, "z", .07, dt, 8);
        S(head.rotation, "x", -.3, dt, 8); S(head.rotation, "y", Math.sin(t * .8) * .25, dt, 4);
        scarfTail.rotation.x = Math.sin(t * 9) * .25 - .4;
      } else {                                            // mendarat
        if (!landed) { landed = true; collapseChute(); }
        const lt = t - T.land;
        player.position.set(LAND.x, PC, LAND.z);
        S(player.rotation, "x", 0, dt, 10); S(player.rotation, "z", 0, dt, 10);
        S(leftArm.rotation, "x", 0, dt, 6); S(rightArm.rotation, "x", 0, dt, 6);
        S(leftArm.rotation, "z", -.1, dt, 6); S(rightArm.rotation, "z", .1, dt, 6);
        S(leftLeg.rotation, "x", 0, dt, 7); S(rightLeg.rotation, "x", 0, dt, 7);
        S(leftLeg.rotation, "z", 0, dt, 7); S(rightLeg.rotation, "z", 0, dt, 7);
        S(head.rotation, "x", 0, dt, 6); S(head.rotation, "y", Math.sin(lt * 1.3) * .3, dt, 3);
        const sq = .22 * Math.exp(-lt * 7) * Math.cos(lt * 17);
        body.scale.set(1 + sq * .5, 1 - sq, 1 + sq * .5);
        scarfTail.rotation.x = Math.sin(t * 5) * .1 - .15;
      }
    }
    body.rotation.set(0, 0, 0);
    lastYaw = player.rotation.y;
    charWorld.copy(player.position);
    focus.copy(player.position);
  }

  function leap() {
    jumped = true;
    player.updateWorldMatrix(true, false);
    player.getWorldPosition(charWorld);
    plane.remove(player); scene.add(player);
    outward.set(1, 0, 0).transformDirection(plane.matrixWorld);
    charVel.copy(planeVel).addScaledVector(outward, 5.5); charVel.y += 2.5;
    player.position.set(charWorld.x, charWorld.y + PC, charWorld.z);
    body.position.y = -FOOT - PC;
    player.rotation.set(0, Math.atan2(outward.x, outward.z), 0);
    prevC.copy(player.position);
    fovKick = 10; shakeKick = .14;
  }

  function collapseChute() {
    canopy.getWorldPosition(tmpA);
    player.remove(canopy); player.remove(chuteLines); chuteLines.visible = false;
    scene.add(canopy); canopy.position.copy(tmpA); canopy.rotation.set(0, 0, 0); collapseT = 0;
  }

  // ---------------------------------------------------------------- pesawat per frame
  function stepPlane(t, dt) {
    const pitch = .02 * Math.sin(t * .6) + .30 * ease((t - T.bang) / 3) + .35 * ss(T.leap - 1, T.leap + 4, t);
    const roll = .03 * Math.sin(t * .7)
      + (t > T.bang ? .2 * Math.sin((t - T.bang) * 2.3) * ease((t - T.bang) / 1.2) : 0)
      + clamp(t - T.leap, 0, 6) * .5;
    const sp = SPEED + clamp(t - T.leap, 0, 4) * 2.5;
    if (plane.visible) {
      planePos.x += sp * Math.cos(pitch) * dt; planePos.y -= sp * Math.sin(pitch) * dt;
      planeVel.set(sp * Math.cos(pitch), -sp * Math.sin(pitch), 0);
    }
    plane.position.copy(planePos);
    plane.rotation.set(pitch, Math.PI / 2 + (t > T.bang ? Math.sin(t * 17) * .006 : 0), roll);
    if (t > T.leap + 6.5) plane.visible = false;
    plane.updateMatrixWorld(true);

    door.rotation.y = -1.25 * outBack((t - T.stand) / .6) + Math.sin(t * 14) * .03 * ss(T.stand, T.stand + .8, t);
    const fail = t >= T.bang;
    const omega = fail ? lerp(46, 3, ease((t - T.bang) / 2.2)) * (.65 + .35 * Math.sin((t - T.bang) * 13)) : 46;
    prop.rotation.z += omega * dt;
    disc.material.opacity = .14 * clamp(omega / 40, 0, 1);

    const warn = t > T.warn && t < T.leap + .3, bl = warn ? .5 + .5 * Math.sin(t * 9) : 0;
    lampM.emissiveIntensity = bl * 3; warnLight.intensity = bl * 7;

    for (const f of fire) {
      f.visible = fail && plane.visible;
      const k = 1.1 + Math.sin(t * 40 + f.position.x * 9) * .5 + R() * .4;
      f.scale.set(k * 1.3, k * 1.3, 1);
    }
    if (fail && plane.visible) {
      emitAcc += dt * 32;
      while (emitAcc >= 1) {
        emitAcc -= 1;
        tmpA.set((R() - .5) * .3, .55, 3.3); plane.localToWorld(tmpA);
        emit(tmpA, clamp((t - T.bang) / 1.4, 0, 1));
      }
    }
  }

  function stepFX(t, dt) {
    for (const p of puffs) {
      if (!p.s.visible) continue;
      p.life += dt; const k = p.life / p.max;
      if (k >= 1) { p.s.visible = false; continue; }
      p.s.position.addScaledVector(p.v, dt);
      const sc = lerp(p.g0, p.g1, Math.pow(k, .6)); p.s.scale.set(sc, sc, 1);
      p.m.opacity = .85 * Math.pow(1 - k, 1.3);
      const c = lerp(p.dark, .45, k); p.m.color.setRGB(c, c, c);
    }
    const ck = 1 - ss(T.deploy + 2.5, T.land - .5, t);
    if (Math.abs(ck - cloudK) > .004) { cloudK = ck; writeClouds(Math.max(ck, .0001)); skyClouds.visible = ck > .01; }
  }

  function windIntensity(t) {
    let w = .6 * ss(4.0, 5.2, t) + .4 * ss(T.stand, T.stand + .8, t);
    w *= 1 - .75 * ss(T.deploy, T.deploy + 1.8, t);
    w *= 1 - ss(T.deploy + 3, T.land - 1, t);
    return w;
  }
  function stepWind(t, dt) {
    const sp = velEff.length(), op = Math.min(.6, windIntensity(t) * clamp(sp / 30, 0, 1) * .7);
    windMat.opacity = op; windLines.visible = op > .01;
    if (!windLines.visible) return;
    const hx = velEff.x / sp, hy = velEff.y / sp, hz = velEff.z / sp, move = sp * dt * 1.15, pos = windGeo.attributes.position.array;
    for (let i = 0; i < NS; i++) {
      const o = i * 3, m = move * sfac[i];
      let x = spts[o] - hx * m, y = spts[o + 1] - hy * m, z = spts[o + 2] - hz * m;
      if (x < -BX) x += 2 * BX; else if (x > BX) x -= 2 * BX;
      if (y < -BY) y += 2 * BY; else if (y > BY) y -= 2 * BY;
      if (z < -BX) z += 2 * BX; else if (z > BX) z -= 2 * BX;
      spts[o] = x; spts[o + 1] = y; spts[o + 2] = z;
      const L = slen[i] * (.4 + sp * .045), q = i * 6;
      pos[q] = camera.position.x + x; pos[q + 1] = camera.position.y + y; pos[q + 2] = camera.position.z + z;
      pos[q + 3] = pos[q] + hx * L; pos[q + 4] = pos[q + 1] + hy * L; pos[q + 5] = pos[q + 2] + hz * L;
    }
    windGeo.attributes.position.needsUpdate = true;
  }

  // ---------------------------------------------------------------- kamera sinematik
  const planeUp = o => o.set(0, 1, 0).transformDirection(plane.matrixWorld);
  const shots = [
    { t0: 0, t1: T.bang + 1, blend: 0, f: shotA },
    { t0: 4.2, t1: 7.4, blend: 1.5, f: shotB },
    { t0: 7.4, t1: 10.0, blend: 1.1, f: shotC },
    { t0: 10.0, t1: 14.2, blend: 1.0, f: shotD },
    { t0: 14.2, t1: 18.0, blend: 1.1, f: shotE1 },
    { t0: 18.0, t1: T.land - .6, blend: 1.4, f: shotE2 },
    { t0: T.land - .6, t1: T.end, blend: 2.0, f: shotF },
  ];
  const mkPose = () => ({ pos: V(), look: V(), up: V(0, 1, 0), fov: 58 });
  const camA = mkPose(), camB = mkPose();

  function shotA(t, u, o) {                                   // dari bahu pilot di dalam kokpit
    tmpA.set(.82, .72, lerp(-2.2, -1.85, u)); o.pos.copy(plane.localToWorld(tmpA));
    tmpB.set(0, .05, 2.6); o.look.copy(plane.localToWorld(tmpB));
    planeUp(o.up).lerp(UP, .25).normalize();
    o.fov = 54 - 4 * ease((t - T.bang) / .4);
  }
  function shotB(t, u, o) {                                   // pesawat dari depan-kanan, berputar pelan
    const e = ease(u), phi = lerp(.5, 1.2, e), r = lerp(30, 23, e);
    o.pos.copy(planePos).addScaledVector(FWD, Math.cos(phi) * r).addScaledVector(RGT, Math.sin(phi) * r);
    o.pos.y += lerp(-1.5, 5, e);
    o.look.copy(planePos); o.look.y += .3; o.up.copy(UP); o.fov = 46;
  }
  function shotC(t, u, o) {                                   // kamera menempel di sisi pintu
    tmpA.set(7.6, .9, -.8); o.pos.copy(plane.localToWorld(tmpA));
    tmpB.set(1.2, .1, -.5); plane.localToWorld(tmpB);
    if (jumped) tmpB.lerp(charWorld, ease((t - T.leap) / .5));
    o.look.copy(tmpB);
    planeUp(o.up).lerp(UP, .5).normalize();
    o.fov = t < T.leap ? 56 : 60;
  }
  function shotD(t, u, o) {                                   // mengejar karakter jatuh bebas
    const az = Math.PI * lerp(.82, 1.18, ease(u)), r = lerp(7.4, 6.2, u);
    o.pos.set(trk.x + Math.cos(az) * r, trk.y + lerp(4.6, 3.4, u), trk.z + Math.sin(az) * r);
    o.look.set(trk.x + 1.2, trk.y - .8, trk.z); o.up.copy(UP); o.fov = lerp(70, 80, ease(u));
  }
  function shotE1(t, u, o) {                                  // dari depan-bawah, menatap parasut
    const az = lerp(-.35, -1.3, ease(u)), r = lerp(8.5, 9.5, u);
    o.pos.set(trk.x + Math.cos(az) * r, trk.y + lerp(.6, 2.2, u), trk.z + Math.sin(az) * r);
    o.look.set(trk.x, trk.y + 3.0, trk.z); o.up.copy(UP); o.fov = lerp(62, 52, ease(u));
  }
  function shotE2(t, u, o) {                                  // menjauh, menampakkan pulau
    const e = ease(u), az = lerp(-1.3, -2.5, e), r = lerp(9.5, 15, e);
    o.pos.set(trk.x + Math.cos(az) * r, trk.y + lerp(2.2, 5, e), trk.z + Math.sin(az) * r);
    o.look.set(trk.x, trk.y + 1.6, trk.z); o.up.copy(UP); o.fov = lerp(52, 58, e);
  }
  function shotF(t, u, o) {                                   // menyatu dengan kamera gameplay
    const th = lastYaw + Math.PI, sp = Math.sin(orbit.phi) * orbit.radius;
    o.look.set(LAND.x, 1.5, LAND.z);
    o.pos.set(o.look.x + sp * Math.sin(th), o.look.y + Math.cos(orbit.phi) * orbit.radius, o.look.z + sp * Math.cos(th));
    o.up.copy(UP); o.fov = 58;
  }
  const evalShot = (i, t, o) => { const s = shots[i]; s.f(t, clamp((t - s.t0) / (s.t1 - s.t0), 0, 1), o); };

  function updateCamera(t, dt) {
    if (!jumped) trk.copy(charWorld);
    else { const k = t < T.deploy + .2 ? 8 : 4; trk.x = damp(trk.x, player.position.x, k, dt); trk.y = damp(trk.y, player.position.y, k, dt); trk.z = damp(trk.z, player.position.z, k, dt); }
    let idx = 0; while (idx < shots.length - 1 && t >= shots[idx + 1].t0) idx++;
    evalShot(idx, t, camA);
    const s = shots[idx];
    if (idx > 0 && s.blend > 0 && t - s.t0 < s.blend) {
      evalShot(idx - 1, t, camB);
      const k = ease((t - s.t0) / s.blend);
      camA.pos.lerpVectors(camB.pos, camA.pos, k); camA.look.lerpVectors(camB.look, camA.look, k);
      camA.up.lerpVectors(camB.up, camA.up, k); camA.fov = lerp(camB.fov, camA.fov, k);
    }
    const base = t < T.warn ? .004 : t < T.bang ? .004 + .014 * ss(T.warn, T.bang, t) : t < T.deploy ? .025 : 0;
    const amp = (base + shakeKick) * (idx === 0 ? 1 : idx <= 2 ? 3 : 2);
    shakeKick *= Math.exp(-dt * 3); fovKick *= Math.exp(-dt * 3);
    camA.pos.x += Math.sin(t * 41) * amp; camA.pos.y += Math.sin(t * 37 + 1.3) * amp; camA.pos.z += Math.sin(t * 47 + 2.1) * amp;
    camera.position.copy(camA.pos);
    camera.up.copy(camA.up).normalize();
    camera.lookAt(camA.look);
    const fov = camA.fov + fovKick;
    if (Math.abs(camera.fov - fov) > .01) { camera.fov = fov; camera.updateProjectionMatrix(); }
  }

  // ---------------------------------------------------------------- loop utama intro
  function update(dt) {
    if (finished) { tail(dt); return false; }
    time += dt;
    const t = time;
    updateAudio(t);
    stepPlane(t, dt);
    stepChar(t, dt);
    stepPassengers(t, dt);
    stepFX(t, dt);
    updateCamera(t, dt);
    if (jumped) { velEff.copy(player.position).sub(prevC).divideScalar(Math.max(dt, 1e-3)); prevC.copy(player.position); }
    else velEff.copy(planeVel);
    if (velEff.lengthSq() < 1e-4) velEff.set(0, -.01, 0);
    stepWind(t, dt);
    world.update(dt, focus, camera);
    // kabut dijauhkan saat di udara agar laut & pulau terlihat; kembali normal menjelang mendarat
    const f = t < T.deploy + .6 ? 1 : 1 - ss(T.deploy + .6, T.land - .8, t);
    scene.fog.near = lerp(scene.fog.near, 40, f); scene.fog.far = lerp(scene.fog.far, 320, f);
    updateUI(t, dt);
    if (skipping >= .35) finish(true);
    else if (t >= T.end) finish(false);
    return !finished;
  }

  function skip() { if (!finished && skipping < 0) skipping = 0; }

  function finish(skipped) {
    if (finished) return;
    finished = true;
    removeEventListener("keydown", onKey);
    window.removeEventListener("pointerdown", audioUnlock);
    window.removeEventListener("keydown", audioUnlock);
    if (audioCtx) {
      try { audioMaster.gain.setTargetAtTime(0, audioCtx.currentTime, 0.12); setTimeout(() => audioCtx && audioCtx.close().catch(() => {}), 700); } catch (_) {}
    }
    if (!jumped) { plane.remove(player); scene.add(player); }
    else if (!landed) { player.remove(canopy); player.remove(chuteLines); canopy.visible = false; }
    const yaw = jumped ? lastYaw : Math.PI / 2;
    player.rotation.order = "XYZ"; player.rotation.set(0, yaw, 0); player.position.set(LAND.x, 0, LAND.z);
    body.position.set(0, -FOOT, 0); body.rotation.set(0, 0, 0); body.scale.set(1, 1, 1);
    head.rotation.x = 0; head.rotation.z = 0; leftLeg.rotation.z = 0; rightLeg.rotation.z = 0;
    shadow.visible = true;
    // lampu peringatan tetap di scene (intensitas 0) supaya jumlah lampu tidak berubah
    plane.remove(warnLight); scene.add(warnLight); warnLight.position.set(0, -500, 0); warnLight.intensity = 0;
    scene.remove(plane); scene.remove(skyClouds); scene.remove(windLines);
    for (const p of passengers) scene.remove(p.g);
    for (const p of puffs) scene.remove(p.s);
    camera.up.set(0, 1, 0); camera.fov = 58; camera.updateProjectionMatrix();
    barT.style.height = barB.style.height = "0";
    if (skipped) { black.style.transition = "opacity .7s"; requestAnimationFrame(() => { black.style.opacity = 0; }); }
    else black.style.opacity = 0;
    setTimeout(() => ui.remove(), 1000);
    for (const c of controls) { c.style.opacity = ""; c.style.pointerEvents = ""; }
    setTimeout(() => { for (const c of controls) c.style.transition = ""; }, 1000);
    if (onFinish) onFinish({ yaw });
  }

  // sisa efek setelah kontrol aktif: kanopi parasut roboh lalu menghilang
  function tail(dt) {
    if (tailDone) return;
    tailT += dt;
    if (collapseT >= 0) {
      collapseT += dt;
      const c = ease(collapseT / 1.1);
      canopy.scale.set(lerp(1, 1.35, c), lerp(1, .12, c), lerp(1, 1.35, c));
      canopy.position.y = lerp(canopy.position.y, .5, 1 - Math.exp(-dt * 2.5));
      canopy.position.x -= .6 * dt * (1 - c);
      const fade = 1 - ss(3.5, 5, collapseT);
      cm[0].opacity = cm[1].opacity = fade;
    }
    if (tailT > 5.2) {
      scene.remove(canopy); tailDone = true;
    }
  }

  return { update, skip, get active() { return !finished; } };
}
