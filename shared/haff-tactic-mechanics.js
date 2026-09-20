/* Stateful tactic contracts: campaign rewards and combat reactions share existing transactions. */
(function (root) {
  'use strict';
  const tiers = ['purple', 'gold', 'red'];
  const specs = {
    execution: { theme: '残血斩杀', icon: 'crosshair', names: ['终结指令', '终结指令 · 精确处决', '终结指令 · 死亡判线'] },
    longline: { theme: '长线招募', icon: 'refresh-cw', names: ['长线利好', '长线利好 · 优先席位', '长线利好 · 永久合约'] },
    crossfire: { theme: '集火连携', icon: 'crosshair', names: ['交叉火网', '交叉火网 · 弱点锁定', '交叉火网 · 穿透清场'] },
    bombardment: { theme: '大招轰炸', icon: 'zap', names: ['火力呼叫', '火力呼叫 · 联合打击', '火力呼叫 · 天基审判'] },
    relicHunt: { theme: '击杀寻宝', icon: 'package', names: ['战利品猎手', '战利品猎手 · 定向回收', '战利品猎手 · 黄金悬赏'] },
    relicForge: { theme: '藏品合成', icon: 'package', names: ['藏品再生产', '藏品再生产 · 精密工坊', '藏品再生产 · 黄金流水线'] }
  };
  const owned = run => run.tactics || (run.doctrine ? [run.doctrine] : []);
  const familyOf = key => Object.keys(specs).find(family => key === family || tiers.slice(1).some(tier => key === `${family}_${tier}`));
  function tier(run, family) {
    const key = owned(run).find(key => familyOf(key) === family);
    return key ? key.endsWith('_red') ? 2 : key.endsWith('_gold') ? 1 : 0 : -1;
  }
  const price = level => [7000, 5000, 3000][level];
  const rebate = level => [20000, 40000, 60000][level];
  const huntGoal = level => level === 0 ? 6 : 4;
  const forgeGoal = level => level === 0 ? 3 : 2;
  function install(add, doctrines) {
    for (const [family, spec] of Object.entries(specs)) for (const [i, quality] of tiers.entries()) {
      const effect = {
        execution: `干员主动命中后，若该敌人剩余生命不高于 ${[10,15,20][i]}%，立即斩杀，忽略剩余护盾、掩体和防护；首领同样适用。仅检查本次主动命中的目标，不由持续伤害或被动追击独立触发。`,
        longline: `签订后累计付费刷新招募商店 8 次，返还 ${rebate(i) / 10000} 万哈夫币；本局后续每次付费刷新只需 ${price(i) / 10000} 万。免费刷新不计进度，升级保留进度且返现只补差额。${i === 2 ? '解锁后每付费刷新 5 次，额外获得 1 件随机紫色藏品。' : ''}`,
        crossfire: `同一轮中，两名不同干员主动攻击同一敌人后，由第二人追加 ${[120, 200, 280][i]}% 攻击力射击；每个敌人每轮触发一次，多段攻击只记一人，后台主动支援也计入。${i >= 1 ? '触发时标记目标 2 次行动。' : ''}${i === 2 ? '同时对其余敌人追加 100% 攻击力爆炸伤害。' : ''}`,
        bombardment: `小队每施放 ${i === 0 ? 3 : 2} 次大招，呼叫一次全场轰炸，造成存活队员最高攻击力 ${[200, 240, 300][i]}% 的爆炸伤害；治疗型大招和后台大招也计数。${i === 2 ? '轰炸后再以 400% 攻击力精确打击剩余生命最低的敌人。' : ''}蓄能跨轮及同场增援保留，每场重置。`,
        relicHunt: `签订后每累计击败 ${huntGoal(i)} 名敌人，结算快递追加 1 件随机紫色藏品；进度跨战斗、位面保留，败退已击杀的敌人也计入，主动放弃不计。${i === 2 ? '每第 3 件奖励升级为随机金色藏品。' : ''}`,
        relicForge: `签订后每完成 ${forgeGoal(i)} 次藏品合成，额外获得 1 件随机${i === 2 ? '金' : '紫'}色藏品，直接入库。紫合金、金合红均计数；赠品不算合成，升级保留进度。`
      }[family];
      add(family, quality, spec.names[i], effect, {});
      Object.assign(doctrines[i ? `${family}_${quality}` : family], { ...spec, name: spec.names[i], mechanic: family });
    }
  }
  function memory(run, family) {
    const progress = run.tacticProgress ||= {};
    return progress[family] ||= family === 'longline' ? { paid: 0, rebate: 0, discounted: 0 } : { count: 0, rewards: 0 };
  }
  function unlock(run, level, grant) {
    const m = memory(run, 'longline');
    if (m.paid >= 8 && m.rebate < rebate(level)) { grant.cash(rebate(level) - m.rebate); m.rebate = rebate(level); }
  }
  function adopt(run, key, grant) {
    const family = familyOf(key), level = tier(run, family);
    if (family === 'longline') unlock(run, level, grant);
    if (['relicHunt', 'relicForge'].includes(family)) { memory(run, family); milestone(run, family, 0, grant); }
  }
  function refreshPrice(run) {
    const level = tier(run, 'longline');
    return level >= 0 && run.tacticProgress?.longline?.paid >= 8 ? price(level) : 10000;
  }
  function refreshed(run, paid, grant) {
    const level = tier(run, 'longline'); if (!paid || level < 0) return;
    const m = memory(run, 'longline'), discounted = m.paid >= 8;
    m.paid++; unlock(run, level, grant);
    // Only discounted refreshes performed with the red contract count toward its relic reward.
    if (discounted && level === 2 && ++m.discounted % 5 === 0) grant.relic('purple', '长线利好 · 合约藏品');
  }
  function milestone(run, family, count, grant) {
    const level = tier(run, family); if (level < 0 || count < 0) return;
    const m = memory(run, family), goal = family === 'relicHunt' ? huntGoal(level) : forgeGoal(level);
    m.count += count;
    while (m.count >= goal) {
      m.count -= goal; m.rewards++;
      const gold = level === 2 && (family === 'relicForge' || m.rewards % 3 === 0);
      grant.relic(gold ? 'gold' : 'purple', `${specs[family].names[level]} · 第 ${m.rewards} 件`);
    }
  }
  function progress(run, key) {
    const family = familyOf(key); if (!family) return '';
    const level = key.endsWith('_red') ? 2 : key.endsWith('_gold') ? 1 : 0;
    const m = run.tacticProgress?.[family];
    if (family === 'execution') return `斩杀线 ${[10,15,20][level]}% · 先命中，再检查剩余生命`;
    if (family === 'longline') return m?.paid >= 8 ? `合约已解锁 · 刷新 ${price(level) / 10000} 万${level === 2 ? ` · 藏品 ${m.discounted % 5}/5 次` : ''}` : `付费刷新 ${m?.paid || 0}/8 次 · 还需 ${(8 - (m?.paid || 0))} 万刷新投入`;
    if (family === 'relicHunt') return `回收进度 ${m?.count || 0}/${huntGoal(level)} 击杀 · 已获 ${m?.rewards || 0} 件藏品`;
    if (family === 'relicForge') return `工坊进度 ${m?.count || 0}/${forgeGoal(level)} 次合成 · 已获 ${m?.rewards || 0} 件藏品`;
    if (family === 'crossfire') return `打法：至少两名干员在同一轮主动集火；当前上阵 ${run.deployed?.length || 0} 人`;
    return '打法：多带充能装备；治疗与后台大招也能呼叫火力';
  }
  const object = v => v && typeof v === 'object' && !Array.isArray(v);
  const integer = (v, min = 0, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(v) && v >= min && v <= max;
  function validateProgress(run) {
    if (run.tacticProgress === undefined) return !owned(run).some(key => ['longline', 'relicHunt', 'relicForge'].includes(familyOf(key)));
    const p = run.tacticProgress;
    return object(p) && ['longline', 'relicHunt', 'relicForge'].every(family => tier(run, family) < 0 || object(p[family])) && Object.entries(p).every(([family, m]) => {
      const level = tier(run, family); if (level < 0 || !object(m)) return false;
      if (family === 'longline') return integer(m.paid) && integer(m.discounted, 0, Math.max(0, m.paid - 8)) && m.rebate === (m.paid >= 8 ? rebate(level) : 0);
      return ['relicHunt', 'relicForge'].includes(family) && integer(m.count, 0, (family === 'relicHunt' ? huntGoal(level) : forgeGoal(level)) - 1) && integer(m.rewards);
    });
  }
  function initialize(state) {
    if (['crossfire','bombardment','execution'].some(f=>tier(state,f)>=0)) state.tacticMechanics = { round: -1, targets: {}, triggered: [], ults: 0, ledger: {} };
  }
  function afterAction({ state, actor, event, resolvedAction, hit, support, primaryEffects = event.effects }) {
    const m = state.tacticMechanics;
    if (!m || !resolvedAction || actor.side !== 'ally' || actor.hp <= 0 || support && !['round', 'ultimate'].includes(support.kind)) return;
    const enemies = () => state.units.filter(u => u.side === 'enemy' && u.hp > 0 && (!state.waves || u.wave === state.waves.index));
    const primaryHits = new Set(primaryEffects.filter(e => ['damage', 'block', 'shieldBlock'].includes(e.type) && e.value > 0 && !e.tactic && !e.bond && !e.c4).map(e => e.target));
    const strike = (family, source, target, amount, explosive, execution = false) => {
      if (!target || target.hp <= 0) return;
      const before = event.effects.length;
      if (execution) hit(target, amount, true, source, false, true); else hit(target, amount, explosive, source);
      const damageEffects = event.effects.slice(before).filter(effect=>effect.type==='damage'&&!effect.c4);
      for (const effect of damageEffects) { effect.tactic = family; effect.source = source.id; }
      const ledger = m.ledger[family] ||= { damage: 0, triggers: 0 };
      ledger.damage += damageEffects.reduce((sum,effect)=>sum+effect.value,0);
      event.targets = [...new Set([...event.targets, target.id])];
    };
    const proc = (family, source, targets) => {
      (m.ledger[family] ||= { damage: 0, triggers: 0 }).triggers++;
      (event.tacticBursts ||= []).push({ family, source: source.id, targets: targets.map(u => u.id), label: specs[family].names[tier(state, family)] });
      event.note = [event.note, specs[family].names[tier(state, family)]].filter(Boolean).join(' · ');
    };
    if (m.round !== state.round) { m.round = state.round; m.targets = {}; m.triggered = []; }
    const cross = tier(state, 'crossfire');
    if (cross >= 0) for (const target of enemies().filter(u => primaryHits.has(u.id))) {
      if (m.triggered.includes(target.id)) continue;
      const contributors = m.targets[target.id] ||= [];
      if (!contributors.includes(actor.id)) contributors.push(actor.id);
      if (contributors.length < 2) continue;
      m.triggered.push(target.id);
      if (cross >= 1) { target.marked = Math.max(target.marked || 0, 2); event.effects.push({ type: 'marked', target: target.id, value: 2 }); }
      const victims = [target]; strike('crossfire', actor, target, actor.attack * [1.2, 2, 2.8][cross], false);
      if (cross === 2) for (const other of enemies().filter(u => u.id !== target.id)) { victims.push(other); strike('crossfire', actor, other, actor.attack, true); }
      proc('crossfire', actor, victims);
    }
    const execute = tier(state, 'execution');
    if (execute >= 0) for (const target of enemies().filter(u=>primaryHits.has(u.id)&&u.hp*100<=u.maxHp*[10,15,20][execute])) {
      strike('execution',actor,target,target.hp,true,true);proc('execution',actor,[target]);
    }
    const bombing = tier(state, 'bombardment');
    if (bombing >= 0 && event.freeAction && event.ultimate !== false) {
      m.ults++;
      if (m.ults >= (bombing === 0 ? 3 : 2)) {
        m.ults = 0;
        const source = state.units.filter(u => u.side === 'ally' && u.hp > 0).sort((a, b) => b.attack - a.attack || a.slot - b.slot)[0], victims = enemies();
        if (victims.length) {
          for (const enemy of victims) strike('bombardment', source, enemy, source.attack * [2, 2.4, 3][bombing], true);
          if (bombing === 2) strike('bombardment', source, enemies().sort((a, b) => a.hp - b.hp || a.slot - b.slot)[0], source.attack * 4, true);
          proc('bombardment', source, victims);
        }
      }
    }
  }
  function validateBattle(state) {
    const m = state.tacticMechanics, cross = tier(state, 'crossfire'), bombing = tier(state, 'bombardment');
    if (cross < 0 && bombing < 0 && tier(state,'execution')<0) return m === undefined;
    if (!object(m) || !integer(m.round, -1, state.round) || !integer(m.ults, 0, bombing === 0 ? 2 : bombing > 0 ? 1 : 0)) return false;
    const allies = state.units.filter(u => u.side === 'ally').map(u => u.id), enemies = state.units.filter(u => u.side === 'enemy').map(u => u.id);
    return object(m.targets) && Object.entries(m.targets).every(([id, ids]) => cross >= 0 && enemies.includes(id) && Array.isArray(ids) && ids.length <= 2 && new Set(ids).size === ids.length && ids.every(id => allies.includes(id)))
      && Array.isArray(m.triggered) && new Set(m.triggered).size === m.triggered.length && m.triggered.every(id => m.targets[id]?.length === 2)
      && object(m.ledger) && Object.entries(m.ledger).every(([key, row]) => ['crossfire', 'bombardment','execution'].includes(key) && tier(state, key) >= 0 && object(row) && integer(row.damage) && integer(row.triggers, 0, (state.actions + 1) * enemies.length))
      && Object.values(m.ledger).reduce((sum, row) => sum + row.damage, 0) <= state.units.filter(u => u.side === 'ally').reduce((sum, u) => sum + u.damage, 0);
  }
  function status(state) {
    const m = state.tacticMechanics; if (!m) return [];
    return ['crossfire', 'bombardment','execution'].filter(f => tier(state, f) >= 0).map(family => {
      const level = tier(state, family), current = family === 'bombardment' ? m.ults : m.round === state.round ? Object.entries(m.targets).filter(([id, ids]) => ids.length === 1 && state.units.some(u => u.id === id && u.hp > 0)).length : 0;
      return { family, name: specs[family].names[level], current, max: family === 'bombardment' ? level === 0 ? 3 : 2 : 1, counter: family === 'execution' ? `≤${[10,15,20][level]}%` : family === 'bombardment' ? `${current}/${level === 0 ? 3 : 2}` : `${current} 待集火`, damage: m.ledger[family]?.damage || 0, triggers: m.ledger[family]?.triggers || 0 };
    });
  }
  const api = { install, specs, familyOf, tier, adopt, refreshPrice, refreshed, milestone, progress, validateProgress, initialize, afterAction, validateBattle, status };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HaffTacticMechanics = api;
})(typeof window === 'undefined' ? globalThis : window);
