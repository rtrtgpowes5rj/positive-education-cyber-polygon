import {createStage,THREE,PAL,toon,glow,outline,canvasTex,sprite,Sparks,Rings,ease,lerp,hdr,glowTexture} from './core';
import {LineSegments2} from 'three/examples/jsm/lines/LineSegments2.js';
import {LineSegmentsGeometry} from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import {cables,slots,tools,routes} from '../scene/topology';

const K=0.028;
// плоскость схемы 1000×640 → мир (X вправо, Z к зрителю)
export const W=(x,y,h=0)=>new THREE.Vector3((x-500)*K,h,(y-320)*K);

const INK=0xece6da,OL=0x121316,BONE=0xd9d4c9,STEEL=0xbfc3c9;
export const domeShader={
 vertex:'varying vec3 vL;varying vec3 vN;varying vec3 vV;void main(){vL=position;vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
 fragment:`
 uniform float uTime,uR,uScan;uniform vec3 uColor;uniform vec4 uHit[4];varying vec3 vL;varying vec3 vN;varying vec3 vV;
 float hexD(vec2 p){p=abs(p);return max(dot(p,normalize(vec2(1.,1.73))),p.x);}
 void main(){
  float fres=pow(1.-abs(dot(normalize(vN),vV)),2.2);
  vec2 uv=vL.xz*2.6+vec2(vL.y*.8);
  vec2 r=vec2(1.,1.73);vec2 h=r*.5;vec2 a=mod(uv,r)-h;vec2 b=mod(uv-h,r)-h;vec2 gv=dot(a,a)<dot(b,b)?a:b;
  float line=1.-smoothstep(0.,.07,.5-hexD(gv));
  float acc=0.;
  for(int i=0;i<4;i++){if(uHit[i].w>0.){float tt=uTime-uHit[i].w;vec3 dir=normalize(uHit[i].xyz);float ang=acos(clamp(dot(normalize(vL),dir),-1.,1.));float q=(ang-tt*2.6)*5.;acc+=exp(-q*q)*exp(-tt*1.7);}}
  float pulse=.85+.15*sin(uTime*1.6+vL.y*3.);float sb=uScan>=0.?exp(-pow((vL.y/uR-uScan)*8.,2.)):0.;acc+=sb*1.6;
  float a2=fres*.5+line*(.12+.1*pulse)+acc*1.1;
  vec3 col=uColor*(.9+acc*3.+line*.7);
  col=min(col,vec3(6.));gl_FragColor=vec4(col*a2,a2);
 }`
};
const beamShader={
 vertex:'varying float vY;void main(){vY=uv.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragment:'uniform vec3 uColor;uniform float uA,uTime;varying float vY;void main(){float a=pow(1.-vY,2.2)*uA*(.8+.2*sin(uTime*3.+vY*9.));gl_FragColor=vec4(uColor*a,a);}'
};

function plateTex(name,prod,accent='#7fe0b5'){
 return canvasTex(256,128,(g,w,h)=>{
  g.fillStyle='#17191c';g.fillRect(0,0,w,h);
  g.strokeStyle='#ece6da';g.lineWidth=5;g.strokeRect(6,6,w-12,h-12);
  g.fillStyle='#ece6da';g.font='800 54px sans-serif';g.textAlign='center';g.fillText(name,w/2,66);
  g.fillStyle=accent;g.font='600 22px monospace';g.fillText(prod,w/2,100);
 });
}
function mailTex(){return canvasTex(256,256,(g,w,h)=>{g.fillStyle='#1d2024';g.fillRect(0,0,w,h);g.strokeStyle='#ece6da';g.lineWidth=7;g.strokeRect(34,64,w-68,h-128);g.beginPath();g.moveTo(34,64);g.lineTo(w/2,h/2+10);g.lineTo(w-34,64);g.stroke()})}
function socDraw(g,w,h,lit,t){
 g.fillStyle=lit?'#0f2a22':'#1a1c20';g.fillRect(0,0,w,h);
 g.strokeStyle=lit?'#7fe0b5':'#3b3d43';g.lineWidth=4;g.beginPath();
 for(let i=0;i<=16;i++){const x=10+i*(w-20)/16,y=h*.55+Math.sin(i*.9+t)*h*.2+Math.sin(i*2.3+t*2)*h*.08;i?g.lineTo(x,y):g.moveTo(x,y)}g.stroke();
 g.fillStyle=lit?'#7fe0b5':'#3b3d43';for(let i=0;i<5;i++)g.fillRect(14+i*46,h-24-((i*37+Math.floor(t*3))%40),30,6);
}
export function createNetwork(parent,{quality=1}={}){
 const ctx=createStage(parent,{bg:0x0b0c0e,fog:0.012,quality,bloom:[0.5,0.55,0.92]});
 const {scene,camera}=ctx;
 const sparks=new Sparks(ctx,2600),rings=new Rings(ctx,28);
 const api={ctx,stats:{breach:0,block:0},handlers:{},mode:'attract',pointer:{x:0,y:0},placed:{},dev:{},slotObj:{}};
 const emit=(n,a)=>{api.handlers[n]&&api.handlers[n](a)};
 api.on=(n,f)=>{api.handlers[n]=f};

 // ----- свет -----
 scene.add(new THREE.HemisphereLight(0x9aa6c4,0x1a1410,0.55));
 const key=new THREE.DirectionalLight(0xfff0dc,2.4);key.position.set(-9,18,12);key.castShadow=true;
 key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-20,right:20,top:14,bottom:-14,near:1,far:60});key.shadow.bias=-0.001;key.shadow.normalBias=.03;key.shadow.radius=3;
 scene.add(key);
 const rim=new THREE.DirectionalLight(0x6f8cff,1.1);rim.position.set(12,7,-15);scene.add(rim);
 const redL=new THREE.PointLight(0xfc3e24,14,22,1.8);redL.position.copy(W(150,300,3.5));scene.add(redL);

 // ----- пол -----
 const dot=canvasTex(64,64,(g,w,h)=>{g.fillStyle='#1c1f24';g.fillRect(0,0,w,h);g.fillStyle='#3a3f48';g.beginPath();g.arc(32,32,2.2,0,7);g.fill()});
 dot.wrapS=dot.wrapT=THREE.RepeatWrapping;dot.repeat.set(46,34);dot.colorSpace=THREE.SRGBColorSpace;
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(92,68),toon(0x1b1e23,{emissive:0x0c0d10}));floor.rotation.x=-Math.PI/2;floor.position.y=-0.02;floor.receiveShadow=true;scene.add(floor);

 const zone=(x0,y0,x1,y1,color=0x4a4d55)=>{
  const a=W(x0,y0,.02),b=W(x1,y0,.02),c=W(x1,y1,.02),d=W(x0,y1,.02);
  const g=new LineSegmentsGeometry();g.setPositions([a,b,b,c,c,d,d,a].flatMap(v=>[v.x,v.y,v.z]));
  const l=new LineSegments2(g,ctx.lineMat(color,1.6,1,true));l.computeLineDistances();scene.add(l);
  const fill=new THREE.Mesh(new THREE.PlaneGeometry((x1-x0)*K,(y1-y0)*K),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.025}));
  fill.rotation.x=-Math.PI/2;fill.position.copy(W((x0+x1)/2,(y0+y1)/2,.01));scene.add(fill);
 };
 zone(392,52,760,358);zone(392,380,964,626);
 const slab=(x0,y0,x1,y1)=>{const a=W(x0,y0),b=W(x1,y1);const m=new THREE.Mesh(new THREE.BoxGeometry(b.x-a.x,.22,b.z-a.z),toon(0x2f343c));m.position.set((a.x+b.x)/2,.0,(a.z+b.z)/2);m.receiveShadow=true;m.castShadow=true;scene.add(m);outline(ctx,m,0x80858f,1.6,.9)};
 slab(392,52,760,358);slab(392,380,964,626);

 // ----- кабели -----
 const cableMat=toon(0x7c818b);
 cables.forEach((c,i)=>{
  const path=new THREE.CurvePath();
  for(let k=1;k<c.length;k++){const a=W(c[k-1][0],c[k-1][1],.09),b=W(c[k][0],c[k][1],.09);if(a.distanceTo(b)>.001)path.add(new THREE.LineCurve3(a,b))}
  const tube=new THREE.Mesh(new THREE.TubeGeometry(path,Math.max(8,c.length*10),.055,6,false),i===7?toon(0x1f5a46):cableMat);tube.receiveShadow=true;scene.add(tube);
 });

 // ----- помощники -----
 const group=(name,pos)=>{const g=new THREE.Group();g.position.copy(pos);g.userData.name=name;g.userData.mats=[];scene.add(g);api.dev[name]=g;return g};
 const addBox=(parent,w,h,d,color,pos,{edge=true,cast=true,ow=2}={})=>{
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),toon(color));m.position.copy(pos);m.castShadow=cast;m.receiveShadow=true;parent.add(m);
  if(edge){const l=outline(ctx,m,OL,ow,1);const root=parent.userData.mats;if(root)root.push(l.material)}
  return m;
 };
 const leds=[];
 const led=(parent,pos,kind=0)=>{
  const m=new THREE.Mesh(new THREE.BoxGeometry(.09,.09,.04),glow(.3,1.8,1));m.position.copy(pos);parent.add(m);
  leds.push({m,kind,ph:Math.random()*6.28,c:kind===2?[2.2,1.5,.3]:[.35,1.9,1.1]});
 };

 // мягкие контактные тени
 const blobTex=canvasTex(128,128,(g,w,h)=>{const q=g.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);q.addColorStop(0,'rgba(0,0,0,.65)');q.addColorStop(.6,'rgba(0,0,0,.25)');q.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=q;g.fillRect(0,0,w,h)});
 const blob=(x,y,w,d,o=.9)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshBasicMaterial({map:blobTex,transparent:true,depthWrite:false,opacity:o}));m.rotation.x=-Math.PI/2;const p=W(x,y);m.position.set(p.x,.125,p.z);scene.add(m)};
 blob(590,150,6,5);blob(584,268,4.4,3.6);blob(546,489,7,3.6);blob(790,512,7.5,6);blob(860,420,8.5,3.5);blob(322,322,3.6,4.2,.8);blob(150,330,5.5,4.6,.5);
 // подсветка пола под схемой
 const floorGlow=new THREE.Mesh(new THREE.PlaneGeometry(46,32),new THREE.MeshBasicMaterial({map:glowTexture(),color:hdr(.22,.27,.4),transparent:true,opacity:.55,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));floorGlow.rotation.x=-Math.PI/2;floorGlow.position.set(2,.03,2);scene.add(floorGlow);
 // ===== облако интернета и пул угроз =====
 const inet=group('inet',W(150,330));
 [[0,.55,0,1.5],[1.4,.4,.5,1.0],[-1.4,.35,.3,1.05],[.5,.3,-1.2,.9],[-.6,.3,1.2,.85]].forEach(([x,y,z,r],i)=>{
  const m=new THREE.Mesh(new THREE.SphereGeometry(r,24,18),toon(0xb9c0c9));m.position.set(x,y+.2,z);m.castShadow=true;inet.add(m);
  const l=outline(ctx,m,OL,1.6,.8,60);inet.userData.mats.push(l.material);
 });
 const hive=new THREE.Group();hive.position.copy(W(150,260,6.2));scene.add(hive);
 const core=new THREE.Mesh(new THREE.IcosahedronGeometry(1.25,0),toon(0x1a0e0e));core.castShadow=true;hive.add(core);
 outline(ctx,core,PAL.red,2.6,1,10);
 const core2=new THREE.Mesh(new THREE.IcosahedronGeometry(.62,0),glow(3.2,.35,.2));hive.add(core2);
 const halo=sprite(0xfc3e24,6,.3);hive.add(halo);
 const orbit=[];
 for(let i=0;i<22;i++){
  const m=new THREE.Mesh(new THREE.OctahedronGeometry(.11+Math.random()*.08),glow(3,.4,.25));hive.add(m);
  orbit.push({m,r:1.9+Math.random()*2.1,a:Math.random()*6.28,s:.4+Math.random()*.9,y:(Math.random()-.5)*1.8,t:Math.random()*2-1});
 }
 for(let k=0;k<2;k++){const r=new THREE.Mesh(new THREE.TorusGeometry(2.4+k*.9,.025,6,96),glow(1.6,.2,.12));r.rotation.x=1.2+k*.6;r.rotation.y=k*.8;hive.add(r);orbit.push({ring:r,sp:.35+k*.2})}
 const sweep=new THREE.Mesh(new THREE.RingGeometry(.8,9.5,72,1,0,.75),new THREE.MeshBasicMaterial({color:hdr(1.6,.18,.1),transparent:true,opacity:.07,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
 sweep.rotation.x=-Math.PI/2;sweep.position.copy(W(150,330,.04));scene.add(sweep);

 // ===== шлюз: кирпичная стена =====
 const gw=group('gw',W(322,322));
 {
  const bricks=new THREE.InstancedMesh(new THREE.BoxGeometry(.5,.26,.95),toon(0xffffff),5*9*2);
  let n=0;const m4=new THREE.Matrix4(),col=new THREE.Color();
  for(let r=0;r<9;r++)for(let c=0;c<5;c++){
   const off=r%2?.25:0;m4.makeTranslation(0,.13+r*.27,-1.15+c*.5+off-(r%2?.0:0)+.0);
   bricks.setMatrixAt(n,m4);col.setHSL(.03+Math.random()*.02,.38,.2+Math.random()*.08);bricks.setColorAt(n,col);n++;
  }
  bricks.count=n;bricks.castShadow=true;bricks.receiveShadow=true;gw.add(bricks);
  const body=new THREE.Mesh(new THREE.BoxGeometry(.56,2.42,2.6),toon(0x000000,{visible:false}));body.position.y=1.21;gw.add(body);
  const l=outline(ctx,body,OL,2.2,1);gw.userData.mats.push(l.material);
  const f=sprite(0xff5a2a,3.4,.9);f.position.set(0,3.1,0);gw.add(f);api.flame=f;
  gw.userData.flame=f;
 }

 // ===== DMZ: стойки и почта =====
 const web=group('web',W(576,150));
 function rack(parent,x,z,w,h,d,n){
  addBox(parent,w,h,d,BONE,new THREE.Vector3(x,h/2,z));
  for(let i=0;i<n;i++){
   const y=.35+i*((h-.7)/n);
   addBox(parent,w*.8,.16,.05,0x1a1c20,new THREE.Vector3(x,y+.15,z+d/2+.02),{edge:false,cast:false});
   led(parent,new THREE.Vector3(x+w*.3,y+.15,z+d/2+.07),i%3===2?2:0);
  }
 }
 rack(web,0,0,1.6,3.5,1.3,7);rack(web,2.2,.3,1.4,2.8,1.2,5);
 const mail=group('mail',W(584,268));
 {const b=addBox(mail,2.5,1.6,1.7,BONE,new THREE.Vector3(0,.8,0));
  const p=new THREE.Mesh(new THREE.PlaneGeometry(1.3,1.3),new THREE.MeshBasicMaterial({map:mailTex()}));p.position.set(0,.85,.86);mail.add(p);
  led(mail,new THREE.Vector3(-1,.25,.88),0);}
 const core3=group('core',W(546,489));
 {addBox(core3,4.4,.85,1.5,STEEL,new THREE.Vector3(0,.43,0));
  for(let i=0;i<12;i++){addBox(core3,.2,.2,.05,0x0d0e10,new THREE.Vector3(-1.9+i*.345,.5,.77),{edge:false,cast:false});led(core3,new THREE.Vector3(-1.9+i*.345,.22,.78),i%4===3?2:0)}}

 // ===== рабочие станции и SOC =====
 const ws=group('ws',W(790,512));
 [[-1.4,-1.1],[.9,-1.4],[-.9,1.0],[1.5,.8]].forEach(([x,z],i)=>{
  addBox(ws,1.7,1.1,.12,BONE,new THREE.Vector3(x,1.05,z),{ow:1.4}).rotation.x=-.12;
  const s=new THREE.Mesh(new THREE.PlaneGeometry(1.5,.9),new THREE.MeshBasicMaterial({color:0x1d2226}));s.position.set(x,1.07,z+.075);s.rotation.x=-.12;ws.add(s);
  addBox(ws,.2,.5,.2,STEEL,new THREE.Vector3(x,.28,z-.05),{edge:false});addBox(ws,.9,.07,.55,STEEL,new THREE.Vector3(x,.04,z),{edge:false});
 });
 const soc=group('soc',W(860,414));
 const socScreens=[];
 {addBox(soc,6,.2,1.6,STEEL,new THREE.Vector3(0,.5,.4),{ow:1.2});
  [-2,0,2].forEach((x,i)=>{
   addBox(soc,1.8,1.2,.12,BONE,new THREE.Vector3(x,1.45+(i===1?.15:0),0));
   const tex=canvasTex(256,160,(g,w,h)=>socDraw(g,w,h,false,0));const m=new THREE.MeshBasicMaterial({map:tex,toneMapped:false});
   const s=new THREE.Mesh(new THREE.PlaneGeometry(1.62,1.02),m);s.position.set(x,1.45+(i===1?.15:0),.075);soc.add(s);socScreens.push(s);
  });}
 let socLit=false,socT=0,socAcc=0;

 // ===== слоты =====
 const slotObj=api.slotObj;
 const plateGeo=new THREE.BoxGeometry(1.5,.8,1.1);
 slots.forEach(s=>{
  const pos=W(s.at[0],s.at[1]);
  const g=new THREE.Group();g.position.copy(pos);scene.add(g);
  // открытый маркер
  const open=new THREE.Group();g.add(open);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.9,.03,6,96),glow(1.7,.07,.03));ring.rotation.x=Math.PI/2;ring.position.y=.16;open.add(ring);
  const disc=new THREE.Mesh(new THREE.CircleGeometry(.95,48),new THREE.MeshBasicMaterial({color:hdr(1.2,.08,.04),transparent:true,opacity:.08,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));disc.rotation.x=-Math.PI/2;disc.position.y=.15;open.add(disc);
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.1,4,1,true),new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,uniforms:{uColor:{value:new THREE.Color(1.8,.12,.05)},uA:{value:.07},uTime:{value:0}},vertexShader:beamShader.vertex,fragmentShader:beamShader.fragment}));beam.position.y=2.5;beam.scale.y=-1;open.add(beam);
  const chev=[];const bm=glow(2.7,.12,.05);
  [[1,1],[-1,1],[1,-1],[-1,-1]].forEach(([sx,sz])=>{const b=new THREE.Group();b.userData={sx,sz,mat:bm};
   const a=new THREE.Mesh(new THREE.BoxGeometry(.8,.08,.14),bm);a.position.set(-sx*.4,0,0);const c=new THREE.Mesh(new THREE.BoxGeometry(.14,.08,.8),bm);c.position.set(0,0,-sz*.4);b.add(a,c);b.position.set(sx*1.05,.17,sz*1.05);open.add(b);chev.push(b)});
  // установленное средство
  const placed=new THREE.Group();placed.visible=false;g.add(placed);
  const ap=new THREE.Mesh(plateGeo,toon(0xe4dfd3));ap.castShadow=true;ap.position.y=.4;placed.add(ap);outline(ctx,ap,OL,2,1);
  const face=new THREE.Mesh(new THREE.PlaneGeometry(1.3,.65),new THREE.MeshBasicMaterial({map:plateTex(tools[s.id].name,tools[s.id].product)}));face.position.set(0,.42,.56);placed.add(face);
  const strip=new THREE.Mesh(new THREE.BoxGeometry(1.2,.05,.05),glow(.5,2.2,1.4));strip.position.set(0,.83,.3);placed.add(strip);
  const dome=new THREE.Mesh(new THREE.SphereGeometry(1,56,28,0,Math.PI*2,0,Math.PI/2),new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,
   uniforms:{uTime:{value:0},uR:{value:1},uScan:{value:-1},uColor:{value:new THREE.Color(.35,1.5,1.0)},uHit:{value:[0,1,2,3].map(()=>new THREE.Vector4(0,1,0,-1))}},vertexShader:domeShader.vertex,fragmentShader:domeShader.fragment}));
  dome.visible=false;g.add(dome);
  const pillar=new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,9,32,1,true),new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,uniforms:{uColor:{value:new THREE.Color(.4,1.9,1.3)},uA:{value:0},uTime:{value:0}},vertexShader:beamShader.vertex,fragmentShader:beamShader.fragment}));pillar.scale.y=-1;pillar.position.y=4.5;pillar.visible=false;g.add(pillar);
  const glowDisc=new THREE.Mesh(new THREE.CircleGeometry(2.4,48),new THREE.MeshBasicMaterial({color:hdr(.3,1.3,.9),transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,map:glowTexture()}));glowDisc.rotation.x=-Math.PI/2;glowDisc.position.y=.12;glowDisc.visible=false;g.add(glowDisc);
  slotObj[s.id]={g,pillar,glowDisc,open,ring,disc,beam,chev,placed,dome,state:'open',hover:false,armed:false,wrong:0,t:-1,landed:false,hitK:0,r:s.id==='ngfw'?2.4:s.id==='siem'?2.1:2.3,s,pos};
  g.visible=false;
 });
 api.slotsVisible=false;

 // ===== пакеты =====
 const pools={
  threat:new THREE.InstancedMesh(new THREE.OctahedronGeometry(.2),glow(4,.55,.3),48),
  legit:new THREE.InstancedMesh(new THREE.SphereGeometry(.11,10,8),glow(1.4,1.35,1.2),48),
  log:new THREE.InstancedMesh(new THREE.BoxGeometry(.15,.15,.15),glow(.45,1.7,1.1),40)
 };
 const trailMats={threat:glow(2.2,.25,.12,{transparent:true,opacity:.7}),legit:glow(.6,.58,.5,{transparent:true,opacity:.45}),log:glow(.2,.8,.5,{transparent:true,opacity:.5})};
 const trails={};
 for(const k in pools){pools[k].frustumCulled=false;pools[k].count=0;scene.add(pools[k]);trails[k]=new THREE.InstancedMesh(new THREE.BoxGeometry(.05,.05,1),trailMats[k],48);trails[k].frustumCulled=false;trails[k].count=0;scene.add(trails[k])}
 let lastFx=-9;const live=[],last={};let tStart=performance.now();
 const speed={threat:150,legit:185,log:230};
 const mm=new THREE.Matrix4(),q=new THREE.Quaternion(),sc=new THREE.Vector3(),up=new THREE.Vector3(0,1,0),tmp=new THREE.Object3D();

 function flashDev(name){
  const g=api.dev[name];if(!g)return;
  g.userData.flash=1;
 }
 function packetEnd(k,blocked){
  const [x,y]=k.r.p.at(Math.min(k.d,k.r.p.total));const pos=W(x,y,.35);
  if(blocked){
   const so=slotObj[k.r.guard];api.stats.block++;
   sparks.emit(pos,26,{speed:3.4,color:[.5,1.8,1.2],size:.13,life:.7,gravity:-3});
   rings.fire(pos,[.4,1.6,1.1],1.9,.55,false);
   if(so){const dir=pos.clone().sub(so.g.position).normalize();so.hitK=(so.hitK+1)%4;const u=so.dome.material.uniforms.uHit.value[so.hitK];u.set(dir.x,dir.y,dir.z,ctx.t)}
   emit('block',{id:k.r.guard});
  }else if(k.r.kind==='threat'){
   api.stats.breach++;
   const g=api.dev[k.r.hit];flashDev(k.r.hit);
   sparks.emit(pos.clone().setY(.6),40,{speed:5,color:[3,.5,.3],size:.16,life:.9,gravity:-4});
   rings.fire(pos.clone().setY(.05),[2.4,.3,.15],4.2,.9,true);
   if(ctx.t-lastFx>2.2){lastFx=ctx.t;ctx.kick(.14);ctx.flashRed(.06)}emit('breach',{id:k.r.hit});
  }
 }

 // ===== камера =====
 const cam={pos:new THREE.Vector3(-8,64,18),tgt:new THREE.Vector3(1.5,0,.5),fov:30,ox:-262,oy:10};
 const presets={
  attract:{pos:new THREE.Vector3(-22,10.5,27.5),tgt:new THREE.Vector3(2.8,.8,.2),fov:30,ox:-440,oy:-30},
  play:{pos:new THREE.Vector3(-4,24,31),tgt:new THREE.Vector3(.8,0,.6),fov:30,ox:-262,oy:10}
 };
 let target=presets.play;
 api.setMode=m=>{api.mode=m;target=presets[m]};
 api.setPointer=(x,y)=>{api.pointer.x=x;api.pointer.y=y};
 camera.position.copy(cam.pos);
 const look=new THREE.Vector3();

 // ===== API слотов =====
 api.setSlotsVisible=v=>{api.slotsVisible=v;for(const id in slotObj)slotObj[id].g.visible=v||slotObj[id].state==='placed'};
 api.setArmed=id=>{for(const k in slotObj)slotObj[k].armed=!!id&&slotObj[k].state!=='placed'};
 api.setHover=id=>{for(const k in slotObj)slotObj[k].hover=k===id&&slotObj[k].state!=='placed'};
 api.setWrong=id=>{if(id&&slotObj[id]){slotObj[id].wrong=1;ctx.kick(.12);ctx.flashRed(.07)}};
 api.setPlaced=map=>{
  for(const id in slotObj){
   const so=slotObj[id];
   if(map[id]&&so.state!=='placed'){
    so.state='placed';so.t=0;so.landed=false;so.g.visible=true;so.placed.visible=true;so.open.visible=false;so.dome.visible=true;
    so.placed.position.y=7;so.dome.scale.setScalar(.01);
    if(id==='siem')socLit=true;
   }
   if(!map[id]&&so.state==='placed'){so.state='open';so.placed.visible=false;so.dome.visible=false;so.open.visible=true;so.g.visible=api.slotsVisible;socLit=false}
  }
  api.placed={...map};
 };
 api.slotScreen=(id,h=.6)=>{const so=slotObj[id];if(!so)return null;return ctx.project(so.g.position.clone().setY(h))};
 api.pointScreen=(x,y,h=0)=>ctx.project(W(x,y,h));
 api.threatCount=()=>live.filter(k=>k.r.kind==='threat').length;

 // ===== цикл =====
 let dust=0,streamAcc=0,ringT=0,punch=0;
 ctx.add((dt,t)=>{
  // камера
  const e=1-Math.exp(-dt*1.6);
  cam.pos.lerp(target.pos,e);cam.tgt.lerp(target.tgt,e);cam.fov=lerp(cam.fov,target.fov,e);cam.ox=lerp(cam.ox,target.ox,e);cam.oy=lerp(cam.oy,target.oy,e);
  const sway=api.mode==='attract'?.35:0;
  camera.position.set(cam.pos.x+Math.sin(t*.12)*1.3*sway+api.pointer.x*.9*sway,cam.pos.y+Math.sin(t*.17)*.35+api.pointer.y*-.4*sway,cam.pos.z+Math.cos(t*.1)*.8*sway);
  const sh=ctx.fx.shake;if(sh>.001){camera.position.x+=(Math.random()-.5)*sh*.5;camera.position.y+=(Math.random()-.5)*sh*.35}
  look.copy(cam.tgt);camera.lookAt(look);
  punch*=Math.pow(.02,dt);camera.fov=cam.fov-punch*2.6;
  camera.setViewOffset(ctx.w,ctx.h,cam.ox*ctx.w/1920,cam.oy*ctx.h/1080,ctx.w,ctx.h);camera.updateProjectionMatrix();

  // пул угроз
  hive.rotation.y=t*.2;
  hive.position.y=6.2;
  orbit.forEach(o=>{if(o.ring){o.ring.rotation.z+=o.sp*dt;return}o.a+=o.s*dt;o.m.position.set(Math.cos(o.a)*o.r,o.y+Math.sin(o.a*1.7)*.4,Math.sin(o.a)*o.r);o.m.rotation.x+=dt*2;o.m.rotation.y+=dt*1.4});
  sweep.visible=false;
  // поток ботов из улья к шлюзу
  // атмосфера
  // пламя
  gw.userData.flame.scale.setScalar(2.9);
  // светодиоды
  for(const l of leds){const b=Math.sin(t*(.6+l.ph*.1)+l.ph)>-.4?1:.45;l.m.material.color.setRGB(l.c[0]*b,l.c[1]*b,l.c[2]*b)}
  // вспышки устройств
  for(const n in api.dev){const g=api.dev[n];if(g.userData.flash>0){g.userData.flash=Math.max(0,g.userData.flash-dt*1.6);const f=g.userData.flash;g.scale.setScalar(1+f*.05);
   g.userData.mats.forEach(m=>m.color.setHex(OL).lerp(new THREE.Color(PAL.red),Math.min(1,f*1.6)))}}
  // экраны SOC
  socAcc+=dt;if(socAcc>.4){socAcc=0;socT+=.9;socScreens.forEach((s,i)=>{const c=s.material.map.image;socDraw(c.getContext('2d'),c.width,c.height,socLit,socT+i*1.7);s.material.map.needsUpdate=true})}

  // слоты
  for(const id in slotObj){
   const so=slotObj[id];if(!so.g.visible)continue;
   if(so.state==='open'){
    const hov=so.hover,arm=so.armed;
    const cr=hov?[2.8,2.4,.5]:arm?[2.8,1.8,.35]:[2.7,.12,.05];
    so.ring.material.color.setRGB(...cr);so.disc.material.color.setRGB(cr[0]*.5,cr[1]*.5,cr[2]*.5);so.beam.material.uniforms.uColor.value.setRGB(cr[0]*.8,cr[1]*.8,cr[2]*.8);
    so.beam.visible=false;
    so.chev[0].userData.mat.color.setRGB(...cr);so.chev.forEach(b=>{const d=(hov?.78:arm?.92:1.05)+Math.sin(t*2+so.s.at[0])*.025;b.position.x=lerp(b.position.x,b.userData.sx*d,1-Math.exp(-dt*12));b.position.z=lerp(b.position.z,b.userData.sz*d,1-Math.exp(-dt*12))});
    const pulse=1+(hov?.1:0);so.ring.scale.setScalar(pulse*.92);so.disc.scale.setScalar(pulse);
    if(so.wrong>0){so.wrong=Math.max(0,so.wrong-dt*2.2);so.open.position.x=Math.sin(so.wrong*40)*so.wrong*.35;so.ring.material.color.setRGB(4,.2,.1)}else so.open.position.x=0;
   }else{
    if(so.t>=0){so.t+=dt;const k=Math.min(1,so.t/.75);
     so.placed.position.y=lerp(7,0,ease.out3(k));
     so.pillar.visible=true;const pk2=so.t<.75?Math.min(1,so.t/.2):Math.max(0,1-(so.t-.75)/.7);so.pillar.material.uniforms.uA.value=1.1*pk2;so.pillar.scale.x=so.pillar.scale.z=so.t<.75?1:1+(so.t-.75)*1.4;so.glowDisc.visible=true;so.glowDisc.material.opacity=so.t<.75?.2*k:Math.max(0,.55-(so.t-.75)*.6);
     if(so.t>.75)so.dome.material.uniforms.uScan.value=Math.min(1.25,(so.t-.75)/.9*1.25);
     if(!so.landed&&so.t>=.75){
      so.landed=true;const p=so.g.position.clone();
      sparks.emit(p.clone().setY(.3),60,{speed:5,color:[.6,2,1.3],size:.15,life:.9,gravity:-3,up:.4});
      rings.fire(p.clone().setY(.05),[.4,1.8,1.2],6.2,1.1,true);rings.fire(p.clone().setY(.05),[.3,1.2,.9],3.6,.8,true);
      ctx.kick(.45);ctx.aberrate(.7);punch=1;sparks.emit(p.clone().setY(.15),40,{speed:2.4,dir:new THREE.Vector3(0,.4,0),spread:1.6,color:[.9,.9,.8],size:.1,life:.7,gravity:-1.2})}
     if(so.landed){const kk=Math.min(1,(so.t-.75)/.9),r=Math.max(.01,so.r*ease.out3(kk));so.dome.scale.setScalar(r);so.dome.material.uniforms.uR.value=r;if(kk>=1){so.t=-1;so.pillar.visible=false;so.dome.material.uniforms.uScan.value=-1;so.glowDisc.material.opacity=.0;so.glowDisc.visible=false}}
    }
    so.dome.material.uniforms.uTime.value=t;
   }
  }

  // трафик
  const now=performance.now();
  for(const r of routes){
   if(r.needs&&!api.placed[r.needs])continue;
   const due=last[r.id]??(tStart+r.delay-r.every);
   if(now-due>=r.every){last[r.id]=now;live.push({r,d:0})}
  }
  const cnt={threat:0,legit:0,log:0};
  for(let i=live.length-1;i>=0;i--){
   const k=live[i];k.d+=speed[k.r.kind]*dt;
   const blocked=k.r.block!=null&&api.placed[k.r.guard]&&k.d>=k.r.block;
   if(blocked||k.d>=k.r.p.total){packetEnd(k,blocked);live.splice(i,1);continue}
   const [x,y]=k.r.p.at(k.d),[tx,ty]=k.r.p.at(Math.max(0,k.d-(k.r.kind==='threat'?34:20)));
   const a=W(x,y,.35),b=W(tx,ty,.35);
   const kind=k.r.kind,idx=cnt[kind]++;if(idx>=47)continue;
   tmp.position.copy(a);tmp.rotation.set(t*3,t*2,0);tmp.scale.setScalar(kind==='threat'?1+Math.sin(t*10+i)*.12:1);tmp.updateMatrix();pools[kind].setMatrixAt(idx,tmp.matrix);
   const len=a.distanceTo(b)||.01;tmp.position.copy(a).add(b).multiplyScalar(.5);tmp.lookAt(b.x,b.y,b.z);tmp.scale.set(1,1,len);tmp.updateMatrix();trails[kind].setMatrixAt(idx,tmp.matrix);
  }
  for(const kk in pools){pools[kk].count=Math.min(47,cnt[kk]);trails[kk].count=Math.min(47,cnt[kk]);pools[kk].instanceMatrix.needsUpdate=true;trails[kk].instanceMatrix.needsUpdate=true}
 });

 if(import.meta.env.DEV)window.__net=api;
 api.dispose=()=>ctx.dispose();
 return api;
}
