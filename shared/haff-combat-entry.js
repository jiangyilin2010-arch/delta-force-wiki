/* A short combat cue, independent of campaign transport and battle speed. */
(() => {
  'use strict';
  let current=null,frame=0;
  function close(){
    if(!current)return;
    cancelAnimationFrame(frame);const dialog=current;current=null;
    dialog.close();dialog.remove();
    document.querySelector('#battle-view:not([hidden]) #pause')?.focus({preventScroll:true});
    document.dispatchEvent(new CustomEvent('haff:combat-entry-closed'));
  }
  function show({mission='交战区域'}={}){
    if(current)return false;
    const dialog=document.createElement('dialog');dialog.className='hc-entry';dialog.setAttribute('aria-labelledby','hc-title');
    dialog.innerHTML='<div class="hc-scan" aria-hidden="true"></div><section class="hc-band"><div class="hc-reticle" aria-hidden="true"><i></i></div><div class="hc-copy"><p>G.T.I. / CONTACT</p><h2 id="hc-title">敌情确认</h2><div class="hc-mission"></div></div><span class="hc-code" aria-hidden="true">ENGAGE<br>／／ READY</span><div class="hc-track"><i></i></div></section><button type="button" class="hc-skip">进入战斗 ↗</button>';
    dialog.querySelector('.hc-mission').textContent=mission;
    window.HaffTransitionGlyph?.mount(dialog,'combat',`开始战斗 · ${mission}`);
    current=dialog;document.body.append(dialog);dialog.showModal();
    const skip=dialog.querySelector('button');skip.addEventListener('click',close);skip.focus({preventScroll:true});
    dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,duration=reduced?100:600;
    const animations=dialog.getAnimations({subtree:true});animations.forEach(a=>a.pause());
    let elapsed=0,last=null;
    function tick(now){
      if(current!==dialog)return;
      const delta=last===null?0:Math.min(100,now-last);last=now;if(!document.hidden)elapsed+=delta;
      const p=Math.min(1,elapsed/duration);
      animations.forEach(a=>{a.currentTime=reduced?1400:p*1400;});
      dialog.querySelector('.hc-track i').style.transform=`scaleX(${p})`;
      const ready=p>=.55;dialog.dataset.stage=ready?'engage':'scan';dialog.querySelector('h2').textContent=ready?'交战开始':'敌情确认';
      if(p===1)close();else frame=requestAnimationFrame(tick);
    }
    frame=requestAnimationFrame(tick);return true;
  }
  window.HaffCombatEntry={show,close,get active(){return !!current;}};
  window.addEventListener('pagehide',close);
})();
