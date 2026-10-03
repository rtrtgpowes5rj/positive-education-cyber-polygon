import React,{useEffect,useRef} from 'react';
import {createFlowTunnel,createAttackGraph} from './panels';
import {createAgentSandbox} from './sandbox';
import {createConfigRoom} from './room';
import {createAttackBoard} from './board';
import {webglOK} from './core';

const makers={room:createConfigRoom,board:createAttackBoard,tunnel:createFlowTunnel,graph:createAttackGraph,agent:createAgentSandbox};

// Панель с отдельной 3D-сценой. Управляется через ref.current (api) и state.
export default function Panel3D({kind,state,apiRef,className='',opts,children,title}){
 const host=useRef();
 useEffect(()=>{
  if(!webglOK())return;
  const el=document.querySelector('.stage');const k=el?el.getBoundingClientRect().width/1920:1;
  const q=+(new URLSearchParams(location.search).get('q'))||Math.min(2,k*(window.devicePixelRatio||1));
  const api=makers[kind](host.current,{quality:q,...opts});
  if(apiRef)apiRef.current=api;
  return()=>{if(apiRef)apiRef.current=null;api.ctx.dispose()};
 },[]);
 useEffect(()=>{const a=apiRef&&apiRef.current;if(a&&a.set)a.set(state||{})});
 if(!webglOK())return null;
 return <div className={'panel3d '+className}>
  <div className="gl-host" ref={host}/>
  {title&&<div className="p3-title">{title}</div>}
  {children}
 </div>;
}
