import React,{useEffect,useRef,useSyncExternalStore} from 'react';
import {createNetwork} from './network';
import {slots,tools} from '../scene/topology';
import {pool} from '../data';
import {Reveal} from '../ui';

// Один мир на всю игру: сеть компании со станциями уровней. Монтируется сразу при старте (на паузе),
// поэтому к первому пролёту шейдеры уже скомпилированы. Приложение управляет им через net.set():
//   station — l0…l4 | finale, phase — show (ракурс под название) | work (фон во время игры),
//   snap — без пролёта, paused — мир не рисуется (на заставке с планетой)
const state={station:'l0',phase:'work',snap:true,paused:true,slotsVisible:false,placed:{},armed:false,hover:null,wrong:null,api:null,listeners:new Set()};
const emit=()=>state.listeners.forEach(f=>f());
export const net={
 get:()=>state,
 set(p){let ch=false;for(const k in p){if(state[k]!==p[k]){ch=true;break}}if(!ch)return;Object.assign(state,p);emit()},
 sub(f){state.listeners.add(f);return()=>state.listeners.delete(f)},
 stats:()=>state.api?state.api.stats:{breach:0,block:0}
};
let ver=0;const snap=()=>ver;
const useNet=()=>useSyncExternalStore(f=>net.sub(()=>{ver++;f()}),snap);

const tagOff={ngfw:[0,92],waf:[0,-78],sandbox:[118,58],nta:[0,86],edr:[0,92],siem:[0,-150]};

export default function NetStage({quality=1}){
 const host=useRef(),labels=useRef({}),poolRef=useRef(),inetRef=useRef();
 useNet();
 const s=net.get();
 const l1=s.station==='l0'&&s.phase==='work'&&!s.paused;

 useEffect(()=>{
  const api=createNetwork(host.current,{quality});
  net.set({api});
  const mv=e=>{const r=host.current.getBoundingClientRect();api.setPointer(((e.clientX-r.left)/r.width-.5)*2,((e.clientY-r.top)/r.height-.5)*2)};
  window.addEventListener('pointermove',mv);
  let raf;
  const loop=()=>{
   if(!api.ctx.paused){
    for(const sl of slots){const el=labels.current[sl.id];if(!el)continue;const p=api.slotScreen(sl.id,.2),o=tagOff[sl.id];if(p){el.style.transform=`translate(${p.x+o[0]}px,${p.y+o[1]}px) translate(-50%,-50%)`}}
    const h=api.pointScreen(150,260,6.2);
    if(poolRef.current)poolRef.current.style.transform=`translate(${h.x+110}px,${h.y-30}px)`;
    const c=api.pointScreen(150,330,-.2);
    if(inetRef.current)inetRef.current.style.transform=`translate(${c.x}px,${c.y+50}px) translate(-50%,0)`;
   }
   raf=requestAnimationFrame(loop);
  };
  raf=requestAnimationFrame(loop);
  return()=>{cancelAnimationFrame(raf);window.removeEventListener('pointermove',mv);net.set({api:null});api.dispose()};
 },[]);

 // состояние → сцена
 useEffect(()=>{
  const api=s.api;if(!api)return;
  api.pause(s.paused);
  api.goStation(s.station,s.phase,{snap:s.snap});
  api.setSlotsVisible(s.slotsVisible);api.setPlaced(s.placed);api.setArmed(s.armed);api.setHover(s.hover);
 });
 useEffect(()=>{if(s.api&&s.wrong)s.api.setWrong(s.wrong)},[s.wrong,s.api]);

 return <div className={'net-stage'+(s.paused?' paused':'')}>
  <div className="gl-host" ref={host}/>
  <div className="net-labels">
   {l1&&s.slotsVisible&&<div className="pool-anchor" ref={poolRef}><Reveal className="pool-rv" panelClass="pool-panel" label={<><i/>пул угроз<b>{pool.length}</b></>}>
    <b className="rv-i rv-title">Кто атакует 24/7</b>{pool.map(t=><span key={t} className="rv-i pool-row">{t}</span>)}</Reveal></div>}
   {l1&&<div className="inet-label hand" ref={inetRef}>интернет</div>}
   {l1&&s.slotsVisible&&slots.map(sl=>{const placed=s.placed[sl.id],t=tools[sl.id];
    return <div key={sl.id} className={'slot-label'+(placed?' placed':'')} ref={e=>labels.current[sl.id]=e}>
     <b>{sl.label}</b>{(placed||s.armed||s.hover===sl.id)&&<small key={placed?'p':'n'}>{placed?`${t.name} · ${t.product}`:sl.note}</small>}</div>})}
  </div>
 </div>;
}
