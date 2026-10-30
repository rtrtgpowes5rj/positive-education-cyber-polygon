// Таблица рекордов стенда: все участники. Хранится в localStorage браузера стенда и переживает перезапуски.
// Сортировка: больше очков выше; при равенстве — быстрее выше, затем кто раньше.
const KEY='pe-board-v3',MAX=20000;
const cmp=(a,b)=>b.score-a.score||a.secs-b.secs||a.at-b.at;

let raw=null,parsed=[];
export const loadBoard=()=>{try{const s=localStorage.getItem(KEY);if(s===raw)return parsed;
  const l=JSON.parse(s);raw=s;parsed=Array.isArray(l)?l.filter(x=>x&&x.name&&Number.isFinite(x.score)).sort(cmp):[];return parsed}catch(e){return[]}};
const save=l=>{try{localStorage.setItem(KEY,JSON.stringify(l))}catch(e){}};

// на какое место попал бы результат (1 — первое)
export const placeOf=(score,secs)=>{
 if(!(score>0))return null;
 return loadBoard().filter(x=>cmp(x,{score,secs,at:Infinity})<0).length+1;
};
export const addRecord=(name,score,secs)=>{
 const rec={name:name.trim().slice(0,14),score,secs:Math.round(secs*10)/10,at:Date.now()};
 const l=[...loadBoard(),rec].sort(cmp).slice(0,MAX);save(l);return{list:l,at:rec.at,place:l.findIndex(x=>x.at===rec.at)+1};
};
export const removeRecord=at=>{save(loadBoard().filter(x=>x.at!==at))};
export const clearBoard=()=>save([]);
