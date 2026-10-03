import React from 'react';
import {Sk,d,hatch,solid,C} from '../sketch';

// Рисованные устройства. Координаты — внутри <g transform=translate(x,y)>.
export const Cloud=()=><g data-dev="inet">
 <Sk className="draw" of={d.path('cloud','M30 120 C4 120 4 84 30 82 C28 50 66 40 82 62 C96 30 150 36 156 74 C190 70 200 118 168 122 Z',{...hatch('#2b2d32',7,-35),strokeWidth:2})}/>
 {/* хакеры в капюшонах */}
 {[[56,92],[104,90],[142,96]].map(([x,y],i)=><g key={i} className="draw" transform={`translate(${x},${y})`}>
  <Sk of={d.path('hood'+i,'M-13 22 C-14 2 -8 -12 0 -12 C8 -12 14 2 13 22 Z',{...solid('#0e0f11'),strokeWidth:1.6})}/>
  <Sk of={d.ell('eyeL'+i,-4.5,5,3,3,{...solid(C.red),stroke:C.red,strokeWidth:.8,roughness:.4})}/>
  <Sk of={d.ell('eyeR'+i,4.5,5,3,3,{...solid(C.red),stroke:C.red,strokeWidth:.8,roughness:.4})}/>
 </g>)}
 <text className="hand" x="95" y="152" textAnchor="middle">интернет</text>
</g>;

export const Gateway=()=><g data-dev="gw">
 <Sk className="draw" of={d.rect('gw',0,0,62,76,{...hatch('#35383e',6,-40),strokeWidth:2})}/>
 {[14,28,42,56].map(y=><Sk key={y} className="draw" of={d.line('gwr'+y,0,y,62,y,{strokeWidth:1.1})}/>)}
 {[[31,0,14],[16,14,28],[47,14,28],[31,28,42],[16,42,56],[47,42,56],[31,56,76]].map(([x,y0,y1],i)=><Sk key={i} className="draw" of={d.line('gwv'+i,x,y0,x,y1,{strokeWidth:1.1})}/>)}
 <Sk className="draw flame" of={d.path('flame','M31 -4 C20 -14 26 -26 31 -34 C34 -24 44 -22 40 -10 C38 -5 34 -4 31 -4Z',{...solid(C.red),stroke:C.red,strokeWidth:1.4})}/>
</g>;

export const Rack=({k,h=118,w=54,leds=5})=><g className="draw">
 <Sk of={d.rect('rack'+k,0,0,w,h,{...hatch('#2f3136',6,-42),strokeWidth:1.9})}/>
 {Array.from({length:leds}).map((_,i)=>{const y=12+i*((h-24)/(leds-0.4));return <g key={i}>
  <Sk of={d.rect(`slot${k}${i}`,7,y,w-14,10,{strokeWidth:1.2,roughness:.7})}/>
  <circle className={'led l'+(i%3)} cx={w-14} cy={y+5} r="2"/>
 </g>})}
</g>;

export const Web=()=><g data-dev="web">
 <g transform="translate(0,0)"><Rack k="a" h={124} w={56} leds={6}/></g>
 <g transform="translate(78,22)"><Rack k="b" h={100} w={50} leds={4}/></g>
</g>;

export const Mail=()=><g data-dev="mail" className="draw">
 <Sk of={d.rect('mail',0,0,92,62,{...hatch('#2f3136',6,-42),strokeWidth:1.9})}/>
 <Sk of={d.lines('mailv',[[10,12],[46,38],[82,12]],{strokeWidth:1.5})}/>
 <Sk of={d.rect('mailenv',10,12,72,38,{strokeWidth:1.3})}/>
</g>;

export const Switch=()=><g data-dev="core" className="draw">
 <Sk of={d.rect('sw',0,0,152,38,{...hatch('#2f3136',6,-42),strokeWidth:1.9})}/>
 {Array.from({length:10}).map((_,i)=><g key={i}><Sk of={d.rect('swp'+i,10+i*13.6,11,9,9,{strokeWidth:1,roughness:.6})}/><circle className={'led l'+(i%3)} cx={14.5+i*13.6} cy={28} r="1.6"/></g>)}
</g>;

export const Monitor=({k,lit})=><g className="draw">
 <Sk of={d.rect('mon'+k,0,0,58,40,{...hatch('#2f3136',6,-42),strokeWidth:1.8})}/>
 <Sk of={d.rect('scr'+k,5,5,48,27,{strokeWidth:1,roughness:.5,...(lit?solid('#1d3a31'):{})})}/>
 <Sk of={d.lines('stand'+k,[[29,40],[29,50],[17,52],[41,52]],{strokeWidth:1.5})}/>
</g>;

export const Workstations=()=><g data-dev="ws">
 {[[0,0],[78,-6],[18,60],[100,54]].map(([x,y],i)=><g key={i} transform={`translate(${x},${y})`}><Monitor k={i}/></g>)}
</g>;

export const SocWall=({lit})=><g data-dev="soc" className={lit?'soc-on':''}>
 {[0,1,2].map(i=><g key={i} className="draw" transform={`translate(${i*58},${i===1?-8:0})`}>
  <Sk of={d.rect('soc'+i,0,0,52,38,{...hatch('#2f3136',6,-42),strokeWidth:1.8})}/>
  <Sk className="chart" of={d.lines('socg'+i,[[6,28],[16,18],[24,24],[34,10],[46,16]],{strokeWidth:1.4,stroke:C.mint,roughness:.6})}/>
 </g>)}
 <Sk className="draw" of={d.line('socd',-6,52,170,52,{strokeWidth:1.6})}/>
</g>;

// Значки средств защиты 40×40
export const glyph={
 ngfw:k=><><Sk of={d.path('g'+k,'M20 3 L35 9 V21 C35 30 28 35 20 38 C12 35 5 30 5 21 V9 Z',{strokeWidth:2})}/><Sk of={d.lines('g2'+k,[[12,17],[28,17]],{strokeWidth:1.6})}/><Sk of={d.lines('g3'+k,[[12,24],[28,24]],{strokeWidth:1.6})}/></>,
 waf:k=><><Sk of={d.rect('g'+k,4,7,32,26,{strokeWidth:2})}/><Sk of={d.line('g2'+k,4,15,36,15,{strokeWidth:1.6})}/><Sk of={d.lines('g3'+k,[[11,24],[17,28],[11,32]],{strokeWidth:1.6})}/></>,
 sandbox:k=><><Sk of={d.path('g'+k,'M5 14 H35 V35 H5 Z M5 14 L10 5 H30 L35 14',{strokeWidth:2})}/><Sk of={d.ell('g2'+k,20,25,8,8,{strokeWidth:1.6})}/></>,
 nta:k=><><Sk of={d.curve('g'+k,[[3,26],[10,10],[17,30],[24,10],[31,28],[37,16]],{strokeWidth:2})}/><Sk of={d.line('g2'+k,3,35,37,35,{strokeWidth:1.4})}/></>,
 edr:k=><><Sk of={d.rect('g'+k,4,6,32,22,{strokeWidth:2})}/><Sk of={d.lines('g2'+k,[[13,17],[18,22],[27,11]],{strokeWidth:2})}/><Sk of={d.line('g3'+k,14,34,26,34,{strokeWidth:1.8})}/></>,
 siem:k=><><Sk of={d.lines('g'+k,[[5,35],[5,22],[14,22],[14,35]],{strokeWidth:2})}/><Sk of={d.lines('g2'+k,[[16,35],[16,8],[25,8],[25,35]],{strokeWidth:2})}/><Sk of={d.lines('g3'+k,[[27,35],[27,16],[36,16],[36,35]],{strokeWidth:2})}/></>
};
export const Glyph=({id,size=40,k=''})=><svg className="glyph" viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">{glyph[id](id+k)}</svg>;

// Рисованные пометки-«фломастер»
export const Arrow=({from,to,bend=30,k='a',color=C.red})=>{
 const [x1,y1]=from,[x2,y2]=to,mx=(x1+x2)/2+bend,my=(y1+y2)/2-bend;
 const a=Math.atan2(y2-my,x2-mx),h=11;
 return <g className="doodle"><Sk of={d.path('arr'+k,`M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`,{stroke:color,strokeWidth:2.2,roughness:.8})}/>
  <Sk of={d.lines('arh'+k,[[x2-h*Math.cos(a-.5),y2-h*Math.sin(a-.5)],[x2,y2],[x2-h*Math.cos(a+.5),y2-h*Math.sin(a+.5)]],{stroke:color,strokeWidth:2.2,roughness:.6})}/></g>;
};
export const Circle=({cx,cy,rx,ry=rx,k='c',color=C.red})=><g className="doodle"><Sk of={d.ell('ci'+k,cx,cy,rx*2,ry*2,{stroke:color,strokeWidth:2.2,roughness:1.6,bowing:3})}/></g>;
export const Underline=({x,y,w,k='u',color=C.red})=><g className="doodle"><Sk of={d.curve('un'+k,[[x,y],[x+w*.3,y+3],[x+w*.65,y-2],[x+w,y+2]],{stroke:color,strokeWidth:3,roughness:1.1})}/></g>;
