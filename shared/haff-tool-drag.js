/* Tool drags are handled in capture phase, before formation/equipment drop handlers. */
(() => {
 'use strict';
 const targets='.operator-piece[data-operator],#prep-art[data-operator],[data-inventory-uid],.worn-icon[data-owner][data-slot]';
 let session=null,pointer=null,tip=null,ghost=null,result=null,resultTimer=null,highlight=null;
 const make=(cls,text)=>{const e=document.createElement('div');e.className=cls;e.textContent=text;e.setAttribute('role','status');e.setAttribute('aria-live','polite');document.body.append(e);return e;};
 const stockOK=(ctx,key)=>['prep','route','market'].includes(ctx.run.phase)&&(ctx.run.fieldTools?.[key]||0)>0&&!document.querySelector('dialog[open]');
 function resolve(ctx,key,node){
  const el=node?.closest?.(targets);if(!el)return {reason:'拖到干员卡牌或藏品上'};
  const {run,C,Core}=ctx,fail=reason=>({el,reason});if(!stockOK(ctx,key))return fail('当前不能使用该道具');
  const inventoryUid=el.dataset.inventoryUid,slot=el.dataset.slot,owner=el.dataset.owner;
  if(inventoryUid||slot){
   if(key!=='reforge')return fail('复制器请拖到干员头像上');
   const item=inventoryUid?run.inventory.find(i=>i.uid===inventoryUid):run.inventory.find(i=>i.owner===owner&&C.itemSlot(i)===slot);
   if(!item||item.kind!=='relic')return fail('重铸器只能转换藏品');
   if(!C.FieldTools.options(item,C.relics).length)return fail('该藏品没有同品质转换目标');
   return {el,action:{type:'reforgeRelic',uid:item.uid},items:[{uid:item.uid,key:item.key}],label:`松开重铸：${C.itemInfo(item).name} · ⚒ ×1`};
  }
  const id=el.dataset.operator;if(!Core.units[id]||!run.copies[id])return fail('只能对已拥有的干员使用');
  if(key==='reforge'){
   const items=run.inventory.filter(i=>i.owner===id&&i.kind==='relic');
   if(!items.length)return fail('该干员没有佩戴藏品');
   if(items.some(i=>!C.FieldTools.options(i,C.relics).length))return fail('有藏品没有同品质转换目标');
   return {el,action:{type:'reforgeRelic',owner:id},items:items.map(i=>({uid:i.uid,key:i.key})),label:`${Core.units[id].name} · ${items.length} 件全部重铸并卸下 · ⚒ ×1`};
  }
  const uid=el.dataset.cardUid||run.fieldCards[id]||C.Cards.primary(run,id)?.uid,card=C.Cards.list(run).find(c=>c.uid===uid&&c.id===id);
  if(!card)return fail('这张干员卡已合成或售出');
  const space=C.recruitSpace(run,id);if(!space.allowed)return fail(space.reason||'备战席空间不足');
  return {el,action:{type:'duplicateOperator',uid},label:`复制${Core.units[id].name}一星卡${space.upgrades.length?' · 可立即合成':''} · ⧉ ×1`,name:Core.units[id].name};
 }
 function unhover(){if(highlight){delete highlight.dataset.hpdToolHover;highlight=null;}}
 function cancel(){unhover();session=null;pointer=null;tip?.remove();tip=null;ghost?.remove();ghost=null;delete document.body.dataset.hpdToolDrag;document.querySelectorAll('[data-hpd-tool-ready]').forEach(e=>delete e.dataset.hpdToolReady);}
 function hover(node){if(!session)return;unhover();const r=resolve(session.ctx,session.key,node);if(r.el){highlight=r.el;r.el.dataset.hpdToolHover=r.action?'valid':'invalid';}if(tip){tip.textContent=r.label||r.reason;tip.dataset.invalid=String(!r.action);}return r;}
 function begin(ctx,key,button,touch=false){
  if(button.disabled||!stockOK(ctx,key))return false;
  cancel();session={ctx,key,button};document.body.dataset.hpdToolDrag=key;
  tip=make('hpd-tool-drag-tip',key==='reforge'?'拖到干员：整套重铸 · 拖到藏品：单件重铸':'拖到干员：复制一张同名一星卡');
  for(const el of document.querySelectorAll(targets))if(resolve(ctx,key,el).action)el.dataset.hpdToolReady='true';
  if(touch){ghost=make('hpd-tool-drag-ghost',key==='reforge'?'⚒':'⧉');ghost.removeAttribute('role');ghost.removeAttribute('aria-live');ghost.setAttribute('aria-hidden','true');}
  return true;
 }
 function feedback(text,failed=false){result?.remove();clearTimeout(resultTimer);result=make('hpd-tool-drop-result',text);result.dataset.failed=String(failed);resultTimer=setTimeout(()=>{result?.remove();result=null;},3600);}
 function drop(node){
  if(!session)return;const {ctx,button}=session,r=resolve(ctx,session.key,node);button.hpdClickUntil=Date.now()+300;cancel();
  if(!r.action){if(r.el)feedback(r.reason,true);return;}
  try{if(ctx.execute(r.action)===false)return;
   if(r.items){const changes=r.items.map(old=>{const item=ctx.run.inventory.find(i=>i.uid===old.uid);return `${ctx.C.relics[old.key].name} → ${ctx.C.itemInfo(item).name}`;});feedback(changes.join('；')+(r.action.owner?' · 已卸回库存':''));}
   else feedback(`${r.name}一星复制卡已生成`);
  }catch(error){feedback(error.message,true);}
 }
 const consume=e=>{e.preventDefault();e.stopImmediatePropagation();};
 function bind(button,key,ctx){
  button.draggable=!button.disabled;button.dataset.hpdDraggable=key;button.style.touchAction='none';
  button.title+=' · 可拖动使用，也可点击选择';button.setAttribute('aria-label',button.title);
  button.addEventListener('click',e=>{if(Date.now()<(button.hpdClickUntil||0))consume(e);},true);
  button.addEventListener('dragstart',e=>{if(!begin(ctx,key,button)){e.preventDefault();return;}e.stopPropagation();e.dataTransfer.setData('application/x-haff-field-tool',key);e.dataTransfer.effectAllowed='move';});
  button.addEventListener('dragend',()=>{button.hpdClickUntil=Date.now()+300;cancel();});
  button.addEventListener('pointerdown',e=>{if(!['touch','pen'].includes(e.pointerType)||button.disabled)return;pointer={button,key,ctx,id:e.pointerId,x:e.clientX,y:e.clientY,started:false};button.setPointerCapture?.(e.pointerId);});
  button.addEventListener('pointermove',e=>{if(!pointer||pointer.button!==button||pointer.id!==e.pointerId)return;const pending=pointer;if(!pending.started&&Math.hypot(e.clientX-pending.x,e.clientY-pending.y)<9)return;
   if(!pending.started){if(!begin(ctx,key,button,true)){pointer=null;return;}pointer=pending;pending.started=true;}e.preventDefault();if(ghost)ghost.style.transform=`translate(${e.clientX+14}px,${e.clientY-18}px)`;hover(document.elementFromPoint(e.clientX,e.clientY));
  });
  button.addEventListener('pointerup',e=>{if(!pointer||pointer.id!==e.pointerId)return;const started=pointer.started;pointer=null;if(started){consume(e);drop(document.elementFromPoint(e.clientX,e.clientY));}button.releasePointerCapture?.(e.pointerId);});
  button.addEventListener('pointercancel',()=>cancel());
 }
 document.addEventListener('dragover',e=>{if(!session)return;consume(e);const r=hover(e.target);e.dataTransfer.dropEffect=r?.action?'move':'none';},true);
 document.addEventListener('drop',e=>{if(!session)return;consume(e);drop(e.target);},true);
 document.addEventListener('dragend',()=>{if(session)cancel();},true);
 document.addEventListener('dragleave',e=>{if(session&&!e.relatedTarget)unhover();},true);
 document.addEventListener('keydown',e=>{if(session&&e.key==='Escape'){consume(e);cancel();}},true);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});
 window.addEventListener('pagehide',()=>{cancel();clearTimeout(resultTimer);result?.remove();result=null;});
 window.HaffToolDrag={bind,cancel,resolve};
})();
