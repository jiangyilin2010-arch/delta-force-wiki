(function (root) {
  "use strict";
  const qualities = {
    purple: { name: "紫色", hp: 8, attack: 4, speed: 0 },
    gold: { name: "金色", hp: 22, attack: 12, speed: 5 },
    red: { name: "红色", hp: 45, attack: 25, speed: 10 }
  };
  const families = {
    assault: { theme: "冲锋", icon: "crosshair" }, smoke: { theme: "烟幕", icon: "radio" },
    salvage: { theme: "回收", icon: "package" }, compound: { theme: "复利", icon: "coins" },
    refresh: { theme: "招募", icon: "refresh-cw" }, bounty: { theme: "赏金", icon: "crosshair" },
    fund: { theme: "投资", icon: "coins" }, charge: { theme: "充能", icon: "zap" },
    bulwark: { theme: "防护", icon: "shield" }, supply: { theme: "快递", icon: "package" },
    education: { theme: "扩编", icon: "graduation-cap" }, welfare: { theme: "津贴", icon: "hand-coins" },
    recon: { theme: "侦察追击", icon: "crosshair" }, demolition: { theme: "爆破", icon: "zap" },
    suppression: { theme: "控制复位", icon: "radio" }, maneuver: { theme: "机动", icon: "route" },
    formation: { theme: "持盾", icon: "shield" }, frost: { theme: "低温", icon: "zap" },
    affliction: { theme: "持续伤害", icon: "crosshair" }, rally: { theme: "振奋", icon: "users" }
  };
  const doctrines = {};
  function add(family, quality, name, effect, bonus, rules = {}) {
    const key = quality === "purple" ? family : `${family}_${quality}`;
    doctrines[key] = { name, effect, bonus, rules, quality, family, ...families[family] };
  }
  add("assault", "purple", "突破授权", "全队攻击 +10；每次战斗胜利额外获得 1 万哈夫币。", { attack: 10 }, { winCash: 10000 });
  add("assault", "gold", "血赚冲锋", "全队攻击 +20；每次战斗胜利额外获得 2 万哈夫币。", { attack: 20 }, { winCash: 20000 });
  add("assault", "red", "红温清场", "全队攻击 +36；胜利额外获得 4 万。每击杀一名敌人，全队回复 10 基础能量，蜂医补针进度 +20。", { attack: 36 }, { winCash: 40000, killEnergy: 10 });
  add("smoke", "purple", "烟幕接应", "全队生命 +30；每场开局获得 1 轮治疗烟。", { hp: 30 }, { smoke: 1 });
  add("smoke", "gold", "烟里有家", "全队生命 +60；每场开局获得 2 轮治疗烟。", { hp: 60 }, { smoke: 2 });
  add("smoke", "red", "无烟不成洲", "全队生命 +100；开局获得 3 轮治疗烟。每次常规行动后，自身恢复 18 生命。", { hp: 100 }, { smoke: 3, actionHeal: 18 });
  add("salvage", "purple", "战地回收", "全队防护 +4；装备和藏品出售价格 +30%，不影响干员。", { armor: 4 }, { sale: 1.3 });
  add("salvage", "gold", "拆迁总承包", "全队防护 +8；装备和藏品出售价格 +50%，不影响干员。", { armor: 8 }, { sale: 1.5 });
  add("salvage", "red", "阿萨拉清仓", "全队防护 +14；物品售价 +75%，不影响干员。每次胜利快递额外放入 1 件随机紫色藏品。", { armor: 14 }, { sale: 1.75, victoryParts: 1 });
  add("compound", "purple", "哈夫银行贵宾", "每满 10 万本金结算 1 万利息，每个节点利息上限 8 万。", {}, { interestStep: 100000, interestCap: 80000 });
  add("compound", "gold", "特勤处理财", "每满 8 万本金结算 1 万利息，每个节点利息上限 10 万；全队生命 +40。", { hp: 40 }, { interestStep: 80000, interestCap: 100000 });
  add("compound", "red", "哈夫央行", "每满 6 万本金结算 1 万利息，每个节点利息上限 12 万；全队生命 +90、防护 +6。", { hp: 90, armor: 6 }, { interestStep: 60000, interestCap: 120000 });
  add("refresh", "purple", "军需优先采购", "现在及每次进入新战斗节点，获得 2 次免费商店刷新；未用次数保留。", {}, { refreshes: 2 });
  add("refresh", "gold", "招募绿色通道", "现在及每次进入新战斗节点，获得 4 次免费刷新；全队攻击 +8。", { attack: 8 }, { refreshes: 4 });
  add("refresh", "red", "人才虹吸", "现在及每次进入新战斗节点，获得 6 次免费刷新；全队攻击 +18、生命 +60。", { attack: 18, hp: 60 }, { refreshes: 6 });
  add("bounty", "purple", "以战养战", "每击败一名敌人，结算时额外获得 8000 哈夫币，失败也计。", {}, { killCash: 8000 });
  add("bounty", "gold", "赏金承包", "每击败一名敌人，结算额外获得 1.6 万；全队生命 +50。", { hp: 50 }, { killCash: 16000 });
  add("bounty", "red", "全图悬赏", "每击败一名敌人，结算额外获得 3 万，全队回复 10 基础能量，蜂医补针进度 +20；全队攻击 +20。", { attack: 20 }, { killCash: 30000, killEnergy: 10 });
  add("fund", "purple", "物流长线持仓", "胜利获得结算前本金 4% 的分红，每场上限 3 万；失败无分红。", {}, { dividend: .04, dividendCap: 30000 });
  add("fund", "gold", "黄金现金流", "胜利获得本金 8% 的分红，每场上限 6 万；全队防护 +4。", { armor: 4 }, { dividend: .08, dividendCap: 60000 });
  add("fund", "red", "做大做强", "胜利获得本金 12% 的分红，每场上限 10 万；全队防护 +10、攻击 +12。", { armor: 10, attack: 12 }, { dividend: .12, dividendCap: 100000 });
  add("charge", "purple", "战术超充网络", "全队充能效率 +25%，适用于所有干员的战术资源恢复。", { chargeEfficiency: 25 });
  add("charge", "gold", "快充流水线", "全队充能效率 +50%、初始能量 +15；蜂医开局补针储备进度 +30。", { chargeEfficiency: 50, energy: 15 });
  add("charge", "red", "无限电池", "全队充能效率 +80%、初始能量 +40；蜂医开局储备 +80。大招后其他队员回复 12 基础能量，蜂医补针进度 +24，小队每轮限一次。", { chargeEfficiency: 80, energy: 40 }, { ultimateEnergy: 12 });
  add("bulwark", "purple", "重装入场", "全队生命 +60、防护 +4。", { hp: 60, armor: 4 });
  add("bulwark", "gold", "移动堡垒", "全队生命 +120、防护 +8；每场开局每人获得 40 个人护盾。", { hp: 120, armor: 8 }, { shield: 40 });
  add("bulwark", "red", "阿萨拉铁幕", "全队生命 +180、防护 +14；开局每人获得 80 护盾，常规行动后自身补充 12 护盾，上限为生命的 50%。", { hp: 180, armor: 14 }, { shield: 80, actionShield: 12 });
  add("supply", "purple", "特勤处加急件", "立即及每次进入新位面，追加 1 箱随机装备与哈夫币快递。", {}, { parcels: 1 });
  add("supply", "gold", "加急空投", "立即及每次进入新位面，追加 2 箱随机装备与哈夫币快递；全队生命 +40。", { hp: 40 }, { parcels: 2 });
  add("supply", "red", "全图物流承包", "立即及每次进入新位面追加 2 箱快递；每次胜利额外给 2 件随机紫色藏品；全队攻击 +16。", { attack: 16 }, { parcels: 2, victoryParts: 2 });
  add("education", "purple", "扩编绿色通道", "终端升级费用降低 20%；全队速度 +3。", { speed: 3 }, { upgradeDiscount: .2 });
  add("education", "gold", "特勤处保送", "终端升级费用降低 35%；全队速度 +6、生命 +40。", { speed: 6, hp: 40 }, { upgradeDiscount: .35 });
  add("education", "red", "六人特批", "终端升级费用降低 50%；全队速度 +12、生命 +90，仍需升级解锁人数。", { speed: 12, hp: 90 }, { upgradeDiscount: .5 });
  add("welfare", "purple", "外勤每日津贴", "每次进入新节点获得 1 万哈夫币；首个节点同样生效。", {}, { nodeCash: 10000 });
  add("welfare", "gold", "外勤双薪", "每次进入新节点获得 2 万哈夫币；全队生命 +50。", { hp: 50 }, { nodeCash: 20000 });
  add("welfare", "red", "特勤处发薪日", "每次进入新节点获得 3.5 万哈夫币；全队生命 +100；常规行动后自身恢复 12 生命。", { hp: 100 }, { nodeCash: 35000, actionHeal: 12 });

  // Cash tactics follow the tighter supply budget; combat bonuses and bank interest stay intact.
  const cashTuning = [
    ['assault', 'winCash', 5000, '1 万', '0.5 万'],
    ['assault_gold', 'winCash', 10000, '2 万', '1 万'],
    ['assault_red', 'winCash', 20000, '4 万', '2 万'],
    ['bounty', 'killCash', 4000, '8000', '4000'],
    ['bounty_gold', 'killCash', 8000, '1.6 万', '0.8 万'],
    ['bounty_red', 'killCash', 15000, '3 万', '1.5 万'],
    ['welfare', 'nodeCash', 5000, '1 万', '0.5 万'],
    ['welfare_gold', 'nodeCash', 10000, '2 万', '1 万'],
    ['welfare_red', 'nodeCash', 17500, '3.5 万', '1.75 万']
  ];
  for (const [key, field, value, before, after] of cashTuning) {
    doctrines[key].rules[field] = value;
    doctrines[key].effect = doctrines[key].effect.replace(before, after);
  }
  for (const [key, rate, cap, beforeRate, beforeCap] of [['fund', .02, 15000, '4%', '3 万'], ['fund_gold', .04, 30000, '8%', '6 万'], ['fund_red', .06, 50000, '12%', '10 万']]) {
    Object.assign(doctrines[key].rules, { dividend: rate, dividendCap: cap });
    doctrines[key].effect = doctrines[key].effect.replace(beforeRate, `${rate * 100}%`).replace(beforeCap, `${cap / 10000} 万`);
  }
  doctrines.supply_red.rules.victoryParts = 1;
  doctrines.supply_red.effect = doctrines.supply_red.effect.replace('额外给 2 件', '额外给 1 件');

  const linkedFamilies = [
    { family: "recon", tag: "recon", kind: "markedShot", values: [.4, .7, 1.1], names: ["报点就开枪", "透彻侦察", "全队开天眼"], effect: value => `侦察技能后，对一名已标记敌人追加 ${Math.round(value * 100)}% 攻击力射击。` },
    { family: "demolition", tag: "blast", kind: "splash", values: [.18, .32, .5], names: ["多带一份当量", "连锁爆破", "阿萨拉拆迁令"], effect: value => `爆破技能后，对所有存活敌人追加 ${Math.round(value * 100)}% 攻击力爆炸伤害。` },
    { family: "suppression", tag: "control", kind: "cooldown", values: [1, 2, 3], names: ["压制窗口", "控制接力", "别想还手"], effect: value => `控制技能后，施放者正在冷却的普通技能缩短 ${value} 次行动。` },
    { family: "maneuver", tag: "mobility", kind: "shield", values: [.1, .18, .28], names: ["跳拉有保险", "突进掩护", "落地就是堡垒"], effect: value => `机动技能后，施放者获得自身最大生命 ${Math.round(value * 100)}% 的护盾。` },
    { family: "formation", tag: "guard", kind: "teamShield", values: [.04, .08, .13], names: ["举盾成阵", "移动防线", "不动的撤离点"], effect: value => `防护技能后，前排各获得自身最大生命 ${Math.round(value * 100)}% 的护盾。` },
    { family: "frost", tag: "cold", kind: "cold", values: [1, 2, 3], names: ["低温试运行", "冷链扩容", "阿萨拉冷库"], effect: value => `低温技能后，为一名仍处于低温或冷却区的敌人追加 ${value} 层低温；冻结免疫期间无效。` },
    { family: "affliction", tag: "affliction", kind: "dotBurst", values: [.3, .6, 1], names: ["伤口别停", "多重创伤", "禁止自愈"], effect: value => `持续伤害技能后，对最多 3 名带燃烧、流血、电击、冷却区或铁丝网的敌人追加 ${Math.round(value * 100)}% 攻击力伤害，不消耗原效果。` },
    { family: "rally", tag: "rally", kind: "teamEnergy", values: [5, 10, 18], names: ["接力出击", "小队振奋", "全员再启动"], effect: value => `团队增益或救援技能后，其他存活队员各回复 ${value} 基础能量。` }
  ];
  const Systems = typeof module !== "undefined" && module.exports ? require("./haff-systems.js") : root.HaffSystems;
  for (const row of linkedFamilies) for (const [i, quality] of Object.keys(qualities).entries()) {
    const value = row.values[i], effect = `${row.effect(value)} 每名施放者每轮一次，不由普攻、协同或追加伤害触发。适配：${Systems.skillFamilies[row.tag].examples}。`;
    add(row.family, quality, row.names[i], effect, {});
    doctrines[quality === "purple" ? row.family : `${row.family}_${quality}`].link = { tag: row.tag, kind: row.kind, value };
  }

  const Mechanics = typeof module !== "undefined" && module.exports ? require("./haff-tactic-mechanics.js") : root.HaffTacticMechanics;
  Mechanics?.install(add, doctrines);
  const Roles = typeof module !== "undefined" && module.exports ? require("./haff-role-bonds.js") : root.HaffRoleBonds;
  Roles?.installTactics(add, doctrines);
  const Arsenal = typeof module !== 'undefined' && module.exports ? require('./haff-arsenal-tactics.js') : root.HaffArsenalTactics;
  Arsenal?.install(add,doctrines);
  const Tempo = typeof module !== 'undefined' && module.exports ? require('./haff-tempo.js') : root.HaffTempo;
  Tempo?.install(add, doctrines);
  const rules = key => doctrines[key]?.rules || {};
  const keys = run => run.tactics || (run.doctrine ? [run.doctrine] : []);
  const rank = quality => Object.keys(qualities).indexOf(quality);
  function replacement(owned, key) { return owned.find(id => doctrines[id].family === doctrines[key].family); }
  function canChoose(owned, key) {
    if (!doctrines[key]) return false;
    const old = replacement(owned, key);
    return !old || rank(doctrines[key].quality) > rank(doctrines[old].quality);
  }
  function project(owned, key) {
    const old = replacement(owned, key);
    return old ? owned.map(id => id === old ? key : id) : [...owned, key];
  }
  function combine(owned) {
    const result = {};
    for (const id of owned) for (const [key, value] of Object.entries(rules(id))) {
      if (["sale", "interestCap", "upgradeDiscount", "smoke"].includes(key)) result[key] = Math.max(result[key] || 0, value);
      else if (key === "interestStep") result[key] = Math.min(result[key] || Infinity, value);
      else result[key] = (result[key] || 0) + value;
    }
    return result;
  }
  function threat(entries) {
    const result = { hp: 0, attack: 0, speed: 0 };
    for (const entry of entries.filter(Boolean)) {
      const tier = qualities[entry.quality || "purple"];
      for (const key of Object.keys(result)) result[key] += tier[key];
    }
    return result;
  }
  function riskText(value) {
    return `敌方生命 +${value.hp}%、攻击 +${value.attack}%${value.speed ? `、速度 +${value.speed}%` : ""}`;
  }
  function describe(data) { return `${data.effect}\n代价：${riskText(threat([data]))}。与其他战术加算，再与节点、行动难度及挑战加成相乘。`; }
  function initialize(battle, selected, initGearState) {
    const owned = Array.isArray(selected) ? selected : selected ? [selected] : [];
    battle.tactics = [...owned]; battle.tactic = owned[0] || null; battle.tacticState = { ultimateRound: -1 };
    Mechanics?.initialize(battle);
    const effect = combine(owned);
    if (effect.smoke) { battle.smoke.ally = effect.smoke; battle.dyed.ally = true; }
    for (const unit of battle.units.filter(u => u.side === "ally")) {
      if (effect.shield) initGearState(unit).shield = Math.min(Math.floor(unit.maxHp * .5), effect.shield);
      if (unit.supply) unit.needlePrimer = Math.min(200, (unit.needlePrimer || 0) + owned.reduce((sum, key) => sum + (doctrines[key]?.bonus.energy || 0), 0) * 2);
    }
  }
  function afterAction({ state, actor, event, resolvedAction, support, heal, gainEnergy, rechargeNeedle, initGearState, hit, primaryEffects }) {
    const effect = combine(state.tactics || (state.tactic ? [state.tactic] : []));
    if (!state.tacticState) return;
    const allies = state.units.filter(u => u.side === "ally" && u.hp > 0);
    const regular = actor.side === "ally" && actor.hp > 0 && (resolvedAction && !event.freeAction && !support || support?.kind === "round" && event.kind !== "status");
    const label = text => { event.note = [event.note, text].filter(Boolean).join(" · "); };
    function energy(unit, amount) {
      const before = unit.supply ? unit.supply.count * 200 + unit.supply.progress : unit.energy;
      if (unit.supply) rechargeNeedle(unit, amount * 2); else gainEnergy(unit, amount);
      const after = unit.supply ? unit.supply.count * 200 + unit.supply.progress : unit.energy;
      if (after > before) event.effects.push({ type: "gear", target: unit.id, value: after - before, label: "战术回能" });
    }
    if (regular && effect.actionHeal && heal(actor, effect.actionHeal, actor)) label("战术自愈");
    if (regular && effect.actionShield) {
      const memory = initGearState(actor), value = Math.max(0, Math.min(effect.actionShield, Math.floor(actor.maxHp * .5) - memory.shield));
      if (value) { memory.shield += value; event.effects.push({ type: "gear", target: actor.id, value, label: "铁幕再生" }); }
    }
    Mechanics?.afterAction({ state, actor, event, resolvedAction, support, hit, primaryEffects });
    const kills = event.effects.filter(e => e.type === "down" && state.units.some(u => u.id === e.source && u.side === "ally") && state.units.some(u => u.id === e.target && u.side === "enemy")).length;
    if (kills && effect.killEnergy) { for (const ally of allies) energy(ally, kills * effect.killEnergy); label("击杀战术回能"); }
    if (resolvedAction && actor.side === "ally" && event.freeAction && event.ultimate !== false && effect.ultimateEnergy && state.tacticState.ultimateRound !== state.round) {
      state.tacticState.ultimateRound = state.round;
      for (const ally of allies.filter(u => u.id !== actor.id)) energy(ally, effect.ultimateEnergy);
      label("无限电池 · 大招接力");
    }
  }
  const api = { doctrines, qualities, rules, keys, replacement, canChoose, project, combine, threat, riskText, describe, initialize, afterAction, Mechanics, Tempo };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.HaffTactics = api;
})(typeof window === "undefined" ? globalThis : window);
