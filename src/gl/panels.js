import {THREE,PAL,toon,glow,outline,sprite,hdr,ease,lerp,labelSprite,panelScene,box,tubeAlong,OL,BONE,STEEL,canvasTex} from './core';

const at=(path,u)=>path.getPointAt(Math.min(.998,Math.max(.002,u)));
const RED=[2.2,.18,.08],MINT=[.4,1.8,1.2],AMB=[2.4,1.6,.3],WHITE=[1.3,1.25,1.15],COOL=[.5,1.05,1.9];
const mat=(c,extra={})=>glow(c[0],c[1],c[2],extra);
function dome(ctx,parent,r,color=[.35,1.5,1.0]){
 const m=new THREE.Mesh(new THREE.SphereGeometry(r,40,20,0,Math.PI*2,0,Math.PI/2),new THREE.MeshBasicMaterial({color:hdr(...color),transparent:true,opacity:.16,wireframe:false,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,toneMapped:false}));
 const w=new THREE.Mesh(new THREE.SphereGeometry(r*1.001,18,9,0,Math.PI*2,0,Math.PI/2),new THREE.MeshBasicMaterial({color:hdr(...color),wireframe:true,transparent:true,opacity:.5,toneMapped:false}));
 m.add(w);parent.add(m);return m;
}

// =====================================================================
// Уровень 2: инфраструктура — стойка web-01, коммутатор, клиент и SIEM
// =====================================================================
export function createServerRoom(parent,{quality=1}={}){
 const ctx=panelScene(parent,{quality,pos:[0,17,19],look:[0,.4,-1.6],fov:44});
 const {scene}=ctx;const sp=ctx.sparks,rg=ctx.rings;
 const api={ctx,fixed:{},busy:false,report:null};
 const mk=(name,x,z)=>{const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);g.userData.name=name;return g};
 // клиент
 const client=mk('client',0,7.4);
 box(ctx,client,2.2,.12,1.5,STEEL,[0,.06,0]);const scr=box(ctx,client,2.0,1.3,.1,BONE,[0,.85,-.55]);scr.rotation.x=-.2;
 const cs=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.1),new THREE.MeshBasicMaterial({color:0x1f3a31}));cs.position.set(0,.88,-.49);cs.rotation.x=-.2;client.add(cs);
 const cl=labelSprite('клиент',{size:.9,color:'#a4a198',font:'600 34px sans-serif'});cl.position.set(0,2.2,-.4);client.add(cl);
 // web-01
 const web=mk('web',0,1.8);
 box(ctx,web,2.4,4.3,1.8,BONE,[0,2.15,0]);
 const leds=[];
 for(let i=0;i<8;i++){box(ctx,web,1.9,.2,.06,0x1a1c20,[0,.5+i*.46,.93],{edge:false,cast:false});const l=new THREE.Mesh(new THREE.BoxGeometry(.12,.12,.05),mat(MINT));l.position.set(.8,.5+i*.46,.97);web.add(l);leds.push({l,ph:Math.random()*6})}
 const wl=labelSprite('web-01',{size:1});wl.position.set(0,5.2,0);web.add(wl);
 // коммутатор
 const sw=mk('sw',-1.6,-4.6);
 box(ctx,sw,4.2,.9,1.6,STEEL,[0,.45,0]);
 for(let i=0;i<10;i++){const l=new THREE.Mesh(new THREE.BoxGeometry(.14,.14,.05),mat(MINT));l.position.set(-1.7+i*.38,.45,.82);sw.add(l);leds.push({l,ph:Math.random()*6})}
 const sl=labelSprite('core-sw01',{size:1});sl.position.set(0,1.9,0);sw.add(sl);
 // SIEM
 const siem=mk('siem',2.0,-8.6);
 box(ctx,siem,2.0,2.6,1.4,BONE,[0,1.3,0]);
 const ss=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.1),new THREE.MeshBasicMaterial({color:0x143028}));ss.position.set(0,1.5,.71);siem.add(ss);
 const sil=labelSprite('SIEM',{size:1});sil.position.set(0,3.4,0);siem.add(sil);
 // связи
 const P=(x,y,z)=>new THREE.Vector3(x,y,z);
 const linkA=tubeAlong([P(0,.12,6.5),P(0,.12,2.9)],.07,0x7c818b);scene.add(linkA.mesh);
 const linkB=tubeAlong([P(-1.6,.12,-5.5),P(-1.6,.12,-8.6),P(.9,.12,-8.6)],.07,0x7c818b);scene.add(linkB.mesh);
 const linkC=tubeAlong([P(0,.12,.8),P(0,.12,-2.2),P(-1.6,.12,-3.7)],.07,0x7c818b);scene.add(linkC.mesh);
 // пакеты
 const flows=[{path:linkA.path,dir:-1,ok:()=>!api.fixed.listen,t:0,n:3},{path:linkB.path,dir:1,ok:()=>!api.fixed.log,t:0,n:3}];
 flows.forEach(f=>{f.m=[];for(let i=0;i<f.n;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.14,10,8),mat(WHITE));scene.add(m);f.m.push(m)}});
 // метки опасных настроек
 const risks={root:'web',pass:'web',tls:'web',snmp:'sw',telnet:'sw'};
 const hz=[];
 Object.entries(risks).forEach(([id,dev],i)=>{
  const g=scene.getObjectByProperty('name',dev)||null;
  const parentG=dev==='web'?web:sw;
  const m=new THREE.Mesh(new THREE.OctahedronGeometry(.28),mat(RED));
  const idx=hz.filter(h=>h.dev===dev).length;
  m.position.set(dev==='web'?-2.0:-1.2+idx*2.4,dev==='web'?1.2+idx*1.2:2.5,dev==='web'?1.0:0);
  parentG.add(m);hz.push({id,dev,m,k:0});
 });
 // домы
 const domes={web:dome(ctx,web,3.4),sw:dome(ctx,sw,3.2)};Object.values(domes).forEach(d=>{d.visible=false});
 // сканер
 const beam=new THREE.Mesh(new THREE.BoxGeometry(9,.05,.18),mat([1.6,1.6,1.8]));beam.visible=false;beam.position.y=.25;scene.add(beam);
 const beam2=new THREE.Mesh(new THREE.PlaneGeometry(9,3),new THREE.MeshBasicMaterial({color:hdr(.4,1,.8),transparent:true,opacity:.1,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));beam2.rotation.x=0;beam2.visible=false;beam2.position.y=1.5;scene.add(beam2);
 let scanT=-1,onDone=null;
 api.scan=cb=>{scanT=0;onDone=cb;beam.visible=beam2.visible=true;api.busy=true};
 api.set=s=>{api.fixed=s.fixed||{}};
 api.setReport=r=>{api.report=r;
  const web_ok=['root','pass','tls'].every(id=>r[id]==='ok')&&!api.fixed.listen,sw_ok=['snmp','telnet'].every(id=>r[id]==='ok');
  const fire=(g,ok)=>{const p=g.position.clone().setY(.1);rg.fire(p,ok?MINT:RED,ok?7:5,1.1,true);sp.emit(p.clone().setY(1.5),ok?50:40,{speed:5,color:ok?MINT:RED,size:.14,life:.9,gravity:-3});if(!ok){ctx.kick(.5);ctx.aberrate(.8);ctx.flashRed(.25)}};
  fire(web,web_ok);fire(sw,sw_ok);domes.web.visible=web_ok;domes.sw.visible=sw_ok;
  if(api.fixed.listen)sp.emit(P(0,.5,3.5),50,{speed:4,color:RED,size:.14,life:1,gravity:-3});
 };
 api.clearReport=()=>{api.report=null;domes.web.visible=domes.sw.visible=false};
 ctx.add((dt,t)=>{
  for(const l of leds){const b=Math.sin(t*(2+l.ph)+l.ph)>.2?1:.25;l.l.material.color.setRGB(MINT[0]*b,MINT[1]*b,MINT[2]*b)}
  for(const h of hz){const fixed=api.fixed[h.id];const target=fixed?0:1;h.k=lerp(h.k,target,1-Math.exp(-dt*6));h.m.visible=h.k>.02;h.m.scale.setScalar(h.k);h.m.rotation.y+=dt*2;h.m.position.y+=Math.sin(t*3+h.m.position.x)*.002;
   h.m.material.color.setRGB(RED[0]*(.7+.3*Math.sin(t*5)),RED[1],RED[2])}
  linkA.mesh.material.color.setHex(api.fixed.listen?0x7a2418:0x7c818b);linkB.mesh.material.color.setHex(api.fixed.log?0x7a2418:0x7c818b);
  for(const f of flows){const ok=f.ok();f.t+=dt*.28;f.m.forEach((m,i)=>{
   let u=(f.t+i/f.n)%1;if(f.dir<0)u=1-u;
   if(ok){m.visible=true;m.position.copy(at(f.path,u));m.position.y=.3;m.material.color.setRGB(...WHITE)}
   else{const cut=.55;m.visible=true;const uu=Math.min(u,cut);if(f.dir<0)m.position.copy(at(f.path,Math.max(1-cut,u)));else m.position.copy(at(f.path,Math.min(cut,u)));m.position.y=.3;m.material.color.setRGB(...RED);if(Math.random()<dt*2)sp.emit(m.position.clone(),2,{speed:1.5,color:RED,size:.08,life:.5})}});}
  if(scanT>=0){scanT+=dt;const k=Math.min(1,scanT/1.5);const z=lerp(8,-9,ease.out3(k));beam.position.z=z;beam2.position.z=z;beam2.rotation.x=0;
   if(scanT>=1.6){scanT=-1;beam.visible=beam2.visible=false;api.busy=false;onDone&&onDone()}}
 });
 return api;
}

// =====================================================================
// Уровень 3: туннель потоков — шесть дорожек уходят вдаль
// =====================================================================
export function createFlowTunnel(parent,{quality=1,flows}={}){
 const ctx=panelScene(parent,{quality,pos:[0,2.4,12.5],look:[0,.3,-5],fov:50,sway:0});
 const {scene}=ctx;const sp=ctx.sparks,rg=ctx.rings;
 const api={ctx,sel:null,marked:{},result:null};
 const N=flows.length,X=i=>(i-(N-1)/2)*1.12;
 const lanes=flows.map((f,i)=>{
  const g=new THREE.Group();g.position.x=X(i);scene.add(g);
  const bar=new THREE.Mesh(new THREE.BoxGeometry(.14,.1,46),toon(0x2c3036));bar.position.set(0,.05,-14);bar.receiveShadow=true;g.add(bar);
  const strip=new THREE.Mesh(new THREE.PlaneGeometry(.9,46),new THREE.MeshBasicMaterial({color:hdr(.12,.14,.18),transparent:true,opacity:.35,depthWrite:false,toneMapped:false}));strip.rotation.x=-Math.PI/2;strip.position.set(0,.03,-14);g.add(strip);
  const lab=labelSprite(f.host,{size:.46,font:'700 34px sans-serif'});lab.position.set(0,.3,9.2);lab.material.opacity=.9;g.add(lab);
  const gate=new THREE.Mesh(new THREE.TorusGeometry(.5,.035,8,40),mat(RED));gate.position.set(0,.6,5.2);gate.visible=false;g.add(gate);
  return{f,g,bar,strip,gate,lab,k:0,spawn:Math.random()*2,burst:0,col:WHITE};
 });
 const MAXP=420;
 const inst=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial({toneMapped:false}),MAXP);inst.frustumCulled=false;scene.add(inst);
 const parts=[];const dummy=new THREE.Object3D(),c=new THREE.Color();
 const kind={update:{every:3.2,len:1.5,w:.5,sp:5.5},beacon:{every:1.6,len:.5,w:.3,sp:7},backup:{every:.5,len:7,w:.55,sp:3},imap:{every:4.3,len:.4,w:.22,sp:6},tunnel:{every:.07,len:.22,w:.2,sp:8.5},dns:{every:1.1,len:.3,w:.18,sp:6.5}};
 api.set=s=>{api.sel=s.sel;api.marked=s.marked||{};api.result=s.result};
 api.reveal=()=>{};
 ctx.add((dt,t)=>{
  lanes.forEach((L,i)=>{
   const id=L.f.id,k=kind[id]||kind.update;const sel=api.sel===id,mk=api.marked[id],res=api.result&&api.result[id];
   const base=mk?RED:res==='ok'?MINT:COOL;
   L.col=base;L.k=lerp(L.k,sel?1:0,1-Math.exp(-dt*8));
   L.strip.material.opacity=.06+L.k*.22+(mk?.18:0);L.strip.material.color.setRGB(base[0]*.35,base[1]*.35,base[2]*.35);
   L.bar.material.color.setHex(mk?0x7a2418:sel?0x8fb4ff:0x2c3036);
   L.gate.visible=!!mk||res==='ok'||res==='fp'||res==='miss';L.gate.material.color.setRGB(...(res==='ok'?MINT:res==='fp'?AMB:RED));L.gate.rotation.z+=dt*1.5;L.gate.scale.setScalar(1+Math.sin(t*4+i)*.05+(sel?.15:0));
   L.lab.material.opacity=sel?1:.6;L.lab.position.y=.2+L.k*.25;
   L.spawn-=dt;
   if(L.spawn<=0&&parts.length<MAXP-4){
    L.spawn=k.every*(id==='imap'||id==='dns'?(.7+Math.random()*.9):id==='beacon'?1:(.9+Math.random()*.2));
    const n=id==='dns'&&Math.random()<.5?3:1;
    for(let q=0;q<n;q++)parts.push({lane:i,z:-34-q*.9,k,color:base});
   }
  });
  for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.z+=p.k.sp*dt;if(p.z>9.8)parts.splice(i,1)}
  inst.count=parts.length;
  parts.forEach((p,i)=>{
   const L=lanes[p.lane],sel=api.sel===L.f.id;const depth=Math.min(1,(p.z+34)/44);
   dummy.position.set(L.g.position.x,.28,p.z);dummy.scale.set(p.k.w*.55*(.6+depth*.8),p.k.w*.55*(.6+depth*.8),p.k.len);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix);
   const b=(sel?2.2:1.1)*(.35+depth*.9);c.setRGB(L.col[0]*b,L.col[1]*b,L.col[2]*b);inst.setColorAt(i,c);
  });
  inst.instanceMatrix.needsUpdate=true;if(inst.instanceColor)inst.instanceColor.needsUpdate=true;
 });
 api.markFx=id=>{const L=lanes.find(l=>l.f.id===id);if(!L)return;const p=new THREE.Vector3(L.g.position.x,.7,5.2);rg.fire(p,RED,1.6,.7,false);sp.emit(p,26,{speed:3.5,color:RED,size:.12,life:.7,gravity:-2});ctx.kick(.25);ctx.aberrate(.4)};
 api.resultFx=(res)=>{lanes.forEach(L=>{const r=res[L.f.id];if(!r)return;const p=new THREE.Vector3(L.g.position.x,.7,5.2);const col=r==='ok'?MINT:r==='fp'?AMB:RED;rg.fire(p,col,1.8,.9,false);sp.emit(p,34,{speed:4,color:col,size:.13,life:.9,gravity:-2});if(r!=='ok'){ctx.kick(.3);ctx.flashRed(.15)}})};
 return api;
}

// =====================================================================
// Уровень 4: граф атаки
// =====================================================================
export function createAttackGraph(parent,{quality=1}={}){
 const ctx=panelScene(parent,{quality,pos:[.6,12.5,12],look:[.5,0,.2],fov:31,sway:0});
 const {scene}=ctx;const sp=ctx.sparks,rg=ctx.rings;
 const api={ctx,host:null,revealed:false,cut:false};
 const defs={
  'WS-114':{x:-6,z:1.6,c:BONE,main:true},'WS-087':{x:-6,z:-3.2,c:STEEL},'DC-01':{x:-1.2,z:-3,c:BONE,main:true},'SRV-FILE':{x:-.6,z:2.6,c:BONE,main:true},'SRV-UPD':{x:-1.6,z:-0.2,c:STEEL}
 };
 const nodes={};
 Object.entries(defs).forEach(([id,d])=>{
  const g=new THREE.Group();g.position.set(d.x,0,d.z);scene.add(g);
  const m=box(ctx,g,1.8,.9,1.3,d.c,[0,.45,0]);
  if(id.startsWith('WS')){box(ctx,g,1.2,.7,.08,d.c,[0,1.2,-.3]);}
  const lab=labelSprite(id,{size:.62,font:'700 34px sans-serif'});lab.position.set(0,2.1,0);g.add(lab);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.4,.05,8,48),mat(AMB));ring.rotation.x=Math.PI/2;ring.position.y=.06;ring.visible=false;g.add(ring);
  nodes[id]={g,m,ring,lab,home:d};
 });
 // шесть серверов
 const srv=new THREE.Group();srv.position.set(5.2,0,.2);scene.add(srv);
 const srvBoxes=[];
 for(let i=0;i<6;i++){const b=box(ctx,srv,1.0,1.5+(i%2)*.4,1.0,BONE,[(i%3)*1.6-1.6,(1.5+(i%2)*.4)/2,(i<3?-1.6:1.6)]);srvBoxes.push(b)}
 const sl=labelSprite('6 серверов',{size:.62,font:'700 34px sans-serif'});sl.position.set(0,3.2,0);srv.add(sl);
 nodes['6 хостов']={g:srv,ring:null};
 const ringS=new THREE.Mesh(new THREE.TorusGeometry(3.2,.05,8,48),mat(AMB));ringS.rotation.x=Math.PI/2;ringS.position.y=.06;ringS.visible=false;srv.add(ringS);nodes['6 хостов'].ring=ringS;
 const P=(x,y,z)=>new THREE.Vector3(x,y,z);
 const edgeDefs=[
  {a:'WS-114',b:'DC-01',pts:[P(-5,.2,1.6),P(-5,.2,-3),P(-2.1,.2,-3)],at:0},
  {a:'WS-114',b:'SRV-FILE',pts:[P(-5,.2,1.6),P(-5,.2,2.6),P(-1.5,.2,2.6)],at:.9},
  {a:'SRV-FILE',b:'6',pts:[P(.2,.2,2.6),P(2.6,.2,2.6),P(2.6,.2,1.8),P(3.6,.2,1.8)],at:2.6},
  {a:'SRV-FILE',b:'6b',pts:[P(2.6,.2,2.6),P(2.6,.2,-1.4),P(3.6,.2,-1.4)],at:2.8}
 ];
 const grey=[P(-6,.2,-3.2),P(-1.8,.2,-3.2)];
 const edges=edgeDefs.map(e=>{const t=tubeAlong(e.pts,.06,0x7c818b);scene.add(t.mesh);return{...e,tube:t,k:0}});
 const dim=tubeAlong([P(-5,.2,-3.2),P(-5,.2,-.2),P(-2.5,.2,-.2)],.05,0x4a4e56);scene.add(dim.mesh);
 // красные частицы вдоль рёбер
 const flowers=[];edges.forEach(e=>{for(let i=0;i<5;i++){const m=new THREE.Mesh(new THREE.OctahedronGeometry(.17),mat(RED));m.visible=false;scene.add(m);flowers.push({e,m,o:i/5})}});
 // lsass
 const ls=new THREE.Mesh(new THREE.TorusGeometry(1.5,.06,8,48),mat(RED));ls.rotation.x=Math.PI/2;ls.position.set(-.6,.5,2.6);ls.visible=false;scene.add(ls);
 // изоляция
 const iso=[dome(ctx,nodes['WS-114'].g,2.3),dome(ctx,nodes['SRV-FILE'].g,2.3)];iso.forEach(d=>d.visible=false);
 let t0=-1;
 api.setHost=h=>{api.host=h};
 api.reveal=()=>{api.revealed=true;t0=0;ctx.kick(.3)};
 api.isolate=()=>{api.cut=true;iso.forEach(d=>d.visible=true);['WS-114','SRV-FILE'].forEach(id=>{const p=nodes[id].g.position.clone().setY(.2);rg.fire(p,MINT,5,1,true);sp.emit(p.clone().setY(1),50,{speed:5,color:MINT,size:.14,life:.9,gravity:-3})});ctx.kick(.4);ctx.aberrate(.6)};
 api.reset=()=>{api.revealed=false;api.cut=false;t0=-1;iso.forEach(d=>d.visible=false);ls.visible=false};
 ctx.add((dt,t)=>{
  for(const id in nodes){const n=nodes[id];if(!n.ring)continue;const on=api.host===id;n.ring.visible=on;if(on){n.ring.rotation.z+=dt;n.ring.scale.setScalar(1+Math.sin(t*5)*.06)}}
  if(t0>=0){t0+=dt}
  edges.forEach(e=>{const on=api.revealed&&t0>=e.at*0.6;e.k=lerp(e.k,on?1:0,1-Math.exp(-dt*5));
   const dead=api.cut;e.tube.mesh.material.color.setRGB(lerp(.49,dead?.3:.9,e.k),lerp(.5,dead?.32:.16,e.k),lerp(.55,dead?.34:.08,e.k))});
  flowers.forEach(f=>{const live=api.revealed&&!api.cut&&f.e.k>.5;f.m.visible=live;if(live){const u=(t*.45+f.o)%1;f.m.position.copy(at(f.e.tube.path,u));f.m.position.y=.5;f.m.rotation.y+=dt*4}});
  ls.visible=api.revealed&&t0>=1.7&&!api.cut;if(ls.visible){ls.scale.setScalar(1+Math.sin(t*6)*.08);ls.rotation.z+=dt*2}
  if(api.revealed&&!api.cut){['WS-114','SRV-FILE'].forEach((id,i)=>{const g=nodes[id].g;const o=g.children[0].userData.ol;if(o)o.material.color.setHex(0xfc3e24)})}
  if(api.cut){['WS-114','SRV-FILE'].forEach(id=>{const o=nodes[id].g.children[0].userData.ol;if(o)o.material.color.setHex(0x7fe0b5)})}
 });
 return api;
}

// =====================================================================
// Уровень 5: ядро агента и права
// =====================================================================
export function createAgentCore(parent,{quality=1}={}){
 const ctx=panelScene(parent,{quality,pos:[0,9,14],look:[0,1.3,1.2],fov:35,sway:0});
 const {scene}=ctx;const sp=ctx.sparks,rg=ctx.rings;
 const api={ctx,grant:{},pipe:null};
 const core=new THREE.Group();core.position.set(0,2.4,-1.2);scene.add(core);
 const body=new THREE.Mesh(new THREE.IcosahedronGeometry(1.15,1),toon(0xd9d4c9));body.castShadow=true;core.add(body);outline(ctx,body,OL,2,1,18);
 const eye=new THREE.Mesh(new THREE.SphereGeometry(.34,20,14),mat(MINT));eye.position.set(0,.1,1.0);core.add(eye);
 const halo=sprite(0x7fe0b5,5,.35);core.add(halo);
 const cage=new THREE.Mesh(new THREE.TorusGeometry(1.9,.03,6,80),mat([.8,.8,.9]));cage.rotation.x=1.2;core.add(cage);
 const defs=[
  {id:'read',label:'репозиторий',need:true,a:Math.PI*.5},{id:'tests',label:'тесты',need:true,a:Math.PI*.1},
  {id:'net',label:'интернет',need:false,a:Math.PI*.9},{id:'secrets',label:'секреты CI',need:false,a:Math.PI*1.35},{id:'deploy',label:'прод',need:false,a:Math.PI*1.7}
 ];
 const R=4.4;
 const perms=defs.map(d=>{
  const g=new THREE.Group();g.position.set(Math.cos(d.a)*R,0,Math.sin(d.a)*R*.8-.4);scene.add(g);
  const b=box(ctx,g,1.5,1.0,1.2,d.need?BONE:STEEL,[0,.5,0]);
  const lab=labelSprite(d.label,{size:.58,font:'700 34px sans-serif',color:d.need?'#ece6da':'#f2b0a5'});lab.position.set(0,1.7,0);g.add(lab);
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,1,6),mat(d.need?MINT:RED));scene.add(beam);
  return{d,g,b,beam,k:1};
 });
 // гейты конвейера
 const gates=[];
 for(let i=0;i<5;i++){const g=new THREE.Mesh(new THREE.TorusGeometry(1.1,.07,8,40),toon(0x3a3f48));g.position.set(-3.6+i*1.8,1.1,5.4);g.rotation.y=Math.PI/2;scene.add(g);outline(ctx,g,OL,1.2,.8);gates.push({g,st:0})}
 const pk=new THREE.Mesh(new THREE.OctahedronGeometry(.28),mat(AMB));pk.position.set(-5.4,1.1,5.4);scene.add(pk);
 let runT=-1,fail=99,stepMax=0;
 api.set=s=>{api.grant=s.grant||{}};
 api.run=(f,n,cb)=>{runT=0;fail=f;stepMax=n;api.cb=cb;gates.forEach(x=>x.st=0)};
 api.resetPipe=()=>{runT=-1;gates.forEach(x=>x.st=0);pk.position.x=-5.4};
 ctx.add((dt,t)=>{
  core.rotation.y=t*.4;halo.material.opacity=.3+Math.sin(t*2)*.08;eye.scale.setScalar(1+Math.sin(t*3)*.1);cage.rotation.z=t*.5;
  const danger=defs.some(d=>!d.need&&api.grant[d.id]);
  eye.material.color.setRGB(...(danger?RED:MINT));halo.material.color.setHex(danger?0xfc3e24:0x7fe0b5);
  perms.forEach(p=>{const on=!!api.grant[p.d.id];p.k=lerp(p.k,on?1:0,1-Math.exp(-dt*7));
   const a=core.position.clone(),b=p.g.position.clone().setY(.6);const len=a.distanceTo(b);
   p.beam.position.copy(a).add(b).multiplyScalar(.5);p.beam.scale.set(1,len*p.k,1);p.beam.lookAt(b);p.beam.rotateX(Math.PI/2);p.beam.visible=p.k>.02;
   if(on&&!p.d.need&&Math.random()<dt*6)sp.emit(p.g.position.clone().setY(.8),1,{speed:1.4,color:RED,size:.1,life:.7,gravity:1.5});
   p.b.userData.ol.material.color.setHex(on&&!p.d.need?0xfc3e24:OL)});
  if(runT>=0){runT+=dt;const sp0=1.8/.5;pk.position.x=-5.4+runT*sp0;
   const idx=Math.floor((pk.position.x+3.6+.9)/1.8);
   for(let i=0;i<=Math.min(idx,4);i++){const g=gates[i];if(g.st===0){if(i===fail){g.st=2;g.g.material.color.setHex(0xfc3e24);sp.emit(g.g.position.clone(),60,{speed:5,color:RED,size:.15,life:.9,gravity:-3});ctx.kick(.6);ctx.aberrate(1);ctx.flashRed(.35);runT=-1;const cb=api.cb;api.cb=null;cb&&cb();break}else{g.st=1;g.g.material.color.setHex(0x7fe0b5);rg.fire(g.g.position.clone().setY(.1),MINT,3,.7,false)}}}
   if(runT>=0&&pk.position.x>5.2){runT=-1;const cb=api.cb;api.cb=null;cb&&cb()}}
  pk.visible=runT!==-1||pk.position.x>-5.2;pk.rotation.y+=dt*3;
 });
 return api;
}
