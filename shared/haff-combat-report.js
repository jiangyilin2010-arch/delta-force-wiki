(function (root) {
  'use strict';
  const Core = typeof module !== 'undefined' && module.exports ? require('./haff-war-core.js') : root.HaffWar;
  const S = typeof module !== 'undefined' && module.exports ? require('./haff-systems.js') : root.HaffSystems;
  const Slots = typeof module !== 'undefined' && module.exports ? require('./haff-relic-slots.js') : root.HaffRelicSlots;
  const statuses = [
    ['spiderMines','哨兵母巢','debuff','行动前受到比特当前攻击力 65% 的爆炸持续伤害','次结算'],
    ['aerosolField','针剂气雾','debuff','生命上限暂降 15%；行动前受到旅人当前攻击力 65% 的持续伤害，结束恢复上限但不回血','次结算'],
    ['clover','军犬四叶','buff','常规行动后追击标记者；1/2/3 星倍率为 160%/200%/240%，不额外结算普攻与回能','次追击'],
    ['spyCamera','蜂鸟摄像头','buff','常规行动后刷新全体标记，追加一次 90% 攻击力射击，不额外回能','次追击'],
    ['stun','击倒','debuff','无法行动','行动'], ['marked','标记','debuff','防护降低 20%，枪械承伤 +20%，烟幕及烟墙减伤失效；与破译减防取更强效果','轮'],
    ['traced','追踪','debuff','防护降低 35%，覆盖普通标记减防；飞刀造成额外伤害','轮'], ['jammed','干扰','debuff','敌方特殊攻击被打断，改用普攻','行动'],
    ['blinded','致盲','debuff','造成伤害 −50%','行动'], ['suppressed','压制','debuff','造成伤害 −20%','行动'],
    ['wounded','重伤','debuff','受到治疗 −50%','行动'], ['hobbled','减速','debuff','排序速度 −20','行动'],
    ['fractured','碎甲','debuff','护盾或掩体被爆炸击破，防护降低 30%；与标记、破译减防取最高值，不叠加','行动'],
    ['frost','低温','debuff','每层排序速度 −8；三层触发冻结','层'], ['burn','燃烧','debuff','行动前承受基础 22 点持续伤害','次结算'],
    ['shock','电击','debuff','行动前承受基础 25 点持续伤害','次结算'], ['bleeding','流血','debuff','行动前承受 24＋50% 无名当前攻击力的基础持续伤害','次结算'],
    ['coldField','冷罐区域','debuff','行动前承受基础 18 点伤害并叠加低温','次结算'], ['wireField','刀片刺网','debuff','行动前承受基础 22 点持续伤害','次结算'],
    ['venom','毒蚀','debuff','行动前受到蛊当前攻击力 45% 的持续伤害','次结算'],
    ['bomb','磁吸炸弹','debuff','下次行动前、倒下或威龙大招时引爆；每次友方直接命中叠 1 层，每层主爆与溅射 +20%；不含持续伤害和 C4 爆炸',''],
    ['overdrive','动力外骨骼','buff','造成伤害 +25%，排序速度 +25；红狼普攻变为两发 90% 攻击力射击','行动'], ['stealth','潜袭','buff','造成伤害 +30%，受到伤害 −30%','行动'],
    ['tempestRush','锚点强袭','buff','排序速度 +35%，选择普攻时三连射；翻滚保留当前行动，不自动射击、不扣强化次数','行动'], ['rollBoost','翻滚强化','buff','造成伤害 +30%，排序速度 +20%','行动'],
    ['adrenaline','肾上腺素','buff','造成伤害 +20%，排序速度 +25','行动'], ['riot','防爆套装','buff','受到伤害 −40%','行动'],
    ['evade','翻滚规避','buff','下次命中伤害 −50%','次'], ['frostImmune','抗冻结','buff','暂时不再积累低温','行动'],
    ['nano','纳米治疗','buff','行动前恢复基础 50 生命','次结算'], ['regen','持续恢复','buff','行动前恢复基础 22 生命','次结算'],
    ['anchorGuard','支援锚点','buff','倒地时触发锚点救援','行动'], ['sonar','回声探测','buff','常规行动结束后再次标记敌方全体','次触发'],
    ['rescueWindow','救援无人机群','buff','仅持续期间可自动复活倒地前排；需蝶存活，每人每战限救一次','回合（含本轮）'],
    ['rescueGuard','无人机拦截','buff','抵挡下一次爆炸伤害；不阻止该攻击附带的控制或持续状态','次'],
    ['boosted','加速接应','buff','本轮排序速度 +25；不与其他固定 +25 加速叠加','']
  ];
  function stacks(original) {
    if (!original) return [];
    const unit = Core.snapshot(original), rows = [];
    function add(key, slot, rule, count, name) {
      if (!rule?.stacks) return;
      const gains = ['attack','speed','armor'].flatMap(stat => {
        const value = rule.kind === stat ? rule.value : rule[stat];
        return value ? [`${{attack:'攻击',speed:'速度',armor:'防护'}[stat]} +${Math.round(value * count * 1000) / 10}%`] : [];
      });
      rows.push({key,slot,name,count,limit:rule.unlimited ? null : rule.stacks,
        label:rule.unlimited ? `${count} 层 · ∞` : `${count}/${rule.stacks} 层`,bonus:gains.join(' · ')});
    }
    for (const [slot,key] of Object.entries(unit.equipment || {}))
      add(key,slot,S.gearPassives[key],unit.gearState?.stacks?.[key] || 0,Core.equipment[key]?.name || key);
    for (const entry of Slots.entries(unit))
      add(entry.key,`relic${entry.slot+1}`,S.relics[entry.key]?.rule,entry.memory.stacks || 0,S.relics[entry.key]?.name || entry.key);
    return rows;
  }
  function read(state, id, prepared = null, bonuses = []) {
    const original = state?.units.find(u => u.id === id); if (!original) return null;
    // Some core helpers initialize empty effect memory; never let inspection mutate combat.
    const unit = Core.snapshot(original), base = Core.units[id], ally = unit.side === 'ally', back = Core.rear(unit);
    const relics = Slots.entries(unit), supreme = Slots.supreme(unit, S.relics), links = ally ? state.linkCombat : null;
    const rescue = Core.rescueAura(state, unit);
    const totalDamage = Core.damageMultiplier(unit) * (rescue ? 1.25 : 1) * (1 + (links?.damage || 0) / 100);
    const stats = ['hp','attack','armor','speed'].map(key => {
      const current = key === 'hp' ? unit.maxHp : key === 'speed' ? Core.initiativeSpeed(unit) : key === 'armor' ? Math.round(Core.effectiveArmor(unit) * 100) / 100 : unit[key];
      const opening = prepared?.[key] ?? (key === 'attack' ? unit.gearState?.baseAttack : key === 'speed' ? unit.gearState?.baseSpeed : key === 'armor' ? unit.gearState?.baseArmor : current) ?? current;
      return { key, label: {hp:'生命上限',attack:'攻击面板',armor:'防护',speed:state.timeline?'行动速度':'排序速度'}[key], value: current, base: base[key], opening, permanent: opening - base[key], combat: current - opening };
    });
    const effects = statuses.flatMap(([key, name, type, detail, clock]) => {
      const value = unit[key]; if (!value) return [];
      const remaining = typeof value === 'object' ? value.ticks : typeof value === 'number' ? value : null;
      const source = key === 'burn' ? unit.burnSource || 'uluru' : value.source;
      if (key === 'bomb') detail += `；当前 ${value.stacks || 0} 层，伤害 +${(value.stacks || 0)*20}%，无上限`;
      if (key === 'bleeding') detail += `；当前每次基础 ${Core.bleedDamage(state.units.find(u => u.id === source))} 点`;
      if (Core.isLegendary(unit) && key === 'tempestRush') detail = `九连射，每发 150% 攻击；整组回能一次。剩余续接 ${unit.legendaryChain} 次${unit.legendaryRoll ? '，等待免费翻滚' : ''}`;
      if (Core.isLegendary(unit) && key === 'rescueWindow') detail = `全队含蝶可无限次满血复活；累计致命伤害 ${unit.rescueDebt}，结束时反击`;
      return [{ key, name, type, detail, duration: clock && remaining ? `${remaining} ${clock}` : '已生效', source: source && state.units.find(u => u.id === source)?.name }];
    });
    const team = unit.side, front = Core.combatants(state, team).sort((a,b) => a.slot-b.slot)[0];
    if (Core.sonicProtection(state, unit)) effects.push({key:'sonicProtection',name:'减振防御',type:'buff',detail:'受到爆炸伤害降低 20%',duration:'牧羊人在后排存活且未被击倒',source:'牧羊人'});
    if (rescue) effects.push({key:'rescueAura',name:'救援群庇护',type:'buff',detail:'受到伤害降低 40%；造成伤害提高 25%。与其他减伤独立相乘。',duration:`${rescue.rescueWindow} 回合（含本轮），需蝶存活`,source:'蝶'});
    if (Core.knockdownVulnerable(state, unit)) effects.push({key:'knockdownVulnerable',name:'震荡集火',type:'debuff',detail:`受到我方前排直接攻击伤害 +${Core.knockdownBonus(state)*100}%；不含后排攻击和持续伤害`,duration:'击倒期间且威龙存活',source:'威龙'});
    const legendaryMedic = state.units.find(u=>u.id==='butterfly' && Core.isLegendary(u));
    if (unit.butterflyRescued && !legendaryMedic) effects.push({key:'butterflyRescued',name:'无人机救援已使用',type:'buff',detail:'本场不能再次被蝶复活',duration:'本场'});
    if (unit.side==='ally' && legendaryMedic?.rescueWindow) effects.push({key:'legendaryRescue',name:'拒绝死亡',type:'buff',detail:'倒地立即满血复活，不限次数',duration:`${legendaryMedic.rescueWindow} 回合（含本轮）`,source:'蝶'});
    if (Core.isLegendary(unit)) effects.push({key:'legendary',name:Core.Buildcraft.legendary[id].name,type:'buff',detail:Core.Buildcraft.legendary[id].detail,duration:'三星五费专属'});
    for (const sniper of state.units.filter(u => u.hp > 0 && u.enemyLock === id)) effects.push({key:`lock-${sniper.id}`,name:'狙击锁定',type:'debuff',detail:`${sniper.name}正在瞄准；可使用烟幕、护盾或打断应对`,duration:'下一次狙击前',source:sniper.name});
    if (unit.gearState?.shield) effects.push({key:'shield',name:'个人护盾',type:'buff',detail:`剩余 ${unit.gearState.shield} 点，优先吸收伤害`,duration:'消耗完为止'});
    if (state.covers[team] && front?.id === id) effects.push({key:'cover',name:'前线掩体',type:'buff',detail:`队伍掩体剩余 ${state.covers[team]} 点`,duration:'消耗完为止'});
    for (const [key,name,detail] of [['smoke','烟幕','枪械伤害 −40%'],['walls','烟墙','枪械伤害 −50%']]) if (state[key][team]) {
      effects.push({key,name,type:'buff',detail:`${detail}${unit.marked ? '；被标记，减伤未生效' : key==='smoke' && state.walls[team] ? '；当前优先使用烟墙减伤，不叠加' : back ? '；后排当前不承受直接伤害' : ''}`,duration:`${state[key][team]} 轮`});
    }
    if (state.dyed[team] && state.smoke[team]) effects.push({key:'dyed',name:'治疗烟',type:'buff',detail:'行动前额外恢复 15 生命',duration:`${state.smoke[team]} 轮`});
    if (state.buildcraftMemory?.ambush?.includes(id)) effects.push({key:'ambush',name:'烟幕伏击',type:'buff',detail:`下一次普攻追加 ${Math.round(Core.Buildcraft.evaluate(state.units.filter(u=>u.side==='ally').map(u=>u.id),state.bondRevision||1).find(b=>b.key==='smoke').profile.ambush*100)}% 攻击力射击`,duration:'1 次普攻'});
    if(state.buildcraftEngine?.exposed?.[id])effects.push({key:'bond-exposed',name:'处决标记',type:'debuff',detail:'友方行动命中后，闪光成员追加 250% 攻击力射击；耗尽最后一次标记，再追加最大生命 20% 的基础伤害',duration:`剩余 ${state.buildcraftEngine.exposed[id]} 次`});
    if(state.buildcraftEngine?.infection?.[id])effects.push({key:'bond-infection',name:'灾变感染',type:'debuff',detail:'持续伤害技能会按感染层数引爆，倒下后转移给生命最多的敌人；本场无层数上限',duration:`${state.buildcraftEngine.infection[id]} 层`});
    if(ally)for(const row of Core.Buildcraft.Engines.status(state,Core.Buildcraft.evaluate(state.units.filter(u=>u.side==='ally').map(u=>u.id),state.bondRevision||1)))effects.push({key:`engine-${row.key}`,name:row.name,type:'buff',detail:row.detail,duration:row.label});
    const linked = Core.skillLinkSources(state, unit);
    const equipment = Object.entries(unit.equipment || {}).filter(([,key]) => S.advancedGear[key] || Core.equipment[key]).map(([slot,key]) => {
      const data = Core.equipment[key], rule = S.gearPassives[key], count = unit.gearState?.counts[key] || 0, stacks = unit.gearState?.stacks[key] || 0;
      const attributes = Object.entries({hp:'生命',attack:'攻击',armor:'防护',speed:'速度',chargeEfficiency:'充能效率',initialEnergy:'初始能量',cooldownReduction:'冷却缩减'}).filter(([key])=>data[key]).map(([key,label])=>`${label} ${data[key]>0?'+':''}${data[key]}${key==='chargeEfficiency'?'%':''}`).join(' · ');
      return {key,name:data.name,attributes,detail:data.passive || '',state:`${Core.equipmentSlots[slot]}${rule?.stacks ? ` · ${stacks}${rule.unlimited ? ' 层 · 无上限' : `/${rule.stacks} 层`}` : count ? ` · 触发 ${count} 次` : ''}`};
    });
    for (const entry of relics) {
      const data = S.relics[entry.key]; if (!data) continue;
      if (data.care) {
        const treated = Object.entries(entry.memory.careRounds || {}).filter(([,round]) => round === state.round).map(([id]) => state.units.find(u => u.id === id)?.name).filter(Boolean);
        effects.push({key:`care-${entry.slot}`,name:data.name,type:'buff',detail:data.effect,duration:data.care.cleanse ? treated.length ? `本轮已精修：${treated.join('、')}` : '本轮精修待命' : '治疗加成已生效'});
      }
      if (data.convert || data.coupler) {
        const value = Core.relicConversion(unit), active = !data.coupler || value.linked;
        effects.push({key:`conversion-${entry.slot}`,name:data.name,type:'buff',
          detail:data.coupler ? active ? '转化产生的速度与攻击继续互相转化，已计入最终收敛值。' : '需同时佩戴名贵机械表和显卡。' : `${data.convert.to === 'attack' ? '攻击' : '速度'} +${data.convert.to === 'attack' ? value.convertedAttack : value.speed}`,
          duration:active ? '已生效' : '联动未激活'});
      }
      if (data.supreme?.damageReduction) effects.push({key:`supreme-${entry.slot}`,name:data.name,type:'buff',detail:'攻击 ×1.99（独立乘区）；受到伤害降低 99%。',duration:'佩戴期间'});
      equipment.push({key:entry.key,name:data.name,attributes:data.statsText,detail:data.effect,image:data.image,state:`藏品 ${entry.slot+1}${data.rule?.stacks ? ` · ${entry.memory.stacks}${data.rule.unlimited ? ' 层 · 无上限' : `/${data.rule.stacks} 层`}` : ''}${data.rule?.momentum ? ` · 动量 ${entry.memory.momentum}/100` : ''}`});
    }
    for (const source of linked) {
      const last = unit.skillLinkRounds?.[source.key];
      equipment.push({key:source.key,name:source.name,detail:`${S.skillFamilies[source.rule.tag].label}技能联动`,state:last === state.round ? '本轮联动已触发' : last !== undefined ? `上次触发于第 ${last} 轮` : '联动尚未触发'});
    }
    const skills = Core.actionOptions(state,id).map(a => ({id:a.id,name:a.name,detail:a.detail,kind:a.ultimate?'大招':a.id==='attack'?'普通攻击':'战术技能',state:a.ammo?`激素针 ${unit.supply.count}/${a.ammo.capacity}`:a.remaining?`冷却 ${a.remaining} 次${back?'支援':'行动'}`:a.ultimate?`充能 ${unit.energy}/100`:'就绪',note:back?'自动释放':a.reason||''}));
    for (const a of Core.relicActions(state).filter(a=>a.actor===id)) skills.push({id:a.key,name:a.name,detail:S.relics[a.key].effect,kind:'藏品主动',state:a.key==='ocean'?`${a.charges} 次 · 充能 ${a.progress}/3`:a.reason||'就绪',note:'手动释放 · 不占行动'});
    if (!skills.length) for (const skill of base.skills || []) skills.push({name:skill.name,detail:skill.detail,kind:'敌方技能',state:Core.intent(state,id).startsWith(skill.name)?'即将发动':'轮换技能',note:Core.intent(state,id).startsWith(skill.name)?Core.intent(state,id):''});
    if (!ally && base.portraitNote) skills.push({name:'影像档案',detail:base.portraitNote,kind:'情报',state:'待补全'});
    const passive = Core.rearPassives[id];
    if (passive) skills.push({id:'rearPassive',name:passive.name,detail:passive.detail,kind:'后排被动',state:!back?'前排未激活':unit.hp<=0?'已倒地':unit.stun||unit.supportBlockedRound===state.round?'支援中断':'已激活'});
    const bossGear = Object.values(unit.equipment || {}).reduce((sum,key) => sum + (S.gearPassives[key]?.kind === 'bossDamage' ? S.gearPassives[key].value : 0),0);
    const conditional = [];
    if (state.timeline && !Core.offAxis(unit)) conditional.push(`当前速度行动间隔：${(10000/Core.initiativeSpeed(unit)).toFixed(1)} 行动值；全局每100行动值为一周期`);
    if (ally) conditional.push('爆炸直接命中：护盾、掩体削减 ×2，击破后碎甲；额外削盾量不转为生命伤害');
    if (ally && !back && state.units.some(u => u.id === 'vyron' && u.hp > 0)) conditional.push(`震荡集火：直接攻击被击倒敌人，伤害 ×${(1+Core.knockdownBonus(state)).toFixed(2)}`);
    if (back && id === 'nitro') conditional.push('对有低温或冷罐的目标：额外伤害 ×1.20');
    if (back && id === 'nameless') conditional.push('对流血目标：额外伤害 ×1.20');
    if (back && id === 'gizmo') conditional.push('对被减速、干扰或击倒目标：额外伤害 ×1.25');
    if (bossGear || links?.bossDamage) conditional.push(`对首领：额外伤害 ×${((1+bossGear)*(1+(links?.bossDamage||0)/100)).toFixed(2)}`);
    return {id,name:unit.name,portrait:unit.portrait,role:unit.role,position:ally?back?'后排 · 自动支援':'前排 · 作战':'敌方',hp:unit.hp,maxHp:unit.maxHp,energy:unit.energy,stars:unit.stars||1,stats,effects,equipment,skills,conditional,stacks:stacks(unit),
      damageMultiplier:totalDamage,attackMultiplier:Core.relicConversion(unit).attackMultiplier,damageReduction:1-(1-Core.relicDamageReduction(unit))*(rescue ? .6 : 1),critRate:ally?Math.min(100,(links?.critRate||0)+supreme.critRate+(unit.critRate||0)):0,critDamage:ally?100+(links?.critDamage??50)+supreme.critDamage+(unit.critDamage||0):150,
      chargeEfficiency:100+Math.min(100,Math.max(0,unit.chargeEfficiency||0)),cooldownReduction:unit.cooldownReduction||0,supply:unit.supply,
      damage:unit.damage,healing:unit.healing,bonuses:ally?bonuses:[]};
  }
  const api={read,statuses,stacks}; if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HaffCombatReport=api;
})(typeof window==='undefined'?globalThis:window);
