/* Three-star promotion is presentation only: the merged card is already saved. */
(() => {
 'use strict';
 let active=null,frame=0;
 const make=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls;if(text!==undefined)e.textContent=text;return e;};
 function close(cancelled=false){
  if(!active)return;
  const entry=active;active=null;cancelAnimationFrame(frame);
  entry.dialog.close();entry.dialog.remove();
  if(entry.focus?.isConnected)entry.focus.focus({preventScroll:true});
  entry.done?.(cancelled);
 }
 function show({data,onComplete}={}){
  if(active||!data)return false;
  const dialog=make('dialog','hf-forge');dialog.dataset.quality=data.quality||'gold';
  dialog.setAttribute('aria-label',`${data.name} · 合成三星`);
  const stage=make('div','hf-stage');stage.setAttribute('aria-hidden','true');
  stage.append(make('div','hf-grid'),make('div','hf-orbit'),make('div','hf-burst'));
  function card(cls){
   const panel=make('div',cls),art=make('div','hf-art');
   art.style.backgroundImage=`url("${data.portrait}")`;
   const crop=data.art?.crop,size=data.art?.size;
   if(crop&&size){const [x,y,w,h]=crop;art.style.backgroundSize=`${size[0]/w*100}% ${size[1]/h*100}%`;art.style.backgroundPosition=`${size[0]===w?50:x/(size[0]-w)*100}% ${size[1]===h?50:y/(size[1]-h)*100}%`;}
   panel.append(art);return panel;
  }
  for(let i=0;i<3;i++){const shard=card('hf-source');shard.style.setProperty('--lane',i-1);shard.append(make('span','hf-source-stars','★★'));stage.append(shard);}
  const camera=make('div','hf-camera'),hero=card('hf-hero');camera.append(hero);stage.append(camera);
  const rays=make('div','hf-rays');for(let i=0;i<18;i++){const ray=make('i','hf-ray');ray.style.setProperty('--angle',`${i*20}deg`);rays.append(ray);}stage.append(rays);
  const reveal=make('div','hf-reveal'),stars=make('div','hf-crown');
  for(let i=0;i<3;i++){const s=make('i','','★');s.style.setProperty('--order',i);stars.append(s);}
  reveal.append(stars,make('strong','hf-name',data.name));stage.append(reveal);
  const legend = data.cost === 5 && window.HaffWar?.Buildcraft.legendary[data.id];
  if (legend) reveal.append(make('strong','hf-legendary-title',legend.name),make('p','hf-legendary-reward','本局首次三星：复制器 ×5 · 重铸器 ×5 · 50 万哈夫币'));
  const skip=make('button','hf-skip','»');skip.type='button';skip.setAttribute('aria-label','跳过三星合成动画');skip.title='跳过动画';
  dialog.append(stage,skip);const focus=document.activeElement;document.body.append(dialog);
  try{dialog.showModal();}catch{dialog.remove();return false;}
  active={dialog,done:onComplete,focus};
  skip.addEventListener('click',()=>close());dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  dialog.addEventListener('close',()=>{if(active?.dialog===dialog)close();});skip.focus({preventScroll:true});
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,duration=reduced?1100:2800;
  dialog.classList.toggle('hf-still',reduced);
  const animations=dialog.getAnimations({subtree:true});animations.forEach(a=>a.pause());
  let last=null,elapsed=0;
  function tick(now){
   if(active?.dialog!==dialog)return;
   const delta=last===null?0:Math.min(80,now-last);last=now;
   if(!document.hidden)elapsed+=delta;
   animations.forEach(a=>{a.currentTime=reduced?2350:elapsed;});
   if(elapsed>=duration)close();else frame=requestAnimationFrame(tick);
  }
  frame=requestAnimationFrame(tick);return true;
 }
 window.HaffStarForge={show,close,get active(){return !!active;}};
 window.addEventListener('pagehide',()=>close(true));
})();
