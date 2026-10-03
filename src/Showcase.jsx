import React,{useEffect,useRef,useState} from 'react';
import {gsap} from 'gsap';
import {Arrow} from './scene/art';
import {programs,catalogs,ecosystem,baseShort} from './data';
import {Qr,reduced} from './ui';

// Витрина: слева — профессиональные программы (в т.ч. планы 2027), справа — курсы по продуктам.
// Структура — из проекта roadmap_courses (docs/ecosystem.md).
export default function Showcase({results,onRestart}){
 const [sel,setSel]=useState(null),ref=useRef();
 useEffect(()=>{if(reduced())return;gsap.from(ref.current.querySelectorAll('.s-anim'),{y:26,opacity:0,duration:.6,stagger:.05,ease:'power3.out'})},[]);
 const p=sel&&programs[sel];

 return <main className="showcase" ref={ref}>
  <section className="eco">
   <div className="s-anim s-head"><span className="kicker">Витрина Positive Education</span><h1>Продолжите обучение</h1>
    <p>Нажмите на программу, чтобы получить QR. Пунктиром — программы, запуск которых запланирован на 2027 год.</p></div>
   <div className="s-anim eco-cols"><span>Профессиональные программы</span><span>Курсы по эксплуатации продуктов</span></div>
   <div className="eco-canvas">
    {ecosystem.rows.map(r=><div key={r.id} className="s-anim eco-row">
     <div className="eco-label">{r.name}<small>{r.note}</small></div>
     <div className="eco-pro">{r.pro.map(id=>{const pr=programs[id];return <button key={id} className={'prog'+(sel===id?' sel':'')+(pr.plan?' plan':'')} onClick={()=>setSel(sel===id?null:id)}>
      <em>{pr.plan&&<i className="yr">2027</i>}{pr.kind}</em><b>{pr.name}</b></button>})}</div>
     <div className="eco-base">{r.base.map(id=><button key={id} className={'chip-prod'+(sel===id?' sel':'')} onClick={()=>setSel(sel===id?null:id)}>
      <b>{baseShort[id]}</b></button>)}</div>
    </div>)}
   </div>
  </section>
  <section className="codes">
   {[catalogs.pros,catalogs.products].map(c=><div key={c.url} className="s-anim qr-card"><Qr url={c.url} label={c.title}/><div><b>{c.title}</b><small>{c.note}</small><span>{c.short}</span></div></div>)}
   <div className={'s-anim qr-card sel'+(p?' on':'')}>
    {p&&!p.plan&&<><Qr url={p.url} label={p.name}/><div><em>{p.kind}</em><b>{p.name}</b><span>{p.short}</span></div></>}
    {p&&p.plan&&<div className="sel-plan"><em>{p.kind} · запуск в 2027 году</em><b>{p.name}</b><span className="hand">ссылка и QR появятся после анонса</span></div>}
    {!p&&<div className="sel-empty"><svg viewBox="0 0 200 90" aria-hidden="true"><Arrow from={[150,70]} to={[30,16]} bend={-30} k="sh"/></svg><span className="hand">выберите программу слева —<br/>её QR появится здесь</span></div>}
   </div>
   <button className="s-anim ghost-btn again" onClick={onRestart}>Пройти заново</button>
  </section>
 </main>;
}
