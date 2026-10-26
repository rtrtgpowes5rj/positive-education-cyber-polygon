import {THREE,PAL,toon,glow,outline,sprite,hdr,ease,lerp,labelSprite,panelScene,box,tubeAlong,canvasTex,OL,BONE,STEEL} from './core';
import {mats,rack,switchBox,appliance,laptop,rbox,mesh} from './kit';

const RED=[2.4,.2,.08],MINT=[.4,1.8,1.2],AMB=[2.4,1.5,.3],ICE=[.55,1.35,2.2],WHITE=[1.3,1.25,1.15];
const at=(path,u)=>path.getPointAt(Math.min(.998,Math.max(.002,u)));
const mat=(c,x={})=>glow(c[0],c[1],c[2],x);

function dome(parent,r,color=[.35,1.5,1.0]){
 const m=new THREE.Mesh(new THREE.SphereGeometry(r,40,20,0,Math.PI*2,0,Math.PI/2),new THREE.MeshBasicMaterial({color:hdr(...color),transparent:true,opacity:.14,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,toneMapped:false}));
 const w=new THREE.Mesh(new THREE.SphereGeometry(r*1.001,18,9,0,Math.PI*2,0,Math.PI/2),new THREE.MeshBasicMaterial({color:hdr(...color),wireframe:true,transparent:true,opacity:.4,toneMapped:false}));
 m.add(w);parent.add(m);return m;
}

// Токены конфигурации: каждая «странная» строка конфига — объект в сцене. Клик по нему = правка строки.
export const TOKENS=[
 {id:'root',label:'root-вход',pos:[-3.0,1.9,4.8],dev:'web'},
 {id:'pass',label:'пароль SSH',pos:[-3.3,1.9,1.4],dev:'web'},
 {id:'tls',label:'версии TLS',pos:[3.0,1.9,4.8],dev:'web'},
 {id:'listen',label:'порт 443',pos:[3.3,1.9,1.4],dev:'web'},
 {id:'snmp',label:'SNMP',pos:[-4.0,1.9,-2.6],dev:'sw'},
 {id:'telnet',label:'Telnet',pos:[-4.0,1.9,-6.4],dev:'sw'},
 {id:'log',label:'логи → SIEM',pos:[3.4,1.9,-3.2],dev:'sw'}
];

export function createConfigRoom(parent,{quality=1,cb={}}={}){
 const ctx=panelScene(parent,{quality,pos:[0,18,21],look:[0,.4,-1.8],fov:48,sway:0});
 const {scene,camera,renderer}=ctx;const sp=ctx.sparks,rg=ctx.rings;
 const api={ctx,fixed:{},report:null,busy:false,hot:null,hover:null};
 const mk=(name,x,z)=>{const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);g.userData.name=name;return g};
 const P=(x,y,z)=>new THREE.Vector3(x,y,z);
 const leds=[],kl=[];const M=mats();

 const client=mk('client',0,7.4);
 const portal=canvasTex(256,160,(g,w,h)=>{g.fillStyle='#0f1a1f';g.fillRect(0,0,w,h);g.fillStyle='#1d3a46';g.fillRect(0,0,w,26);g.fillStyle='#7fe0b5';g.fillRect(12,9,60,8);
  g.fillStyle='#e9edf0';g.font='700 22px sans-serif';g.fillText('portal.corp.local',16,62);g.fillStyle='#2b4652';for(let i=0;i<4;i++)g.fillRect(16,80+i*18,140+((i*53)%80),9);g.fillStyle='#fc3e24';g.fillRect(190,120,48,22)});
 const lp=laptop(M,{w:2.1,screen:portal});client.add(lp);
 const cl=labelSprite('клиент',{size:.9,color:'#a4a198',font:'600 34px sans-serif'});cl.position.set(0,2.4,-.4);client.add(cl);

 const web=mk('web',0,1.8);
 web.add(rack(M,{w:2.4,h:4.3,d:1.8,units:9,leds:kl}));
 const wl=labelSprite('web-01',{size:1});wl.position.set(0,5.3,0);web.add(wl);

 const sw=mk('sw',-1.6,-4.6);
 sw.add(switchBox(M,{w:4.2,h:.95,d:1.6,ports:12,leds:kl}));
 const sl=labelSprite('core-sw01',{size:1});sl.position.set(0,1.9,0);sw.add(sl);

 const siem=mk('siem',2.0,-8.6);
 const chart=canvasTex(256,200,(g,w,h)=>{g.fillStyle='#0c1a16';g.fillRect(0,0,w,h);g.strokeStyle='#7fe0b5';g.lineWidth=4;g.beginPath();for(let i=0;i<=12;i++){const x=12+i*19,y=120-Math.sin(i*.8)*34-((i*37)%23);i?g.lineTo(x,y):g.moveTo(x,y)}g.stroke();
  g.fillStyle='#7fe0b5';for(let i=0;i<6;i++)g.fillRect(14+i*38,h-30-((i*29)%26),24,8);g.fillStyle='#e9edf0';g.font='700 20px monospace';g.fillText('SIEM · events',12,26)});
 siem.add(appliance(M,{w:2.1,h:2.7,d:1.5,face:chart,faceW:1.5,faceH:1.2,leds:kl,light:true}));
 const sil=labelSprite('SIEM',{size:1});sil.position.set(0,3.4,0);siem.add(sil);

 const linkA=tubeAlong([P(0,.12,6.5),P(0,.12,2.9)],.07,0x7c818b);scene.add(linkA.mesh);
 const linkB=tubeAlong([P(-1.6,.12,-5.5),P(-1.6,.12,-8.6),P(.9,.12,-8.6)],.07,0x7c818b);scene.add(linkB.mesh);
 const linkC=tubeAlong([P(0,.12,.8),P(0,.12,-2.2),P(-1.6,.12,-3.7)],.07,0x7c818b);scene.add(linkC.mesh);
 const flows=[{path:linkA.path,dir:-1,ok:()=>!api.fixed.listen,t:0,n:3},{path:linkB.path,dir:1,ok:()=>!api.fixed.log,t:0,n:3}];
 flows.forEach(f=>{f.m=[];for(let i=0;i<f.n;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.14,10,8),mat(WHITE));scene.add(m);f.m.push(m)}});

 // ----- токены -----
 const chipTex=canvasTex(128,128,(g,w,h)=>{g.clearRect(0,0,w,h);g.strokeStyle='#fff';g.lineWidth=7;g.strokeRect(10,10,108,108);g.globalAlpha=.35;g.fillStyle='#fff';g.fillRect(10,10,108,108);g.globalAlpha=1;g.fillStyle='#fff';g.fillRect(40,40,48,48)});
 const tokens=TOKENS.map(t=>{
  const g=new THREE.Group();g.position.set(...t.pos);scene.add(g);
  const core=new THREE.Mesh(rbox(.95,.28,.95,.1),new THREE.MeshStandardMaterial({color:0x1d2127,roughness:.3,metalness:.75}));core.castShadow=true;g.add(core);
  const top=new THREE.Mesh(new THREE.PlaneGeometry(.66,.66),new THREE.MeshBasicMaterial({map:chipTex,color:0xffffff,transparent:true,toneMapped:false}));top.rotation.x=-Math.PI/2;top.position.y=.145;core.add(top);
  for(let k=0;k<4;k++){const pin=new THREE.Mesh(new THREE.BoxGeometry(.08,.05,.16),M.steel);pin.position.set(-.3+k*.2,0,.53);core.add(pin);const pin2=pin.clone();pin2.position.z=-.53;core.add(pin2)}
  const ol=outline(ctx,core,OL,2.2,1,10);
  const halo=sprite(0xf2a53a,2.6,.0);g.add(halo);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.62,.025,6,48),mat(AMB));ring.rotation.x=Math.PI/2;ring.position.y=-.5;g.add(ring);
  const lab=labelSprite(t.label,{size:.78,font:'700 40px sans-serif'});lab.position.set(0,1.05,0);g.add(lab);
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(.015,.015,t.pos[1],6),mat([.7,.5,.2],{transparent:true,opacity:.5}));stem.position.y=-t.pos[1]/2;g.add(stem);
  core.userData.id=t.id;
  return{t,g,core,top,ol,halo,ring,lab,stem,col:new THREE.Color(),k:0,hov:0,shake:0,ph:Math.random()*6};
 });
 const tokById=Object.fromEntries(tokens.map(x=>[x.t.id,x]));
 const meshes=tokens.map(x=>x.core);

 const domes={web:dome(web,3.5),sw:dome(sw,3.3)};Object.values(domes).forEach(d=>{d.visible=false});
 const beam=new THREE.Mesh(new THREE.BoxGeometry(11,.05,.18),mat([1.6,1.6,1.8]));beam.visible=false;beam.position.y=.25;scene.add(beam);
 const beam2=new THREE.Mesh(new THREE.PlaneGeometry(11,3),new THREE.MeshBasicMaterial({color:hdr(.4,1,.8),transparent:true,opacity:.1,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));beam2.visible=false;beam2.position.y=1.5;scene.add(beam2);
 let scanT=-1,onDone=null;
 api.scan=cb2=>{scanT=0;onDone=cb2;beam.visible=beam2.visible=true;api.busy=true};
 api.set=s=>{api.fixed=s.fixed||{};api.report=s.report||null};
 api.setHot=id=>{api.hot=id};
 api.setReport=r=>{
  const web_ok=['root','pass','tls'].every(id=>r[id]==='ok')&&!api.fixed.listen,sw_ok=['snmp','telnet'].every(id=>r[id]==='ok');
  const fire=(g,ok)=>{const p=g.position.clone().setY(.1);rg.fire(p,ok?MINT:RED,ok?7:5,1.1,true);sp.emit(p.clone().setY(1.5),ok?50:40,{speed:5,color:ok?MINT:RED,size:.14,life:.9,gravity:-3});if(!ok){ctx.kick(.5);ctx.aberrate(.8);ctx.flashRed(.25)}};
  fire(web,web_ok);fire(sw,sw_ok);domes.web.visible=web_ok;domes.sw.visible=sw_ok;
  for(const id in r){if(r[id]==='broken'||r[id]==='missed'){const tk=tokById[id];tk.shake=1;sp.emit(tk.g.position.clone(),30,{speed:3.5,color:RED,size:.1,life:.8,gravity:-2})}}
  if(api.fixed.listen)sp.emit(P(0,.5,3.5),50,{speed:4,color:RED,size:.14,life:1,gravity:-3});
 };
 api.clearReport=()=>{domes.web.visible=domes.sw.visible=false};

 // ----- взаимодействие: наведение, клик, орбита -----
 const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
 let az=0,azT=0,down=null,moved=false;
 const pick=e=>{const r=parent.getBoundingClientRect();ndc.set(((e.clientX-r.left)/r.width)*2-1,-(((e.clientY-r.top)/r.height)*2-1));ray.setFromCamera(ndc,camera);const h=ray.intersectObjects(meshes,false)[0];return h?h.object.userData.id:null};
 const onMove=e=>{
  if(down){const dx=e.clientX-down.x;if(Math.abs(dx)>6)moved=true;if(moved){azT=Math.max(-.75,Math.min(.75,down.az-dx*.004));return}}
  const id=pick(e);if(id!==api.hover){api.hover=id;parent.style.cursor=id?'pointer':'grab';cb.hover&&cb.hover(id)}
 };
 const onDown=e=>{down={x:e.clientX,y:e.clientY,az:azT};moved=false;parent.setPointerCapture&&parent.setPointerCapture(e.pointerId)};
 const onUp=e=>{const was=moved;down=null;moved=false;if(was)return;const id=pick(e);if(id&&!api.busy){cb.toggle&&cb.toggle(id)}};
 const onLeave=()=>{if(api.hover){api.hover=null;cb.hover&&cb.hover(null)}};
 parent.style.cursor='grab';parent.style.touchAction='none';
 parent.addEventListener('pointermove',onMove);parent.addEventListener('pointerdown',onDown);parent.addEventListener('pointerup',onUp);parent.addEventListener('pointerleave',onLeave);
 const base=P(0,18,21),look=P(0,.4,-1.8);
 api.dispose=()=>{parent.removeEventListener('pointermove',onMove);parent.removeEventListener('pointerdown',onDown);parent.removeEventListener('pointerup',onUp);parent.removeEventListener('pointerleave',onLeave)};
 const baseDispose=ctx.dispose;ctx.dispose=()=>{api.dispose();baseDispose()};

 const tmp=new THREE.Color();
 ctx.add((dt,t)=>{
  az=lerp(az,azT,1-Math.exp(-dt*6));
  const rel=base.clone().sub(look);const c=Math.cos(az),s=Math.sin(az);
  camera.position.set(look.x+rel.x*c+rel.z*s,base.y,look.z-rel.x*s+rel.z*c);camera.lookAt(look);
  for(const l of kl){const b=Math.sin(t*(.6+l.ph*.1)+l.ph)>-.4?1:.45;l.m.material.color.setRGB(l.c[0]*b,l.c[1]*b,l.c[2]*b)}
  for(const l of leds){const b=Math.sin(t*(.6+l.ph*.1)+l.ph)>-.4?1:.45;l.l.material.color.setRGB(MINT[0]*b,MINT[1]*b,MINT[2]*b)}
  // токены
  for(const x of tokens){
   const id=x.t.id,fixed=!!api.fixed[id],rep=api.report&&api.report[id];
   let col=AMB,emi=[.29,.18,.03];
   if(rep==='ok'){col=MINT;emi=[.05,.3,.18]}else if(rep==='missed'||rep==='broken'){col=RED;emi=[.5,.04,.02]}else if(fixed){col=ICE;emi=[.08,.18,.3]}
   tmp.setRGB(col[0]/2.4,col[1]/2.4,col[2]/2.4);x.col.lerp(tmp,1-Math.exp(-dt*9));
   x.top.material.color.setRGB(x.col.r*1.35*(1+x.hov*.6),x.col.g*1.35*(1+x.hov*.6),x.col.b*1.35*(1+x.hov*.6));x.core.material.emissive.setRGB(emi[0]*.25,emi[1]*.25,emi[2]*.25);
   const hot=(api.hover===id||api.hot===id)?1:0;x.hov=lerp(x.hov,hot,1-Math.exp(-dt*12));
   x.shake=Math.max(0,x.shake-dt*1.6);
   x.g.position.y=x.t.pos[1]+Math.sin(t*1.4+x.ph)*.08+x.hov*.18;x.g.position.x=x.t.pos[0]+Math.sin(x.shake*40)*x.shake*.25;
   const sc=1+x.hov*.22;x.core.scale.setScalar(sc*(fixed?.88:1));x.core.rotation.y=Math.sin(t*.6+x.ph)*.35;x.core.rotation.x=.28;
   x.halo.material.color.setRGB(col[0]/2.4,col[1]/2.4,col[2]/2.4);x.halo.material.opacity=.1+x.hov*.4;
   x.ring.material.color.setRGB(col[0]*.8,col[1]*.8,col[2]*.8);x.ring.scale.setScalar(1+x.hov*.2);x.ring.position.y=-x.g.position.y+.14;
   x.stem.scale.y=x.g.position.y/x.t.pos[1];x.stem.position.y=-x.g.position.y/2;
   x.ol.material.color.setHex(rep==='missed'||rep==='broken'?0xfc3e24:OL);
  }
  linkA.mesh.material.color.setHex(api.fixed.listen?0x7a2418:0x7c818b);linkB.mesh.material.color.setHex(api.fixed.log?0x7a2418:0x7c818b);
  for(const f of flows){const ok=f.ok();f.t+=dt*.28;f.m.forEach((m,i)=>{
   let u=(f.t+i/f.n)%1;if(f.dir<0)u=1-u;
   if(ok){m.position.copy(at(f.path,u));m.material.color.setRGB(...WHITE)}
   else{const cut=.55;if(f.dir<0)m.position.copy(at(f.path,Math.max(1-cut,u)));else m.position.copy(at(f.path,Math.min(cut,u)));m.material.color.setRGB(...RED);if(Math.random()<dt*2)sp.emit(m.position.clone(),2,{speed:1.5,color:RED,size:.08,life:.5})}
   m.position.y=.3;m.visible=true})}
  if(scanT>=0){scanT+=dt;const k=Math.min(1,scanT/1.5);const z=lerp(8,-9,ease.out3(k));beam.position.z=z;beam2.position.z=z;if(scanT>=1.6){scanT=-1;beam.visible=beam2.visible=false;api.busy=false;onDone&&onDone()}}
 });
 api.tokenScreen=id=>{const p=ctx.project(tokById[id].g.position);const r=parent.getBoundingClientRect(),k=r.width/ctx.w;return{x:r.left+p.x*k,y:r.top+p.y*k}};
 if(import.meta.env.DEV)window.__room=api;
 return api;
}
