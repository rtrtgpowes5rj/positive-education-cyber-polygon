import React,{useEffect,useRef,useState} from 'react';
import {gsap} from 'gsap';
import NetMap from '../scene/NetMap';
import {Glyph} from '../scene/art';
import {tools,slots} from '../scene/topology';
import {Briefing,useThread,stagePt,reduced} from '../ui';
import {net} from '../gl/NetStage';
import {webglOK} from '../gl/core';

const lc=s=>s[0].toLowerCase()+s.slice(1);
const order=['ngfw','waf','sandbox','nta','edr','siem'];
const shuffled=()=>{let a;do{a=[...order].sort(()=>Math.random()-.5)}while(a.every((x,i)=>x===order[i]));return a};
const GL=webglOK();

export default function Perimeter({level,onWin}){
 const [placed,setPlaced]=useState({}),[armed,setArmed]=useState(null),[wrong,setWrong]=useState(null),[ghost,setGhost]=useState(null),[mistakes,setMistakes]=useState(0);
 const [tray]=useState(shuffled),[stats,setStats]=useState({breach:0,block:0});
 const ghostEl=useRef(),ghostPos=useRef({x:0,y:0}),lastOver=useRef(null),slotRefs=useRef({}),drag=useRef(null),done=useRef(false),trayRef=useRef();
 const th=useThread(level);

 useEffect(()=>{
  net.set({placed:{},armed:false,hover:null,wrong:null});
  if(!reduced())gsap.from(trayRef.current,{y:40,opacity:0,duration:.7,ease:'power3.out',delay:1.6});
  const iv=setInterval(()=>setStats({...net.stats()}),400);
  return()=>{clearInterval(iv);net.set({placed:{},armed:false,hover:null,wrong:null})};
 },[]);

 const assign=(toolId,slotId)=>{
  if(!toolId){th.say('Сначала возьми средство защиты внизу — перетащи или нажми на него.');return}
  if(placed[slotId])return;
  const s=slots.find(x=>x.id===slotId),t=tools[toolId];
  if(toolId!==slotId){
   setMistakes(m=>m+1);setWrong(slotId);net.set({wrong:slotId});setTimeout(()=>{setWrong(null);net.set({wrong:null})},700);
   th.say(`${t.name} ${t.desc}. А тут нужно ${s.need}.`,'error');return;
  }
  const next={...placed,[slotId]:true};setPlaced(next);setArmed(null);net.set({placed:next,armed:false});
  th.say(`${t.name} встал на «${s.label}». Смотри, какие пакеты теперь гаснут.`,'ok');
  if(Object.keys(next).length===order.length&&!done.current){done.current=true;th.say('Периметр закрыт. Красные ромбы больше не доходят.','ok');setTimeout(()=>onWin(mistakes),2600)}
 };

 // попадание в слот: в 3D — по экранным координатам кольца, в запасном 2D — по DOM
 const hitSlot=(cx,cy)=>{
  if(GL){
   const api=net.get().api;if(!api)return null;const p=stagePt({clientX:cx,clientY:cy});let best=null,bd=130;
   for(const s of slots){const sp=api.slotScreen(s.id,.2);if(!sp)continue;const d=Math.hypot(sp.x-p.x,sp.y-p.y);if(d<bd){bd=d;best=s.id}}
   return best;
  }
  return Object.entries(slotRefs.current).find(([id,el])=>{if(!el)return false;const r=el.querySelector('.hit-area').getBoundingClientRect();return cx>=r.left-6&&cx<=r.right+6&&cy>=r.top-6&&cy<=r.bottom+6})?.[0]||null;
 };

 useEffect(()=>{
  const move=e=>{const dr=drag.current;if(!dr)return;if(!dr.moving&&Math.hypot(e.clientX-dr.x,e.clientY-dr.y)>8)dr.moving=true;
   if(dr.moving){const p=stagePt(e),over=hitSlot(e.clientX,e.clientY);ghostPos.current=p;if(ghostEl.current){ghostEl.current.style.left=p.x+'px';ghostEl.current.style.top=p.y+'px';ghostEl.current.classList.toggle('over',!!over)}setGhost(g=>g&&g.id===dr.id?g:{id:dr.id});if(GL&&over!==lastOver.current){lastOver.current=over;net.set({hover:over,armed:true})}}};
  const up=e=>{const dr=drag.current;if(!dr)return;drag.current=null;setGhost(null);lastOver.current=null;if(GL)net.set({hover:null,armed:!!armed});if(!dr.moving)return;const hit=hitSlot(e.clientX,e.clientY);if(hit)assign(dr.id,hit);else th.say('Отпусти средство над красным кольцом на схеме — там, где оно нужно.')};
  window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);
  return()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up)};
 });

 const pickSlot=id=>assign(armed,id);
 const count=Object.keys(placed).length;
 const doneGoals=[!!placed.ngfw,!!placed.waf&&!!placed.sandbox,!!placed.nta,!!placed.edr&&!!placed.siem];
 return <main className="level perimeter">
  <Briefing level={level} thread={th} done={doneGoals}/>
  <div className="work">
   <div className="map-wrap">
    {!GL&&<NetMap placed={placed} showSlots slotRefs={slotRefs} armed={!!armed} wrong={wrong} onSlot={pickSlot}/>}
    <div className="legend"><span><i className="lg threat"/>атака</span><span><i className="lg legit"/>обычный трафик</span><span><i className="lg log"/>события в SIEM</span></div>
    {GL&&<div className="live-stats"><div><small>отражено</small><b className="ok">{stats.block}</b></div><div><small>прорывов</small><b className="bad">{stats.breach}</b></div></div>}
    {GL&&armed&&<ClickCatcher onPick={pickSlot} hitSlot={hitSlot}/>}
    {GL&&armed&&<div className="pick-hint">Нажмите на красное кольцо, куда поставить {tools[armed].name}</div>}
   </div>
   <div className="tray">
    <div className="tray-head"><span>Средства защиты</span><b>{count}<em> / {order.length}</em></b></div>
    <div className="tools" ref={trayRef}>{tray.map(id=>{const t=tools[id],on=placed[id];return <button key={id} disabled={on} className={'tool'+(armed===id?' armed':'')+(on?' done':'')}
      onPointerDown={e=>{if(on)return;drag.current={id,x:e.clientX,y:e.clientY,moving:false}}}
      onClick={()=>{if(on)return;const n=armed===id?null:id;setArmed(n);if(GL)net.set({armed:!!n});if(n)th.say(`${t.name} · ${t.product}: ${t.desc}. Теперь выбери участок на схеме.`)}}>
      <Glyph id={id} size={44}/><b>{t.name}</b><small>{t.product}</small>
     </button>})}</div>
   </div>
  </div>
  {ghost&&<div ref={ghostEl} className="ghost" style={{left:ghostPos.current.x,top:ghostPos.current.y}}><Glyph id={ghost.id} size={34} k="g"/><b>{tools[ghost.id].name}</b></div>}
 </main>;
}

// режим «выбрал средство → нажал на участок»: нажатие на сцену ищет ближайшее кольцо
function ClickCatcher({onPick,hitSlot}){
 return <div className="click-catcher" onClick={e=>{const id=hitSlot(e.clientX,e.clientY);if(id)onPick(id)}}/>;
}
