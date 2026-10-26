import * as THREE from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass.js';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js';
import {studio,rbox} from './kit';
import {SMAAPass} from 'three/examples/jsm/postprocessing/SMAAPass.js';
import {LineSegments2} from 'three/examples/jsm/lines/LineSegments2.js';
import {LineSegmentsGeometry} from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import {LineMaterial} from 'three/examples/jsm/lines/LineMaterial.js';

export {THREE};
export const PAL={ink:0xece6da,red:0xfc3e24,mint:0x7fe0b5,amber:0xf2c566,bg:0x0c0d0f,dim:0x8b8d93};
export const hdr=(r,g,b)=>new THREE.Color(r,g,b);

let _gl;
export function webglOK(){
 if(_gl!==undefined)return _gl;
 try{const c=document.createElement('canvas'),g=c.getContext('webgl2');_gl=!!g;if(g){const x=g.getExtension('WEBGL_lose_context');x&&x.loseContext()}}catch(e){_gl=false}
 return _gl;
}

// ---------- финальный проход: аберрация, виньетка, зерно ----------
const FinalShader={
 uniforms:{tDiffuse:{value:null},uTime:{value:0},uAb:{value:0.0003},uVig:{value:0.85},uGrain:{value:0.0},uFlash:{value:0},uRes:{value:new THREE.Vector2(1920,1080)}},
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:`
 uniform sampler2D tDiffuse;uniform float uTime,uAb,uVig,uGrain,uFlash;uniform vec2 uRes;varying vec2 vUv;
 float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
 void main(){
  vec2 c=vUv-.5;float d=dot(c,c);
  vec2 off=c*uAb*(.5+d*3.);
  vec3 col=vec3(texture2D(tDiffuse,vUv+off).r,texture2D(tDiffuse,vUv).g,texture2D(tDiffuse,vUv-off).b);
  col*=1.-d*uVig*1.5;
  col+=vec3(.55,.04,.02)*uFlash*(.25+d*2.2);
  float g=h(vUv*uRes)-.5;
  col+=g*uGrain;
  gl_FragColor=vec4(col,1.);
 }`
};

export function createStage(parent,{bg=0x0c0d0f,fog=0.0,bloom=[0.7,0.55,0.9],shadows=true,fov=32,quality=1,maxDpr=2}={}){
 const w=parent.clientWidth||1920,h=parent.clientHeight||1080;
 const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'});
 const dpr=Math.min(maxDpr,1.5,quality);
 renderer.setPixelRatio(dpr);renderer.setSize(w,h,false);
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 if(shadows){renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap}
 renderer.domElement.className='gl-canvas';
 parent.appendChild(renderer.domElement);
 const scene=new THREE.Scene();scene.background=new THREE.Color(bg);
 if(fog)scene.fog=new THREE.FogExp2(bg,fog);
 const camera=new THREE.PerspectiveCamera(fov,w/h,0.1,300);
 const rt=new THREE.WebGLRenderTarget(w*dpr,h*dpr,{type:THREE.HalfFloatType});
 const composer=new EffectComposer(renderer,rt);
 composer.addPass(new RenderPass(scene,camera));
 const bloomPass=new UnrealBloomPass(new THREE.Vector2(w,h),bloom[0],bloom[1],bloom[2]);
 composer.addPass(bloomPass);
 composer.addPass(new OutputPass());
 composer.addPass(new SMAAPass(w*dpr,h*dpr));
 const finalPass=new ShaderPass(FinalShader);finalPass.uniforms.uRes.value.set(w,h);
 composer.addPass(finalPass);
 composer.setSize(w,h);

 const reg=(window.__stages=window.__stages||new Set());
 const ctx={renderer,scene,camera,composer,bloomPass,finalPass,parent,lineMats:new Set(),updaters:[],t:0,dead:false,w,h,
  fx:{shake:0,ab:0,flash:0},
  add(fn){ctx.updaters.push(fn);return fn},
  lineMat(color,width=1.6,opacity=1,dashed=false){
   const m=new LineMaterial({color,linewidth:width,transparent:opacity<1,opacity,dashed,dashSize:.4,gapSize:.3,worldUnits:false});
   m.resolution.set(w,h);ctx.lineMats.add(m);return m;
  },
  kick(s=1){ctx.fx.shake=Math.max(ctx.fx.shake,s)},
  aberrate(a=1){ctx.fx.ab=Math.max(ctx.fx.ab,a)},
  flashRed(a=1){ctx.fx.flash=Math.max(ctx.fx.flash,a)},
  project(v){const p=v.clone().project(camera);return{x:(p.x+1)/2*w,y:(1-p.y)/2*h,z:p.z}},
  resize(){
   const W=parent.clientWidth,H=parent.clientHeight;if(!W||!H)return;
   ctx.w=W;ctx.h=H;renderer.setSize(W,H,false);composer.setSize(W,H);
   camera.aspect=W/H;camera.updateProjectionMatrix();finalPass.uniforms.uRes.value.set(W,H);
   ctx.lineMats.forEach(m=>m.resolution.set(W,H));
  },
  dispose(){
   if(ctx.dead)return;reg.delete(ctx);
   ctx.dead=true;cancelAnimationFrame(raf);
   scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{for(const k in m){if(m[k]&&m[k].isTexture)m[k].dispose()}m.dispose()})}});
   composer.dispose();rt.dispose();renderer.dispose();renderer.forceContextLoss();
   if(renderer.domElement.parentNode)renderer.domElement.parentNode.removeChild(renderer.domElement);
  }
 };
 reg.add(ctx);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();ctx.lost=true;if(!ctx.dead)console.warn('webgl context lost')});
 renderer.domElement.addEventListener('webglcontextrestored',()=>{ctx.lost=false;if(!ctx.dead)console.warn('webgl context restored')});
 let raf,last=performance.now(),acc=0,frames=0,curDpr=dpr,drops=0;
 const loop=now=>{
  if(ctx.dead)return;
  const dt=Math.min(/sim/.test(location.search)?0.1:0.05,(now-last)/1000);last=now;ctx.t+=dt;
  if(document.hidden||ctx.paused){raf=requestAnimationFrame(loop);return}
  for(const f of ctx.updaters){if(ctx.dead)return;f(dt,ctx.t)}
  if(ctx.dead)return;
  const fx=ctx.fx;fx.shake*=Math.pow(0.002,dt);fx.ab*=Math.pow(0.01,dt);fx.flash*=Math.pow(0.02,dt);
  acc+=dt;frames++;if(acc>2.5){const avg=acc/frames;acc=0;frames=0;if(avg>0.045&&curDpr>0.8&&drops<2&&ctx.t<12){drops++;curDpr=Math.max(0.8,curDpr-0.3);renderer.setPixelRatio(curDpr);composer.setPixelRatio(curDpr)}}
  finalPass.uniforms.uTime.value=ctx.t;finalPass.uniforms.uAb.value=0.0003+fx.ab*0.0028;finalPass.uniforms.uFlash.value=fx.flash;
  if(!ctx.lost)composer.render(dt);
  raf=requestAnimationFrame(loop);
 };
 raf=requestAnimationFrame(loop);
 let rz=0,lw=0,lh=0;const ro=new ResizeObserver(()=>{cancelAnimationFrame(rz);rz=requestAnimationFrame(()=>{const W=parent.clientWidth,H=parent.clientHeight;if(Math.abs(W-lw)<2&&Math.abs(H-lh)<2)return;lw=W;lh=H;ctx.resize()})});ro.observe(parent);
 const dispose0=ctx.dispose;ctx.dispose=()=>{ro.disconnect();dispose0()};
 return ctx;
}

// ---------- материалы ----------
let gradient;
export function gradientMap(){
 if(gradient)return gradient;
 const d=new Uint8Array([70,130,200,255]);
 gradient=new THREE.DataTexture(d,4,1,THREE.RedFormat);gradient.minFilter=gradient.magFilter=THREE.NearestFilter;gradient.needsUpdate=true;return gradient;
}
// физически корректный материал вместо мультяшного: светлые цвета — матовый пластик, тёмные — анодированный металл
export const toon=(color,extra={})=>{
 const c=new THREE.Color(color),l=(c.r+c.g+c.b)/3;
 const {gradientMap:_g,...rest}=extra;
 const m=new THREE.MeshStandardMaterial({color,roughness:l>.5?.42:.38,metalness:l>.5?.12:.6,...rest});
 m.userData.base=m.emissive.clone();return m;
};
export const glow=(r,g,b,extra={})=>new THREE.MeshBasicMaterial({color:hdr(r,g,b),toneMapped:false,...extra});

// контур «пером»: плотные линии по рёбрам меша
// Раньше — чёрный контур «пером». Теперь контура нет: возвращаем «прокси», через который код по-прежнему
// может подсветить объект цветом (setHex) — подсветка идёт свечением корпуса.
const BASE_HEX=new Set([0x121316,0xece6da,0x80858f]);
export function outline(ctx,mesh,color=PAL.ink){
 const mt=Array.isArray(mesh.material)?mesh.material[0]:mesh.material;
 if(mt&&mt.emissive&&!mt.userData.base)mt.userData.base=mt.emissive.clone();
 const set=h=>{if(!mt||!mt.emissive)return;const b=mt.userData.base||new THREE.Color(0);if(BASE_HEX.has(h)){mt.emissive.copy(b);return}mt.emissive.copy(b).lerp(new THREE.Color(h),.42)};
 return{material:{color:{setHex:set}},isProxy:true};
}

// ---------- текстуры ----------
export function canvasTex(w,h,draw){
 const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');draw(g,w,h);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}
let glowT;
export function glowTexture(){
 if(glowT)return glowT;
 glowT=canvasTex(128,128,(g,w,h)=>{const r=g.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.18,'rgba(255,255,255,.55)');r.addColorStop(.45,'rgba(255,255,255,.14)');r.addColorStop(.75,'rgba(255,255,255,.02)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,w,h)});
 return glowT;
}
export function sprite(color,size,opacity=1){
 const m=new THREE.SpriteMaterial({map:glowTexture(),color,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity,toneMapped:false});
 const s=new THREE.Sprite(m);s.scale.setScalar(size);return s;
}

// ---------- искры (пул частиц) ----------
export class Sparks{
 constructor(ctx,max=1800){
  this.max=max;this.i=0;this.ctx=ctx;
  const g=new THREE.BufferGeometry();
  this.pos=new Float32Array(max*3);this.col=new Float32Array(max*3);this.size=new Float32Array(max);this.alpha=new Float32Array(max);
  this.vel=new Float32Array(max*3);this.life=new Float32Array(max);this.max_life=new Float32Array(max);this.grav=new Float32Array(max);this.s0=new Float32Array(max);
  g.setAttribute('position',new THREE.BufferAttribute(this.pos,3));g.setAttribute('aColor',new THREE.BufferAttribute(this.col,3));
  g.setAttribute('aSize',new THREE.BufferAttribute(this.size,1));g.setAttribute('aAlpha',new THREE.BufferAttribute(this.alpha,1));
  const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
   uniforms:{uScale:{value:ctx.h*0.5}},
   vertexShader:'attribute vec3 aColor;attribute float aSize;attribute float aAlpha;varying vec3 vC;varying float vA;uniform float uScale;void main(){vC=aColor;vA=aAlpha;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=aSize*uScale/-mv.z;gl_Position=projectionMatrix*mv;}',
   fragmentShader:'varying vec3 vC;varying float vA;void main(){vec2 c=gl_PointCoord-.5;float d=length(c);if(d>.5)discard;float a=smoothstep(.5,0.,d);gl_FragColor=vec4(vC*a*vA,a*vA);}'});
  this.points=new THREE.Points(g,m);this.points.frustumCulled=false;ctx.scene.add(this.points);
  for(let k=0;k<max;k++){this.pos[k*3+1]=-999}
  ctx.add(dt=>this.update(dt));
 }
 emit(o,n,{speed=3,spread=1,dir=null,color=[1,.4,.2],size=.12,life=.7,gravity=-4,up=0}={}){
  for(let k=0;k<n;k++){
   const i=this.i;this.i=(this.i+1)%this.max;
   const a=Math.random()*Math.PI*2,b=Math.acos(2*Math.random()-1),s=speed*(.3+Math.random()*.9);
   let vx=Math.sin(b)*Math.cos(a),vy=Math.cos(b)*.8+up,vz=Math.sin(b)*Math.sin(a);
   if(dir){vx=dir.x+vx*spread;vy=dir.y+vy*spread;vz=dir.z+vz*spread}
   this.pos[i*3]=o.x;this.pos[i*3+1]=o.y;this.pos[i*3+2]=o.z;
   this.vel[i*3]=vx*s;this.vel[i*3+1]=vy*s;this.vel[i*3+2]=vz*s;
   this.col[i*3]=color[0];this.col[i*3+1]=color[1];this.col[i*3+2]=color[2];
   this.s0[i]=size*(.6+Math.random()*.8);this.size[i]=this.s0[i];this.life[i]=this.max_life[i]=life*(.6+Math.random()*.8);this.grav[i]=gravity;this.alpha[i]=1;
  }
 }
 update(dt){
  const {pos,vel,life,max_life,size,alpha,grav,s0}=this;
  for(let i=0;i<this.max;i++){
   if(life[i]<=0){if(pos[i*3+1]>-900)pos[i*3+1]=-999;continue}
   life[i]-=dt;
   vel[i*3+1]+=grav[i]*dt;
   pos[i*3]+=vel[i*3]*dt;pos[i*3+1]+=vel[i*3+1]*dt;pos[i*3+2]+=vel[i*3+2]*dt;
   const k=Math.max(0,life[i]/max_life[i]);alpha[i]=k;size[i]=s0[i]*(.4+k*.6);
  }
  const g=this.points.geometry;g.attributes.position.needsUpdate=true;g.attributes.aSize.needsUpdate=true;g.attributes.aAlpha.needsUpdate=true;g.attributes.aColor.needsUpdate=true;
  this.points.material.uniforms.uScale.value=this.ctx.h*0.5;
 }
}

// ---------- кольцевые ударные волны ----------
export class Rings{
 constructor(ctx,n=24){
  this.ctx=ctx;this.items=[];
  const geo=new THREE.RingGeometry(.92,1,64);
  for(let i=0;i<n;i++){
   const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));
   m.visible=false;m.rotation.x=-Math.PI/2;ctx.scene.add(m);this.items.push({m,t:1,dur:1,r:1});
  }
  this.k=0;ctx.add(dt=>{for(const it of this.items){if(it.t>=1){it.m.visible=false;continue}
   it.t+=dt/it.dur;const e=1-Math.pow(1-Math.min(1,it.t),3);it.m.scale.setScalar(.2+e*it.r);it.m.material.opacity=(1-it.t)*.9;if(it.t>=1)it.m.visible=false}});
 }
 fire(pos,color,r=3,dur=.9,flat=true){
  const it=this.items[this.k];this.k=(this.k+1)%this.items.length;
  it.t=0;it.dur=dur;it.r=r;it.m.visible=true;it.m.position.copy(pos);it.m.material.color.copy(color instanceof THREE.Color?color:hdr(...color));
  it.m.rotation.set(flat?-Math.PI/2:0,0,0);if(!flat)it.m.lookAt(this.ctx.camera.position);
 }
}

export const ease={out3:t=>1-Math.pow(1-t,3),inOut:t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2,back:t=>{const c=1.70158+1;return 1+c*Math.pow(t-1,3)+1.70158*Math.pow(t-1,2)}};
export const lerp=(a,b,t)=>a+(b-a)*t;

// ---------- подписи в 3D ----------
export function labelSprite(text,{color='#ece6da',size=1.6,font='700 40px sans-serif',bg=null,onTop=true,pill=true}={}){
 const w=640,h=160,k=2; // текстура 2x: чёткий текст без «дрожания»
 const t=canvasTex(w,h,(g)=>{
  if(bg){g.fillStyle=bg;g.fillRect(0,0,w,h)}
  let px=parseInt(font.match(/(\d+)px/)[1])*k;const mk=p=>font.replace(/\d+px/,p+'px');
  g.font=mk(px);while(g.measureText(text).width>w-40&&px>18){px-=2;g.font=mk(px)}
  g.textAlign='center';g.textBaseline='middle';
  if(pill){const tw=Math.min(w-8,g.measureText(text).width+px*.9),th=Math.min(h-8,px*1.35),x0=(w-tw)/2,y0=(h-th)/2,rr=th*.32;
   g.fillStyle='rgba(9,10,12,.72)';g.beginPath();g.moveTo(x0+rr,y0);g.arcTo(x0+tw,y0,x0+tw,y0+th,rr);g.arcTo(x0+tw,y0+th,x0,y0+th,rr);g.arcTo(x0,y0+th,x0,y0,rr);g.arcTo(x0,y0,x0+tw,y0,rr);g.closePath();g.fill();
   g.strokeStyle='rgba(255,255,255,.12)';g.lineWidth=3;g.stroke()}
  g.fillStyle=color;g.shadowColor='#000';g.shadowBlur=pill?0:14;g.fillText(text,w/2,h/2+4);
 });
 t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;t.anisotropy=8;
 const m=new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false,depthTest:!onTop,toneMapped:false});
 const s=new THREE.Sprite(m);s.scale.set(size*4,size,1);if(onTop)s.renderOrder=20;return s;
}

// базовая сцена для панелей: свет, тёмный пол, камера
export function panelScene(parent,{quality=1,pos=[0,8,12],look=[0,1,0],fov=34,bloom=[0.6,0.5,0.9],bg=0x0e0f12,sway=0}={}){
 const ctx=createStage(parent,{bg,fog:0.026,quality,bloom});
 const {scene,camera}=ctx;
 studio(ctx.renderer,scene,{intensity:.45});
 scene.add(new THREE.HemisphereLight(0x9aa6c4,0x1a1410,0.35));
 const key=new THREE.DirectionalLight(0xfff0dc,2.3);key.position.set(-6,14,9);key.castShadow=true;key.shadow.mapSize.set(1024,1024);
 Object.assign(key.shadow.camera,{left:-14,right:14,top:14,bottom:-14,near:1,far:50});key.shadow.bias=-0.001;key.shadow.normalBias=.03;scene.add(key);
 const rim=new THREE.DirectionalLight(0x6f8cff,1.0);rim.position.set(8,6,-10);scene.add(rim);
 const dot=canvasTex(64,64,(g,w,h)=>{g.fillStyle='#1b1e23';g.fillRect(0,0,w,h);g.fillStyle='#394049';g.beginPath();g.arc(32,32,2.2,0,7);g.fill()});
 dot.wrapS=dot.wrapT=THREE.RepeatWrapping;dot.repeat.set(30,30);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(260,260),new THREE.MeshStandardMaterial({color:0x15181c,roughness:.8,metalness:.25}));
 const fg=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.MeshBasicMaterial({map:glowTexture(),color:hdr(.18,.22,.32),transparent:true,opacity:.5,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));fg.rotation.x=-Math.PI/2;fg.position.y=.01;scene.add(fg);floor.rotation.x=-Math.PI/2;floor.position.y=-.02;floor.receiveShadow=true;scene.add(floor);
 const P=new THREE.Vector3(...pos),L=new THREE.Vector3(...look);
 camera.fov=fov;camera.updateProjectionMatrix();
 ctx.add((dt,t)=>{camera.position.set(P.x+Math.sin(t*.2)*sway,P.y+Math.sin(t*.27)*sway*.4,P.z+Math.cos(t*.17)*sway*.5);camera.lookAt(L);const sh=ctx.fx.shake;if(sh>.001)camera.position.x+=(Math.random()-.5)*sh*.4});
 ctx.sparks=new Sparks(ctx,900);ctx.rings=new Rings(ctx,12);
 return ctx;
}
export const OL=0x121316,BONE=0xd9d4c9,STEEL=0xbfc3c9;
export function box(ctx,parent,w,h,d,color,pos,{edge=true,ow=2,cast=true}={}){
 const m=new THREE.Mesh(rbox(w,h,d,Math.min(.08,Math.min(w,h,d)*.18)),toon(color));m.position.set(...pos);m.castShadow=cast;m.receiveShadow=true;parent.add(m);
 if(edge)m.userData.ol=outline(ctx,m,OL,ow,1);return m;
}
export function tubeAlong(points,r=.05,color=0x7c818b){
 const path=new THREE.CurvePath();for(let i=1;i<points.length;i++)path.add(new THREE.LineCurve3(points[i-1].clone(),points[i].clone()));
 const g=new THREE.TubeGeometry(path,Math.max(8,points.length*12),r,6,false);
 return{mesh:new THREE.Mesh(g,new THREE.MeshStandardMaterial({color,roughness:.35,metalness:.7})),path};
}
