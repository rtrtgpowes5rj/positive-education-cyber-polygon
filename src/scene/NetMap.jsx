import React,{memo,useEffect,useLayoutEffect,useRef} from 'react';
import {gsap} from 'gsap';
import {Sk,d,hatch,C} from '../sketch';
import {Cloud,Gateway,Web,Mail,Switch,Workstations,SocWall,Glyph} from './art';
import {cables,slots,tools,routes} from './topology';

const reduce=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const Zones=()=><g className="zones">
 <Sk className="draw" of={d.rect('dmz',392,52,368,306,{stroke:C.faint,strokeWidth:1.6,strokeLineDash:[9,8],roughness:1.4})}/>
 <text className="hand zone" x="410" y="44">DMZ · публичные сервисы</text>
 <Sk className="draw" of={d.rect('lan',392,380,572,246,{stroke:C.faint,strokeWidth:1.6,strokeLineDash:[9,8],roughness:1.4})}/>
 <text className="hand zone" x="410" y="614">локальная сеть · 10.20.0.0/16</text>
 <Sk className="draw" of={d.line('edge',262,40,262,600,{stroke:C.faint,strokeWidth:1.4,strokeLineDash:[3,9]})}/>
</g>;

const pool=['боты и сканеры IP-диапазонов','APT-группировки','шифровальщики и вымогатели','фишинг и социальная инженерия','эксплойты нулевого дня'];
const ThreatPool=()=><g className="pool">
 <Sk className="draw" of={d.rect('pool',8,64,246,172,{stroke:C.red,strokeWidth:1.8,strokeLineDash:[8,7],roughness:1.5})}/>
 <text className="hand pool-t" x="22" y="92">пул угроз · 24/7</text>
 {pool.map((t,i)=><g key={i}><Sk className="draw" of={d.rect('pb'+i,22,108+i*24,9,9,{stroke:C.red,strokeWidth:1.4,roughness:.6,fill:C.red,fillStyle:'solid'})}/><text className="mono pool-i" x="40" y={117+i*24}>{t}</text></g>)}
 <Sk className="draw" of={d.lines('pa',[[130,240],[130,262]],{stroke:C.red,strokeWidth:2.2,roughness:.7})}/>
 <Sk className="draw" of={d.lines('pa2',[[121,254],[130,264],[139,254]],{stroke:C.red,strokeWidth:2.2,roughness:.6})}/>
</g>;

const Scene=memo(function Scene({socLit}){
 return <g>
  <Zones/>
  <g className="cables">{cables.map((c,i)=><g key={i} className={i===7?'log':''}>
   <Sk className="draw" of={d.lines('cab'+i,c,{stroke:C.dim,strokeWidth:1.6,roughness:.9})}/></g>)}</g>
  <ThreatPool/>
  <g transform="translate(56,236)"><Cloud/></g>
  <g transform="translate(291,284)"><Gateway/></g>
  <g transform="translate(548,88)"><Web/></g>
  <g transform="translate(538,238)"><Mail/></g>
  <g transform="translate(470,470)"><Switch/></g>
  <g transform="translate(730,462)"><Workstations/></g>
  <g transform="translate(790,396)"><SocWall lit={socLit}/></g>
 </g>;
});

function Packets({placed,hold}){
 const g=useRef(),st=useRef({placed,hold});st.current={placed,hold};
 useEffect(()=>{
  const ns='http://www.w3.org/2000/svg',root=g.current,svg=root.ownerSVGElement,live=[],last={},t0=performance.now();
  const speed={threat:150,legit:185,log:230};
  const mk=(tag,a)=>{const e=document.createElementNS(ns,tag);for(const k in a)e.setAttribute(k,a[k]);return e};
  const burst=(x,y,cls)=>{
   const c=mk('g',{class:'burst '+cls,transform:`translate(${x} ${y})`});
   if(cls==='blocked')c.append(mk('circle',{r:5,class:'ring'}),mk('path',{d:'M-6 -6 L6 6 M6 -6 L-6 6',class:'xx'}));
   else c.append(mk('circle',{r:5,class:'ring'}),mk('circle',{r:5,class:'ring r2'}));
   root.appendChild(c);setTimeout(()=>c.remove(),900);
  };
  const flash=id=>{const el=svg.querySelector(`[data-dev="${id}"]`);if(!el)return;el.classList.remove('hit');void el.getBBox();el.classList.add('hit');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('hit'),700)};
  let raf,prev=t0;
  const loop=now=>{
   const dt=Math.min(64,now-prev);prev=now;const {placed,hold}=st.current;
   if(!hold&&!reduce())for(const r of routes){
    if(r.needs&&!placed[r.needs])continue;
    const due=last[r.id]??(t0+r.delay-r.every);
    if(now-due>=r.every){last[r.id]=now;
     const el=mk('g',{class:'pkt '+r.kind}),tail=mk('line',{}),dot=r.kind==='log'?mk('rect',{x:-2.5,y:-2.5,width:5,height:5}):r.kind==='threat'?mk('path',{d:'M0 -5.5 L5 0 L0 5.5 L-5 0Z'}):mk('circle',{r:3.2});
     el.append(tail,dot);root.appendChild(el);live.push({r,d:0,el,tail,dot});
    }
   }
   for(let i=live.length-1;i>=0;i--){
    const k=live[i];k.d+=speed[k.r.kind]*dt/1000;
    const blocked=k.r.block!=null&&placed[k.r.guard]&&k.d>=k.r.block;
    if(blocked||k.d>=k.r.p.total){
     const [x,y]=k.r.p.at(Math.min(k.d,k.r.p.total));
     if(blocked)burst(x,y,'blocked');else if(k.r.kind==='threat'){burst(x,y,'breach');flash(k.r.hit)}
     k.el.remove();live.splice(i,1);continue;
    }
    const [x,y]=k.r.p.at(k.d),[tx,ty]=k.r.p.at(k.d-(k.r.kind==='threat'?26:14));
    k.dot.setAttribute('transform',`translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    k.tail.setAttribute('x1',x);k.tail.setAttribute('y1',y);k.tail.setAttribute('x2',tx);k.tail.setAttribute('y2',ty);
   }
   raf=requestAnimationFrame(loop);
  };
  raf=requestAnimationFrame(loop);
  return()=>{cancelAnimationFrame(raf);live.forEach(k=>k.el.remove())};
 },[]);
 return <g ref={g} className="packets"/>;
}

function Slot({s,state,setRef,onPick,armed}){
 const [x,y]=s.at,t=tools[s.id],placed=state==='placed',[tx,ty,ta]=s.tag;
 return <g className={'slot '+state+(armed?' armed':'')} ref={setRef} onClick={onPick} role="button" aria-label={s.label} transform={`translate(${x} ${y})`}>
  <circle className="hit-area" r="54"/>
  {!placed&&<g className="open-mark"><Sk className="ring" of={d.ell('ring'+s.id,0,0,60,60,{stroke:C.red,strokeWidth:2.2,roughness:1.5,strokeLineDash:[7,6]})}/>
   <Sk of={d.lines('pl'+s.id,[[-9,0],[9,0]],{stroke:C.red,strokeWidth:2.4,roughness:.5})}/><Sk of={d.lines('pl2'+s.id,[[0,-9],[0,9]],{stroke:C.red,strokeWidth:2.4,roughness:.5})}/></g>}
  {placed&&<g className="badge"><circle className="ripple" r="30"/><circle className="ripple r2" r="30"/><Sk of={d.ell('bd'+s.id,0,0,60,60,{...hatch('#1d4a39',5,-40,1.4),stroke:C.mint,strokeWidth:2.2})}/>
   <g transform="translate(-14 -14) scale(.7)" style={{color:C.ink}}><Glyph id={s.id} k="b" size={40}/></g>
   <Sk className="shield" of={d.ell('sh'+s.id,0,0,84,84,{stroke:C.mint,strokeWidth:1.4,strokeLineDash:[4,8],roughness:1.2})}/></g>}
  <g className="tag" transform={`translate(${tx} ${ty})`}>
   <text className="hand t1" textAnchor={ta}>{s.label}</text>
   <text className="mono t2" y="17" textAnchor={ta}>{placed?`${t.name} · ${t.product}`:s.note}</text>
  </g>
 </g>;
}

export default function NetMap({placed={},showSlots=false,slotRefs,onSlot,armed,hold=false,wrong,intro=true,className=''}){
 const ref=useRef();
 useLayoutEffect(()=>{
  if(!intro||reduce())return;
  const root=ref.current,strokes=root.querySelectorAll('.scene .sk path:not([stroke="none"])');
  const tl=gsap.timeline();
  gsap.set(strokes,{strokeDasharray:1,strokeDashoffset:1});
  tl.to(strokes,{strokeDashoffset:0,duration:1.1,ease:'power1.inOut',stagger:{amount:1.2,from:'start'}},0)
    .from(root.querySelectorAll('.scene text'),{opacity:0,duration:.6,stagger:.05},.8)
    .from(root.querySelectorAll('.slot'),{opacity:0,scale:.6,transformOrigin:'center',duration:.5,stagger:.08,ease:'back.out(2)'},1.6)
    .set(strokes,{clearProps:'strokeDasharray,strokeDashoffset'});
  return()=>tl.kill();
 },[]);
 return <svg ref={ref} className={'netmap '+className+(showSlots?' with-slots':'')} viewBox="0 0 1000 640" preserveAspectRatio="xMidYMid meet" aria-hidden={!showSlots}>
  <g className="scene"><Scene socLit={!!placed.siem}/></g>
  <Packets placed={placed} hold={hold}/>
  {showSlots&&<g className="slots">{slots.map(s=><Slot key={s.id} s={s} state={placed[s.id]?'placed':wrong===s.id?'wrong':'open'} armed={armed&&!placed[s.id]} setRef={el=>slotRefs&&(slotRefs.current[s.id]=el)} onPick={()=>onSlot&&onSlot(s.id)}/>)}</g>}
 </svg>;
}
