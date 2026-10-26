// Таблица рекордов стенда. Хранится в localStorage браузера стенда и переживает перезапуски.
// Сортировка: больше очков выше; при равенстве — быстрее выше.
const KEY='pe-board-v2',MAX=10;
const cmp=(a,b)=>b.score-a.score||a.secs-b.secs;

export const loadBoard=()=>{try{const l=JSON.parse(localStorage.getItem(KEY));return Array.isArray(l)?l.filter(x=>x&&x.name&&Number.isFinite(x.score)).sort(cmp):[]}catch(e){return[]}};
const save=l=>{try{localStorage.setItem(KEY,JSON.stringify(l))}catch(e){}};

// на какое место попал бы результат (1 — первое); null — если не попадает в таблицу
export const placeOf=(score,secs)=>{
 if(!(score>0))return null;
 const l=loadBoard();const all=[...l,{score,secs,__me:1}].sort(cmp);
 const i=all.findIndex(x=>x.__me);return i<MAX?i+1:null;
};
export const addRecord=(name,score,secs)=>{
 const rec={name:name.trim().slice(0,14),score,secs:Math.round(secs),at:Date.now()};
 const l=[...loadBoard(),rec].sort(cmp).slice(0,MAX);save(l);return{list:l,at:rec.at,place:l.findIndex(x=>x.at===rec.at)+1};
};
export const removeRecord=at=>{save(loadBoard().filter(x=>x.at!==at))};
export const clearBoard=()=>save([]);
