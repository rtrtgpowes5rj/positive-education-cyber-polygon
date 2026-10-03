import React,{useEffect,useMemo,useRef,useState} from 'react';
import {gsap} from 'gsap';
import qrcode from 'qrcode-generator';
import {Sk,d,C} from './sketch';
import {people} from './data';

export const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// координаты указателя в системе масштабируемой сцены 1920×1080
export const stagePt=e=>{
 const el=document.querySelector('.stage');if(!el)return{x:e.clientX,y:e.clientY};
 const r=el.getBoundingClientRect(),k=r.width/1920;
 return{x:(e.clientX-r.left)/k,y:(e.clientY-r.top)/k};
};

export const Btn=({children,className='',...p})=><button className={'btn '+className} {...p}><span>{children}</span><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M3 12.5c4 .6 9-.4 15.5-.4M13 6l6 6.2-6 5.8" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg></button>;

// ---------- Окно «настоящего» ПО ----------
export function Win({title,sub,right,className='',children}){
 const ref=useRef();
 useEffect(()=>{if(reduced())return;gsap.from(ref.current,{rotateY:-9,x:70,opacity:0,transformPerspective:1500,transformOrigin:'left center',duration:1,ease:'power3.out',delay:.25,clearProps:'transform,opacity'})},[]);
 return <section className={'win '+className} ref={ref}>
  <header><i className="dots"><b/><b/><b/></i><span className="wt">{title}</span>{sub&&<span className="ws">{sub}</span>}<span className="wr">{right}</span></header>
  <div className="wb">{children}</div>
 </section>;
}

// ---------- Диалог с коллегой ----------
let msgId=0;
export const hintStat={n:0};
export function useThread(level){
 const [hi,setHi]=useState(0);
 const [msgs,setMsgs]=useState(()=>level.chat.map((text,i)=>({id:++msgId,who:level.who,text,tone:'',delay:500+i*1700})));
 const say=(text,tone='',who)=>setMsgs(m=>[...m,{id:++msgId,who:who||level.who,text,tone,delay:0}].slice(-6));
 const hint=()=>{if(hi>=level.hints.length)return;setHi(hi+1);hintStat.n++;say(level.hints[hi],'hint')};
 return{msgs,say,hint,hintsLeft:level.hints.length-hi};
}

function Typed({text,delay=0}){
 const [n,setN]=useState(reduced()?text.length:0);
 useEffect(()=>{
  if(reduced())return;
  let i=0,iv;const t=setTimeout(()=>{iv=setInterval(()=>{i+=2;setN(i);if(i>=text.length)clearInterval(iv)},18)},delay);
  return()=>{clearTimeout(t);clearInterval(iv)};
 },[text,delay]);
 return <>{text.slice(0,n)}{n<text.length&&<i className="caret"/>}</>;
}

export const Avatar=({who,size=44})=>{
 const p=people[who];
 return <svg className="avatar" viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
  <Sk of={d.ell('av'+who,24,24,42,42,{fill:'#262a2f',fillStyle:'solid',stroke:C.ink,strokeWidth:1.8,roughness:1.4})}/>
  <text x="24" y="30" textAnchor="middle" className="av-t">{p.ini}</text>
 </svg>;
};

const Tick=({on,k})=><svg className={'tick'+(on?' on':'')} viewBox="0 0 28 28" width="26" height="26" aria-hidden="true">
 <Sk of={d.rect('cb'+k,3,3,20,20,{strokeWidth:1.8,roughness:1.3})}/>
 <Sk className="chk" of={d.lines('ck'+k,[[6,14],[12,20],[27,3]],{stroke:C.mint,strokeWidth:3.2,roughness:.7})}/>
</svg>;

export function Briefing({level,thread,done=[]}){
 const ref=useRef(),end=useRef();
 useEffect(()=>{if(reduced())return;gsap.from(ref.current.querySelectorAll('.b-in'),{y:22,opacity:0,duration:.6,stagger:.08,ease:'power3.out',delay:.1})},[]);
 useEffect(()=>{if(end.current)end.current.scrollTop=end.current.scrollHeight},[thread.msgs]);
 return <aside className="brief" ref={ref}>
  <div className="b-in lvl-tag"><span>Уровень {level.code}</span><i/>{level.name}</div>
  <h1 className="b-in">{level.title}
   <svg className="h-under" viewBox="0 0 300 14" preserveAspectRatio="none"><Sk of={d.curve('hu'+level.id,[[4,8],[80,4],[160,10],[296,5]],{stroke:C.red,strokeWidth:3,roughness:1.3})}/></svg></h1>
  {level.cheat&&<div className="b-in note-card"><b>{level.cheat.title}</b>{level.cheat.items.map(([k,v])=><div key={k}><em>{k}</em><span>{v}</span></div>)}</div>}
  <div className="b-in chat" ref={end}>
   {thread.msgs.map(m=><div key={m.id} className={'msg '+m.tone}>
    <Avatar who={m.who}/>
    <div><small>{people[m.who].name}<em>{people[m.who].role}</em></small><p><Typed text={m.text} delay={m.delay}/></p></div>
   </div>)}
  </div>
  <button className="b-in hint-btn" disabled={!thread.hintsLeft} onClick={thread.hint}><i>?</i>{thread.hintsLeft?`Подсказка · −10 очков · осталось ${thread.hintsLeft}`:'Подсказки закончились'}</button>
  <ul className="b-in goals">{level.goals.map((g,i)=><li key={g} className={done[i]?'on':''}><Tick on={done[i]} k={level.id+i}/>{g}</li>)}</ul>
 </aside>;
}

// ---------- QR ----------
export function Qr({url,label,dark='#121315',light='#f4efe6'}){
 const {p,n}=useMemo(()=>{
  const q=qrcode(0,'M');q.addData(url);q.make();
  const n=q.getModuleCount();let p='';
  for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(q.isDark(r,c))p+=`M${c},${r}h1v1h-1z`;
  return{p,n};
 },[url]);
 return <svg className="qr" viewBox={`-3 -3 ${n+6} ${n+6}`} role="img" aria-label={label} shapeRendering="crispEdges">
  <rect x="-3" y="-3" width={n+6} height={n+6} fill={light}/><path d={p} fill={dark}/>
 </svg>;
}

// ---------- Подсветка синтаксиса (минимум) ----------
const kw=/\b(def|return|if|raise|import|from|class|server|listen|location|ssl_protocols|hostname|line|logging|transport|snmp-server|no|Port|PermitRootLogin|PasswordAuthentication|PubkeyAuthentication)\b/;
export function Code({children}){
 const s=String(children);
 const parts=s.split(/(#.*$|"[^"]*"|'[^']*'|\b\d+(?:\.\d+)*\b)/);
 return <code>{parts.map((t,i)=>{
  if(!t)return null;
  if(t[0]==='#')return <span key={i} className="tk-c">{t}</span>;
  if(t[0]==='"'||t[0]==="'")return <span key={i} className="tk-s">{t}</span>;
  if(/^\d/.test(t))return <span key={i} className="tk-n">{t}</span>;
  return t.split(kw).map((u,j)=>kw.test(u)?<span key={i+'_'+j} className="tk-k">{u}</span>:u);
 })}</code>;
}
