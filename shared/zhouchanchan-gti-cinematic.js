(() => {
'use strict';
const root=document.getElementById('zc-intro'); if(!root)return;
const status=document.getElementById('zc-status'),fill=document.getElementById('zc-fill'),time=document.getElementById('zc-time'),enter=document.getElementById('zc-enter'),replay=document.getElementById('zc-replay'),sound=document.getElementById('zc-sound');
const preview=new URLSearchParams(location.search).get('preview')==='1';
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const duration=reduced?1200:6400;
const labels=['接入战区侦察画面','确认干员身份','小队集结完毕','行动授权 · 进入战区'];
let frame=0,started=0,last=-1,context=null,master=null,noise=null;
function pulse(){if(!context||context.state!=='running')return;const t=context.currentTime,o=context.createOscillator(),g=context.createGain();o.type='sine';o.frequency.setValueAtTime(95,t);o.frequency.exponentialRampToValueAtTime(32,t+.4);g.gain.setValueAtTime(.22,t);g.gain.exponentialRampToValueAtTime(.001,t+.5);o.connect(g);g.connect(master);o.start(t);o.stop(t+.55);}
function silence(){if(context){context.close().catch(()=>{});context=null;}master=null;noise=null;sound.setAttribute('aria-pressed','false');sound.textContent='开启音效';}
sound.addEventListener('click',async()=>{if(context){silence();return;}try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio){sound.textContent='音效不可用';return;}context=new Audio();await context.resume();if(!context)return;master=context.createGain();master.gain.value=.22;master.connect(context.destination);const buffer=context.createBuffer(1,context.sampleRate*2,context.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;noise=context.createBufferSource();noise.buffer=buffer;noise.loop=true;const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=160;noise.connect(filter);filter.connect(master);noise.start();sound.setAttribute('aria-pressed','true');sound.textContent='关闭音效';pulse();}catch{silence();sound.textContent='音效不可用';}});
function go(){cancelAnimationFrame(frame);silence();location.replace(enter.href);}
function tick(now){const p=Math.min(1,(now-started)/duration),phase=Math.min(3,Math.floor(p*4));if(phase!==last){last=phase;status.textContent=labels[phase];root.dataset.phase=String(phase);pulse();}fill.style.width=`${p*100}%`;time.textContent=`T−${Math.max(0,(duration-now+started)/1000).toFixed(1)}`;if(p<1)frame=requestAnimationFrame(tick);else if(preview){root.dataset.finished='true';replay.hidden=false;status.textContent='行动就绪';silence();}else go();}
function start(){cancelAnimationFrame(frame);last=-1;delete root.dataset.finished;replay.hidden=true;root.getAnimations({subtree:true}).forEach(a=>{a.cancel();a.play();});started=performance.now();frame=requestAnimationFrame(tick);}
enter.addEventListener('click',event=>{if(event.button===0&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey){event.preventDefault();go();}});
replay.addEventListener('click',start);
document.addEventListener('keydown',event=>{if(event.key==='Escape')go();});
window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);silence();});
window.addEventListener('pageshow',event=>{if(event.persisted)start();});
start();
})();
