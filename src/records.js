// Таблица рекордов стенда: все участники. Хранится в localStorage браузера стенда и переживает перезапуски.
// Сортировка: больше очков выше; при равенстве — быстрее выше, затем кто раньше.
const KEY='pe-board-v3',MAX=20000;
const cmp=(a,b)=>b.score-a.score||a.secs-b.secs||a.at-b.at;

let raw=null,parsed=[];
export const loadBoard=()=>{try{const s=localStorage.getItem(KEY);if(s===raw)return parsed;
  const l=JSON.parse(s);raw=s;parsed=Array.isArray(l)?l.filter(x=>x&&x.name&&Number.isFinite(x.score)).sort(cmp):[];return parsed}catch(e){return[]}};
const save=l=>{try{localStorage.setItem(KEY,JSON.stringify(l))}catch(e){}};

// ник в таблице один: регистр и лишние пробелы не важны
const nickKey=s=>s.trim().replace(/\s+/g,' ').toLowerCase();
export const nickTaken=name=>{const k=nickKey(name);return loadBoard().some(x=>nickKey(x.name)===k)};

// повторная смена под тем же ником: остаётся лучший результат, kept — прежний оказался лучше
export const addRecord=(name,score,secs)=>{
 const rec={name:name.trim().slice(0,14),score,secs:Math.round(secs*10)/10,at:Date.now()},k=nickKey(rec.name),all=loadBoard(),same=all.find(x=>nickKey(x.name)===k);
 if(same&&cmp(same,rec)<0)return{at:same.at,place:all.indexOf(same)+1,kept:same.score};
 const l=[...all.filter(x=>x!==same),rec].sort(cmp).slice(0,MAX);save(l);return{at:rec.at,place:l.findIndex(x=>x.at===rec.at)+1};
};
export const removeRecord=at=>{save(loadBoard().filter(x=>x.at!==at))};
export const clearBoard=()=>save([]);

// Тестовые результаты для демо: заменяют прежние тестовые, настоящие не трогают
const FAKE=`Алексей_К Марина Dmitry_SOC Катя_ИБ root_access Николай Анна_Ф blue_team Сергей_П Ольга
ИгорьAppSec Настя pentester88 Роман_К Вика Tim_DevOps Елена_В Паша_NOC zero_day Юля
Артём Светлана_К kernel_panic Михаил_И Даша_Ф Vlad_CISO Ирина Женя_SIEM phishing_no Кирилл
Татьяна_М Глеб hash_cat Полина Антон_ИТ Liza_QA Денис_К Вера red_team_1 Максим_Р
Оксана firewall_guy Степан Алина_Б Руслан_SOC nmap_fan Георгий Ксения_Л Илья_П Mila_Sec`.split(/\s+/);
export const seedBoard=()=>{
 const real=loadBoard().filter(x=>!x.fake),now=Date.now();
 const rows=FAKE.filter(n=>!real.some(x=>nickKey(x.name)===nickKey(n))).map((name,i)=>({name,score:Math.round(300+1700*Math.pow(Math.random(),2.4)),secs:Math.round((170+Math.random()*260)*10)/10,at:now-i*97000-1000,fake:true}));
 save([...real,...rows].sort(cmp));
};
