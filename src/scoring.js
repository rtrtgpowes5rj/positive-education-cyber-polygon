// Очки за уровень: до 200 = точность 100 + скорость 50 + блиц 50. Итого до 1000 за смену.
// Параметры можно менять здесь — всё остальное подхватится.

// Целевое время на уровень, секунды: за это время и быстрее — полный бонус скорости.
// Бонус падает линейно до нуля при тройном времени.
export const PAR={perimeter:50,hardening:60,traffic:50,soc:60,agent:70};

export const ACC_MAX=100,SPEED_MAX=50,BLITZ_BASE=30,BLITZ_SPEED_MAX=20,BLITZ_FAST=6,BLITZ_SLOW=16;

// точность: −20 за ошибку, −10 за подсказку, не ниже 30
export const accScore=(mistakes,hints=0)=>Math.max(30,ACC_MAX-mistakes*20-hints*10);

// скорость: чем быстрее прошли уровень, тем больше
export const speedScore=(levelId,secs)=>{const p=PAR[levelId]||60;return Math.round(Math.max(0,Math.min(1,(p*3-secs)/(p*2)))*SPEED_MAX)};

// блиц: верный ответ 30 + до 20 за скорость (≤6 с — полный бонус, ≥16 с — ноль)
export const blitzScore=(ok,secs)=>!ok?0:BLITZ_BASE+Math.round(Math.max(0,Math.min(1,(BLITZ_SLOW-secs)/(BLITZ_SLOW-BLITZ_FAST)))*BLITZ_SPEED_MAX);

export const makeResult=(levelId,{mistakes,hints,secs,blitzOk,blitzSecs})=>{
 const acc=accScore(mistakes,hints),speed=speedScore(levelId,secs),blitz=blitzScore(blitzOk,blitzSecs);
 return{acc,speed,blitz,total:acc+speed+blitz,secs,blitzSecs,mistakes,hints};
};

export const fmtTime=s=>String(Math.floor(s/60)).padStart(2,'0')+':'+String(Math.round(s%60)).padStart(2,'0');
