// ============================================================================
//  MONSTER MALAM: muncul saat malam, mengejar pemain, serangan ringan (5-7 HP) dengan jeda ~1,5 detik.
//  Bisa dilawan dengan kapak (3 tebasan), kalah cepat dari pemain yang berlari, takut api unggun menyala.
//  Menghilang saat pagi. world: groundAt, inside, collide, litFireNear, inHouse, night (dari map.js).
// ============================================================================
import * as THREE from "three";

const MAX = 4, SPEED = 3.4, ATK_RANGE = 1.28, WINDUP = .35;

export function createMonsters({ scene, world }) {
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
