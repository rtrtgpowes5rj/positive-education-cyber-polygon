import {THREE,toon,glow,outline,sprite,hdr,ease,lerp,labelSprite,panelScene,box,tubeAlong,canvasTex,OL,BONE,STEEL} from './core';
import {mats,rack,appliance,monitor,rbox,mesh} from './kit';

const RED=[1.9,.16,.07],MINT=[.4,1.6,1.1],AMB=[2.0,1.3,.25];
const mat=(c,x={})=>glow(c[0],c[1],c[2],x);
const at=(path,u)=>path.getPointAt(Math.min(.998,Math.max(.002,u)));
const P=(x,y,z)=>new THREE.Vector3(x,y,z);

function cardTex(code,src,tone){
 return canvasTex(512,200,(g,w,h)=>{
  g.fillStyle='#14161a';g.fillRect(0,0,w,h);
  g.strokeStyle=tone;g.lineWidth=8;g.strokeRect(5,5,w-10,h-10);
  g.fillStyle=tone;g.font='700 58px monospace';g.textAlign='left';g.fillText(code,26,86);
  g.fillStyle='#ece6da';g.font='600 38px sans-serif';g.fillText(src,26,150);
 });
}

// 3D-доска расследования: хосты и связи — вверху, четыре площадки «этапов» — внизу.
// События перетаскиваются на площадки (или выбираются кликом).
export function createAttackBoard(parent,{quality=1,stages=[]}={}){
 const ctx=panelScene(parent,{quality,pos:[0,18,12.5],look:[.3,0,-2.4],fov:42,sway:0,bloom:[0.4,0.45,0.92]});
 const {scene,camera}=ctx;const sp=ctx.sparks,rg=ctx.rings;
 const api={ctx,host:null,revealed:false,cut:false,hoverPad:-1,armed:false,bad:[]};

 // --- хосты ---
 const defs={
  'WS-114':{x:-6.4,z:-2.6,c:BONE,main:true},'WS-087':{x:-6.4,z:-9.0,c:STEEL},'DC-01':{x:-1.6,z:-9.0,c:BONE,main:true},'SRV-FILE':{x:-1.6,z:-2.6,c:BONE,main:true},'SRV-UPD':{x:-1.6,z:-5.8,c:STEEL}
 };
 const nodes={},M=mats(),kl=[];
 Object.entries(defs).forEach(([id,d])=>{
  const g=new THREE.Group();g.position.set(d.x,0,d.z);scene.add(g);
  let dev;
  if(id.startsWith('WS')){dev=new THREE.Group();mesh(rbox(1.9,.1,1.2,.04),M.frame,dev,[0,.05,0]);const mo=monitor(M,{w:1.55,h:.95,color:id==='WS-114'?0x2a1a1a:0x1b2b33});mo.position.set(0,0,-.1);mo.scale.setScalar(.9);dev.add(mo);dev.userData.body=mo.userData.body}
  else dev=appliance(M,{w:1.9,h:1.05,d:1.4,leds:kl,light:true});
  dev.scale.setScalar(1.18);g.add(dev);const m=dev.userData.body;m.userData.ol=outline(ctx,m);
  const lab=labelSprite(id,{size:.8,font:'700 34px sans-serif'});lab.position.set(0,2.2,0);g.add(lab);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.4,.05,8,48),mat(AMB));ring.rotation.x=Math.PI/2;ring.position.y=.06;ring.visible=false;g.add(ring);
  nodes[id]={g,m,ring,lab};
 });
 const srv=new THREE.Group();srv.position.set(5.2,0,-3.4);scene.add(srv);
 for(let i=0;i<6;i++){const rk=rack(M,{w:1.0,h:1.6+(i%2)*.4,d:1.0,units:4,leds:kl});rk.position.set((i%3)*1.6-1.6,0,(i<3?-1.4:1.4));srv.add(rk)}
 const sl=labelSprite('6 серверов',{size:.8,font:'700 34px sans-serif'});sl.position.set(0,3.4,0);srv.add(sl);
 const ringS=new THREE.Mesh(new THREE.TorusGeometry(3.2,.05,8,48),mat(AMB));ringS.rotation.x=Math.PI/2;ringS.position.y=.06;ringS.visible=false;srv.add(ringS);
 nodes['6 хостов']={g:srv,ring:ringS};
 const ringOf=n=>nodes[n]&&nodes[n].ring;

 // --- связи атаки (проявляются после подтверждения цепочки) ---
 const edgeDefs=[
  {pts:[P(-5.4,.2,-2.9),P(-4.0,.2,-2.9),P(-4.0,.2,-9.0),P(-2.6,.2,-9.0)],at:0},
  {pts:[P(-5.4,.2,-2.3),P(-2.6,.2,-2.3)],at:.9},
  {pts:[P(-.6,.2,-2.6),P(1.2,.2,-2.6),P(1.2,.2,-4.2),P(3.2,.2,-4.2)],at:2.6},
  {pts:[P(1.2,.2,-2.6),P(1.2,.2,-1.0),P(3.2,.2,-1.0)],at:2.8}
 ];
 const edges=edgeDefs.map(e=>{const t=tubeAlong(e.pts,.06,0x7c818b);scene.add(t.mesh);return{...e,tube:t,k:0}});
 const dim=tubeAlong([P(-6.4,.2,-8.2),P(-6.4,.2,-5.8),P(-2.6,.2,-5.8)],.05,0x4a4e56);scene.add(dim.mesh);
 const flowers=[];edges.forEach(e=>{for(let i=0;i<5;i++){const m=new THREE.Mesh(new THREE.OctahedronGeometry(.17),mat(RED));m.visible=false;scene.add(m);flowers.push({e,m,o:i/5})}});
 const ls=new THREE.Mesh(new THREE.TorusGeometry(1.5,.06,8,48),mat(RED));ls.rotation.x=Math.PI/2;ls.position.set(-1.6,.5,-2.6);ls.visible=false;scene.add(ls);
 const mkDome=(g,r)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(r,40,20,0,Math.PI*2,0,Math.PI/2),new THREE.MeshBasicMaterial({color:hdr(.35,1.5,1),transparent:true,opacity:.14,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,toneMapped:false}));g.add(m);m.visible=false;return m};
 const iso=[mkDome(nodes['WS-114'].g,2.3),mkDome(nodes['SRV-FILE'].g,2.3)];

 // --- площадки этапов ---
 const padX=[-5.4,-1.8,1.8,5.4],padZ=3.6;
 const pads=padX.map((x,i)=>{
  const g=new THREE.Group();g.position.set(x,0,padZ);scene.add(g);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(1.15,1.25,.2,40),toon(0x2a2e35));base.position.y=.11;base.receiveShadow=true;g.add(base);outline(ctx,base,0x80858f,1.6,.9,30);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.95,.04,8,64),mat([.35,.4,.55]));ring.rotation.x=Math.PI/2;ring.position.y=.26;g.add(ring);
  const num=labelSprite(String(i+1),{size:1.5,font:'800 64px sans-serif',color:'#6f7480',pill:false});num.scale.set(1.5,1.5,1);num.position.set(0,.5,0);g.add(num);
  const title=labelSprite(stages[i]||'',{size:.85,font:'700 32px sans-serif',color:'#c4c0b6'});title.position.set(0,.3,1.9);g.add(title);
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.5,.62,2.6,32,1,true),new THREE.MeshBasicMaterial({color:hdr(1.2,.9,.2),transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,side:THREE.DoubleSide}));beam.position.y=2.2;g.add(beam);
  return{g,base,ring,num,title,beam,card:null,cardK:0,id:null,k:0,bad:0};
 });
 // путь «дорожка» между площадками
 const trackPts=padX.map(x=>P(x,.14,padZ));
 const track=tubeAlong(trackPts,.035,0x474c56);scene.add(track.mesh);

 // --- состояние цепочки ---
 api.setChain=chain=>{ // chain: [{id,code,src,text}|null ×4]
  chain.forEach((c,i)=>{
   const p=pads[i];const id=c?c.id:null;
   if(id===p.id)return;
   if(p.card){p.g.remove(p.card.group);p.card=null}
   p.id=id;
   if(c){
    const group=new THREE.Group();
    const plane=new THREE.Mesh(new THREE.PlaneGeometry(2.7,1.05),new THREE.MeshBasicMaterial({map:cardTex(c.code,c.src,'#f2c566'),transparent:true,toneMapped:false}));
    plane.rotation.x=-.45;group.add(plane);group.position.set(0,5,0);
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,1,6),mat([2,1.5,.4],{transparent:true,opacity:.5}));group.add(stem);
    p.g.add(group);p.card={group,plane,y:5,t:0,src:c.src};
    // связь «хост → площадка»
    sp.emit(p.g.position.clone().setY(3),24,{speed:3,color:AMB,size:.1,life:.8,gravity:-3});
    rg.fire(p.g.position.clone().setY(.15),AMB,3.4,.8,true);
   }
  });
 };
 api.setHost=h=>{api.host=h};
 api.setHover=i=>{api.hoverPad=i};
 api.setArmed=a=>{api.armed=!!a};
 api.setBad=b=>{api.bad=b||[];b&&b.forEach(i=>{pads[i].bad=1;ctx.kick(.25);ctx.flashRed(.2)})};
 api.padScreen=i=>{const p=ctx.project(pads[i].g.position.clone().setY(.4));return p};
 api.padAt=(cx,cy,rad=150)=>{const r=parent.getBoundingClientRect(),k=r.width/ctx.w;const x=(cx-r.left)/k,y=(cy-r.top)/k;let best=-1,bd=rad;pads.forEach((p,i)=>{const s=api.padScreen(i);const d=Math.hypot(s.x-x,s.y-y);if(d<bd){bd=d;best=i}});return best};
 let t0=-1;
 api.reveal=()=>{api.revealed=true;t0=0;ctx.kick(.3)};
 api.isolate=()=>{api.cut=true;iso.forEach(d=>d.visible=true);['WS-114','SRV-FILE'].forEach(id=>{const p=nodes[id].g.position.clone().setY(.2);rg.fire(p,MINT,5,1,true);sp.emit(p.clone().setY(1),50,{speed:5,color:MINT,size:.14,life:.9,gravity:-3})});ctx.kick(.4);ctx.aberrate(.6)};
 api.reset=()=>{api.revealed=false;api.cut=false;t0=-1;iso.forEach(d=>d.visible=false);ls.visible=false};

 const tmpC=new THREE.Color();
 ctx.add((dt,t)=>{
  for(const l of kl){const b=Math.sin(t*(.6+l.ph*.1)+l.ph)>-.4?1:.45;l.m.material.color.setRGB(l.c[0]*b,l.c[1]*b,l.c[2]*b)}
  // подсветка хоста выбранного события
  for(const id in nodes){const n=nodes[id];if(!n.ring)continue;const on=api.host===id;n.ring.visible=on;if(on){n.ring.rotation.z+=dt;n.ring.scale.setScalar(1+Math.sin(t*5)*.06)}}
  // площадки
  pads.forEach((p,i)=>{
   const hov=api.hoverPad===i,filled=!!p.id;
   const tgt=p.bad>0?RED:hov?AMB:filled?[.5,1.5,1.6]:api.armed?[1.1,.9,.3]:[.35,.4,.55];
   tmpC.setRGB(tgt[0],tgt[1],tgt[2]);p.ring.material.color.lerp(tmpC,1-Math.exp(-dt*12));
   p.k=lerp(p.k,hov||p.bad>0?1:api.armed&&!filled?.35:0,1-Math.exp(-dt*10));
   p.beam.material.opacity=.07*p.k;p.beam.material.color.setRGB(p.bad>0?2.4:1.2,p.bad>0?.2:.9,p.bad>0?.1:.2);
   p.ring.scale.setScalar(1+p.k*.1);
   p.num.material.opacity=filled?.12:.9;
   if(p.bad>0)p.bad=Math.max(0,p.bad-dt*1.2);
   if(p.card){const c=p.card;c.t+=dt;const k=Math.min(1,c.t/.6);c.y=lerp(5,1.7,ease.out3(k));c.group.position.y=c.y+Math.sin(t*1.4+i)*.08;c.group.position.x=p.bad>0?Math.sin(p.bad*40)*p.bad*.3:0;
    c.group.children[1].scale.y=c.group.position.y;c.group.children[1].position.y=-c.group.position.y/2}
  });
  // связи атаки
  if(t0>=0)t0+=dt;
  edges.forEach(e=>{const on=api.revealed&&t0>=e.at*.6;e.k=lerp(e.k,on?1:0,1-Math.exp(-dt*5));
   const dead=api.cut;e.tube.mesh.material.color.setRGB(lerp(.49,dead?.3:.9,e.k),lerp(.5,dead?.32:.16,e.k),lerp(.55,dead?.34:.08,e.k))});
  flowers.forEach(f=>{const live=api.revealed&&!api.cut&&f.e.k>.5;f.m.visible=live;if(live){const u=(t*.45+f.o)%1;f.m.position.copy(at(f.e.tube.path,u));f.m.position.y=.5;f.m.rotation.y+=dt*4}});
  ls.visible=api.revealed&&t0>=1.7&&!api.cut;if(ls.visible){ls.scale.setScalar(1+Math.sin(t*6)*.08);ls.rotation.z+=dt*2}
  ['WS-114','SRV-FILE'].forEach(id=>{const o=nodes[id].m.userData.ol;if(!o)return;o.material.color.setHex(api.cut?0x7fe0b5:api.revealed?0xfc3e24:OL)});
 });
 api.nodeIds=Object.keys(nodes);
 if(import.meta.env.DEV)window.__board=api;
 return api;
}
