/* Campaign build rules. No DOM, timers, global event listeners or save writes. */
(function (root) {
  'use strict';
  const Formation = typeof module !== 'undefined' && module.exports ? require('./haff-formation-rules.js') : root.HaffFormation;
  const Engines = typeof module !== 'undefined' && module.exports ? require('./haff-bond-engines.js') : root.HaffBondEngines;
  const Roles = typeof module !== 'undefined' && module.exports ? require('./haff-role-bonds.js') : root.HaffRoleBonds;
  const Tiers = typeof module !== 'undefined' && module.exports ? require('./haff-bond-tiers.js') : root.HaffBondTiers;
  // Stable keys retain checkpoint compatibility; category describes the actual equipment.
  const bonds = [
    { key:'smoke', category:'smoke', name:'烟雾协同', mastery:'烟幕伏击', members:['stinger','dwolf','butterfly','toxik','vyron'], color:'#87e2aa', tiers:['成员释放烟雾或毒雾后，续接 1 轮烟幕（上限 4 轮），全体前排获得 20% 最大生命护盾','烟幕伏击：成员放烟后续接 2 轮烟幕，全体前排获得 30% 最大生命护盾，并蓄备一发伏击弹：下次普攻追加 100% 攻击力射击；每人最多保留一发'] },
    { key:'demolition', category:'demolition', name:'爆破专精', mastery:'连锁殉爆', members:['vyron','uluru','dwolf','luna','sineva','nitro'], color:'#e8c17b', tiers:['成员使用炸弹、手雷或导弹，向另一敌人追加 50% 攻击力爆炸；仅剩首领时也生效','连锁殉爆：成员使用爆破技能后，全体敌人受到 100% 攻击力爆炸；若本次行动已击败敌人，再引爆一轮 100% 攻击力全场爆炸，不能无限连锁'] },
    { key:'breach', category:'flash', name:'闪光压制', mastery:'致盲追击', members:['hackclaw','nameless','nitro','echo'], color:'#efe6b0', tiers:['成员使用闪光或震撼装备，额外致盲 1 名敌人，并标记所有被本次技能致盲的目标 2 轮；只剩一个敌人时仍可标记','致盲追击：成员使用闪光或震撼装备后，致盲并标记全体敌人；另一名攻击最高且未被击倒的羁绊成员，向生命最低目标追加 120% 攻击力射击，后排也可自动追击'] },
    { key:'defense', category:'defense', name:'掩体护盾', mastery:'堡垒反击', members:['uluru','butterfly','sineva'], color:'#85bce1', tiers:['成员主动建立掩体或护盾，为最前方友军补充 60 护盾','堡垒反击：成员建立防护后，全体前排获得 30% 最大生命护盾；任一前排以个人护盾抵挡敌方主动攻击后，以 80% 攻击力自动反击，每人每轮一次'] },
    { key:'charge', category:'healing', name:'治疗接力', mastery:'战地复苏', members:['stinger','butterfly','dwolf','tempest','toxik'], color:'#efaabf', tiers:['成员施放治疗技能或实际治疗生效后，额外治疗最虚弱前排 45 点，并为其回复 15 基础能量（蜂医补针进度 +30）','战地复苏：成员治疗触发时，前排各恢复 20% 最大生命，全队回复 20 基础能量（蜂医补针进度 +40）；若有阵亡前排，先以 50% 生命复苏一人，此复苏每战一次，不代替濒死保命'] },
    { key:'recon', category:'dot', name:'持续伤害', mastery:'灾变引爆', members:['luna','tempest','uluru','nameless','sineva','nitro'], color:'#bca7ef', tiers:['成员使用持续伤害技能，向另一敌人附加 2 次电击，并立即结算一次基础 25 伤害；仅剩一个敌人时也生效','灾变引爆：成员使用持续伤害技能后，全体敌人获得 3 次电击；立即结算场上燃烧、流血、电击、低温区和铁丝网的全部剩余伤害，不消耗持续时间，不触发暴击'] }
  ];
  const newMembers = {smoke:['gizmo','rover'],demolition:['shepherd','gizmo','raptor'],healing:['rover'],dot:['gizmo','rover','toxik']};
  for (const bond of bonds) { bond.members.push(...(newMembers[bond.category] || [])); bond.tiers[1] += `。${Engines.rules[bond.key].text}`; }
  Tiers.install(bonds, Engines.rules);
  // More smoke-capable operators add lineup choices, not undocumented effect tiers.
  bonds.find(bond => bond.key === 'smoke').thresholds = [2, 3, 4];
  bonds.find(bond => bond.key === 'recon').thresholds = [2, 3, 5, 7, 9];
  const limitNote = '仅计算上阵的不同干员，前后排均计数。基础技能连携每组每轮一次；感染叠层每次持续伤害技能均触发，其他满级质变按各自条件持续触发，不受此限制。自动追击不占行动、不再次触发技能或追击。感染仅本场累积，护盾上限为最大生命的 50%，战地复苏每战一次。';
  // Explicit skill IDs prevent incidental words such as “不受烟幕保护” creating false tags.
  const triggers = {
    smoke:['smoke','drone','wolfSmoke','tradeWind','toxicMist','smartSmoke','irritantSmoke'],
    demolition:['bomb','triple','frag','fire','missile','razorWire','cryoBurst','sonicFrag','spiderNest','hunterSpider','falcon','pulseGrenade'],
    flash:['flash','breachFlash','thermal','echoFlash'],
    defense:['cover','rescueSwarm','riotSuit'],
    dot:['volt','wallSpike','fire','razor','razorWire','dewar','cryoBurst','spiderNest','aerosol','toxicMist'],
    healing:['heal','nano','rescueSwarm','aerosolAid']
  };
  const reasons = {
    smoke:{stinger:'蜂巢烟雾弹、烟幕无人机',dwolf:'突破型烟雾弹',butterfly:'烟雾弹·信风',toxik:'致盲毒雾',vyron:'磁吸炸弹引爆后的烟幕'},
    demolition:{vyron:'磁吸炸弹',uluru:'燃烧弹、巡飞弹',dwolf:'三联装手炮',luna:'增强型破片手雷',sineva:'刀片刺网手雷',nitro:'连发冷凝榴弹'},
    flash:{hackclaw:'闪光巡飞器',nameless:'突破型闪光弹',nitro:'温感追踪震撼弹',echo:'复合型闪光弹'},
    defense:{uluru:'速凝掩体',butterfly:'救援无人机群护盾',sineva:'防爆套装、后方防护'},
    healing:{stinger:'激素枪、后排救援',butterfly:'医疗粉尘、救援无人机群',dwolf:'外骨骼击杀恢复、后排治疗',tempest:'紧急回避装置生命恢复',toxik:'后排高效治疗'},
    dot:{luna:'电击箭矢',tempest:'钻墙电刺',uluru:'燃烧弹持续燃烧',nameless:'旋刃持续流血',sineva:'刀片刺网持续伤害',nitro:'冷罐持续低温伤害'}
  };
  const upgrades = {
    shepherd: { action: 'sonicFrag', name: '强化型破片手雷', tiers: ['全体敌人追加 35% 攻击力爆炸伤害', '全体敌人追加 70% 攻击力爆炸伤害'] },
    gizmo: { action: 'hunterSpider', name: '寻猎蜘蛛', tiers: ['主目标追加 60% 攻击力爆炸伤害', '全体敌人追加 100% 攻击力爆炸伤害'] },
    raptor: { action: 'falcon', name: '猎鹰无人机', tiers: ['所有本次命中目标追踪两轮，防护降低 35%', '所有本次命中目标追踪三轮，并追加 80% 攻击力爆炸伤害'] },
    rover: { action: 'clover', name: '军犬协同', tiers: ['军犬每次扑击提升至 200% 攻击力（包括后续追击）', '军犬每次扑击提升至 240% 攻击力（包括后续追击）'] },
    sineva: { action: 'grapple', name: '多功能钩爪枪', tiers: ['额外为最前方友军补充 30 护盾', '额外为最前方友军补充 60 护盾'] },
    nitro: { action: 'dewar', name: '杜瓦冷罐', tiers: ['额外施加 1 层低温', '额外施加 2 层低温，可立即冻结'] },
    toxik: { action: 'adrenaline', name: '肾上腺素激活', tiers: ['额外为全队回复 8 能量；蜂医补针进度 +16', '额外为全队回复 14 能量；蜂医补针进度 +28'] },
    echo: { action: 'resonance', name: '共振干扰装置', tiers: ['额外覆盖区域外 1 名敌人，附带完整干扰效果', '额外覆盖区域外 2 名敌人，附带完整干扰效果'] },
    butterfly: { action: 'nano', name: '纳米医疗粉尘', tiers: ['额外治疗另一名前台友军 35 点', '额外治疗另一名前台友军 65 点'] },
    tempest: { action: 'wallSpike', name: '钻墙电刺', tiers: ['额外命中 1 名敌人，附带相同伤害、击倒与电击', '额外命中 2 名敌人，附带相同伤害、击倒与电击'] },
    nameless: { action: 'razor', name: '旋刃飞行器', tiers: ['向主目标追加 35% 攻击的爆炸伤害', '向主目标追加 60% 攻击的爆炸伤害'] },
    vyron: { action: 'bomb', name: '磁吸炸弹', tiers: ['额外向 1 名敌人附着磁吸炸弹', '向所有存活敌人附着磁吸炸弹'] },
    dwolf: { action: 'triple', name: '三联装手炮', tiers: ['手炮由 3 连发升级为 4 连发', '手炮升级为 5 连发'] },
    luna: { action: 'frag', name: '破片手雷', tiers: ['主目标额外受到 2 次电击', '所有存活敌人额外受到 2 次电击'] },
    hackclaw: { action: 'decode', name: '信号破译器', tiers: ['额外标记所有存活敌人 3 轮', '全体标记，并干扰所有存活敌人 1 次行动'] },
    uluru: { action: 'cover', name: '速凝掩体', tiers: ['额外为全体前台友军补充 40 护盾', '额外为全体前台友军补充 80 护盾'] },
    stinger: { action: 'heal', name: '激素枪', tiers: ['额外治疗 1 名受伤的前台友军 60 点', '额外治疗 2 名受伤的前台友军各 60 点'] }
  };
  Object.assign(reasons.smoke,{gizmo:'智能烟雾地雷',rover:'刺激性烟雾'});
  Object.assign(reasons.demolition,{shepherd:'强化型破片手雷',gizmo:'哨兵母巢、寻猎蜘蛛',raptor:'无人机 EMP、脉冲手雷'});
  Object.assign(reasons.healing,{rover:'气雾针剂救援、后排求生专家'});
  Object.assign(reasons.dot,{toxik:'致盲毒雾持续毒蚀、流荧集群引爆感染',gizmo:'哨兵母巢延时爆炸',rover:'气雾针剂持续伤害'});
  function evaluate(ids, revision = 2) {
    return Tiers.evaluate(bonds, ids, revision).map(bond => ({...bond, effect:`${bond.effect}。${limitNote}`}));
  }
  function validBondShock(shock, ids, revision = 2) {
    const group=evaluate(ids, revision).find(bond=>bond.category==='dot');
    return !!shock && group.active && group.present.includes(shock.source) && Number.isInteger(shock.ticks) && shock.ticks>=1 && shock.ticks<=group.profile.ticks;
  }
  const allBonds = [...(Roles?.definitions || []), ...bonds];
  const evaluateAll = (ids, revision = 2) => [...(Roles?.evaluate(ids, revision) || []), ...evaluate(ids, revision)];
  const tags = id => allBonds.filter(bond => bond.members.includes(id));
  const legendary = {
    vyron: {name:'全场爆破',action:'air',detail:'三星五费：开局满能量。大招清空全场护盾与掩体，造成 2000% 攻击力爆炸伤害、无视 90% 防护，并引爆已有 C4、击倒幸存者。击倒期间受到前排直接攻击伤害 +200%。下一波增援自动再引爆一次。'},
    tempest: {name:'无限突进',action:'anchor',detail:'三星五费：开局满能量。大招普攻变为九连射，每发 150% 攻击，整组只结算一次普攻回能。前两组射击后可免费翻滚，再继续选择射击，最多连续三组。翻滚不自动开枪；前后排都能连段，后排自动执行。'},
    butterfly: {name:'拒绝死亡',action:'rescueSwarm',detail:'三星五费：开局满能量。大招仍持续两回合，期间全队（含蝶）可反复满血复活，蝶存活时全队减伤40%、增伤25%。开启时全队满血、净化、重置普通技能冷却，其他干员充满能量（蜂医补满针）。结束时对全体敌人反击，基础伤害为蝶 2000% 攻击力加期间累计致命伤害。'}
  };
  const legendaryReward = '本局首次合成该三星五费：专属快递含干员复制器 ×5、藏品重铸器 ×5、50 万哈夫币；出售重追不重复领取。';
  const upgrade = (id, stars) => stars >= 2 && upgrades[id] ? `${upgrades[id].name}：${upgrades[id].tiers[Math.min(3, stars) - 2]}${stars >= 3 && legendary[id] ? `；${legendary[id].detail} ${legendaryReward}` : ''}` : '';
  function promotion(id, copies) {
    copies = Math.max(0, copies || 0);
    const next = copies < 3 ? 2 : 3, missing = Math.max(0, (next === 2 ? 3 : 9) - copies);
    return { next, missing, ready: missing === 1, maxed: copies >= 9, text: copies >= 9 ? `三星已强化 · ${upgrade(id, 3)}` : `${missing === 1 ? '再招募 1 份即升星' : `还差 ${missing} 份升${next === 2 ? '二' : '三'}星`} · ${upgrade(id, next)}` };
  }
  function initMemory(state) {
    state.buildcraftMemory ||= { ambush: [], counterRounds: {}, rescueUsed: false };
    return state.buildcraftMemory;
  }
  function afterAction({ state, actor, event, resolvedAction, actionId, hit, heal, applyCold, gainEnergy, rechargeNeedle, initGearState, bleedDamage = () => 24 }) {
    if (!state.buildcraftVersion) return;
    const actionResolved = resolvedAction && actor.side === 'ally' && actor.hp > 0;
    const primaryEffects = event.effects.slice();
    let currentBond = null;
    const healingSources = new Set(event.effects.filter(e => ['heal','revive'].includes(e.type) && e.value > 0).map(e => e.source || actor.id));
    if (actionResolved && triggers.healing.includes(actionId)) healingSources.add(actor.id);
    const allies = state.units.filter(u => u.side === 'ally' && u.hp > 0);
    const smokeSource = allies.find(u => primaryEffects.some(e => e.type === 'smoke' && e.source === u.id));
    const front = allies.filter(u => Formation.frontSlot(u.slot)).sort((a, b) => a.slot - b.slot);
    const foes = () => state.units.filter(u => u.side === 'enemy' && u.hp > 0 && (!state.reinforcementVersion || u.entered && !u.retired));
    const primary = state.units.find(u => u.id === (event.primaryTarget || event.targets[0]));
    const activeBonds = evaluate(state.units.filter(u => u.side === 'ally').map(u => u.id), state.bondRevision || 1);
    const memory = initMemory(state);
    state.buildcraftStats ||= {};
    state.buildcraftRounds ||= {};
    const stats = id => state.buildcraftStats[id] ||= { procs: 0, followUps: 0, bondDamage: 0, bondHealing: 0, shield: 0, starProcs: 0 };
    const link = (source, target, label, key, type = 'bond') => {
      if (type === 'bond') Engines.credit(state, key, 'triggers', 1);
      event.effects.push({ type, source: source.id, target: target.id, value: 0, label, bond: key });
      event.note = [event.note, label].filter(Boolean).join(' · ');
      (event.links ||= []).push({ source: source.id, target: target.id, label, bond: key });
    };
    const shield = (target, amount, owner = actor, key = currentBond) => {
      if (!target) return 0;
      const gear = initGearState(target), before = gear.shield;
      gear.shield = Math.min(Math.floor(target.maxHp * .5), gear.shield + amount);
      const actual = gear.shield - before;
      if (actual > 0) { stats(owner.id).shield += actual; Engines.credit(state, key, 'shield', actual); event.effects.push({ type: 'cover', target: target.id, value: actual }); }
      return actual;
    };
    const bondHit = (source, target, amount, explosive = false, canCrit = true, key = currentBond) => {
      if (!target || target.hp <= 0) return;
      const effectStart = event.effects.length;
      hit(target, amount, explosive, source, canCrit);
      const damageEffects = event.effects.slice(effectStart).filter(effect=>effect.type==='damage'&&!effect.c4);
      const damage = damageEffects.reduce((sum,effect)=>sum+effect.value,0);
      stats(source.id).bondDamage += damage;
      Engines.credit(state, key, 'damage', damage);
      for (const effect of damageEffects) effect.bond = key;
    };
    const relayEnergy = (unit, amount) => {
      const before = unit.supply ? unit.supply.count * 200 + unit.supply.progress : unit.energy;
      if (unit.supply) rechargeNeedle(unit, amount * 2); else gainEnergy(unit, amount);
      const after = unit.supply ? unit.supply.count * 200 + unit.supply.progress : unit.energy;
      if (after > before) event.effects.push({ type: 'gear', target: unit.id, value: after - before, label: '治疗接力 · 充能' });
      return after > before;
    };
    // Reactions are damage only, never another action: no cooldown, energy or gear-action loops.
    if (resolvedAction && actor.side === 'enemy' && activeBonds.find(b => b.key === 'defense').mastered) {
      currentBond = 'defense';
      const blocked = new Set(event.effects.filter(e => e.type === 'shieldBlock' && e.value > 0).map(e => e.target));
      for (const defender of front.filter(u => blocked.has(u.id) && !u.stun && memory.counterRounds[u.id] !== state.round)) {
        if (actor.hp <= 0) break;
        memory.counterRounds[defender.id] = state.round;
        bondHit(defender, actor, defender.attack * .8);
        stats(defender.id).procs++; stats(defender.id).followUps++;
        link(defender, actor, '满级 · 堡垒反击', 'defense');
      }
    }
    if (actionResolved && (actionId === 'attack' || event.comboAttack) && memory.ambush.includes(actor.id)) {
      currentBond = 'smoke';
      memory.ambush = memory.ambush.filter(id => id !== actor.id);
      const target = foes().find(u => u === primary) || foes()[0];
      if (target) {
        bondHit(actor, target, actor.attack * activeBonds.find(b => b.key === 'smoke').profile.ambush);
        stats(actor.id).procs++; stats(actor.id).followUps++;
        link(actor, target, '烟幕伏击', 'smoke');
      }
    }
    const finish = () => Engines.afterAction({state, actor, event, resolvedAction, actionId, primaryEffects, activeBonds, triggers, bondHit, shield, stats, link});
    if (!actionResolved && !smokeSource && !allies.some(u => healingSources.has(u.id))) return finish;
    currentBond = null;
    // Promotion effects use the same damage/heal helpers as ordinary skills.
    const stars = Math.min(3, actor.stars || 1);
    if (actionResolved && stars >= 2 && upgrades[actor.id]?.action === actionId) {
      const changed = [];
      if (actor.id === 'shepherd') for (const enemy of foes()) { hit(enemy,actor.attack*(stars===2?.35:.7),true,actor); changed.push(enemy); }
      if (actor.id === 'gizmo') for (const enemy of foes().filter(u=>stars===3||u===primary)) { hit(enemy,actor.attack*(stars===2?.6:1),true,actor); changed.push(enemy); }
      if (actor.id === 'raptor') for (const enemy of foes().filter(u=>event.targets.includes(u.id))) { enemy.traced=Math.max(enemy.traced,stars); if(stars===3) hit(enemy,actor.attack*.8,true,actor); changed.push(enemy); }
      if (actor.id === 'rover') changed.push(actor);
      if (actor.id === 'sineva' && shield(front[0], stars === 2 ? 30 : 60)) changed.push(front[0]);
      if (actor.id === 'nitro' && primary?.hp > 0 && !primary.frostImmune) { applyCold(primary, stars - 1); changed.push(primary); }
      if (actor.id === 'toxik') for (const ally of allies) { if (ally.supply) rechargeNeedle(ally, stars === 2 ? 16 : 28); else gainEnergy(ally, stars === 2 ? 8 : 14); changed.push(ally); }
      if (actor.id === 'echo') for (const enemy of foes().filter(u => !event.targets.includes(u.id)).slice(0, stars - 1)) { enemy.hobbled = 2; enemy.jammed = Math.max(enemy.jammed, 1); enemy.blinded = Math.max(enemy.blinded, 1); enemy.marked = Math.max(enemy.marked, 2); enemy.enemyLock = null; changed.push(enemy); }
      if (actor.id === 'vyron') for (const enemy of foes().filter(u => u !== primary && !u.bomb).slice(0, stars === 2 ? 1 : Infinity)) { enemy.bomb = { source: actor.id, stacks: 0 }; event.effects.push({ type: 'bomb', target: enemy.id, value: 1 }); changed.push(enemy); }
      if (actor.id === 'dwolf') for (let i = 1; i < stars; i++) {
        const enemy = primary?.hp > 0 ? primary : foes().sort((a,b) => a.slot - b.slot)[0]; if (!enemy) break;
        (event.shots ||= []).push(enemy.id); hit(enemy, actor.attack * .7, true, actor); changed.push(enemy);
      }
      if (actor.id === 'luna') for (const enemy of foes().filter(u => stars === 3 || u === primary)) { enemy.shock = { source: actor.id, ticks: 2 }; event.effects.push({ type: 'shock', target: enemy.id, value: 2 }); changed.push(enemy); }
      if (actor.id === 'hackclaw') for (const enemy of foes()) { enemy.marked = Math.max(enemy.marked, 3); if (stars === 3) enemy.jammed = Math.max(enemy.jammed, 1); changed.push(enemy); }
      if (actor.id === 'uluru') for (const ally of front) if (shield(ally, stars === 2 ? 40 : 80)) changed.push(ally);
      if (actor.id === 'stinger') for (const ally of front.filter(u => u !== primary && u.hp < u.maxHp).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp).slice(0, stars - 1)) if (heal(ally, 60, actor)) changed.push(ally);
      if (actor.id === 'butterfly') for (const ally of front.filter(u => u !== primary && u.hp < u.maxHp).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp).slice(0, 1)) if (heal(ally, stars === 2 ? 35 : 65, actor)) changed.push(ally);
      if (actor.id === 'tempest') for (const enemy of foes().filter(u => u !== primary).slice(0, stars - 1)) {
        hit(enemy, actor.attack * .9, true, actor);
        if (enemy.hp > 0) { enemy.stun = Math.max(enemy.stun, 1); enemy.shock = { source: actor.id, ticks: 2 }; event.effects.push({ type: 'stun', target: enemy.id, value: 1 }, { type: 'shock', target: enemy.id, value: 2 }); }
        changed.push(enemy);
      }
      if (actor.id === 'nameless' && primary?.hp > 0) { hit(primary, actor.attack * (stars === 2 ? .35 : .6), true, actor); changed.push(primary); }
      if (changed.length) { event.targets = [...new Set([...event.targets, ...changed.map(u => u.id)])]; stats(actor.id).starProcs++; link(actor, changed[0], `${stars} 星强化 · ${upgrades[actor.id].name}`, 'star', 'star'); }
    }
    // Count deployed distinct operators, including fallen members, but never bench copies.
    for (const bond of activeBonds) {
      currentBond = bond.key;
      const source = bond.category === 'healing' ? allies.find(u => healingSources.has(u.id) && bond.present.includes(u.id)) : bond.category === 'smoke' && smokeSource ? smokeSource : actor;
      if (!bond.active || !source || !bond.present.includes(source.id) || state.buildcraftRounds[bond.key] === state.round) continue;
      if (!actionResolved && bond.category !== 'healing' && !(bond.category === 'smoke' && smokeSource)) continue;
      const p = bond.profile;
      let target = null;
      if (bond.category === 'demolition' && triggers.demolition.includes(actionId)) {
        target = foes().find(u => u !== primary) || foes()[0];
        const victims = p.targets === Infinity ? foes() : foes().filter(u => u !== primary).concat(foes().filter(u => u === primary)).slice(0, p.targets);
        for (const enemy of victims) bondHit(source, enemy, source.attack * p.power, true);
        if (p.repeat) {
          if (event.effects.some(e => e.type === 'down' && state.units.find(u => u.id === e.target)?.side === 'enemy')) {
            for (const enemy of foes()) bondHit(source, enemy, source.attack * p.power, true);
            if (target) event.note = [event.note, '连锁殉爆 · 二次引爆'].filter(Boolean).join(' · ');
          }
        }
        event.targets = [...new Set([...event.targets, ...victims.map(u => u.id)])];
      } else if (bond.category === 'flash' && triggers.flash.includes(actionId)) {
        const extra = p.all ? foes() : foes().filter(u => !event.targets.includes(u.id) && !u.blinded).slice(0, 1);
        const marked = foes().filter(u => extra.includes(u) || event.targets.includes(u.id) && u.blinded);
        for (const enemy of marked) {
          enemy.blinded = Math.max(enemy.blinded, 1); enemy.marked = Math.max(enemy.marked, 2);
          event.effects.push({ type:'blinded', target:enemy.id, value:1 }, { type:'marked', target:enemy.id, value:2 });
        }
        if (marked.length) { target = marked[0]; event.targets = [...new Set([...event.targets, ...marked.map(u => u.id)])]; }
        if (p.shot) {
          const shooter = allies.filter(u => u !== source && bond.present.includes(u.id) && !u.stun).sort((a, b) => b.attack - a.attack)[0];
          const victim = foes().sort((a, b) => a.hp - b.hp)[0];
          if (shooter && victim) { bondHit(shooter, victim, shooter.attack * p.shot); stats(shooter.id).followUps++; event.effects.push({ type:'bondShot', source:shooter.id, target:victim.id, value:1, label:'致盲追击' }); }
        }
      } else if (bond.category === 'defense' && triggers.defense.includes(actionId)) {
        for (const ally of p.all ? front : front.slice(0, 1)) if (shield(ally, p.all ? Math.round(ally.maxHp * p.shield) : p.shield, source)) target ||= ally;
      } else if (bond.category === 'smoke' && (smokeSource || triggers.smoke.includes(actionId))) {
        const before=state.smoke.ally;state.smoke.ally=Math.min(4,before+p.duration);
        if(state.smoke.ally>before)target=source;
        for (const ally of front) {
          if (shield(ally, Math.round(ally.maxHp * p.shield), source)) target ||= ally;
          if (p.ambush && !memory.ambush.includes(ally.id)) { memory.ambush.push(ally.id); target ||= ally; event.effects.push({ type:'gear', target:ally.id, value:1, label:'烟幕伏击 · 已就绪' }); }
        }
      } else if (bond.category === 'healing') {
        let revived = null;
        if (p.revive && !memory.rescueUsed) {
          revived = state.units.find(u => u.side === 'ally' && Formation.frontSlot(u.slot) && u.hp <= 0);
          if (revived) {
            memory.rescueUsed = true; revived.hp = Math.round(revived.maxHp * .5);
            for (const key of ['burn','stun','marked','traced','jammed','blinded','wounded','hobbled','frost','suppressed']) revived[key] = 0;
            for (const key of ['bomb','bleeding','shock','coldField','wireField','spiderMines']) revived[key] = null;
            source.healing += revived.hp; stats(source.id).bondHealing += revived.hp;
            Engines.credit(state, bond.key, 'healing', revived.hp);
            if (!state.queue.includes(revived.id)) state.queue.push(revived.id);
            event.effects.push({ type:'revive', source:source.id, target:revived.id, value:revived.hp }); target = revived;
          }
        }
        const patients = p.all ? front : front.slice().sort((a,b) => a.hp/a.maxHp - b.hp/b.maxHp).slice(0,1);
        for (const patient of patients) {
          const amount = heal(patient, p.all ? Math.round(patient.maxHp * p.heal) : p.heal, source);
          stats(source.id).bondHealing += amount; if (amount) target ||= patient;
          Engines.credit(state, bond.key, 'healing', amount);
        }
        for (const recipient of p.all ? state.units.filter(u => u.side === 'ally' && u.hp > 0) : patients) if (relayEnergy(recipient, p.energy)) target ||= recipient;
      } else if (bond.category === 'dot' && triggers.dot.includes(actionId)) {
        const ticks=p.ticks, candidates = p.targets === Infinity ? foes() : foes().filter(u => u !== primary && (!u.shock || u.shock.ticks < ticks)).concat(foes()).filter((u,i,list) => list.indexOf(u) === i).slice(0,p.targets);
        for (const enemy of candidates) {
          if (!enemy.shock || enemy.shock.ticks < ticks) enemy.shock = { source:source.id, ticks };
          event.effects.push({ type:'shock', target:enemy.id, value:enemy.shock.ticks });
          target ||= enemy;
          if (!p.detonate) { bondHit(source, enemy, p.instant, true, false); continue; }
          // Detonate a snapshot of remaining ticks; originals keep their durations and owners.
          const dots = [[enemy.burn * 22, 'uluru'], ...[['bleeding',bleedDamage(state.units.find(u => u.id === enemy.bleeding?.source))],['shock',25],['venom',(state.units.find(u=>u.id==='toxik')?.attack||0)*.45],['coldField',18],['wireField',22],['spiderMines',(state.units.find(u=>u.id==='gizmo')?.attack||0)*.65],['aerosolField',(state.units.find(u=>u.id==='rover')?.attack||0)*.65]].map(([key, base]) => [base * (enemy[key]?.ticks || 0), enemy[key]?.source])];
          for (const [amount, owner] of dots) if (amount > 0 && enemy.hp > 0) bondHit(state.units.find(u => u.id === owner) || source, enemy, amount * p.detonate, true, false);
        }
        event.targets = [...new Set([...event.targets, ...candidates.map(u => u.id)])];
      }
      if(target){
        state.buildcraftRounds[bond.key]=state.round;stats(source.id).procs++;
        const labels={smoke:'烟幕续接',demolition:'追加爆破',flash:'扩散致盲',defense:'护盾接应',healing:'接力治疗',dot:'持续电击'};
        link(source,target,`${bond.mastered ? '满级 · ' + bond.mastery : bond.name + ' ' + bond.thresholds[bond.tier-1] + ' · ' + labels[bond.category]}`,bond.key);
      }
    }
    return finish;
  }
  const api = { bonds, allBonds, Roles, evaluateAll, limitNote, triggers, reasons, validBondShock, upgrades, legendary, legendaryReward, evaluate, tags, upgrade, promotion, initMemory, afterAction, Engines };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HaffBuildcraft = api;
})(typeof window === 'undefined' ? globalThis : window);
