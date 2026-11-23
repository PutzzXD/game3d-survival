// ============================================================================
//  MEMANCING: pegang pancingan (dari tas) -> hadap laut -> tombol "Pancing" -> tunggu ikan menggigit -> "TARIK!"
//  Modul berdiri sendiri: model pancingan dipasang ke tangan kanan karakter, pelampung & senar digambar di scene.
// ============================================================================
import * as THREE from "three";
const { lerp, clamp } = THREE.MathUtils;
const REL = .22, FLY = .6, SEG = 10;   // detik lemparan: lepas kail, lama melayang; jumlah ruas senar

export function createFishing({ scene, world, player, rightArm, inv }) {
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
