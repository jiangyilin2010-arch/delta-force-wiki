(function (root) {
  'use strict';
  const Formation = typeof module !== 'undefined' && module.exports ? require('./haff-formation-rules.js') : root.HaffFormation;
  const Timeline = typeof module !== 'undefined' && module.exports ? require('./haff-timeline.js') : root.HaffTimeline;
  const families = {
    tempoRelay: { names: ['交替掩进', '交替掩进·疾行', '交替掩进·闪击'], trigger: 'regular', slots: [1, 2, 3], caps: [1, 2, 3], icon: 'route' },
    tempoKill: { names: ['突破接力', '突破接力·追猎', '突破接力·清场'], trigger: 'kill', slots: [2, 4, 99], caps: [1, 2, 3], icon: 'crosshair' },
    tempoUltimate: { names: ['同步突入', '同步突入·双核', '同步突入·总攻'], trigger: 'ultimate', slots: [99, 99, 99], targets: [1, 2, 4], caps: [1, 1, 2], icon: 'users' }
  };
  const scope = '提前其他存活前排的下一次行动；不打断已就绪的行动，不产生额外回合。行动值轴上缩短剩余等待，每100行动值重置周期次数；旧对局仅调整本轮队列。无可提前目标不消耗次数。';
  const gearTempo = {
    runnerBison: { name: '掩进火力', trigger: 'attack', slots: 1, cap: 2, text: '整次普攻后，攻击最高的其他待行动前排提前 1 位，每轮最多 2 次。' },
    quickStockBison: { name: '突破信号', trigger: 'kill', slots: 99, cap: 1, text: '主动击杀后，让攻击最高的其他待行动前排优先行动，每轮一次。' },
    mobileVest: { name: '受击机动', trigger: 'hurt', self: true, slots: 2, cap: 1, text: '受到生命伤害后，自身若为待行动前排则提前 2 位，每轮一次。' },
    relayVest: { name: '掩护接棒', trigger: 'hurt', slots: 1, cap: 1, text: '受到生命伤害后，攻击最高的其他待行动前排提前 1 位，每轮一次。' },
    scoutHelmet: { name: '先敌调度', trigger: 'regular', slots: 2, cap: 1, text: '常规行动后，攻击最高的其他待行动前排提前 2 位，每轮一次。' },
    linkHelmet: { name: '同步进攻', trigger: 'ultimate', slots: 99, cap: 1, text: '大招后，让攻击最高的其他待行动前排优先行动，每轮一次。' }
  };
  function installGear(catalogue) {
    for (const [key, rule] of Object.entries(gearTempo)) catalogue[key].passive = `${catalogue[key].passive || ''} ${rule.name}：${rule.text}${scope}`.trim();
  }
  function install(add, doctrines) {
    for (const [family, data] of Object.entries(families)) for (const [i, quality] of ['purple', 'gold', 'red'].entries()) {
      const count = data.targets?.[i] || 1, slots = data.slots[i], cap = data.caps[i];
      const trigger = { regular: '队友常规行动结束后', kill: '队友的普攻、技能或大招造成击杀后（同一次行动多杀只触发一次）', ultimate: '队友施放大招后' }[data.trigger];
      const target = count === 4 ? '所有待行动前排按原顺序' : `攻击最高的 ${count} 名待行动前排`;
      add(family, quality, data.names[i], `${trigger}，${target}${slots === 99 ? '提前至待行动队列最前方' : `提前 ${slots} 个行动位`}。全队每轮最多 ${cap} 次。${scope}${data.trigger === 'regular' ? '常规行动含后排到轴技能与驻守支援；连射整次只触发一次，不含免费翻滚、协同或持续伤害。' : ''}`, {});
      Object.assign(doctrines[quality === 'purple' ? family : `${family}_${quality}`], { theme: '行动提前', icon: data.icon, tempo: { trigger: data.trigger, slots, count, cap } });
    }
  }
  function installRelics(relics, shortEffects) {
    // Adapted from https://wiki.biligame.com/sr/绝对热量 to this game's resolved-action clock.
    const additions = {
      watch: '「时间拨针」：治疗队友后，使受治疗者的下一次行动提前 2 个行动位，每周期最多成功触发一次。仅限其他存活前排。',
      milRadio: '「紧急呼号」：佩戴者大招后，攻击最高的其他待行动前排提前至待行动队列最前方，每轮一次。',
      caviar: '「绝对热量」：我方每次常规行动结束，为行动者回复佩戴者生命上限 20% 的基础生命，享受治疗加成与溢出转盾；佩戴者大招后固定回复 10 能量（蜂医补针进度 +20）。前后排均生效，连射整次只治疗一次，不含大招、免费翻滚、协同或持续伤害。'
    };
    const summaries = {
      watch: '治疗后使受治疗前排提前 2 位，每轮一次。',
      milRadio: '大招后让攻击最高的待行动前排优先行动，每轮一次。',
      caviar: '「绝对热量」：常规行动者获得佩戴者 20% 生命的基础治疗；佩戴者大招回能 10。'
    };
    for (const [key, text] of Object.entries(additions)) {
      relics[key].effect += text + '同一佩戴者的同名新增效果不叠加。';
      shortEffects[key] += summaries[key];
      if (key !== 'caviar') relics[key].effect += scope;
    }
  }
  function advance(state, target, slots, event, source, label, offset = 0, speed) {
    if (!target || target.hp <= 0 || target.side !== 'ally' || !Formation.frontSlot(target.slot) || target.id === state.prepared) return false;
    const from = state.queue.indexOf(target.id), floor = (state.prepared && state.queue[0] === state.prepared ? 1 : 0) + offset;
    const to = Math.max(floor, from - slots);
    if (from < 0 || to >= from) return false;
    if (state.timeline && !Timeline.advancePosition(state, target, to, speed)) return false;
    state.queue.splice(from, 1); state.queue.splice(to, 0, target.id);
    event.effects.push({ type: 'gear', source: source.id, target: target.id, value: from - to, label: `${label} · 行动提前 ${from - to} 位`, tempo: true });
    event.note = [event.note, `${label}：${target.name}提前 ${from - to} 位`].filter(Boolean).join(' · ');
    return true;
  }
  function afterAction({ state, actor, event, resolvedAction, support, heal, rechargeNeedle, entries, doctrines, initiativeSpeed }) {
    const allies = state.units.filter(u => u.side === 'ally' && u.hp > 0);
    const worn = new Map(allies.map(u => [u.id, new Set(entries(u).map(e => e.key))]));
    const owned = (state.tactics || (state.tactic ? [state.tactic] : [])).map(key => doctrines[key]).filter(t => t?.tempo);
    const equipped = allies.flatMap(unit => Object.values(unit.equipment || {}).filter(key => gearTempo[key]).map(key => ({ unit, key, rule: gearTempo[key] })));
    if (!owned.length && !equipped.length && ![...worn.values()].some(keys => ['watch', 'milRadio', 'caviar'].some(key => keys.has(key)))) return;
    if (!state.tempoState || state.tempoState.round !== state.round) state.tempoState = { round: state.round, counts: {} };
    const counts = state.tempoState.counts;
    const regular = actor.side === 'ally' && actor.hp > 0 && (resolvedAction && !event.freeAction && !event.ultimate && !support || support?.kind === 'round' && event.kind !== 'status');
    const ultimate = actor.side === 'ally' && actor.hp > 0 && resolvedAction && event.ultimate === true;
    const kill = actor.side === 'ally' && actor.hp > 0 && resolvedAction && (!event.freeAction || ultimate) && event.effects.some(e => e.type === 'down' && e.source === actor.id && state.units.some(u => u.id === e.target && u.side === 'enemy'));
    // Count resolved commands, never individual bullets or recursively generated healing.
    if (regular) for (const wearer of allies.filter(u => worn.get(u.id).has('caviar'))) heal(actor, wearer.maxHp * .2, wearer);
    if (ultimate && worn.get(actor.id)?.has('caviar')) {
      const before = actor.supply ? actor.supply.count * 200 + actor.supply.progress : actor.energy;
      if (actor.supply) rechargeNeedle(actor, 20); else actor.energy = Math.min(100, actor.energy + 10);
      const value = (actor.supply ? actor.supply.count * 200 + actor.supply.progress : actor.energy) - before;
      if (value) event.effects.push({ type: 'gear', source: actor.id, target: actor.id, value, label: '绝对热量 · 大招回能' });
    }
    const pending = source => state.queue.map(id => allies.find(u => u.id === id)).filter(u => u && u.id !== source.id && u.id !== state.prepared && Formation.frontSlot(u.slot));
    const strongest = source => pending(source).sort((a, b) => b.attack - a.attack || state.queue.indexOf(a.id) - state.queue.indexOf(b.id));
    function trigger(key, cap, targets, slots, source, label) {
      if ((counts[key] || 0) >= cap) return;
      let moved = false;
      // Keep multi-target order stable while bringing the whole selected group forward.
      for (const [i, target] of targets.entries()) moved = advance(state, target, slots, event, source, label, slots === 99 ? i : 0, initiativeSpeed) || moved;
      if (moved) counts[key] = (counts[key] || 0) + 1;
    }
    for (const tactic of owned) {
      const rule = tactic.tempo;
      if (!({ regular, ultimate, kill })[rule.trigger]) continue;
      const targets = rule.count === 4 ? pending(actor) : strongest(actor).slice(0, rule.count);
      trigger(`t:${tactic.family}`, rule.cap, targets, rule.slots, actor, tactic.name);
    }
    if (ultimate && worn.get(actor.id)?.has('milRadio')) trigger(`r:milRadio:${actor.id}`, 1, strongest(actor).slice(0, 1), 99, actor, '紧急呼号');
    for (const effect of event.effects.filter(e => e.type === 'heal' && e.value > 0)) {
      const source = allies.find(u => u.id === effect.source), target = allies.find(u => u.id === effect.target);
      if (source && target && source !== target && worn.get(source.id).has('watch')) trigger(`r:watch:${source.id}`, 1, [target], 2, source, '时间拨针');
    }
    for (const { unit, key, rule } of equipped) {
      const fired = rule.trigger === 'hurt'
        ? event.effects.some(e => e.type === 'damage' && e.target === unit.id && e.value > 0)
        : unit.id === actor.id && ({ regular, ultimate, kill, attack: regular && event.basicShots > 0 })[rule.trigger];
      if (fired) trigger(`g:${key}:${unit.id}`, rule.cap, rule.self ? [unit] : strongest(unit).slice(0, 1), rule.slots, unit, rule.name);
    }
  }
  function validateBattle(state, doctrines) {
    const memory = state.tempoState;
    if (memory === undefined) return true;
    if (!memory || !Number.isInteger(memory.round) || memory.round < 0 || memory.round > state.round || !memory.counts || typeof memory.counts !== 'object' || Array.isArray(memory.counts)) return false;
    const caps = Object.fromEntries((state.tactics || (state.tactic ? [state.tactic] : [])).map(key => doctrines[key]).filter(t => t?.tempo).map(t => [`t:${t.family}`, t.tempo.cap]));
    for (const unit of state.units.filter(u => u.side === 'ally')) for (const relic of ['watch', 'milRadio']) caps[`r:${relic}:${unit.id}`] = 1;
    for (const unit of state.units.filter(u => u.side === 'ally')) for (const key of Object.values(unit.equipment || {})) if (gearTempo[key]) caps[`g:${key}:${unit.id}`] = gearTempo[key].cap;
    return Object.entries(memory.counts).every(([key, value]) => Object.hasOwn(caps, key) && Number.isInteger(value) && value >= 0 && value <= caps[key]);
  }
  const api = { install, installRelics, installGear, afterAction, validateBattle };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HaffTempo = api;
})(typeof window === 'undefined' ? globalThis : window);
