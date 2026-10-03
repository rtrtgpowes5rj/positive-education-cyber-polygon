import React,{useMemo} from 'react';
import rough from 'roughjs/bin/rough';

// «Рука» — рисованный слой на rough.js: детерминированные штрихи, одинаковые при каждом рендере.
const G=rough.generator();
export const C={ink:'#ece6da',dim:'#8b8d93',faint:'#3b3d43',red:'#fc3e24',mint:'#7fe0b5',amber:'#f2c566',bg:'#121315'};
const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0)%99991+1};
const base=(k,o)=>({roughness:1.05,bowing:1.3,strokeWidth:1.7,stroke:C.ink,seed:hash(k),...o});

export const d={
 rect:(k,x,y,w,h,o)=>G.rectangle(x,y,w,h,base(k,o)),
 ell:(k,x,y,w,h,o)=>G.ellipse(x,y,w,h,base(k,o)),
 line:(k,x1,y1,x2,y2,o)=>G.line(x1,y1,x2,y2,base(k,o)),
 path:(k,p,o)=>G.path(p,base(k,o)),
 poly:(k,pts,o)=>G.polygon(pts,base(k,o)),
 lines:(k,pts,o)=>G.linearPath(pts,base(k,o)),
 arc:(k,x,y,w,h,a,b,o)=>G.arc(x,y,w,h,a,b,false,base(k,o)),
 curve:(k,pts,o)=>G.curve(pts,base(k,o))
};
export const hatch=(color=C.faint,gap=6,angle=-38,weight=1.1)=>({fill:color,fillStyle:'hachure',hachureGap:gap,hachureAngle:angle,fillWeight:weight});
export const solid=color=>({fill:color,fillStyle:'solid'});

// Sk принимает один рисунок или массив; рисует path'ы с pathLength=1 — для анимации «прорисовки»
export function Sk({of,className='',color,w,style}){
 const list=Array.isArray(of)?of:[of];
 const paths=useMemo(()=>list.flatMap(x=>G.toPaths(x)),[of]);
 return <g className={'sk '+className} style={style}>{paths.map((p,i)=>
  <path key={i} d={p.d} pathLength="1" fill={p.fill||'none'} stroke={p.stroke==='none'?'none':(color||p.stroke)} strokeWidth={w||p.strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>)}</g>;
}
