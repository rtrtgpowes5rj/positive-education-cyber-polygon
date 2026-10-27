// Уровни качества графики. Стенд — скорее всего iPad, планшет или большая сенсорная панель,
// поэтому тяжёлые эффекты включаются только там, где железо их тянет, а во время игры
// качество само снижается, если кадры начинают «проседать».
//   ?tier=high|mid|low — принудительно
const qs=new URLSearchParams(location.search);
const ua=navigator.userAgent;
export const isIOS=/iPad|iPhone|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
export const isTouch=(navigator.maxTouchPoints||0)>0;

const PRESETS={
 high:{name:'high',ao:true,aoHalf:false,dprCap:1.5,smaa:true,dof:true,bloomScale:1,gpuPackets:6000},
 mid:{name:'mid',ao:true,aoHalf:true,dprCap:1.25,smaa:true,dof:true,bloomScale:.5,gpuPackets:2600},
 low:{name:'low',ao:false,aoHalf:true,dprCap:1,smaa:false,dof:false,bloomScale:.5,gpuPackets:900}
};
let name=qs.get('tier');
if(!PRESETS[name])name=isIOS?'mid':(isTouch&&/Android/.test(ua))?'low':'high';
export const TIER={...PRESETS[name]};

// понижение на шаг: high → mid → low. Возвращает true, если было куда понижать
const order=['high','mid','low'];
export function downgrade(){
 const i=order.indexOf(TIER.name);if(i>=order.length-1)return false;
 Object.assign(TIER,PRESETS[order[i+1]]);
 window.dispatchEvent(new CustomEvent('pe-tier',{detail:TIER.name}));
 return true;
}
if(import.meta.env.DEV)window.__tier=TIER;
