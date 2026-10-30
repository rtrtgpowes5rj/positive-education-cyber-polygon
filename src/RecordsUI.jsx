import React,{useEffect,useRef,useState} from 'react';
import {gsap} from 'gsap';
import {Btn,reduced} from './ui';
import {fmtTime} from './scoring';
import {loadBoard,removeRecord,clearBoard,nickTaken} from './records';
import {VList} from './VList';

const LAYOUTS={
 ru:['1234567890','йцукенгшщзхъ','фывапролджэ','ячсмитьбю'],
 en:['1234567890','qwertyuiop','asdfghjkl','zxcvbnm']
};
const OK=/^[\p{L}\p{N} _.\-]$/u;

// Ник перед началом смены: экранная клавиатура для тача + обычный ввод с клавиатуры
export function NickPrompt({onSave,onCancel}){
 const [name,setName]=useState(''),[lang,setLang]=useState('ru'),[caps,setCaps]=useState(true),ref=useRef();
 useEffect(()=>{if(!reduced())gsap.from(ref.current,{y:50,opacity:0,duration:.6,ease:'power3.out'})},[]);
 const add=ch=>{setName(n=>n.length>=14?n:n+(caps?ch.toUpperCase():ch));setCaps(false)};
 const back=()=>setName(n=>n.slice(0,-1));
 const taken=nickTaken(name);
 const done=()=>{if(name.trim().length>=2&&!taken)onSave(name.trim())};
 useEffect(()=>{
  const k=e=>{
   if(e.key==='Enter'){e.preventDefault();done()}
   else if(e.key==='Escape')onCancel();
   else if(e.key==='Backspace'){e.preventDefault();back()}
   else if(e.key.length===1&&OK.test(e.key)&&!e.ctrlKey&&!e.metaKey){e.preventDefault();setName(n=>n.length>=14?n:n+e.key)}
  };
  window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k);
 });
 const rows=LAYOUTS[lang];
 return <div className="nick-wrap"><div className="nick" ref={ref}>
  <div className="nick-head"><h2>Ваш ник</h2>
   <p className={taken?'nick-err':''} role="status">{taken?'Такой ник уже используется в топе. Выберите другой.':'Под ним результат попадёт в таблицу рекордов стенда.'}</p></div>
  <div className={'nick-field'+(name?'':' empty')+(taken?' taken':'')}><span>{name||'ваш ник'}</span><i/></div>
  <div className="kb">
   {rows.map((r,ri)=><div key={ri} className="kb-row">{[...r].map(ch=><button key={ch} onClick={()=>add(ch)}>{caps?ch.toUpperCase():ch}</button>)}</div>)}
   <div className="kb-row">
    <button className="kb-w" onClick={()=>setCaps(c=>!c)} aria-pressed={caps}>⇧</button>
    <button className="kb-w" onClick={()=>setLang(l=>l==='ru'?'en':'ru')}>{lang==='ru'?'RU → EN':'EN → RU'}</button>
    <button className="kb-space" onClick={()=>setName(n=>n.length>=14||!n||n.endsWith(' ')?n:n+' ')}>пробел</button>
    <button className="kb-w" onClick={()=>add('_')}>_</button>
    <button className="kb-w" onClick={back}>⌫</button>
   </div>
  </div>
  <div className="nick-btns"><Btn className="primary" disabled={name.trim().length<2||taken} onClick={done}>Начать смену</Btn><button className="ghost-btn" onClick={onCancel}>Назад</button></div>
 </div></div>;
}

// Служебное окно: Ctrl+Shift+L — удалить запись или очистить таблицу
export function BoardAdmin({onClose}){
 const [list,setList]=useState(loadBoard());
 const del=at=>{removeRecord(at);setList(loadBoard())};
 return <div className="nick-wrap" onClick={onClose}><div className="nick admin" onClick={e=>e.stopPropagation()}>
  <div className="nick-head"><span className="kicker">Служебное · таблица рекордов</span><h2>Рекорды стенда</h2></div>
  {list.length?<ol className="adm-list">{list.map((r,i)=><li key={r.at}><span>{i+1}</span><b>{r.name}</b><em>{r.score}</em><small>{fmtTime(r.secs)}</small><button onClick={()=>del(r.at)}>удалить</button></li>)}</ol>:<p className="adm-empty">Пока пусто</p>}
  <div className="nick-btns"><button className="ghost-btn" onClick={()=>{if(confirm('Очистить всю таблицу рекордов?')){clearBoard();setList([])}}}>Очистить всё</button><Btn className="primary" onClick={onClose}>Закрыть</Btn></div>
 </div></div>;
}

// Топ на заставке: пять строк, прокрутка по всем участникам; по нажатию растёт на высоту экрана
const AB_ROW=36,AB_OPEN=20;
export function AttBoard(){
 const list=loadBoard(),n=list.length,[open,setOpen]=useState(false),box=useRef();
 useEffect(()=>{if(!open&&box.current)box.current.scrollTop=0},[open]);
 return <div className={'att-anim att-board top-board'+(open?' open':'')}>
  <div className="tb-head"><span>Топ стенда</span>{n>0&&<small>участников: {n}</small>}</div>
  {n?<VList listRef={box} className="ab-list" style={{height:Math.min(n,open?AB_OPEN:5)*AB_ROW}} items={list} rowH={AB_ROW} span={AB_OPEN} render={(r,i)=><div className={'tb-r p'+(i+1)}><i>{i+1}</i><b>{r.name}</b><em>{r.score}</em></div>}/>
  :<p>Пока пусто — станьте первым.</p>}
  {n>0&&<div className="ab-foot"><button onClick={()=>setOpen(o=>!o)}>{open?'Свернуть':'Весь список'}</button>{open&&<a href="./top.html">Таблица и выгрузка</a>}</div>}
 </div>;
}

export function MiniBoard({mine}){
 const list=loadBoard().slice(0,5);
 return <div className="mini-board"><span className="mb-h">Рекорды стенда</span>
  {list.length?list.map((r,i)=><div key={r.at} className={'mb-r'+(mine&&r.at===mine?' me':'')}><i>{i+1}</i><b>{r.name}</b><em>{r.score}</em><small>{fmtTime(r.secs)}</small></div>)
   :<p>Пока пусто — станьте первым.</p>}
 </div>;
}
