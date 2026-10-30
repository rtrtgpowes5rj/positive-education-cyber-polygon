import React,{useState} from 'react';

// Прокручиваемый список на десятки тысяч строк: в DOM только то, что видно.
// span — сколько строк помещается в самой высокой раскладке списка.
export function VList({items,rowH,span,render,className,style,listRef}){
 const [top,setTop]=useState(0);
 const from=Math.max(0,Math.floor(top/rowH)-4),to=Math.min(items.length,from+span+8);
 return <div className={className} style={style} ref={listRef} onScroll={e=>setTop(e.currentTarget.scrollTop)}>
  <div style={{position:'relative',height:items.length*rowH}}>
   {items.slice(from,to).map((it,k)=>{const i=from+k;return <div key={i} style={{position:'absolute',left:0,right:0,top:i*rowH,height:rowH}}>{render(it,i)}</div>})}
  </div>
 </div>;
}
