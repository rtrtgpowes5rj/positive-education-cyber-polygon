import {THREE,toon,glow,outline,sprite,hdr,ease,lerp,panelScene,box,OL,BONE,STEEL} from './core';
import {domeShader} from './network';

// Финал: большой купол защиты над миниатюрной сетью; по нему бьют красные атаки
export function createFinale(parent,{quality=1}={}){
 const ctx=panelScene(parent,{quality,pos:[-12,8,21],look:[0,1.4,0],fov:32,bloom:[0.35,0.5,0.9],sway:0});
 const {scene,camera}=ctx;const sp=ctx.sparks,rg=ctx.rings;
 const api={ctx,dim:0};
 const R=6.2;
 // миниатюра сети
 const town=new THREE.Group();scene.add(town);
 box(ctx,town,9,.25,6,0x2f343c,[0,.12,0],{ow:1.4});
 [[-2.4,-1.4,1.5,3.2],[-.6,-1.6,1.3,2.5],[1.4,-1.2,2,1.5],[-1.8,1.4,3.6,.8],[2.4,1.4,1.6,1.4]].forEach(([x,z,w,h],i)=>{
  box(ctx,town,w*.6,h,w*.5,i%2?STEEL:BONE,[x,h/2+.25,z]);
  const l=new THREE.Mesh(new THREE.BoxGeometry(.12,.12,.05),glow(.35,1.9,1.1));l.position.set(x+w*.18,h*.6,z+w*.26);town.add(l);
 });
 const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,
  uniforms:{uTime:{value:0},uR:{value:R},uColor:{value:new THREE.Color(.18,.75,.52)},uHit:{value:[0,1,2,3].map(()=>new THREE.Vector4(0,1,0,-1))}},vertexShader:domeShader.vertex,fragmentShader:domeShader.fragment});
 const dome=new THREE.Mesh(new THREE.SphereGeometry(R,72,36,0,Math.PI*2,0,Math.PI/2),mat);scene.add(dome);
 const base=new THREE.Mesh(new THREE.TorusGeometry(R,.05,8,128),glow(.4,1.8,1.2));base.rotation.x=Math.PI/2;base.position.y=.05;scene.add(base);
 // атаки
 const shots=[];let hk=0,spawn=.4;
 const spawnShot=()=>{
  const a=Math.random()*Math.PI*2,e=.25+Math.random()*.9;const dir=new THREE.Vector3(Math.cos(a)*Math.cos(e),Math.sin(e),Math.sin(a)*Math.cos(e));
  const m=new THREE.Mesh(new THREE.OctahedronGeometry(.22),glow(4,.5,.3));const from=dir.clone().multiplyScalar(R+11);m.position.copy(from);scene.add(m);
  const tr=new THREE.Mesh(new THREE.BoxGeometry(.06,.06,1),glow(2.4,.28,.14,{transparent:true,opacity:.7}));scene.add(tr);
  shots.push({m,tr,dir,d:R+11});
 };
 api.burst=()=>{rg.fire(new THREE.Vector3(0,.1,0),[.4,1.8,1.2],16,1.8,true);rg.fire(new THREE.Vector3(0,.1,0),[.3,1.3,.9],10,1.4,true);sp.emit(new THREE.Vector3(0,2,0),200,{speed:9,color:[.5,1.8,1.3],size:.2,life:1.6,gravity:-2.5,up:1.2});ctx.kick(.5);ctx.aberrate(.8)};
 api.setDim=k=>{api.dim=k};
 let t0=0;
 ctx.add((dt,t)=>{
  mat.uniforms.uTime.value=t;t0+=dt;
  town.rotation.y=Math.sin(t*.1)*.15;
  const e=lerp(.8,.45,api.dim);ctx.renderer.toneMappingExposure=lerp(ctx.renderer.toneMappingExposure,e,1-Math.exp(-dt*4));
  camera.setViewOffset(ctx.w,ctx.h,-420*ctx.w/1920,-20*ctx.h/1080,ctx.w,ctx.h);
  spawn-=dt;if(spawn<=0){spawn=.5+Math.random()*.7;spawnShot()}
  for(let i=shots.length-1;i>=0;i--){const s=shots[i];s.d-=dt*9;
   s.m.position.copy(s.dir).multiplyScalar(s.d);s.m.rotation.x+=dt*4;s.tr.position.copy(s.dir).multiplyScalar(s.d+.7);s.tr.lookAt(0,0,0);s.tr.scale.z=1.6;
   if(s.d<=R){const p=s.dir.clone().multiplyScalar(R);hk=(hk+1)%4;mat.uniforms.uHit.value[hk].set(s.dir.x,s.dir.y,s.dir.z,t);
    sp.emit(p,22,{speed:3.2,color:[.5,1.8,1.2],size:.14,life:.7,gravity:-2.5});ctx.kick(.06);scene.remove(s.m);scene.remove(s.tr);shots.splice(i,1)}}
 });
 return api;
}
