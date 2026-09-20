/* Short, coalesced presentation transitions. Gameplay never waits on these effects. */
(() => {
 'use strict';
 const dedicated='.hi-insertion,.hc-entry,.hp-transition,.hd-debrief,.hb-outro,.hf-forge';
 const animations=new Map(),panels=new Map(),panelKeys=new WeakMap(),visibility=new WeakMap(),watched=new WeakSet();
 let key=null,pending=null,returning=false,queued=false,veil=null,leaving=false,dialogStack=[],stillDepth=0;
 const quiet=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 const visible=node=>node?.isConnected&&!node.hidden&&!node.closest('[hidden]');
 function animate(node,frames,duration){
  if(!visible(node)||typeof node.animate!=='function')return null;
  animations.get(node)?.cancel();
  const animation=node.animate(frames,{duration:quiet()?70:duration,easing:'cubic-bezier(.16,1,.3,1)'});animations.set(node,animation);
  animation.finished.then(()=>{if(animations.get(node)===animation)animations.delete(node);},()=>{if(animations.get(node)===animation)animations.delete(node);});return animation;
 }
 function arrive(node,duration=190){return animate(node,[{opacity:.45,transform:quiet()?'none':'translateY(6px)'},{opacity:1,transform:'none'}],duration);}
 function clear(){for(const animation of animations.values())animation.cancel();animations.clear();panels.clear();veil?.remove();veil=null;}
 function surface(){const battle=document.getElementById('battle-view');if(visible(battle))return battle;const prep=document.getElementById('prep-view');return visible(prep)?prep:document.getElementById('campaign-shell');}
 function bridge(){
  if(window.HaffScreenMask){window.HaffScreenMask.reveal();return;}
  if(quiet())return;
  if(!veil){veil=document.createElement('div');veil.className='hs-screen-veil';veil.setAttribute('aria-hidden','true');document.body.append(veil);}
  const node=veil,animation=animate(node,[{opacity:.65,transform:'translateX(-2%)'},{opacity:0,transform:'translateX(2%)'}],230);
  const done=()=>{if(veil===node&&!animations.has(node)){node.remove();veil=null;}};animation?.finished.then(done,done);
 }
 function flush(){
  queued=false;
  dialogStack=dialogStack.filter(dialog=>dialog.open&&dialog.isConnected);
  const dialog=dialogStack.at(-1)||document.querySelector('dialog[open]');
  if(dialog&&returning&&!dialog.matches(dedicated)){returning=false;panels.set(dialog,true);}
  if(!dialog&&(pending||returning)){
   const entry=pending;pending=null;returning=false;clear();bridge();
   const node=surface();
   // Keep the canvas and target coordinates fixed; only its DOM command surfaces fade.
   if(!window.HaffScreenMask){if(node?.id==='battle-view'){arrive(node.querySelector('.battle-toolbar'));arrive(node.querySelector('#action-panel'));}else arrive(node,230);}
   if(entry){document.documentElement.dataset.haffPage=entry.key;document.dispatchEvent(new CustomEvent('haff:page-revealed',{detail:{key:entry.key}}));}
   return;
  }
  const candidates=[...panels.keys()].filter(node=>visible(node)&&(!dialog||node===dialog||node.closest('dialog')===dialog));panels.clear();
  for(const node of candidates.filter(node=>!candidates.some(parent=>parent!==node&&parent.contains(node))).slice(0,2))arrive(node,node.tagName==='DIALOG'?210:170);
 }
 function schedule(){if(!queued){queued=true;queueMicrotask(flush);}}
 function enter(entry){if(!entry?.key||entry.key===key)return;key=entry.key;pending=entry;if(!document.querySelector('dialog[open]'))window.HaffScreenMask?.cover();schedule();}
 function panel(node,nextKey){if(!node)return;if(nextKey!==undefined){if(panelKeys.get(node)===nextKey)return;panelKeys.set(node,nextKey);}if(stillDepth)return;panels.set(node,true);schedule();}
 function still(work,scope){
  if(scope){
   for(const node of panels.keys())if(node===scope||scope.contains(node))panels.delete(node);
   for(const [node,animation]of animations)if(node===scope||scope.contains(node)){animation.cancel();animations.delete(node);}
  }
  stillDepth++;try{return work();}finally{stillDepth--;}
 }
 function toggle(node,shown){
  if(!node)return;const token={shown};visibility.set(node,token);
  if(shown){node.hidden=false;panel(node);return;}
  panels.delete(node);
  if(node.hidden)return;
  const animation=animate(node,[{opacity:1,transform:'none'},{opacity:0,transform:quiet()?'none':'translateY(-4px)'}],120);
  const finish=()=>{if(visibility.get(node)===token)node.hidden=true;};if(animation)animation.finished.then(finish,finish);else finish();
 }
 function watch(dialog){
  if(watched.has(dialog))return;watched.add(dialog);let wasOpen=false;
  function changed(){const open=dialog.open;if(open===wasOpen)return;wasOpen=open;if(open){dialogStack=dialogStack.filter(item=>item!==dialog);dialogStack.push(dialog);if(dialog.matches(dedicated)){clear();window.HaffScreenMask?.cancel();return;}panel(dialog);}else{returning=!window.HaffScreenMask||dialog.matches(dedicated)||!!pending;const parent=dialogStack.filter(item=>item.open&&item.isConnected).at(-1);if(!returning&&parent)panel(parent);schedule();}}
  new MutationObserver(changed).observe(dialog,{attributes:true,attributeFilter:['open']});dialog.addEventListener('close',changed);changed();
 }
 document.querySelectorAll('dialog').forEach(watch);
 new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1&&node.matches('dialog'))watch(node);}).observe(document.body,{childList:true});
 document.addEventListener('toggle',event=>{if(event.target.tagName==='DETAILS'){if(event.target.open)panel(event.target);else panel(event.target.parentElement);}},true);
 for(const event of ['haff:insertion-closed','haff:combat-entry-closed','haff:debrief-closed','haff:plane-closed','haff:boss-outro-closed'])document.addEventListener(event,()=>{returning=true;schedule();});
 // A brief departure also covers the game/lobby page boundary; modified clicks retain native behavior.
 document.addEventListener('click',event=>{
  const link=event.target.closest?.('a[href]');if(!link||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||link.target&&link.target!=='_self'||link.hasAttribute('download'))return;
  const url=new URL(link.href,document.baseURI);if(!['http:','https:','file:'].includes(url.protocol)||url.origin!==location.origin||url.href===location.href||url.pathname===location.pathname&&url.hash)return;
  event.preventDefault();if(leaving)return;leaving=true;
  let done=false;const depart=()=>{if(done||!leaving)return;done=true;location.assign(url.href);};if(window.HaffScreenMask)window.HaffScreenMask.depart(depart);else depart();
 });
 const api={enter,panel,toggle,still};window.HaffSmoothMotion=api;window.HaffPageMotion=api;document.documentElement.classList.add('hs-motion');
 window.addEventListener('pagehide',()=>{pending=null;returning=false;leaving=false;clear();});
})();
