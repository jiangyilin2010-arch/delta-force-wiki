(() => {
 'use strict';
 let drag=null,previewKey='';
 const make=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls||'';if(text!==undefined)e.textContent=text;return e;};
 function clear(){previewKey='';document.querySelectorAll('.hpd-change').forEach(e=>e.remove());document.querySelectorAll('[data-hpd-match],[data-hpd-change]').forEach(e=>{delete e.dataset.hpdMatch;delete e.dataset.hpdChange;});}
 function bonds(run,deployed){
  const B=window.HaffBuildcraft;if(!B)return;
  const before=new Map(B.evaluateAll(run.deployed).map(b=>[b.key,b]));
  for(const after of B.evaluateAll(deployed)){
   const old=before.get(after.key);if(!old||old.count===after.count)continue;
   for(const el of document.querySelectorAll(`.hbc-bond[data-hi-bond="${after.key}"]`)){
    const badge=make('span','hpd-change',`${old.count}→${after.count}`);badge.title=`${after.name}：${old.tier}档 → ${after.tier}档`;el.dataset.hpdChange=after.count>old.count?'gain':'loss';el.append(badge);
   }
  }
 }
 function offer(card,{run,C,id}){
  function show(){clear();const space=C.recruitSpace(run,id);if(!space.allowed||run.shop.find(o=>o.uid===card.dataset.offerUid)?.sold)return;
   if(space.upgrades.length){for(const el of document.querySelectorAll(`.operator-piece[data-operator="${id}"]`))el.dataset.hpdMatch='true';const badge=make('span','hpd-change',`★→${Math.max(...space.upgrades.map(u=>u.to))}`);card.append(badge);}
   if(space.auto)bonds(run,[...run.deployed,id]);
   else if(!run.deployed.includes(id)){
    for(const el of document.querySelectorAll('.hbc-bond')){const bond=window.HaffBuildcraft?.tags(id).find(b=>b.key===el.dataset.hiBond);if(bond)el.dataset.hpdMatch='true';}
   }
  }
  card.addEventListener('mouseenter',show);card.addEventListener('focusin',show);
  card.addEventListener('mouseleave',clear);card.addEventListener('focusout',e=>{if(!card.contains(e.relatedTarget))clear();});
 }
 function place({run,C,id,slot,uid}){const key=`${id}/${slot}/${uid}`;if(key===previewKey)return;clear();previewKey=key;const result=C.previewPlace(run,id,slot,uid);if(result.allowed)bonds(run,result.deployed);}
 function modal(label){const d=make('dialog','hpd-dialog');d.setAttribute('aria-label',label);d.append(make('h2','',label));const close=make('button','hpd-close','×');close.type='button';close.setAttribute('aria-label','关闭');close.onclick=()=>d.close();d.append(close);d.addEventListener('close',()=>d.remove());document.body.append(d);d.showModal();return d;}
 function tool({run,C,Core,execute},kind){
  const reforge=kind==='reforge',d=modal(reforge?'藏品重铸器':'干员复制器'),grid=make('div','hpd-picker'),status=make('p','hpd-status'),confirm=make('button','primary',reforge?'重铸 ×1':'复制 ×1'),modes=make('div','hpd-modes');confirm.type='button';let mode=reforge?'owner':'copy',selection=null;
  const worn=id=>run.inventory.filter(i=>i.kind==='relic'&&i.owner===id);
  function render(){
   selection=null;confirm.disabled=true;grid.replaceChildren();
   status.textContent=mode==='owner'?'消耗 1 个重铸器：卸下该干员全部藏品，并全部转换。':reforge?'随机变为另一件同品质藏品；非洲之心与海洋之泪固定互转。':'生成一张同名一星卡，可自动合成。';
   const entries=mode==='owner'?Core.operatorIds.filter(id=>run.copies[id]&&worn(id).length).map(id=>({id})):reforge?run.inventory.filter(i=>C.FieldTools.options(i,C.relics).length):C.Cards.list(run).filter(c=>C.recruitSpace(run,c.id).allowed);
   for(const entry of entries){const data=mode==='single'?C.itemInfo(entry):Core.units[entry.id],b=make('button','hpd-target'),img=make('img');b.type='button';b.dataset.quality=data.quality;img.src=mode==='single'?data.image:data.portrait;img.alt='';
    b.title=mode==='owner'?`${data.name} · ${worn(entry.id).map(i=>C.itemInfo(i).name).join('、')}`:mode==='single'?[data.name,...(window.HaffLoadoutGuide?.describe(entry)?.attributes||[]).map(r=>`${r.label} ${r.value}`)].join('\n'):`${data.name} · ${entry.stars} 星 → 复制一星`;
    b.setAttribute('aria-pressed','false');b.append(img,make('span','',mode==='owner'?`${worn(entry.id).length} 件藏品`:mode==='single'?data.name:'★'.repeat(entry.stars)));b.setAttribute('aria-label',b.title);
    b.onclick=()=>{selection=mode==='owner'?{owner:entry.id}:{uid:entry.uid};for(const x of grid.children)x.setAttribute('aria-pressed',String(x===b));confirm.disabled=false;status.textContent=mode==='owner'?`${data.name}：${worn(entry.id).length} 件全部转换并卸回库存 · 消耗 1 个`:reforge?`${data.name} → ${entry.key==='heart'?'海洋之泪':entry.key==='ocean'?'非洲之心':'随机同品质藏品'}`:`${data.name} → 一星卡；占用备战席或立即合成`;};grid.append(b);
   }
   if(!entries.length)status.textContent=mode==='owner'?'没有佩戴藏品的干员，可切换到单件藏品。':reforge?'没有可重铸藏品。':'备战席已满或已有干员均已三星，暂时不能复制。';
  }
  if(reforge)for(const [key,label]of [['owner','对干员'],['single','单件藏品']]){const b=make('button','hpd-mode',label);b.type='button';b.setAttribute('aria-pressed',String(key===mode));b.onclick=()=>{mode=key;for(const x of modes.children)x.setAttribute('aria-pressed',String(x===b));render();};modes.append(b);}
  confirm.onclick=()=>{if(!selection)return;try{
   const before=reforge?(selection.owner?worn(selection.owner):run.inventory.filter(i=>i.uid===selection.uid)).map(i=>({uid:i.uid,key:i.key})):[];
   if(execute({type:reforge?'reforgeRelic':'duplicateOperator',...selection})===false)return;
   if(reforge){grid.replaceChildren();modes.replaceChildren();const results=[];
    for(const old of before){const item=run.inventory.find(i=>i.uid===old.uid),info=C.itemInfo(item),cell=make('div','hpd-outcome'),img=make('img','hpd-result');img.src=info.image;img.alt=info.name;cell.append(img,make('span','',info.name));grid.append(cell);results.push(`${C.relics[old.key].name} → ${info.name}`);}
    status.textContent=results.join('；')+(selection.owner?' · 全部已卸回库存':'');confirm.textContent='收好';confirm.disabled=false;confirm.onclick=()=>d.close();
   }else d.close();
  }catch(error){status.textContent=error.message;}};
  render();d.append(modes,status,grid,confirm);d.querySelector('.hpd-close').focus({preventScroll:true});
 }
 function sell(ctx,uid){const card=ctx.C.Cards.bench(ctx.run).find(c=>c.uid===uid);if(!card)return;
  const action=()=>ctx.execute({type:'sellOperator',id:card.id,cardUid:uid});
  if(card.stars===1){action();return;}
  const d=modal('出售高星卡牌'),data=ctx.Core.units[card.id];d.append(make('p','',`${data.name} ${'★'.repeat(card.stars)} · ${ctx.C.operatorSalePrice(ctx.run,card.id,uid)/10000} 万`));const b=make('button','danger-command','确认出售');b.type='button';b.onclick=()=>{try{if(action()!==false)d.close();}catch(e){b.title=e.message;}};d.append(b);
 }
 function mount(ctx){
  window.HaffToolDrag?.cancel();
  clear();document.getElementById('hpd-tools')?.remove();const heading=document.querySelector('.bench-heading');if(!heading)return;
  const bar=make('div','hpd-tools');bar.id='hpd-tools';const stock=ctx.run.fieldTools||{reforge:1,duplicate:1};
  for(const [symbol,label,key]of [['⇅','同名整理','sort'],['⚒','藏品重铸器','reforge'],['⧉','干员复制器','duplicate']]){
   const b=make('button','hpd-tool',key==='sort'?symbol:`${symbol} ${stock[key]}`);b.type='button';b.title=key==='sort'?label:`${label} ×${stock[key]} · 开局、前两个位面首领胜利及相关战术可获得`;b.setAttribute('aria-label',b.title);b.disabled=!['prep','route','market'].includes(ctx.run.phase)||(key!=='sort'&&!stock[key]);b.onclick=()=>key==='sort'?ctx.execute({type:'sortCards'}):tool(ctx,key);if(key!=='sort')window.HaffToolDrag?.bind(b,key,ctx);bar.append(b);
  }
  const zone=make('div','hpd-sell','⌫');zone.setAttribute('aria-label','拖入出售备战卡牌');zone.title='拖入出售；高星卡需确认';
  zone.addEventListener('dragover',e=>{const c=ctx.C.Cards.bench(ctx.run).find(c=>c.uid===drag?.uid);if(!c)return;e.preventDefault();e.dataTransfer.dropEffect='move';zone.textContent=`⌫ ${ctx.C.operatorSalePrice(ctx.run,c.id,c.uid)/10000}万`;zone.dataset.ready='true';});
  zone.addEventListener('dragleave',()=>{zone.textContent='⌫';delete zone.dataset.ready;});zone.addEventListener('drop',e=>{if(!drag?.uid)return;e.preventDefault();e.stopPropagation();const source=drag,uid=source.uid;drag=null;source.onEnd?.();zone.textContent='⌫';delete zone.dataset.ready;clear();sell(ctx,uid);});bar.append(zone);heading.append(bar);
 }
 window.HaffPrepDecisions={offer,place,mount,clear,beginDrag:value=>{drag=value;},endDrag:()=>{drag=null;clear();}};
 window.addEventListener('pagehide',()=>{drag=null;clear();});
})();
