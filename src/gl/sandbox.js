import {THREE,toon,glow,outline,sprite,hdr,ease,lerp,labelSprite,panelScene,box,OL,BONE,STEEL} from './core';

const RED=[1.9,.16,.07],MINT=[.4,1.6,1.1],AMB=[2.0,1.3,.25],DIM=[.35,.38,.45];
const mat=(c,x={})=>glow(c[0],c[1],c[2],x);

// Права агента — шесть «портов» вокруг ядра. Нужные для задачи — светлые; лишние — со знаком опасности.
export const PERMS=[
 {id:'read',label:'репозиторий',need:true,pos:[-4.5,-1.4]},
 {id:'tests',label:'тесты в песочнице',need:true,pos:[4.5,-1.4]},
 {id:'net',label:'интернет',need:false,pos:[-3.6,3.0]},
 {id:'secrets',label:'секреты CI',need:false,pos:[0,-5.4]},
 {id:'deploy',label:'деплой в прод',need:false,pos:[3.6,3.0]}
];

export function createAgentSandbox(parent,{quality=1,cb={},steps=[]}={}){
 const ctx=panelScene(parent,{quality,pos:[0,12,17],look:[0,.8,.8],fov:42,sway:0,bloom:[.45,.5,.92]});
 const {scene,camera}=ctx;const sp=ctx.sparks,rg=ctx.rings;
 const api={ctx,grant:{},hot:null,hover:null,pipe:null};

 // платформа и ядро
 const plat=new THREE.Mesh(new THREE.CylinderGeometry(3.3,3.5,.3,64),toon(0x2a2e35));plat.position.y=.15;plat.receiveShadow=true;scene.add(plat);outline(ctx,plat,0x80858f,1.6,.9,30);
 const platRing=new THREE.Mesh(new THREE.TorusGeometry(2.9,.04,8,96),mat([.4,.8,.9]));platRing.rotation.x=Math.PI/2;platRing.position.y=.33;scene.add(platRing);
 const core=new THREE.Group();core.position.set(0,2.4,0);scene.add(core);
 const body=new THREE.Mesh(new THREE.IcosahedronGeometry(1.1,1),toon(0xe4dfd3));body.castShadow=true;core.add(body);outline(ctx,body,OL,2,1,18);
 const visor=new THREE.Mesh(new THREE.CapsuleGeometry(.2,.7,6,16),mat(MINT));visor.rotation.z=Math.PI/2;visor.position.set(0,.12,.98);core.add(visor);
 const halo=sprite(0x7fe0b5,5,.28);core.add(halo);
 const leg=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,1.6,8),toon(0x80858f));leg.position.y=-1.5;core.add(leg);

 // защитный купол «песочница»
 const domeMat=new THREE.MeshBasicMaterial({color:hdr(.3,1.4,1),transparent:true,opacity:.12,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,toneMapped:false});
 const wireMat=new THREE.MeshBasicMaterial({color:hdr(.3,1.4,1),wireframe:true,transparent:true,opacity:.34,toneMapped:false});
 const dome=new THREE.Mesh(new THREE.SphereGeometry(3.45,40,20,0,Math.PI*2,0,Math.PI/2),domeMat);dome.position.y=.3;
 const wire=new THREE.Mesh(new THREE.SphereGeometry(3.46,20,10,0,Math.PI*2,0,Math.PI/2),wireMat);dome.add(wire);scene.add(dome);

 // порты прав
 const mods=PERMS.map(p=>{
  const g=new THREE.Group();g.position.set(p.pos[0],0,p.pos[1]);scene.add(g);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(1.15,1.25,.22,6),toon(0x2a2e35));base.position.y=.11;base.receiveShadow=true;g.add(base);outline(ctx,base,0x80858f,1.4,.9,30);
  const blk=new THREE.Mesh(new THREE.CylinderGeometry(.82,.9,.95,6),toon(p.need?0xe4dfd3:0xd8b9a8,{emissive:0x050505}));blk.position.y=.7;blk.castShadow=true;g.add(blk);outline(ctx,blk,OL,2,1,30);
  blk.userData.id=p.id;
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.05,.04,8,48),mat(DIM));ring.rotation.x=Math.PI/2;ring.position.y=.26;g.add(ring);
  const led=new THREE.Mesh(new THREE.BoxGeometry(.7,.07,.07),mat(DIM));led.position.set(0,1.0,.88);g.add(led);
  if(!p.need){ // знак опасности: красный треугольник на грани
   const tri=new THREE.Mesh(new THREE.ConeGeometry(.2,.1,3),mat(RED));tri.position.set(0,1.32,0);g.add(tri);
  }
  const lab=labelSprite(p.label,{size:.85,font:'700 34px sans-serif'});lab.position.set(0,2.1,0);g.add(lab);
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,1,8),mat(p.need?MINT:RED));beam.visible=false;scene.add(beam);
  return{p,g,blk,ring,led,lab,beam,hov:0,k:0,col:new THREE.Color()};
 });
 const meshes=mods.map(m=>m.blk);

 // конвейер проверок (внизу): пять площадок
 const pads=[...Array(5)].map((_,i)=>{
  const g=new THREE.Group();g.position.set(-3.8+i*1.9,0,7.0);scene.add(g);
  const b=new THREE.Mesh(new THREE.CylinderGeometry(.7,.76,.16,32),toon(0x2a2e35));b.position.y=.08;g.add(b);outline(ctx,b,0x80858f,1.2,.9,30);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.52,.035,8,40),mat(DIM));ring.rotation.x=Math.PI/2;ring.position.y=.2;g.add(ring);
  const lab=labelSprite(steps[i]||String(i+1),{size:.56,font:'700 32px sans-serif',color:'#b8b4aa'});lab.position.set(0,.95,0);g.add(lab);
  return{g,ring,st:0,k:0};
 });
 const pk=new THREE.Mesh(new THREE.OctahedronGeometry(.3),mat(AMB));pk.position.set(-5.2,.8,7.0);pk.visible=false;scene.add(pk);
 let runT=-1,fail=99;
 api.run=(f,n,cb2)=>{runT=0;fail=f;api.cb=cb2;pads.forEach(x=>{x.st=0});pk.visible=true;pk.position.x=-5.2};
 api.resetPipe=()=>{runT=-1;pads.forEach(x=>{x.st=0});pk.visible=false};

 api.set=s=>{api.grant=s.grant||{}};
 api.setHot=id=>{api.hot=id};

 // взаимодействие
 const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
 let az=0,azT=0,down=null,moved=false;
 const pick=e=>{const r=parent.getBoundingClientRect();ndc.set(((e.clientX-r.left)/r.width)*2-1,-(((e.clientY-r.top)/r.height)*2-1));ray.setFromCamera(ndc,camera);const h=ray.intersectObjects(meshes,false)[0];return h?h.object.userData.id:null};
 const onMove=e=>{
  if(down){const dx=e.clientX-down.x;if(Math.abs(dx)>6)moved=true;if(moved){azT=Math.max(-.7,Math.min(.7,down.az-dx*.004));return}}
  const id=pick(e);if(id!==api.hover){api.hover=id;parent.style.cursor=id?'pointer':'grab';cb.hover&&cb.hover(id)}
 };
 const onDown=e=>{down={x:e.clientX,az:azT};moved=false;parent.setPointerCapture&&parent.setPointerCapture(e.pointerId)};
 const onUp=e=>{const was=moved;down=null;moved=false;if(was)return;const id=pick(e);if(id&&runT===-1)cb.toggle&&cb.toggle(id)};
 const onLeave=()=>{if(api.hover){api.hover=null;cb.hover&&cb.hover(null)}};
 parent.style.cursor='grab';parent.style.touchAction='none';
 parent.addEventListener('pointermove',onMove);parent.addEventListener('pointerdown',onDown);parent.addEventListener('pointerup',onUp);parent.addEventListener('pointerleave',onLeave);
 const baseDispose=ctx.dispose;ctx.dispose=()=>{parent.removeEventListener('pointermove',onMove);parent.removeEventListener('pointerdown',onDown);parent.removeEventListener('pointerup',onUp);parent.removeEventListener('pointerleave',onLeave);baseDispose()};
 const base=new THREE.Vector3(0,12,17),look=new THREE.Vector3(0,.8,.8);
 api.moduleScreen=id=>{const m=mods.find(x=>x.p.id===id);const p=ctx.project(m.g.position.clone().setY(.8));const r=parent.getBoundingClientRect(),k=r.width/ctx.w;return{x:r.left+p.x*k,y:r.top+p.y*k}};

 const tmp=new THREE.Color(),from=new THREE.Vector3(),to=new THREE.Vector3();
 let wasDanger=false;
 ctx.add((dt,t)=>{
  az=lerp(az,azT,1-Math.exp(-dt*6));
  const rel=base.clone().sub(look),c=Math.cos(az),s=Math.sin(az);
  camera.position.set(look.x+rel.x*c+rel.z*s,base.y,look.z-rel.x*s+rel.z*c);camera.lookAt(look);
  const danger=PERMS.some(p=>!p.need&&api.grant[p.id]);
  if(danger&&!wasDanger){ctx.kick(.3);ctx.flashRed(.15)}wasDanger=danger;
  const noNeed=PERMS.some(p=>p.need&&!api.grant[p.id]);
  core.rotation.y=t*.35;core.position.y=2.4+Math.sin(t*1.2)*.06;
  const tint=danger?RED:noNeed?AMB:MINT;
  tmp.setRGB(tint[0],tint[1],tint[2]);visor.material.color.lerp(tmp,1-Math.exp(-dt*8));
  halo.material.color.setRGB(tint[0]/2,tint[1]/2,tint[2]/2);
  domeMat.color.lerp(tmp.setRGB(danger?1.5:.3,danger?.2:1.4,danger?.12:1),1-Math.exp(-dt*6));wireMat.color.copy(domeMat.color);
  domeMat.opacity=lerp(domeMat.opacity,danger?.2:.12,1-Math.exp(-dt*6));
  platRing.material.color.setRGB(tint[0]*.6,tint[1]*.6,tint[2]*.6);
  // порты
  for(const m of mods){
   const on=!!api.grant[m.p.id],risky=!m.p.need;
   const col=!on?DIM:risky?RED:MINT;
   tmp.setRGB(col[0],col[1],col[2]);m.ring.material.color.lerp(tmp,1-Math.exp(-dt*9));m.led.material.color.lerp(tmp,1-Math.exp(-dt*9));
   const h=(api.hover===m.p.id||api.hot===m.p.id)?1:0;m.hov=lerp(m.hov,h,1-Math.exp(-dt*12));
   m.blk.position.y=.7+m.hov*.14;m.blk.scale.setScalar(1+m.hov*.08);m.ring.scale.setScalar(1+m.hov*.12);
   m.k=lerp(m.k,on?1:0,1-Math.exp(-dt*7));
   from.copy(core.position);to.set(m.g.position.x,.9,m.g.position.z);const len=from.distanceTo(to);
   m.beam.visible=m.k>.03;m.beam.position.copy(from).add(to).multiplyScalar(.5);m.beam.scale.set(1+m.hov*.5,len*m.k,1+m.hov*.5);m.beam.lookAt(to);m.beam.rotateX(Math.PI/2);
   m.beam.position.lerpVectors(from,to,m.k*.5);
   if(on&&risky&&Math.random()<dt*5)sp.emit(m.g.position.clone().setY(1.2),1,{speed:1.2,color:RED,size:.09,life:.7,gravity:1.4});
   m.blk.material.emissive.setRGB(on&&risky?.28:.02,on&&risky?.02:.02,.02);
  }
  // конвейер
  if(runT>=0){runT+=dt;pk.position.x=-5.2+runT*3.8;
   const idx=Math.floor((pk.position.x+3.8+.95)/1.9);
   for(let i=0;i<=Math.min(idx,4);i++){const p=pads[i];if(p.st===0){
    if(i===fail){p.st=2;sp.emit(p.g.position.clone().setY(.6),50,{speed:4.5,color:RED,size:.13,life:.9,gravity:-3});rg.fire(p.g.position.clone().setY(.1),RED,3.2,.8,true);ctx.kick(.55);ctx.aberrate(.9);ctx.flashRed(.3);runT=-1;pk.visible=false;const cb2=api.cb;api.cb=null;cb2&&cb2();break}
    p.st=1;rg.fire(p.g.position.clone().setY(.1),MINT,2.2,.7,true)}}
   if(runT>=0&&pk.position.x>4.8){runT=-1;pk.visible=false;const cb2=api.cb;api.cb=null;cb2&&cb2()}}
  pk.rotation.y+=dt*3;
  pads.forEach(p=>{const col=p.st===1?MINT:p.st===2?RED:DIM;tmp.setRGB(col[0],col[1],col[2]);p.ring.material.color.lerp(tmp,1-Math.exp(-dt*10))});
 });
 if(import.meta.env.DEV)window.__sbx=api;
 return api;
}
