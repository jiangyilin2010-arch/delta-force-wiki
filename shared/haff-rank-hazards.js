/* Seeded once per operation. Inspection and save restoration never reroll hazards. */
(function(root){
 'use strict';
 const rules={
  reinforced:{name:'重装增援',icon:'shield',detail:'所有敌人最大生命 +18%。',enemyHp:1.18},
  firepower:{name:'火力压制',icon:'crosshair',detail:'所有敌人攻击 +12%。',enemyAttack:1.12},
  pursuit:{name:'快速反应',icon:'zap',detail:'所有敌人速度 +8%。',enemySpeed:1.08},
  plating:{name:'强化装甲',icon:'shield',detail:'所有敌人防护 +6。',enemyArmor:6},
  interference:{name:'通讯干扰',icon:'radio',detail:'非弹药型干员每场开战能量 −12，最低为 0。',energy:-12},
  exhaustion:{name:'高压行军',icon:'heart-pulse',detail:'我方干员最大生命 −10%。',allyHp:.9},
  exposed:{name:'防线暴露',icon:'crosshair',detail:'我方干员防护 −3，最低为 0。',allyArmor:-3},
  commander:{name:'首领戒备',icon:'crosshair',detail:'首领战中的全部敌人生命额外 +20%、攻击额外 +10%。',bossHp:1.2,bossAttack:1.1}
 };
 function count(rank){return rank>=24?4:rank>=14?3:rank>=6?2:rank>=3?1:0;}
 function draw(seed,rank){let rng=(seed^Math.imul(rank+1,2654435761))>>>0;const pool=Object.keys(rules),keys=[];while(keys.length<count(rank)){rng=(Math.imul(rng,1664525)+1013904223)>>>0;keys.push(pool.splice(Math.floor(rng/4294967296*pool.length),1)[0]);}return keys;}
 function prepare(run){const rank=run.careerRun.rank,seed=run.rng>>>0;run.careerRun.hazards={version:1,seed,keys:draw(seed,rank)};}
 function list(run){return(run?.careerRun?.hazards?.keys||[]).map(key=>({key,...rules[key]}));}
 function validate(run){const h=run.careerRun?.hazards;if(h===undefined)return true;return h&&h.version===1&&Number.isInteger(h.seed)&&h.seed>=0&&h.seed<=4294967295&&Array.isArray(h.keys)&&JSON.stringify(h.keys)===JSON.stringify(draw(h.seed,run.careerRun.rank));}
 function applyAlly(run,stats){for(const rule of list(run)){stats.hp=Math.max(1,Math.round(stats.hp*(rule.allyHp||1)));stats.armor=Math.max(0,stats.armor+(rule.allyArmor||0));stats.initialEnergy+=(rule.energy||0);}return stats;}
 function applyEnemy(run,modifiers,boss){for(const rule of list(run)){modifiers.hp*=rule.enemyHp||1;modifiers.attack*=rule.enemyAttack||1;modifiers.speed*=rule.enemySpeed||1;modifiers.armor=(modifiers.armor||0)+(rule.enemyArmor||0);if(boss){modifiers.hp*=rule.bossHp||1;modifiers.attack*=rule.bossAttack||1;}}return modifiers;}
 const api={rules,count,draw,prepare,list,validate,applyAlly,applyEnemy};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HaffRankHazards=api;
})(typeof window==='undefined'?globalThis:window);
