/* Persistent link talents. Run snapshots isolate upgrades/resets from active operations. */
(function(root){
'use strict';
const branches=[{id:'survival',name:'生存链路',color:'#8ae0bc',detail:'从强化体能，到绝境重返战场'},{id:'firepower',name:'火力链路',color:'#f4ba7e',detail:'增伤、双暴与首领攻坚'},{id:'tactics',name:'战术链路',color:'#aab8ff',detail:'充能、重选与跨位面补给'}];
const nodes=[
 {id:'vitality',branch:'survival',name:'强化体能',icon:'heart-pulse',costs:[20,35,50],requires:{},detail:'每级全队最大生命 +6%。',effect:'hp',value:6},
 {id:'armor',branch:'survival',name:'复合防护',icon:'shield',costs:[30,45,65],requires:{vitality:1},detail:'每级全队防护 +2。',effect:'armor',value:2},
 {id:'recovery',branch:'survival',name:'持续作战',icon:'heart-pulse',costs:[60,90],requires:{armor:1},detail:'每级在战斗胜利后恢复 2 点行动完整度，上限 100。',effect:'recovery',value:2},
 {id:'rebirth',branch:'survival',name:'绝境重启',icon:'refresh-cw',costs:[140],requires:{vitality:3,recovery:2},detail:'每局一次：行动完整度归零，或最终首领战失利时，恢复至至少 30 完整度，回到当前节点重新备战。主动撤退不触发。',effect:'revive',value:1},
 {id:'damage',branch:'firepower',name:'火力校准',icon:'crosshair',costs:[20,35,50],requires:{},detail:'每级全队造成的伤害 +4%，包含持续伤害。',effect:'damage',value:4},
 {id:'precision',branch:'firepower',name:'弱点识别',icon:'crosshair',costs:[30,45,65],requires:{damage:1},detail:'每级全队暴击率 +6%；基础暴击额外伤害为 50%。持续及延迟伤害不暴击。',effect:'critRate',value:6},
 {id:'critical',branch:'firepower',name:'致命打击',icon:'zap',costs:[30,45,65],requires:{precision:1},detail:'每级暴击伤害额外 +12 个百分点。',effect:'critDamage',value:12},
 {id:'execution',branch:'firepower',name:'斩首协议',icon:'crosshair',costs:[140],requires:{damage:3,critical:3},detail:'对首领额外增伤 15%，与火力校准相乘。',effect:'bossDamage',value:15},
 {id:'energy',branch:'tactics',name:'预充能',icon:'zap',costs:[20,35,50],requires:{},detail:'每级非弹药型干员开战时能量 +5。',effect:'energy',value:5},
 {id:'reroll',branch:'tactics',name:'战术重构',icon:'refresh-cw',costs:[40,65,90],requires:{energy:1},detail:'每级每局增加 1 次战术刷新。开局协议与后续战术三选一共享次数；刷新保留紫、金、红品级。',effect:'rerolls',value:1},
 {id:'funding',branch:'tactics',name:'位面补给',icon:'coins',costs:[60,90],requires:{reroll:1},detail:'每级在开局和首次进入新位面时获得 1 万哈夫币。',effect:'funding',value:10000},
 {id:'contingency',branch:'tactics',name:'纵深预案',icon:'radio',costs:[140],requires:{reroll:3,funding:2},detail:'进入第二、第三位面时，各补充 1 次战术刷新机会。',effect:'planeReroll',value:1}
];
const byId=Object.fromEntries(nodes.map(n=>[n.id,n])),copy=x=>JSON.parse(JSON.stringify(x));
// Alternate cross-branch routes preserve every original route and existing purchase.
const alternatives={armor:{damage:1},precision:{energy:1},reroll:{vitality:1},recovery:{precision:1},critical:{reroll:1},funding:{armor:1},rebirth:{armor:3,funding:2},execution:{precision:3,recovery:2},contingency:{energy:3,critical:3}};
for(const [id,route] of Object.entries(alternatives))byId[id].alternatives=[route];
const paths=node=>[node.requires,...(node.alternatives||[])];
const canUnlock=(node,levels)=>paths(node).some(route=>Object.entries(route).every(([key,min])=>(levels[key]||0)>=min));
const need=(ok,message)=>{if(!ok)throw new Error(message);};
const integer=(n,max=1e9)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
const blank=()=>Object.fromEntries(nodes.map(n=>[n.id,0]));
function validLevels(levels){return levels&&typeof levels==='object'&&!Array.isArray(levels)&&Object.keys(levels).length===nodes.length&&nodes.every(n=>integer(levels[n.id],n.costs.length)&&(!levels[n.id]||canUnlock(n,levels)));}
function spent(levels){return nodes.reduce((sum,n)=>sum+n.costs.slice(0,levels[n.id]).reduce((a,b)=>a+b,0),0);}
function initialize(profile){
 if(!profile.links){
  let earned=0;for(const receipt of Object.values(profile.awards)){receipt.linkPoints??=Math.floor(receipt.points/10);receipt.linkLegacy??=true;earned+=receipt.linkPoints;}
  profile.links={version:1,earned,levels:blank()};
 }
 return profile.links;
}
function info(profile){const data=initialize(profile),used=spent(data.levels);return{earned:data.earned,spent:used,balance:data.earned-used,levels:{...data.levels},activated:Object.values(data.levels).filter(Boolean).length};}
function upgrade(profile,id){const state=info(profile),node=byId[id];need(node&&Object.hasOwn(byId,id),'未知链路节点。');const level=state.levels[id];need(level<node.costs.length,'该节点已满级。');need(canUnlock(node,state.levels),'请先完成前置节点。');need(state.balance>=node.costs[level],'三角圈不足，完成对局可获得。');profile.links.levels[id]++;return info(profile);}
function reset(profile){initialize(profile).levels=blank();return info(profile);}
function reward(run){
 need(run.phase==='ended'&&['extracted','failed'].includes(run.outcome),'行动尚未完成结算。');
 const base=run.outcome==='extracted'?40:10,completed=new Set(run.history.map(h=>h.node).filter(Number.isInteger)).size,progress=completed*4,bosses=new Set(run.clearedBosses).size*12;
 const rank=Math.max(0,Math.min(24,run.careerRun?.rank||0)),bonus=Math.floor((base+progress+bosses)*rank*.02);
 return{base,progress,bosses,bonus,total:base+progress+bosses+bonus};
}
function award(profile,run,receipt){const data=initialize(profile);if(receipt.linkPoints!==undefined)return;const r=reward(run);receipt.linkPoints=r.total;receipt.linkBreakdown=r;data.earned+=r.total;}
function restore(profile){const data=initialize(profile);need(data.version===1&&integer(data.earned)&&validLevels(data.levels),'链路存档无效。');const receipts=Object.values(profile.awards);need(receipts.every(r=>integer(r.linkPoints))&&receipts.reduce((s,r)=>s+r.linkPoints,0)===data.earned&&spent(data.levels)<=data.earned,'三角圈或链路加点记录无效。');return profile;}
function bonuses(levels=blank()){const result={hp:0,armor:0,recovery:0,revive:0,damage:0,critRate:0,critDamage:50,bossDamage:0,energy:0,rerolls:0,funding:0,planeReroll:0};for(const n of nodes)result[n.effect]+=n.value*(levels[n.id]||0);return result;}
function prepareRun(profile,run){need(!run.linkRun,'本局链路已初始化。');run.linkRun={version:1,levels:copy(initialize(profile).levels),refreshesUsed:0,revived:false,planes:[0]};run.coins+=bonuses(run.linkRun.levels).funding;return run;}
function remaining(run){if(!run.linkRun)return 0;const b=bonuses(run.linkRun.levels);return b.rerolls+(run.linkRun.planes.length-1)*b.planeReroll-run.linkRun.refreshesUsed;}
function useRefresh(run){need(run.linkRun&&remaining(run)>0,'本局战术刷新次数已用完。');run.linkRun.refreshesUsed++;}
function enterPlane(run,plane){const data=run.linkRun;if(!data||data.planes.includes(plane))return;data.planes.push(plane);run.coins+=bonuses(data.levels).funding;}
function applyStats(run,stats){if(!run.linkRun)return stats;const b=bonuses(run.linkRun.levels);stats.hp=Math.round(stats.hp*(1+b.hp/100));stats.armor+=b.armor;stats.initialEnergy+=b.energy;return stats;}
function settle(run,{won,abandoned,finalBoss}){
 const data=run.linkRun;if(!data)return{};const b=bonuses(data.levels),result={};
 if(won&&b.recovery){result.linkRecovery=Math.min(100-run.integrity,b.recovery);run.integrity+=result.linkRecovery;}
 if(!won&&!abandoned&&b.revive&&!data.revived&&(run.integrity===0||finalBoss)){data.revived=true;run.integrity=Math.max(30,run.integrity);result.linkRevived=true;}
 return result;
}
function validateRun(run,plane){const d=run.linkRun;if(d===undefined)return true;return d&&d.version===1&&validLevels(d.levels)&&integer(d.refreshesUsed,5)&&typeof d.revived==='boolean'&&(!d.revived||d.levels.rebirth===1)&&Array.isArray(d.planes)&&d.planes.length===plane+1&&d.planes.every((p,i)=>p===i)&&remaining(run)>=0;}
function initBattle(run,battle){battle.offenseRevision=1;battle.attackCritRng=(run.rng^Math.imul(run.node+1,2246822519))>>>0;if(!run.linkRun)return;const b=bonuses(run.linkRun.levels);battle.linkCombat={damage:b.damage,critRate:b.critRate,critDamage:b.critDamage,bossDamage:b.bossDamage,rng:(run.rng^Math.imul(run.node+1,2654435761))>>>0};}
function validateBattle(run,battle){if(battle.offenseRevision!==undefined&&(battle.offenseRevision!==1||!integer(battle.attackCritRng,4294967295)))return false;if(!run.linkRun)return battle.linkCombat===undefined;const d=battle.linkCombat,b=bonuses(run.linkRun.levels);return d&&integer(d.rng,4294967295)&&['damage','critRate','critDamage','bossDamage'].every(k=>d[k]===b[k]);}
function strike(state,source,target,amount,canCrit=true,relic={}){
 const b=state.linkCombat;if(source.side!=='ally'||target.side!=='enemy')return{amount,critical:false};
 const rate=Math.min(100,(b?.critRate||0)+(relic.critRate||0)+(source.critRate||0));
 let critical=canCrit&&rate===100;
 if(canCrit&&rate>0&&rate<100&&b){b.rng=(Math.imul(b.rng,1664525)+1013904223)>>>0;critical=b.rng/4294967296<rate/100;}
 if(canCrit&&rate>0&&rate<100&&!b&&state.offenseRevision===1){state.attackCritRng=(Math.imul(state.attackCritRng,1664525)+1013904223)>>>0;critical=state.attackCritRng/4294967296<rate/100;}
 const boss=['saeed','baseCommander','prisonCommander','prisonRaven'].includes(target.id);
 return{amount:amount*(1+(b?.damage||0)/100)*(1+(boss?b?.bossDamage||0:0)/100)*(critical?1+((b?.critDamage??50)+(relic.critDamage||0)+(source.critDamage||0))/100:1),critical};
}
const api={branches,nodes,byId,paths,canUnlock,initialize,info,upgrade,reset,reward,award,restore,bonuses,prepareRun,remaining,useRefresh,enterPlane,applyStats,settle,validateRun,initBattle,validateBattle,strike};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HaffLinkTree=api;
})(typeof window==='undefined'?globalThis:window);
