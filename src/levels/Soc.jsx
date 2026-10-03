import React,{useEffect,useRef,useState} from 'react';
import {Sk,d,hatch,C} from '../sketch';
import {Briefing,useThread,Win,Btn,stagePt} from '../ui';
import Panel3D from '../gl/Panel3D';
import {webglOK} from '../gl/core';

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

const Node=({k,x,y,w=84,h=46,label,cls=''})=><g className={'node '+cls} transform={`translate(${x} ${y})`}>
 <Sk of={d.rect('nd'+k,0,0,w,h,{...hatch('#2f3136',6,-42),strokeWidth:1.8})}/>
 <text className="mono nl" x={w/2} y={h/2+4} textAnchor="middle">{label}</text>
</g>;

function Map({lit,cut}){
 return <svg className={'soc-map'+(lit?' lit':'')+(cut?' cut':'')} viewBox="0 0 560 250" aria-hidden="true">
  <Sk className="edge e1" of={d.lines('e1',[[132,120],[250,62]],{stroke:C.dim,strokeWidth:2})}/>
  <Sk className="edge e2" of={d.lines('e2',[[132,138],[250,176]],{stroke:C.dim,strokeWidth:2})}/>
  {[0,1,2,3,4,5].map(i=><Sk key={i} className="edge e4" of={d.lines('e4'+i,[[342,176],[404+(i%3)*50,i<3?120:196]],{stroke:C.dim,strokeWidth:1.6})}/>)}
  <Node k="ws" x={48} y={104} label="WS-114" cls="n-ws"/>
  <Node k="dc" x={250} y={32} label="DC-01"/>
  <Node k="fs" x={250} y={152} label="SRV-FILE" cls="n-fs"/>
  {[0,1,2,3,4,5].map(i=><g key={i} transform={`translate(${392+(i%3)*50} ${i<3?96:172})`}><Sk of={d.rect('sv'+i,0,0,34,34,{...hatch('#2f3136',6,-42),strokeWidth:1.6})}/></g>)}
  <text className="hand" x="468" y="244" textAnchor="middle">6 серверов</text>
  <g className="lsass"><Sk of={d.ell('ls',292,175,128,64,{stroke:C.red,strokeWidth:2.2,roughness:1.8,bowing:3})}/></g>
  {cut&&<g className="cutmark"><Sk of={d.lines('x1',[[52,100],[132,150]],{stroke:C.mint,strokeWidth:3})}/><Sk of={d.lines('x2',[[132,100],[52,150]],{stroke:C.mint,strokeWidth:3})}/><text className="hand" x="90" y="82" textAnchor="middle" fill={C.mint}>изолирован</text></g>}
 </svg>;
}

const GL=webglOK();
export default function Soc({level,onWin}){
 const [chain,setChain]=useState([null,null,null,null]),[pick,setPick]=useState(null),[phase,setPhase]=useState('build'),[mistakes,setMistakes]=useState(0),[bad,setBad]=useState([]);
 const th=useThread(level),gr=useRef();
 const drag=useRef(null),slotEls=useRef([]),[ghost,setGhost]=useState(null),ghostEl=useRef(),ghostPos=useRef({x:0,y:0});
 const used=new Set(chain.filter(Boolean));

 const put=(id,i)=>{if(phase!=='build'||!id)return;setBad([]);setChain(c=>{const n=c.map(x=>x===id?null:x);n[i]=id;return n});setPick(null);th.say(`${byId[id].code} · ${byId[id].src} — на этап «${stages[i].name}».`)};
 const clear=i=>{if(phase!=='build')return;setBad([]);setChain(c=>c.map((x,j)=>j===i?null:x))};

 useEffect(()=>{
  const move=e=>{const dr=drag.current;if(!dr)return;if(!dr.moving&&Math.hypot(e.clientX-dr.x,e.clientY-dr.y)>8)dr.moving=true;if(dr.moving){const p=stagePt(e);ghostPos.current=p;if(ghostEl.current){ghostEl.current.style.left=p.x+'px';ghostEl.current.style.top=p.y+'px'}setGhost(g=>g&&g.id===dr.id?g:{id:dr.id});if(GL&&gr.current){gr.current.setArmed(true);gr.current.setHover(gr.current.padAt(e.clientX,e.clientY));gr.current.setHost(byId[dr.id].src)}}};
  const up=e=>{const dr=drag.current;if(!dr)return;drag.current=null;setGhost(null);if(GL&&gr.current){gr.current.setHover(-1);gr.current.setArmed(!!pick)}if(!dr.moving)return;const i=GL&&gr.current?gr.current.padAt(e.clientX,e.clientY):slotEls.current.findIndex(el=>{if(!el)return false;const r=el.getBoundingClientRect();return e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom});if(i>=0)put(dr.id,i)};
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

 useEffect(()=>{const a=gr.current;if(!a)return;if(phase==='respond')a.reveal();if(phase==='done')a.isolate();if(phase==='build')a.reset()},[phase]);
 useEffect(()=>{const a=gr.current;if(a){a.setHost(pick?byId[pick].src:null);a.setArmed(!!pick)}},[pick]);
 useEffect(()=>{const a=gr.current;if(a&&GL)a.setChain(chain.map(id=>id?{id,code:byId[id].code,src:byId[id].src}:null))},[chain]);
 useEffect(()=>{const a=gr.current;if(a&&GL)a.setBad(bad)},[bad]);
 const boardClick=e=>{if(phase!=='build')return;const a=gr.current;if(!a)return;const i=a.padAt(e.clientX,e.clientY,170);if(i<0)return;if(pick)put(pick,i);else if(chain[i])clear(i)};
 const boardMove=e=>{const a=gr.current;if(a&&!drag.current)a.setHover(phase==='build'?a.padAt(e.clientX,e.clientY,150):-1)};
 const goals=[phase!=='build',phase==='done'];
 return <main className="level soc">
  <Briefing level={level} thread={th} done={goals}/>
  <div className="work">
   <Win className="siem" title="MaxPatrol SIEM · инцидент" sub="события за последние 40 минут" right={<span className="chip">{used.size} / 4 в цепочке</span>}>
    <div className="siem-grid">
     <div className="feed">
      <div className="feed-h"><span>время</span><span>событие</span><span>хост</span></div>
      {events.map(e=><button key={e.id} className={'ev'+(pick===e.id?' pick':'')+(used.has(e.id)?' used':'')} disabled={phase!=='build'}
        onPointerDown={ev=>{drag.current={id:e.id,x:ev.clientX,y:ev.clientY,moving:false}}}
        onClick={()=>{setPick(pick===e.id?null:e.id);if(pick!==e.id)th.say('Теперь выбери этап цепочки справа.')}}>
       <span className="t">{e.time}</span><span className={'code '+e.type.toLowerCase()}>{e.code}</span><span className="src">{e.src}</span><span className="txt">{e.text}</span>
      </button>)}
     </div>
     <div className="side">
      {GL?<Panel3D kind="board" className="board" apiRef={gr} opts={{stages:stages.map(s=>s.name)}} state={{}} title="доска расследования · перетащите события на площадки"><div className="board-hit" onClick={boardClick} onPointerMove={boardMove} onPointerLeave={()=>gr.current&&gr.current.setHover(-1)}/></Panel3D>:<Map lit={phase!=='build'} cut={phase==='done'}/>}
      {!GL&&<ol className="kill">{stages.map((s,i)=>{const e=chain[i]&&byId[chain[i]];return <li key={s.id} ref={el=>slotEls.current[i]=el} className={(e?'filled ':'')+(bad.includes(i)?'bad ':'')+(phase!=='build'?'locked':'')} onClick={()=>pick?put(pick,i):e&&clear(i)}>
       <span className="idx">{i+1}</span>
       <div><small>{s.name} · {s.hint}</small>{e?<b><code>{e.code}</code> {e.src} — {e.text}</b>:<b className="ph">{pick?'Нажмите, чтобы поставить сюда':'перетащите событие'}</b>}</div>
      </li>})}</ol>}
      {phase==='build'&&<Btn className="primary" disabled={used.size<4} onClick={verify}>Проверить цепочку</Btn>}
      {phase!=='build'&&<div className="respond"><small>Реагирование</small>{responses.map(r=><button key={r.id} onClick={()=>respond(r)} className={phase==='done'&&r.ok?'ok':''}>{r.label}</button>)}</div>}
     </div>
    </div>
   </Win>
  </div>
  {ghost&&<div ref={ghostEl} className="ghost chip-ghost" style={{left:ghostPos.current.x,top:ghostPos.current.y}}><b>{byId[ghost.id].code}</b><small>{byId[ghost.id].src}</small></div>}
 </main>;
}
