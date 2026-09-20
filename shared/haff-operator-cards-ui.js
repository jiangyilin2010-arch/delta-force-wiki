/* Card-specific actions use UIDs so selling a duplicate cannot sell its entire operator family. */
(() => {
 'use strict';
 const make=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls||'';if(text!==undefined)e.textContent=text;return e;};
 function inspect({run,C,Core,uid,execute,onDone}){
  const card=C.Cards.list(run).find(c=>c.uid===uid);if(!card)return;
  const data=Core.units[card.id],dialog=make('dialog','oc-detail');dialog.dataset.quality=data.quality;dialog.setAttribute('aria-label',`${data.name} · ${card.stars} 星卡牌`);
  const art=make('img','oc-art');art.src=data.portrait;art.alt=data.name;
  const field=run.fieldCards?.[card.id]===uid,heading=make('h2','',`${data.name} ${'★'.repeat(card.stars)}`);
  const status=make('p','',field?'出战卡牌':'备战卡牌 · 占用 1 格');
  const note=make('small','oc-note',card.stars===3?'三星卡牌 · 已达最高星级':'3 张同名同星卡自动合成高一星卡，合成后的卡牌仍占 1 格。');
  const same=C.Cards.list(run).filter(c=>c.id===card.id&&c.stars===card.stars).length;
  const progress=make('p','oc-progress',card.stars<3?`同星卡牌 ${same}/3`:'最高星级');
  const actions=make('div','oc-actions'),position=make('select');position.setAttribute('aria-label','选择上阵位置');
  for(let slot=0;slot<Core.Formation.total;slot++){const option=make('option','',Core.boardSlots[slot]);option.value=String(slot);position.append(option);}
  position.value=String(run.positions[card.id]??Core.Formation.recruitOrder.find(slot=>!Object.values(run.positions).includes(slot))??0);
  const error=make('p','oc-error');error.setAttribute('role','status');
  const act=action=>{try{if(execute(action)!==false){dialog.close();onDone?.();}}catch(problem){error.textContent=problem.message;}};
  const deploy=make('button','primary',field?'撤回备战席':'上阵这张卡');deploy.type='button';
  deploy.disabled=!['prep','route','market'].includes(run.phase);position.hidden=field;
  deploy.onclick=()=>act({type:'place',id:card.id,slot:field?null:Number(position.value),...(field?{}:{cardUid:uid})});
  const sell=make('button','oc-sell',`出售这张 · ${C.operatorSalePrice(run,card.id,uid)/10000} 万`);sell.type='button';
  sell.disabled=field&&!run.deployed.some(id=>id!==card.id&&Core.Formation.frontSlot(run.positions[id]));
  sell.onclick=()=>act({type:'sellOperator',id:card.id,cardUid:uid});
  const back=make('button','','关闭');back.type='button';back.onclick=()=>dialog.close();
  actions.append(position,deploy,sell,back);dialog.append(art,heading,status,note,progress,make('small','oc-note','同名只上阵一张；同名换卡时，装备随出战位转移。'),actions,error);
  dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();back.focus({preventScroll:true});
 }
 function manage({run,C,Core,execute}){
  const dialog=make('dialog','oc-manager'),heading=make('h2','','备战席'),count=make('p'),grid=make('div','oc-grid'),close=make('button','','返回');close.type='button';
  function render(){const cards=C.Cards.bench(run);count.textContent=`${cards.length}/${C.Cards.limit} 格 · 点击单张管理`;grid.replaceChildren();
   for(const card of cards){const b=make('button','oc-mini');b.type='button';b.dataset.quality=Core.units[card.id].quality;const img=make('img');img.src=Core.units[card.id].portrait;img.alt=Core.units[card.id].name;b.append(img,make('span','',`${Core.units[card.id].name} ${'★'.repeat(card.stars)}`));b.onclick=()=>inspect({run,C,Core,uid:card.uid,execute,onDone:render});grid.append(b);}
  }
  render();close.onclick=()=>dialog.close();dialog.append(heading,count,grid,close);dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();close.focus({preventScroll:true});
 }
 window.HaffOperatorCardsUI={inspect,manage};
})();
