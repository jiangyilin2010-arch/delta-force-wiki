/* Deployed-member milestones. Missing battle revision retains the original rules. */
(function(root){
  'use strict';
  const profiles={
    smoke:[{duration:1,shield:.2,ambush:0},{duration:2,shield:.3,ambush:1},{duration:2,shield:.4,ambush:1.5}],
    demolition:[{targets:1,power:.5},{targets:2,power:.8},{targets:Infinity,power:1},{targets:Infinity,power:1.4,repeat:true},{targets:Infinity,power:1.8,repeat:true}],
    breach:[{all:false,shot:0},{all:true,shot:1.2},{all:true,shot:1.8}],
    defense:[{all:false,shield:60},{all:true,shield:.3,counter:true}],
    charge:[{all:false,heal:45,energy:15},{all:true,heal:.15,energy:15},{all:true,heal:.2,energy:20,revive:true},{all:true,heal:.25,energy:25,revive:true}],
    recon:[{targets:1,ticks:2,instant:25},{targets:2,ticks:2,instant:50},{targets:Infinity,ticks:3,detonate:.5},{targets:Infinity,ticks:3,detonate:1},{targets:Infinity,ticks:4,detonate:1.5}],
    roleAssault:[{actions:3,power:1.8},{actions:2,power:2.2},{actions:2,power:2.6}]
  };
  const texts={
    smoke:['烟雾技能：续接 1 轮烟幕，前排获得 20% 最大生命护盾。','续接 2 轮烟幕，护盾升至 30%；前排下次普攻追加 100% 攻击力伏击弹。','护盾升至 40%，伏击弹升至 150% 攻击力。'],
    demolition:['爆破技能：向另一敌人追加 50% 攻击力爆炸；单体首领也有效。','追加爆炸升至 80% 攻击力，覆盖最多 2 名敌人，优先主目标以外敌人。','追加爆炸覆盖全体敌人，升至 100% 攻击力。','全场爆炸升至 140%；本次行动击杀敌人时，再引爆一轮。','全场爆炸升至 180%，保留击杀后二次引爆。'],
    breach:['闪光技能：额外致盲 1 名敌人，本次致盲目标获得 2 轮标记。','致盲、标记全体；另一名攻击最高且未被击倒的闪光成员追加 120% 攻击力追击。','保留全体致盲与标记，追击升至 180% 攻击力。'],
    charge:['成员治疗：最虚弱前排额外恢复 45 生命、15 基础能量。','改为全体前排恢复 15% 最大生命，全队回复 15 基础能量。','前排恢复升至 20%，全队回能升至 20；每战可复苏一名阵亡前排，恢复 50% 生命。','前排恢复升至 25%，全队回能升至 25，保留每战一次复苏。'],
    recon:['持续伤害技能：向另一敌人附加 2 次电击，立即追加 25 基础伤害；单体首领也有效。','覆盖最多 2 名敌人，各附加 2 次电击、立即追加 50 基础伤害。','改为全体附加 3 次电击，立即引爆各目标全部剩余持续伤害的 50%，不消耗持续时间。','引爆比例升至 100%，保留全体 3 次电击。','全体电击升至 4 次，引爆比例升至 150%。'],
    roleAssault:['突击成员累计 3 次主动伤害行动，攻击最高的存活突击成员向生命最低敌人追加 180% 攻击力射击。','触发间隔缩短至 2 次主动伤害行动，追加射击升至 220% 攻击力。','每 2 次主动伤害行动追加射击，伤害升至 260% 攻击力。']
  };
  texts.recon = texts.recon.map((text,i)=>text+` 每次持续伤害技能按敌人携带的持续伤害种类叠感染，每层立即追加 ${20+i*10}% 施法者攻击力伤害；倒下后感染转移，蛊大招可引爆。`);
  const legacyProfiles={
    smoke:[profiles.smoke[0],profiles.smoke[1]],
    demolition:[profiles.demolition[0],{targets:Infinity,power:1,repeat:true}],
    breach:[profiles.breach[0],profiles.breach[1]],
    defense:profiles.defense,
    charge:[profiles.charge[0],profiles.charge[2]],
    recon:[profiles.recon[0],profiles.recon[3]],
    roleAssault:[profiles.roleAssault[0],profiles.roleAssault[2]]
  };
  function install(definitions,engines){
    for(const bond of definitions){
      bond.legacyTiers=bond.tiers.slice();
      bond.thresholds=Array.from({length:bond.members.length-1},(_,i)=>i+2);
      if(texts[bond.key]){
        bond.tiers=texts[bond.key].slice();
        if(engines?.[bond.key])bond.tiers[bond.tiers.length-1]+=` ${engines[bond.key].text}`;
      }
    }
  }
  function evaluate(definitions,ids,revision=2){
    const unique=new Set(ids);
    return definitions.map(bond=>{
      const present=bond.members.filter(id=>unique.has(id));
      const thresholds=revision===1?[2,3]:bond.thresholds,tiers=revision===1?bond.legacyTiers:bond.tiers;
      const tier=thresholds.filter(n=>present.length>=n).length;
      const mastered=tier===thresholds.length;
      const rules=(revision===1?legacyProfiles:profiles)[bond.key];
      return {...bond,thresholds,tiers,present,count:present.length,tier,maxTier:thresholds.length,mastered,active:tier>0,nextThreshold:thresholds[tier]||null,profile:rules?.[tier-1]||{},bonus:{},effect:tiers.map((text,i)=>`${thresholds[i]} 人${i===tiers.length-1?'满级':''}：${text}`).join('；')};
    });
  }
  const api={install,evaluate};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HaffBondTiers=api;
})(typeof window==='undefined'?globalThis:window);
