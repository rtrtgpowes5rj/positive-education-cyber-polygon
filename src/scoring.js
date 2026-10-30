// Очки за уровень: точность до 100 + скорость без потолка + блиц. У смены нет максимума:
// кто проходит быстрее целевого времени, получает всё больше, поэтому на верхушке топа
// почти не бывает равных результатов. Параметры можно менять здесь — всё остальное подхватится.

// Целевое время на уровень, секунды: за это время — 50 очков скорости (при полной точности),
// за половину — 125, за четверть — 275. При тройном времени — ноль.
export const PAR={perimeter:50,hardening:60,traffic:50,soc:60,agent:70};

export const ACC_MAX=100,SPEED_K=75,SPEED_C=25,SPEED_MIN_SECS=4;
export const BLITZ_BASE=30,BLITZ_K=32,BLITZ_C=12,BLITZ_FAST=6,BLITZ_MIN_SECS=2;

// точность: −20 за ошибку, −10 за подсказку, не ниже 30
export const accScore=(mistakes,hints=0)=>Math.max(30,ACC_MAX-mistakes*20-hints*10);

// скорость умножается на точность: быстрые клики наугад топ не возьмут
export const speedScore=(levelId,secs,acc=ACC_MAX)=>{const p=PAR[levelId]||60;return Math.round(Math.max(0,SPEED_K*p/Math.max(SPEED_MIN_SECS,secs)-SPEED_C)*acc/ACC_MAX)};

// блиц: верный ответ 30 + за скорость: 6 с — 20, 3 с — 52, ≥16 с — ноль. Быстрее 2 с очков не прибавляется:
// вопрос надо успеть прочитать, а ответ наугад не должен быть выгоднее честного
export const blitzScore=(ok,secs)=>!ok?0:BLITZ_BASE+Math.round(Math.max(0,BLITZ_K*BLITZ_FAST/Math.max(BLITZ_MIN_SECS,secs)-BLITZ_C));

export const makeResult=(levelId,{mistakes,hints,secs,blitzOk,blitzSecs})=>{
 const acc=accScore(mistakes,hints),speed=speedScore(levelId,secs,acc),blitz=blitzScore(blitzOk,blitzSecs);
 return{acc,speed,blitz,total:acc+speed+blitz,secs,blitzSecs,mistakes,hints};
};

export const fmtTime=s=>{const t=Math.round(s);return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0')};
