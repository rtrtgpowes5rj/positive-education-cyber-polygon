import React,{useEffect,useRef,useState} from 'react';
import {createHero,SOURCES} from './globe';

export const hero={api:null};

export default function Hero3D({quality=1,diving=false}){
 const host=useRef(),lockRef=useRef(),lab=useRef({}),[touched,setTouched]=useState(false),[spd,setSpd]=useState(0);
 useEffect(()=>{const t=setInterval(()=>{const a=hero.api;if(a)setSpd(Math.min(1,Math.max(0,(a.speed-.5)/6)))},120);return()=>clearInterval(t)},[]);
 useEffect(()=>{
  const api=createHero(host.current,{quality});hero.api=api;
  
  const ptrs=new Map();let pinch=0,last=null,drag=false;
  const blocked=t=>t&&t.closest&&t.closest('button,a,.att-copy,.demo,.demo-open,.att-board');
  const mv=e=>{
   const r=host.current.getBoundingClientRect();api.setPointer(((e.clientX-r.left)/r.width-.5)*2,((e.clientY-r.top)/r.height-.5)*2);
   if(!ptrs.has(e.pointerId))return;ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
   if(ptrs.size===2){const [a,b]=[...ptrs.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);if(pinch)api.zoomBy(pinch/d);pinch=d;return}
   if(drag&&last){const dx=e.clientX-last.x,dy=e.clientY-last.y,dt=Math.max(.008,(e.timeStamp-last.t)/1000);
    api.input.vx=Math.max(-9,Math.min(9,dx/dt*.0042));api.input.vy=Math.max(-3,Math.min(3,dy/dt*.0026));api.input.moved=true;last={x:e.clientX,y:e.clientY,t:e.timeStamp};setTouched(true)}
  };
  const dn=e=>{if(blocked(e.target)||api.diving)return;
   if(!api.hitPlanet(e.clientX,e.clientY)&&e.pointerType==='mouse')return;
   ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
   if(ptrs.size===1){drag=true;last={x:e.clientX,y:e.clientY,t:e.timeStamp};api.input.down=true;api.input.holdT=0;setTouched(true);document.body.classList.add('grabbing')}else{drag=false;api.input.down=false;pinch=0}};
  const up=e=>{ptrs.delete(e.pointerId);if(ptrs.size<2)pinch=0;if(ptrs.size===0){drag=false;api.input.down=false;document.body.classList.remove('grabbing')}};
  const wh=e=>{if(blocked(e.target))return;e.preventDefault();api.zoomBy(Math.exp((e.ctrlKey?1:.4)*e.deltaY*.0022));setTouched(true)};
  const hov=e=>{if(drag)return;const on=!api.diving&&!blocked(e.target)&&api.hitPlanet(e.clientX,e.clientY);document.body.classList.toggle('over-planet',on)};
  window.addEventListener('pointermove',mv);window.addEventListener('pointermove',hov);window.addEventListener('pointerdown',dn);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);window.addEventListener('wheel',wh,{passive:false});
  let raf;
  const loop=()=>{
   for(const L of api.labels){const el=lab.current[L.id];if(!el)continue;
    const vis=L.show?Math.max(0,Math.min(1,(L.facing-.18)*4)):0;
    el.style.opacity=api.diving||(L.x>1500&&L.y<350)?0:vis;const fl=L.x>(L.y<350?1200:1420);el.style.transform=`translate(${L.x}px,${L.y}px)`+(fl?' translateX(-100%)':'');el.classList.toggle('flip',fl)}
   if(lockRef.current&&api.diving){const t=api.targetScreen();lockRef.current.style.transform=`translate(${t.x}px,${t.y}px)`}
   raf=requestAnimationFrame(loop);
  };
  raf=requestAnimationFrame(loop);
  return()=>{cancelAnimationFrame(raf);document.body.classList.remove('grabbing','over-planet');window.removeEventListener('pointermove',mv);window.removeEventListener('pointermove',hov);window.removeEventListener('pointerdown',dn);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);window.removeEventListener('wheel',wh);hero.api=null;api.ctx.dispose()};
 },[]);
 return <div className={'net-stage hero-stage'+(diving?' diving':'')}>
  <div className="gl-host" ref={host}/>
  <div className="net-labels">
   {SOURCES.filter(s=>s.label).map(s=><div key={s.id} className={'hero-tag'+(s.ai?' ai':'')} ref={e=>lab.current[s.id]=e}><i/><span>{s.label}</span></div>)}
  </div>
  {diving&&<div className="lock" ref={lockRef} aria-hidden="true"><div className="lk-box"><i/><i/><i/><i/></div><div className="lk-txt"><span>захват цели</span><b>ваша сеть</b><small>55.75° N · 37.62° E · 18 активных угроз</small></div></div>}
  <div className={"hero-hint"+(touched||diving?" gone":"")}><svg viewBox="0 0 120 70" aria-hidden="true"><path d="M8 52 C30 8 80 6 108 38" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/><path d="M98 28 L109 39 L94 43" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg><span>покрутите планету</span><small>удерживайте — быстрее · два пальца — приблизить</small></div>
  <div className="hero-speed" style={{opacity:spd>.04?1:0}}><i style={{transform:`scaleX(${spd})`}}/></div>
 </div>;
}
