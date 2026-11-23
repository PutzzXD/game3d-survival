import * as THREE from "three";

const { clamp, lerp, smoothstep } = THREE.MathUtils;
const mat = (c, r = .9, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...o });

// ---------- Ukuran dunia (jauh lebih luas) & lautan di sekelilingnya ----------
export const WORLD = { x: 130, zMin: -230, zMax: 130 };
const SHORE = 9, WATER_Y = -.55, WEATHER_SEC = 300; // tiap fase cuaca (siang -> malam -> hujan) berlangsung 5 menit
const inside = (x, z) => Math.min(WORLD.x - Math.abs(x), z - WORLD.zMin, WORLD.zMax - z);
function groundH(x, z) {
  const d = inside(x, z);
  if (d >= SHORE) return -.04;
  if (d >= 0) return lerp(-.04, -.6, smoothstep(1 - d / SHORE, 0, 1));
  return -.6 - Math.min(-d * .08, 5.4);
}
function rng(s) {
  return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

// ---------- Preset cuaca: siang -> malam -> hujan (loop) ----------
const NUM = ["near","far","hemi","sun","expo","seaY","amp","rain","dust","wet","dry","cloud","sunVis","night"];
const COL = ["sky","fog","sunC","sea","cloudC","leaf"];
const C = h => new THREE.Color(h);
const WHITE = C(0xffffff);
const preset = p => ({ ...p, sky:C(p.sky), fog:C(p.fog), sunC:C(p.sunC), sea:C(p.sea), cloudC:C(p.cloudC), leaf:new THREE.Color().setRGB(...p.leaf) });
const ORDER = ["siang", "malam", "hujan"];
const WEATHER = {
  siang:   preset({ sky:0x84c8ee, fog:0xbfe3f0, near:45, far:190, hemi:2.3, sun:2.9, sunC:0xfff0cf, expo:1.18, sea:0x1fa7c9, seaY:0,   amp:.12, rain:0, dust:0, wet:0, dry:0, cloud:.35, cloudC:0xffffff, sunVis:1, night:0, leaf:[1,1.02,.95] }),
  hujan:   preset({ sky:0x647079, fog:0x728089, near:10, far:95,  hemi:1.25,sun:.35, sunC:0xaec0d0, expo:.92,  sea:0x2c4b5b, seaY:.1,  amp:.3,  rain:1, dust:0, wet:1, dry:0, cloud:1,   cloudC:0x59636c, sunVis:0, night:0, leaf:[.72,.84,.8] }),
  malam:   preset({ sky:0x0a1226, fog:0x101a33, near:22, far:125, hemi:.75, sun:.32, sunC:0x8fa8e8, expo:1.05, sea:0x0d3550, seaY:0,   amp:.09, rain:0, dust:0, wet:0, dry:0, cloud:.3, cloudC:0x2b3550, sunVis:0, night:1, leaf:[.5,.62,.85] }),
};

export function createMap(scene, { renderer, hemi, sun }) {
  const R = rng(7), dummy = new THREE.Object3D(), t0 = performance.now();
  const cur = {};
  for (const k of NUM) cur[k] = WEATHER.siang[k];
  for (const k of COL) cur[k] = WEATHER.siang[k].clone();

  scene.background = cur.sky.clone();
  scene.fog = new THREE.Fog(cur.fog.getHex(), cur.near, cur.far);
  scene.add(sun.target);

  // ---------- Daratan (terrain dengan pantai landai) ----------
  const cell = 3, TX = 400, TZ = 500;
  const tg = new THREE.PlaneGeometry(TX, TZ, Math.round(TX / cell), Math.round(TZ / cell));
  tg.rotateX(-Math.PI / 2); tg.translate(0, 0, -50);
  const tp = tg.attributes.position, n = tp.count;
  const gw = new Float32Array(n), sw = new Float32Array(n), uw = new Float32Array(n), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const x = tp.getX(i), z = tp.getZ(i), h = groundH(x, z), d = inside(x, z);
    tp.setY(i, h);
    gw[i] = .92 + .1 * (Math.sin(x * .23 + 1.3) * Math.sin(z * .19) * .5 + Math.sin(x * .07 + z * .06) * .5);
    sw[i] = 1 - smoothstep(d, 4, 8.5);
    uw[i] = clamp((-h - .35) / 1.3, 0, 1);
  }
  tg.computeVertexNormals();
  tg.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const terrain = new THREE.Mesh(tg, mat(0xffffff, 1, { vertexColors: true }));
  terrain.receiveShadow = true; scene.add(terrain);
  const GR = [.13,.21,.085], DR = [.33,.26,.075], SD = [.62,.52,.30], UW = [.03,.16,.2];
  let lastDry = -1, lastWet = -1;
  function paintTerrain() {
    const dry = cur.dry, wet = cur.wet;
    for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) {
      const g = lerp(GR[c], DR[c], dry) * gw[i] * (1 - .35 * wet);
      const s = SD[c] * (1 - .3 * wet);
      col[i * 3 + c] = lerp(lerp(g, s, sw[i]), UW[c], uw[i] * .65);
    }
    tg.attributes.color.needsUpdate = true; lastDry = dry; lastWet = wet;
  }
  paintTerrain();

  const pathMat = mat(0x756047);
  const path = new THREE.Mesh(new THREE.PlaneGeometry(5, 330), pathMat);
  path.rotation.x = -Math.PI / 2; path.position.set(0, .005, -50); path.receiveShadow = true; scene.add(path);

  // ---------- Lautan bergelombang (mengikuti pemain) ----------
  // Ombak dihitung di GPU (vertex shader): swell laut lepas + riak kecil + ombak yang
  // bergulung menuju garis pantai, lengkap dengan buih. Tinggi gelombang ikut cuaca (cur.amp).
  const OCEAN = 500, OSEG = 160, OCELL = OCEAN / OSEG;   // kisi dunia tetap diam saat laut mengikuti pemain
  const oceanMat = mat(0x1fa7c9, .3, { transparent: true, opacity: .88, flatShading: true });
  const oceanU = { uTime: { value: 0 }, uAmp: { value: .12 } };
  const F1 = v => v.toFixed(1);
  oceanMat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, oceanU);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", `#include <common>
uniform float uTime, uAmp;
varying float vD;
varying vec3 vWP;
// jarak ke garis pantai: > 0 di darat, < 0 di laut
float coastD(vec2 p){ return min(min(${F1(WORLD.x)} - abs(p.x), p.y - (${F1(WORLD.zMin)})), ${F1(WORLD.zMax)} - p.y); }
float waveH(vec2 p, float d){
  float h = (sin(p.x * .13 + uTime * .9) + sin(p.y * .11 + uTime * 1.2) * .8 + sin((p.x + p.y) * .06 + uTime * .5) * 1.2) * uAmp / 3.0;
  h += (sin(p.x * .55 + p.y * .35 + uTime * 1.7) + sin(p.y * .7 - p.x * .2 + uTime * 2.1)) * uAmp * .06;
  float shoal = smoothstep(-45.0, -4.0, d) * (1.0 - smoothstep(0.0, 4.0, d));
  float swell = pow(sin(d * .30 - uTime * 1.5) * .5 + .5, 2.2);
  return h + swell * shoal * (.18 + uAmp * 1.2);
}`)
      .replace("#include <begin_vertex>", `vec3 transformed = vec3(position);
vec4 wp0 = modelMatrix * vec4(position, 1.0);
vD = coastD(wp0.xz);
float wh = waveH(wp0.xz, vD);
transformed.y += wh;
vWP = vec3(wp0.x, wp0.y + wh, wp0.z);`);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>
uniform float uTime, uAmp;
varying float vD;
varying vec3 vWP;`)
      .replace("#include <color_fragment>", `#include <color_fragment>
{
  float crest = smoothstep(.72, 1.0, sin(vD * .30 - uTime * 1.5) * .5 + .5);
  float band = smoothstep(-40.0, -3.0, vD) * (1.0 - smoothstep(.5, 3.0, vD));
  float lace = .5 + .5 * sin(vWP.x * 1.7 + uTime * .8) * sin(vWP.z * 2.1 - uTime * .6);
  float edge = vD - (1.0 + 1.6 * sin(-uTime * 1.5));
  float foam = clamp(crest * band * (.4 + lace) + (1.0 - smoothstep(.0, .9, abs(edge))) * (.55 + .45 * lace) * (1.0 - smoothstep(2.0, 5.0, vD)), 0.0, 1.0);
  float shallow = smoothstep(-22.0, -2.0, vD);
  diffuseColor.rgb = mix(diffuseColor.rgb * mix(1.0, 1.35, shallow), vec3(.94, .98, 1.0), foam);
  diffuseColor.a = max(diffuseColor.a, foam * .95);
}`);
  };
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(OCEAN, OCEAN, OSEG, OSEG).rotateX(-Math.PI / 2), oceanMat);
  ocean.frustumCulled = false; scene.add(ocean);

  // ---------- Hutan, pohon, semak, bunga, batu ----------
  const clusters = Array.from({ length: 18 }, () => ({ x: lerp(-110, 110, R()), z: lerp(-210, 110, R()), r: 20 + R() * 24 }));
  const forest = (x, z) => { let m = 0; for (const c of clusters) m = Math.max(m, 1 - Math.hypot(x - c.x, z - c.z) / c.r); return Math.max(0, m); };
  const pick = a => a[Math.floor(R() * a.length)];
  const palette = a => a.map(C);
  function scatter(count, accept, make) {
    const out = [];
    for (let t = 0; out.length < count && t < count * 400; t++) {
      const x = lerp(-WORLD.x, WORLD.x, R()), z = lerp(WORLD.zMin, WORLD.zMax, R());
      if (accept(x, z)) out.push(make(x, z));
    }
    return out;
  }
  // Objek dipecah per area (chunk) supaya frustum culling bekerja & area jauh tidak digambar.
  const CH = 40, chunks = [], trees = [], TREE_HP = 4;
  // `tree` (opsional): tandai tiap item sebagai pohon yang bisa ditebang
  function inst(geos, mats, list, shadows = true, range = 170, tree = null) {
    const cells = new Map();
    for (const o of list) {
      const k = Math.floor(o.x / CH) + "," + Math.floor(o.z / CH);
      if (!cells.has(k)) cells.set(k, { cx: (Math.floor(o.x / CH) + .5) * CH, cz: (Math.floor(o.z / CH) + .5) * CH, items: [] });
      cells.get(k).items.push(o);
    }
    const all = [];
    for (const cell of cells.values()) {
      const meshes = geos.map((g, gi) => {
        const m = new THREE.InstancedMesh(g, mats[gi], cell.items.length);
        cell.items.forEach((o, i) => {
          dummy.position.set(o.x, o.y, o.z); dummy.rotation.set(0, o.r, 0);
          dummy.scale.set(o.s, o.sy ?? o.s, o.s); dummy.updateMatrix();
          m.setMatrixAt(i, dummy.matrix);
          if (mats[gi].userData.paint) m.setColorAt(i, o.c);
        });
        m.castShadow = shadows; m.receiveShadow = true;
        if (m.computeBoundingSphere) m.computeBoundingSphere(); else m.frustumCulled = false;
        scene.add(m); return m;
      });
      cell.items.forEach((o, i) => { o.meshes = meshes; o.idx = i; }); // simpan referensi instance tiap item
      if (tree) for (const o of cell.items) { Object.assign(o, tree, { geos, mats, hp: TREE_HP, alive: true, shake: 0, id: trees.length }); trees.push(o); }
      chunks.push({ meshes, cx: cell.cx, cz: cell.cz, range: range + CH * .75, on: true });
      all.push(...meshes);
    }
    return all;
  }
  function merge(geos) {
    const P = [], N = [];
    for (const g0 of geos) { const g = g0.index ? g0.toNonIndexed() : g0;
      P.push(...g.attributes.position.array); N.push(...g.attributes.normal.array); }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
    return g;
  }
  const foliage = m => { m.userData.paint = true; return m; };
  const pineMat = foliage(mat(0xffffff, .85)), broadMat = foliage(mat(0xffffff, .85));
  const bushMat = foliage(mat(0xffffff, .9)), tuftMat = foliage(mat(0xffffff, 1)), palmMat = foliage(mat(0xffffff, .8));
  const flowerMat = foliage(mat(0xffffff, .7)), bark = mat(0x57402e), palmBark = mat(0x8a6b45), stone = mat(0x73796f);
  const tint = [pineMat, broadMat, bushMat, tuftMat, palmMat];
  const free = (x, z) => Math.abs(x) > 6 && Math.hypot(x, z) > 10;
  const place = (x, z, s, c, extra = {}) => ({ x, y: groundH(x, z), z, s, r: R() * 6.28, c, ...extra });

  const pineC = palette([0x294c3b, 0x355b43, 0x456746]);
  inst([
    new THREE.CylinderGeometry(.18, .3, 4.2, 7).translate(0, 2.1, 0),
    ...[0, 1, 2, 3].map(i => new THREE.ConeGeometry(1.35 - i * .22, 2.6, 7).translate(0, 4 + i * 1.15, 0)),
  ], [bark, pineMat, pineMat, pineMat, pineMat],
  scatter(380, (x, z) => inside(x, z) >= 16 && free(x, z) && R() < .05 + forest(x, z) * .95,
    (x, z) => place(x, z, 1 + R() * .9, pick(pineC))), true, 170, { kind: "pine", wood: 3 });

  const broadC = palette([0x3f6b3a, 0x4f7a3f, 0x5c8a45]);
  inst([
    new THREE.CylinderGeometry(.2, .32, 4.6, 7).translate(0, 2.3, 0),
    new THREE.IcosahedronGeometry(1.7, 1).translate(0, 5.6, 0),
    new THREE.IcosahedronGeometry(1.2, 1).translate(.8, 6.7, .3),
  ], [bark, broadMat, broadMat],
  scatter(260, (x, z) => inside(x, z) >= 16 && free(x, z) && R() < .05 + forest(x, z) * .95,
    (x, z) => place(x, z, 1 + R() * .7, pick(broadC))), true, 170, { kind: "broad", wood: 3 });

  const palmC = palette([0x4f8a3a, 0x5a9440]);
  inst([
    new THREE.CylinderGeometry(.12, .22, 7, 6).translate(0, 3.5, 0),
    ...[0, 1, 2, 3].map(i => new THREE.BoxGeometry(1.9, .06, .55).translate(.95, 0, 0).rotateZ(-.45).rotateY(i * Math.PI / 2 + .4).translate(0, 7, 0)),
  ], [palmBark, palmMat, palmMat, palmMat, palmMat],
  scatter(70, (x, z) => { const d = inside(x, z); return d >= 3.5 && d <= 14 && R() < .4; },
    (x, z) => place(x, z, .85 + R() * .5, pick(palmC))), true, 170, { kind: "palm", wood: 2 });

  const bushC = palette([0x2f5a35, 0x3d6b3a, 0x557a3f]);
  inst([new THREE.IcosahedronGeometry(.5, 1)], [bushMat],
    scatter(380, (x, z) => inside(x, z) >= 10 && Math.abs(x) > 4 && R() < .15 + forest(x, z) * .85,
      (x, z) => place(x, z, .7 + R() * .9, pick(bushC), { sy: (.7 + R() * .5) * .7 })), false, 110);

  const tuftC = palette([0x5f8a45, 0x6f9a4c, 0x4f7a3a, 0x7aa84f]);
  const blade = (h, w, tilt, ry, x, z) => new THREE.ConeGeometry(w, h, 3, 1, true).translate(0, h / 2, 0).rotateZ(tilt).rotateY(ry).translate(x, 0, z);
  const tuftGeo = merge([
    blade(.75, .07, .0, 0, 0, 0), blade(.6, .06, .35, 1.1, .03, 0), blade(.65, .06, -.3, 2.3, -.03, .02),
    blade(.5, .05, .45, 3.4, .0, .04), blade(.55, .05, -.4, 4.6, .04, -.03), blade(.45, .05, .25, 5.6, -.04, -.03),
  ]);
  inst([tuftGeo], [tuftMat],
    scatter(16000, (x, z) => inside(x, z) >= 9 && Math.abs(x) > 3.2,
      (x, z) => place(x, z, .8 + R() * .9, pick(tuftC), { sy: (.8 + R() * 1.1) })), false, 85);
  // rumput tambahan lebih rapat di sekitar jalan & area spawn
  inst([tuftGeo], [tuftMat],
    scatter(3500, (x, z) => inside(x, z) >= 9 && Math.abs(x) > 3.2 && Math.abs(x) < 30 && z > -60 && z < 40,
      (x, z) => place(x, z, .8 + R() * .8, pick(tuftC), { sy: (.8 + R() * 1.0) })), false, 85);

  const flowerC = palette([0xe8d44a, 0xf2f2f2, 0xc65f8f, 0xd9663a]);
  inst([new THREE.SphereGeometry(.09, 6, 5).translate(0, .32, 0)], [flowerMat],
    scatter(600, (x, z) => inside(x, z) >= 12 && Math.abs(x) > 3.5 && R() < 1 - forest(x, z) * .8,
      (x, z) => place(x, z, .9 + R() * .6, pick(flowerC))), false, 70);

  inst([new THREE.DodecahedronGeometry(.45, 0)], [stone],
    scatter(160, (x, z) => inside(x, z) >= 5 && Math.abs(x) > 3.5,
      (x, z) => { const s = .5 + R() * 1.3; return place(x, z, s, null, { sy: s * .6 }); }), false, 100);

  // ---------- Menebang pohon: getar -> tumbang -> tunggul -> kayu jatuh -> diambil ke tas ----------
  // API: findTree(x, z, range) mencari pohon terdekat; chopTree(pohon, posisiPemain) memberi 1 kali tebasan.
  // Kayu yang diambil dilaporkan lewat world.onPickup(id, jumlah) -> mengembalikan jumlah yang muat di tas.
  const td = new THREE.Object3D(); td.rotation.order = "XZY";
  const shaking = new Set(), falls = [], drops = [];
  const SHAKE = .35, FALL = 1.1, LAY = 2.2, PICK_R = 2.2;
  const REGROW_MS = 60000, regrow = [], growing = new Set();   // pohon tumbang tumbuh lagi setelah 1 menit (tanpa tampilan)
  let regrowT = 0;
  const stumpGeo = new THREE.CylinderGeometry(.27, .36, .5, 8).translate(0, .25, 0);
  const logGeo = new THREE.CylinderGeometry(.14, .14, .95, 8).rotateZ(Math.PI / 2);
  const woodMat = mat(0x8f5f35, .85);

  function writeTree(o, rx = 0, rz = 0, k = 1) {
    td.position.set(o.x, o.y, o.z); td.rotation.set(rx, o.r, rz);
    td.scale.set(o.s * k, (o.sy ?? o.s) * k, o.s * k); td.updateMatrix();
    for (const m of o.meshes) { m.setMatrixAt(o.idx, td.matrix); m.instanceMatrix.needsUpdate = true; }
  }
  function findTree(x, z, range) {
    let best = null, bd = range * range;
    for (const o of trees) {
      if (!o.alive) continue;
      const dx = o.x - x; if (dx > range || dx < -range) continue;
      const dz = o.z - z, d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  }
  function chopTree(o, from) {
    if (!o || !o.alive) return null;
    const dx = o.x - from.x, dz = o.z - from.z, l = Math.hypot(dx, dz) || 1;
    o.dx = dx / l; o.dz = dz / l; o.hp--;
    if (o.hp > 0) { o.shake = SHAKE; shaking.add(o); return { felled: false, hp: o.hp }; }
    fellTree(o); return { felled: true, hp: 0 };
  }
  function hideTree(o, at = Date.now()) {                  // sembunyikan instance + pasang tunggul
    o.alive = false; o.felledAt = at; shaking.delete(o); writeTree(o, 0, 0, 1e-5);
    const st = new THREE.Mesh(stumpGeo, bark);
    st.position.set(o.x, o.y, o.z); st.scale.setScalar(o.s); st.castShadow = st.receiveShadow = true; scene.add(st);
    o.stump = st; regrow.push(o);
  }
  // jangan tumbuh di dalam rumah / di atas api unggun / menimpa pemain
  function blockedSpot(o, pp) {
    if (Math.hypot(o.x - pp.x, o.z - pp.z) < 1.4) return true;
    for (const f of fires) if (Math.hypot(f.x - o.x, f.z - o.z) < 1.4) return true;
    return houses.some(h => inFoot(h.x, h.z, h.ry, o.x, o.z, 1.8));
  }
  function regrowTree(o) {
    if (o.stump) { scene.remove(o.stump); o.stump = null; }
    o.alive = true; o.hp = TREE_HP; o.shake = 0; o.gt = 0; o.felledAt = 0;
    writeTree(o, 0, 0, .02); growing.add(o); saveFelled();
  }
  function fellTree(o) {
    hideTree(o); saveFelled();
    // salinan pohon yang jatuh menjauhi pemain (warna daun disalin dari instance)
    const outer = new THREE.Group(), inner = new THREE.Group(), clones = [];
    o.geos.forEach((g, i) => {
      let m = o.mats[i];
      if (m.userData.paint) { m = m.clone(); m.color.copy(cur.leaf).multiply(o.c); clones.push(m); }
      const mesh = new THREE.Mesh(g, m); mesh.castShadow = true; inner.add(mesh);
    });
    inner.rotation.y = o.r; inner.scale.set(o.s, o.sy ?? o.s, o.s);
    outer.rotation.order = "YXZ"; outer.rotation.y = Math.atan2(o.dx, o.dz);
    outer.position.set(o.x, o.y, o.z); outer.add(inner); scene.add(outer);
    falls.push({ outer, clones, o, t: 0, dropped: false });
  }
  function spawnLogs(o) {
    for (let i = 0; i < o.wood; i++) {
      const dist = 1.7 + i * 1.4 + Math.random() * .5, lat = (Math.random() - .5) * 1.2;
      let tx = o.x + o.dx * dist + o.dz * lat, tz = o.z + o.dz * dist - o.dx * lat;
      if (inside(tx, tz) < 2) { tx = o.x - o.dx * (1 + i * .6) + o.dz * lat; tz = o.z - o.dz * (1 + i * .6) - o.dx * lat; } // jangan jatuh ke laut
      const m = new THREE.Mesh(logGeo, woodMat); m.castShadow = true; m.visible = false;
      m.rotation.y = Math.random() * 6.28; scene.add(m);
      drops.push({ m, sx: o.x, sy: o.y + 1.2, sz: o.z, tx, tz, t: -i * .12, landed: false, magnet: false, cool: 0, ph: Math.random() * 6.28 });
    }
  }
  function updateTrees(dt, pp) {
    regrowT -= dt;
    if (regrowT <= 0) {                                    // cek tiap ~1 detik pohon mana yang sudah waktunya tumbuh
      regrowT = 1;
      const now = Date.now();
      for (let i = regrow.length - 1; i >= 0; i--) {
        const o = regrow[i];
        if (now - o.felledAt < REGROW_MS) continue;
        if (blockedSpot(o, pp)) { o.felledAt = now - REGROW_MS + 10000; continue; }   // terhalang: coba lagi 10 detik
        regrow.splice(i, 1); regrowTree(o);
      }
    }
    for (const o of growing) {                             // tumbuh membesar dengan halus (1,4 dtk)
      o.gt += dt; const k = Math.min(1, o.gt / 1.4);
      writeTree(o, 0, 0, Math.max(k * (2 - k), .02));
      if (k >= 1) growing.delete(o);
    }
    for (const o of shaking) {
      o.shake -= dt;
      if (o.shake <= 0) { writeTree(o); shaking.delete(o); continue; }
      const a = Math.sin(o.shake * 55) * (o.shake / SHAKE) * .07;
      writeTree(o, a * o.dz, -a * o.dx);
    }
    for (let i = falls.length - 1; i >= 0; i--) {
      const f = falls[i]; f.t += dt;
      const end = Math.PI / 2 - .04, u = Math.min(f.t / FALL, 1);
      const th = f.t > FALL ? end - .07 * Math.sin(Math.min((f.t - FALL) / .35, 1) * Math.PI) : end * u * u;
      f.outer.rotation.x = th;
      f.outer.position.y = f.o.y + .3 * f.o.s * Math.min(th / end, 1);
      if (f.t >= FALL && !f.dropped) { f.dropped = true; spawnLogs(f.o); }
      if (f.t > FALL + LAY) {
        const k = 1 - (f.t - FALL - LAY) / .4;
        if (k <= 0) { scene.remove(f.outer); for (const c of f.clones) c.dispose(); falls.splice(i, 1); continue; }
        f.outer.scale.setScalar(k);
      }
    }
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i], m = d.m;
      d.t += dt; if (d.t < 0) continue;
      m.visible = true;
      const gy = groundH(d.tx, d.tz) + .14;
      if (!d.landed) {                                   // melompat dari batang ke tanah
        const u = Math.min(d.t / .55, 1);
        m.position.set(lerp(d.sx, d.tx, u), lerp(d.sy, gy, u) + Math.sin(u * Math.PI) * 1.5, lerp(d.sz, d.tz, u));
        m.rotation.z = u * 6;
        if (u >= 1) { d.landed = true; m.rotation.z = 0; }
        continue;
      }
      d.cool -= dt;
      const dx = pp.x - m.position.x, dz = pp.z - m.position.z, dist = Math.hypot(dx, dz);
      if (!d.magnet) {
        m.position.y = gy + .08 + Math.sin(d.t * 3 + d.ph) * .06; m.rotation.y += dt * .9;
        if (d.cool <= 0 && dist < PICK_R) d.magnet = true;
      } else {                                           // tersedot ke pemain
        if (dist > 6) { d.magnet = false; continue; }
        const step = Math.min((9 + (3 - Math.min(dist, 3)) * 2) * dt, dist);
        if (dist > .001) { m.position.x += dx / dist * step; m.position.z += dz / dist * step; }
        m.position.y += (pp.y + 1 - m.position.y) * Math.min(1, dt * 8);
        if (dist < .75) {
          const ok = api.onPickup ? api.onPickup("kayu", 1) : 1;
          if (ok > 0) { scene.remove(m); drops.splice(i, 1); }
          else { d.magnet = false; d.cool = 2; }          // tas penuh: coba lagi nanti
        }
      }
    }
  }

  // ---------- Bangunan: rumah kayu & api unggun (disimpan di localStorage) ----------
  // API: build(tipe, x, z, ry) -> {ok, why}; findFire(x, z, range); feedFire(api) -> {ok, text}; collide(pos, r).
  const BKEY = "parkour_build_v1", FKEY = "parkour_felled_v1";
  const HOUSE = { w: 9, d: 8, rows: 10, rh: .36 };                   // rumah besar 9 x 8 m, dinding 10 baris balok (3,6 m)
  const HOUSE_H = HOUSE.rows * HOUSE.rh, PITCH = .5, DOOR_W = 1.9, DOOR_H = 2.4;
  const FIRE_T = 120, FIRE_MAX = 600, FIRE_RANGE = 3;                // 1 kayu = 2 menit, maksimal 10 menit
  const houses = [], fires = [];
  let buildDirty = false, lastSave = 0;
  const logMat = mat(0x9a6a3c, .9), trimMat = mat(0x6b4526, .9), roofMat = mat(0x5b3a29, .9);
  const baseMat = mat(0x6e6a60, .95), chimMat = mat(0x73796f, .95), burnMat = mat(0x3b2a1e, .9);
  const glassMat = mat(0x9fd6ff, .1, { transparent: true, opacity: .25, depthWrite: false });
  const boxG = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);

  // --- model rumah: besar (9 x 8 m), berlantai, ada ranjang, meja & cerobong; dibangun sekali, dipakai semua rumah
  const floorMat = mat(0x8b5e34, .95), clothMat = mat(0x8e3b3b, .95);
  const CHIM = { x: HOUSE.w / 2 - .8, z: -HOUSE.d / 2 + .8 }, BED = { x: -HOUSE.w / 2 + 1.5, z: -HOUSE.d / 2 + 1.0 }, TBL = { x: 2.2, z: 1.2 };
  const WIN = { w: 1.5 }, WZ = [-2, 2];                              // jendela: 2 di tiap dinding samping + 1 di dinding belakang
  const houseGeo = (() => {
    const { w, d, rows, rh } = HOUSE, logs = [], trim = [], glass = [], roof = [], floor = [], cloth = [];
    const gh = (d / 2) * Math.tan(PITCH);
    const cut = (segs, lo, hi) => segs.flatMap(([a, b]) => (hi <= a || lo >= b) ? [[a, b]]
      : [lo > a ? [a, lo] : null, hi < b ? [hi, b] : null].filter(Boolean));
    const wall = (len, cx, cz, alongX, openings) => {            // dinding balok bertumpuk dengan lubang
      for (let r = 0; r < rows; r++) {
        const y0 = r * rh, y1 = y0 + rh - .03;
        let segs = [[-len / 2, len / 2]];
        for (const o of openings) if (y1 > o.y0 && y0 < o.y1) segs = cut(segs, o.c - o.w / 2, o.c + o.w / 2);
        for (const [a, b] of segs) {
          if (b - a < .02) continue;
          const L = b - a, c = (a + b) / 2, y = (y0 + y1) / 2;
          logs.push(alongX ? boxG(L, rh - .03, .28, cx + c, y, cz) : boxG(.28, rh - .03, L, cx, y, cz + c));
        }
      }
    };
    const WH = { y0: 1.08, y1: 2.16 };                           // selaras baris balok (lubang nyata 1,08 - 2,13 m)
    const winOpen = c => ({ c, w: WIN.w, y0: WH.y0, y1: WH.y1 });
    wall(w, 0, -d / 2, true, [winOpen(0)]);                                                  // belakang + jendela
    wall(w, 0, d / 2, true, [{ c: 0, w: DOOR_W, y0: 0, y1: DOOR_H }]);                       // depan + pintu
    for (const sx of [-1, 1]) wall(d - .28, sx * w / 2, 0, false, WZ.map(winOpen));          // samping + 2 jendela
    // kusen pintu
    for (const sx of [-1, 1]) trim.push(boxG(.14, 2.58, .36, sx * (DOOR_W / 2 + .05), 1.29, d / 2));
    trim.push(boxG(DOOR_W + .34, .12, .36, 0, 2.55, d / 2));
    // kusen + kaca jendela
    const win = (cx, cz, alongX) => {
      const g = (L, h, T, dy, dl) => alongX ? boxG(L, h, T, cx + dl, dy, cz) : boxG(T, h, L, cx, dy, cz + dl);
      trim.push(g(WIN.w + .24, .08, .36, 1.04, 0), g(WIN.w + .24, .1, .36, 2.18, 0));
      for (const s of [-1, 1]) trim.push(g(.1, 1.2, .36, 1.61, s * (WIN.w / 2 + .05)));
      glass.push(g(WIN.w, 1.05, .04, 1.605, 0));
    };
    win(0, -d / 2, true);
    for (const sx of [-1, 1]) for (const c of WZ) win(sx * w / 2, c, false);
    floor.push(boxG(w - .28, .05, d - .28, 0, .025, 0));
    // segitiga di ujung atap
    const tri = new THREE.Shape();
    tri.moveTo(-d / 2, 0); tri.lineTo(d / 2, 0); tri.lineTo(0, gh); tri.closePath();
    for (const sx of [-1, 1]) logs.push(new THREE.ExtrudeGeometry(tri, { depth: .28, bevelEnabled: false })
      .rotateY(Math.PI / 2).translate(sx * w / 2 - .14, HOUSE_H, 0));
    // atap pelana
    const Rr = d / 2 + .4, Lr = Rr / Math.cos(PITCH), ry0 = HOUSE_H + gh + .07 - (Rr / 2) * Math.tan(PITCH);
    for (const sz of [-1, 1]) roof.push(new THREE.BoxGeometry(w + .8, .14, Lr + .05).rotateX(sz * PITCH).translate(0, ry0, sz * Rr / 2));
    roof.push(boxG(w + .8, .1, .3, 0, HOUSE_H + gh + .17, 0));
    // perabot: ranjang (pojok belakang kiri), meja (kanan)
    trim.push(boxG(2.1, .34, 1.3, BED.x, .17, BED.z), boxG(.12, .85, 1.3, BED.x - 1.0, .42, BED.z));
    cloth.push(boxG(1.95, .14, 1.15, BED.x + .05, .41, BED.z), boxG(.5, .12, .8, BED.x - .65, .54, BED.z));
    trim.push(boxG(1.7, .08, 1.0, TBL.x, .86, TBL.z));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) trim.push(boxG(.09, .86, .09, TBL.x + sx * .75, .43, TBL.z + sz * .4));
    const chH = HOUSE_H + gh + .8;                                // cerobong menembus atap
    return { logs: merge(logs), trim: merge(trim), glass: merge(glass), roof: merge(roof), cloth: merge(cloth), floor: merge(floor),
      base: merge([boxG(w + .4, .2, d + .4, 0, -.1, 0)]), stone: merge([boxG(.7, chH, .7, CHIM.x, chH / 2, CHIM.z)]) };
  })();
  // kotak tabrakan (koordinat lokal): [cx, cz, hx, hz]; celah di pintu; perabot & cerobong ikut padat
  const HB = [
    [0, -HOUSE.d / 2, HOUSE.w / 2, .16],
    [-(HOUSE.w / 2 + DOOR_W / 2) / 2, HOUSE.d / 2, (HOUSE.w / 2 - DOOR_W / 2) / 2, .16],
    [(HOUSE.w / 2 + DOOR_W / 2) / 2, HOUSE.d / 2, (HOUSE.w / 2 - DOOR_W / 2) / 2, .16],
    [-HOUSE.w / 2, 0, .16, HOUSE.d / 2 - .14],
    [HOUSE.w / 2, 0, .16, HOUSE.d / 2 - .14],
    [CHIM.x, CHIM.z, .4, .4], [BED.x, BED.z, 1.1, .7], [TBL.x, TBL.z, .9, .55],
  ];
  function addHouse(x, z, ry) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
    const mk = (geo, m, shadow = true) => { const o = new THREE.Mesh(geo, m); o.castShadow = shadow; o.receiveShadow = true; g.add(o); return o; };
    mk(houseGeo.base, baseMat); mk(houseGeo.floor, floorMat, false); mk(houseGeo.logs, logMat); mk(houseGeo.trim, trimMat); mk(houseGeo.cloth, clothMat); mk(houseGeo.stone, chimMat);
    mk(houseGeo.glass, glassMat, false);
    const roofMaterial = roofMat.clone();
    roofMaterial.transparent = true;
    roofMaterial.opacity = 1;
    roofMaterial.depthWrite = true;
    const roof = mk(houseGeo.roof, roofMaterial);          // atap dibuat tembus pandang saat pemain di dalam
    scene.add(g); houses.push({ x, z, ry, g, roof });
  }

  // --- api unggun
  const fireGeo = (() => {
    const st = [], lg = [];
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; st.push(new THREE.DodecahedronGeometry(.17, 0).scale(1, .75, 1).translate(Math.cos(a) * .62, .1, Math.sin(a) * .62)); }
    for (let i = 0; i < 3; i++) lg.push(new THREE.CylinderGeometry(.09, .09, 1.0, 6).rotateZ(Math.PI / 2).rotateY(i * Math.PI / 3 + .3).translate(0, .16, 0));
    return { stones: merge(st), logs: merge(lg) };
  })();
  const flameGeo = new THREE.ConeGeometry(.3, 1, 8).translate(0, .5, 0);
  const smokeTex = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,.9)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const cDim = [0xa83410, 0xd8631a, 0xff9a3a].map(C), cBright = [0xff7a1a, 0xffb02e, 0xffe27a].map(C);
  // satu lampu api (jumlah lampu tetap supaya shader tidak dikompilasi ulang): ikut api menyala terdekat
  const fireLight = new THREE.PointLight(0xff8a3a, 0, 20, 1.6); scene.add(fireLight);
  function addFire(x, z, ry, left = 0) {
    const g = new THREE.Group(); g.position.set(x, groundH(x, z), z); g.rotation.y = ry;
    for (const [geo, m] of [[fireGeo.stones, stone], [fireGeo.logs, burnMat]]) {
      const o = new THREE.Mesh(geo, m); o.castShadow = o.receiveShadow = true; g.add(o);
    }
    const flame = new THREE.Group(); flame.position.y = .2; flame.visible = false; g.add(flame);
    const cones = [0xff7a1a, 0xffb02e, 0xffe27a].map((c, i) => {
      const o = new THREE.Mesh(flameGeo, new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .92, depthWrite: false }));
      o.scale.set(1 - i * .25, 1 - i * .18, 1 - i * .25); flame.add(o); return o;
    });
    const smoke = Array.from({ length: 5 }, (_, i) => {
      const m = new THREE.SpriteMaterial({ map: smokeTex, color: 0x9a9a9a, transparent: true, opacity: 0, depthWrite: false });
      const s = new THREE.Sprite(m); s.visible = false; scene.add(s); return { s, m, ph: i / 5 };
    });
    scene.add(g);
    const lit = left > 0;
    fires.push({ x, z, ry, g, flame, cones, smoke, lit, t: lit ? left : 0, smolder: 0, lv: lit ? Math.min(5, Math.ceil(left / FIRE_T)) : 0, ph: Math.random() * 6 });
  }
  const fmt = s => { const n = Math.ceil(s); return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`; };
  function findFire(x, z, range = FIRE_RANGE) {
    let best = null, bd = range * range;
    for (const f of fires) { const dx = f.x - x, dz = f.z - z, d = dx * dx + dz * dz; if (d < bd) { bd = d; best = f; } }
    return best;
  }
  // 1 kayu: api padam menyala redup 2 menit; tiap kayu tambahan +2 menit & api makin besar (maks 10 menit)
  function feedFire(f) {
    if (f.t >= FIRE_MAX - 1) return { ok: false, text: "Api sudah penuh" };
    const was = f.lit; f.lit = true; f.smolder = 0; f.t = Math.min(FIRE_MAX, f.t + FIRE_T); buildDirty = true;
    return { ok: true, text: (was ? "Api bertambah • " : "Api menyala • ") + fmt(f.t) };
  }

  // titik (x, z) berada di alas rumah (diperlebar m)?
  const inFoot = (hx, hz, hry, x, z, m = 0) => {
    const dx = x - hx, dz = z - hz, c = Math.cos(hry), s = Math.sin(hry);
    return Math.abs(dx * c - dz * s) < HOUSE.w / 2 + m && Math.abs(dx * s + dz * c) < HOUSE.d / 2 + m;
  };
  const inHouse = (x, z, m = 1) => houses.some(h => inFoot(h.x, h.z, h.ry, x, z, m));
  const litFireNear = (x, z, r) => fires.some(f => f.lit && Math.hypot(f.x - x, f.z - z) < r);
  // tempat lempar kail di laut (di depan pemain menghadap yaw), atau null bila bukan laut
  function fishSpot(x, z, yaw) {
    const sx = Math.sin(yaw), sz = Math.cos(yaw);
    for (const dist of [6.5, 8, 9.5]) { const bx = x + sx * dist, bz = z + sz * dist; if (inside(bx, bz) < -1.2) return { x: bx, z: bz }; }
    return null;
  }

  function build(type, x, z, ry) {
    const house = type === "house";
    if (inside(x, z) < (house ? 18 : 14)) return { ok: false, why: "Terlalu dekat laut" };
    if (Math.hypot(x, z) < (house ? 10 : 3)) return { ok: false, why: "Terlalu dekat titik mendarat" };
    for (const o of trees) if (o.alive && (house ? inFoot(x, z, ry, o.x, o.z, 1.8) : Math.hypot(o.x - x, o.z - z) < 1.3)) return { ok: false, why: "Ada pohon di sini, geser sedikit" };
    for (const h of houses) if (house ? Math.hypot(h.x - x, h.z - z) < 13 : inFoot(h.x, h.z, h.ry, x, z, 1.5)) return { ok: false, why: "Terlalu dekat bangunan lain" };
    for (const f of fires) if (house ? inFoot(x, z, ry, f.x, f.z, 1.5) : Math.hypot(f.x - x, f.z - z) < 1.8) return { ok: false, why: "Terlalu dekat bangunan lain" };
    if (house) addHouse(x, z, ry); else addFire(x, z, ry, 0);
    buildDirty = true; saveBuild();
    return { ok: true };
  }

  // tabrakan dengan dinding rumah, perabot & api unggun (pos.x / pos.z diubah langsung). Berlaku di semua ketinggian.
  function collide(pos, r = .45) {
    for (const f of fires) {
      const dx = pos.x - f.x, dz = pos.z - f.z, d2 = dx * dx + dz * dz, rr = .55 + r;
      if (d2 < rr * rr && d2 > 1e-8) { const k = rr / Math.sqrt(d2); pos.x = f.x + dx * k; pos.z = f.z + dz * k; }
    }
    for (const hs of houses) {
      const dx = pos.x - hs.x, dz = pos.z - hs.z;
      if (dx * dx + dz * dz > 110) continue;                      // jauh dari rumah
      const c = Math.cos(hs.ry), s = Math.sin(hs.ry);
      let lx = dx * c - dz * s, lz = dx * s + dz * c;
      for (let pass = 0; pass < 3; pass++) {                      // beberapa putaran: dorongan satu kotak tak boleh menyeret ke kotak lain
        let hit = false;
        for (const [cx, cz, hx, hz] of HB) {
          const px = clamp(lx, cx - hx, cx + hx), pz = clamp(lz, cz - hz, cz + hz), ex = lx - px, ez = lz - pz, e2 = ex * ex + ez * ez;
          if (e2 >= r * r) continue;
          hit = true;
          if (e2 > 1e-8) { const k = r / Math.sqrt(e2); lx = px + ex * k; lz = pz + ez * k; }
          else if (hx - Math.abs(lx - cx) < hz - Math.abs(lz - cz)) lx = cx + Math.sign(lx - cx || 1) * (hx + r);
          else lz = cz + Math.sign(lz - cz || 1) * (hz + r);
        }
        if (!hit) break;
      }
      pos.x = hs.x + lx * c + lz * s; pos.z = hs.z - lx * s + lz * c;
    }
  }

  function updateBuildings(dt, t, pp) {
    let best = null, bd = 1e9;
    for (const f of fires) {
      if (f.lit) { f.t -= dt; if (f.t <= 0) { f.t = 0; f.lit = false; f.smolder = 10; buildDirty = true; } }
      else if (f.smolder > 0) f.smolder -= dt;
      // tingkat api: 1 = redup (<= 2 menit), makin banyak kayu makin besar; mengecil di 12 detik terakhir
      const tgt = f.lit ? Math.min(5, Math.ceil(f.t / FIRE_T)) * clamp(f.t / 12, 0, 1) : 0;
      f.lv += (tgt - f.lv) * Math.min(1, dt * 3);
      const dd = Math.hypot(f.x - pp.x, f.z - pp.z);
      f.g.visible = dd < 150;
      if (f.g.visible && f.lv > .01) {
        f.flame.visible = true;
        const s = .3 + .2 * f.lv, fl = 1 + .1 * Math.sin(t * 11 + f.ph) + .08 * Math.sin(t * 23 + f.ph * 2);
        f.flame.scale.set(s * fl * 1.1, s * (1 + .2 * Math.sin(t * 17 + f.ph)), s * fl * 1.1);
        f.flame.rotation.z = Math.sin(t * 5 + f.ph) * .06;
        const k = clamp((f.lv - 1) / 1.5, 0, 1);
        f.cones.forEach((c, i) => c.material.color.copy(cDim[i]).lerp(cBright[i], k));
      } else f.flame.visible = false;
      const sm = f.lit ? (f.lv > 1.5 ? .5 : .3) : Math.max(0, f.smolder) / 10 * .5;   // asap saat menyala / baru padam
      for (const o of f.smoke) {
        if (sm <= .01 || dd > 110) { o.s.visible = false; continue; }
        const k = (t * .45 + o.ph) % 1;
        o.s.visible = true;
        o.s.position.set(f.x + Math.sin(t * .8 + o.ph * 6) * .3 * k, f.g.position.y + .6 + k * 3.2, f.z + Math.cos(t * .7 + o.ph * 6) * .3 * k);
        o.s.scale.setScalar(.4 + k * 1.5);
        o.m.opacity = sm * .55 * Math.sin(k * Math.PI);
      }
      if (f.lv > .05 && dd < bd) { bd = dd; best = f; }
    }
    const tgtI = best ? (2.5 + 3.5 * best.lv) * (1 + .09 * Math.sin(t * 13) + .06 * Math.sin(t * 29)) : 0;
    if (best) fireLight.position.set(best.x, best.g.position.y + 1, best.z);
    fireLight.intensity += (tgtI - fireLight.intensity) * Math.min(1, dt * 6);
    fireLight.distance = 8 + 3 * (best ? best.lv : 0);

    for (const h of houses) {
      const dx = pp.x - h.x, dz = pp.z - h.z;
      const c = Math.cos(h.ry), s = Math.sin(h.ry), lx = dx * c - dz * s, lz = dx * s + dz * c;
      const insideRoof = dx * dx + dz * dz <= 100 &&
        Math.abs(lx) < HOUSE.w / 2 && Math.abs(lz) < HOUSE.d / 2 && pp.y < HOUSE_H;
      // Atap tidak dihapus: dibuat transparan sementara agar interior tetap terlihat.
      h.roof.visible = true;
      h.roof.material.opacity = insideRoof ? 0.22 : 1;
      h.roof.material.depthWrite = !insideRoof;
    }
    if ((buildDirty || fires.some(f => f.lit)) && t - lastSave > 10) { lastSave = t; buildDirty = false; saveBuild(); }
  }

  // --- penyimpanan: bangunan (+ sisa waktu api) dan pohon yang sudah ditebang
  const r2 = n => +n.toFixed(2);
  function saveBuild() {
    try {
      localStorage.setItem(BKEY, JSON.stringify({ v: 1,
        houses: houses.map(h => [r2(h.x), r2(h.z), r2(h.ry)]),
        fires: fires.map(f => [r2(f.x), r2(f.z), r2(f.ry), f.lit ? Math.round(f.t) : 0]) }));
    } catch { /* penyimpanan tidak tersedia */ }
  }
  function saveFelled() {
    try { localStorage.setItem(FKEY, JSON.stringify({ n: trees.length, ids: trees.flatMap((o, i) => o.alive ? [] : [[i, o.felledAt]]) })); } catch { /* abaikan */ }
  }
  addEventListener("pagehide", saveBuild);
  document.addEventListener("visibilitychange", () => { if (document.hidden) saveBuild(); });
  try {
    const fl = JSON.parse(localStorage.getItem(FKEY));       // hanya dipakai jika jumlah pohon sama (dunia tidak berubah)
    if (fl && fl.n === trees.length && Array.isArray(fl.ids)) {
      const now = Date.now();
      for (const e of fl.ids) { const [i, at] = Array.isArray(e) ? e : [e, now]; const o = trees[i]; if (o && o.alive && now - at < REGROW_MS) hideTree(o, at); }
    }
    const b = JSON.parse(localStorage.getItem(BKEY));
    if (b) {
      for (const [x, z, ry] of b.houses || []) addHouse(x, z, ry);
      for (const [x, z, ry, left] of b.fires || []) addFire(x, z, ry, left);
      for (const o of trees) if (o.alive && houses.some(h => inFoot(h.x, h.z, h.ry, o.x, o.z, 1.8))) hideTree(o);   // rumah lama jadi lebih besar
    }
  } catch { /* data rusak: abaikan */ }

  // ---------- Hewan yang berkeliaran: rusa, kelinci, burung ----------
  const aBox = (w, h, d, material, x, y, z, parent) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o;
  };
  const aSph = (r, material, x, y, z, parent, sx = 1, sy = 1, sz = 1) => {
    const o = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), material);
    o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.castShadow = true; parent.add(o); return o;
  };
  const deerMats = [mat(0x9a6b3f, .9), mat(0x8a5c34, .9), mat(0xa8794a, .9)];
  const deerBelly = mat(0xe3d2b4, .9), antlerM = mat(0xd8c9a8, .8), darkM = mat(0x1a1612, .6);
  function makeDeer() {
    const g = new THREE.Group(), body = pick(deerMats), legs = [];
    aBox(.5, .55, 1.15, body, 0, 1.05, 0, g);
    aBox(.4, .2, .95, deerBelly, 0, .85, 0, g);
    const neck = aBox(.2, .65, .22, body, 0, 1.5, .55, g); neck.rotation.x = .45;
    const head = new THREE.Group(); head.position.set(0, 1.8, .78); g.add(head);
    aBox(.24, .24, .42, body, 0, 0, .08, head);
    aBox(.1, .1, .1, darkM, 0, -.02, .31, head);
    for (const x of [-.1, .1]) { aBox(.05, .05, .02, darkM, x, .07, .24, head); aBox(.06, .2, .1, body, x * 1.5, .17, -.06, head).rotation.z = -x * 3; }
    if (Math.random() < .5) for (const x of [-1, 1]) { const a = aBox(.04, .38, .04, antlerM, x * .1, .38, -.04, head); a.rotation.z = -x * .35;
      const b = aBox(.03, .18, .03, antlerM, x * .2, .5, -.04, head); b.rotation.z = x * .5; }
    aBox(.12, .18, .08, deerBelly, 0, 1.2, -.6, g).rotation.x = -.5;
    for (const [x, z] of [[-.16, .42], [.16, .42], [-.16, -.42], [.16, -.42]]) {
      const p = new THREE.Group(); p.position.set(x, .8, z); g.add(p);
      aBox(.1, .8, .1, body, 0, -.4, 0, p); aBox(.11, .08, .12, darkM, 0, -.78, .01, p); legs.push(p);
    }
    return { g, legs, head };
  }
  const bunnyMats = [mat(0xb8a58c, .95), mat(0xf0ece4, .95), mat(0x7c6a58, .95), mat(0xc9b08a, .95)];
  const pinkM = mat(0xe8a9a9, .9);
  function makeRabbit() {
    const g = new THREE.Group(), body = pick(bunnyMats), hop = new THREE.Group(); g.add(hop);
    aSph(.2, body, 0, .22, 0, hop, .85, .8, 1.25);
    aSph(.13, body, 0, .36, .27, hop);
    for (const x of [-.045, .045]) { const e = aSph(.04, body, x, .56, .24, hop, .6, 3.2, .5); e.rotation.x = -.15;
      aSph(.02, pinkM, x, .56, .26, hop, .5, 2.6, .3); aSph(.02, darkM, x * 2.2, .4, .37, hop); }
    aSph(.07, mat(0xffffff, 1), 0, .26, -.26, hop);
    return { g, hop, legs: [] };
  }
  const birdM = [mat(0x2c3340, .8), mat(0xe8e4dc, .8), mat(0x5b4636, .8)];
  function makeBird() {
    const g = new THREE.Group(), body = pick(birdM), wings = [];
    aSph(.18, body, 0, 0, 0, g, .8, .7, 1.6);
    aSph(.1, body, 0, .05, .3, g);
    aBox(.04, .03, .14, mat(0xe0a030, .6), 0, .03, .42, g);
    aBox(.14, .02, .25, body, 0, 0, -.38, g);
    for (const s of [-1, 1]) { const p = new THREE.Group(); p.position.set(s * .12, .04, 0); g.add(p);
      aBox(.9, .02, .32, body, s * .45, 0, 0, p); wings.push([p, s]); }
    return { g, wings };
  }

  const critters = [];
  const okSpot = (x, z) => inside(x, z) >= 18 && Math.abs(x) > 5 && Math.hypot(x, z) > 12;
  for (const p of scatter(9, okSpot, (x, z) => ({ x, z }))) {
    const a = makeDeer(); a.g.scale.setScalar(.95 + R() * .2); a.type = "deer"; a.speed = 1.6; a.run = 7.5; a.fear = 12;
    a.hx = p.x; a.hz = p.z; critters.push(a);
  }
  for (const p of scatter(18, okSpot, (x, z) => ({ x, z }))) {
    const a = makeRabbit(); a.g.scale.setScalar(.9 + R() * .4); a.type = "rabbit"; a.speed = 1.3; a.run = 6; a.fear = 8;
    a.hx = p.x; a.hz = p.z; critters.push(a);
  }
  for (const a of critters) {
    a.g.position.set(a.hx, groundH(a.hx, a.hz), a.hz); a.g.rotation.y = R() * 6.28;
    a.tx = a.hx; a.tz = a.hz; a.wait = R() * 4; a.ph = R() * 6; a.fleeing = false; a.rad = a.type === "deer" ? 18 : 10;
    scene.add(a.g);
  }
  const birds = Array.from({ length: 8 }, () => {
    const a = makeBird(); a.g.scale.setScalar(1.3);
    Object.assign(a, { cx: lerp(-90, 90, R()), cz: lerp(-180, 90, R()), r: 14 + R() * 26, y: 16 + R() * 16, w: (.25 + R() * .25) * (R() < .5 ? 1 : -1), a: R() * 6.28 });
    scene.add(a.g); return a;
  });
  function updateAnimals(dt, t, pp) {
    for (const a of critters) {
      const g = a.g, dxp = g.position.x - pp.x, dzp = g.position.z - pp.z, dp = Math.hypot(dxp, dzp);
      if (dp > 100) { g.visible = false; continue; }
      g.visible = true;
      if (dp < a.fear && !a.fleeing) { // kabur dari pemain
        a.fleeing = true; a.wait = 0;
        const ang = Math.atan2(dxp, dzp) + (R() - .5) * .8, L = 14 + R() * 8;
        let tx = g.position.x + Math.sin(ang) * L, tz = g.position.z + Math.cos(ang) * L;
        if (inside(tx, tz) < 14) { tx = g.position.x - Math.sin(ang) * L; tz = g.position.z - Math.cos(ang) * L; }
        a.tx = tx; a.tz = tz;
      }
      let moving = false, spd = 0;
      if (a.wait > 0) a.wait -= dt;
      else {
        const dx = a.tx - g.position.x, dz = a.tz - g.position.z, d = Math.hypot(dx, dz);
        if (d < .4) { a.wait = a.fleeing ? 1 + R() * 2 : 2 + R() * 6; a.fleeing = false; a.hx = g.position.x; a.hz = g.position.z;
          const ang = R() * 6.28, L = 3 + R() * a.rad; let tx = a.hx + Math.sin(ang) * L, tz = a.hz + Math.cos(ang) * L;
          if (inside(tx, tz) < 14) { tx = a.hx; tz = a.hz; } a.tx = tx; a.tz = tz; }
        else {
          spd = a.fleeing ? a.run : a.speed; moving = true;
          let df = Math.atan2(dx, dz) - g.rotation.y; df = Math.atan2(Math.sin(df), Math.cos(df));
          g.rotation.y += df * (1 - Math.exp(-dt * 6));
          g.position.x += dx / d * spd * dt; g.position.z += dz / d * spd * dt;
        }
      }
      a.ph += dt * (moving ? spd * (a.type === "rabbit" ? 2.4 : 2.6) : 0);
      let y = groundH(g.position.x, g.position.z);
      if (a.type === "deer") {
        const s = moving ? Math.sin(a.ph) * (a.fleeing ? .8 : .5) : 0;
        a.legs[0].rotation.x = s; a.legs[3].rotation.x = s; a.legs[1].rotation.x = -s; a.legs[2].rotation.x = -s;
        a.head.rotation.x = moving ? 0 : Math.max(0, Math.sin(t * .4 + a.hx)) * .7; // menunduk makan rumput
      } else {
        y += moving ? Math.abs(Math.sin(a.ph)) * (a.fleeing ? .35 : .18) : 0;
        a.hop.rotation.x = moving ? -Math.cos(a.ph) * .25 : 0;
      }
      collide(g.position, .5);
      g.position.y = y;
    }
    for (const b of birds) {
      if (Math.hypot(b.cx - pp.x, b.cz - pp.z) > b.r + 150) { b.g.visible = false; continue; }
      b.g.visible = true; b.a += b.w * dt;
      const x = b.cx + Math.cos(b.a) * b.r, z = b.cz + Math.sin(b.a) * b.r;
      b.g.position.set(x, b.y + Math.sin(t * .7 + b.cx) * 1.2, z);
      b.g.rotation.y = Math.atan2(-Math.sin(b.a) * Math.sign(b.w), Math.cos(b.a) * Math.sign(b.w));
      b.g.rotation.z = -.25 * Math.sign(b.w);
      const f = Math.sin(t * 7 + b.cx) * .6;
      for (const [p, s] of b.wings) p.rotation.z = s * f;
    }
  }

  // ---------- Matahari ----------
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xffd9a1, fog: false });
  const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(7, 20, 16), sunMat);
  const haloMat = new THREE.MeshBasicMaterial({ color: 0xffd9a1, transparent: true, opacity: .22, fog: false, depthWrite: false });
  const halo = new THREE.Mesh(new THREE.SphereGeometry(13, 20, 16), haloMat);
  scene.add(sunDisc, halo);

  // ---------- Bulan & bintang (tampil saat malam) ----------
  const moonMat = new THREE.MeshBasicMaterial({ color: 0xdfe8ff, fog: false });
  const moon = new THREE.Mesh(new THREE.SphereGeometry(5, 20, 16), moonMat);
  const SN = 450, sp = new Float32Array(SN * 3);
  for (let i = 0; i < SN; i++) {                         // Math.random: tidak mengganggu urutan RNG dunia
    const u = Math.random() * Math.PI * 2, v = .12 + Math.random() * .88, rr = Math.sqrt(1 - v * v);
    sp[i * 3] = Math.cos(u) * rr * 300; sp[i * 3 + 1] = v * 300; sp[i * 3 + 2] = Math.sin(u) * rr * 300;
  }
  const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false });
  const stars = new THREE.Points(starGeo, starMat); stars.frustumCulled = false;
  moon.visible = stars.visible = false; scene.add(moon, stars);

  // ---------- Awan ----------
  const CN = 120;
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true, fog: false });
  const clouds = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), cloudMat, CN);
  clouds.frustumCulled = false; scene.add(clouds);
  const cd = Array.from({ length: CN }, () => ({ x: lerp(-260, 260, R()), z: lerp(-260, 260, R()), y: lerp(55, 80, R()),
    sx: 14 + R() * 20, sy: 3 + R() * 3, sz: 9 + R() * 10, th: R(), v: .6 + R() * .8 }));

  // ---------- Hujan ----------
  const RN = 1200, RR = 26, RH = 24;
  const rx = new Float32Array(RN), ry = new Float32Array(RN), rz = new Float32Array(RN), rv = new Float32Array(RN), rp = new Float32Array(RN * 6);
  for (let i = 0; i < RN; i++) { rx[i] = (R() - .5) * 2 * RR; ry[i] = R() * RH; rz[i] = (R() - .5) * 2 * RR; rv[i] = 22 + R() * 10; }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute("position", new THREE.BufferAttribute(rp, 3));
  const rainMat = new THREE.LineBasicMaterial({ color: 0xbcd0e0, transparent: true, opacity: 0 });
  const rain = new THREE.LineSegments(rainGeo, rainMat);
  rain.frustumCulled = false; rain.visible = false; scene.add(rain);

  // ---------- Debu kemarau ----------
  const DN = 500, DR_ = 30;
  const dp = new Float32Array(DN * 3);
  for (let i = 0; i < DN; i++) { dp[i*3] = (R() - .5) * 2 * DR_; dp[i*3+1] = R() * 8; dp[i*3+2] = (R() - .5) * 2 * DR_; }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dp, 3));
  const dustMat = new THREE.PointsMaterial({ color: 0xe8c88f, size: .14, transparent: true, opacity: 0, depthWrite: false });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false; dust.visible = false; scene.add(dust);

  let flashT = 0, flashWait = 6, lastIdx = 0, frame = 0, lastPaintT = -9;

  function update(dt, pp, cam) {
    const t = (performance.now() - t0) / 1000;
    frame++;
    for (const c of chunks) {
      const v = Math.hypot(c.cx - pp.x, c.cz - pp.z) < c.range;
      if (v !== c.on) { c.on = v; for (const mm of c.meshes) mm.visible = v; }
    }

    // Cuaca otomatis tiap 5 menit per fase (tanpa tampilan di layar), transisi halus.
    const idx = Math.floor(t / WEATHER_SEC) % ORDER.length;
    const target = WEATHER[ORDER[idx]];
    const k = 1 - Math.exp(-dt / 8);
    for (const key of NUM) cur[key] += (target[key] - cur[key]) * k;
    for (const key of COL) cur[key].lerp(target[key], k);
    lastIdx = idx;

    // Kilat saat hujan deras
    flashT = Math.max(0, flashT - dt);
    let flash = 0;
    if (cur.rain > .7) {
      flashWait -= dt;
      if (flashWait < 0) { flashT = .4; flashWait = 8 + R() * 14; }
      if (flashT > 0) flash = Math.sin(flashT * 40) > 0 ? 1 : .25;
    }

    scene.background.copy(cur.sky).lerp(WHITE, flash * .25);
    scene.fog.color.copy(cur.fog); scene.fog.near = cur.near; scene.fog.far = cur.far;
    hemi.intensity = cur.hemi + flash * 2.5;
    sun.intensity = cur.sun; sun.color.copy(cur.sunC);
    renderer.toneMappingExposure = cur.expo + flash * .3;

    sun.position.set(pp.x - 9, pp.y + 16, pp.z + 8); sun.target.position.copy(pp); sun.target.updateMatrixWorld();
    for (const m of tint) m.color.copy(cur.leaf);
    pathMat.color.setHex(0x756047).multiplyScalar(1 - .35 * cur.wet);
    if ((Math.abs(cur.dry - lastDry) > .005 || Math.abs(cur.wet - lastWet) > .005) && t - lastPaintT > .3) { paintTerrain(); lastPaintT = t; }

    updateAnimals(dt, t, pp);

    updateTrees(dt, pp);
    updateBuildings(dt, t, pp);

    // Laut: gelombang dihitung di GPU, di sini cukup posisi + waktu + tinggi ombak
    ocean.position.set(Math.round(pp.x / OCELL) * OCELL, WATER_Y + cur.seaY, Math.round(pp.z / OCELL) * OCELL);
    oceanU.uTime.value = t; oceanU.uAmp.value = cur.amp;
    oceanMat.color.copy(cur.sea);

    // Matahari di langit depan kamera
    const sv = cur.sunVis;
    sunDisc.visible = halo.visible = sv > .02;
    sunMat.color.copy(cur.sunC); haloMat.color.copy(cur.sunC); haloMat.opacity = .22 * sv;
    sunDisc.position.set(pp.x - 50, pp.y + 40, pp.z + 190);
    halo.position.copy(sunDisc.position); sunDisc.scale.setScalar(sv); halo.scale.setScalar(sv);

    // Bulan & bintang menyala saat malam
    const nv = cur.night;
    moon.visible = stars.visible = nv > .02;
    if (moon.visible) { moon.position.set(pp.x + 70, pp.y + 75, pp.z + 200); moon.scale.setScalar(nv); stars.position.copy(pp); starMat.opacity = nv; }

    // Awan (diperbarui tiap 2 frame)
    cloudMat.color.copy(cur.cloudC);
    if ((frame & 1) === 1) for (let i = 0; i < CN; i++) {
      const c = cd[i], g = smoothstep(cur.cloud, c.th * .9, c.th * .9 + .25);
      const x = ((c.x + t * c.v + 260) % 520 + 520) % 520 - 260;
      dummy.position.set(pp.x + x, c.y, pp.z + c.z); dummy.rotation.set(0, 0, 0);
      dummy.scale.set(Math.max(c.sx * g, .001), Math.max(c.sy * g, .001), Math.max(c.sz * g, .001));
      dummy.updateMatrix(); clouds.setMatrixAt(i, dummy.matrix);
    }
    if ((frame & 1) === 1) clouds.instanceMatrix.needsUpdate = true;

    // Hujan
    rain.visible = cur.rain > .02;
    if (rain.visible) {
      rainMat.opacity = .5 * cur.rain;
      for (let i = 0; i < RN; i++) {
        ry[i] -= rv[i] * dt; if (ry[i] < 0) ry[i] += RH;
        let dx = rx[i] - pp.x; if (dx > RR) rx[i] -= 2 * RR; else if (dx < -RR) rx[i] += 2 * RR;
        let dz = rz[i] - pp.z; if (dz > RR) rz[i] -= 2 * RR; else if (dz < -RR) rz[i] += 2 * RR;
        const o = i * 6;
        rp[o] = rx[i]; rp[o + 1] = ry[i]; rp[o + 2] = rz[i];
        rp[o + 3] = rx[i] - .25; rp[o + 4] = ry[i] + .9; rp[o + 5] = rz[i];
      }
      rainGeo.attributes.position.needsUpdate = true;
    }

    // Debu
    dust.visible = cur.dust > .02;
    if (dust.visible) {
      dustMat.opacity = .55 * cur.dust;
      for (let i = 0; i < DN; i++) {
        dp[i*3] += 2.5 * dt; dp[i*3+1] += Math.sin(t + i) * .3 * dt;
        let dx = dp[i*3] - pp.x; if (dx > DR_) dp[i*3] -= 2 * DR_; else if (dx < -DR_) dp[i*3] += 2 * DR_;
        let dz = dp[i*3+2] - pp.z; if (dz > DR_) dp[i*3+2] -= 2 * DR_; else if (dz < -DR_) dp[i*3+2] += 2 * DR_;
      }
      dustGeo.attributes.position.needsUpdate = true;
    }
  }

  const m = 4; // jarak aman dari garis pantai
  const api = { update, bounds: { minX: -WORLD.x + m, maxX: WORLD.x - m, minZ: WORLD.zMin + m, maxZ: WORLD.zMax - m },
    findTree, chopTree, build, findFire, feedFire, collide, onPickup: null,
    groundAt: groundH, inside, inHouse, litFireNear, fishSpot, waterY: () => WATER_Y + cur.seaY,
    get night() { return cur.night; } };
  return api;
}
