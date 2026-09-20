/* Consumables belong to the run and are spent only inside an atomic campaign command. */
(function(root){
 'use strict';
 const need=(ok,text)=>{if(!ok)throw Error(text);};
 function ensure(run){run.fieldTools??={reforge:1,duplicate:1};run.toolTacticClaims??=[];run.legendaryClaims??=[];}
 const validTools=tools=>tools&&typeof tools==='object'&&!Array.isArray(tools)&&Object.keys(tools).every(k=>['reforge','duplicate'].includes(k))&&['reforge','duplicate'].every(k=>Number.isSafeInteger(tools[k]??0)&&(tools[k]??0)>=0&&(tools[k]??0)<=99);
 function validate(run){ensure(run);return validTools(run.fieldTools)&&Array.isArray(run.legendaryClaims)&&new Set(run.legendaryClaims).size===run.legendaryClaims.length&&run.legendaryClaims.every(id=>['vyron','tempest','butterfly'].includes(id))&&Array.isArray(run.toolTacticClaims)&&new Set(run.toolTacticClaims).size===run.toolTacticClaims.length&&run.toolTacticClaims.every(k=>['fieldWorkshop','fieldReplication_gold','aceReplication_gold'].includes(k));}
 function claim(run,tools){ensure(run);need(validTools(tools),'道具奖励无效。');for(const key of ['reforge','duplicate'])need(run.fieldTools[key]+(tools[key]||0)<=99,'道具已接近上限，请先使用后再签收。');for(const key of ['reforge','duplicate'])run.fieldTools[key]+=tools[key]||0;}
 function awardLegends(run,{Core,Cards}){
  ensure(run);
  for(const card of Cards.list(run)){
   if(card.stars!==3||Core.units[card.id].cost!==5||!Core.Buildcraft.legendary[card.id]||run.legendaryClaims.includes(card.id))continue;
   // A full historical parcel list must not prevent a promotion or duplicate its reward.
   if(run.parcels.length>=64){const old=run.parcels.findIndex(p=>p.opened);if(old<0)continue;run.parcels.splice(old,1);}
   run.parcels.push({uid:`parcel-${++run.serial}`,label:`${Core.units[card.id].name} · 三星五费庆典`,opened:false,coins:500000,gear:[],parts:[],tools:{duplicate:5,reforge:5}});
   run.legendaryClaims.push(card.id);
  }
 }
 function options(item,relics){const old=relics[item?.key];if(item?.kind!=='relic'||!old)return [];if(item.key==='heart'||item.key==='ocean'){const other=item.key==='heart'?'ocean':'heart';return relics[other]?[other]:[];}return Object.keys(relics).filter(key=>key!==item.key&&relics[key].quality===old.quality&&!!relics[key].supreme===!!old.supreme);}
 function awardTactics(run,{Core,Cards,doctrines}){ensure(run);for(const key of run.tactics||[]){const d=doctrines[key];if(!d||run.toolTacticClaims.includes(key)||!d.toolReward&&!d.toolMilestone)continue;if(d.toolMilestone&&!Cards.list(run).some(c=>c.stars>=2&&Core.units[c.id].cost===5))continue;const reward=d.toolReward||{duplicate:1};for(const type of ['reforge','duplicate'])run.fieldTools[type]+=reward[type]||0;run.toolTacticClaims.push(key);}}
 function apply(run,action,{Core,Cards,random,capacity,relics}){
  ensure(run);
  if(action.type==='sortCards'){run.operatorCards.sort((a,b)=>Core.operatorIds.indexOf(a.id)-Core.operatorIds.indexOf(b.id)||b.stars-a.stars||a.uid.localeCompare(b.uid));return;}
  if(action.type==='duplicateOperator'){
   const card=Cards.list(run).find(c=>c.uid===action.uid);need(card,'该干员卡已合成或售出。');need(run.fieldTools.duplicate>0,'没有干员复制器。');
   const space=Cards.purchase(run,card.id,capacity);need(space.allowed,space.reason);Cards.add(run,card.id);run.fieldTools.duplicate--;return;
  }
  need(!(action.owner&&action.uid),'请选择单件藏品或一名干员。');
  if(action.owner)need(Core.operatorIds.includes(action.owner)&&run.copies[action.owner]>0,'该干员未招募。');
  const items=action.owner?run.inventory.filter(i=>i.owner===action.owner&&i.kind==='relic'):[run.inventory.find(i=>i.uid===action.uid)];
  need(items.length&&items.every(i=>i?.kind==='relic'),'该目标没有可重铸藏品。');need(run.fieldTools.reforge>0,'没有藏品重铸器。');const pools=items.map(i=>options(i,relics));need(pools.every(p=>p.length),'有藏品没有同品质转换目标。');
  items.forEach((item,i)=>{const pool=pools[i];item.key=pool.length===1?pool[0]:pool[Math.floor(random(run)*pool.length)];if(action.owner){item.owner=null;delete item.slot;}});run.fieldTools.reforge--;
 }
 function bossReward(run){ensure(run);run.fieldTools.reforge++;run.fieldTools.duplicate++;return {reforge:1,duplicate:1};}
 const api={ensure,validate,validTools,claim,options,apply,bossReward,awardTactics,awardLegends};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HaffFieldTools=api;
})(typeof window==='undefined'?globalThis:window);
