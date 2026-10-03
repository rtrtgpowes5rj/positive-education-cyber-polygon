import React,{useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {gsap} from 'gsap';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';
import '@fontsource/caveat/cyrillic-500.css';
import '@fontsource/caveat/cyrillic-700.css';
import './style.css';
import logo from './assets/edu_long.svg';
import {Sk,d,hatch,C} from './sketch';
import {levels,blitz,programs,people,rankFor,ticker,loadQuestions} from './data';
import NetMap from './scene/NetMap';
import NetStage,{net} from './gl/NetStage';
import Hero3D,{hero} from './gl/Hero3D';
import {webglOK} from './gl/core';
import Finale3D from './gl/Finale3D';
import {Arrow,Underline} from './scene/art';
import {reduced,Btn,Avatar,hintStat} from './ui';
import Showcase from './Showcase';
import Demo,{demoOrder} from './Demo';
import Confetti from './Confetti';
import {accScore,speedScore,blitzScore,makeResult,fmtTime} from './scoring';
import {loadBoard,placeOf,addRecord} from './records';
import {NickPrompt,BoardAdmin,MiniBoard} from './RecordsUI';
import Perimeter from './levels/Perimeter';
import Hardening from './levels/Hardening';
import Traffic from './levels/Traffic';
import Soc from './levels/Soc';
import Agent from './levels/Agent';

if(import.meta.env.DEV)window.gsap=gsap;
const views={perimeter:Perimeter,hardening:Hardening,traffic:Traffic,soc:Soc,agent:Agent};
const IDLE_MS=120000;
const WARN_MS=15000;
const fmt=s=>String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');

// сцена 1920×1080 вписывается в любое окно
function useFit(){
 const [k,setK]=useState(1);
 useLayoutEffect(()=>{const f=()=>setK(Math.min(innerWidth/1920,innerHeight/1080));f();addEventListener('resize',f);return()=>removeEventListener('resize',f)},[]);
 return k;
}

function Hud({level,score,seconds,onHome}){
 const xs=levels.map((_,i)=>30+i*120);
 return <header className="hud">
  <button className="logo" onClick={onHome} aria-label="В начало"><img src={logo} alt="Positive Education"/></button>
  <ol className="steps">{levels.map((l,i)=><li key={l.id} className={i<level?'done':i===level?'now':''}>
   <svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true"><Sk of={d.ell('hs'+i,20,20,30,30,{stroke:i<level?C.mint:i===level?C.red:C.faint,strokeWidth:2,roughness:1.4,...(i===level?hatch(C.red,4,-40,1.6):{})})}/>
    {i<level&&<Sk of={d.lines('hc'+i,[[12,21],[18,27],[29,13]],{stroke:C.mint,strokeWidth:2.6,roughness:.5})}/>}</svg>
   <span><small>{l.code}</small>{l.name}</span></li>)}</ol>
  <div className="hud-right"><div><small>очки</small><b>{score}</b></div><div><small>время</small><b>{fmt(seconds)}</b></div></div>
 </header>;
}


function Attract({onStart,onDemo,diving}){
 const ref=useRef();
 const rec=loadBoard().slice(0,5).map((r,i)=>`★ ${i+1}. ${r.name} — ${r.score} очков · ${fmtTime(r.secs)}`);
 const items=[...ticker.slice(0,3),...(rec.length?rec:['★ Таблица рекордов пуста — станьте первым']),...ticker.slice(3)];
 useEffect(()=>{if(reduced())return;const q=s=>ref.current.querySelectorAll(s);
  const tl=gsap.timeline({delay:.15});
  tl.from(q('.att-anim'),{opacity:0,y:28,duration:.8,stagger:.1,ease:'power3.out'},0);
  return()=>tl.kill()},[]);
 return <main className={"attract"+(diving?" diving":"")} ref={ref}>
  <div className="att-grad"/>
  {!webglOK()&&<div className="att-map"><NetMap/></div>}
  <div className="att-copy">
   <img className="att-anim att-logo" src={logo} alt="Positive Education"/>
   <h1 className="att-anim">Вас атакуют.<br/><em>Прямо сейчас.<svg viewBox="0 0 520 20" preserveAspectRatio="none" aria-hidden="true"><Underline x={4} y={12} w={510} k="att"/></svg></em></h1>
   <p className="att-anim">Расставьте защиту, настройте конфигурации, найдите атакующего в трафике и событиях — и проверьте код ИИ-агента до мёржа.</p>
   <ol className="att-anim att-levels">{levels.map(l=><li key={l.id}><span>{l.code}</span>{l.name}</li>)}</ol>
   <Btn className="att-anim primary big" onClick={e=>{e.stopPropagation();onStart()}}>Начать смену</Btn>
   <p className="att-anim att-how"><span>1</span>тяните и кликайте<span>2</span>коллега подскажет<span>3</span>в конце — программы с QR</p>
  </div>
  <button className="demo-open" onClick={e=>{e.stopPropagation();onDemo()}}>Демо-режим</button>
  <div className="att-ticker" aria-hidden="true"><div className="tk-track">{[0,1].map(k=><div key={k} className="tk-set">{items.map((t,i)=><span key={i}>{t}</span>)}</div>)}</div></div>
 </main>;
}

function LevelIntro({level,onDone}){
 const ref=useRef();
 useEffect(()=>{
  if(reduced()){const t=setTimeout(onDone,700);return()=>clearTimeout(t)}
  const q=s=>ref.current.querySelector(s);
  const tl=gsap.timeline({onComplete:onDone});
  tl.fromTo(ref.current,{opacity:0},{opacity:1,duration:.25})
   .from(q('.li-num'),{yPercent:55,opacity:0,duration:.7,ease:'power4.out'})
   .fromTo(q('.li-rule path'),{strokeDasharray:1,strokeDashoffset:1},{strokeDashoffset:0,duration:.7,ease:'power2.inOut'},'<.1')
   .from(q('.li-name'),{y:24,opacity:0,duration:.5,ease:'power3.out'},'<.2')
   .from(q('.li-title'),{y:16,opacity:0,duration:.5,ease:'power3.out'},'<.1')
   .from(q('.li-who'),{opacity:0,x:-14,duration:.5},'<.2')
   .from(q('.li-how'),{opacity:0,y:12,duration:.5},'<.15')
   .to({},{duration:1.8})
   .to(ref.current,{clipPath:'inset(0 0 100% 0)',duration:.6,ease:'power3.inOut'});
  return()=>tl.kill();
 },[]);
 const p=people[level.who];
 return <div className="level-intro" ref={ref} onClick={onDone}>
  <div className="li-num">{level.code}</div>
  <svg className="li-rule" viewBox="0 0 520 18" preserveAspectRatio="none"><Sk of={d.curve('lir'+level.id,[[4,9],[130,4],[300,13],[516,6]],{stroke:C.red,strokeWidth:4,roughness:1.3})}/></svg>
  <div className="li-name">Уровень {level.code} · {level.name}</div>
  <div className="li-title">{level.title}</div>
  <div className="li-how"><span>Как играть</span>{level.how}</div>
  <div className="li-who"><Avatar who={level.who} size={46}/><span>Задачу ставит <b>{p.name}</b>, {p.role}</span></div>
 </div>;
}

function Debrief({level,mistakes,hints=0,secs=0,onAnswer,onNext,last}){
 const b=useMemo(()=>{const pool=blitz[level.id];return pool[Math.floor(Math.random()*pool.length)]},[level.id]);
 const [ans,setAns]=useState(null),[shot,setShot]=useState(null),[bs,setBs]=useState(0),ref=useRef(),t0=useRef(Date.now());
 const acc=accScore(mistakes,hints),spd=speedScore(level.id,secs),bl=ans==null?0:blitzScore(ans===b.ok,bs);
 useEffect(()=>{if(!reduced())gsap.from(ref.current.querySelectorAll('.d-anim'),{y:26,opacity:0,duration:.6,stagger:.06,ease:'power3.out'})},[]);
 useEffect(()=>{if(ans!=null&&!reduced())gsap.from(ref.current.querySelectorAll('.d-late'),{y:20,opacity:0,duration:.5,stagger:.05,ease:'power3.out'})},[ans]);
 const choose=i=>{if(ans!=null)return;const sec=(Date.now()-t0.current)/1000;setBs(sec);setAns(i);onAnswer(i===b.ok,sec);
  if(i===b.ok)setShot({x:960,y:620,k:Date.now()});else if(!reduced())gsap.fromTo(ref.current,{x:-14},{x:0,duration:.6,ease:'elastic.out(1,.25)',clearProps:'x'})};
 return <div className="debrief-wrap"><Confetti shot={shot}/><div className="debrief" ref={ref}>
  <div className="d-anim d-head"><svg className="d-check" viewBox="0 0 48 48" aria-hidden="true"><Sk of={d.ell('dc'+level.id,24,24,42,42,{...hatch('#1d4a39',5,-40,1.4),stroke:C.mint,strokeWidth:2.2})}/><Sk of={d.lines('dcc'+level.id,[[14,25],[21,32],[34,16]],{stroke:C.ink,strokeWidth:3,roughness:.5})}/></svg>
   <div><small>Уровень {level.code} пройден за {fmtTime(secs)}</small><b>{level.name}</b></div>
   <div className="d-pts"><b>+{acc+spd+bl}</b><small>из 200 возможных</small></div></div>
  <div className="d-anim d-brk">
   <div><small>Точность</small><b>+{acc}</b><em>{mistakes?`ошибок: ${mistakes}`:'без ошибок'}{hints?` · подсказок: ${hints}`:''}</em></div>
   <div><small>Скорость</small><b>+{spd}</b><em>{spd>=45?'очень быстро':spd>=25?'неплохо':'можно быстрее'}</em></div>
   <div className={ans==null?'wait':''}><small>Блиц</small><b>{ans==null?'?':'+'+bl}</b><em>{ans==null?'ответьте ниже':ans===b.ok?`ответ за ${Math.round(bs)} с`:'неверно'}</em></div>
  </div>
  <div className="d-anim blitz"><div className="blitz-tag">Блиц · до +50 · чем быстрее, тем больше</div><h2>{b.q}</h2>
   <div className="answers">{b.a.map((a,i)=><button key={i} onClick={()=>choose(i)} disabled={ans!=null} className={ans==null?'':i===b.ok?'right':i===ans?'wrong':'dim'}><span>{String.fromCharCode(65+i)}</span>{a}</button>)}</div>
   {ans!=null&&<p className={'why d-late '+(ans===b.ok?'ok':'no')}>{ans===b.ok?'Верно. ':'Не совсем. '}{b.why}</p>}
  </div>
  {ans!=null&&<div className="d-progs d-late"><Btn className="primary" onClick={onNext}>{last?'Итоги смены':'Следующий уровень'}</Btn></div>}
 </div></div>;
}

function Results({results,onNext,onRestart,record}){
 const total=results.reduce((s,r)=>s+r.total,0),playSecs=results.reduce((s,r)=>s+r.secs+r.blitzSecs,0),speedSum=results.reduce((s,r)=>s+r.speed,0);
 const ref=useRef(),num=useRef(),place=useMemo(()=>record?placeOf(total,playSecs):null,[]);
 const [prompt,setPrompt]=useState(false),[mine,setMine]=useState(null),[askedOnce,setAsked]=useState(false),[bump,setBump]=useState(0);
 useEffect(()=>{
  if(reduced()){num.current.textContent=total}else{
   const o={v:0};gsap.to(o,{v:total,duration:1.6,ease:'power2.out',delay:.5,onUpdate:()=>num.current&&(num.current.textContent=Math.round(o.v))});
   gsap.from(ref.current.querySelectorAll('.f-anim'),{y:30,opacity:0,duration:.7,stagger:.07,ease:'power3.out'});
   gsap.from(ref.current.querySelectorAll('.f-bar i'),{scaleX:0,duration:1,stagger:.08,ease:'power3.out',delay:.6});
  }
  if(place){const t=setTimeout(()=>{setPrompt(true);setAsked(true)},2800);return()=>clearTimeout(t)}
 },[]);
 const save=name=>{const r=addRecord(name,total,playSecs);setMine(r.at);setPrompt(false);setBump(x=>x+1)};
 return <main className="results" ref={ref}>
  <section className="r-left">
   <span className="f-anim kicker">Смена закончена · время прохождения {fmtTime(playSecs)}</span>
   <h1 className="f-anim">Атака<br/><em>остановлена.<svg viewBox="0 0 640 22" preserveAspectRatio="none" aria-hidden="true"><Underline x={4} y={13} w={630} k="res"/></svg></em></h1>
   <div className="f-anim score"><b ref={num}>0</b><span>/ 1000</span><em>{rankFor(total)}</em></div>
   <div className="f-anim r-meta"><span>бонус скорости <b>+{speedSum}</b></span>{place&&!mine&&<span>место на стенде <b>{place}</b></span>}{mine&&<span className="ok">записано в рекорды ✓</span>}</div>
   <div className="f-anim r-btns"><Btn className="primary big" onClick={onNext}>К программам обучения</Btn>{place&&!mine&&askedOnce&&!prompt&&<button className="ghost-btn" onClick={()=>setPrompt(true)}>Оставить ник</button>}<button className="ghost-btn" onClick={onRestart}>Пройти заново</button></div>
  </section>
  <section className="r-right">
   <ol className="r-levels">{levels.map((l,i)=>{const r=results[i]||{total:0};return <li key={l.id} className="f-anim"><span className="c">{l.code}</span><span className="n">{l.name}</span><span className="f-bar"><i style={{transform:`scaleX(${r.total/200})`}}/></span><b>{r.total}</b></li>})}</ol>
   <div className="f-anim"><MiniBoard key={bump} mine={mine}/></div>
  </section>
  {prompt&&<NickPrompt place={place} score={total} secs={playSecs} onSave={save} onSkip={()=>setPrompt(false)}/>}
 </main>;
}

const fakeResults=()=>levels.map((_,i)=>{const acc=100-i*10,speed=46-i*7,blitz=i%2?0:44;return{acc,speed,blitz,total:acc+speed+blitz,secs:44+i*12,blitzSecs:7,mistakes:i,hints:0}});

function IdleWarn({left}){
 return <div className="idle-warn"><div><b>Вы ещё здесь?</b><p>Нажмите в любом месте, чтобы продолжить. Через {left} с игра вернётся на заставку.</p></div></div>;
}

function App(){
 const k=useFit();
 const [screen,setScreen]=useState('attract'),[li,setLi]=useState(0),[intro,setIntro]=useState(false);
 const [results,setResults]=useState([]),[pending,setPending]=useState(null),[t0,setT0]=useState(0),[seconds,setSeconds]=useState(0),[runId,setRunId]=useState(0);
 const [demo,setDemo]=useState(false),[idleLeft,setIdleLeft]=useState(null),[diving,setDiving]=useState(false);
 const keyRef=useRef(''),lastTouch=useRef(Date.now()),demoRef=useRef(false),lvT0=useRef(Date.now()),[admin,setAdmin]=useState(false);demoRef.current=demo;
 useEffect(()=>{const k=e=>{if(e.ctrlKey&&e.shiftKey&&(e.key==='L'||e.key==='l'||e.key==='Д'||e.key==='д')){e.preventDefault();setAdmin(a=>!a)}};addEventListener('keydown',k);return()=>removeEventListener('keydown',k)},[]);
 useEffect(()=>{net.set({mode:screen==='play'?'play':'attract',slotsVisible:screen==='play'&&li===0})},[screen,li]);
 useEffect(()=>{loadQuestions()},[]);
 useEffect(()=>{if(!import.meta.env.DEV)return;const h=location.hash.match(/^#(l([1-5])|results|final|demo)$/);if(!h)return;
  if(h[1]==='demo'){setDemo(true);return}
  if(h[1]==='results'||h[1]==='final'){setResults(fakeResults());setSeconds(287);setScreen(h[1]==='final'?'final':'results');return}
  hintStat.n=0;lvT0.current=Date.now();setLi(+h[2]-1);setT0(Date.now());setScreen('play')},[]);
 const score=results.reduce((s,r)=>s+r.total,0);

 const start=()=>{lvT0.current=Date.now();hintStat.n=0;setResults([]);setLi(0);setPending(null);setT0(Date.now());setSeconds(0);setRunId(x=>x+1);setScreen('play');setIntro(true)};
 const home=()=>{setScreen('attract');setPending(null);setIntro(false)};
 useEffect(()=>{if(screen!=='play')return;const t=setInterval(()=>setSeconds(Math.floor((Date.now()-t0)/1000)),1000);return()=>clearInterval(t)},[screen,t0]);
 useEffect(()=>{
  const touch=()=>{lastTouch.current=Date.now();setIdleLeft(null)};
  ['pointerdown','keydown'].forEach(e=>addEventListener(e,touch));
  const t=setInterval(()=>{
   if(demoRef.current)return;
   const idle=Date.now()-lastTouch.current;
   setScreen(s=>{
    if(s==='attract'){return s}
    if(idle>IDLE_MS){setPending(null);setIntro(false);setIdleLeft(null);return 'attract'}
    setIdleLeft(idle>IDLE_MS-WARN_MS?Math.ceil((IDLE_MS-idle)/1000):null);return s;
   });
  },1000);
  return()=>{['pointerdown','keydown'].forEach(e=>removeEventListener(e,touch));clearInterval(t)};
 },[]);

 const win=m=>setPending({mistakes:m,hints:hintStat.n,secs:Math.round((Date.now()-lvT0.current)/1000),blitz:null,blitzSecs:0});
 const answer=(ok,sec)=>setPending(p=>({...p,blitz:ok,blitzSecs:sec}));
 const next=()=>{const r=makeResult(L.id,{mistakes:pending.mistakes,hints:pending.hints,secs:pending.secs,blitzOk:pending.blitz,blitzSecs:pending.blitzSecs});const all=[...results,r];setResults(all);setPending(null);hintStat.n=0;
  if(li===levels.length-1){setScreen('results');return}setLi(li+1);setIntro(true)};

 // демо: переход на любой экран без прохождения
 const demoAt=screen==='play'?(pending?'debrief':'l'+li):screen;
 const go=target=>{
  const i=demoOrder.indexOf(demoAt);
  if(target==='prev')target=demoOrder[Math.max(0,i-1)];
  if(target==='next')target=demoOrder[Math.min(demoOrder.length-1,i+1)];
  hintStat.n=0;setIntro(false);setPending(null);
  if(target==='attract'){setScreen('attract');return}
  if(target==='results'||target==='final'){setResults(fakeResults());setSeconds(287);setScreen(target);return}
  setRunId(x=>x+1);setT0(Date.now());setSeconds(0);lvT0.current=Date.now();
  if(target==='debrief'){setResults(fakeResults().slice(0,li));setPending({mistakes:1,hints:0,secs:42,blitz:null,blitzSecs:0});setScreen('play');return}
  const n=+target.slice(1);setResults(fakeResults().slice(0,n));setLi(n);setScreen('play');
 };
 const beginDive=()=>{if(diving)return;if(!webglOK()||!hero.api||reduced()){start();return}setDiving(true);hero.api.dive(()=>{start();setDiving(false)})};
 const startDemo=()=>{setDemo(true);go('l0')};
 const exitDemo=()=>{setDemo(false);setResults([]);setPending(null);setScreen('attract')};

 const L=levels[li],View=views[L.id];
 keyRef.current=screen==='play'?runId+'-'+li:'';
 const shown=score+(pending?accScore(pending.mistakes,pending.hints)+speedScore(L.id,pending.secs)+(pending.blitz==null?0:blitzScore(pending.blitz,pending.blitzSecs)):0);
 return <div className="viewport"><div className={'stage'+(webglOK()?'':' nogl')} style={{transform:`translate(-50%,-50%) scale(${k})`}}>
  {screen==='attract'&&webglOK()&&<Hero3D diving={diving} quality={+(new URLSearchParams(location.search).get('q'))||Math.min(2,k*(window.devicePixelRatio||1))}/>}
  {screen==='play'&&li===0&&webglOK()&&<NetStage quality={+(new URLSearchParams(location.search).get('q'))||Math.min(2,k*(window.devicePixelRatio||1))}/>}
  {(screen==='results'||screen==='final')&&webglOK()&&<Finale3D dim={screen==='final'?1:0} quality={+(new URLSearchParams(location.search).get('q'))||Math.min(2,k*(window.devicePixelRatio||1))}/>}
  {screen==='attract'&&<Attract onStart={beginDive} onDemo={startDemo} diving={diving}/>}
  {screen==='play'&&<>
   <Hud level={li} score={shown} seconds={seconds} onHome={home}/>
   <div className={'level-host'+(pending?' dim':'')} key={runId+'-'+li}><View level={L} onWin={m=>{if(keyRef.current===runId+'-'+li)win(m)}}/></div>
   {pending&&<Debrief key={'d'+li+runId} level={L} mistakes={pending.mistakes} hints={pending.hints} secs={pending.secs} onAnswer={answer} onNext={next} last={li===levels.length-1}/>}
   {intro&&<LevelIntro key={'i'+li} level={L} onDone={()=>{lvT0.current=Date.now();setIntro(false)}}/>}
  </>}
  {screen==='results'&&<><Hud level={levels.length} score={score} seconds={seconds} onHome={home}/><Results results={results} record={!demo} onNext={()=>setScreen('final')} onRestart={start}/></>}
  {screen==='final'&&<><Hud level={levels.length} score={score} seconds={seconds} onHome={home}/><Showcase results={results} onRestart={start}/></>}
  {idleLeft!=null&&!demo&&<IdleWarn left={idleLeft}/>}
  {demo&&<Demo at={demoAt} onGo={go} onExit={exitDemo}/>}
  {admin&&<BoardAdmin onClose={()=>setAdmin(false)}/>}
 </div></div>;
}
createRoot(document.getElementById('root')).render(<App/>);
