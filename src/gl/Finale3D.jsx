import React,{useEffect,useRef} from 'react';
import {createFinale} from './finale';

export default function Finale3D({dim=0,quality=1}){
 const host=useRef(),api=useRef();
 useEffect(()=>{
  const a=createFinale(host.current,{quality});api.current=a;
  const t=setTimeout(()=>a.burst(),500);
  return()=>{clearTimeout(t);a.ctx.dispose()};
 },[]);
 useEffect(()=>{api.current&&api.current.setDim(dim)},[dim]);
 return <div className="net-stage finale-stage"><div className="gl-host" ref={host}/></div>;
}
