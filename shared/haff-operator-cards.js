/* Physical operator cards. Copies remain a derived compatibility total, never bench capacity. */
(function(root){
 'use strict';
 const F=typeof module!=='undefined'&&module.exports?require('./haff-formation-rules.js'):root.HaffFormation;
 const weight=stars=>3**(stars-1),clone=v=>JSON.parse(JSON.stringify(v));
 const need=(ok,message)=>{if(!ok)throw Error(message);};
 function derived(run){
  const cards=[];
  for(const [id,total]of Object.entries(run.copies)){
   let remaining=total;
   for(let stars=3;stars>=1;stars--)for(let index=0;remaining>=weight(stars);index++){
    cards.push({uid:`legacy-card-${id}-${stars}-${index}`,id,stars});remaining-=weight(stars);
   }
  }
  return cards;
 }
 const list=run=>run.operatorCards||derived(run);
 function primary(run,id){const cards=list(run).filter(c=>c.id===id);return cards.find(c=>c.uid===run.fieldCards?.[id])||cards.slice().sort((a,b)=>b.stars-a.stars)[0];}
 function bench(run){const field=new Set(run.deployed.map(id=>primary(run,id)?.uid));return list(run).filter(c=>!field.has(c.uid));}
 function ensure(run){
  if(run.cardVersion!==undefined){need(run.cardVersion===1&&Array.isArray(run.operatorCards)&&run.fieldCards,'干员卡牌版本无效。');return;}
  run.operatorCards=derived(run);run.fieldCards=Object.fromEntries(run.deployed.map(id=>[id,primary(run,id).uid]));run.cardVersion=1;
  run.cardOverflowAllowance=Math.max(0,bench(run).length-F.benchSize);
 }
 function validate(run,ids){
  if(run.cardVersion!==1||!Array.isArray(run.operatorCards)||run.operatorCards.length>ids.length*4)return false;
  const cards=run.operatorCards;
  if(cards.some(c=>!c||typeof c.uid!=='string'||!c.uid||!ids.includes(c.id)||![1,2,3].includes(c.stars))||new Set(cards.map(c=>c.uid)).size!==cards.length)return false;
  if(ids.some(id=>cards.filter(c=>c.id===id).reduce((sum,c)=>sum+weight(c.stars),0)!==run.copies[id]))return false;
  if(ids.some(id=>[1,2,3].some(stars=>cards.filter(c=>c.id===id&&c.stars===stars).length>=3)))return false;
  if(!run.fieldCards||Array.isArray(run.fieldCards)||Object.keys(run.fieldCards).length!==run.deployed.length||run.deployed.some(id=>!cards.some(c=>c.uid===run.fieldCards[id]&&c.id===id)))return false;
  return Number.isSafeInteger(run.cardOverflowAllowance)&&run.cardOverflowAllowance>=0&&run.cardOverflowAllowance<=ids.length*4&&bench(run).length<=F.benchSize+run.cardOverflowAllowance;
 }
 function syncField(run,id,uid){
  for(const key of Object.keys(run.fieldCards))if(!run.deployed.includes(key))delete run.fieldCards[key];
  if(uid){need(run.operatorCards.some(c=>c.id===id&&c.uid===uid),'该干员卡牌已合成或售出。');run.fieldCards[id]=uid;}
  for(const key of run.deployed)run.fieldCards[key]||=primary(run,key).uid;
 }
 function add(run,id){
  ensure(run);need(run.copies[id]<9,'该干员已达到三星。');
  run.operatorCards.push({uid:`operator-card-${++run.serial}`,id,stars:1});run.copies[id]++;
  const upgrades=[];
  for(let stars=1;stars<=2;stars++){
   const matches=run.operatorCards.filter(c=>c.id===id&&c.stars===stars);
   if(matches.length<3)continue;
   const survivor=matches.find(c=>c.uid===run.fieldCards[id])||matches[0],consumed=matches.filter(c=>c!==survivor).slice(0,2);
   survivor.stars++;run.operatorCards=run.operatorCards.filter(c=>!consumed.includes(c));upgrades.push({id,uid:survivor.uid,from:stars,to:stars+1});
  }
  return upgrades;
 }
 function remove(run,id,uid){
  ensure(run);const card=uid?run.operatorCards.find(c=>c.uid===uid&&c.id===id):primary(run,id);
  need(card,'该卡牌已合成、售出或尚未招募。');
  run.operatorCards=run.operatorCards.filter(c=>c!==card);run.copies[id]-=weight(card.stars);return card;
 }
 function capacityCheck(run,before){
  const count=bench(run).length;
  need(count<=F.benchSize||run.cardOverflowAllowance>0&&count<=before,`备战席已满（${F.benchSize} 格），请先出售、上阵或合成卡牌。`);
  run.cardOverflowAllowance=Math.min(run.cardOverflowAllowance,Math.max(0,count-F.benchSize));
 }
 function purchase(run,id,capacity){
  const projected=clone({copies:run.copies,deployed:run.deployed,serial:run.serial,operatorCards:run.operatorCards,fieldCards:run.fieldCards,cardVersion:run.cardVersion,cardOverflowAllowance:run.cardOverflowAllowance});ensure(projected);const before=bench(projected).length;
  try{
   const upgrades=add(projected,id);
   const auto=projected.copies[id]===1&&projected.deployed.length<capacity;
   if(auto){projected.deployed.push(id);syncField(projected);}
   capacityCheck(projected,before);
   return {allowed:true,upgrades,auto,bench:bench(projected).length,delta:bench(projected).length-before};
  }catch(error){return {allowed:false,reason:error.message,upgrades:[],auto:false,bench:before,delta:0};}
 }
 const api={weight,list,primary,bench,ensure,validate,syncField,add,remove,capacityCheck,purchase,limit:F.benchSize};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HaffOperatorCards=api;
})(typeof window==='undefined'?globalThis:window);
