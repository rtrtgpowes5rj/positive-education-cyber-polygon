import * as THREE from 'three';
import {EffectComposer,RenderPass,EffectPass,BloomEffect,SMAAEffect,SMAAPreset,ToneMappingEffect,ToneMappingMode,ChromaticAberrationEffect,DepthOfFieldEffect,Effect,BlendFunction} from 'postprocessing';
import {N8AOPostPass} from 'n8ao';
import {studio,rbox} from './kit';
import {TIER,downgrade} from './tier';
import {LineSegments2} from 'three/examples/jsm/lines/LineSegments2.js';
import {LineSegmentsGeometry} from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import {LineMaterial} from 'three/examples/jsm/lines/LineMaterial.js';
import {Text} from 'troika-three-text';
import golosLC from '../assets/golos-700-latcyr.woff?url'; // Golos 700: латиница + кириллица в одном файле (склеено fontTools)

export {THREE};
export const PAL={ink:0xece6da,red:0xfc3e24,mint:0x7fe0b5,amber:0xf2c566,bg:0x0c0d0f,dim:0x8b8d93};
export const hdr=(r,g,b)=>new THREE.Color(r,g,b);

let _gl;
export function webglOK(){
 if(_gl!==undefined)return _gl;
 try{const c=document.createElement('canvas'),g=c.getContext('webgl2');_gl=!!g;if(g){const x=g.getExtension('WEBGL_lose_context');x&&x.loseContext()}}catch(e){_gl=false}
 return _gl;
}

// ---------- цветовой грейд: холодные тени, тёплые света, мягкая S-кривая, виньетка, зерно, красная вспышка ----------
const gradeFrag=`
uniform float uVig;uniform float uGrain;uniform float uFlash;uniform float uTime;
float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void mainImage(const in vec4 inputColor,const in vec2 uv,out vec4 outputColor){
 vec3 c=inputColor.rgb;
 float l=dot(c,vec3(.2126,.7152,.0722));
 c=mix(c,c*vec3(.93,1.,1.09),(1.-smoothstep(0.,.45,l))*.55);
 c=mix(c,c*vec3(1.05,1.,.94),smoothstep(.45,1.,l)*.45);
 c=clamp(c,0.,1.);c=mix(c,c*c*(3.-2.*c),.16);
 vec2 d=uv-.5;float v=dot(d,d);
 c*=1.-v*uVig*1.35;
 c+=vec3(.55,.04,.02)*uFlash*(.25+v*2.2);
 c+=(h(uv*resolution+fract(uTime*7.13)*91.)-.5)*uGrain;
 outputColor=vec4(c,inputColor.a);
}`;
class GradeEffect extends Effect{
 constructor(){super('GradeEffect',gradeFrag,{blendFunction:BlendFunction.NORMAL,uniforms:new Map([['uVig',new THREE.Uniform(.85)],['uGrain',new THREE.Uniform(.014)],['uFlash',new THREE.Uniform(0)],['uTime',new THREE.Uniform(0)]])})}
}

// Переход ждёт, пока все живые 3D-сцены отрисуют n кадров (шейдеры скомпилированы, кадр не пустой)
export function stagesWarm(n=3,timeout=4000){
 const t0=performance.now();
 return new Promise(r=>{const f=()=>{const st=[...(window.__stages||[])].filter(c=>!c.dead);
  if(st.filter(c=>!c.paused).every(c=>(c.frames||0)>=n)||performance.now()-t0>timeout)r();else requestAnimationFrame(f)};requestAnimationFrame(f)});
}

// Сцена: рендерер + постобработка pmndrs. Набор эффектов зависит от уровня качества (tier.js):
// N8AO (мягкое затенение) → свечение по яркости → [глубина резкости] → ACES → грейд → SMAA → [аберрация]
export function createStage(parent,{bg=0x0c0d0f,fog=0.0,bloom=[0.7,0.55,0.9],shadows=true,fov=32,quality=1,ao=false,dof=false,aoRadius=1.4,aoIntensity=2.2}={}){
 const w=parent.clientWidth||1920,h=parent.clientHeight||1080;
 const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance',stencil:false,depth:false});
 const dpr=Math.min(TIER.dprCap,quality);
 renderer.setPixelRatio(dpr);renderer.setSize(w,h,false);
 renderer.toneMapping=THREE.NoToneMapping;
 if(shadows){renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap}
 renderer.domElement.className='gl-canvas';
 parent.appendChild(renderer.domElement);
 const scene=new THREE.Scene();scene.background=new THREE.Color(bg);
 if(fog)scene.fog=new THREE.FogExp2(bg,fog);
 const camera=new THREE.PerspectiveCamera(fov,w/h,0.1,300);
 const composer=new EffectComposer(renderer,{frameBufferType:THREE.HalfFloatType});
 composer.addPass(new RenderPass(scene,camera));
 let aoPass=null;
 if(ao&&TIER.ao){
  aoPass=new N8AOPostPass(scene,camera,w,h);
  Object.assign(aoPass.configuration,{aoRadius,distanceFalloff:.6,intensity:aoIntensity,aoSamples:TIER.aoHalf?12:16,denoiseSamples:TIER.aoHalf?4:8,denoiseRadius:12,halfRes:TIER.aoHalf,gammaCorrection:false,color:new THREE.Color(0,0,0)});
  composer.addPass(aoPass);
 }
 const bloomFx=new BloomEffect({intensity:bloom[0]*1.9,luminanceThreshold:Math.max(.55,bloom[2]-.12),luminanceSmoothing:.12,mipmapBlur:true,radius:.55+bloom[1]*.35,resolutionScale:TIER.bloomScale});
 let dofFx=null;
 if(dof&&TIER.dof){dofFx=new DepthOfFieldEffect(camera,{focusDistance:.02,focalLength:.04,bokehScale:0,resolutionScale:.5})}
 const tone=new ToneMappingEffect({mode:ToneMappingMode.ACES_FILMIC});
 const grade=new GradeEffect();
 composer.addPass(new EffectPass(camera,...[bloomFx,dofFx,tone,grade].filter(Boolean)));
 if(TIER.smaa)composer.addPass(new EffectPass(camera,new SMAAEffect({preset:SMAAPreset.MEDIUM})));
 const caFx=new ChromaticAberrationEffect({offset:new THREE.Vector2(0,0),radialModulation:true,modulationOffset:.15});
 const caPass=new EffectPass(camera,caFx);composer.addPass(caPass);
 // на экран выводит последний включённый проход (выключенный последний оставлял кадр чёрным)
 const toScreen=()=>{let last=null;composer.passes.forEach(p=>{p.renderToScreen=false;if(p.enabled)last=p});if(last)last.renderToScreen=true};
 caPass.enabled=false;toScreen();
 composer.setSize(w,h);

 const reg=(window.__stages=window.__stages||new Set());
 const ctx={renderer,scene,camera,composer,bloomFx,dofFx,aoPass,parent,lineMats:new Set(),updaters:[],t:0,dead:false,w,h,frames:0,
  fx:{shake:0,ab:0,flash:0},
  add(fn){ctx.updaters.push(fn);return fn},
  lineMat(color,width=1.6,opacity=1,dashed=false){
   const m=new LineMaterial({color,linewidth:width,transparent:opacity<1,opacity,dashed,dashSize:.4,gapSize:.3,worldUnits:false});
   m.resolution.set(w,h);ctx.lineMats.add(m);return m;
  },
  kick(s=1){ctx.fx.shake=Math.max(ctx.fx.shake,s)},
  aberrate(a=1){ctx.fx.ab=Math.max(ctx.fx.ab,a)},
  flashRed(a=1){ctx.fx.flash=Math.max(ctx.fx.flash,a)},
  // фокус: расстояние до объекта в мировых единицах и сила размытия (0 — выкл.)
  focus(dist,blur){if(!dofFx)return;const cm=dofFx.cocMaterial;cm.worldFocusDistance=dist;cm.worldFocusRange=Math.max(2,dist*.35);dofFx.bokehScale=blur},
  project(v){const p=v.clone().project(camera);return{x:(p.x+1)/2*ctx.w,y:(1-p.y)/2*ctx.h,z:p.z}},
  resize(){
   const W=parent.clientWidth,H=parent.clientHeight;if(!W||!H)return;
   ctx.w=W;ctx.h=H;renderer.setSize(W,H,false);composer.setSize(W,H);
   camera.aspect=W/H;camera.updateProjectionMatrix();
   ctx.lineMats.forEach(m=>m.resolution.set(W,H));
  },
  dispose(){
   if(ctx.dead)return;reg.delete(ctx);
   ctx.dead=true;cancelAnimationFrame(raf);
   scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{for(const k in m){if(m[k]&&m[k].isTexture)m[k].dispose()}m.dispose()})}});
   composer.dispose();renderer.dispose();renderer.forceContextLoss();
   if(renderer.domElement.parentNode)renderer.domElement.parentNode.removeChild(renderer.domElement);
  }
 };
 reg.add(ctx);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();ctx.lost=true;if(!ctx.dead)console.warn('webgl context lost')});
 renderer.domElement.addEventListener('webglcontextrestored',()=>{ctx.lost=false;if(!ctx.dead)console.warn('webgl context restored')});

 // прогрев: шейдеры компилируются один раз сразу после сборки сцены (за закрытым кадром перехода),
 // чтобы первые кадры не дёргались. compileAsync в three r170 падает на части материалов — не используем.
 let compiled=false;
 setTimeout(()=>{if(ctx.dead)return;try{renderer.compile(scene,camera)}catch(e){}compiled=true},0);

 let raf,last=performance.now(),acc=0,frames=0,curDpr=dpr,slow=0;
 const loop=now=>{
  if(ctx.dead)return;
  const dt=Math.max(0,Math.min(/sim/.test(location.search)?0.1:0.05,(now-last)/1000));last=now;
  if(document.hidden||!compiled||(ctx.paused&&ctx.frames>=2)){raf=requestAnimationFrame(loop);return}
  ctx.t+=dt;
  for(const f of ctx.updaters){if(ctx.dead)return;f(dt,ctx.t)}
  if(ctx.dead)return;
  const fx=ctx.fx;fx.shake*=Math.pow(0.002,dt);fx.ab*=Math.pow(0.01,dt);fx.flash*=Math.pow(0.02,dt);
  // адаптивное качество: при стабильной просадке сначала выключаем затенение, потом снижаем разрешение
  acc+=dt;frames++;if(acc>2){const avg=acc/frames;acc=0;frames=0;
   if(avg>0.034&&ctx.t>3&&!/sim/.test(location.search)){slow++;if(slow>=2){slow=0;
    if(aoPass&&aoPass.enabled){aoPass.enabled=false;toScreen()}
    else if(curDpr>.75){curDpr=Math.max(.75,curDpr-.25);renderer.setPixelRatio(curDpr);composer.setSize(ctx.w,ctx.h)}
    else downgrade()}}else slow=0}
  grade.uniforms.get('uTime').value=ctx.t;grade.uniforms.get('uFlash').value=fx.flash;
  const ab=fx.ab*0.0028,caOn=ab>0.00015;if(caOn!==caPass.enabled){caPass.enabled=caOn;toScreen()}if(caOn)caFx.offset.set(ab,ab*.6);
  // фон за интерфейсом можно рисовать реже (ctx.throttle): он размыт и почти неподвижен
  ctx.tick=(ctx.tick||0)+1;
  if(!ctx.lost&&(!(ctx.throttle>1)||ctx.tick%ctx.throttle===0||ctx.frames<3)){composer.render(dt);ctx.frames++}
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
// Подпись в 3D: SDF-текст (troika) шрифтом Golos — чёткий на любом масштабе и в перспективе.
// Шрифт собирается из локальных файлов латиницы и кириллицы (стенд может быть без интернета).
// Всегда повёрнута к камере, под текстом — скруглённая подложка.
const _q=new THREE.Quaternion(),_pq=new THREE.Quaternion();
function pillGeo(w,h){const r=h/2,x=-w/2,y=-h/2,sh=new THREE.Shape();sh.moveTo(x+r,y);sh.lineTo(x+w-r,y);sh.absarc(x+w-r,0,r,-Math.PI/2,Math.PI/2);sh.lineTo(x+r,y+h);sh.absarc(x+r,0,r,Math.PI/2,Math.PI*1.5);return new THREE.ShapeGeometry(sh,12)}
export function labelSprite(text,{color='#ece6da',size=1.6,onTop=true,pill=true,weight}={}){
 const g=new THREE.Group();
 const t=new Text();t.text=text;t.font=golosLC;t.fontSize=size*.4;t.color=new THREE.Color(color);t.anchorX='center';t.anchorY='middle';t.letterSpacing=-.005;t.sdfGlyphSize=64;
 if(!pill){t.outlineWidth='8%';t.outlineColor=0x000000;t.outlineOpacity=.55}
 t.renderOrder=onTop?22:0;g.add(t);
 t.sync(()=>{const tm=t.material;if(onTop){tm.depthTest=false;tm.depthWrite=false}
  if(!pill)return;const b=t.textRenderInfo&&t.textRenderInfo.blockBounds;if(!b)return;
  const w=(b[2]-b[0])+size*.36,h=(b[3]-b[1])+size*.2;
  const bgm=new THREE.MeshBasicMaterial({color:0x090a0c,transparent:true,opacity:.74,depthTest:!onTop,depthWrite:false,toneMapped:false});
  const plate=new THREE.Mesh(pillGeo(w,h),bgm);plate.position.z=-.002;plate.renderOrder=onTop?21:0;g.add(plate);
  const edge=new THREE.Mesh(pillGeo(w+size*.02,h+size*.02),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.1,depthTest:!onTop,depthWrite:false,toneMapped:false}));edge.position.z=-.003;edge.renderOrder=onTop?20:0;g.add(edge)});
 // поворот к камере прямо перед отрисовкой (с учётом поворота родителей)
 const own=t.onBeforeRender;t.onBeforeRender=function(r,sc,cam,...rest){g.parent?g.parent.getWorldQuaternion(_pq).invert():_pq.identity();g.quaternion.copy(_pq.multiply(cam.getWorldQuaternion(_q)));g.updateMatrixWorld(true);return own&&own.call(this,r,sc,cam,...rest)};
 return g;
}

// базовая сцена для панелей: свет, тёмный пол, камера
export function panelScene(parent,{quality=1,pos=[0,8,12],look=[0,1,0],fov=34,bloom=[0.6,0.5,0.9],bg=0x0e0f12,sway=0}={}){
 const ctx=createStage(parent,{bg,fog:0.026,quality,bloom,ao:true,aoRadius:1.1,aoIntensity:2});
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
