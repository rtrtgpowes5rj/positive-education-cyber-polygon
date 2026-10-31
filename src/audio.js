// Звук стенда: всё синтезируется в браузере (Web Audio), без чужих файлов и лицензий.
// Фонового звука нет, только короткие и мягкие звуки событий. Кнопка вкл/выкл запоминает выбор. На iOS звук стартует
// только после касания — движок «разблокируется» на первом pointerdown.
const KEY='pe-sound';
let ac=null,master=null,sfxBus=null,muted=false;
try{muted=localStorage.getItem(KEY)==='off'}catch(e){}
const subs=new Set();
export const sound={get on(){return !muted},sub(f){subs.add(f);return()=>subs.delete(f)}};
const emit=()=>subs.forEach(f=>f(!muted));

const MASTER=.5,SFX=.55; // итоговый уровень действий ≈ −11 дБ от полной шкалы

function init(){
 if(ac)return;
 const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
 ac=new C();
 const comp=ac.createDynamicsCompressor();comp.threshold.value=-18;comp.ratio.value=4;comp.attack.value=.004;comp.release.value=.25;
 master=ac.createGain();master.gain.value=muted?0:MASTER;
 master.connect(comp);comp.connect(ac.destination);
 sfxBus=ac.createGain();sfxBus.gain.value=SFX;sfxBus.connect(master);
}
function unlock(){
 init();if(!ac)return;
 if(ac.state==='suspended')ac.resume();
 // пустой буфер — обязательный «пинок» для iOS Safari
 const b=ac.createBuffer(1,1,22050),s=ac.createBufferSource();s.buffer=b;s.connect(ac.destination);s.start(0);
}
if(typeof window!=='undefined'){
 const u=()=>{unlock();window.removeEventListener('pointerdown',u,true);window.removeEventListener('keydown',u,true)};
 window.addEventListener('pointerdown',u,true);window.addEventListener('keydown',u,true);
 document.addEventListener('visibilitychange',()=>{if(!ac)return;if(document.hidden)ac.suspend();else if(!muted)ac.resume()});
}
export function toggleSound(){
 muted=!muted;try{localStorage.setItem(KEY,muted?'off':'on')}catch(e){}
 init();if(ac){const t=ac.currentTime;master.gain.cancelScheduledValues(t);master.gain.setTargetAtTime(muted?0:MASTER,t,.08);if(!muted&&ac.state==='suspended')ac.resume()}
 emit();
}

let noiseBuf=null;
function noise(){if(noiseBuf)return noiseBuf;const n=ac.sampleRate*2;noiseBuf=ac.createBuffer(1,n,ac.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;return noiseBuf}

// ---------- примитивы ----------
function env(g,t,a,peak,d){g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+a+d)}
function tone(hz,{type='sine',a=.004,d=.12,v=.3,at=0,glide=0,pan=0}={}){
 const t=ac.currentTime+at,o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(hz,t);if(glide)o.frequency.exponentialRampToValueAtTime(Math.max(20,hz*glide),t+a+d);
 env(g,t,a,v,d);let out=g;if(pan&&ac.createStereoPanner){const p=ac.createStereoPanner();p.pan.value=pan;g.connect(p);out=p}
 o.connect(g);out.connect(sfxBus);o.start(t);o.stop(t+a+d+.05);
}
function hiss({f0=800,f1=3000,q=.8,a=.02,d=.4,v=.25,at=0,type='bandpass'}={}){
 const t=ac.currentTime+at,s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();s.buffer=noise();f.type=type;f.Q.value=q;
 f.frequency.setValueAtTime(f0,t);f.frequency.exponentialRampToValueAtTime(f1,t+a+d);env(g,t,a,v,d);s.connect(f);f.connect(g);g.connect(sfxBus);s.start(t,Math.random());s.stop(t+a+d+.05);
}
const last={};
const ok=(k,gap)=>{if(!ac||muted||ac.state!=='running')return false;const n=performance.now();if(last[k]&&n-last[k]<gap)return false;last[k]=n;return true};

// ---------- звуки событий ----------
export const sfx={
 tap(){if(!ok('tap',40))return;tone(1900,{type:'sine',d:.035,v:.07});tone(950,{type:'triangle',d:.05,v:.05})},
 pick(){if(!ok('pick',60))return;tone(660,{d:.07,v:.12});tone(990,{d:.09,v:.08,at:.035})},
 place(){if(!ok('place',80))return;tone(110,{type:'sine',d:.22,v:.5,glide:.6});hiss({f0:2400,f1:600,d:.12,v:.08,type:'lowpass'});tone(1320,{d:.08,v:.06,at:.02})},
 good(){if(!ok('good',120))return;[659.25,830.61,987.77].forEach((hz,i)=>tone(hz,{type:'sine',d:.5,v:.13,at:i*.07}));tone(1975.5,{d:.6,v:.04,at:.21})},
 bad(){if(!ok('bad',150))return;tone(196,{type:'sawtooth',d:.18,v:.07,glide:.8});tone(185,{type:'square',d:.16,v:.04,at:.01,glide:.75})},
 hint(){if(!ok('hint',150))return;tone(1046.5,{d:.7,v:.09});tone(1568,{d:.9,v:.05,at:.08})},
 whoosh(len=1){if(!ok('whoosh',300))return;hiss({f0:300,f1:2600,q:.9,a:len*.45,d:len*.55,v:.16});tone(55,{d:len,v:.18,a:len*.4})},
 shield(){if(!ok('shield',900))return;tone(1320,{type:'sine',d:.18,v:.025,glide:1.4});hiss({f0:6000,f1:2000,d:.1,v:.012})},
 breach(){if(!ok('breach',1400))return;tone(70,{d:.35,v:.18,glide:.7});hiss({f0:1200,f1:200,d:.3,v:.05,type:'lowpass'})},
 tick(){if(!ok('tick',45))return;tone(2600,{type:'square',d:.012,v:.025})},
 level(){if(!ok('level',500))return;[523.25,659.25,783.99,1046.5].forEach((hz,i)=>tone(hz,{type:'triangle',d:.9,v:.08,at:i*.09}))},
 // пик финала: подъём, удар, светлый аккорд
 peak(){if(!ok('peak',3000))return;hiss({f0:200,f1:4000,q:.6,a:1.6,d:.4,v:.14});tone(41.2,{d:2.4,v:.4,a:1.5});
  [261.63,329.63,392,523.25,659.25].forEach((hz,i)=>tone(hz,{type:'sine',a:.02,d:2.6,v:.07,at:1.65+i*.05}));tone(82.4,{type:'sine',d:1.2,v:.4,at:1.62,glide:.5})}
};
