import React,{useEffect,useRef,useState} from 'react';
import {Briefing,useThread,Win,Btn,stagePt} from '../ui';

const events=[
 {id:'n1',time:'08:58:12',src:'WS-087',code:'4624',type:'Security',text:'a.ivanova — интерактивный вход (тип 2)'},
 {id:'s1',time:'09:12:04',src:'DC-01',code:'4625 ×212',type:'Security',text:'Неудачные входы: 37 учётных записей с WS-114 за 2 минуты'},
 {id:'n2',time:'09:13:40',src:'DC-01',code:'4740',type:'Security',text:'p.smirnov заблокирован после 5 попыток ввода пароля'},
 {id:'s2',time:'09:21:55',src:'SRV-FILE',code:'4672',type:'Security',text:'svc_backup получил специальные привилегии при входе с WS-114'},
 {id:'n3',time:'09:24:10',src:'WS-087',code:'Sysmon 1',type:'Sysmon',text:'chrome.exe --type=renderer, родитель chrome.exe'},
 {id:'s3',time:'09:27:31',src:'SRV-FILE',code:'Sysmon 10',type:'Sysmon',text:'rundll32.exe comsvcs.dll MiniDump — доступ к памяти lsass.exe'},
 {id:'n4',time:'09:30:00',src:'SRV-UPD',code:'4672',type:'Security',text:'SYSTEM — запуск службы обновлений по расписанию'},
 {id:'s4',time:'09:33:18',src:'6 хостов',code:'4624 тип 3',type:'Security',text:'svc_backup: сетевые входы по NTLM на 6 серверов за 40 секунд'}
];
const stages=[
 {id:'s1',name:'Подбор пароля',hint:'начальный доступ'},
 {id:'s2',name:'Повышение привилегий',hint:'права в системе'},
 {id:'s3',name:'Кража учётных данных',hint:'дамп памяти'},
 {id:'s4',name:'Перемещение по сети',hint:'pass-the-hash'}
];
const responses=[
 {id:'iso',label:'Изолировать WS-114 и SRV-FILE, сбросить пароль svc_backup',ok:true,why:'Точечная изоляция: атака остановлена, остальная сеть работает.'},
 {id:'all',label:'Отключить весь домен до утра',why:'Бизнес встанет вместе с атакующим. Нужна точная изоляция.'},
 {id:'close',label:'Закрыть как ложное: svc_backup — служебная учётка бэкапа',why:'Служебные учётки — любимая цель: права широкие, проверяют их редко.'}
];
const byId=Object.fromEntries(events.map(e=>[e.id,e]));

// Схема пути атаки: чистый вектор, хосты загораются по мере сборки цепочки
const N={ws:{x:16,y:92,w:156,label:'WS-114',sub:'рабочая станция'},dc:{x:252,y:18,w:164,label:'DC-01',sub:'контроллер домена'},fs:{x:252,y:166,w:164,label:'SRV-FILE',sub:'файловый сервер'}};
// Рёбра пути атаки: этап, геометрия, задержка импульса при проверке
const EDGES=[
 {st:'s1',d:'M172 112 C214 112 214 46 252 46',t:0},
 {st:'s2',d:'M172 128 C214 128 214 194 252 194',t:.35},
 {st:'s4',d:'M416 194 C444 194 444 151 468 151',t:.95},
 {st:'s4',d:'M416 194 L468 194',t:.95}
];
function PathMap({chain,phase,bad}){
 const on=id=>chain.includes(id),cut=phase==='done',ok=phase!=='build';
 const Box=({n,hot,iso,t})=><g className={'pm-node'+(hot?' hot':'')+(iso?' iso':'')} transform={`translate(${n.x} ${n.y})`} style={{'--d':t+'s'}}>
  {iso&&<><rect className="pm-ring" x="-6" y="-6" width={n.w+12} height="68" rx="14"/><rect className="pm-ring r2" x="-6" y="-6" width={n.w+12} height="68" rx="14"/></>}
  <rect className="pm-box" width={n.w} height="56" rx="10"/><text className="pm-l" x="14" y="25">{n.label}</text><text className="pm-s" x="14" y="44">{n.sub}</text>
  {iso&&<text className="pm-iso" x={n.w/2} y="-14" textAnchor="middle">изолирован</text>}</g>;
 return <svg className={'pathmap pm-'+phase+(bad.length?' pm-bad':'')} viewBox="0 0 640 240" role="img" aria-label="Путь атаки по сети">
  {EDGES.map((e,k)=><path key={'e'+k} className={'pm-e'+(on(e.st)?' hot':'')+(cut?' cut':'')} d={e.d}/>)}
  {ok&&!cut&&EDGES.map((e,k)=><path key={'p'+k} className="pm-pulse" d={e.d} pathLength="100" style={{'--d':e.t+'s'}}/>)}
  {cut&&<g className="pm-cuts"><path d="M206 70l12 12M218 70l-12 12"/><path d="M206 150l12 12M218 150l-12 12"/><path d="M436 166l12 12M448 166l-12 12"/></g>}
  <Box n={N.ws} hot={on('s1')||on('s2')} iso={cut} t={0}/><Box n={N.dc} hot={on('s1')} t={.3}/><Box n={N.fs} hot={on('s2')||on('s3')} iso={cut} t={.65}/>
  {on('s3')&&<g className="pm-dump"><circle cx="416" cy="166" r="8"/><text x="404" y="150" textAnchor="end">lsass</text></g>}
  {[0,1,2,3,4,5].map(i=><rect key={i} className={'pm-srv'+(on('s4')?' hot':'')+(cut?' safe':'')} x={468+(i%3)*54} y={i<3?134:178} width="40" height="34" rx="7" style={{'--d':(1.15+i*.06)+'s'}}/>)}
  <text className="pm-s" x="549" y="230" textAnchor="middle">6 серверов</text>
 </svg>;
}

export default function Soc({level,onWin}){
 const [chain,setChain]=useState([null,null,null,null]),[pick,setPick]=useState(null),[phase,setPhase]=useState('build'),[mistakes,setMistakes]=useState(0),[bad,setBad]=useState([]);
 const th=useThread(level),[over,setOver]=useState(-1);
 const drag=useRef(null),slotEls=useRef([]),[ghost,setGhost]=useState(null),ghostEl=useRef(),ghostPos=useRef({x:0,y:0});
 const used=new Set(chain.filter(Boolean));

 const put=(id,i)=>{if(phase!=='build'||!id)return;setBad([]);setChain(c=>{const n=c.map(x=>x===id?null:x);n[i]=id;return n});setPick(null);th.say(`${byId[id].code} · ${byId[id].src} — на этап «${stages[i].name}».`)};
 const clear=i=>{if(phase!=='build')return;setBad([]);setChain(c=>c.map((x,j)=>j===i?null:x))};

 useEffect(()=>{
  const slotAt=(x,y)=>slotEls.current.findIndex(el=>{if(!el)return false;const r=el.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom});
  const move=e=>{const dr=drag.current;if(!dr)return;if(!dr.moving&&Math.hypot(e.clientX-dr.x,e.clientY-dr.y)>8)dr.moving=true;if(dr.moving){const p=stagePt(e);ghostPos.current=p;if(ghostEl.current){ghostEl.current.style.left=p.x+'px';ghostEl.current.style.top=p.y+'px'}setGhost(g=>g&&g.id===dr.id?g:{id:dr.id});setOver(slotAt(e.clientX,e.clientY))}};
  const up=e=>{const dr=drag.current;if(!dr)return;drag.current=null;setGhost(null);setOver(-1);if(!dr.moving)return;const i=slotAt(e.clientX,e.clientY);if(i>=0)put(dr.id,i)};
  window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);return()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up)};
 });

 const verify=()=>{
  const wrong=chain.map((id,i)=>id!==stages[i].id?i:-1).filter(i=>i>=0);
  if(!wrong.length){setPhase('respond');th.say('Цепочка подтверждена: WS-114 → SRV-FILE → шесть серверов. Теперь — как остановим?','ok');return}
  setBad(wrong);setMistakes(m=>m+wrong.length);
  const e=chain[wrong[0]]&&byId[chain[wrong[0]]];
  th.say(e&&e.id.startsWith('n')?`«${e.text}» — фоновая активность, не часть атаки.`:`Этапов не на месте: ${wrong.length}. Сверь время и хосты — атака идёт от WS-114.`,'error');
 };
 const respond=r=>{if(phase==='done')return;if(r.ok){setPhase('done');th.say(r.why,'ok');setTimeout(()=>onWin(mistakes),2200)}else{setMistakes(m=>m+1);th.say(r.why,'error')}};

 const goals=[phase!=='build',phase==='done'];
 return <main className="level soc">
  <Briefing level={level} thread={th} done={goals}/>
  <div className="work">
   <Win className="siem" title="MaxPatrol SIEM · инцидент" sub="События за последние 40 минут" right={<span className="chip">{used.size} / 4 в цепочке</span>}>
    <div className="siem-grid">
     <div className="feed">
      <div className="feed-h"><span>Время</span><span>Событие</span><span>Хост</span></div>
      {events.map(e=><button key={e.id} className={'ev'+(pick===e.id?' pick':'')+(used.has(e.id)?' used':'')} disabled={phase!=='build'}
        onPointerDown={ev=>{drag.current={id:e.id,x:ev.clientX,y:ev.clientY,moving:false}}}
        onClick={()=>{setPick(pick===e.id?null:e.id);if(pick!==e.id)th.say('Теперь выбери этап цепочки справа.')}}>
       <span className="t">{e.time}</span><span className={'code '+e.type.toLowerCase()}>{e.code}</span><span className="src">{e.src}</span><span className="txt">{e.text}</span>
      </button>)}
     </div>
     <div className="side">
      <PathMap key={phase+bad.join()} chain={chain} phase={phase} bad={bad}/>
      <ol className={"chain ch-"+phase}>{stages.map((s,i)=>{const e=chain[i]&&byId[chain[i]];return <li key={s.id+(bad.includes(i)?'b':'')} style={{'--i':i}} ref={el=>slotEls.current[i]=el} className={'ch-step'+(e?' filled':'')+(bad.includes(i)?' bad':'')+(phase!=='build'?' locked':'')+(pick||ghost?' armed':'')+(over===i?' over':'')} onClick={()=>pick?put(pick,i):e&&clear(i)}>
       <i className="ch-dot" aria-hidden="true"/>
       <div className="ch-name"><b>{s.name}</b><span>{s.hint}</span></div>
       <div className="ch-slot">{e?<><code>{e.code}</code><span className="ch-host">{e.src}</span><span className="ch-txt">{e.text}</span></>:<span className="ch-ph">{pick?'Нажмите, чтобы поставить сюда':'Перетащите событие сюда'}</span>}</div>
      </li>})}</ol>
      {phase==='build'&&<Btn className="primary" disabled={used.size<4} onClick={verify}>Проверить цепочку</Btn>}
      {phase!=='build'&&<div className="respond"><small>Реагирование</small>{responses.map(r=><button key={r.id} onClick={()=>respond(r)} className={phase==='done'&&r.ok?'ok':''}>{r.label}</button>)}</div>}
     </div>
    </div>
   </Win>
  </div>
  {ghost&&<div ref={ghostEl} className="ghost chip-ghost" style={{left:ghostPos.current.x,top:ghostPos.current.y}}><b>{byId[ghost.id].code}</b><small>{byId[ghost.id].src}</small></div>}
 </main>;
}
