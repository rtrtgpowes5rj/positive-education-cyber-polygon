import React,{useState} from 'react';
import {levels} from './data';

// Демо-режим: свободная навигация по всем экранам без прохождения
export default function Demo({at,onGo,onExit}){
 const [open,setOpen]=useState(false);
 const items=[
  {id:'attract',label:'Заставка'},
  ...levels.map((l,i)=>({id:'l'+i,label:`${l.code} ${l.name}`})),
  {id:'debrief',label:'Разбор'},
  {id:'results',label:'Итоги'},
  {id:'final',label:'Витрина'}
 ];
 return <div className={'demo'+(open?' open':'')}>
  <button className="demo-tab" onClick={()=>setOpen(o=>!o)} aria-expanded={open}><i/>Демо {open?'▾':'▴'}</button>
  {open&&<nav className="demo-bar" aria-label="Демо-навигация">
   <button className="demo-step" onClick={()=>onGo('prev')} aria-label="Назад">←</button>
   {items.map(it=><button key={it.id} className={at===it.id?'on':''} onClick={()=>onGo(it.id)}>{it.label}</button>)}
   <button className="demo-step" onClick={()=>onGo('next')} aria-label="Вперёд">→</button>
   <button className="demo-exit" onClick={onExit}>Выйти из демо</button>
  </nav>}
 </div>;
}
export const demoOrder=['attract',...levels.map((_,i)=>'l'+i),'debrief','results','final'];
