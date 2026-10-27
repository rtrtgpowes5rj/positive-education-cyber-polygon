import * as THREE from 'three';

// Поток данных по кабелям — целиком на видеокарте. Ломаные кабелей лежат в float-текстуре
// (точка xyz + накопленная длина), каждая частица знает свой кабель, сдвиг и скорость;
// положение на кабеле вершинный шейдер находит сам. Процессор не трогает частицы ни в одном кадре.
const MAXP=8;
export function createFlow(scene,cables,toWorld,{count=2000,logCable=-1}={}){
 const H=cables.length,data=new Float32Array(MAXP*H*4),lens=[];
 cables.forEach((c,row)=>{let acc=0,prev=null;
  for(let i=0;i<MAXP;i++){const p=c[Math.min(i,c.length-1)],v=toWorld(p[0],p[1],.14);if(prev)acc+=prev.distanceTo(v);prev=v;
   const o=(row*MAXP+i)*4;data[o]=v.x;data[o+1]=v.y;data[o+2]=v.z;data[o+3]=acc}
  lens.push(acc)});
 const tex=new THREE.DataTexture(data,MAXP,H,THREE.RGBAFormat,THREE.FloatType);tex.needsUpdate=true;
 const total=lens.reduce((a,b)=>a+b,0);
 const aCable=new Float32Array(count),aOff=new Float32Array(count),aSpd=new Float32Array(count),aSize=new Float32Array(count),aJit=new Float32Array(count);
 let k=0;
 lens.forEach((L,row)=>{const n=row===lens.length-1?count-k:Math.round(count*L/total);
  for(let j=0;j<n&&k<count;j++,k++){aCable[k]=row;aOff[k]=Math.random();aSpd[k]=(row===logCable?2.6:1.6+Math.random()*1.6)/Math.max(.1,L);aSize[k]=.065+Math.pow(Math.random(),3)*.1;aJit[k]=Math.random()*6.28}});
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(count*3),3));
 g.setAttribute('aCable',new THREE.BufferAttribute(aCable,1));g.setAttribute('aOff',new THREE.BufferAttribute(aOff,1));
 g.setAttribute('aSpd',new THREE.BufferAttribute(aSpd,1));g.setAttribute('aSize',new THREE.BufferAttribute(aSize,1));g.setAttribute('aJit',new THREE.BufferAttribute(aJit,1));
 const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  uniforms:{uPath:{value:tex},uTime:{value:0},uScale:{value:540},uLog:{value:logCable},uA:{value:1}},
  vertexShader:`
   precision highp float;precision highp sampler2D;
   uniform sampler2D uPath;uniform float uTime,uScale,uLog;
   attribute float aCable,aOff,aSpd,aSize,aJit;varying float vLog;varying float vFade;
   void main(){
    int row=int(aCable+.5);
    float L=texelFetch(uPath,ivec2(${MAXP-1},row),0).w;
    float u=fract(aOff+uTime*aSpd)*L;
    vec4 a=texelFetch(uPath,ivec2(0,row),0),b=a;
    for(int i=1;i<${MAXP};i++){b=texelFetch(uPath,ivec2(i,row),0);if(b.w>=u)break;a=b;}
    float seg=max(1e-4,b.w-a.w);vec3 p=mix(a.xyz,b.xyz,clamp((u-a.w)/seg,0.,1.));
    p.y+=sin(uTime*3.+aJit)*.015;
    vLog=abs(aCable-uLog)<.5?1.:0.;vFade=smoothstep(0.,.06,u/L)*smoothstep(1.,.94,u/L);
    vec4 mv=modelViewMatrix*vec4(p,1.);
    gl_PointSize=aSize*uScale/-mv.z;gl_Position=projectionMatrix*mv;
   }`,
  fragmentShader:`
   uniform float uA;varying float vLog;varying float vFade;
   void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;float a=smoothstep(.5,0.,d)*vFade*uA;
    vec3 c=mix(vec3(.55,.68,.95),vec3(.35,1.7,1.1),vLog);gl_FragColor=vec4(c*a*2.3,a);}`});
 const pts=new THREE.Points(g,mat);pts.frustumCulled=false;pts.renderOrder=2;scene.add(pts);
 return{pts,update(t,h){mat.uniforms.uTime.value=t;mat.uniforms.uScale.value=h*.5}};
}
