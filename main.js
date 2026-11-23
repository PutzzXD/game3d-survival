import * as THREE from "three";
import { createMap } from "./map.js";
import { createIntro } from "./intro.js";
import { createInventory, createCrafting, createActionButton, createHealth } from "./hud.js";
import { createFishing } from "./fishing.js";
import { createMonsters } from "./monsters.js";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, innerWidth/innerHeight, .1, 450);
const lowEnd=matchMedia("(pointer:coarse)").matches||innerWidth<800;
const renderer = new THREE.WebGLRenderer({antialias:devicePixelRatio<2,powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(devicePixelRatio,lowEnd?1.5:2));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.12;
document.querySelector("#game").prepend(renderer.domElement);

const hemi=new THREE.HemisphereLight(0xdceeff,0x536044,2);
scene.add(hemi);
const sunLight=new THREE.DirectionalLight(0xffe0b4,2.3);
sunLight.position.set(-9,16,8);
sunLight.castShadow=true;
sunLight.shadow.mapSize.set(lowEnd?1024:2048,lowEnd?1024:2048);
sunLight.shadow.camera.left=-35;sunLight.shadow.camera.right=35;
sunLight.shadow.camera.top=35;sunLight.shadow.camera.bottom=-35;
scene.add(sunLight);
const world=createMap(scene,{renderer,hemi,sun:sunLight});

const mat=(c,r=.82)=>new THREE.MeshStandardMaterial({color:c,roughness:r});
const skin=mat(0xf0c5a5), hair=mat(0x171923), jacket=mat(0x273b3d);
const red=mat(0xb84e3f), pants=mat(0x303b43), boots=mat(0x211f21);
const strap=mat(0x9b7650), dark=mat(0x20252b), white=mat(0xf4eee4);
const glow=new THREE.MeshStandardMaterial({color:0xe7a35f,emissive:0x8c3c0c,emissiveIntensity:.45});

const player=new THREE.Group();
scene.add(player);
const mpGame=window.mp?.attachGame({THREE,scene,player}); // multiplayer: pemain lain + kirim posisi
const FOOT=.37; // tinggi telapak sepatu dari origin model -> turunkan agar menyentuh tanah
const body=new THREE.Group();
body.position.y=-FOOT;
player.add(body);

function add(geo,material,parent,x,y,z,sx=1,sy=1,sz=1){
  const o=new THREE.Mesh(geo,material);
  o.position.set(x,y,z);o.scale.set(sx,sy,sz);
  o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
}
function capsule(parent,r,len,material,x,y,z){
  return add(new THREE.CapsuleGeometry(r,len,5,8),material,parent,x,y,z);
}

// Sumbu depan karakter adalah +Z. Kamera berada di belakang pada -Z.
const leftLeg=new THREE.Group(),rightLeg=new THREE.Group();
leftLeg.position.set(-.19,1.05,0);rightLeg.position.set(.19,1.05,0);
body.add(leftLeg,rightLeg);
for(const leg of [leftLeg,rightLeg]){
  capsule(leg,.115,.48,pants,0,-.32,0);
  add(new THREE.BoxGeometry(.25,.14,.43),boots,leg,0,-.62,.07);
}

const torso=new THREE.Group();torso.position.y=1.25;body.add(torso);
add(new THREE.CapsuleGeometry(.34,.48,6,10),jacket,torso,0,.18,0,1,.9,.72);
add(new THREE.BoxGeometry(.48,.52,.08),red,torso,0,.19,.265);
add(new THREE.BoxGeometry(.13,.68,.13),strap,torso,-.24,.2,.22);
add(new THREE.BoxGeometry(.22,.22,.18),strap,torso,.28,.03,.12);
add(new THREE.BoxGeometry(.42,.5,.24),mat(0x4b4034),torso,0,.15,-.27);
add(new THREE.BoxGeometry(.18,.12,.08),glow,torso,.02,.28,.38);

const leftArm=new THREE.Group(),rightArm=new THREE.Group();
leftArm.position.set(-.39,.42,0);rightArm.position.set(.39,.42,0);
torso.add(leftArm,rightArm);
for(const arm of [leftArm,rightArm]){
  capsule(arm,.105,.42,jacket,0,-.25,0);
  add(new THREE.SphereGeometry(.105,10,8),skin,arm,0,-.51,.015);
  add(new THREE.BoxGeometry(.23,.12,.19),red,arm,0,-.43,.02);
}

add(new THREE.CylinderGeometry(.105,.12,.18,10),skin,body,0,1.92,0);
const head=new THREE.Group();head.position.set(0,2.22,0);body.add(head);
add(new THREE.SphereGeometry(.32,20,16),skin,head,0,0,0,.88,1.08,.82);
add(new THREE.SphereGeometry(.33,16,12,0,Math.PI*2,0,Math.PI*.62),hair,head,0,.13,-.025,1.02,.88,1);
for(let i=0;i<7;i++){
  const a=-1.05+i*.35;
  const spike=add(new THREE.ConeGeometry(.105,.34,6),hair,head,Math.sin(a)*.23,.26,Math.cos(a)*.17);
  spike.rotation.x=-.35;spike.rotation.z=-Math.sin(a)*.55;
}
for(let i=0;i<3;i++){
  const bang=add(new THREE.ConeGeometry(.10,.28,6),hair,head,-.17+i*.17,.05,.255);
  bang.rotation.x=Math.PI;bang.rotation.z=(i-1)*-.22;
}
for(const x of [-.115,.115]){
  add(new THREE.SphereGeometry(.045,10,8),white,head,x,-.005,.267,1,.72,.45);
  add(new THREE.SphereGeometry(.025,10,8),dark,head,x,-.008,.292);
  const brow=add(new THREE.BoxGeometry(.095,.025,.025),hair,head,x,.075,.27);
  brow.rotation.z=x<0?.12:-.12;
}
add(new THREE.SphereGeometry(.055,8,8),skin,head,-.28,-.02,0,.7,1,1);
add(new THREE.SphereGeometry(.055,8,8),skin,head,.28,-.02,0,.7,1,1);
add(new THREE.BoxGeometry(.48,.12,.38),red,body,0,1.91,-.02);
const scarfTail=add(new THREE.BoxGeometry(.12,.42,.08),red,body,.29,1.75,-.12);
scarfTail.rotation.z=-.35;

const shadow=new THREE.Mesh(new THREE.CircleGeometry(.52,24),new THREE.MeshBasicMaterial({color:0x1b261f,transparent:true,opacity:.22}));
shadow.rotation.x=-Math.PI/2;shadow.position.y=.012;player.add(shadow);

// ================= INPUT (gerakan karakter diambil dari referensi main_1.js) =================
const keys={};
addEventListener("keydown",e=>{
  if(/INPUT|TEXTAREA/.test(e.target.tagName))return;
  keys[e.code]=true;
  if(e.code==="Space"){triggerPlayerJump();}
  if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code))e.preventDefault();
});
addEventListener("keyup",e=>{keys[e.code]=false;});

const joystickVector=new THREE.Vector2(0,0); // x: kanan(+), y: atas(+) — sama seperti referensi
let isRunning=false;
const physics={velocityY:0,isGrounded:true,gravity:-32,jumpForce:13,jumpCount:0,maxJumps:2};
const sq={x:0,v:0};
const moveVel=new THREE.Vector2(0,0);
let wasGrounded=true,walkTime=0;

const joystick=document.querySelector("#joystick");
const stick=document.querySelector("#stick");
const maxDist=37;
joystick.style.touchAction="none";
function updateKnob(x,y){
  const dist=Math.hypot(x,y);
  if(dist>maxDist){x=x/dist*maxDist;y=y/dist*maxDist;}
  // `translate` (properti terpisah) tidak menimpa transform CSS bawaan stick.
  stick.style.translate=`${x}px ${y}px`;
  joystickVector.x=x/maxDist;joystickVector.y=-y/maxDist;
}
function moveKnobTo(cx,cy){
  const r=joystick.getBoundingClientRect();
  updateKnob(cx-(r.left+r.width/2),cy-(r.top+r.height/2));
}
// Analog hanya mengikuti JARINYA SENDIRI (identifier): geser layar dengan jari lain tidak mengganggu.
let joyId=null,mouseJoy=false;
const findTouch=list=>{for(const tc of list)if(tc.identifier===joyId)return tc;return null;};
const handleEnd=()=>{joyId=null;mouseJoy=false;joystickVector.set(0,0);stick.style.translate="0px 0px";};
joystick.addEventListener("touchstart",e=>{
  e.preventDefault();e.stopPropagation();
  if(joyId!==null)return;
  const tc=e.changedTouches[0];joyId=tc.identifier;moveKnobTo(tc.clientX,tc.clientY);
},{passive:false});
joystick.addEventListener("touchmove",e=>{
  const tc=findTouch(e.changedTouches);if(!tc)return;
  e.preventDefault();moveKnobTo(tc.clientX,tc.clientY);
},{passive:false});
const endTouch=e=>{if(findTouch(e.changedTouches))handleEnd();};
joystick.addEventListener("touchend",endTouch);
joystick.addEventListener("touchcancel",endTouch);
joystick.addEventListener("mousedown",e=>{e.preventDefault();mouseJoy=true;moveKnobTo(e.clientX,e.clientY);});
addEventListener("mousemove",e=>{if(mouseJoy)moveKnobTo(e.clientX,e.clientY);});
addEventListener("mouseup",()=>{if(mouseJoy)handleEnd();});

const runBtn=document.querySelector("#runBtn"),jumpBtn=document.querySelector("#jumpBtn");
runBtn.style.touchAction="none";jumpBtn.style.touchAction="none";
runBtn.addEventListener("touchstart",e=>{e.preventDefault();isRunning=true;},{passive:false});
runBtn.addEventListener("touchend",e=>{e.preventDefault();isRunning=false;},{passive:false});
runBtn.addEventListener("pointerdown",()=>{isRunning=true;});
for(const ev of ["pointerup","pointercancel","pointerleave"])runBtn.addEventListener(ev,()=>{isRunning=false;});

// Lompat 2 tahap (satu dari tanah + satu di udara), sama seperti referensi.
function triggerPlayerJump(){
  if(intro.active||inv.isOpen||crafting.isOpen)return; // selama intro / tas / menu Buat terbuka, lompat dinonaktifkan
  const maxJumps=Math.max(2,Number(physics.maxJumps)||2);
  let used=Math.max(0,Number(physics.jumpCount)||0);
  if(physics.isGrounded)used=0;
  if(used>=maxJumps)return;
  physics.jumpCount=used+1;
  physics.velocityY=physics.jumpForce;
  physics.isGrounded=false;
  sq.v=6;
}
jumpBtn.addEventListener("pointerdown",e=>{e.preventDefault();e.stopPropagation();triggerPlayerJump();});

// ================= KAMERA ORBIT (geser layar = putar kamera, cubit = zoom) =================
// Sama seperti OrbitControls referensi: drag ke kanan -> kamera berputar ke kiri
// sehingga dunia ikut gerakan jari. Kamera hanya berputar; karakter tidak ikut.
const UP=new THREE.Vector3(0,1,0);
const camTarget=new THREE.Vector3(0,1.5,0);
const orbit={theta:Math.PI,phi:Math.acos(3/Math.hypot(3,6.7)),radius:Math.hypot(3,6.7),dTheta:0,dPhi:0};
const ROT_SPEED=.9,DAMPING=.12,MIN_R=2.5,MAX_R=24;
const canvas=renderer.domElement;
canvas.style.touchAction="none";
const pointers=new Map();
let pinchDist=0;
const pdist=()=>{const [a,b]=[...pointers.values()];return Math.hypot(a.x-b.x,a.y-b.y);};
canvas.addEventListener("pointerdown",e=>{
  if(intro.active)return; // kamera dikendalikan intro
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  canvas.setPointerCapture(e.pointerId);
  if(pointers.size===2)pinchDist=pdist();
});
canvas.addEventListener("pointermove",e=>{
  const p=pointers.get(e.pointerId);if(!p)return;
  const dx=e.clientX-p.x,dy=e.clientY-p.y;
  p.x=e.clientX;p.y=e.clientY;
  if(pointers.size===1){
    orbit.dTheta-=2*Math.PI*dx/innerHeight*ROT_SPEED;
    orbit.dPhi-=2*Math.PI*dy/innerHeight*ROT_SPEED;
  }else if(pointers.size===2){
    const d=pdist();
    if(pinchDist>0&&d>0)orbit.radius=THREE.MathUtils.clamp(orbit.radius*pinchDist/d,MIN_R,MAX_R);
    pinchDist=d;
  }
});
const dropPointer=e=>{pointers.delete(e.pointerId);pinchDist=pointers.size===2?pdist():0;};
canvas.addEventListener("pointerup",dropPointer);
canvas.addEventListener("pointercancel",dropPointer);
canvas.addEventListener("wheel",e=>{
  e.preventDefault();
  if(intro.active)return;
  orbit.radius=THREE.MathUtils.clamp(orbit.radius*(e.deltaY>0?1.08:.92),MIN_R,MAX_R);
},{passive:false});

const damp=(a,b,k,dt)=>a+(b-a)*(1-Math.exp(-k*dt));
const clamp=THREE.MathUtils.clamp;
const clock=new THREE.Clock();
const goal=new THREE.Vector3();
const forward=new THREE.Vector3(),right=new THREE.Vector3(),offset=new THREE.Vector3();

// ================= INTRO SINEMATIK (intro.js) =================
// Pesawat -> mesin mati -> lompat -> parasut -> mendarat. Selama intro aktif,
// intro.js yang mengatur karakter, kamera, dunia & kabut; gameplay di bawah dilewati.
// ================= TAS & MENEBANG POHON (hud.js + map.js) =================
const inv=createInventory();
// kayu yang jatuh dari pohon tumbang diambil map.js -> masuk tas; mengembalikan jumlah yang muat
world.onPickup=(id,n)=>{
  const got=inv.add(id,n);
  if(got>0)inv.notify(id,got);else inv.toast("Tas penuh!");
  return got;
};
// kapak: hanya tampak saat menebang (menempel di tangan kanan)
const axe=new THREE.Group();axe.visible=false;
add(new THREE.BoxGeometry(.06,.62,.06),mat(0x7a5a3a),axe,0,-.56,.05);
add(new THREE.BoxGeometry(.05,.17,.26),mat(0x9aa3ab,.4),axe,0,-.84,.17);
rightArm.add(axe);
const CHOP_RANGE=3.4,CHOP_DUR=.62,CHOP_HIT=.27;
let chopT=-1,chopHit=false,chopTarget=null;
// Efek suara saat pemain mulai menebang pohon.
const treeChopAudio = new Audio("./sounds/chop_tree.mp3");
treeChopAudio.preload = "auto";
treeChopAudio.volume = 0.8;
function playTreeChopSound(){
  try {
    treeChopAudio.pause();
    treeChopAudio.currentTime = 0;
    const sound = treeChopAudio.play();
    if (sound && typeof sound.catch === "function") sound.catch(() => {});
  } catch { /* audio opsional; game tetap berjalan jika audio gagal */ }
}

function startChop(tr){                                  // tr = pohon atau monster
  if(!tr||intro.active||chopT>=0||inv.isOpen||crafting.isOpen||!physics.isGrounded)return;
  fishing.cancel();
  chopTarget=tr;chopT=0;chopHit=false;axe.visible=true;
  if(!tr.isMonster) playTreeChopSound();
}
// aksi terdekat: serang monster > memancing (bila memegang pancingan) > api unggun / pohon (mana yang lebih dekat)
function pickAction(){
  const p=player.position;
  const mon=monsters.nearest(p.x,p.z,2.6);
  if(mon)return{kind:"attack",label:"Serang",mon};
  if(inv.held==="pancing"){
    if(fishing.busy)return{kind:"fish",label:fishing.label};
    if(fishing.canCast())return{kind:"fish",label:"Pancing"};
  }
  const f=world.findFire(p.x,p.z),tr=world.findTree(p.x,p.z,CHOP_RANGE);
  if(f&&(!tr||Math.hypot(f.x-p.x,f.z-p.z)<=Math.hypot(tr.x-p.x,tr.z-p.z)))return{kind:"fire",label:f.lit?"Tambah kayu":"Nyalakan",f};
  if(tr)return{kind:"chop",tr};
  return{kind:null};
}
function doAction(){
  if(intro.active||chopT>=0||inv.isOpen||crafting.isOpen||!physics.isGrounded)return;
  const a=pickAction();
  if(a.kind==="attack")startChop(a.mon);
  else if(a.kind==="fish")fishing.press();
  else if(a.kind==="fire"){
    if(inv.count("kayu")<1){inv.toast("Butuh 1 kayu");return;}
    const r=world.feedFire(a.f);
    if(r.ok)inv.remove("kayu",1);
    inv.toast(r.text);
  }else if(a.kind==="chop")startChop(a.tr);
}
const chopBtn=createActionButton(doAction);
// menu Buat: rumah / api dibangun di depan pemain, pancingan masuk ke tas
const crafting=createCrafting(inv,r=>{
  for(const[k,n]of Object.entries(r.cost))if(inv.count(k)<n)return{ok:false,msg:"Bahan kurang"};
  if(r.kind==="build"){
    const ry=player.rotation.y,house=r.id==="rumah",dist=house?6.5:2.6;
    const res=world.build(house?"house":"fire",player.position.x+Math.sin(ry)*dist,player.position.z+Math.cos(ry)*dist,house?ry+Math.PI:ry);
    if(!res.ok)return{ok:false,msg:res.why};
    for(const[k,n]of Object.entries(r.cost))inv.remove(k,n);
    return{ok:true,msg:house?"Rumah kayu dibangun":"Api unggun dipasang"};
  }
  for(const[k,n]of Object.entries(r.cost))inv.remove(k,n);
  for(const[k,n]of Object.entries(r.give||{})){
    if(inv.add(k,n)<n){for(const[ck,cn]of Object.entries(r.cost))inv.add(ck,cn);return{ok:false,msg:"Tas penuh!"};}
  }
  return{ok:true,msg:r.name+" dibuat"};
});
// ================= HP, MEMANCING, MONSTER MALAM =================
const health=createHealth(100);
const fishing=createFishing({scene,world,player,rightArm,inv});
const monsters=createMonsters({scene,world});
inv.onUse(id=>{                                           // makan ikan: +25 HP
  if(id!=="ikan")return false;
  if(health.hp>=health.max-.5){inv.toast("HP sudah penuh");return false;}
  health.heal(25);inv.toast("+25 HP");return true;
});
inv.onHold(id=>{inv.toast(id==="pancing"?"Memegang pancingan":"Pancingan disimpan");if(!id)fishing.cancel();});
monsters.onHit((dmg,dx,dz)=>{                             // dihantam monster: kurangi HP + terdorong sedikit
  health.damage(dmg);
  moveVel.x+=dx*5;moveVel.y+=dz*5;
});
health.onDeath(()=>{                                      // pingsan: bangun lagi di titik awal dengan 60 HP
  player.position.set(0,0,0);moveVel.set(0,0);
  physics.velocityY=0;physics.isGrounded=true;physics.jumpCount=0;
  fishing.cancel();monsters.clearNear(0,0,60);
  health.set(60);inv.toast("Kamu pingsan… bangun di titik awal");
});
addEventListener("keydown",e=>{
  if(e.repeat||/INPUT|TEXTAREA/.test(e.target.tagName))return;
  if(e.code==="KeyE"||e.code==="KeyF")doAction();       // tebang pohon / nyalakan api terdekat
  else if((e.code==="KeyB"||e.code==="KeyI")&&!intro.active)inv.toggle(); // buka/tutup tas
  else if(e.code==="KeyC"&&!intro.active)crafting.toggle();
  else if(e.code==="KeyR"&&!intro.active&&inv.count("pancing")>0)inv.setHeld(inv.held==="pancing"?null:"pancing"); // pegang / simpan pancingan                // buka/tutup menu Buat
});

// ================= INTRO SINEMATIK (intro.js) =================
const intro=createIntro({
  scene,camera,world,player,body,head,leftLeg,rightLeg,leftArm,rightArm,
  scarfTail,shadow,FOOT,orbit,
  controls:[joystick,runBtn,jumpBtn,inv.button,crafting.button,chopBtn.el].filter(Boolean),
  onFinish:({yaw})=>{
    // sambungkan kamera gameplay persis dengan kamera akhir intro (tanpa lonjakan)
    orbit.theta=yaw+Math.PI;orbit.dTheta=0;orbit.dPhi=0;
    camTarget.set(player.position.x,player.position.y+1.5,player.position.z);
    moveVel.set(0,0);
    physics.velocityY=0;physics.isGrounded=true;physics.jumpCount=0;wasGrounded=true;
    pointers.clear();pinchDist=0;
  }
});

function animate(){
  requestAnimationFrame(animate);
  const delta=Math.min(clock.getDelta(),.1);
  const t=clock.getElapsedTime();
  mpGame?.update(delta,t,!intro.active);

  // Intro berjalan: ia mengurus kamera & dunia. update() tetap dipanggil setelah selesai
  // untuk efek sisa (kanopi parasut roboh).
  if(intro.update(delta)){renderer.render(scene,camera);return;}

  // ---------- Menebang pohon: hadap pohon, ayun kapak, tebasan mengenai pada CHOP_HIT ----------
  if(chopT>=0){
    chopT+=delta;
    const tr=chopTarget;
    if(tr){let d=Math.atan2(tr.x-player.position.x,tr.z-player.position.z)-player.rotation.y;d=Math.atan2(Math.sin(d),Math.cos(d));player.rotation.y+=d*(1-Math.exp(-delta*18));}
    if(!chopHit&&chopT>=CHOP_HIT){
      chopHit=true;
      if(chopTarget.isMonster){if(Math.hypot(chopTarget.x-player.position.x,chopTarget.z-player.position.z)<3)monsters.hit(chopTarget,1,player.position.x,player.position.z);}
      else world.chopTree(chopTarget,player.position);
    }
    if(chopT>=CHOP_DUR){
      chopT=-1;chopTarget=null;axe.visible=false;
      // Hentikan audio saat satu ayunan tebang selesai agar klip panjang tidak terus berbunyi.
      treeChopAudio.pause();
      treeChopAudio.currentTime=0;
    }
  }
  {const a=(!intro.active&&chopT<0&&!inv.isOpen&&!crafting.isOpen&&physics.isGrounded)?pickAction():{kind:null};chopBtn.show(a.kind,a.label);}

  // ---------- Gerak (persis alur referensi) ----------
  const speed=(isRunning||keys.ShiftLeft||keys.ShiftRight)?9:5;
  camera.getWorldDirection(forward);forward.y=0;forward.normalize();
  right.crossVectors(forward,UP).normalize();

  let jx=joystickVector.x+((keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0));
  let jy=joystickVector.y+((keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0));
  const jl=Math.hypot(jx,jy);if(jl>1){jx/=jl;jy/=jl;}
  if(chopT>=0||inv.isOpen||crafting.isOpen){jx=0;jy=0;} // diam saat menebang / tas terbuka

  const preVy=physics.velocityY;
  let desX=0,desZ=0;
  if(Math.abs(jx)>.1||Math.abs(jy)>.1){
    const moveX=forward.x*jy+right.x*jx;
    const moveZ=forward.z*jy+right.z*jx;
    const len=Math.hypot(moveX,moveZ)||1;
    desX=moveX/len*speed;desZ=moveZ/len*speed;
    let diff=Math.atan2(moveX,moveZ)-player.rotation.y;
    diff=Math.atan2(Math.sin(diff),Math.cos(diff));
    player.rotation.y+=diff*(1-Math.exp(-delta*16));
  }
  const accel=1-Math.exp(-delta*((desX||desZ)?11:14));
  moveVel.x+=(desX-moveVel.x)*accel;moveVel.y+=(desZ-moveVel.y)*accel;
  const hSpeed=moveVel.length();
  const isMoving=hSpeed>.4;
  player.position.x=clamp(player.position.x+moveVel.x*delta,world.bounds.minX,world.bounds.maxX);
  player.position.z=clamp(player.position.z+moveVel.y*delta,world.bounds.minZ,world.bounds.maxZ);
  world.collide(player.position,.45); // dinding rumah & api unggun

  // ---------- Lompat & gravitasi ----------
  if(!physics.isGrounded){
    physics.velocityY+=physics.gravity*delta;
    player.position.y+=physics.velocityY*delta;
    if(player.position.y<=0){player.position.y=0;physics.velocityY=0;physics.isGrounded=true;physics.jumpCount=0;}
  }
  if(physics.isGrounded&&!wasGrounded&&preVy<-4){sq.v=-Math.min(1,-preVy/22)*8;}
  wasGrounded=physics.isGrounded;

  // ---------- Animasi: damping + squash & stretch + condong badan ----------
  const k=1-Math.exp(-delta*14);
  const dmp=(o,key,v)=>{o[key]+=(v-o[key])*k;};
  const runK=clamp((hSpeed-5)/4,0,1);
  sq.v+=(-sq.x*220-sq.v*14)*delta;sq.x+=sq.v*delta;
  let bob=0,lean=0,twist=0,sway=0;
  let lH=0,rH=0,lA=0,rA=0,armZ=.1,headY=0;

  if(!physics.isGrounded){
    const up=physics.velocityY>0;
    lH=up?-.9:-.4;rH=up?.3:.5;
    lA=rA=up?-1.7:-1.0;armZ=up?.5:.8;
    lean=.1+clamp(-physics.velocityY*.004,-.1,.12);
  }else if(isMoving){
    walkTime+=delta*Math.min(hSpeed,12)*1.7;
    const s=Math.sin(walkTime),amp=.55+runK*.4;
    lH=s*amp;rH=-s*amp;
    lA=-s*amp*.9;rA=s*amp*.9;
    bob=Math.abs(s)*(.05+runK*.05);lean=.06+runK*.2;twist=-s*(.12+runK*.1);sway=s*.04;armZ=.12;
    headY=-twist*.8;
  }else{
    const br=Math.sin(t*2.2); // idle: napas, goyang pelan, kepala melirik
    bob=br*.008;lA=Math.sin(t*1.3)*.04;rA=-lA;armZ=.1+br*.015;
    sway=Math.sin(t*.8)*.015;headY=Math.sin(t*.5)*.35;
  }
  if(chopT>=0){ // ayunan kapak: angkat -> hantam -> kembali
    const u=chopT/CHOP_DUR,L=THREE.MathUtils.lerp;
    let a=-1.4-1.4*clamp(u/.4,0,1);
    if(u>.4)a=L(-2.8,-.6,clamp((u-.4)/.16,0,1));
    if(u>.6)a=L(-.6,0,clamp((u-.6)/.4,0,1));
    lA=rA=a;armZ=.12;lH=rH=0;
    lean=.12+.28*clamp((u-.35)/.2,0,1)*(1-clamp((u-.6)/.4,0,1));
  }
  fishing.rod.visible=inv.held==="pancing"&&chopT<0;      // pancingan di tangan kanan
  if(chopT<0&&inv.held==="pancing")rA=fishing.armPose(t).rA;
  dmp(leftLeg.rotation,"x",lH);dmp(rightLeg.rotation,"x",rH);
  dmp(leftArm.rotation,"x",lA);dmp(rightArm.rotation,"x",rA);
  dmp(leftArm.rotation,"z",-armZ);dmp(rightArm.rotation,"z",armZ);
  dmp(head.rotation,"y",headY);
  dmp(body.position,"y",bob-FOOT);dmp(body.rotation,"x",lean);dmp(body.rotation,"y",twist);dmp(body.rotation,"z",sway);
  dmp(scarfTail.rotation,"x",Math.sin(t*5)*.1-.15-hSpeed*.05);
  const air=physics.isGrounded?0:clamp(physics.velocityY/13,-1,1)*.1;
  const st=clamp(sq.x+air,-.35,.35);
  body.scale.set(1-st*.5,1+st,1-st*.5);
  const fovT=58+runK*8;if(Math.abs(fovT-camera.fov)>.01){camera.fov+=(fovT-camera.fov)*k*.5;camera.updateProjectionMatrix();}

  // Bayangan tetap di tanah, mengecil saat melompat
  shadow.position.y=.012-player.position.y;
  const sh=1/(1+player.position.y*.35);
  shadow.scale.set(sh,sh,sh);shadow.material.opacity=.22*sh;

  // ---------- Kamera orbit mengikuti karakter ----------
  goal.set(player.position.x,player.position.y+1.5,player.position.z);
  camTarget.lerp(goal,1-Math.exp(-delta*8));
  orbit.theta+=orbit.dTheta*DAMPING;orbit.dTheta*=1-DAMPING;
  orbit.phi=clamp(orbit.phi+orbit.dPhi*DAMPING,.12,Math.PI/2-.05);orbit.dPhi*=1-DAMPING;
  const sp=Math.sin(orbit.phi)*orbit.radius;
  offset.set(sp*Math.sin(orbit.theta),Math.cos(orbit.phi)*orbit.radius,sp*Math.cos(orbit.theta));
  camera.position.copy(camTarget).add(offset);
  camera.lookAt(camTarget);
  world.update(delta,player.position,camera);
  fishing.update(delta,t);monsters.update(delta,player.position,t);health.update(delta);

  renderer.render(scene,camera);
}
requestAnimationFrame(animate);

addEventListener("resize",()=>{
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});
setTimeout(()=>{
  const loading=document.querySelector("#loading");
  if(loading){loading.style.opacity="0";setTimeout(()=>loading.remove(),450);}
},650);
