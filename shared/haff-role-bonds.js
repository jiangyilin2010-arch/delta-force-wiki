/* Operator positioning is a primary bond, independent of skill/equipment tags. */
(function(root){
 'use strict';
 const Formation = typeof module !== 'undefined' && module.exports ? require('./haff-formation-rules.js') : root.HaffFormation;
 const Tiers = typeof module !== 'undefined' && module.exports ? require('./haff-bond-tiers.js') : root.HaffBondTiers;
 const definitions=[
  {key:'roleAssault',category:'assault',name:'突击',icon:'crosshair',color:'#f6aa79',members:['vyron','dwolf','tempest','nameless'],mastery:'突破连射',tiers:['突击成员每累计 3 次主动伤害行动，攻击最高的存活突击成员向生命最低敌人追加 180% 攻击力射击','突破连射：每累计 2 次主动伤害行动触发，追加射击提升至 260% 攻击力']},
  {key:'roleSupport',category:'support',name:'支援',icon:'heart-pulse',color:'#91e5b9',members:['stinger','butterfly','toxik'],mastery:'火力接力',tiers:['支援成员施放大招后，其他存活队员回复 10 基础能量；每位支援成员每轮一次','火力接力：回能提升至 15；同时指挥其他队员中攻击最高者，以 200% 攻击力追击生命最低敌人']},
  {key:'roleRecon',category:'scout',name:'侦察',icon:'radio',color:'#baa8f3',members:['luna','hackclaw','echo'],mastery:'全域锁敌',tiers:['侦察成员主动技能命中敌人后，标记该目标，并由另一名存活侦察成员追加 140% 攻击力射击；每名施放者每轮一次','全域锁敌：标记全部敌人，另一名攻击最高的存活侦察成员向全体敌人追加 200% 攻击力射击']},
  {key:'roleEngineer',category:'engineer',name:'工程',icon:'shield',color:'#84cce9',members:['uluru','sineva','nitro'],mastery:'阵地炮台',tiers:['敌方完成主动行动后，自动炮台以存活工程成员最高攻击力的 180% 射击生命最低敌人；每轮一次','阵地炮台：改为向全体敌人轰击，每个目标受到 220% 攻击力爆炸伤害；每轮一次']}
 ].map(d=>({...d,primary:true,thresholds:[2,3]}));
 definitions.find(d=>d.key==='roleSupport').members.push('rover');
 definitions.find(d=>d.key==='roleRecon').members.push('raptor');
 definitions.find(d=>d.key==='roleEngineer').members.push('shepherd','gizmo');
 Tiers.install(definitions);
 const roleOf=id=>definitions.find(d=>d.members.includes(id));
 function evaluate(ids,revision=2){return Tiers.evaluate(definitions,ids,revision).map(b=>({...b,effect:`主羁绊 · ${b.effect}`}));}
 function initialize(state){state.roleBondState={assault:0,rounds:{},ledger:{}};}
 function afterAction({state,actor,event,resolvedAction,actionId,hit,gainEnergy,rechargeNeedle,primaryEffects=event.effects}){
  const m=state.roleBondState;if(!m||!resolvedAction)return;
  const allies=()=>state.units.filter(u=>u.side==='ally'&&u.hp>0),foes=()=>state.units.filter(u=>u.side==='enemy'&&u.hp>0&&(!state.waves||u.wave===state.waves.index));
  if(!allies().some(u=>Formation.frontSlot(u.slot)))return;
  const bonds=evaluate(state.units.filter(u=>u.side==='ally').map(u=>u.id),state.bondRevision||1);
  const strongest=(bond,except)=>allies().filter(u=>(!bond||bond.members.includes(u.id))&&u.id!==except).sort((a,b)=>b.attack-a.attack||a.slot-b.slot)[0];
  const lowest=()=>foes().sort((a,b)=>a.hp-b.hp||a.slot-b.slot)[0];
  const hurt=new Set(primaryEffects.filter(e=>e.type==='damage'&&e.value>0&&!e.bond&&!e.tactic&&!e.roleBond&&!e.c4).map(e=>e.target));
  function strike(bond,source,target,power,blast=false){if(!source||!target||target.hp<=0)return;const start=event.effects.length;hit(target,source.attack*power,blast,source);const damageEffects=event.effects.slice(start).filter(e=>e.type==='damage'&&!e.c4);const row=m.ledger[bond.key]||={damage:0,triggers:0};row.damage+=damageEffects.reduce((sum,e)=>sum+e.value,0);for(const e of damageEffects)e.roleBond=bond.key;event.targets=[...new Set([...event.targets,target.id])];}
  function proc(bond,source,targets){(m.ledger[bond.key]||={damage:0,triggers:0}).triggers++;event.note=[event.note,`主羁绊 · ${bond.mastery}`].filter(Boolean).join(' · ');(event.roleBursts||=[]).push({family:bond.key,source:source.id,targets:targets.filter(Boolean).map(u=>u.id),label:bond.mastery});}
  for(const b of bonds.filter(b=>b.active)){
   const member=actor.side==='ally'&&actor.hp>0&&b.members.includes(actor.id);
   if(b.key==='roleAssault'&&member&&[...hurt].some(id=>state.units.some(u=>u.id===id&&u.side==='enemy'))){
    if(++m.assault>=b.profile.actions){m.assault=0;const source=strongest(b),target=lowest();if(source&&target){strike(b,source,target,b.profile.power);proc(b,source,[target]);}}
   }
   const clock=b.key==='roleEngineer'?b.key:`${b.key}:${actor.id}`;
   if(m.rounds[clock]===state.round)continue;
   if(b.key==='roleSupport'&&member&&event.freeAction&&event.ultimate!==false){
    m.rounds[clock]=state.round;for(const u of allies().filter(u=>u.id!==actor.id)){if(u.supply)rechargeNeedle(u,b.mastered?30:20);else gainEnergy(u,b.mastered?15:10);event.effects.push({type:'gear',target:u.id,value:b.mastered?15:10,label:'支援主羁绊 · 接力充能'});}
    const source=strongest(null,actor.id),target=lowest();if(b.mastered)strike(b,source,target,2);proc(b,source||actor,b.mastered?[target]:[actor]);
   }
   if(b.key==='roleRecon'&&member&&actionId!=='attack'){
    const target=foes().find(u=>hurt.has(u.id)),source=strongest(b,actor.id);if(!target||!source)continue;m.rounds[clock]=state.round;
    const targets=b.mastered?foes():[target];for(const enemy of targets){enemy.marked=Math.max(enemy.marked||0,2);event.effects.push({type:'marked',target:enemy.id,value:2});strike(b,source,enemy,b.mastered?2:1.4);}proc(b,source,targets);
   }
   if(b.key==='roleEngineer'&&actor.side==='enemy'){
    const source=strongest(b),targets=b.mastered?foes():[lowest()].filter(Boolean);if(!source||!targets.length)continue;m.rounds[clock]=state.round;for(const target of targets)strike(b,source,target,b.mastered?2.2:1.8,b.mastered);proc(b,source,targets);
   }
  }
 }
 function validate(state){const m=state.roleBondState;if(m===undefined)return true;const obj=v=>v&&typeof v==='object'&&!Array.isArray(v),n=(v,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(v)&&v>=min&&v<=max;const bonds=evaluate(state.units.filter(u=>u.side==='ally').map(u=>u.id),state.bondRevision||1),active=bonds.filter(b=>b.active);if(!obj(m)||!n(m.assault,0,(bonds[0].profile.actions||3)-1)||m.assault&&!bonds[0].active)return false;return obj(m.rounds)&&Object.entries(m.rounds).every(([key,round])=>active.some(b=>key===b.key&&b.key==='roleEngineer'||['roleSupport','roleRecon'].includes(b.key)&&b.members.some(id=>key===`${b.key}:${id}`))&&n(round,0,state.round))&&obj(m.ledger)&&Object.entries(m.ledger).every(([key,row])=>active.some(b=>b.key===key)&&obj(row)&&n(row.damage)&&n(row.triggers,0,(state.actions+1)*state.units.length))&&Object.values(m.ledger).reduce((sum,r)=>sum+r.damage,0)<=state.units.filter(u=>u.side==='ally').reduce((sum,u)=>sum+u.damage,0);}
 function installTactics(add,doctrines){for(const role of definitions)for(const [i,quality]of ['purple','gold','red'].entries()){const family=`recruit${role.key.slice(4)}`,key=i?`${family}_${quality}`:family;add(family,quality,`${role.name}定向招募${i?' · '+['','精英通道','特级征召'][i]:''}`,`后续招募商店中，${role.name}干员的单人抽取权重提高至 ${[2,3,5][i]} 倍；其他定位仍会出现。首次签订本系列获得 1 次免费刷新；升阶保留效果、不重复领取。已达到三星的干员不参与优先抽取。`,{});Object.assign(doctrines[key],{theme:`${role.name}招募`,icon:role.icon,recruitRole:role.key,recruitWeight:[2,3,5][i]});}}
 function weight(run,id){const role=roleOf(id);if(!role)return 1;let value=1;for(const key of run.tactics||[]){const family=`recruit${role.key.slice(4)}`;if(key===family)value=Math.max(value,2);if(key===`${family}_gold`)value=Math.max(value,3);if(key===`${family}_red`)value=5;}return value;}
 function pickRecruit(run,pool,random){const weights=pool.map(id=>weight(run,id)),sum=weights.reduce((a,b)=>a+b,0);let roll=random(run)*sum;for(let i=0;i<pool.length;i++){roll-=weights[i];if(roll<0)return pool[i];}return pool.at(-1);}
 function odds(run,pool){const sum=pool.reduce((n,id)=>n+weight(run,id),0);return definitions.map(d=>({key:d.key,name:d.name,probability:sum?pool.filter(id=>d.members.includes(id)).reduce((n,id)=>n+weight(run,id),0)/sum:0}));}
 function status(state){if(!state.roleBondState)return[];return evaluate(state.units.filter(u=>u.side==='ally').map(u=>u.id),state.bondRevision||1).filter(b=>b.active).map(b=>({family:b.key,name:`主羁绊 · ${b.name}`,current:b.count,max:b.thresholds.at(-1),counter:`${b.count}/${b.thresholds.at(-1)}`,damage:state.roleBondState.ledger[b.key]?.damage||0,triggers:state.roleBondState.ledger[b.key]?.triggers||0,detail:b.effect,color:b.color,primary:true}));}
 const api={definitions,roleOf,evaluate,initialize,afterAction,validate,installTactics,weight,pickRecruit,odds,status};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HaffRoleBonds=api;
})(typeof window==='undefined'?globalThis:window);
