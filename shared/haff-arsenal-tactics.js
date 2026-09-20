/* Stable IDs keep owned tactics and relics usable after the arsenal rebalance. */
(function(root){
 'use strict';
 const converted=['maneuver','maneuver_gold','maneuver_red','smoke_gold','smoke_red','welfare_red'];
 function install(add,doctrines){
  for(const [i,key]of ['maneuver','maneuver_gold','maneuver_red'].entries())Object.assign(doctrines[key],{name:['侧翼开火','突进交叉火力','落地清场'][i],theme:'突进火力',icon:'crosshair',bonus:{attack:[6,12,22][i]},rules:{},link:{tag:'mobility',kind:'splash',value:[.15,.3,.5][i]},effect:`全队攻击 +${[6,12,22][i]}。机动技能后，对所有存活敌人追加 ${[15,30,50][i]}% 攻击力爆炸伤害；每名施放者每轮一次，普攻与追加伤害不触发。`});
  for(const [i,key]of ['smoke_gold','smoke_red'].entries())Object.assign(doctrines[key],{name:['烟幕交叉火力','烟幕歼灭令'][i],theme:'烟幕火力',icon:'crosshair',bonus:{attack:[18,32][i]},rules:{},link:{tag:'smoke',kind:'splash',value:[.3,.6][i]},effect:`全队攻击 +${[18,32][i]}。烟幕技能后，对所有存活敌人追加 ${[30,60][i]}% 攻击力爆炸伤害；每名施放者每轮一次，普攻与追加伤害不触发。`});
  Object.assign(doctrines.welfare_red,{name:'战斗绩效',theme:'进攻津贴',icon:'crosshair',bonus:{attack:30},rules:{nodeCash:17500},effect:'全队攻击 +30；现在及每次进入新节点获得 1.75 万哈夫币。'});
  const families=[['precisionFire',['弱点校准','精确火力','致命准星'],i=>({critRate:[8,14,20][i],attack:[4,8,12][i]})],['rapidAim',['快速瞄准','高速猎杀','极速锁头'],i=>({critRate:[6,10,16][i],speed:[5,9,14][i]})],['lethalAim',['致命弹药','穿心弹药','终极穿甲弹'],i=>({critRate:[5,8,12][i],critDamage:[15,25,40][i]})]];
  for(const [family,names,bonus]of families)for(const [i,quality]of ['purple','gold','red'].entries()){
   const b=bonus(i),effect=`全队暴击率 +${b.critRate} 个百分点${b.attack?`、攻击 +${b.attack}`:b.speed?`、速度 +${b.speed}`:`、暴击额外伤害 +${b.critDamage} 个百分点`}。暴击率最高 100%；持续与延迟伤害不暴击。`;
   add(family,quality,names[i],effect,b);Object.assign(doctrines[i?`${family}_${quality}`:family],{theme:'暴击',icon:'crosshair'});
  }
  for(const row of [
   {key:'fieldWorkshop',quality:'purple',name:'藏品改装配给',effect:'立即获得 2 个藏品重铸器。可对干员一次重铸其全部藏品，并卸回库存。',toolReward:{reforge:2}},
   {key:'fieldReplication',quality:'gold',name:'干员复刻配给',effect:'立即获得 1 个干员复制器，生成指定已拥有干员的一星卡，遵守备战席容量和自动合成规则。',toolReward:{duplicate:1}},
   {key:'aceReplication',quality:'gold',name:'王牌复刻计划',effect:'首次拥有至少二星的五费干员时，获得 1 个干员复制器；本局仅一次。选择时已满足条件则立即领取。',toolMilestone:true}
  ]){add(row.key,row.quality,row.name,row.effect,{});Object.assign(doctrines[`${row.key}${row.quality==='purple'?'':'_'+row.quality}`],{theme:'战备道具',icon:'package',toolReward:row.toolReward,toolMilestone:row.toolMilestone});}
 }
 const relicCrit={tally:6,rotor:6,binoculars:8,pulseCore:8,lighter:8,mechanical:12,graphicsCard:12,bladeServer:12,workerBee:12,spinoClaw:12,cinemaCamera:12,milDrone:10,experiment:10,rocketFuel:10,watch:8,heart:15,ocean:15};
 function relics(catalog){for(const [key,rate]of Object.entries(relicCrit))if(catalog[key])catalog[key].bonus.critRate=Math.max(catalog[key].bonus.critRate||0,rate);}
 const api={install,relics,relicCrit,converted};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HaffArsenalTactics=api;
})(typeof window==='undefined'?globalThis:window);
