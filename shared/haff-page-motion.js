/* Navigation presentation only: no timers or mutations in campaign state. */
(() => {
  'use strict';
  if(window.HaffSmoothMotion)return;
  let key=null,pending=null,queued=false;
  const animations=new Set();
  const dedicated='.hi-insertion[open],.hc-entry[open],.hp-transition[open],.hd-debrief[open],.hb-outro[open],.hf-forge[open]';
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  function animate(node,frames,options){
    if(!node?.isConnected||typeof node.animate!=='function')return;
    const animation=node.animate(frames,options);animations.add(animation);
    animation.finished.then(()=>animations.delete(animation),()=>animations.delete(animation));
    return animation;
  }
  function clear(){for(const animation of animations)animation.cancel();animations.clear();document.querySelector('.hm-bridge')?.remove();}
  function reveal(entry){
    clear();
    const quiet=reduced(),duration=quiet?70:180;
    const battle=document.getElementById('battle-view'),prep=document.getElementById('prep-view'),host=document.getElementById('campaign-shell');
    let nodes;
    if(battle&&!battle.hidden)nodes=[battle.querySelector('#battlefield'),battle.querySelector('.battle-toolbar'),battle.querySelector('#action-panel'),battle.querySelector('.turn-strip')];
    else nodes=[...(host&&!host.hidden?[...host.children].filter(n=>!n.matches('.campaign-hud,.campaign-plane-route,.plane-node-flow,.abandon-run')):[]),...(prep&&!prep.hidden?[prep.querySelector('.mission-band'),prep.querySelector('.prep-workspace'),prep.querySelector('.deploy-bar')]:[])];
    nodes.filter(Boolean).slice(0,12).forEach((node,index)=>animate(node,[{opacity:.35,transform:quiet?'none':`translateY(${index%2?12:20}px)`},{opacity:1,transform:'none'}],{duration,delay:quiet?0:Math.min(index*28,140),easing:'cubic-bezier(.16,1,.3,1)'}));
    // Leave keyboard focus, scrolling, and all input targets untouched.
    if(!quiet&&entry.label){
      const bridge=document.createElement('div');bridge.className='hm-bridge';bridge.setAttribute('aria-hidden','true');
      const text=document.createElement('div'),code=document.createElement('small'),label=document.createElement('strong');code.textContent=entry.battle?'G.T.I. / ENGAGE':'G.T.I. / TERMINAL';label.textContent=entry.label;text.append(code,label);bridge.append(text);document.body.append(bridge);
      window.HaffTransitionGlyph?.mount(bridge,entry.battle?'combat':'link');
      const a=animate(bridge,[{opacity:1},{opacity:0}],{duration:280,easing:'cubic-bezier(.2,.7,.3,1)'});
      a?.finished.then(()=>bridge.remove(),()=>bridge.remove());
    }
    document.documentElement.dataset.haffPage=entry.key;
    document.dispatchEvent(new CustomEvent('haff:page-revealed',{detail:{key:entry.key}}));
  }
  function flush(){
    queued=false;
    if(!pending||document.querySelector('dialog[open]'))return;
    const entry=pending;pending=null;reveal(entry);
  }
  function schedule(){if(!queued){queued=true;queueMicrotask(flush);}}
  function enter(entry){
    if(!entry?.key||entry.key===key)return;
    const initial=key===null;key=entry.key;
    pending={...entry,label:initial?'':entry.label};schedule();
  }
  function panel(node){
    if(!node||node.hidden||node.closest('[hidden]')||document.querySelector('dialog[open]'))return;
    animate(node,[{opacity:.4,transform:reduced()?'none':'translateX(10px)'},{opacity:1,transform:'none'}],{duration:reduced()?90:220,easing:'cubic-bezier(.16,1,.3,1)'});
  }
  for(const id of ['gear-panel','skills-panel']){
    const node=document.getElementById(id);if(node)new MutationObserver(()=>panel(node)).observe(node,{attributes:true,attributeFilter:['hidden']});
  }
  // Native dialogs receive a short arrival. Full cinematics own their animation.
  const observed=new WeakSet();
  function dialogChanged(dialog){
    if(dialog.open){
      if(dialog.matches(dedicated)){clear();return;}
      animate(dialog,[{opacity:.2,transform:reduced()?'none':'translateY(14px) scale(.98)'},{opacity:1,transform:'none'}],{duration:reduced()?90:230,easing:'cubic-bezier(.16,1,.3,1)'});
    }else schedule();
  }
  function watch(dialog){if(observed.has(dialog))return;observed.add(dialog);new MutationObserver(()=>dialogChanged(dialog)).observe(dialog,{attributes:true,attributeFilter:['open']});dialog.addEventListener('close',schedule);if(dialog.open)dialogChanged(dialog);}
  document.querySelectorAll('dialog').forEach(watch);
  new MutationObserver(records=>{
    for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1){if(node.matches('dialog'))watch(node);node.querySelectorAll('dialog').forEach(watch);}
    if(pending)schedule();
  }).observe(document.body,{childList:true});
  for(const event of ['haff:insertion-closed','haff:combat-entry-closed','haff:debrief-closed','haff:plane-closed'])document.addEventListener(event,schedule);
  window.HaffPageMotion={enter,panel};
  window.addEventListener('pagehide',()=>{pending=null;clear();});
})();
