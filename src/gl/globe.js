import {createStage,THREE,toon,glow,outline,sprite,Sparks,hdr,lerp,ease} from './core';
import {domeShader} from './network';
import {gsap} from 'gsap';
import {buildPlanet,orbitRing} from './planet';
import {sfx} from '../audio';
import {studio,rbox} from './kit';

// Главный экран: точечный глобус «ландшафт угроз». Дуги атак летят со всего мира в одну точку — вашу сеть.
const R=5;
export const latLon=(lat,lon,r=R)=>{
 const phi=(90-lat)*Math.PI/180,th=(lon+180)*Math.PI/180;
 return new THREE.Vector3(-r*Math.sin(phi)*Math.cos(th),r*Math.cos(phi),r*Math.sin(phi)*Math.sin(th));
};
const TARGET={lat:55.75,lon:37.62};
export const SOURCES=[
 // ai: true — угрозы эпохи ИИ (янтарные)
 {id:'agent',lat:37.5,lon:-122,label:'автономные ИИ-агенты-взломщики',ai:true},
 {id:'prompt',lat:51,lon:-1,label:'промпт-инъекции в ИИ-ассистентов',ai:true},
 {id:'deepfake',lat:35.7,lon:139.7,label:'дипфейк-звонки и голосовой фишинг',ai:true},
 {id:'mcp',lat:62,lon:12,label:'подмена MCP-серверов и плагинов агентов',ai:true},
 {id:'poison',lat:56,lon:80,label:'отравление данных ИИ-моделей',ai:true},
 {id:'bots',lat:38,lon:-97,label:'боты и сканеры IP-диапазонов'},
 {id:'apt',lat:45,lon:68,label:'APT-группировки'},
 {id:'ransom',lat:-14,lon:-52,label:'шифровальщики и вымогатели'},
 {id:'zero',lat:-25,lon:134,label:'эксплойты нулевого дня'},
 {id:'supply',lat:48,lon:9,label:'атаки на цепочку поставок: пакеты, CI/CD'},
 {id:'secrets',lat:6,lon:22,label:'утечки секретов и токенов доступа'},
 {id:'iot',lat:21,lon:79,label:'ботнеты умных устройств'},
 {id:'ot',lat:61,lon:105,label:'атаки на промышленные сети (АСУ ТП)'},
 {id:'cloud',lat:56,lon:-105,label:'ошибки настройки облака'},
 {id:'qr',lat:-4,lon:-62,label:'квишинг: фишинг через QR-коды'},
 {id:'mfa',lat:14,lon:101,label:'усталость от MFA и кража сессий'},
 {id:'insider',lat:25,lon:45,label:'инсайдеры и теневой ИТ'},
 {id:'ddos',lat:-30,lon:25,label:'DDoS-ботнеты'},
 {id:'a1',lat:60,lon:-45},{id:'a2',lat:-35,lon:-65},{id:'a3',lat:30,lon:105},{id:'a4',lat:-1,lon:115},{id:'a5',lat:12,lon:-5},{id:'a6',lat:40,lon:-4}
];

const arcVert='varying float vU;varying float vW;void main(){vU=uv.x;vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;}';
// дуга: яркая «голова», хвост гаснет, за головой след растворяется шумом (приём Shopify BFCM)
const arcFrag=`uniform float uHead,uTrail,uA;uniform vec3 uColor;varying float vU;
 float h(float x){return fract(sin(x*91.7)*43758.5);}
 void main(){float d=uHead-vU;float t=d>0.&&d<uTrail?pow(1.-d/uTrail,1.8)*1.5:0.;float head=smoothstep(.02,0.,abs(d))*3.;
  float dis=step(h(floor(vU*160.)),1.-clamp((uHead-1.)*1.6,0.,1.));float base=(uHead>0.&&vU<uHead)?.16*dis:0.;
  float a=(t+head+base)*uA;gl_FragColor=vec4(uColor*a,a);}`;
export function createHero(parent,{quality=1}={}){
 const ctx=createStage(parent,{bg:0x050608,fog:0,quality,bloom:[0.8,0.65,0.8],shadows:false,fov:30});
 const {scene,camera}=ctx;
 const api={ctx,handlers:{},pointer:{x:0,y:0},diving:false,arcCount:0,labels:[]};

 studio(ctx.renderer,scene,{intensity:.35});
 scene.add(new THREE.AmbientLight(0x889,0.25));
 const sun=new THREE.DirectionalLight(0xffe2cf,2.4);sun.position.set(-8,5,10);scene.add(sun);

 const globe=new THREE.Group();scene.add(globe);
 // планета из кубиков
 const tPos0=latLon(TARGET.lat,TARGET.lon,R);
 const planet=buildPlanet(globe,{R,target:tPos0});
 scene.add(planet.atmo);
 // орбитальное кольцо-гироскоп
 const orbit=new THREE.Group();orbit.rotation.set(1.18,.18,-.32);scene.add(orbit);
 const ring1=orbitRing(R*1.34);orbit.add(ring1);
 const ring2=orbitRing(R*1.42,{color:[.25,.3,.42],ticks:72});ring2.rotation.x=.08;orbit.add(ring2);
 // цель — «ваша сеть»
 const tPos=tPos0,tN=tPos.clone().normalize();
 const tg=new THREE.Group();tg.position.copy(tPos);tg.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),tN);globe.add(tg);
 const cube=new THREE.Mesh(rbox(.36,.36,.36,.05),new THREE.MeshPhysicalMaterial({color:0xfc3e24,roughness:.22,metalness:.05,clearcoat:1,clearcoatRoughness:.06,emissive:0x400a04}));cube.position.y=.62;tg.add(cube);
 const cubeHalo=sprite(0xfc3e24,2.6,.55);cubeHalo.position.y=.62;tg.add(cubeHalo);
 const pillar=new THREE.Mesh(new THREE.CylinderGeometry(.02,.14,1.3,16,1,true),new THREE.MeshBasicMaterial({color:hdr(1.8,.2,.1),transparent:true,opacity:.3,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,side:THREE.DoubleSide}));pillar.position.y=.65;tg.add(pillar);
 const shieldMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,
  uniforms:{uTime:{value:0},uR:{value:1.2},uScan:{value:-1},uColor:{value:new THREE.Color(.35,1.5,1.0)},uHit:{value:[0,1,2,3].map(()=>new THREE.Vector4(0,1,0,-1))}},vertexShader:domeShader.vertex,fragmentShader:domeShader.fragment});
 const shield=new THREE.Mesh(new THREE.SphereGeometry(.95,40,20,0,Math.PI*2,0,Math.PI/2),shieldMat);shield.position.y=.02;tg.add(shield);
 const baseRing=new THREE.Mesh(new THREE.RingGeometry(.9,.95,64),glow(.4,1.8,1.2,{transparent:true,opacity:.9,side:THREE.DoubleSide}));baseRing.rotation.x=-Math.PI/2;baseRing.position.y=.02;tg.add(baseRing);

 // источники угроз
 const srcObjs=SOURCES.map(s=>{
  const p=latLon(s.lat,s.lon,R),n=p.clone().normalize();
  const g=new THREE.Group();g.position.copy(p);g.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),n);globe.add(g);
  const col=s.ai?[2.6,1.5,.25]:[3,.4,.2];const d=new THREE.Mesh(new THREE.OctahedronGeometry(s.label?.12:.07),glow(...col));d.position.y=.12;g.add(d);
  const h=sprite(s.ai?0xf2b53a:0xfc3e24,s.label?.95:.55,.5);h.position.y=.12;g.add(h);
  const st=new THREE.Mesh(new THREE.CylinderGeometry(.008,.008,.5,6),glow(...(s.ai?[1.6,1,.2]:[1.6,.2,.1])));st.position.y=.25;g.add(st);
  return{s,p,n,d,h};
 });

 // дуги
 function makeArc(a,b,lift){
  const mid=a.clone().add(b).multiplyScalar(.5);const dist=a.distanceTo(b);
  const c=mid.clone().normalize().multiplyScalar(R+Math.min(3.4,.5+dist*lift));
  const curve=new THREE.QuadraticBezierCurve3(a.clone().normalize().multiplyScalar(R+.02),c,b.clone().normalize().multiplyScalar(R+.02));
  return curve;
 }
 const arcs=[];
 const arcMatBase=(col)=>new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uHead:{value:-1},uTrail:{value:.32},uA:{value:1},uColor:{value:new THREE.Color(...col)}},vertexShader:arcVert,fragmentShader:arcFrag});
 const spawn=(from,to,{col=[3.0,.45,.25],speed=.34,ambient=false}={})=>{
  const curve=makeArc(from,to,.28);
  const geo=new THREE.TubeGeometry(curve,128,ambient?.012:.024,6,false);
  const mesh=new THREE.Mesh(geo,arcMatBase(col));mesh.frustumCulled=false;globe.add(mesh);
  arcs.push({mesh,curve,t:-.05,speed,ambient,to,toTarget:to===tPos||to.equals(tPos),done:false});
 };
 const toTarget=()=>{const s=srcObjs[Math.floor(Math.random()*srcObjs.length)];spawn(s.p,tPos,{speed:.27+Math.random()*.12,col:s.s.ai?[2.6,1.5,.3]:[3.0,.45,.25]});};
 const ambient=()=>{const a=srcObjs[Math.floor(Math.random()*srcObjs.length)],b=srcObjs[Math.floor(Math.random()*srcObjs.length)];if(a!==b)spawn(a.p,b.p,{col:[.7,.28,.18],speed:.3,ambient:true})};

 const ripple=(pos)=>{planet.hit(pos,ctx.t)};
 // звёздная пыль
 const sp=[],ss=[];for(let i=0;i<2200;i++){const v=new THREE.Vector3().randomDirection().multiplyScalar(40+Math.random()*60);sp.push(v.x,v.y,v.z);ss.push(Math.pow(Math.random(),6))}
 const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.Float32BufferAttribute(sp,3));sg.setAttribute('aS',new THREE.Float32BufferAttribute(ss,1));
 const starMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uTime:{value:0},uScale:{value:ctx.h}},
  vertexShader:'attribute float aS;uniform float uTime,uScale;varying float vA;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vA=(.35+aS*1.6)*(.7+.3*sin(uTime*(.6+aS*2.)+position.x));gl_PointSize=(1.2+aS*3.)*uScale/1080.;gl_Position=projectionMatrix*mv;}',
  fragmentShader:'varying float vA;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;float a=smoothstep(.5,0.,d)*vA;gl_FragColor=vec4(vec3(.75,.82,1.)*a,a);}'});
 const stars=new THREE.Points(sg,starMat);stars.frustumCulled=false;scene.add(stars);

 // ориентация и камера
 const spin=new THREE.Quaternion(),tiltQ=new THREE.Quaternion();
 let ang=0,angVel=.045,tilt=.22,tiltVel=0,zoom=1,zoomT=1;const BASE=.045;
 {const D=new THREE.Vector3(.28,.22,.93).normalize();let best=9;
  for(let a=0;a<Math.PI*2;a+=.01){const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(.22,0,.1)).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),a));const d=tN.clone().applyQuaternion(q).distanceTo(D);if(d<best){best=d;ang=a}}} // цель сначала у края
 const cam={d:30,fov:30,ox:-400,oy:0};
 let diveT=0,diveFrom=new THREE.Quaternion(),diveTo=new THREE.Quaternion(),fade=1;
 const worldTarget=new THREE.Vector3();
 // Пике к цели. Стартует из текущего состояния камеры (с учётом зума и курсора) — без рывков.
 // onCover вызывается заранее, чтобы занавес успел закрыть кадр до смены сцены.
 const dv={px:0,py:0,roll:0};let diveTw=null;
 api.dive=({onCover,coverAt=.58}={})=>{
  if(api.diving)return;api.diving=true;sfx.whoosh(2.2);
  const d0=cam.d*zoom,ox0=cam.ox,fov0=cam.fov;dv.px=api.pointer.x;dv.py=api.pointer.y;const px0=dv.px,py0=dv.py;
  cam.d=d0;
  diveFrom.copy(globe.quaternion);diveTo.setFromUnitVectors(tN,new THREE.Vector3(.08,.16,1).normalize());
  const o={t:0};let covered=false;
  diveTw=gsap.to(o,{t:1,duration:2.6,ease:'none',onUpdate:()=>{
   const t=o.t,e=ease.inOut(t);diveT=t;
   globe.quaternion.slerpQuaternions(diveFrom,diveTo,ease.inOut(Math.min(1,t*1.35)));
   cam.d=lerp(d0,7.4,Math.pow(e,1.25));cam.fov=lerp(fov0,46,e);cam.ox=lerp(ox0,0,ease.inOut(Math.min(1,t*1.4)));cam.oy=0;
   dv.px=lerp(px0,0,Math.min(1,t*2));dv.py=lerp(py0,0,Math.min(1,t*2));dv.roll=Math.sin(Math.min(1,t)*Math.PI)*.07;
   if(t>.35)ctx.aberrate(Math.min(.5,(t-.35)*1.2));
   if(!covered&&t>=coverAt){covered=true;onCover&&onCover()}
  }});
 };
 const disp0=ctx.dispose;ctx.dispose=()=>{diveTw&&diveTw.kill();disp0()};
 api.on=(n,f)=>{api.handlers[n]=f};
 const tw=new THREE.Vector3();
 api.targetScreen=()=>{tg.getWorldPosition(tw);const p=ctx.project(tw);const fr=tw.clone().sub(camera.position).normalize().dot(tw.clone().normalize())<0;return{x:p.x,y:p.y,front:fr}};
 api.input={down:false,moved:false,vx:0,vy:0,holdT:0};
 api.zoomBy=f=>{if(api.diving)return;zoomT=Math.max(.55,Math.min(1.5,zoomT*f))};
 api.hitPlanet=(cx,cy)=>{const r=parent.getBoundingClientRect(),k=r.width/ctx.w;const x=(cx-r.left)/k,y=(cy-r.top)/k;const c=ctx.project(new THREE.Vector3(0,0,0)),e=ctx.project(new THREE.Vector3(R,0,0));return Math.hypot(x-c.x,y-c.y)<Math.hypot(e.x-c.x,e.y-c.y)*1.12};
 api.ptrT=0;const ndc=new THREE.Vector2();
 api.setPointer=(x,y)=>{api.pointer.x=x;api.pointer.y=y;api.ptrT=performance.now()};

 let timer=0,amb=0,first=true,hitK=0;
 // стартовая очередь, чтобы кадр сразу был «живой»
 for(let i=0;i<4;i++)setTimeout(()=>toTarget(),i*350);for(let i=0;i<3;i++)setTimeout(ambient,150+i*500);
 const v=new THREE.Vector3();
 ctx.add((dt,t)=>{
  planet.update(dt,t);starMat.uniforms.uTime.value=t;shieldMat.uniforms.uTime.value=t;
  ring1.rotation.z=t*.03;ring2.rotation.z=-t*.018;
  planet.pointer(ndc.set(api.pointer.x,-api.pointer.y),camera,!api.diving&&performance.now()-api.ptrT<1400);
  if(!api.diving){
   const I=api.input;
   if(I.down){
    if(I.moved){angVel=lerp(angVel,I.vx,1-Math.exp(-dt*14));tiltVel=lerp(tiltVel,I.vy,1-Math.exp(-dt*14));I.moved=false;I.holdT=0}
    else{I.holdT+=dt;const sg=Math.sign(angVel||1);angVel=sg*Math.min(8,Math.abs(angVel)+dt*(1.6+I.holdT*3.4));tiltVel*=Math.exp(-dt*8)}
   }else{angVel+= (BASE-angVel)*(1-Math.exp(-dt*.9));tiltVel*=Math.exp(-dt*3)}
   I.vx*=Math.exp(-dt*6);I.vy*=Math.exp(-dt*6);
   ang+=angVel*dt;tilt=Math.max(-.7,Math.min(.9,tilt+tiltVel*dt));
   zoom=lerp(zoom,zoomT,1-Math.exp(-dt*7));
   spin.setFromAxisAngle(new THREE.Vector3(0,1,0),ang);tiltQ.setFromEuler(new THREE.Euler(tilt,0,.1));globe.quaternion.copy(tiltQ).multiply(spin);
   api.speed=Math.abs(angVel);
  }
  // камера
  const px=api.diving?dv.px:api.pointer.x,py=api.diving?dv.py:api.pointer.y;
  camera.position.set(px*.8,py*-.45+(1-diveT)*.6,api.diving?cam.d:cam.d*zoom);
  camera.lookAt(0,0,0);camera.rotateZ(dv.roll);camera.fov=cam.fov;
  camera.setViewOffset(ctx.w,ctx.h,cam.ox*ctx.w/1920,cam.oy*ctx.h/1080,ctx.w,ctx.h);camera.updateProjectionMatrix();
  // спавн
  timer-=dt;if(timer<=0&&!api.diving){timer=.5+Math.random()*.6;toTarget()}
  amb-=dt;if(amb<=0&&!api.diving){amb=.7+Math.random()*.8;ambient()}
  // анимация источников/цели
  srcObjs.forEach((o,i)=>{o.d.rotation.y=t*1.2+i;o.h.material.opacity=.45+.15*Math.sin(t*2+i)});
  cube.rotation.y=t*.9;cube.position.y=.55+Math.sin(t*1.6)*.04;cubeHalo.material.opacity=.45+.1*Math.sin(t*2.2);
  baseRing.scale.setScalar(1+Math.sin(t*2)*.02);
  // дуги
  for(let i=arcs.length-1;i>=0;i--){
   const a=arcs[i];a.t+=a.speed*dt;a.mesh.material.uniforms.uHead.value=a.t;
   if(a.t>=1&&!a.done){a.done=true;
    const end=a.curve.getPoint(1);
    if(a.toTarget){
     // попадание: щит гасит
     ripple(end);
     const dir=new THREE.Vector3(Math.random()-.5,.5+Math.random()*.4,Math.random()-.5).normalize();hitK=(hitK+1)%4;shieldMat.uniforms.uHit.value[hitK].set(dir.x,dir.y,dir.z,t);
     if(Math.random()<.35){ctx.kick(.12)}
     api.arcCount++;api.handlers.hit&&api.handlers.hit(api.arcCount);
    }else if(Math.random()<.4){ripple(end)}
   }
   if(a.t>1.5){globe.remove(a.mesh);a.mesh.geometry.dispose();a.mesh.material.dispose();arcs.splice(i,1)}
  }
  // подписи
  const cand=srcObjs.filter(o=>o.s.label).map(o=>{v.copy(o.p).applyQuaternion(globe.quaternion);const facing=v.clone().normalize().z;
   v.addScaledVector(o.n.clone().applyQuaternion(globe.quaternion),.35);const s2=ctx.project(v);return{id:o.s.id,text:o.s.label,ai:!!o.s.ai,x:s2.x,y:s2.y,facing,show:facing>.18}}).sort((a,b)=>b.facing-a.facing);
  const kept=[];for(const c of cand){if(!c.show)continue;if(kept.some(k=>Math.abs(k.y-c.y)<30&&Math.abs(k.x-c.x)<260)){c.show=false;continue}kept.push(c)}
  api.labels=cand;
 });
 if(import.meta.env.DEV)window.__hero=api;
 return api;
}
