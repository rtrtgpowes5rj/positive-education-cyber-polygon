import React,{useEffect,useRef,useState} from 'react';
import Panel3D from '../gl/Panel3D';
import {Briefing,useThread,Win,Btn,Code,TapHint} from '../ui';

// risk — опасная строка (надо исправить), keep — нужна сервису (трогать нельзя)
const files=[
 {path:'/etc/ssh/sshd_config',host:'web-01',lines:[
  {c:'# доступ администраторов'},
  {c:'Port 22'},
  {id:'root',risk:true,chk:'sshd · PermitRootLogin',from:'PermitRootLogin yes',to:'PermitRootLogin no',why:'Прямой вход под root: один подобранный пароль — полный контроль над сервером.'},
  {id:'pass',risk:true,chk:'sshd · PasswordAuthentication',from:'PasswordAuthentication yes',to:'PasswordAuthentication no',why:'Пароль можно перебрать. Вход только по ключам.'},
  {c:'PubkeyAuthentication yes'}
 ]},
 {path:'/etc/nginx/conf.d/portal.conf',host:'web-01',lines:[
  {c:'server {'},
  {id:'listen',keep:true,chk:'nginx · listen 443',from:'  listen 443 ssl;',to:'  # listen 443 ssl;',why:'Портал перестал отвечать клиентам: порт 443 — это и есть сервис.'},
  {id:'tls',risk:true,chk:'nginx · ssl_protocols',from:'  ssl_protocols TLSv1 TLSv1.1 TLSv1.2;',to:'  ssl_protocols TLSv1.2 TLSv1.3;',why:'TLS 1.0 и 1.1 устарели и уязвимы к понижению версии.'},
  {c:'}'}
 ]},
 {path:'core-sw01 · running-config',host:'core-sw01',lines:[
  {c:'hostname core-sw01'},
  {id:'snmp',risk:true,chk:'core-sw01 · SNMP',from:'snmp-server community public RW',to:'snmp-server group NETOPS v3 priv',why:'SNMPv2 с community «public» на запись: конфигурацию может поменять любой в сети.'},
  {id:'log',keep:true,chk:'core-sw01 · logging',from:'logging host 10.20.9.10',to:'no logging host 10.20.9.10',why:'SIEM ослеп: события коммутатора больше не доходят до SOC.'},
  {c:'line vty 0 4'},
  {id:'telnet',risk:true,chk:'core-sw01 · vty transport',from:' transport input telnet ssh',to:' transport input ssh',why:'Telnet передаёт логин и пароль администратора открытым текстом.'}
 ]}
];
const all=files.flatMap(f=>f.lines.filter(l=>l.id));
const risks=all.filter(l=>l.risk);

export default function Hardening({level,onWin}){
 const [fixed,setFixed]=useState({}),[report,setReport]=useState(null),[busy,setBusy]=useState(false),[mistakes,setMistakes]=useState(0),[out,setOut]=useState([]);
 const th=useThread(level),timers=useRef([]),con=useRef(),room=useRef(),cb=useRef({}).current,[hot,setHotS]=useState(null);
 const setHot=id=>{setHotS(id);room.current&&room.current.setHot(id)};
 useEffect(()=>()=>timers.current.forEach(clearTimeout),[]);
 useEffect(()=>{if(con.current)con.current.scrollTop=con.current.scrollHeight},[out]);
 const toggle=l=>{if(busy||!l)return;setReport(null);setOut([]);room.current&&room.current.clearReport();setFixed(f=>({...f,[l.id]:!f[l.id]}))};
 cb.toggle=id=>toggle(all.find(x=>x.id===id));cb.hover=id=>setHotS(id);
 const changed=Object.values(fixed).filter(Boolean).length;

 const scan=()=>{
  setBusy(true);setReport(null);setOut([]);room.current&&room.current.scan();
  const missed=risks.filter(l=>!fixed[l.id]),broken=all.filter(l=>l.keep&&fixed[l.id]);
  const r={};missed.forEach(l=>r[l.id]='missed');broken.forEach(l=>r[l.id]='broken');risks.filter(l=>fixed[l.id]).forEach(l=>r[l.id]='ok');
  const portal=!fixed.listen,siem=!fixed.log;
  const lines=[
   {t:'$ harden-check --profile cis-l1 --hosts web-01,core-sw01',c:'cmd'},
   ...risks.map(l=>({t:`${fixed[l.id]?'[  OK  ]':'[ FAIL ]'}  ${l.chk}`,c:fixed[l.id]?'ok':'bad'})),
   {t:'$ curl -sI https://portal.corp.local',c:'cmd'},
   {t:portal?'HTTP/2 200  server: nginx':'curl: (7) Failed to connect to portal.corp.local port 443',c:portal?'ok':'bad'},
   {t:'$ siem-probe --source core-sw01 --last 5m',c:'cmd'},
   {t:siem?'events: 1284  last: 2s ago':'events: 0  — источник молчит',c:siem?'ok':'bad'}
  ];
  const finish=()=>{
   setReport(r);setBusy(false);room.current&&room.current.setReport(r);
   const left=missed.length,br=broken.length;
   if(!left&&!br){th.say('Сканер чистый, портал отвечает, события идут в SIEM. Поверхность атаки сократилась без простоя.','ok');setTimeout(()=>onWin(mistakes),1700)}
   else{setMistakes(m=>m+left+br);th.say(br?broken[0].why:`Осталось опасных настроек: ${left}. Подсказка: ${missed[0].why}`,'error')}
  };
  lines.forEach((l,i)=>timers.current.push(setTimeout(()=>setOut(o=>[...o,l]),i*230)));
  timers.current.push(setTimeout(finish,lines.length*230+300));
 };

 const surface=report?risks.filter(l=>report[l.id]==='missed').length:null;
 const ok=report&&!risks.some(l=>report[l.id]==='missed')&&!all.some(l=>report[l.id]==='broken');
 const goals=[report?!risks.some(l=>report[l.id]==='missed'):false,report?!fixed.listen:false,report?!fixed.log:false];
 let seq=0;
 return <main className="level hardening">
  <Briefing level={level} thread={th} done={goals}/>
  <div className="work">
   <Win className="editor" title="harden · 3 файла" sub={<TapHint>Нажмите на строку, чтобы заменить её</TapHint>} right={<span className="chip">{changed} изм.</span>}>
    <div className="split"><div className="split-main">
    <div className={'files'+(changed||report?'':' nudge')}>{files.map(f=><div className="file" key={f.path}>
     <div className="file-head"><b>{f.path}</b><span>{f.host}</span></div>
     {f.lines.map((l,i)=>l.id?<button key={l.id} onMouseEnter={()=>setHot(l.id)} onMouseLeave={()=>setHot(null)} className={'cfg '+(fixed[l.id]?'on ':'')+(hot===l.id?'hot ':'')+(report?.[l.id]||'')} style={{'--i':seq++}} onClick={()=>toggle(l)} aria-pressed={!!fixed[l.id]}>
       <span className="ln">{i+1}</span>
       <span className="code-cell">{fixed[l.id]?<><span className="del"><Code>{l.from.trim()}</Code></span><span className="arrow">→</span><span className="add"><Code>{l.to.trim()}</Code></span></>:<Code>{l.from}</Code>}</span>
       <span className="flag">{report?.[l.id]==='missed'?'УЯЗВИМО':report?.[l.id]==='broken'?'СЛОМАН СЕРВИС':report?.[l.id]==='ok'?'ИСПРАВЛЕНО':fixed[l.id]?'ИЗМЕНЕНО':''}</span>
      </button>:<div key={i} className="cfg static"><span className="ln">{i+1}</span><Code>{l.c}</Code></div>)}
    </div>)}</div>
    <div className="console" ref={con}>{out.length?out.map((l,i)=><div key={i} className={'cl '+l.c}>{l.t}</div>):<div className="cl dim">$ _ — внесите правки и запустите проверку</div>}
     {report&&<div className={'cl sum '+(ok?'ok':'bad')}>{ok?'итог: 0 замечаний, сервис доступен':`итог: открыто ${surface}, нарушено ${all.filter(l=>report[l.id]==='broken').length}`}</div>}</div>
    <div className="win-foot"><Btn className="primary" disabled={busy||!changed} onClick={scan}>{busy?'Проверяю…':'Применить и проверить'}</Btn></div>
    </div>
    <Panel3D kind="room" apiRef={room} opts={{cb}} state={{fixed,report}} title="Инфраструктура — нажмите на объект"/></div>
   </Win>
  </div>
 </main>;
}
