import React,{useLayoutEffect,useEffect,useMemo,useRef,useState} from 'react';
import {gsap} from 'gsap';
import qrcode from 'qrcode-generator';
import {people} from './data';

export const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// «Ворота» занавеса: пока кадр закрыт, новая сцена монтируется, а её анимации появления ждут подъёма
export const gate={held:false,subs:new Set()};
export const onLift=fn=>{if(!gate.held){fn();return()=>{}}gate.subs.add(fn);return()=>gate.subs.delete(fn)};
export const holdGate=()=>{gate.held=true;document.querySelector('.stage')?.classList.add('held')};
export const releaseGate=()=>{gate.held=false;document.querySelector('.stage')?.classList.remove('held');const s=[...gate.subs];gate.subs.clear();s.forEach(f=>f())};

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
 useLayoutEffect(()=>{if(reduced())return;const el=ref.current;gsap.set(el,{x:48,opacity:0});let tw;
  const off=onLift(()=>{tw=gsap.to(el,{x:0,opacity:1,duration:.7,ease:'expo.out',delay:.12,clearProps:'transform,opacity'})});
  return()=>{off();tw&&tw.kill();gsap.set(el,{clearProps:'transform,opacity'})}},[]);
 return <section className={'win '+className} ref={ref}>
  <header><i className="dots"><b/><b/><b/></i><span className="wt">{title}</span>{sub&&<span className="ws">{sub}</span>}<span className="wr">{right}</span></header>
  <div className="wb">{children}</div>
 </section>;
}

// ---------- Раскрывашка: чип по касанию перетекает в панель ----------
// Порт идеи morphing-popover (Motion Primitives): панель раскрывается из прямоугольника чипа
// (clip-path), содержимое поднимается с шагом 0,05 с; закрытие вдвое быстрее, касание снаружи — закрыть.
const rectIn=(chip,panel)=>{
 const c=chip.getBoundingClientRect(),p=panel.getBoundingClientRect(),k=p.width/(panel.offsetWidth||1)||1,m=v=>Math.max(0,v/k);
 return`inset(${m(c.top-p.top)}px ${m(p.right-c.right)}px ${m(p.bottom-c.bottom)}px ${m(c.left-p.left)}px round 12px)`;
};
export function Reveal({label,className='',panelClass='',open:ctl,onOpen,children,closeLabel='Свернуть'}){
 const [own,setOwn]=useState(false),open=ctl??own;
 const wrap=useRef(),chip=useRef(),panel=useRef(),tl=useRef();
 const set=v=>{setOwn(v);onOpen&&onOpen(v)};
 useLayoutEffect(()=>{
  const pn=panel.current;if(!pn)return;tl.current&&tl.current.kill();
  if(open){
   pn.style.visibility='visible';
   if(reduced()){pn.style.clipPath='none';return}
   tl.current=gsap.timeline()
    .fromTo(pn,{clipPath:rectIn(chip.current,pn)},{clipPath:'inset(0px 0px 0px 0px round 16px)',duration:.55,ease:'expo.out'})
    .fromTo(pn.querySelectorAll('.rv-i'),{y:12,opacity:0},{y:0,opacity:1,duration:.4,stagger:.05,ease:'power3.out',clearProps:'transform,opacity'},.08);
  }else{
   if(pn.style.visibility!=='visible')return;
   if(reduced()){pn.style.visibility='hidden';return}
   tl.current=gsap.timeline({onComplete:()=>{pn.style.visibility='hidden'}})
    .to(pn,{clipPath:rectIn(chip.current,pn),duration:.28,ease:'power2.in'});
  }
 },[open]);
 useEffect(()=>{
  if(!open)return;
  const out=e=>{if(wrap.current&&!wrap.current.contains(e.target))set(false)};
  const esc=e=>{if(e.key==='Escape')set(false)};
  document.addEventListener('pointerdown',out);addEventListener('keydown',esc);
  return()=>{document.removeEventListener('pointerdown',out);removeEventListener('keydown',esc)};
 },[open]);
 useEffect(()=>()=>tl.current&&tl.current.kill(),[]);
 return <div className={'rv '+className+(open?' is-open':'')} ref={wrap}>
  <button type="button" className="rv-chip" ref={chip} aria-expanded={open} onClick={()=>set(!open)}>{label}</button>
  <div className={'rv-panel '+panelClass} ref={panel} style={{visibility:'hidden'}} aria-hidden={!open}>
   <button type="button" className="rv-x" onClick={()=>set(false)} aria-label={closeLabel}><svg viewBox="0 0 20 20" width="18" height="18"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></button>
   {children}
  </div>
 </div>;
}

// ---------- Диалог с коллегой ----------
let msgId=0;
export const hintStat={n:0};
export function useThread(level){
 const [hi,setHi]=useState(0);
 // вступление коллеги — одна реплика из двух абзацев: в кадре одна мысль, её успевают дочитать
 const [msgs,setMsgs]=useState(()=>[{id:++msgId,who:level.who,text:level.chat.join('\n'),tone:'',delay:700}]);
 const say=(text,tone='',who)=>setMsgs(m=>[...m,{id:++msgId,who:who||level.who,text,tone,delay:0}].slice(-12));
 const hint=()=>{if(hi>=level.hints.length)return;setHi(hi+1);hintStat.n++;say(level.hints[hi],'hint')};
 return{msgs,say,hint,hintsLeft:level.hints.length-hi};
}

function Typed({text,delay=0}){
 const [n,setN]=useState(reduced()?text.length:0);
 useEffect(()=>{
  if(reduced())return;
  let i=0,iv,t;const off=onLift(()=>{t=setTimeout(()=>{iv=setInterval(()=>{i+=2;setN(i);if(i>=text.length)clearInterval(iv)},18)},delay)});
  return()=>{off();clearTimeout(t);clearInterval(iv)};
 },[text,delay]);
 return <>{text.slice(0,n)}{n<text.length&&<i className="caret"/>}</>;
}

export const Avatar=({who,size=44})=>{
 const p=people[who];
 return <svg className="avatar" viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
  <circle cx="24" cy="24" r="23" className="av-c"/>
  <text x="24" y="30" textAnchor="middle" className="av-t">{p.ini}</text>
 </svg>;
};

const Tick=({on})=><svg className={'tick'+(on?' on':'')} viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
 <rect x="1.5" y="1.5" width="21" height="21" rx="6" className="tk-box"/>
 <path d="M7 12.4l3.3 3.3 6.7-7" className="tk-chk"/>
</svg>;

// Реплика коллеги: в кадре всегда одна — новая поднимается, прежняя уходит вверх; вся переписка — в «Истории»
const Bubble=({m,cls})=><div className={'coach-msg '+m.tone+' '+cls}>
 <div className="cm-who"><Avatar who={m.who} size={40}/><small>{people[m.who].name}<em>{people[m.who].role}</em></small></div>
 <p><Typed text={m.text} delay={m.delay}/></p>
</div>;
function Coach({thread}){
 const ms=thread.msgs,cur=ms[ms.length-1],prev=ms.length>1?ms[ms.length-2]:null;
 return <div className="coach">
  {ms.length>1&&<Reveal className="coach-hist" panelClass="hist-panel" label={<><svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M3 5h14M3 10h14M3 15h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>История<b>{ms.length}</b></>}>
   <div className="rv-i rv-title">Переписка</div>
   <div className="hist-list">{ms.map(m=><div key={m.id} className={'rv-i hist-msg '+m.tone}><small>{people[m.who].name}</small><p>{m.text}</p></div>)}</div>
  </Reveal>}
  <div className="coach-stack">
   {prev&&<Bubble key={prev.id} m={prev} cls="leave"/>}
   <Bubble key={cur.id} m={cur} cls={ms.length>1?'enter':'first'}/>
  </div>
 </div>;
}

export function Briefing({level,thread,done=[]}){
 const ref=useRef();
 useLayoutEffect(()=>{if(reduced())return;const els=ref.current.querySelectorAll('.b-in');gsap.set(els,{y:18,opacity:0});let tw;
  const off=onLift(()=>{tw=gsap.to(els,{y:0,opacity:1,duration:.6,stagger:.07,ease:'expo.out',clearProps:'transform,opacity'})});
  return()=>{off();tw&&tw.kill();gsap.set(els,{clearProps:'transform,opacity'})}},[]);
 const nDone=done.filter(Boolean).length;
 return <aside className="brief" ref={ref}>
  <div className="b-in lvl-tag">Уровень {+level.code} · {level.name}</div>
  <h1 className="b-in">{level.title}</h1>
  <div className="b-in goals-head"><span>Задачи</span><b>{nDone}<em> / {level.goals.length}</em></b></div>
  <ul className="b-in goals">{level.goals.map((g,i)=><li key={g} className={done[i]?'on':''}><Tick on={done[i]} k={level.id+i}/>{g}</li>)}</ul>
  <div className="b-in coach-wrap"><Coach thread={thread}/></div>
  <div className="b-in dock">
   <button className="hint-chip" disabled={!thread.hintsLeft} onClick={thread.hint}><i>?</i><span>{thread.hintsLeft?'Подсказка':'Подсказок нет'}<small>{thread.hintsLeft?`−10 очков · ещё ${thread.hintsLeft}`:'вы использовали все'}</small></span></button>
   {level.cheat&&<Reveal className="cheat-rv" panelClass="cheat-panel" label={<><svg viewBox="0 0 22 22" width="20" height="20" aria-hidden="true"><path d="M5 3h9l4 4v12H5z M14 3v4h4 M8 11h7M8 15h5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg><span>Шпаргалка<small>открыть</small></span></>}>
    <b className="rv-i rv-title">{level.cheat.title}</b>
    {level.cheat.items.map(([k,v])=><div key={k} className="rv-i cheat-row"><em>{k}</em><span>{v}</span></div>)}
   </Reveal>}
  </div>
 </aside>;
}

// ---------- Одометр: каждая цифра — лента 0…9, прокручивается и оседает (порт идеи Counter из React Bits) ----------
const DIG='0123456789'.split('');
function Digit({d,delay,dur}){
 const ref=useRef(),cur=useRef(0);
 useLayoutEffect(()=>{const el=ref.current;
  if(reduced()){gsap.set(el,{yPercent:-d*10});cur.current=d;return}
  const from=cur.current;el.classList.toggle('roll',from!==d);
  const tw=gsap.fromTo(el,{yPercent:-from*10},{yPercent:-d*10,duration:dur,delay,ease:'expo.out',onComplete:()=>{el.classList.remove('roll')}});
  cur.current=d;return()=>tw.kill()},[d]);
 return <span className="odo-d"><span className="odo-s" ref={ref}>{DIG.map(c=><i key={c}>{c}</i>)}</span><span className="odo-sz">0</span></span>;
}
export function Odo({value,prefix='',delay=0,dur=1,className=''}){
 const s=String(Math.max(0,Math.round(value||0))),n=s.length;
 return <b className={'odo '+className} aria-label={prefix+s}>{prefix&&<span className="odo-p">{prefix}</span>}{s.split('').map((c,i)=><Digit key={n-i} d={+c} delay={delay+(n-1-i)*.07} dur={dur}/>)}</b>;
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
