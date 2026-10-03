import {createStage,THREE,toon,glow,outline,sprite,Sparks,hdr,lerp,ease} from './core';
import {domeShader} from './network';
import {gsap} from 'gsap';
import {feature} from 'topojson-client';
import landTopo from 'world-atlas/land-110m.json';

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

function landMask(){
 const W=2048,H=1024,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
 g.fillStyle='#000';g.fillRect(0,0,W,H);g.fillStyle='#fff';
 const f=feature(landTopo,landTopo.objects.land);
 const geoms=f.type==='FeatureCollection'?f.features.map(x=>x.geometry):[f.geometry||f];
 const X=lon=>(lon+180)/360*W,Y=lat=>(90-lat)/180*H;
 g.beginPath();
 for(const geo of geoms){
  const polys=geo.type==='Polygon'?[geo.coordinates]:geo.coordinates;
  for(const p of polys)for(const ring of p){ring.forEach(([lo,la],i)=>i?g.lineTo(X(lo),Y(la)):g.moveTo(X(lo),Y(la)));g.closePath()}
 }
 g.fill('evenodd');
 return g.getImageData(0,0,W,H).data;
}

const dotsVert=`
 attribute float aSeed;uniform float uTime,uScale;uniform vec3 uLight;uniform vec4 uHit[6];
 varying float vB;varying float vHit;varying float vSeed;
 void main(){
  vec3 n=normalize(position);
  float lit=dot(n,uLight)*.5+.5;
  float hit=0.;
  for(int i=0;i<6;i++){if(uHit[i].w>0.){float tt=uTime-uHit[i].w;float ang=acos(clamp(dot(n,normalize(uHit[i].xyz)),-1.,1.));float q=(ang-tt*1.1)*11.;hit+=exp(-q*q)*exp(-tt*1.5);}}
  vB=.28+lit*.55;vHit=hit;vSeed=aSeed;
  vec4 mv=modelViewMatrix*vec4(position,1.);
  gl_PointSize=min((.05+clamp(hit,0.,1.)*.07)*uScale/-mv.z,uScale*.011);
  gl_Position=projectionMatrix*mv;
 }`;
const dotsFrag=`
 varying float vB;varying float vHit;varying float vSeed;
 void main(){
  vec2 c=gl_PointCoord-.5;float d=length(c);if(d>.5)discard;
  float a=smoothstep(.5,.15,d);
  vec3 base=vec3(.62,.66,.74)*vB;
  vec3 hot=vec3(3.0,.7,.4);
  vec3 col=mix(base,hot,clamp(vHit,0.,.85));
  gl_FragColor=vec4(col*a,a);
 }`;
const arcVert='varying float vU;varying float vW;void main(){vU=uv.x;vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;}';
const arcFrag=`uniform float uHead,uTrail,uA;uniform vec3 uColor;varying float vU;
 void main(){float d=uHead-vU;float t=d>0.&&d<uTrail?pow(1.-d/uTrail,1.4)*1.4:0.;float head=smoothstep(.025,0.,abs(d))*2.2;float base=uHead>0.?.22:0.;float a=(t+head+base)*uA;gl_FragColor=vec4(uColor*a,a);}`;
const atmoV='varying vec3 vN;varying vec3 vV;void main(){vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}';
const atmoF='uniform vec3 uColor;varying vec3 vN;varying vec3 vV;void main(){float f=pow(clamp(.62-dot(vN,vV),0.,1.),4.);gl_FragColor=vec4(uColor*f*.55,f*.5);}';

export function createHero(parent,{quality=1}={}){
 const ctx=createStage(parent,{bg:0x07080a,fog:0,quality,bloom:[0.85,0.7,0.82],shadows:false,fov:30});
 const {scene,camera}=ctx;
 const api={ctx,handlers:{},pointer:{x:0,y:0},diving:false,arcCount:0,labels:[]};
 const sparks=new Sparks(ctx,1400);

 scene.add(new THREE.AmbientLight(0x889,0.4));
 const sun=new THREE.DirectionalLight(0xffe2cf,2.2);sun.position.set(-8,5,10);scene.add(sun);

 const globe=new THREE.Group();scene.add(globe);
 // корпус
 const body=new THREE.Mesh(new THREE.SphereGeometry(R-.02,96,64),new THREE.MeshStandardMaterial({color:0x0b0d11,roughness:.55,metalness:.35}));globe.add(body);
 // атмосфера (не вращается)
 const atmo=new THREE.Mesh(new THREE.SphereGeometry(R*1.05,64,48),new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.BackSide,uniforms:{uColor:{value:new THREE.Color(1.0,.2,.1)}},vertexShader:atmoV,fragmentShader:atmoF}));scene.add(atmo);
 const atmo2=new THREE.Mesh(new THREE.SphereGeometry(R*1.012,64,48),new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uColor:{value:new THREE.Color(.5,.62,.9)}},vertexShader:atmoV,fragmentShader:atmoF.replace('.62-dot','.8-dot').replace('f*.55','f*.45')}));scene.add(atmo2);
 // точки суши
 const data=landMask(),W=2048,H=1024,N=90000,pts=[],seed=[];
 const ga=Math.PI*(3-Math.sqrt(5));
 for(let i=0;i<N;i++){
  const y=1-2*(i+.5)/N,rr=Math.sqrt(1-y*y),th=ga*i;
  const lat=Math.asin(y)*180/Math.PI;let lon=((th*180/Math.PI)%360);lon=lon>180?lon-360:lon;
  const px=Math.floor((lon+180)/360*W),py=Math.floor((90-lat)/180*H);
  if(data[(py*W+px)*4]>128){const v=latLon(lat,lon,R+.012);pts.push(v.x,v.y,v.z);seed.push(Math.random())}
 }
 const dg=new THREE.BufferGeometry();dg.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));dg.setAttribute('aSeed',new THREE.Float32BufferAttribute(seed,1));
 const hitU=[...Array(6)].map(()=>new THREE.Vector4(0,1,0,-1));
 const dotMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uTime:{value:0},uScale:{value:ctx.h*.5},uLight:{value:new THREE.Vector3(-.5,.35,.8).normalize()},uHit:{value:hitU}},vertexShader:dotsVert,fragmentShader:dotsFrag});
 const dots=new THREE.Points(dg,dotMat);dots.frustumCulled=false;globe.add(dots);
 // градусная сетка
 const grat=new THREE.Group();
 const gm=new THREE.LineBasicMaterial({color:0x3a4456,transparent:true,opacity:.28});
 for(let lat=-60;lat<=60;lat+=30){const p=[];for(let k=0;k<=128;k++)p.push(latLon(lat,-180+k*360/128,R+.005));grat.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(p),gm))}
 for(let lon=-180;lon<180;lon+=30){const p=[];for(let k=0;k<=96;k++)p.push(latLon(-90+k*180/96,lon,R+.005));grat.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(p),gm))}
 globe.add(grat);

 // цель — «ваша сеть»
 const tPos=latLon(TARGET.lat,TARGET.lon,R),tN=tPos.clone().normalize();
 const tg=new THREE.Group();tg.position.copy(tPos);tg.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),tN);globe.add(tg);
 const cube=new THREE.Mesh(new THREE.BoxGeometry(.34,.34,.34),toon(0xfc3e24,{emissive:0x5a0f06}));cube.position.y=.55;tg.add(cube);outline(ctx,cube,0x2a0805,2,1,10);
 const cubeHalo=sprite(0xfc3e24,2.6,.55);cubeHalo.position.y=.55;tg.add(cubeHalo);
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
  const geo=new THREE.TubeGeometry(curve,96,ambient?.016:.032,6,false);
  const mesh=new THREE.Mesh(geo,arcMatBase(col));mesh.frustumCulled=false;globe.add(mesh);
  arcs.push({mesh,curve,t:-.05,speed,ambient,to,toTarget:to===tPos||to.equals(tPos),done:false});
 };
 const toTarget=()=>{const s=srcObjs[Math.floor(Math.random()*srcObjs.length)];spawn(s.p,tPos,{speed:.27+Math.random()*.12,col:s.s.ai?[2.6,1.5,.3]:[3.0,.45,.25]});};
 const ambient=()=>{const a=srcObjs[Math.floor(Math.random()*srcObjs.length)],b=srcObjs[Math.floor(Math.random()*srcObjs.length)];if(a!==b)spawn(a.p,b.p,{col:[.7,.28,.18],speed:.3,ambient:true})};

 // кольца на поверхности
 const ripples=[];const rgeo=new THREE.RingGeometry(.9,1,48);
 for(let i=0;i<14;i++){const m=new THREE.Mesh(rgeo,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));m.visible=false;globe.add(m);ripples.push({m,t:1,r:1})}
 let rk=0,hk=0,sk=0;
 const ripple=(pos,color,r=.9)=>{const it=ripples[rk];rk=(rk+1)%ripples.length;const n=pos.clone().normalize();it.m.position.copy(n.clone().multiplyScalar(R+.03));it.m.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),n);it.m.material.color.setRGB(...color);it.t=0;it.r=r;it.m.visible=true};

 // звёздная пыль
 const sp=[];for(let i=0;i<900;i++){const v=new THREE.Vector3().randomDirection().multiplyScalar(30+Math.random()*60);sp.push(v.x,v.y,v.z)}
 const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.Float32BufferAttribute(sp,3));
 scene.add(new THREE.Points(sg,new THREE.PointsMaterial({color:0x7a8296,size:.12,sizeAttenuation:true,transparent:true,opacity:.55})));

 // ориентация и камера
 const spin=new THREE.Quaternion(),tiltQ=new THREE.Quaternion();
 let ang=0,angVel=.045,tilt=.22,tiltVel=0,zoom=1,zoomT=1;const BASE=.045;
 {const D=new THREE.Vector3(.28,.22,.93).normalize();let best=9;
  for(let a=0;a<Math.PI*2;a+=.01){const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(.22,0,.1)).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),a));const d=tN.clone().applyQuaternion(q).distanceTo(D);if(d<best){best=d;ang=a}}} // цель сначала у края
 const cam={d:30,fov:30,ox:-400,oy:0};
 let diveT=0,diveFrom=new THREE.Quaternion(),diveTo=new THREE.Quaternion(),fade=1;
 const worldTarget=new THREE.Vector3();
 api.dive=cb=>{
  if(api.diving)return;api.diving=true;
  diveFrom.copy(globe.quaternion);
  // повернуть так, чтобы цель смотрела в камеру
  diveTo.setFromUnitVectors(tN,new THREE.Vector3(0,0,1));
  const o={t:0};
  gsap.to(o,{t:1,duration:2.3,ease:'power3.inOut',onUpdate:()=>{diveT=o.t;
   globe.quaternion.slerpQuaternions(diveFrom,diveTo,Math.min(1,ease.inOut(Math.min(1,o.t*1.25))));
   cam.d=lerp(30,9.6,ease.inOut(o.t));cam.fov=lerp(30,38,o.t);parent.style.opacity=o.t>.74?String(Math.max(0,1-(o.t-.74)/.26)):'1';cam.ox=lerp(-400,0,Math.min(1,o.t*1.2));cam.oy=lerp(0,0,o.t);
   ctx.finalPass.uniforms.uFlash.value=0;
  },onComplete:()=>{cb&&cb()}});
  gsap.to(ctx.finalPass.uniforms.uAb,{value:.012,duration:1.4,delay:.7});
 };
 api.on=(n,f)=>{api.handlers[n]=f};
 api.input={down:false,moved:false,vx:0,vy:0,holdT:0};
 api.zoomBy=f=>{if(api.diving)return;zoomT=Math.max(.55,Math.min(1.5,zoomT*f))};
 api.hitPlanet=(cx,cy)=>{const r=parent.getBoundingClientRect(),k=r.width/ctx.w;const x=(cx-r.left)/k,y=(cy-r.top)/k;const c=ctx.project(new THREE.Vector3(0,0,0)),e=ctx.project(new THREE.Vector3(R,0,0));return Math.hypot(x-c.x,y-c.y)<Math.hypot(e.x-c.x,e.y-c.y)*1.12};
 api.setPointer=(x,y)=>{api.pointer.x=x;api.pointer.y=y};

 let timer=0,amb=0,first=true,hitK=0;
 // стартовая очередь, чтобы кадр сразу был «живой»
 for(let i=0;i<4;i++)setTimeout(()=>toTarget(),i*350);for(let i=0;i<3;i++)setTimeout(ambient,150+i*500);
 const v=new THREE.Vector3();
 ctx.add((dt,t)=>{
  dotMat.uniforms.uTime.value=t;dotMat.uniforms.uScale.value=ctx.h*.5;shieldMat.uniforms.uTime.value=t;
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
  atmo.visible=atmo2.visible=fade>.01;
  // камера
  const px=api.diving?0:api.pointer.x,py=api.diving?0:api.pointer.y;
  camera.position.set(px*.8,py*-.45+(1-diveT)*.6,cam.d*(api.diving?1:zoom));
  camera.lookAt(0,0,0);camera.fov=cam.fov;
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
     const wp=end.clone();ripple(end,[3,.5,.3],.8);
     const dir=new THREE.Vector3(Math.random()-.5,.5+Math.random()*.4,Math.random()-.5).normalize();hitK=(hitK+1)%4;shieldMat.uniforms.uHit.value[hitK].set(dir.x,dir.y,dir.z,t);
     globe.localToWorld(wp);const nrm=wp.clone().normalize();
     sparks.emit(wp,16,{speed:2.2,dir:nrm.multiplyScalar(.9),spread:.7,color:[.6,1.8,1.3],size:.07,life:.9,gravity:0});
     hitU[hk=(hk+1)%6].set(end.x,end.y,end.z,t);
     if(Math.random()<.35){ctx.kick(.12)}
     api.arcCount++;api.handlers.hit&&api.handlers.hit(api.arcCount);
    }else{ripple(end,[.8,.3,.2],.35)}
   }
   if(a.t>1.5){globe.remove(a.mesh);a.mesh.geometry.dispose();a.mesh.material.dispose();arcs.splice(i,1)}
  }
  ripples.forEach(r=>{if(r.t>=1)return;r.t+=dt/1.4;const e=1-Math.pow(1-Math.min(1,r.t),3);r.m.scale.setScalar(.15+e*r.r);r.m.material.opacity=(1-r.t)*.9;if(r.t>=1)r.m.visible=false});
  // подписи
  const cand=srcObjs.filter(o=>o.s.label).map(o=>{v.copy(o.p).applyQuaternion(globe.quaternion);const facing=v.clone().normalize().z;
   v.addScaledVector(o.n.clone().applyQuaternion(globe.quaternion),.35);const s2=ctx.project(v);return{id:o.s.id,text:o.s.label,ai:!!o.s.ai,x:s2.x,y:s2.y,facing,show:facing>.18}}).sort((a,b)=>b.facing-a.facing);
  const kept=[];for(const c of cand){if(!c.show)continue;if(kept.some(k=>Math.abs(k.y-c.y)<30&&Math.abs(k.x-c.x)<260)){c.show=false;continue}kept.push(c)}
  api.labels=cand;
 });
 if(import.meta.env.DEV)window.__hero=api;
 return api;
}
