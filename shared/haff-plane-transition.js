/* Event-driven presentation only. Never reads/writes a campaign save. */
(() => {
  'use strict';
  const bus=window.HaffEvents?.bus,planes=window.HaffCampaign?.planes;
  if(!bus||!planes)return;
  const seen=new Set();let current=null,frame=0,deferred=null;
  function close(){cancelAnimationFrame(frame);if(!current)return;const {dialog,previous}=current;current=null;dialog.close();dialog.remove();if(previous?.isConnected)previous.focus({preventScroll:true});document.dispatchEvent(new CustomEvent('haff:plane-closed'));}
  function show(event){
    const index=event.plane,key=`${event.runId}:${index}`;
    if(!Number.isInteger(index)||index<1||!planes[index]||!event.runId||seen.has(key))return;
    if(document.querySelector('.hd-debrief[open]')||window.HaffBossOutro?.active||window.HaffInsertion?.active){deferred=event;return;}
    seen.add(key);if(seen.size>32)seen.delete(seen.values().next().value);
    close();
    if(window.HaffInsertion?.show({mission:planes[index].name,briefing:`离开${planes[index-1].name} · 小队转场抵达新位面`}))return;
    const make=(tag,cls,text)=>{const node=document.createElement(tag);node.className=cls;if(text!==undefined)node.textContent=text;return node;};
    const dialog=make('dialog','hp-transition');dialog.dataset.plane=String(index);dialog.setAttribute('aria-labelledby','hp-destination');
    const scene=make('div','hp-scene'),header=make('header','hp-header','G.T.I. / 跨区行动'),code=make('div','hp-code',`0${index+1}`),content=make('section','hp-content');
    const label=make('p','hp-eyebrow','NEXT OPERATION / 下一位面'),heading=make('h2','hp-name',planes[index].name);heading.id='hp-destination';
    const previousName=make('p','hp-previous',`离开 ${planes[index-1].name}`),brief=make('p','hp-brief',index===1?'切换战术频道 · 前往发射区':'接入监区信号 · 前往最后防线');
    content.append(previousName,label,heading,brief);
    const route=make('ol','hp-route');route.setAttribute('aria-label','位面路线');planes.forEach((plane,i)=>{const stop=make('li',i<index?'passed':i===index?'active':'',`${String(i+1).padStart(2,'0')} / ${plane.name}`);if(i===index)stop.setAttribute('aria-current','step');route.append(stop);});
    const footer=make('footer','hp-footer'),status=make('span','hp-status','正在转移小队'),skip=make('button','hp-skip','跳过过场 ↗');skip.type='button';skip.addEventListener('click',close);footer.append(status,skip);
    const progress=make('div','hp-progress'),fill=make('i','');progress.setAttribute('aria-hidden','true');progress.append(fill);
    scene.append(header,code,content,route,footer,progress);dialog.append(scene);document.body.append(dialog);
    window.HaffTransitionGlyph?.mount(dialog,'insertion',`进入下一位面 · ${planes[index].name}`);
    const previous=document.activeElement;current={dialog,previous};dialog.addEventListener('cancel',event=>{event.preventDefault();close();});dialog.showModal();skip.focus({preventScroll:true});
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,duration=reduced?120:900;let elapsed=0,last=null;
    const animations=dialog.getAnimations({subtree:true});animations.forEach(a=>a.pause());
    function tick(now){if(current?.dialog!==dialog)return;const delta=last===null?0:Math.min(100,now-last);last=now;if(!document.hidden)elapsed+=delta;const p=Math.min(1,elapsed/duration);animations.forEach(a=>{a.currentTime=reduced?3800:p*3800;});fill.style.transform=`scaleX(${p})`;scene.style.setProperty('--hp-progress',p);dialog.dataset.stage=p<.28?'depart':p<.78?'arrive':'ready';status.textContent=p<.78?'正在转移小队':'战术链路已接通';if(p===1)close();else frame=requestAnimationFrame(tick);}
    frame=requestAnimationFrame(tick);
  }
  // Let the successful campaign command finish saving and rendering first.
  bus.on('plane:entered',event=>queueMicrotask(()=>show(event)));
  document.addEventListener('haff:debrief-closed',()=>{if(deferred){const event=deferred;deferred=null;show(event);}});
  document.addEventListener('haff:boss-outro-closed',()=>{if(deferred){const event=deferred;deferred=null;show(event);}});
  document.addEventListener('haff:insertion-closed',()=>{if(deferred){const event=deferred;deferred=null;show(event);}});
  window.addEventListener('pagehide',close);
})();
