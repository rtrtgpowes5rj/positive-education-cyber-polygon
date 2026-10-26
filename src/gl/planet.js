import * as THREE from 'three';
import {feature} from 'topojson-client';
import landTopo from 'world-atlas/land-110m.json';

// «Кубическая Земля» Positive Education: суша собрана из тысяч кубиков-тайлов (отсылка к кубу PT),
// океан — тёмный обсидиан с гравировкой координатной сетки, атмосфера — холодный ободок.
// Всё процедурное, без текстур. Удары атак расходятся волной по кубикам и кольцом по океану,
// кубики под пальцем приподнимаются и подсвечиваются.

const D2R=Math.PI/180;
const HITS=8;

// маска суши из world-atlas → equirect 2048×1024
function landMask(){
 const W=2048,H=1024,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
 g.fillStyle='#000';g.fillRect(0,0,W,H);g.fillStyle='#fff';
 const f=feature(landTopo,landTopo.objects.land);
 const geoms=f.type==='FeatureCollection'?f.features.map(x=>x.geometry):[f.geometry||f];
 const X=lon=>(lon+180)/360*W,Y=lat=>(90-lat)/180*H;
 g.beginPath();
 for(const geo of geoms){const polys=geo.type==='Polygon'?[geo.coordinates]:geo.coordinates;
  for(const p of polys)for(const ring of p){ring.forEach(([lo,la],i)=>i?g.lineTo(X(lo),Y(la)):g.moveTo(X(lo),Y(la)));g.closePath()}}
 g.fill('evenodd');
 const d=g.getImageData(0,0,W,H).data;
 return(lat,lon)=>{const x=Math.min(W-1,Math.floor((lon+180)/360*W)),y=Math.min(H-1,Math.floor((90-lat)/180*H));return d[(y*W+x)*4]>128};
}

// крупные узлы — там ярче огни и выше «застройка»
const HUBS=[[55.75,37.62],[59.94,30.31],[56.84,60.6],[55.03,82.92],[43.1,131.9],[51.5,-.12],[48.86,2.35],[52.52,13.4],[41.9,12.5],[40.4,-3.7],[50.45,30.52],[41.01,28.98],[25.2,55.27],[24.7,46.7],[30.04,31.23],[6.5,3.4],[-26.2,28.04],[-1.29,36.82],[19.07,72.88],[28.61,77.2],[12.97,77.59],[13.75,100.5],[1.35,103.82],[22.3,114.17],[31.23,121.47],[39.9,116.4],[37.57,126.98],[35.68,139.69],[-33.87,151.2],[-37.81,144.96],[40.71,-74],[41.88,-87.63],[34.05,-118.24],[37.77,-122.42],[47.6,-122.33],[43.65,-79.38],[19.43,-99.13],[-23.55,-46.63],[-34.6,-58.38],[4.71,-74.07],[-12.05,-77.04],[45.5,-73.57],[29.76,-95.37],[25.76,-80.19]];

// шум без зависимостей: гладкая сумма синусов по сфере
const nz=(x,y,z)=>{
 let v=0,a=1,f=1.3;
 for(let i=0;i<4;i++){v+=a*Math.sin(x*f+1.7*i)*Math.sin(y*f*1.13+.6*i)*Math.sin(z*f*.91+2.3*i+Math.sin(x*f*.5));a*=.5;f*=2.07}
 return v;
};

const tileVert=`
 attribute float aSeed;attribute float aCity;attribute float aIce;attribute float aHome;attribute float aWarm;
 uniform float uTime;uniform vec4 uHit[${HITS}];uniform vec3 uPtr;uniform float uPtrOn;uniform float uRise;
 varying vec3 vN;varying vec3 vW;varying vec2 vUv;varying float vTop;varying float vHeat;varying float vPtr;
 varying float vCity;varying float vIce;varying float vSeed;varying vec3 vDir;varying float vHome;varying float vY;varying float vWarm;
 void main(){
  vec3 base=(instanceMatrix*vec4(0.,0.,0.,1.)).xyz;vec3 dir=normalize(base);
  float heat=0.;
  for(int i=0;i<${HITS};i++){float t0=uHit[i].w;if(t0>0.){float tt=uTime-t0;
   float ang=acos(clamp(dot(dir,uHit[i].xyz),-1.,1.));float q=(ang-tt*.62)*16.;heat+=exp(-q*q)*exp(-tt*1.25)*step(0.,tt);}}
  float pd=distance(dir,uPtr);float ptr=exp(-pd*pd*90.)*uPtrOn;
  // появление: кубики вырастают от цели по планете
  float grow=clamp(uRise*1.6-aSeed*.6,0.,1.);
  vec4 wp=instanceMatrix*vec4(position,1.);
  float lift=heat*.24+ptr*.34;
  wp.xyz+=dir*position.y*lift;
  wp.xyz=mix(base,wp.xyz,grow);
  vec4 w=modelMatrix*wp;vW=w.xyz;
  vN=normalize(mat3(modelMatrix)*mat3(instanceMatrix)*normal);
  vDir=normalize(mat3(modelMatrix)*dir);
  vUv=uv;vTop=step(.5,normal.y);vHeat=heat;vPtr=ptr;vCity=aCity;vIce=aIce;vSeed=aSeed;vHome=aHome;vY=position.y;vWarm=aWarm;
  gl_Position=projectionMatrix*viewMatrix*w;
 }`;
const tileFrag=`
 uniform vec3 uL;uniform float uTime;
 varying vec3 vN;varying vec3 vW;varying vec2 vUv;varying float vTop;varying float vHeat;varying float vPtr;
 varying float vCity;varying float vIce;varying float vSeed;varying vec3 vDir;varying float vHome;varying float vY;varying float vWarm;
 void main(){
  vec3 N=normalize(vN),V=normalize(cameraPosition-vW);
  float day=smoothstep(-.18,.32,dot(vDir,uL));
  float ndl=max(dot(N,uL),0.);
  vec3 H=normalize(uL+V);float spec=pow(max(dot(N,H),0.),48.)*.5;
  // фаска: светлая кромка по краю верхней грани
  vec2 e2=min(vUv,1.-vUv);float edge=smoothstep(.12,0.,min(e2.x,e2.y));
  vec3 side=vec3(.006,.007,.009);
  vec3 top=mix(mix(vec3(.018,.022,.03),vec3(.06,.046,.032),vWarm)*(.8+vSeed*.45),vec3(.3,.34,.4),vIce);
  vec3 alb=mix(side*(.55+.45*vY),top,vTop);
  vec3 col=alb*(.12+ndl*2.6*day)+spec*day*vec3(1.,.9,.78)*.35+edge*vTop*(.004+ndl*.12*day)*vec3(.85,.9,1.);
  // ночные огни: тёплые точки в центре верхних граней
  vec2 c=vUv-.5;float dot_=smoothstep(.22,.05,length(c));
  float tw=.75+.25*sin(uTime*1.7+vSeed*40.);
  col+=vTop*dot_*vCity*(1.-day)*tw*vec3(2.4,1.35,.55);
  col+=vTop*vCity*(1.-day)*.012*vec3(1.,.6,.25);
  // своя сеть — мятная подсветка периметра
  col+=vHome*(vTop*edge*1.2+.03)*vec3(.3,1.6,1.1);
  // удар атаки и касание пальцем
  col+=vHeat*(vTop*.9+.35)*vec3(3.,.45,.22);
  col+=vPtr*(vTop*edge*1.6+vTop*.35+.1)*vec3(.4,1.9,1.3);
  gl_FragColor=vec4(col,1.);
 }`;

const oceanVert=`varying vec3 vN;varying vec3 vW;varying vec3 vP;void main(){vP=position;vN=normalize(mat3(modelMatrix)*normal);vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
const oceanFrag=`
 uniform vec3 uL;uniform float uTime,uR;uniform vec4 uHit[${HITS}];
 varying vec3 vN;varying vec3 vW;varying vec3 vP;
 float line(float x,float w){float f=abs(fract(x)-.5);float d=fwidth(x)*1.2;return smoothstep(.5-d*1.5,.5,f+w*0.);}
 void main(){
  vec3 N=normalize(vN),V=normalize(cameraPosition-vW);
  float ndl=dot(N,uL);float day=smoothstep(-.2,.35,ndl);
  float fr=pow(1.-max(dot(N,V),0.),3.);
  vec3 deep=vec3(.0016,.0022,.0036),lit=vec3(.006,.011,.022);
  vec3 col=mix(deep,lit,day*max(ndl,0.));
  vec3 H=normalize(uL+V);float g=pow(max(dot(N,H),0.),220.)*.5+pow(max(dot(N,H),0.),30.)*.025;
  col+=g*day*vec3(1.,.88,.74);
  // гравировка сетки координат: 10°
  vec3 d=normalize(vP);float lat=asin(d.y)*57.2958,lon=atan(d.z,d.x)*57.2958;
  float grid=max(line(lat/15.,0.),line(lon/15.,0.));
  col+=grid*vec3(.011,.017,.034)*(.4+.6*day)*(1.-fr);
  // кольца ударов по океану
  float hit=0.;
  for(int i=0;i<${HITS};i++){float t0=uHit[i].w;if(t0>0.){float tt=uTime-t0;float ang=acos(clamp(dot(d,uHit[i].xyz),-1.,1.));
   float q=(ang-tt*.62)*60.;hit+=exp(-q*q)*exp(-tt*1.3)*step(0.,tt);}}
  col+=hit*vec3(2.2,.35,.18)*.8;
  col+=fr*vec3(.012,.03,.08)*(.25+.75*day);
  gl_FragColor=vec4(col,1.);
 }`;

const atmoVert='varying vec3 vN;varying vec3 vW;void main(){vN=normalize(mat3(modelMatrix)*normal);vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}';
const atmoFrag=`uniform vec3 uL;uniform vec3 uColor;uniform float uP,uK,uBack;varying vec3 vN;varying vec3 vW;
 void main(){vec3 N=normalize(vN),V=normalize(cameraPosition-vW);float nv=abs(dot(N,V));float f=uBack>.5?pow(smoothstep(0.,uK,nv),uP)*.55:pow(clamp(uK-nv,0.,1.),uP);
  float sun=smoothstep(-.5,.6,dot(N,uL));vec3 c=uColor*(.25+.95*sun)+vec3(.9,.45,.2)*pow(max(0.,1.-abs(dot(N,uL)+.05)*3.),2.)*.35;
  gl_FragColor=vec4(c*f,f);}`;

export function buildPlanet(globe,{R=5,step=1.5,target=null,homeR=7}={}){
 const isLand=landMask();
 const L=new THREE.Vector3(-.8,.38,.42).normalize();
 const hit=[...Array(HITS)].map(()=>new THREE.Vector4(0,1,0,-1));let hk=0;
 const common={uL:{value:L},uTime:{value:0},uHit:{value:hit}};

 // океан
 const ocean=new THREE.Mesh(new THREE.SphereGeometry(R,128,96),new THREE.ShaderMaterial({uniforms:{...common,uR:{value:R}},vertexShader:oceanVert,fragmentShader:oceanFrag}));
 globe.add(ocean);

 // тайлы суши
 const cells=[];
 const tDir=target?target.clone().normalize():null;
 for(let lat=-84+step/2;lat<84;lat+=step){
  const n=Math.max(6,Math.round(360*Math.cos(lat*D2R)/step));
  const off=(Math.round(lat/step)%2)*.5;
  for(let k=0;k<n;k++){
   const lon=-180+(k+off)*360/n;
   if(!isLand(lat,lon))continue;
   cells.push([lat,lon]);
  }
 }
 const N=cells.length;
 const geo=new THREE.BoxGeometry(1,1,1);geo.translate(0,.5,0);
 const warm=new Float32Array(N),seed=new Float32Array(N),city=new Float32Array(N),ice=new Float32Array(N),home=new Float32Array(N);
 const mat=new THREE.ShaderMaterial({uniforms:{...common,uPtr:{value:new THREE.Vector3(0,9,0)},uPtrOn:{value:0},uRise:{value:1}},vertexShader:tileVert,fragmentShader:tileFrag});
 const tiles=new THREE.InstancedMesh(geo,mat,N);tiles.frustumCulled=false;
 const m=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3(),up=new THREE.Vector3(0,1,0),p=new THREE.Vector3(),twist=new THREE.Quaternion();
 const w=R*step*D2R*.84;
 const hubs=HUBS.map(([a,b])=>{const ph=(90-a)*D2R,th=(b+180)*D2R;return new THREE.Vector3(-Math.sin(ph)*Math.cos(th),Math.cos(ph),Math.sin(ph)*Math.sin(th))});
 cells.forEach(([lat,lon],i)=>{
  const ph=(90-lat)*D2R,th=(lon+180)*D2R;
  const dir=new THREE.Vector3(-Math.sin(ph)*Math.cos(th),Math.cos(ph),Math.sin(ph)*Math.sin(th));
  // рельеф: хребты по шуму + выше в глубине материков
  const r=nz(dir.x*3,dir.y*3,dir.z*3);
  let hub=0;for(const h of hubs){const dd=dir.distanceTo(h);hub=Math.max(hub,Math.exp(-dd*dd*900))}
  const rnd=Math.abs(Math.sin(i*12.9898+lat*78.233)*43758.5453)%1;
  let h=.04+Math.max(0,r)*.2+rnd*.03;
  if(hub>.3)h+=hub*.34*(.4+rnd);
  const polar=Math.abs(lat)>62?1:0;
  ice[i]=polar||(r>.62?.55:0);
  city[i]=Math.min(1,hub*1.4+(rnd>.86&&!polar?.55:0));
  seed[i]=rnd;warm[i]=Math.max(0,Math.min(1,1-Math.abs(lat-18)/40+nz(dir.x*5+3,dir.y*5,dir.z*5)*.35));
  if(tDir){const dd=dir.angleTo(tDir)/D2R;home[i]=dd<homeR?1-dd/homeR*.6:0}
  // ориентация: «вверх» по нормали, грани вдоль параллелей
  q.setFromUnitVectors(up,dir);
  const east=new THREE.Vector3(-Math.sin(th),0,-Math.cos(th));const ex=new THREE.Vector3(1,0,0).applyQuaternion(q);
  const ang=Math.atan2(ex.clone().cross(east).dot(dir),ex.dot(east));twist.setFromAxisAngle(dir,ang);q.premultiply(twist);
  p.copy(dir).multiplyScalar(R-.03);s.set(w,h,w);
  m.compose(p,q,s);tiles.setMatrixAt(i,m);
 });
 geo.setAttribute('aSeed',new THREE.InstancedBufferAttribute(seed,1));
 geo.setAttribute('aCity',new THREE.InstancedBufferAttribute(city,1));
 geo.setAttribute('aIce',new THREE.InstancedBufferAttribute(ice,1));
 geo.setAttribute('aHome',new THREE.InstancedBufferAttribute(home,1));
 geo.setAttribute('aWarm',new THREE.InstancedBufferAttribute(warm,1));
 globe.add(tiles);

 // атмосфера: тонкий ободок и мягкий ореол (не вращаются вместе с планетой — сферы симметричны)
 const atmoMat=(k,pw,col,side)=>new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side,uniforms:{uL:{value:L},uColor:{value:new THREE.Color(...col)},uP:{value:pw},uK:{value:k},uBack:{value:side===THREE.BackSide?1:0}},vertexShader:atmoVert,fragmentShader:atmoFrag});
 const rim=new THREE.Mesh(new THREE.SphereGeometry(R*1.006,96,64),atmoMat(1.,5.,[.3,.5,1.1],THREE.FrontSide));
 const halo=new THREE.Mesh(new THREE.SphereGeometry(R*1.09,96,64),atmoMat(.42,2.2,[.22,.38,.95],THREE.BackSide));
 const atmo=new THREE.Group();atmo.add(rim,halo);

 // точка касания: луч из камеры → сфера → в координаты планеты
 const ray=new THREE.Raycaster(),sph=new THREE.Sphere(new THREE.Vector3(),R),hitP=new THREE.Vector3(),inv=new THREE.Quaternion();
 let ptrOn=0,ptrWant=0;
 const api={
  tiles,ocean,atmo,count:N,
  hit(dirLocal,t){hk=(hk+1)%HITS;const d=dirLocal.clone().normalize();hit[hk].set(d.x,d.y,d.z,t)},
  pointer(ndc,camera,active){
   if(!active){ptrWant=0;return}
   ray.setFromCamera(ndc,camera);
   if(ray.ray.intersectSphere(sph,hitP)){inv.copy(globe.quaternion).invert();mat.uniforms.uPtr.value.copy(hitP).normalize().applyQuaternion(inv);ptrWant=1}else ptrWant=0;
  },
  rise(v){mat.uniforms.uRise.value=v},
  update(dt,t){common.uTime.value=t;ptrOn+=(ptrWant-ptrOn)*(1-Math.exp(-dt*(ptrWant?10:3)));mat.uniforms.uPtrOn.value=ptrOn},
  light:L
 };
 return api;
}

// орбитальное кольцо-«гироскоп»: тонкая линия с делениями, медленно вращается
export function orbitRing(R,{color=[.35,.45,.62],ticks=120}={}){
 const g=new THREE.Group();
 const ringMat=new THREE.MeshBasicMaterial({color:new THREE.Color(...color),transparent:true,opacity:.32,toneMapped:false,depthWrite:false});
 g.add(new THREE.Mesh(new THREE.TorusGeometry(R,.008,6,256),ringMat));
 const tg=new THREE.BoxGeometry(.012,.09,.012),tm=new THREE.InstancedMesh(tg,ringMat,ticks);
 const m=new THREE.Matrix4(),q=new THREE.Quaternion(),z=new THREE.Vector3(0,0,1);
 for(let i=0;i<ticks;i++){const a=i/ticks*Math.PI*2,big=i%10===0;q.setFromAxisAngle(z,a);m.compose(new THREE.Vector3(Math.cos(a)*R,Math.sin(a)*R,0),q,new THREE.Vector3(1,big?2.2:1,1));tm.setMatrixAt(i,m)}
 g.add(tm);
 return g;
}
