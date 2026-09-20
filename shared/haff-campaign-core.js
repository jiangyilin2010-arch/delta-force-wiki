(function (root) {
  "use strict";
  const Core = typeof module !== "undefined" && module.exports ? require("./haff-war-core.js") : root.HaffWar;
  const operators = Core.operatorIds;
  const Formation = Core.Formation;
  const Cards = typeof module !== 'undefined' && module.exports ? require('./haff-operator-cards.js') : root.HaffOperatorCards;
  const FieldTools = typeof module !== 'undefined' && module.exports ? require('./haff-field-tools.js') : root.HaffFieldTools;
  const CareerRanks = typeof module !== "undefined" && module.exports ? require("./haff-career-ranks.js") : root.HaffCareerRanks;
  const RankHazards = typeof module !== "undefined" && module.exports ? require("./haff-rank-hazards.js") : root.HaffRankHazards;
  const Links = typeof module !== "undefined" && module.exports ? require("./haff-link-tree.js") : root.HaffLinkTree;
  const Systems = typeof module !== "undefined" && module.exports ? require("./haff-systems.js") : root.HaffSystems;
  const relics = Systems.relics;
  const economy = Systems.economy;
  const BranchMarket = typeof module !== 'undefined' && module.exports ? require('./haff-branch-market.js') : root.HaffBranchMarket;
  const routeChoices = run => BranchMarket?.choices(run, Systems.nodes) || Systems.nodes[run.node].next;
  function planeFlow(run) {
    const plane = Systems.nodes[run.node].plane;
    return Systems.nodes.flatMap((node, index) => {
      if (node.plane !== plane || (node.openingReward && !run.openingFlow) || (run.openingFlow && index === 0)) return [];
      return [{ index, node, depth: node.depth + (run.openingFlow && plane === 0 && !node.openingReward ? 1 : 0) }];
    });
  }
  const RelicSlots = typeof module !== "undefined" && module.exports ? require("./haff-relic-slots.js") : root.HaffRelicSlots;
  const Tactics = typeof module !== "undefined" && module.exports ? require("./haff-tactics.js") : root.HaffTactics;
  const doctrines = Tactics.doctrines;
  const tacticRules = run => Tactics.combine(Tactics.keys(run));
  const activeTactics = run => [...Tactics.keys(run).map(key => ({ ...doctrines[key], key, effect: [doctrines[key].effect, tacticProgress(run, key)].filter(Boolean).join('\n') })), ...run.protocols.map(key => ({ ...investments[key], key: `legacy-${key}` }))];
  const tacticThreat = run => Tactics.threat(activeTactics(run));
  function tacticChoice(run, key) {
    const owned = Tactics.keys(run), previous = Tactics.replacement(owned, key), before = tacticThreat(run);
    const after = Tactics.threat([...Tactics.project(owned, key).map(id => doctrines[id]), ...run.protocols.map(id => investments[id])]);
    return { previous: previous || null, after, extra: Object.fromEntries(Object.keys(before).map(stat => [stat, after[stat] - before[stat]])) };
  }
  const regularRelics = Object.keys(relics).filter(key => relics[key].quality === "purple");
  const modifiedWeapons = Object.keys(Systems.advancedGear).filter(key => Core.equipment[key].slot === "weapon");
  /** @type {import('./haff-events').EventBus} */
  const events = (typeof module !== "undefined" && module.exports ? require("./haff-events.js") : root.HaffEvents).bus;
  const { nodes, planes, challenges, components, recipes, relicRecipes, investments } = Systems;
  events.on("economy:settle", ({ receipt, principal, kills, won, protocols, doctrine, tactics }) => {
    const rules = Tactics.combine(tactics || (doctrine ? [doctrine] : []));
    const investmentsOnly = protocols;
    const bounty = (rules.killCash || 0) + (investmentsOnly.includes("bounty") ? 8000 : 0);
    const dividends = (won ? Math.min(rules.dividendCap || 0, Math.floor(principal * (rules.dividend || 0))) : 0) + (won && investmentsOnly.includes("fund") ? Math.min(30000, Math.floor(principal * .04)) : 0);
    receipt.investment = kills * bounty + dividends;
  });
  const clone = value => JSON.parse(JSON.stringify(value));
  function need(condition, message) { if (!condition) throw new Error(message); }
  function random(run) { run.rng = (Math.imul(run.rng, 1664525) + 1013904223) >>> 0; return run.rng / 4294967296; }
  function pick(run, values) { return values[Math.floor(random(run) * values.length)]; }
  function stage(run) { return nodes[run.node].plane; }
  function interest(run) { const rules = tacticRules(run); return Math.min(rules.interestCap || 50000, Math.floor(run.coins / (rules.interestStep || 100000)) * 10000); }
  function streakBonus(wins) { return Math.min(economy.streakCap, economy.streakThresholds.filter(threshold => wins >= threshold).length * economy.streakStep); }
  function capacity(run) { return Math.min(Formation.total, run.rank + 1); }
  const earlyUpgradePrices = Object.freeze({ 1: 30000, 2: 50000, 3: 80000, 4: 120000 });
  function upgradePrice(run) { return run.rank >= Formation.maxRank ? null : Math.round((earlyUpgradePrices[run.rank] ?? (run.rank * 40000 - 40000)) * (1 - (tacticRules(run).upgradeDiscount || 0))); }
  function relicCapacity(run) { return Math.min(3, run.rank + 1); }
  function star(copies) { return copies >= 9 ? 3 : copies >= 3 ? 2 : copies >= 1 ? 1 : 0; }
  function blankLoadout() { return { weapon: null, helmet: null, armor: null }; }
  function blankCombatStats() { return Object.fromEntries(operators.map(id => [id, { damage: 0, healing: 0, battles: 0 }])); }
  function itemInfo(item) { return item.kind === "gear" ? Core.equipment[item.key] : item.kind === "component" ? components[item.key] : relics[item.key]; }
  function itemSlot(item) { return item.kind === "relic" ? RelicSlots.slotOf(item) : item.kind === "gear" ? Core.equipment[item.key].slot : item.slot; }
  function addItem(run, kind, key) {
    const item = { uid: `item-${++run.serial}`, kind, key, owner: null };
    run.inventory.push(item); return item;
  }
  function tacticGrant(run, drops) {
    return {
      cash: amount => gain(run, amount),
      relic: (quality, source) => {
        const pool = Object.keys(relics).filter(key => relics[key].quality === quality && !relics[key].dropOnly);
        const item = addItem(run, 'relic', pick(run, pool));
        if (drops) drops.push({ ...item, source });
      }
    };
  }
  const refreshPrice = run => Tactics.Mechanics?.refreshPrice(run) ?? 10000;
  const tacticProgress = (run, key) => doctrines[key]?.toolMilestone || doctrines[key]?.toolReward ? (run.toolTacticClaims?.includes(key) ? '道具已领取 · 本局不重复发放' : doctrines[key].toolMilestone ? '等待拥有二星五费干员' : '') : Tactics.Mechanics?.progress(run, key) || '';
  function gearPrice(key) { return Systems.advancedGear[key] ? 40000 : { green: 20000, blue: 35000, purple: 65000, gold: 100000 }[Core.equipment[key].quality]; }
  function salePrice(run, item) {
    const value = item.kind === "gear" ? gearPrice(item.key) * (run.protocols?.includes("salvage") ? .7 : .5) : item.kind === "component" ? components[item.key].price * .5 : relics[item.key].sell;
    const normal = Math.round(value * (tacticRules(run).sale || 1));
    return item.marketPrice ? Math.min(normal, Math.floor(item.marketPrice * .5)) : normal;
  }
  function saleSelection(run, uids) {
    need(Array.isArray(uids) && uids.length > 0 && new Set(uids).size === uids.length, "请选择要出售的物品，同一件物品不可重复选择。");
    const inventory = new Map(run.inventory.map(item => [item.uid, item]));
    const items = uids.map(uid => {
      const item = inventory.get(uid);
      need(item && ["gear", "relic"].includes(item.kind), "所选物品已经不在库存中，请重新选择。");
      need(!item.owner, "所选物品已被穿戴，请先卸下再出售。");
      return item;
    });
    return { items, total: items.reduce((sum, item) => sum + salePrice(run, item), 0) };
  }
  const recruitRates = Object.freeze([
    Object.freeze({ 3: .82, 4: .18, 5: 0 }),
    Object.freeze({ 3: .75, 4: .25, 5: 0 }),
    Object.freeze({ 3: .65, 4: .28, 5: .07 }),
    Object.freeze({ 3: .60, 4: .30, 5: .10 }),
    Object.freeze({ 3: .55, 4: .32, 5: .13 }),
    Object.freeze({ 3: .50, 4: .35, 5: .15 }),
    Object.freeze({ 3: .45, 4: .37, 5: .18 }),
    Object.freeze({ 3: .40, 4: .38, 5: .22 })
  ]);
  const recruitCost = id => Core.units[id].cost * 10000;
  const recruitPrice = (run,id) => recruitCost(id) - (run.phase === 'market' ? 10000 : 0);
  const recruitPool = run => operators.filter(id => run.copies[id] < 9);
  function recruitChances(run, pool = recruitPool(run)) {
    const rates = recruitRates[run.rank - 1];
    const available = [...new Set(pool.map(id => Core.units[id].cost))];
    const total = available.reduce((sum, cost) => sum + rates[cost], 0);
    return Object.fromEntries([3, 4, 5].map(cost => [cost, total && available.includes(cost) ? rates[cost] / total : 0]));
  }
  function recruitDistribution(run, pool = recruitPool(run)) {
    const chances = recruitChances(run, pool);
    const weighted = pool.map(id => ({ id, cost: Core.units[id].cost, weight: Core.Buildcraft.Roles?.weight(run, id) || 1 }));
    // Role-focused tactics redistribute a tier's odds, never its overall rarity.
    return weighted.map(entry => ({ id: entry.id, probability: chances[entry.cost] * entry.weight / weighted.filter(other => other.cost === entry.cost).reduce((sum, other) => sum + other.weight, 0) }));
  }
  function pickRecruit(run, pool) {
    const choices = recruitDistribution(run, pool).filter(choice => choice.probability > 0);
    if (!choices.length) return null;
    let cursor = random(run);
    for (const choice of choices) { cursor -= choice.probability; if (cursor < 0) return choice.id; }
    return choices[choices.length - 1].id;
  }
  function operatorSalePrice(run, id, uid) { const card=uid?Cards.list(run).find(c=>c.id===id&&c.uid===uid):Cards.primary(run,id);return Math.round(recruitCost(id)*.7)*(card?Cards.weight(card.stars):0); }
  function rollShop(run) {
    const recruits = [];
    while (recruits.length < 5) {
      const pool = operators.filter(id => run.copies[id] + recruits.filter(key => key === id).length < 9);
      if (!pool.length) break;
      const recruit = pickRecruit(run, pool);
      if (!recruit) break;
      recruits.push(recruit);
    }
    run.shop = recruits.map(key => ({ uid: `offer-${++run.serial}`, kind: "recruit", key, price: recruitCost(key), sold: false }));
  }
  function repairEarlyShop(run) {
    if (run.rank >= 3) return;
    const valid = run.shop.filter(offer => offer.sold || Core.units[offer.key].cost < 5);
    for (const offer of run.shop.filter(offer => !offer.sold && Core.units[offer.key].cost === 5)) {
      const pool = operators.filter(id => run.copies[id] + valid.filter(other => !other.sold && other.key === id).length < 9);
      const key = pickRecruit(run, pool);
      if (key) { Object.assign(offer,{key,price:recruitCost(key)}); valid.push(offer); }
    }
    run.shop = run.shop.filter(offer => valid.includes(offer));
  }
  function drawTactical(run) {
    const pool = [...operators], offers = [];
    const gear = [
      ["mp5", "k416", "helmet4", "vest4"],
      ["k416", "m7", "tuned416", "stableM7", "rapidUzi", "helmet4", "vest4", "helmet5", "vest5"],
      [...modifiedWeapons, "m7", "helmet5", "vest5"]
    ][stage(run)];
    for (let i = 0; i < 5; i++) {
      const operator = pickRecruit(run, pool);
      pool.splice(pool.indexOf(operator), 1);
      offers.push({ uid: `draft-${++run.serial}`, operator, gear: pick(run, gear) });
    }
    run.tacticalDraft = { node: run.node, offers };
  }
  function drawTacticOffers(run) {
    const owned = Tactics.keys(run);
    const offers = Object.keys(Tactics.qualities).map(quality => pick(run, Object.keys(doctrines).filter(key => doctrines[key].quality === quality && Tactics.canChoose(owned, key))));
    // Each fresh draft has an offensive route; existing saved offers are never rerolled.
    const offensive = key => ['assault', 'recon', 'demolition', 'affliction', 'crossfire', 'bombardment'].includes(doctrines[key].family);
    if (!offers.some(offensive)) {
      const index = Math.floor(random(run) * offers.length), quality = doctrines[offers[index]].quality;
      const pool = Object.keys(doctrines).filter(key => doctrines[key].quality === quality && offensive(key) && Tactics.canChoose(owned, key));
      if (pool.length) offers[index] = pick(run, pool);
    }
    return offers;
  }
  function adoptTactic(run, key) {
    const owned = Tactics.keys(run), previous = Tactics.replacement(owned, key), oldRules = Tactics.rules(previous), rules = Tactics.rules(key);
    run.tactics = Tactics.project(owned, key);
    if (!run.doctrine || run.doctrine === previous) run.doctrine = key;
    run.freeRefreshes += Math.max(0, (rules.refreshes || 0) - (oldRules.refreshes || 0));
    for (let i = 0; i < (rules.parcels || 0) - (oldRules.parcels || 0); i++) addParcel(run);
    const cash = (rules.nodeCash || 0) - (oldRules.nodeCash || 0);
    if (cash > 0) gain(run, cash);
    Tactics.Mechanics?.adopt(run, key, tacticGrant(run));
    if (doctrines[key].recruitRole && !previous) run.freeRefreshes++;
  }
  function createRun({ seed = Date.now(), difficulty = "normal" } = {}) {
    need(["normal", "hard"].includes(difficulty), "行动配置无效。");
const run = { version: 13, tactics: [], tacticDraft: null, tacticClaimed: [], combatStats: blankCombatStats(), combatStatsPartial: false, challengeDraft: null, tacticalDraft: null, tacticalClaimed: [], fundingRevision: 2, id: `run-${seed}`, rng: Number(seed) >>> 0, serial: 0, node: 0, phase: "opening", openingChoices: [], parcels: [], lastParcel: null, interestNodes: [], freeRefreshes: 0, protocols: [], bloodNodes: [], visited: [0], clearedBosses: [], difficulty, doctrine: null, coins: 300000, integrity: 100, streak: 0, rank: 1, copies: Object.fromEntries(operators.map(id => [id, 0])), deployed: [], inventory: [], activeRelics: [], shop: [], locked: false, pending: [], reward: null, history: [], revenue: 0, spent: 0, kills: 0, outcome: null };
    run.openingFlow = 1; run.node = Systems.openingNodes[0]; run.visited = [run.node];
    run.coins = economy.startCoins; FieldTools.ensure(run);
    const captain = pickRecruit(run, operators); run.deployed = [captain];
    run.formationLayout = Formation.layout;
    run.recruitRevision = 1;
    run.rosterRevision = 2;
    run.craftingRevision = 1;
    run.openingChoices = drawTacticOffers(run);
    run.copies[captain] = 1;
    run.positions = Core.defaultPositions(run.deployed);
    addParcel(run, true);
    rollShop(run); Cards.ensure(run); return run;
  }
  function addParcel(run, starter = false) {
    const gear = starter ? [pick(run, ['bison', 'uzi', 'mp5']), 'vest2', 'helmet2'] : [random(run) < .4 ? rollWeapon(run) : rollArmor(run)];
    run.parcels.push({ uid: `parcel-${++run.serial}`, label: starter ? "入场快递" : "特勤处加急件", opened: false, coins: starter ? economy.starterCash : pick(run, economy.parcelCash), gear, parts: [], relics: [pick(run, regularRelics)] });
  }
  function rollArmor(run) {
    // Choose the slot first so the much larger armor catalogue cannot crowd out helmets.
    const slot = random(run) < .5 ? 'helmet' : 'armor';
    if (random(run) < economy.advancedArmorChance[stage(run)]) return pick(run, Object.keys(Systems.advancedGear).filter(key => Core.equipment[key].slot === slot));
    const pools = slot === 'helmet' ? [['helmet2', 'helmet2', 'helmet4'], ['helmet2', 'helmet4', 'helmet4'], ['helmet4', 'helmet4', 'helmet5']] : [['vest2', 'vest2', 'vest4'], ['vest2', 'vest4', 'vest4'], ['vest4', 'vest4', 'vest5']];
    return pick(run, pools[stage(run)]);
  }
  function retireComponents(run) {
    // Preserve an in-progress battle's stats until its existing checkpoint settles.
    if (run.phase === "combat") return;
    function convert(item, wearable = false) {
      if (item.kind !== "component") return;
      const owner = wearable && item.owner;
      item.key = Systems.legacyComponentRelics[item.key]; item.kind = "relic"; item.owner = null; delete item.slot;
      if (owner && RelicSlots.slots.some(slot => !run.inventory.some(other => other.owner === owner && other.kind === "relic" && itemSlot(other) === slot))) RelicSlots.equip(run.inventory, item, owner);
    }
    for (const item of run.inventory) convert(item, true);
    for (const item of run.pending || []) convert(item);
    for (const parcel of run.parcels) {
      if (parcel.parts.length) { parcel.relics = [...(parcel.relics || []), ...parcel.parts.map(key => Systems.legacyComponentRelics[key])]; parcel.parts = []; }
      for (const item of parcel.items || []) convert(item);
    }
    for (const item of run.lastParcel?.items || []) convert(item);
  }
  function rollWeapon(run) {
    if (random(run) < economy.advancedWeaponChance[stage(run)]) return pick(run, modifiedWeapons);
    return pick(run, [['bison', 'uzi', 'mp5', 'k416'], ['mp5', 'k416', 'k416', 'm7'], ['k416', 'k416', 'm7']][stage(run)]);
  }
  function relicRecipeFor(a, b) {
    if (a?.kind !== "relic" || b?.kind !== "relic" || a.uid === b.uid) return null;
    const id = [a.key, b.key].sort().join("+");
    return relicRecipes.find(recipe => recipe.id === id) || null;
  }
  function drawChallenge(run, exclude = []) {
    const pool = Object.keys(challenges).filter(key => !exclude.includes(key)), offers = [];
    for (let i = 0; i < 2; i++) offers.push(pool.splice(Math.floor(random(run) * pool.length), 1)[0]);
    run.challengeDraft = { node: run.node, offers, refreshes: exclude.length ? 0 : 1, selected: null };
  }
  function challengeReward(run, key = run.challengeDraft?.selected) {
    const data = challenges[key]; need(data, "挑战尚未选择。");
    const recipe = data.relic && relicRecipes.find(recipe => recipe.output === data.relic);
    const drops = data.relic ? recipe ? [...recipe.parts] : [data.relic] : [];
    const materials = [...data.parts.map(key => Systems.legacyComponentRelics[key]), ...drops];
    const rewards = materials.slice(-(data.level === '极危' ? 2 : 1));
    return { coins: Math.round(data.cash * economy.challengeCashFactor) + stage(run) * economy.challengePlaneCash, parts: [], relic: rewards.length === 1 ? rewards[0] : null, relics: rewards, loss: data.loss + stage(run) * 4 };
  }
  function packBattle(run, items, coins, receipt = null) {
    run.parcels.push({ uid: `parcel-${++run.serial}`, label: `${nodes[run.node].name} · 战后快递`, opened: false, coins, gear: [], parts: [], items: clone(items), receipt });
  }
  function loadouts(run) {
    const result = Object.fromEntries(operators.map(id => [id, blankLoadout()]));
    for (const item of run.inventory) if (item.kind === "gear" && item.owner) result[item.owner][Core.equipment[item.key].slot] = item.key;
    return result;
  }
  function positions(run) {
    const result = {}, used = new Set();
    for (const id of run.deployed) {
      const slot = run.positions?.[id];
      if (Formation.validSlot(slot) && !used.has(slot)) { result[id] = slot; used.add(slot); }
    }
    for (const id of run.deployed) if (result[id] === undefined) {
      const slot = (run.formationLayout === Formation.layout ? Formation.defaultOrder : [0, 3, 4, 1, 2, 5]).find(slot => !used.has(slot)); result[id] = slot; used.add(slot);
    }
    return result;
  }
  function place(run, id, slot, cardUid) {
    prepareOnly(run); need(operators.includes(id) && run.copies[id] > 0, "尚未招募该干员。");
    const current = positions(run), previous = current[id];
    Cards.ensure(run);
    if(cardUid)need(Cards.list(run).some(c=>c.uid===cardUid&&c.id===id),'该卡牌已合成或售出。');
    if (slot === null) {
      need(previous !== undefined && run.deployed.length > 1, "至少保留一名出战干员。");
      delete current[id];
    } else {
      need(Formation.validSlot(slot), "阵位无效。");
      const occupant = run.deployed.find(other => current[other] === slot);
      need(previous !== undefined || occupant || run.deployed.length < capacity(run), `上阵上限 ${capacity(run)} 人，请升级终端或换下一名干员。`);
      if (occupant && occupant !== id) {
        if (previous === undefined) delete current[occupant]; else current[occupant] = previous;
      }
      current[id] = slot;
    }
    need(Object.values(current).some(Formation.frontSlot), "至少保留一名前台作战干员，后台无法独自接战。");
    run.positions = current;
    run.deployed = Object.keys(current).sort((a, b) => current[a] - current[b]);
    Cards.syncField(run,id,slot===null?null:cardUid);
  }
  function synergies(run) {
    const roles = run.deployed.filter(id => run.copies[id]).map(id => Core.units[id].role);
    const rearRoles = run.deployed.filter(id => positions(run)[id] >= Formation.frontCount).map(id => Core.units[id].role);
    return [
      { name: "混编协同", active: new Set(roles).size >= 3, effect: "至少三种不同定位：全队生命 +40、攻击 +6", bonus: { hp: 40, attack: 6 } },
      { name: "双突击", active: roles.filter(role => role === "突击").length >= 2, effect: "两名突击干员：全队攻击 +10", bonus: { attack: 10 } },
      { name: "侦察网络", active: roles.filter(role => role === "侦察").length >= 2, effect: "两名侦察干员：全队速度 +8", bonus: { speed: 8 } },
      { name: "后台火力协调", active: rearRoles.includes("突击"), effect: "后台有突击干员：全队攻击 +4", bonus: { attack: 4 } },
      { name: "后台工程保障", active: rearRoles.includes("工程"), effect: "后台有工程干员：全队防护 +3", bonus: { armor: 3 } },
      { name: "后台医疗补给", active: rearRoles.includes("支援"), effect: "后台有支援干员：全队生命 +25", bonus: { hp: 25 } },
      { name: "后台情报链路", active: rearRoles.includes("侦察"), effect: "后台有侦察干员：全队速度 +4", bonus: { speed: 4 } },
      ...Core.Buildcraft.evaluateAll(run.deployed.filter(id => run.copies[id] > 0))
    ];
  }
  function bonuses(run) {
    const result = { hp: 0, attack: 0, armor: 0, speed: 0, energy: 0, chargeEfficiency: 0, cooldownReduction: 0, critRate:0,critDamage:0 };
    const add = values => { for (const [key, value] of Object.entries(values || {})) result[key] += value; };
    for (const key of Tactics.keys(run)) add(doctrines[key].bonus);
    for (const synergy of synergies(run)) if (synergy.active) add(synergy.bonus);
    return result;
  }
  function stats(run, id, override) {
    const values = Core.loadoutStats(id, override || loadouts(run)[id]);
    const stars = Cards.primary(run,id)?.stars || 1;
    values.stars = stars;
    const bonus = bonuses(run);
    for (const item of run.inventory.filter(item => item.owner === id && item.kind !== "gear")) {
      for (const [key, value] of Object.entries(itemInfo(item).bonus || {})) bonus[key] += value;
    }
    values.hp = Math.round(values.hp * [1, 1, 1.45, 2.1][stars]) + bonus.hp;
    values.hp += (run.careerRun?.training.vitality || 0) * 10;
    values.attack = Math.round(values.attack * [1, 1, 1.35, 1.8][stars]) + bonus.attack;
    values.armor += bonus.armor; values.speed += bonus.speed;
    values.chargeEfficiency = Math.min(100, values.chargeEfficiency + bonus.chargeEfficiency);
    values.initialEnergy += bonus.energy;
    values.cooldownReduction = Math.min(1, values.cooldownReduction + bonus.cooldownReduction);
    values.critRate=bonus.critRate;values.critDamage=bonus.critDamage;
    Links.applyStats(run, values);
    RankHazards.applyAlly(run, values);
    return values;
  }
  function encounter(run, node = nodes[run.node], challengeKey = run.challengeDraft?.selected) {
    if (node.openingReward) return { enemies: node.enemies, enemyScale: node.scale };
    return Core.enemyEncounter(run, node, nodes[node.plane * 5 + 4], Core.units, node.kind === "challenge" ? challenges[challengeKey] : null);
  }
  function battlePreview(run) {
    const current = nodes[run.node];
    const node = run.phase === "route" && ["supply", "market"].includes(current.kind) ? nodes[current.next[0]] : current;
    need(node && ["fight", "elite", "boss", "challenge"].includes(node.kind), "当前不是战斗节点。");
    const challenge = node.kind === "challenge" ? challenges[run.challengeDraft?.selected] : null;
    need(node.kind !== "challenge" || challenge, "请先选择一张高难挑战卡。");
    need(run.deployed.length > 0, "至少部署一名干员。");
    need(run.deployed.length <= capacity(run), "上阵人数超过终端容量。");
    const adjusted = Object.fromEntries(run.deployed.map(id => [id, stats(run, id)]));
    const risk = tacticThreat(run), modifiers = challenge?.modifiers || {};
    const enemyModifiers = { ...modifiers, hp: (modifiers.hp || 1) * (1 + risk.hp / 100), attack: (modifiers.attack || 1) * (1 + risk.attack / 100), speed: (modifiers.speed || 1) * (1 + risk.speed / 100) };
    const careerPressure = CareerRanks.pressure(run);
    enemyModifiers.hp *= careerPressure.hp; enemyModifiers.attack *= careerPressure.attack;
    RankHazards.applyEnemy(run, enemyModifiers, node.kind === "boss" || challenge?.level === "极危");
    const battle = Core.createBattle(run.deployed, node.openingReward ? "normal" : run.difficulty, loadouts(run), { campaign: true, timeline: true, buildcraft: true, positions: positions(run), ...encounter(run, node), enemyModifiers: node.openingReward ? { speed: .75 } : enemyModifiers, stats: adjusted });
    if (node.openingReward) battle.openingRevival = { version: 1, count: 0 };
    for (const unit of battle.units.filter(unit => unit.side === "ally")) {
      RelicSlots.bind(unit, RelicSlots.equipped(run.inventory, unit.id));
      Core.initRelicState(unit);
    }
    Tactics.initialize(battle, Tactics.keys(run), Core.initGearState);
    battle.bondRevision = 2;
    Core.Buildcraft.Roles?.initialize(battle);
    battle.campaign = { id: run.id, node: run.node };
    Links.initBattle(run, battle);
    for (const unit of battle.units.filter(unit => unit.side === 'ally')) Core.refreshStackStats(unit);
    battle.relicRulesVersion = 2;
    return battle;
  }
  function heartCarrier(run) {
    return run.inventory.find(item => item.kind === 'relic' && item.key === 'heart' && item.owner && run.deployed.includes(item.owner));
  }
  function canBypass(run) {
    return run.phase === 'combat' && ['fight','elite','challenge','boss'].includes(nodes[run.node]?.kind) && !!heartCarrier(run);
  }
  function prepareOnly(run) { need(["prep", "market", "route"].includes(run.phase), "只能在战前整备时进行此操作。"); }
  function pay(run, price) { need(run.coins >= price, "哈夫币不足。"); run.coins -= price; run.spent += price; }
  function gain(run, value) { run.coins += value; run.revenue += value; }
  function interestLedger(run) {
    // Older saves already included combat interest in sealed reward parcels.
    run.interestNodes ??= [...new Set([...(run.history || []).map(entry => entry.node), ...(run.visited || []).filter(node => node !== run.node)])];
    return run.interestNodes;
  }
  function creditNodeInterest(run, amount = interest(run)) {
    const paid = interestLedger(run);
    if (paid.includes(run.node)) return 0;
    paid.push(run.node); gain(run, amount); return amount;
  }
  function equipItem(run, uid, owner, requestedSlot = null) {
    const item = run.inventory.find(entry => entry.uid === uid);
    need(item && itemInfo(item), "物品不在库存中。");
    need(owner === null || operators.includes(owner) && run.copies[owner] > 0, "请先招募该干员。");
    if (item.kind === "relic") { RelicSlots.equip(run.inventory, item, owner, requestedSlot); return; }
    const slot = item.kind === "component" ? requestedSlot || Object.keys(Core.equipmentSlots).find(slot => !run.inventory.some(other => other.owner === owner && itemSlot(other) === slot && other.uid !== uid)) : itemSlot(item);
    if (owner) {
      need(item.kind === "relic" ? slot === "relic" : !!Core.equipmentSlots[slot], "请选择一个装备槽放置配件。");
      need(!requestedSlot || requestedSlot === slot, "物品与槽位不匹配。");
      for (const other of run.inventory) if (other.owner === owner && itemSlot(other) === slot) { other.owner = null; delete other.slot; }
    }
    item.owner = owner;
    if (item.kind === "component" && owner) item.slot = slot; else delete item.slot;
  }
  function rollLoot(run, enemy) {
    if (random(run) >= economy.dropChance[nodes[run.node].kind]) return null;
    if ((enemy.enemyBase || enemy.id) === "saeed" && random(run) < .06) return addItem(run, "relic", "watch");
    const chance = random(run);
    if (stage(run) === 2 && chance < .002) return addItem(run, "relic", "ocean");
    if (stage(run) > 0 && chance < .004) return addItem(run, "relic", "heart");
    if (chance < .42) return addItem(run, "relic", pick(run, regularRelics));
    if (random(run) < .4) return addItem(run, "gear", rollWeapon(run));
    return addItem(run, "gear", rollArmor(run));
  }
  function settleDraft(run, battle, abandoned = false) {
    need(run.phase === "combat", "本场战斗已经结算。");
    need(battle.campaign?.id === run.id && battle.campaign.node === run.node, "战斗不属于当前节点。");
    need(abandoned || battle.phase === "finished", "战斗尚未结束。");
    need(abandoned || battle.winner !== "ally" || !battle.waves || battle.waves.index === battle.waves.total - 1, "尚有敌方增援未击败。");
    const bypassed = battle.bypassed === true;
    need(abandoned || bypassed || battle.winner !== "ally" || !battle.reinforcementVersion || battle.units.filter(unit => unit.side === "enemy").every(unit => unit.entered && unit.hp === 0), "尚有敌方增援未击败。");
    need(!bypassed || !abandoned && heartCarrier(run) && battle.winner === 'ally' && (battle.bypassVersion === 2 && Array.isArray(battle.bypassDefeated) && new Set(battle.bypassDefeated).size === battle.bypassDefeated.length && battle.bypassDefeated.every(id => battle.units.some(u => u.id === id && u.side === 'enemy' && u.hp === 0)) || battle.bypassVersion === undefined && battle.round === 0 && battle.actions === 0), "非洲之心直通记录无效。");
    const opening = nodes[run.node].openingReward;
    if (opening && (abandoned || battle.winner !== "ally")) {
      run.reward = { title: "奖励关 · 返回整备，可再次挑战", node: run.node, won: false, base: 0, interest: 0, streak: 0, tactic: 0, investment: 0, challenge: 0, loss: 0, kills: 0 };
      run.phase = "prep";
      return;
    }
    for (const unit of battle.units.filter(unit => unit.side === "ally")) {
      if (bypassed && battle.bypassVersion !== 2) continue;
      const stats = run.combatStats[unit.id]; need(stats, "伤害统计干员无效。");
      for (const key of ["damage", "healing"]) { need(Number.isSafeInteger(unit[key]) && unit[key] >= 0, "战斗统计数值无效。"); stats[key] += unit[key]; }
      if (!bypassed || unit.turns || unit.supportTicks || unit.damage || unit.healing) stats.battles++;
    }
    const won = !abandoned && battle.winner === "ally";
    const challenge = nodes[run.node].kind === "challenge" ? challengeReward(run) : null;
    const rewardedEnemies = abandoned ? [] : Core.defeatedEnemies(battle);
    const defeated = bypassed ? rewardedEnemies.filter(enemy => battle.bypassDefeated?.includes(enemy.id)) : rewardedEnemies;
    const easter = nodes[run.node].easter;
    // Easter loot is rolled once per encounter, independent of rank and reinforcements.
    const drops = easter ? [] : rewardedEnemies.flatMap(enemy => { const item = rollLoot(run, enemy); return item ? [{ ...item, source: enemy.name }] : []; });
    if (easter && rewardedEnemies.length && random(run) < .25) drops.push({ ...addItem(run, 'relic', BranchMarket.relicKey(stage(run), relics, () => random(run), { easter: true })), source: '彩蛋遭遇 · 额外发现' });
    if (won && opening === 1) drops.push({ ...addItem(run, 'gear', pick(run, ['bison', 'uzi', 'mp5'])), source: '登陆接敌保底奖励' });
    if (won && opening === 2) {
      for (let i = 0; i < 2; i++) drops.push({ ...addItem(run, 'relic', pick(run, regularRelics)), source: '物资护送保底奖励' });
      run.freeRefreshes = Math.min(100, run.freeRefreshes + nodes[run.node].refreshes);
    }
    if (won && run.node === 0 && !drops.length) drops.push({ ...addItem(run, 'gear', rollWeapon(run)), source: '首战回收保底' });
    if (won && nodes[run.node].kind === 'boss') {
      drops.push({ ...addItem(run, 'gear', random(run) < .4 ? rollWeapon(run) : rollArmor(run)), source: '首领装备保底' });
      drops.push({ ...addItem(run, 'relic', pick(run, regularRelics)), source: '首领藏品保底' });
    }
    if (won && nodes[run.node].easter) drops.push({...addItem(run,'relic',pick(run,regularRelics)),source:'彩蛋遭遇 · 藏品保底'});
    if (won && challenge) {
      for (const key of challenge.relics) drops.push({ ...addItem(run, "relic", key), source: "高难挑战额外奖励" });
    }
    if (won) for (let i = 0; i < (tacticRules(run).victoryParts || 0); i++) drops.push({ ...addItem(run, "relic", pick(run, regularRelics)), source: "战术额外藏品" });
    if (!abandoned) Tactics.Mechanics?.milestone(run, 'relicHunt', defeated.length, tacticGrant(run, drops));
    // Sealed deliveries own these item instances until explicitly claimed.
    const dropIds = new Set(drops.map(item => item.uid));
    run.inventory = run.inventory.filter(item => !dropIds.has(item.uid));
    const base = won ? nodes[run.node].cash || economy.victoryCash + stage(run) * economy.planeCash + (nodes[run.node].kind === 'boss' ? economy.bossCash : 0) : abandoned ? 0 : economy.defeatCash;
    const dividend = interestLedger(run).includes(run.node) ? 0 : interest(run);
    run.streak = won ? run.streak + 1 : 0;
    const streak = won ? streakBonus(run.streak) : 0;
    const tactic = won ? tacticRules(run).winCash || 0 : 0;
    const loss = won ? 0 : challenge ? challenge.loss : nodes[run.node].kind === "boss" ? 45 + stage(run) * 5 : 22 + stage(run) * 6;
    run.integrity = Math.max(0, run.integrity - loss);
    const receipt = { base, interest: dividend, streak, tactic, investment: 0, challenge: won && challenge ? challenge.coins : 0, loss, ...(bypassed ? { bypassed: true } : {}) };
    Object.assign(receipt, Links.settle(run, { won, abandoned, finalBoss: nodes[run.node].kind === "boss" && stage(run) === planes.length - 1 }));
    events.emit("economy:settle", { receipt, principal: run.coins, kills: defeated.length, won, protocols: run.protocols, doctrine: run.doctrine, tactics: Tactics.keys(run) });
    const income = receipt.base + receipt.interest + receipt.streak + receipt.tactic + receipt.investment + receipt.challenge;
    run.kills += defeated.length;
    run.reward = { title: won ? "交战结束 · 搜索战利品" : abandoned ? "放弃交战 · 小队撤退" : "突破失利 · 回收已击败目标", won, ...receipt, node: run.node, kills: defeated.length };
    if (bypassed) run.reward.title = "非洲之心 · 节点直通";
    run.history.push({ node: run.node, name: nodes[run.node].name, won, kills: defeated.length, income, loss, rounds: battle.round });
    if (bypassed) Object.assign(run.history.at(-1), { bypassed: true, relic: 'heart' });
    if (won && nodes[run.node].kind === "boss" && !run.clearedBosses.includes(stage(run))) run.clearedBosses.push(stage(run));
    creditNodeInterest(run, dividend);
    gain(run,income-dividend);
    if (!abandoned) {
      run.freeRefreshes = Math.min(100, run.freeRefreshes + economy.battleRefreshes);
    }
    receipt.interestPaid = true; run.reward.interestPaid = true;
    receipt.cashPaid = true; run.reward.cashPaid = true;
    if(won&&nodes[run.node].kind==='boss'&&stage(run)<planes.length-1){receipt.tools=FieldTools.bossReward(run);run.reward.tools=receipt.tools;}
    if(drops.length)packBattle(run, drops, 0, receipt);
    run.pending = [];
    const finalBoss = nodes[run.node].kind === "boss" && stage(run) === planes.length - 1;
    if (!run.integrity || finalBoss && !won) run.outcome = "failed";
    else if (finalBoss) run.outcome = "extracted";
    run.phase = run.outcome ? "ended" : "route";
    if (receipt.linkRevived) { run.outcome = null; run.phase = "prep"; }
  }
  function commandDraft(run, action) {
    if(['reforgeRelic','duplicateOperator','sortCards'].includes(action.type)){prepareOnly(run);FieldTools.apply(run,action,{Core,Cards,random,capacity:capacity(run),relics});return;}
    if(action.type==='openAllParcels'){
      need(['prep','market','route','ended','supply'].includes(run.phase),'当前无法签收快递。');
      const parcels=run.parcels.filter(p=>!p.opened);need(parcels.length,'没有待签收快递。');const items=[],tools={duplicate:0,reforge:0};let coins=0;
      for(const parcel of parcels){commandDraft(run,{type:'openParcel',uid:parcel.uid});items.push(...run.lastParcel.items);coins+=run.lastParcel.coins;for(const key of Object.keys(tools))tools[key]+=run.lastParcel.tools?.[key]||0;}
      run.lastParcel={uid:`batch-${++run.serial}`,label:`${parcels.length} 箱快递`,coins,items,tools,receipt:null};return;
    }
    if (action.type === "refreshTactic") {
      need(run.phase === "opening" || run.phase === "tactic" && run.tacticDraft?.node === run.node && !run.tacticClaimed.includes(stage(run)), "只能在战术选择时刷新。");
      Links.useRefresh(run);
      const previous = run.phase === "opening" ? run.openingChoices : run.tacticDraft.offers;
      const next = Object.keys(Tactics.qualities).map(quality => {
        const pool = Object.keys(doctrines).filter(key => doctrines[key].quality === quality && Tactics.canChoose(Tactics.keys(run), key));
        const fresh = pool.filter(key => !previous.includes(key));
        return pick(run, fresh.length ? fresh : pool);
      });
      if (run.phase === "opening") run.openingChoices = next; else run.tacticDraft.offers = next;
      return;
    }
    if (action.type === "chooseOpening") {
      need(run.phase === "opening" && run.doctrine === null && run.openingChoices.includes(action.key), "只能从本次抽到的三个协议中选择一个。");
      adoptTactic(run, action.key); run.phase = "prep";
    } else if (action.type === "chooseTactic") {
      need(run.phase === "tactic" && run.tacticDraft?.node === run.node && !run.tacticClaimed.includes(stage(run)) && run.tacticDraft.offers.includes(action.key) && Tactics.canChoose(run.tactics, action.key), "请从本次战术候选中选择，不能重复领取或降级。");
      const previous = Tactics.replacement(run.tactics, action.key);
      adoptTactic(run, action.key);
      run.history.push({ node: run.node, name: nodes[run.node].name, supply: "tactic", tactic: action.key, replaced: previous || null });
      run.tacticClaimed.push(stage(run)); run.tacticDraft = null; run.phase = "route";
      BranchMarket?.drawBranch(run, nodes, random);
    } else if (action.type === "refreshChallenge") {
      need(run.phase === "challenge" && run.challengeDraft?.refreshes === 1 && !run.challengeDraft.selected, "本次挑战的免费刷新已经用完。");
      drawChallenge(run, run.challengeDraft.offers);
    } else if (action.type === "chooseChallenge") {
      need(run.phase === "challenge" && run.challengeDraft?.node === run.node && !run.challengeDraft.selected && run.challengeDraft.offers.includes(action.key), "请选择本次抽到的挑战卡。");
      run.challengeDraft.selected = action.key; run.phase = "prep";
      run.freeRefreshes += tacticRules(run).refreshes || 0;
    } else if (action.type === "openParcel") {
      need(["prep", "market", "route", "ended", "supply"].includes(run.phase), "交战中无法签收快递。");
      const parcel = run.parcels.find(item => item.uid === action.uid);
      need(parcel && !parcel.opened, "这箱快递已经领取。");
      if (parcel.tools) FieldTools.claim(run, parcel.tools);
      parcel.opened = true; gain(run, parcel.coins);
      const items = parcel.gear.map(key => ({ ...addItem(run, "gear", key) }));
      for (const key of parcel.parts) items.push({ ...addItem(run, "component", key) });
      for (const key of parcel.relics || []) items.push({ ...addItem(run, "relic", key) });
      for (const item of parcel.items || []) { run.inventory.push({ ...item }); items.push({ ...item }); }
      run.lastParcel = { uid: parcel.uid, label: parcel.label, coins: parcel.coins, items, ...(parcel.tools ? {tools:{...parcel.tools}} : {}), receipt: parcel.receipt || null };
    } else if (action.type === "build") {
      need(run.phase === "finance", "当前不在备战理财阶段。"); run.phase = "prep";
    } else if (action.type === "invest") {
      throw new Error("战术已改为共享牌池，请在战术决策节点免费选择。");
    } else if (action.type === "blood") {
      need(["finance", "market"].includes(run.phase) && !run.bloodNodes.includes(run.node), "当前节点的应急垫资已经用过。");
      need(run.integrity > 15, "行动完整度不足，无法继续透支。");
      run.integrity -= 15; gain(run, 50000); run.bloodNodes.push(run.node);
    } else if (action.type === "strip") {
      prepareOnly(run); need(operators.includes(action.id) && run.copies[action.id], "干员未招募。");
      for (const item of run.inventory) if (item.owner === action.id) { item.owner = null; delete item.slot; }
    } else if (action.type === "buyComponent") {
      throw new Error("基础配件已移除，改为收集紫色藏品进行融合。");
    } else if (action.type === "craftRelic") {
      prepareOnly(run);
      const recipe = relicRecipes.find(recipe => recipe.id === action.key); need(recipe, "这件藏品不能通过合成获得。");
      const owner = action.owner || null;
      need(!owner || operators.includes(owner) && run.copies[owner] > 0, "合成目标干员尚未招募。");
      need(!action.slot || owner && RelicSlots.slots.includes(action.slot), "请选择有效的藏品槽。");
      if (action.uids) need(Array.isArray(action.uids) && action.uids.length === 2 && new Set(action.uids).size === 2, "需要两件独立藏品，不能重复使用同一件。");
      const selected = [];
      for (const key of recipe.parts) {
        const item = run.inventory.find(item => item.kind === "relic" && item.key === key && !selected.includes(item) && (!action.uids || action.uids.includes(item.uid)) && (!item.owner || item.owner === owner));
        need(item, "缺少所需藏品；其他干员佩戴的素材请先卸下。"); selected.push(item);
      }
      const slot = action.slot || (owner && selected.find(item => item.owner === owner) && itemSlot(selected.find(item => item.owner === owner))) || null;
      run.inventory = run.inventory.filter(item => !selected.includes(item));
      const crafted = addItem(run, "relic", recipe.output);
      if(selected.some(item=>item.marketPrice))crafted.marketPrice=selected.reduce((sum,item)=>sum+(item.marketPrice||salePrice(run,item)*2),0);
      if (owner) equipItem(run, crafted.uid, owner, slot);
      Tactics.Mechanics?.milestone(run, 'relicForge', 1, tacticGrant(run));
    } else if (action.type === "craft") {
      throw new Error("配件合成已移除，枪械与防具改为从快递获取。");
    } else if (action.type === "route") {
      need(run.phase === "route" && routeChoices(run).includes(action.node), "请从本次抽到的三条路线中选择。");
      need(nodes[run.node].kind !== "boss" || run.reward && run.reward.node === run.node, "先完成首领交战与结算。");
      enterNode(run, action.node);
    } else if (action.type === 'prepareMarket') {
      need(run.phase==='market'&&nodes[run.node].kind==='market','当前不在黑市。');
      if(!run.blackMarket)BranchMarket.stock(run,nodes,Core.equipment,relics,random);
      need(BranchMarket.validate(run,nodes,Core.equipment,relics),'黑市货架数据无效。');
    } else if (action.type === "leaveMarket") {
      need(run.phase === "market", "当前不在黑市。");
      run.blackMarket = null;
      run.history.push({ node: run.node, name: nodes[run.node].name, supply: "market" }); run.phase = "route";
    } else if (action.type === 'refreshMarketRelics') {
      need(run.phase==='market'&&run.blackMarket?.node===run.node,'当前不在黑市藏品交易区。');
      throw new Error('黑市货架固定，本次到访不可刷新。');
    } else if (action.type === 'buyMarketItem') {
      need(run.phase==='market'&&run.blackMarket?.node===run.node,'当前不在黑市交易区。');
      const offer=[...run.blackMarket.gear,...run.blackMarket.relics].find(o=>o.uid===action.uid);
      need(offer&&!offer.sold,'该物品已售出或货架已刷新。');pay(run,offer.price);offer.sold=true;
      const item=addItem(run,offer.kind,offer.key);item.marketPrice=offer.price;
    } else if (action.type === "buy") {
      prepareOnly(run);
      const offer = run.shop.find(item => item.uid === action.uid);
      need(offer && !offer.sold, "该商品已售出。");
      need(offer.kind === "recruit", "请从对应货架购买干员、装备或藏品。");
      need(run.copies[offer.key] < 9, "该干员已达到三星。");
      pay(run, recruitPrice(run,offer.key)); offer.sold = true;
      if (offer.kind === "recruit") {
        Cards.add(run,offer.key);
        if (run.copies[offer.key] === 1 && run.deployed.length < capacity(run)) {
          const current = positions(run); place(run, offer.key, Formation.recruitOrder.find(slot => !Object.values(current).includes(slot)));
        }
      }
    } else if (action.type === "sellOperator") {
      need(['prep','route','market','tactical'].includes(run.phase),'只能在战前出售干员卡牌。');need(operators.includes(action.id)&&run.copies[action.id]>0,'干员已售出或尚未招募。');
      const card=action.cardUid?Cards.list(run).find(c=>c.uid===action.cardUid&&c.id===action.id):Cards.primary(run,action.id);
      need(card,'该卡牌已合成或售出。');
      const field=run.fieldCards[action.id]===card.uid,primary=Cards.primary(run,action.id)?.uid===card.uid;
      need(!field||run.deployed.length>1,'请先部署替代干员，不能出售最后一张出战卡。');
      need(!field||run.deployed.some(id=>id!==action.id&&Formation.frontSlot(positions(run)[id])),'请先部署替代前排干员，再出售当前前排卡。');
      const price=operatorSalePrice(run,action.id,card.uid),current=positions(run);
      Cards.remove(run,action.id,card.uid);
      if(field){run.deployed=run.deployed.filter(id=>id!==action.id);delete current[action.id];run.positions=current;Cards.syncField(run);}
      if(primary || field || !run.copies[action.id])for(const item of run.inventory)if(item.owner===action.id){item.owner=null;delete item.slot;}
      gain(run, price);
    } else if (action.type === "refresh") {
      prepareOnly(run);
      need(run.phase!=='market','黑市货架固定，本次到访不可刷新。');
      need(recruitPool(run).length > 0, "所有干员均已三星，无需刷新。");
      const paid = run.freeRefreshes <= 0;
      if (!paid) run.freeRefreshes--; else pay(run, refreshPrice(run));
      rollShop(run); Tactics.Mechanics?.refreshed(run, paid, tacticGrant(run));
    }
    else if (action.type === "lock") { prepareOnly(run); need(run.phase!=='market','黑市货架固定，无需锁定。'); run.locked = !run.locked; }
    else if (action.type === "place") place(run, action.id, action.slot, action.cardUid);
    else if (action.type === "deploy") {
      prepareOnly(run); need(operators.includes(action.id) && run.copies[action.id] > 0, "尚未招募该干员。");
      if (action.replace != null) {
        need(!run.deployed.includes(action.id) && run.deployed.includes(action.replace), "换人目标无效。");
        place(run, action.id, positions(run)[action.replace],action.cardUid);
      }
      else if (run.deployed.includes(action.id)) place(run, action.id, null);
      else { need(run.deployed.length < capacity(run), "上阵人数已满，请升级终端或替换干员。"); place(run, action.id, Formation.recruitOrder.find(slot => !Object.values(positions(run)).includes(slot)),action.cardUid); }
    } else if (action.type === "equip") { prepareOnly(run); equipItem(run, action.uid, action.owner, action.slot); }
    else if (action.type === "relic") {
      throw new Error("藏品现在需要佩戴在干员的专属藏品槽。");
    } else if (action.type === "sell") {
      prepareOnly(run); const item = run.inventory.find(entry => entry.uid === action.uid);
      need(item, "物品已经不在库存中。");
      need(!item.owner, "请先卸下物品，再出售。");
      gain(run, salePrice(run, item)); run.inventory = run.inventory.filter(entry => entry.uid !== item.uid);
    } else if (action.type === "sellItems") {
      prepareOnly(run);
      const { items, total } = saleSelection(run, action.uids), ids = new Set(items.map(item => item.uid));
      gain(run, total); run.inventory = run.inventory.filter(item => !ids.has(item.uid));
    } else if (action.type === "upgrade") { prepareOnly(run); need(run.rank < Formation.maxRank, "终端已满级。"); pay(run, upgradePrice(run)); run.rank++; }
    else if (action.type === "bypass") {
      throw new Error('请进入战斗，使用非洲之心的「跳过交战」主动按钮。');
    }
    else if (action.type === "start") {
      need(Cards.bench(run).length<=Cards.limit,'旧存档备战卡超额，请先整理至 12 张以内再开战。');
      need(run.phase === "prep", "请先完成战前理财与构筑。");
      need(nodes[run.node].kind !== "boss" || run.tacticalClaimed.includes(stage(run)), "请先领取首领战前的战术补给。");
      battlePreview(run); run.phase = "combat";
    }
    else if (action.type === "chooseTactical") {
      need(run.phase === "tactical" && run.tacticalDraft?.node === run.node && !run.tacticalClaimed.includes(stage(run)), "本次战术补给已经领取或尚未到达。");
      const offer = run.tacticalDraft.offers.find(item => item.uid === action.uid);
      need(offer, "请选择本次到达的增援干员。");
      const wasOwned = run.copies[offer.operator] > 0;
      const full = run.copies[offer.operator] >= 9;
      if (!full) Cards.add(run,offer.operator);
      else gain(run, recruitCost(offer.operator));
      equipItem(run, addItem(run, "gear", offer.gear).uid, offer.operator);
      run.history.push({ node: run.node, name: nodes[run.node].name, supply: "tactical", operator: offer.operator, gear: offer.gear });
      run.tacticalClaimed.push(stage(run)); run.tacticalDraft = null;
      enterNode(run, nodes[run.node].next[0]);
      if (!wasOwned && run.deployed.length < capacity(run)) place(run, offer.operator, Formation.recruitOrder.find(slot => !Object.values(positions(run)).includes(slot)));
    }
    else if (action.type === "supply") {
      need(run.phase === "supply" && ["cash", "repair", "relic", "gear"].includes(action.choice), "无效的补给选择。");
      if (action.choice === "cash") gain(run, economy.supplyCash);
      if (action.choice === "repair") run.integrity = Math.min(100, run.integrity + 25);
      if (action.choice === "relic") run.parcels.push({ uid: `parcel-${++run.serial}`, label: "藏品素材补给", opened: false, coins: 0, gear: [], parts: [], relics: [pick(run, regularRelics)] });
      if (action.choice === "gear") run.parcels.push({ uid: `parcel-${++run.serial}`, label: "防具补给", opened: false, coins: 0, gear: [rollArmor(run)], parts: [] });
      run.history.push({ node: run.node, name: nodes[run.node].name, supply: action.choice }); run.phase = "route";
    } else if (action.type === "claim" || action.type === "sellDrop") {
      need(run.phase === "loot", "当前没有待回收物资。");
      const item = run.pending.find(entry => entry.uid === action.uid); need(item, "该战利品已经处理。");
      run.pending = run.pending.filter(entry => entry.uid !== item.uid);
      if (action.type === "sellDrop") gain(run, salePrice(run, item));
      else { const { source, ...owned } = item; run.inventory.push(owned); }
    } else if (action.type === "claimAll") {
      need(run.phase === "loot", "当前没有待回收物资。");
      for (const { source, ...item } of run.pending) run.inventory.push(item);
      run.pending = [];
    } else if (action.type === "next") {
      need(run.phase === "loot" && run.pending.length === 0, "请先收取或出售全部战利品。");
      if (run.outcome) run.phase = "ended";
      else run.phase = "route";
    } else throw new Error("未知操作。");
  }
  function enterNode(run, index) {
    const previousPlane = stage(run);
    creditNodeInterest(run);
    run.node = index; run.visited.push(index);
    run.branchDraft = null; run.blackMarket = null;
    run.reward = null;
    run.pending = [];
    run.challengeDraft = null;
    run.phase = ["supply", "market", "tactical", "challenge", "tactic"].includes(nodes[run.node].kind) ? nodes[run.node].kind : "prep";
    run.tacticDraft = run.phase === "tactic" ? { node: run.node, offers: drawTacticOffers(run) } : null;
    if (stage(run) !== previousPlane) Links.enterPlane(run, stage(run));
    if (run.phase === "challenge") drawChallenge(run);
    if (run.phase === "tactical") drawTactical(run);
    const rules = tacticRules(run);
    if (run.phase === "prep") run.freeRefreshes += rules.refreshes || 0;
    if (rules.nodeCash) gain(run, rules.nodeCash);
    if (stage(run) !== previousPlane) for (let i = 0; i < (rules.parcels || 0); i++) addParcel(run);
    // A lock only protects offers within the current plane. New planes restock for free.
    if (stage(run) !== previousPlane) run.locked = false;
    if (!run.locked) rollShop(run);
    if (run.phase==='market') BranchMarket?.stock(run,nodes,Core.equipment,relics,random);
  }
  function advanceLinear(run) {
    while (run.phase === "route" && nodes[run.node].next.length === 1) {
      need(nodes[run.node].kind !== "boss" || run.reward?.node === run.node, "先完成首领交战与结算。");
      enterNode(run, nodes[run.node].next[0]);
    }
  }
  function command(run, action) {
    const draft = clone(run), previousPlane = stage(run);
    Cards.ensure(draft);FieldTools.ensure(draft);const benchBefore=Cards.bench(draft).length;
    const stripped = action.type === "strip" ? run.inventory.filter(item => item.owner === action.id).map(item => item.uid) : [];
    retireComponents(draft); commandDraft(draft, action);FieldTools.awardTactics(draft,{Core,Cards,doctrines});FieldTools.awardLegends(draft,{Core,Cards}); advanceLinear(draft); retireComponents(draft); Cards.capacityCheck(draft,benchBefore); Object.assign(run, draft);
    if (stage(run) !== previousPlane) events.emit("plane:entered", { runId: run.id, plane: stage(run) });
    if (["place", "deploy", "buy", "sellOperator", "chooseTactical", "duplicateOperator", "sortCards"].includes(action.type)) events.emit("roster:changed", { runId: run.id, front: run.deployed.filter(id => Formation.frontSlot(run.positions[id])), back: run.deployed.filter(id => run.positions[id] >= Formation.frontCount) });
    if (action.type === "strip") events.emit("tooling:stripped", { runId: run.id, owner: action.id, items: stripped });
    events.emit("run:changed", { runId: run.id, phase: run.phase, node: run.node });
    return run;
  }
  function settle(run, battle, abandoned = false) {
    const draft = clone(run), previousPlane = stage(run);
    settleDraft(draft, battle, abandoned); const receipt = clone(draft.reward);
    advanceLinear(draft); retireComponents(draft); Object.assign(run, draft);
    if (stage(run) !== previousPlane) events.emit("plane:entered", { runId: run.id, plane: stage(run) });
    return receipt;
  }
  function restore(data) {
    const run = clone(data);
    // Unclaimed 0.72 reward screens become battles; already-claimed nodes stay completed.
    if (run?.phase === "supply" && nodes[run.node]?.openingReward) run.phase = "prep";
    need([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].includes(run?.version), "存档版本不兼容。");
    // Compact the item pool without removing instances, ownership or sealed rewards.
    const replacement = key => Object.hasOwn(Systems.legacyRelicKeys, key) ? Systems.legacyRelicKeys[key] : key;
    for (const item of [...(run.inventory || []), ...(run.pending || []), ...(run.lastParcel?.items || []), ...(run.parcels || []).flatMap(parcel => parcel.items || []), ...(run.blackMarket?.relics || [])]) {
      if (item.kind === "relic") item.key = replacement(item.key);
    }
    for (const parcel of run.parcels || []) if (Array.isArray(parcel.relics)) parcel.relics = parcel.relics.map(replacement);
    if (run.version === 1) {
      for (const id of ["dwolf", "luna", "hackclaw"]) if (run.copies[id] == null) run.copies[id] = 0;
      run.version = 2;
    }
    if (run.version === 2) {
      need(Number.isInteger(run.node) && run.node >= 0 && run.node < 12, "旧进度节点无效。");
      const old = run.node, plane = Math.floor(old / 4);
      run.node = plane * 5 + [0, 1, 3, 4][old % 4];
      run.protocols = []; run.bloodNodes = []; run.visited = [run.node]; run.clearedBosses = Array.from({ length: plane }, (_, i) => i);
      run.history = run.history.map(entry => ({ ...entry, name: `旧版行动 · 节点 ${entry.node + 1}`, node: Math.floor(entry.node / 4) * 5 + [0, 1, 3, 4][entry.node % 4] }));
      if (run.reward) { run.reward.node = run.node; run.reward.investment = 0; }
      if (["prep", "combat"].includes(run.phase)) { run.phase = "finance"; run.reward = null; }
      if (nodes[run.node].kind === "boss" && run.reward?.won) run.clearedBosses.push(plane);
      run.version = 3; run.migrated = true;
    }
    if (run.version === 3) {
      run.rank = Math.max(run.rank, Math.min(5, run.deployed.length - 1)); run.version = 4;
      run.activeRelics = run.activeRelics.slice(0, relicCapacity(run));
    }
    if (run.version === 4) { run.openingChoices = []; run.parcels = []; run.lastParcel = null; run.freeRefreshes = 0; run.version = 5; }
    if (run.version === 5) {
      const oldPositions = positions(run);
      run.positions = Object.fromEntries(Object.entries(oldPositions).map(([id, slot]) => [id, [0, 1, 2, 5, 3, 4][slot]]));
      if (!Object.values(run.positions).some(slot => slot < 3)) run.positions[run.deployed[0]] = 0;
      // Legacy settlement cash was already paid; migrate only unresolved items.
      if (run.phase === "loot") {
        if (run.pending.length) packBattle(run, run.pending, 0);
        run.pending = []; run.phase = run.outcome ? "ended" : "route";
      }
      if (run.phase === "finance") run.phase = "prep";
      run.version = 6;
    }
    if (run.version === 6) {
      run.tacticalDraft = null;
      run.tacticalClaimed = planes.map((_, p) => p).filter(p => p < stage(run) || p === stage(run) && nodes[run.node].kind === "boss" && ["combat", "route", "loot", "ended"].includes(run.phase));
      run.shop = run.shop.map(offer => {
        if (offer.kind === "recruit") return offer;
        const available = operators.filter(id => run.copies[id] < 9), key = pick(run, available.length ? available : operators);
        return { uid: `offer-${++run.serial}`, kind: "recruit", key, price: key === "uluru" ? 40000 : 30000, sold: false };
      });
      if (nodes[run.node].kind === "boss" && ["prep", "finance"].includes(run.phase)) {
        run.node = nodes.findIndex(node => node.kind === "tactical" && node.plane === stage(run));
        run.visited.push(run.node); run.phase = "tactical"; run.reward = null; drawTactical(run);
      }
      run.version = 7;
    }
    if (run.version === 7) {
      const owners = [...run.deployed, ...operators.filter(id => run.copies[id] && !run.deployed.includes(id))];
      for (const uid of run.activeRelics || []) {
        const item = run.inventory.find(item => item.uid === uid && item.kind === "relic");
        const owner = owners.find(id => !run.inventory.some(item => item.kind === "relic" && item.owner === id));
        if (item && owner) item.owner = owner;
      }
      run.activeRelics = []; run.version = 8;
    }
    if (run.version === 8) { run.challengeDraft = null; run.version = 9; }
    if (run.version === 9) {
      run.combatStats = blankCombatStats(); run.combatStatsPartial = run.history.some(entry => typeof entry.won === "boolean"); run.version = 10;
    }
    if (run.version === 10) {
      for (const id of ["butterfly", "tempest", "nameless"]) { run.copies[id] ??= 0; run.combatStats[id] ??= { damage: 0, healing: 0, battles: 0 }; }
      run.version = 11;
    }
    if (run.version === 11) {
      for (const id of ["sineva", "nitro", "toxik", "echo"]) { run.copies[id] ??= 0; run.combatStats[id] ??= { damage: 0, healing: 0, battles: 0 }; }
      run.version = 12;
    }
    if (run.version === 12) {
      run.tactics = run.doctrine ? [run.doctrine] : [];
      run.protocols = run.protocols.filter(key => key !== run.doctrine);
      run.tacticDraft = null;
      run.tacticClaimed = planes.map((_, p) => p).filter(p => p < stage(run) || p === stage(run) && nodes[run.node].depth > 1);
      run.version = 13;
    }
    need(run.rosterRevision === undefined || run.rosterRevision === 2, "干员牌库版本无效。");
    if (!run.rosterRevision) {
      for (const id of ['shepherd','gizmo','raptor','rover']) { run.copies[id] ??= 0; run.combatStats[id] ??= {damage:0,healing:0,battles:0}; }
      run.rosterRevision = 2;
    }
    need(typeof run.combatStatsPartial === "boolean" && run.combatStats && Object.keys(run.combatStats).length === operators.length && operators.every(id => run.combatStats[id] && ["damage", "healing", "battles"].every(key => Number.isSafeInteger(run.combatStats[id][key]) && run.combatStats[id][key] >= 0)), "累计战斗统计无效。");
    need(nodes[run.node] && ["opening", "finance", "prep", "combat", "loot", "supply", "tactical", "tactic", "challenge", "market", "route", "ended"].includes(run.phase), "存档阶段不兼容。");
    need(Array.isArray(run.tactics) && run.tactics.length <= 4 && run.tactics.every(key => doctrines[key]) && new Set(run.tactics.map(key => doctrines[key].family)).size === run.tactics.length && (run.phase === "opening" ? run.tactics.length === 0 : run.tactics[0] === run.doctrine), "已选战术记录无效。");
    need(Array.isArray(run.tacticClaimed) && new Set(run.tacticClaimed).size === run.tacticClaimed.length && run.tacticClaimed.every(p => Number.isInteger(p) && planes[p]), "战术节点领取记录无效。");
    need(!Tactics.Mechanics || Tactics.Mechanics.validateProgress(run), "战术成长进度无效。");
    if (run.phase === "tactic") {
      const draft = run.tacticDraft;
      need(nodes[run.node].kind === "tactic" && !run.tacticClaimed.includes(stage(run)) && draft?.node === run.node && Array.isArray(draft.offers) && draft.offers.length === 3 && new Set(draft.offers).size === 3 && draft.offers.every(key => Tactics.canChoose(run.tactics, key)) && new Set(draft.offers.map(key => doctrines[key].quality)).size === 3, "战术候选无效。");
    } else need(run.tacticDraft === null && (nodes[run.node].kind !== "tactic" || run.phase === "route" && run.tacticClaimed.includes(stage(run))), "战术选择阶段不一致。");
    if (nodes[run.node].kind === "challenge") {
      const draft = run.challengeDraft;
      need(draft?.node === run.node && Array.isArray(draft.offers) && draft.offers.length === 2 && new Set(draft.offers).size === 2 && draft.offers.every(key => challenges[key]) && [0, 1].includes(draft.refreshes), "挑战卡存档无效。");
      need(run.phase === "challenge" ? draft.selected === null : ["prep", "combat", "route", "ended"].includes(run.phase) && draft.offers.includes(draft.selected), "挑战选择状态无效。");
    } else need(run.challengeDraft === null && run.phase !== "challenge", "挑战阶段不一致。");
    need(Array.isArray(run.tacticalClaimed) && new Set(run.tacticalClaimed).size === run.tacticalClaimed.length && run.tacticalClaimed.every(p => Number.isInteger(p) && planes[p]), "战术补给记录无效。");
    if (run.phase === "tactical") {
      const draft = run.tacticalDraft;
      need(nodes[run.node].kind === "tactical" && !run.tacticalClaimed.includes(stage(run)) && draft?.node === run.node && Array.isArray(draft.offers) && draft.offers.length === 5 && new Set(draft.offers.map(item => item.operator)).size === 5 && new Set(draft.offers.map(item => item.uid)).size === 5 && draft.offers.every(item => typeof item.uid === "string" && operators.includes(item.operator) && Core.equipment[item.gear]), "战术补给候选无效。");
    } else need(run.tacticalDraft === null, "战术补给阶段不一致。");
    need(run.openingFlow === undefined || run.openingFlow === 1, "开局流程版本无效。");
    need(Array.isArray(run.openingChoices) && new Set(run.openingChoices).size === run.openingChoices.length && run.openingChoices.every(key => doctrines[key]) && (run.phase !== "opening" || run.openingChoices.length === 3 && run.doctrine === null && run.node === (run.openingFlow ? Systems.openingNodes[0] : 0)), "开局协议存档无效。");
    need(Number.isInteger(run.freeRefreshes) && run.freeRefreshes >= 0 && run.freeRefreshes <= 100, "免费刷新次数无效。");
    need(Array.isArray(run.parcels) && run.parcels.length <= 64 && new Set(run.parcels.map(item => item.uid)).size === run.parcels.length && run.parcels.every(item => typeof item.uid === "string" && typeof item.label === "string" && typeof item.opened === "boolean" && Number.isInteger(item.coins) && item.coins >= 0 && item.coins <= 10000000 && Array.isArray(item.gear) && item.gear.length <= 5 && item.gear.every(key => Core.equipment[key]) && Array.isArray(item.parts) && item.parts.every(key => components[key]) && (!item.items || Array.isArray(item.items) && item.items.length <= 20 && item.items.every(entry => itemInfo(entry) && !entry.owner))), "快递存档无效。");
    need(Array.isArray(run.protocols) && new Set(run.protocols).size === run.protocols.length && run.protocols.every(key => investments[key]), "投资协议无效。");
    need(run.parcels.every(parcel => parcel.relics === undefined || Array.isArray(parcel.relics) && parcel.relics.length <= 20 && parcel.relics.every(key => Object.hasOwn(relics, key))), "藏品快递存档无效。");
    need(run.parcels.every(parcel => parcel.tools === undefined || FieldTools.validTools(parcel.tools)), "道具快递存档无效。");
    need([run.visited, run.bloodNodes, run.clearedBosses].every(Array.isArray) && run.visited.includes(run.node) && run.visited.every(index => nodes[index]) && run.bloodNodes.every(index => nodes[index]) && run.clearedBosses.every(index => Number.isInteger(index) && planes[index]), "路线记录无效。");
    need(Number.isInteger(run.coins) && run.coins >= 0 && run.coins < 1e10 && Number.isInteger(run.integrity) && run.integrity >= 0 && run.integrity <= 100, "存档数值无效。");
    need((doctrines[run.doctrine] || run.phase === "opening" && run.doctrine === null) && ["normal", "hard"].includes(run.difficulty) && Number.isInteger(run.rank) && run.rank >= 1 && run.rank <= Formation.maxRank, "存档配置无效。");
    need(operators.every(id => Number.isInteger(run.copies[id]) && run.copies[id] >= 0 && run.copies[id] <= 9), "干员存档无效。");
    need(run.formationLayout === undefined || run.formationLayout === Formation.layout, "阵型版本无效。");
    if (!run.formationLayout) {
      need(Object.values(run.positions || {}).every(slot => Number.isInteger(slot) && slot >= 0 && slot < 6), "旧阵位存档无效。");
      const legacy = positions(run);
      run.positions = Object.fromEntries(Object.entries(legacy).map(([id, slot]) => [id, slot >= 3 ? slot + 1 : slot]));
      run.formationLayout = Formation.layout;
    }
    need(Array.isArray(run.deployed) && run.deployed.length >= 1 && run.deployed.length <= capacity(run) && new Set(run.deployed).size === run.deployed.length && run.deployed.every(id => operators.includes(id) && run.copies[id]), "部署存档无效。");
    if (run.positions) need(Object.entries(run.positions).every(([id, slot]) => run.deployed.includes(id) && Formation.validSlot(slot)) && new Set(Object.values(run.positions)).size === Object.keys(run.positions).length, "阵位存档无效。");
    run.positions = positions(run);
    if (run.migrated && !Object.values(run.positions).some(Formation.frontSlot)) run.positions[run.deployed[0]] = 0;
    need(Object.values(run.positions).some(Formation.frontSlot), "前台阵位为空。");
    Cards.ensure(run);need(Cards.validate(run,operators),'干员卡牌数量、星级、出战记录或备战容量无效。');need(FieldTools.validate(run),'重铸器或复制器数量无效。');
    const items = [...run.inventory, ...run.pending, ...run.parcels.filter(parcel => !parcel.opened).flatMap(parcel => parcel.items || [])];
    need(new Set(items.map(item => item.uid)).size === items.length && items.every(item => typeof item.uid === "string" && ["gear", "relic", "component"].includes(item.kind) && itemInfo(item) && (!item.owner || operators.includes(item.owner) && run.copies[item.owner] && (item.kind === "relic" ? RelicSlots.slots.includes(itemSlot(item)) : !!Core.equipmentSlots[itemSlot(item)]))), "物品存档无效。");
    const worn = run.inventory.filter(item => item.owner).map(item => `${item.owner}:${itemSlot(item)}`);
    need(new Set(worn).size === worn.length, "装备槽位冲突。");
    need(Array.isArray(run.activeRelics) && run.activeRelics.length === 0, "藏品需佩戴在干员身上。");
    need(Array.isArray(run.shop) && run.shop.length <= 5 && run.shop.every(item => item.kind === "recruit" && operators.includes(item.key) && Number.isInteger(item.price) && item.price > 0 && typeof item.sold === "boolean"), "商店存档无效。");
    need(run.recruitRevision === undefined || run.recruitRevision === 1, "招募费用版本无效。");
    if (!run.recruitRevision) {
      for (const offer of run.shop) if (!offer.sold) offer.price = recruitCost(offer.key);
      run.recruitRevision = 1;
    }
    need(run.shop.every(item => item.sold || item.price === recruitCost(item.key)), "招募费用无效。");
    need(Number.isInteger(run.rng) && run.rng >= 0 && run.rng <= 4294967295 && Number.isInteger(run.serial) && run.serial >= 0 && Array.isArray(run.history), "行动存档无效。");
    repairEarlyShop(run);
    delete run.support;
    need([null, "failed", "extracted"].includes(run.outcome) && (run.phase !== "ended" || run.outcome), "结算存档无效。");
    need(run.phase !== "loot" || run.reward && run.reward.node === run.node, "战利品存档无效。");
    need(run.phase !== "supply" || nodes[run.node].kind === "supply", "补给节点无效。");
    need(run.phase !== "market" || nodes[run.node].kind === "market", "黑市节点无效。");
    need(!BranchMarket || BranchMarket.validate(run,nodes,Core.equipment,relics), '分支选项或黑市货架存档无效。');
    need(items.every(item=>item.marketPrice===undefined||Number.isSafeInteger(item.marketPrice)&&item.marketPrice>0), '黑市物品购价记录无效。');
    if (run.phase==='market'&&!run.blackMarket) BranchMarket?.stock(run,nodes,Core.equipment,relics,random);
    if (!run.fundingRevision) {
      run.fundingRevision = 2;
      if (run.phase !== "ended") run.parcels.push({ uid: `parcel-${++run.serial}`, label: "行动资金补给", opened: false, coins: 120000, gear: [], parts: [] });
    }
    need(CareerRanks.validateRun(run), "行动职级或训练加成无效。");
    need(run.craftingRevision === undefined || run.craftingRevision === 1, "藏品合成版本无效。");
    if (!run.craftingRevision) {
      run.craftingRevision = 1;
      if (run.phase !== "ended" && run.parcels.length < 64) run.parcels.push({ uid: `parcel-${++run.serial}`, label: "藏品合成补给", opened: false, coins: 0, gear: [], parts: [], relics: ["tally", "radio"] });
    }
    need(Links.validateRun(run, stage(run)), "链路加成或次数存档无效。");
    const paidInterest = interestLedger(run);
    need(Array.isArray(paidInterest) && new Set(paidInterest).size === paidInterest.length && paidInterest.every(index => Number.isInteger(index) && nodes[index]), "节点利息记录无效。");
    advanceLinear(run); retireComponents(run); FieldTools.awardLegends(run,{Core,Cards});
    return run;
  }
  function restoreCheckpoint(run, data) {
    const battle = clone(data);
    const migrateSupreme = battle.supremeActives === undefined;
    need(run.phase === "combat" && battle?.campaign?.id === run.id && battle.campaign.node === run.node, "交战存档不匹配。");
    const node = nodes[run.node];
    const savedEnemies = battle.units?.filter(unit => unit.side === "enemy").map(unit => unit.id);
    need(battle.reinforcementVersion === undefined || battle.reinforcementVersion === 1, "增援版本无效。");
    const plan = battle.reinforcementVersion ? encounter(run, node) : node;
    const roster = (battle.waves ? [plan.enemyWaves?.flat()] : [node.enemies, node.legacyEnemies, ...(node.legacyRosters || [])]).find(ids => ids && savedEnemies && ids.length === savedEnemies.length && ids.every(id => savedEnemies.includes(id)));
    need(roster, "交战敌方阵容无效。");
    const expected = [...run.deployed, ...roster];
    need(Array.isArray(battle.units) && battle.units.length === expected.length && new Set(battle.units.map(unit => unit.id)).size === expected.length && battle.units.every(unit => expected.includes(unit.id)), "交战干员存档无效。");
    const integer = (value, min, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(value) && value >= min && value <= max;
    need(node.openingReward ? battle.openingRevival?.version === 1 && integer(battle.openingRevival.count, 0) : battle.openingRevival === undefined, "奖励关救援记录无效。");
    if (battle.waves) {
      const waves = battle.waves;
      need(plan.enemyWaves && waves.total === plan.enemyWaves.length && integer(waves.index, 0, waves.total - 1) && integer(waves.startedRound, 0, battle.round) && (waves.index > 0 || waves.startedRound === 0), "交战波次存档无效。");
      need(battle.units.filter(unit => unit.side === "enemy").every(unit => unit.wave === plan.enemyWaves.findIndex(ids => ids.includes(unit.id)) && (unit.wave === waves.index || unit.hp === 0) && (unit.wave <= waves.index || ["turns", "damage", "healing", "blocked", "energy"].every(key => unit[key] === 0))), "敌方入场状态无效。");
      if (battle.reinforcementVersion) {
        const enemies = battle.units.filter(unit => unit.side === "enemy");
        need(plan.reinforcementVersion === 1 && enemies.every(unit => typeof unit.entered === "boolean" && typeof unit.retired === "boolean" && unit.enemyBase === Core.units[unit.id].enemyBase && unit.reserveOrder === plan.enemyWaves[unit.wave].indexOf(unit.id) && (!unit.retired || unit.entered && unit.hp === 0) && (unit.wave < waves.index ? unit.entered : unit.wave > waves.index ? !unit.entered && !unit.retired : true) && (unit.entered || unit.hp === 0 && ["turns", "damage", "healing", "blocked", "energy"].every(key => unit[key] === 0))), "增援入场记录无效。");
        for (let wave = 0; wave < waves.total; wave++) {
          const members = enemies.filter(unit => unit.wave === wave).sort((a,b) => a.reserveOrder-b.reserveOrder);
          const count = members.filter(unit => unit.entered).length;
          need(members.every((unit,index) => unit.entered === (index < count)) && (wave !== waves.index || count >= Math.min(5,members.length)), "增援次序无效。");
        }
        need(battle.winner !== "ally" || enemies.every(unit => unit.entered), "敌方增援尚未清空。");
      }
      need(battle.winner !== "ally" || waves.index === waves.total - 1 && battle.units.filter(unit => unit.side === "enemy").every(unit => unit.hp === 0), "敌方波次尚未清空。");
    }
    const maxRound = node.openingReward ? Number.MAX_SAFE_INTEGER : (battle.waves?.startedRound || 0) + Core.waveRoundLimit(battle) + 1;
    // A saved layer needs a real triggering event, rather than a fixed gameplay cap.
    const relicStackLimit = (rule, unit) => rule?.unlimited
      ? rule.trigger === "kill" ? battle.actions * roster.length
        : battle.actions + (["attack", "action"].includes(rule.trigger) ? unit.basicShotExtras || 0 : 0)
      : rule?.stacks || 0;
    if (battle.tactic !== undefined) {
      need(battle.tactic === run.doctrine && doctrines[battle.tactic] && battle.tacticState && integer(battle.tacticState.ultimateRound, -1, battle.round), "战术触发记录无效。");
      if (battle.tactics !== undefined) need(Array.isArray(battle.tactics) && battle.tactics.length === run.tactics.length && battle.tactics.every((key, i) => key === run.tactics[i]), "战斗战术与整备不一致。");
      need(!Tactics.Mechanics || Tactics.Mechanics.validateBattle(battle), "战术连携蓄能记录无效。");
    }
    need(!Tactics.Tempo || Tactics.Tempo.validateBattle(battle, doctrines), "行动提前触发记录无效。");
    if (!battle.layout) {
      for (const unit of battle.units.filter(unit => unit.side === "ally")) unit.slot = [0, 4, 5][unit.slot];
      battle.layout = "4-2";
    }
    if (battle.layout === "4-2") {
      for (const unit of battle.units.filter(unit => unit.side === "ally")) { unit.slot = run.positions[unit.id]; unit.track = Core.rear(unit) ? "back" : "front"; }
      battle.queue = battle.queue.filter(id => !Core.offAxis(battle.units.find(unit => unit.id === id)));
      if (battle.prepared && !battle.queue.includes(battle.prepared)) battle.prepared = null;
      battle.layout = Formation.layout;
    }
    if (battle.layout === "3-3") {
      for (const unit of battle.units.filter(unit => unit.side === "ally")) {
        need(Number.isInteger(unit.slot) && unit.slot >= 0 && unit.slot < 6, "旧交战阵位无效。");
        if (unit.slot >= 3) unit.slot++;
        unit.track = Core.rear(unit) ? "back" : "front";
      }
      battle.layout = Formation.layout;
    }
    need(battle.layout === Formation.layout, "战斗阵型无效。");
    if (!battle.rearRules) {
      battle.rearRules = 1; battle.supportQueue = [];
      for (const unit of battle.units) {
        unit.assistRound = -1; unit.supportBlockedRound = -1;
        if (unit.side === "ally") {
          unit.chargeEfficiency = stats(run, unit.id).chargeEfficiency;
          unit.rearPassive = Core.rearPassives[unit.id]; unit.passive = Core.units[unit.id].passive;
        }
        if (unit.supply) { unit.supply.progress *= 100; unit.needlePrimer = 0; }
      }
      battle.queue = battle.queue.filter(id => !Core.offAxis(battle.units.find(unit => unit.id === id)));
      if (battle.prepared && !battle.queue.includes(battle.prepared)) battle.prepared = null;
    }
    need(battle.rearRules === 1 && Array.isArray(battle.supportQueue) && battle.supportQueue.length <= Formation.total * 4 && battle.supportQueue.every(task => expected.includes(task.actor) && Core.units[task.actor].side === "ally" && ["round", "ultimate", "assist", "rally", "legendaryBomb", "legendaryFinale"].includes(task.kind) && (task.target === null || expected.includes(task.target))), "后排支援存档无效。");
    need(battle.supportQueue.every(task => {
      if (['legendaryBomb','legendaryFinale'].includes(task.kind)) return task.target === null && task.actor === (task.kind === 'legendaryBomb' ? 'vyron' : 'butterfly') && Core.isLegendary(battle.units.find(unit=>unit.id===task.actor));
      return task.kind === "assist" ? ["vyron", "luna", "hackclaw", "raptor"].includes(task.actor) && Core.units[task.target]?.side === "enemy" : task.target === null && (task.kind === "rally" ? task.actor === "dwolf" : ["uluru", "hackclaw"].includes(task.actor));
    }), "后排触发条件无效。");
    for (const unit of battle.units) {
      Core.restoreRelicKeys(unit, battle.round, battle.relicRulesVersion !== 2);
      unit.assistRound ??= -1; unit.supportBlockedRound ??= -1;
      if (unit.supportTicks === undefined) {
        unit.supportTicks = Core.rear(unit) ? unit.turns : 0;
        if (Core.rear(unit)) unit.turns = 0;
      }
      need(integer(unit.supportTicks, 0, 1000), "后排支援进度无效。");
      if (unit.side === "ally") { unit.rearPassive = Core.rearPassives[unit.id]; unit.passive = Core.units[unit.id].passive; }
      if (unit.side === "enemy") {
        for (const key of ["name", "role", "portrait", "art", "skills", "faction", "boss", "portraitNote", "passive"]) {
          if (Core.units[unit.id][key] !== undefined) unit[key] = clone(Core.units[unit.id][key]);
        }
        need(unit.enemyLock == null || battle.units.some(target => target.id === unit.enemyLock && target.side === "ally" && !Core.rear(target)), "敌方锁定目标无效。");
      }
      need(unit.burnSource == null || expected.includes(unit.burnSource) && ["uluru", "haavkFlamer"].includes(unit.burnSource), "燃烧来源无效。");
      if (unit.side === "ally" && Core.units[unit.id].portrait.includes("/portraits-verified/")) {
        unit.portrait = Core.units[unit.id].portrait;
        unit.art = clone(Core.units[unit.id].art);
        unit.portraitNote = Core.units[unit.id].portraitNote || "";
      }
      // Old checkpoints omit this counter. New bursts record only rounds beyond
      // the first; validate their physical maximum before accepting extra layers.
      const maxBurst = unit.id === "tempest" ? Core.isLegendary(unit) ? 9 : 3 : unit.id === "dwolf" ? 2 : 1;
      need(integer(unit.basicShotExtras ?? 0, 0, battle.actions * (maxBurst - 1)), "连射叠层计数无效。");
      const gearState = Core.initGearState(unit);
      const equippedKeys = unit.side === "ally" ? RelicSlots.equipped(run.inventory, unit.id) : [null,null,null];
      const equippedRelic = equippedKeys[0];
      unit.relic ??= equippedRelic;
      need(unit.relic === equippedRelic, "交战藏品与佩戴记录不一致。");
      unit.extraRelics ??= [];
      need(Array.isArray(unit.extraRelics) && unit.extraRelics.length===equippedKeys.slice(1).filter(Boolean).length && new Set(unit.extraRelics.map(e=>e.slot)).size===unit.extraRelics.length && unit.extraRelics.every(e=>[1,2].includes(e.slot)&&e.key===equippedKeys[e.slot]&&e.key), "交战额外藏品与佩戴记录不一致。");
      const relicState = Core.initRelicState(unit), relicRule = Systems.stackingRelics[unit.relic]?.rule;
      need(integer(relicState.burstRound, -1, battle.round) && (unit.relic === "heart" || relicState.burstRound === -1) && typeof relicState.rescueUsed === "boolean" && (unit.relic === "ocean" || !relicState.rescueUsed), "至臻藏品触发记录无效。");
      need(integer(relicState.stackRound, -1, battle.round), "藏品本轮叠层记录无效。");
      need(integer(relicState.stacks, 0, relicStackLimit(relicRule, unit)) && integer(relicState.momentum, 0, 199) && integer(relicState.extraRound, -1, battle.round), "藏品叠层记录无效。");
      for (const entry of RelicSlots.entries(unit).filter(e=>e.slot>0)) {
        const memory=entry.memory,rule=Systems.stackingRelics[entry.key]?.rule;
        need(integer(memory.burstRound,-1,battle.round)&&(entry.key==="heart"||memory.burstRound===-1)&&typeof memory.rescueUsed==="boolean"&&(entry.key==="ocean"||!memory.rescueUsed),"额外至臻藏品触发记录无效。");
        need(integer(memory.stackRound,-1,battle.round)&&integer(memory.stacks,0,relicStackLimit(rule, unit))&&integer(memory.momentum,0,199)&&integer(memory.extraRound,-1,battle.round),"额外藏品叠层记录无效。");
      }
      unit.skillLinkRounds ??= {};
      for (const entry of RelicSlots.entries(unit)) if (entry.memory.careRounds !== undefined) {
        const rounds = entry.memory.careRounds;
        need(Systems.relics[entry.key]?.care?.cleanse && rounds && typeof rounds === "object" && !Array.isArray(rounds) && Object.entries(rounds).every(([id, round]) => run.deployed.includes(id) && integer(round, 0, battle.round)), "藏品救援触发记录无效。");
      }
      // The old heart used a rally link; its retired counter has no bearing on the new relic.
      if (unit.relic === "heart") delete unit.skillLinkRounds["relic:heart"];
      const linkKeys = Core.skillLinkSources(battle, unit).map(source => source.key);
      need(unit.skillLinkRounds && typeof unit.skillLinkRounds === "object" && !Array.isArray(unit.skillLinkRounds) && Object.entries(unit.skillLinkRounds).every(([key, round]) => linkKeys.includes(key) && integer(round, 0, battle.round)), "技能联动触发记录无效。");
      need(gearState.stackRules === 2 && integer(gearState.baseArmor, 0) && integer(gearState.baseSpeed, 0) && integer(gearState.baseAttack, 0) && integer(gearState.shield, 0, Math.floor((unit.maxHp + (unit.aerosolField?.reduction || 0)) * .5)), "装备战斗属性无效。");
      need(["counts", "stacks", "rounds"].every(field => gearState[field] && typeof gearState[field] === "object" && !Array.isArray(gearState[field]) && Object.entries(gearState[field]).every(([key, value]) => Systems.gearPassives[key] && Object.values(unit.equipment || {}).includes(key) && integer(value, 0, field === "stacks" ? Systems.gearPassives[key].unlimited ? gearState.counts[key] || 0 : Systems.gearPassives[key].stacks || 0 : field === "rounds" ? battle.round : Number.MAX_SAFE_INTEGER))), "装备触发记录无效。");
      need(integer(unit.assistRound, -1, battle.round) && integer(unit.supportBlockedRound, -1, battle.round) && (!unit.chargeEfficiency || integer(unit.chargeEfficiency, 0, 100)), "充能或协同存档无效。");
      need(unit.cooldownReduction === undefined || integer(unit.cooldownReduction, 0, 1), "技能冷却属性无效。");
      if(battle.offenseRevision===1&&unit.side==='ally'){const expectedCrit=stats(run,unit.id);if(migrateSupreme && equippedKeys.some(key=>['heart','ocean'].includes(key))){unit.critRate=expectedCrit.critRate;unit.critDamage=expectedCrit.critDamage;}need(unit.critRate===expectedCrit.critRate&&unit.critDamage===expectedCrit.critDamage,'战术或藏品暴击属性无效。');}
      for (const [key, value] of Object.entries(Core.statusDefaults)) if (unit[key] === undefined) unit[key] = value;
      need(integer(unit.clover,0,2) && (!unit.clover || unit.id==='rover') && integer(unit.spyCamera,0,2) && (!unit.spyCamera || unit.id==='raptor'), '军犬或摄像头支援状态无效。');
      for (const [key,source] of [['spiderMines','gizmo'],['aerosolField','rover']]) need(unit[key]===null || unit.side==='enemy' && unit[key].source===source && expected.includes(source) && integer(unit[key].ticks,1,2), '新干员持续效果无效。');
      if (unit.aerosolField) need(integer(unit.aerosolField.reduction,0) && unit.aerosolField.reduction===Math.floor((unit.maxHp+unit.aerosolField.reduction)*.15), '气雾针剂生命上限无效。');
      for (const [key,value] of Object.entries(Core.legendaryDefaults)) if (unit[key] === undefined) unit[key] = value;
      need(integer(unit.legendaryChain,0,2) && typeof unit.legendaryRoll === 'boolean' && typeof unit.legendaryBombArmed === 'boolean' && integer(unit.rescueDebt,0), '三星五费状态无效。');
      need((!unit.legendaryChain && !unit.legendaryRoll || unit.id==='tempest' && Core.isLegendary(unit)) && (!unit.legendaryBombArmed || unit.id==='vyron' && Core.isLegendary(unit)) && (!unit.rescueDebt || unit.id==='butterfly' && Core.isLegendary(unit)), '三星五费能力归属无效。');
      need(["stealth", "tempestRush", "rollBoost", "evade", "wounded", "hobbled", "frost", "adrenaline", "suppressed", "riot", "sonar"].every(key => integer(unit[key], 0, 2)) && integer(unit.frostImmune, 0, 3), "新干员状态无效。");
      for (const [key, source] of [["bleeding", "nameless"], ["nano", "butterfly"], ["anchorGuard", "tempest"], ["coldField", "nitro"], ["wireField", "sineva"]]) need(unit[key] === null || unit[key]?.source === source && expected.includes(source) && integer(unit[key].ticks, 1, 2), "干员持续效果无效。");
      need(unit.venom === null || unit.side === 'enemy' && unit.venom?.source === 'toxik' && expected.includes('toxik') && integer(unit.venom.ticks,1,3), '毒蚀状态无效。');
      if (unit.bomb && unit.bomb.stacks === undefined) unit.bomb.stacks = 0;
      need(unit.bomb === null || unit.bomb?.source === 'vyron' && expected.includes('vyron') && integer(unit.bomb.stacks,0), 'C4 蓄能状态无效。');
      need(unit.butterflyRescued === undefined || typeof unit.butterflyRescued === "boolean", "救援记录无效。");
      need(integer(unit.fractured, 0, 2), "碎甲状态无效。");
      need(integer(unit.rescueWindow, 0, 2) && (!unit.rescueWindow || unit.id === "butterfly") && integer(unit.rescueGuard, 0, 1) && (!unit.rescueGuard || unit.side === "ally" && expected.includes("butterfly")), "无人机救援状态无效。");
      need(["marked", "traced", "jammed", "blinded", "overdrive"].every(key => integer(unit[key], 0, 4)), "干员状态存档无效。");
      need(unit.shock === null || ["luna", "tempest"].includes(unit.shock.source) && expected.includes(unit.shock.source) && integer(unit.shock.ticks, 1, 2) || [1,2].includes(battle.buildcraftVersion) && Core.Buildcraft.validBondShock(unit.shock, expected, battle.bondRevision || 1), "电击状态存档无效。");
    }
    need(battle.units.every(unit => ["hp", "maxHp", "attack", "armor", "speed", "slot", "turns", "energy", "stun", "burn", "regen", "damage", "healing", "blocked"].every(key => integer(unit[key], 0)) && unit.hp <= unit.maxHp && unit.maxHp > 0 && unit.slot < (unit.side === "ally" ? Formation.total : 5) && unit.side === Core.units[unit.id].side), "交战属性存档无效。");
    for (const side of ["ally", "enemy"]) { const members = battle.units.filter(unit => unit.side === side && (side !== "enemy" || !battle.reinforcementVersion || unit.entered && !unit.retired)); need(new Set(members.map(unit => `${side === "enemy" && battle.waves ? unit.wave : 0}:${unit.slot}`)).size === members.length, "交战阵位重复。"); }
    const medic = battle.units.find(unit => unit.id === "stinger");
    need(!medic || medic.supply && integer(medic.supply.count, 0, 3) && integer(medic.supply.progress, 0, 199) && integer(medic.needlePrimer || 0, 0, 200), "激素针存档无效。");
    need(["ready", "fighting", "finished"].includes(battle.phase) && [null, "ally", "enemy"].includes(battle.winner) && integer(battle.round, 0, maxRound) && integer(battle.actions, 0, node.openingReward || battle.timeline ? Number.MAX_SAFE_INTEGER : battle.reinforcementVersion ? 3000 : 1000), "战斗状态无效。");
    const visibleIds = Core.visibleUnits(battle).map(unit => unit.id);
    need(Array.isArray(battle.queue) && battle.queue.every(id => visibleIds.includes(id)) && new Set(battle.queue).size === battle.queue.length && (!battle.prepared || battle.prepared === battle.queue[0]), "行动序列无效。");
    need(Core.Timeline.validate(battle, Core.offAxis), "行动值时间轴存档无效。");
    battle.supremeActives ??= {version: 1, actions: 0, spent: {}};
    const active = battle.supremeActives;
    need(active?.version === 1 && integer(active.actions, 0, battle.units.filter(u=>u.side==='ally').reduce((n,u)=>n+u.turns+u.supportTicks,0)) && active.spent && !Array.isArray(active.spent) && typeof active.spent === 'object' && Object.entries(active.spent).every(([id,n])=>battle.units.some(u=>u.id===id&&RelicSlots.entries(u).some(e=>e.key==='ocean'))&&integer(n,0,1+Math.floor(active.actions/3))), '藏品主动次数存档无效。');
    need(["covers", "smoke", "walls"].every(key => ["ally", "enemy"].every(side => integer(battle[key]?.[side], 0))) && battle.dyed && battle.units.every(unit => unit.cooldowns && Object.values(unit.cooldowns).every(value => integer(value, 0))), "技能状态无效。");
    need(battle.bondRevision === undefined || battle.bondRevision === 2 && battle.buildcraftVersion === 2, "羁绊档位版本无效。");
    if (battle.buildcraftVersion !== undefined) {
      need([1,2].includes(battle.buildcraftVersion), "羁绊版本无效。");
      need(battle.units.filter(unit => unit.side === "ally").every(unit => unit.stars === (Cards.primary(run,unit.id)?.stars||1)), "升星记录不匹配。");
      need(battle.buildcraftRounds && typeof battle.buildcraftRounds === "object" && !Array.isArray(battle.buildcraftRounds) && Object.entries(battle.buildcraftRounds).every(([key, value]) => Core.Buildcraft.bonds.some(bond => bond.key === key) && integer(value, 0, battle.round)), "羁绊轮次记录无效。");
      const memory = Core.Buildcraft.initMemory(battle), frontIds = battle.units.filter(unit => unit.side === "ally" && !Core.rear(unit)).map(unit => unit.id);
      const groups = Core.Buildcraft.evaluate(run.deployed, battle.bondRevision || 1);
      const mastered = new Set(groups.filter(bond => bond.mastered).map(bond => bond.key));
      need(memory && Array.isArray(memory.ambush) && new Set(memory.ambush).size === memory.ambush.length && memory.ambush.every(id => frontIds.includes(id) && groups.find(bond => bond.key === "smoke").profile.ambush), "烟幕伏击记录无效。");
      need(memory.counterRounds && typeof memory.counterRounds === "object" && !Array.isArray(memory.counterRounds) && Object.entries(memory.counterRounds).every(([id, round]) => frontIds.includes(id) && mastered.has("defense") && integer(round, 0, battle.round)), "堡垒反击记录无效。");
      need(typeof memory.rescueUsed === "boolean" && (!memory.rescueUsed || groups.find(bond => bond.key === "charge").profile.revive), "羁绊复苏记录无效。");
      const fields = ["procs", "followUps", "bondDamage", "bondHealing", "shield", "starProcs"];
      need(battle.buildcraftStats && typeof battle.buildcraftStats === "object" && !Array.isArray(battle.buildcraftStats) && Object.entries(battle.buildcraftStats).every(([id, values]) => run.deployed.includes(id) && values && fields.every(key => integer(values[key], 0))), "羁绊贡献记录无效。");
      if (battle.buildcraftVersion === 2) {
        if (battle.buildcraftEngine === undefined) Core.Buildcraft.Engines.init(battle);
        need(Core.Buildcraft.Engines.validate(battle, groups), "羁绊质变蓄能或贡献记录无效。");
      }
    }
    need(!Core.Buildcraft.Roles || Core.Buildcraft.Roles.validate(battle), "主羁绊战斗记录无效。");
    need(Links.validateBattle(run, battle), "链路战斗加成或暴击序列无效。");
    need(battle.relicRulesVersion === undefined || [1,2].includes(battle.relicRulesVersion), "藏品规则版本无效。");
    if (battle.relicRulesVersion !== 2) {
      for (const unit of battle.units.filter(unit => unit.side === 'ally')) Core.refreshStackStats(unit);
      battle.relicRulesVersion = 2;
    }
    need(battle.equipmentBenefitsVersion === undefined || battle.equipmentBenefitsVersion === 1, "装备增益版本无效。");
    if (battle.equipmentBenefitsVersion === undefined) {
      for (const unit of battle.units.filter(unit => unit.side === 'ally')) Core.restoreEquipmentBenefits(unit, Cards.primary(run,unit.id)?.stars||1);
      need(battle.units.filter(unit => unit.side === 'ally').every(unit => [unit.attack, unit.speed, unit.gearState.baseAttack, unit.gearState.baseSpeed].every(value => integer(value, 0))), "装备增益迁移结果无效。");
      battle.equipmentBenefitsVersion = 1;
    }
    for (const unit of battle.units.filter(unit => unit.side === 'ally')) {
      const weapon = Core.equipment[unit.equipment?.weapon];
      if (weapon?.legacyName && unit.weapon === weapon.legacyName) unit.weapon = weapon.name;
    }
    return battle;
  }
  const tooling = { stripAll: (run, id) => command(run, { type: "strip", id }), craft: (run, key) => command(run, { type: "craft", key }) };
  const api = { operators, relics, relicRecipes, relicRecipeFor, doctrines, activeTactics, tacticChoice, tacticQualities: Tactics.qualities, tacticDescription: Tactics.describe, tacticThreat, tacticRiskText: Tactics.riskText, nodes, planes, challenges, challengeReward, components, recipes, investments, tooling, interest, streakBonus, capacity, upgradePrice, relicCapacity, createRun, command, settle, battlePreview, canBypass, loadouts, positions, stats, bonuses, synergies, star, salePrice, saleSelection, operatorSalePrice, itemInfo, itemSlot, restore, restoreCheckpoint, economy };
  Object.assign(api, { refreshPrice, tacticProgress, recruitPrice, encounter, planeFlow });
  Object.assign(api, { Cards, recruitSpace: (run,id)=>Cards.purchase(run,id,capacity(run)) });
  Object.assign(api,{FieldTools,previewPlace(run,id,slot,cardUid){const draft=clone(run);try{place(draft,id,slot,cardUid);Cards.capacityCheck(draft,Cards.bench(run).length);return {allowed:true,deployed:draft.deployed,positions:draft.positions};}catch(error){return {allowed:false,reason:error.message};}}});
  Object.assign(api, { routeChoices, marketRefreshPrice: run=>BranchMarket.refreshPrice(run,nodes), marketRarity: run=>BranchMarket.rarity(stage(run)) });
  Object.assign(api, { recruitRates, recruitCost, recruitChances, recruitDistribution });
  api.recruitOdds = run => (Core.Buildcraft.Roles?.odds(run, recruitPool(run)) || []).map(role => ({ ...role, probability: recruitDistribution(run).filter(entry => Core.Buildcraft.Roles.roleOf(entry.id)?.key === role.key).reduce((sum, entry) => sum + entry.probability, 0) }));
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.HaffCampaign = api;
})(typeof window === "undefined" ? globalThis : window);
