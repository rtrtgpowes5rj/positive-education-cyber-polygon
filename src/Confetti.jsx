import React,{useEffect,useRef} from 'react';

// Конфетти-вспышка на canvas (2D) — праздничный эффект после верного ответа
export default function Confetti({shot}){
 const ref=useRef();
 useEffect(()=>{
  if(!shot)return;
  const c=ref.current,g=c.getContext('2d'),W=c.width=1920,H=c.height=1080;
  const cols=['#7fe0b5','#f2c566','#ece6da','#fc3e24','#9ad0ff'];
  const ox=shot.x||960,oy=shot.y||600;
  const ps=Array.from({length:150},()=>{const a=-Math.PI/2+(Math.random()-.5)*2.4,s=7+Math.random()*15;return{x:ox,y:oy,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:Math.random()*6,vr:(Math.random()-.5)*.4,w:6+Math.random()*9,h:4+Math.random()*6,c:cols[Math.floor(Math.random()*cols.length)],life:1+Math.random()*.6}});
  let raf,last=performance.now(),t=0;
  const loop=now=>{const dt=Math.min(.05,(now-last)/1000);last=now;t+=dt;g.clearRect(0,0,W,H);
   for(const p of ps){p.vy+=26*dt;p.vx*=.992;p.x+=p.vx;p.y+=p.vy;p.r+=p.vr;const a=Math.max(0,1-t/p.life*.8);if(a<=0)continue;g.save();g.globalAlpha=a;g.translate(p.x,p.y);g.rotate(p.r);g.fillStyle=p.c;g.fillRect(-p.w/2,-p.h/2,p.w,p.h);g.restore()}
   if(t<2.2)raf=requestAnimationFrame(loop);else g.clearRect(0,0,W,H)};
  raf=requestAnimationFrame(loop);return()=>cancelAnimationFrame(raf);
 },[shot]);
 return <canvas ref={ref} className="confetti" aria-hidden="true"/>;
}
