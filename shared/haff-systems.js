(function (root) {
  "use strict";
  const Enemies = typeof module !== "undefined" && module.exports ? require("./haff-enemies.js") : root.HaffEnemies;
  const planes = [
    { name: "零号大坝", areas: ["水泥厂外围", "军营物资间", "大坝黑市", "行政楼警戒线", "行政楼 · 赛伊德"], scale: [.52, 0, 0, .9, 1.15] },
    { name: "航天基地", areas: ["外围警戒区", "货运物资库", "基地黑市", "发射区封锁线", "发射区 · 重装指挥组"], scale: [1.4, 0, 0, 1.8, 2.15] },
    { name: "潮汐监狱", areas: ["监狱外围", "监区物资室", "监狱黑市", "核心封锁区", "撤离通道 · 典狱守备组"], scale: [2.35, 0, 0, 2.8, 3.2] }
  ];
  const nodes = planes.flatMap((plane, p) => plane.areas.map((name, depth) => {
    const base = p * 5, kind = ["fight", "supply", "market", "elite", "boss"][depth];
    return { name, plane: p, depth: [0, 1, 1, 2, 3][depth], kind, scale: plane.scale[depth],
      enemies: kind === "boss" ? p === 0 ? ["shield", "saeed", "gunner"] : ["shield", "gunner", p === 1 ? "baseCommander" : "prisonCommander"] : kind === "fight" && p === 0 ? ["gunner"] : ["shield", "gunner"],
      next: depth === 0 ? [base + 1, base + 2, base + 3] : depth < 3 ? [base + 3] : depth === 3 ? [base + 4] : p < 2 ? [base + 5] : [],
      note: kind === "boss" ? p === 0 ? "赛伊德与护卫据守行政楼。战败扣除 45 完整度，存活则继续前往航天基地。" : p === 1 ? "同人首领遭遇：重装守军封锁出口。战败扣除 50 完整度，存活则继续前往潮汐监狱。" : "同人首领遭遇：突破最后防线才能撤离。战败扣除 55 完整度并结束行动。" : kind === "market" ? "交易窗口开启。可购买配件、签订投资协议并调整构筑。" : kind === "supply" ? "短暂停火，选择一项物资或整备补给。" : "前台承受火力，后台提供远程支援。突破后选择下一条路线。"
    };
  }));
  for (const node of nodes) {
    node.legacyEnemies = [...node.enemies];
    if (node.kind === "boss" && node.plane >= 1) node.enemies.push("flankGunner");
    if (node.kind === "boss" && node.plane === 2) node.enemies.push("rearShield");
    if (node.kind === "elite" && node.plane >= 1) node.enemies.push("flankGunner");
  }
  // Append nodes to preserve IDs used by existing saves and battle checkpoints.
  planes.forEach((plane, p) => {
    const supply = nodes.length, boss = p * 5 + 4;
    nodes[boss - 1].next = [supply]; nodes[boss].depth = 4;
    nodes.push({ name: `${plane.name} · 战术补给`, plane: p, depth: 3, kind: "tactical", scale: 0, enemies: [], next: [boss], note: "首领战前增援：免费接收一名干员及其携带装备。" });
  });
  planes.forEach((plane, p) => {
    const challenge = nodes.length, tactical = 15 + p;
    nodes[p * 5 + 3].next = [challenge]; nodes[tactical].depth = 4; nodes[p * 5 + 4].depth = 5;
    nodes.push({ name: `${plane.name} · 高难挑战`, plane: p, depth: 3, kind: "challenge", scale: [.95, 1.55, 2.4][p], enemies: ["shield", "gunner", "flankGunner", ...(p >= 1 ? ["rearShield"] : []), ...(p === 2 ? ["prisonCommander"] : [])], next: [tactical], note: "突破封锁后进入战术补给。胜利可获得挑战卡标明的额外奖励。" });
  });
  planes.forEach((plane, p) => {
    const entry = nodes[p * 5], next = [...entry.next], id = nodes.length;
    for (const node of nodes.filter(node => node.plane === p && node.depth > 0)) node.depth++;
    entry.next = [id];
    nodes.push({ name: `${plane.name} · 战术决策`, plane: p, depth: 1, kind: "tactic", scale: 0, enemies: [], next, note: "从共享战术池免费三选一；高品质增强收益与敌人，同流派仅可升级。" });
  });
  for (const [index, encounter] of Object.entries(Enemies.encounters)) {
    const node = nodes[index];
    node.legacyRosters = [node.enemies.slice(), ...(node.legacyEnemies ? [node.legacyEnemies.slice()] : [])];
    Object.assign(node, encounter);
    const names = encounter.enemies.map(id => Enemies.units[id].name).join("、");
    node.note = `${names}据守此处。${node.kind === "boss" ? node.plane === 1 ? "战败扣除 50 完整度，存活则继续前往潮汐监狱。" : "战败扣除 55 完整度并结束行动。" : node.kind === "challenge" ? "胜利获得挑战额外奖励，随后进入战术补给。" : "突破防线后继续前进。"}`;
  }
  planes[1].areas[4] = nodes[9].name; planes[2].areas[4] = nodes[14].name;
  for (const node of nodes.filter(node => node.kind === "market")) node.note = "交易窗口开启。可招募干员、调整配装并进行应急垫资。";
  const BranchMarket = typeof module !== 'undefined' && module.exports ? require('./haff-branch-market.js') : root.HaffBranchMarket;
  BranchMarket?.install(nodes, planes);
  const openingNodes = [nodes.length, nodes.length + 1];
  nodes.push(
    { name: "零号大坝 · 登陆接敌", plane: 0, depth: 0, kind: "fight", openingReward: 1, scale: .35, enemies: ["gunner"], next: [openingNodes[1]], cash: 100000, note: "奖励关：1 名弱敌，干员倒地自动满血复活，不限次数。胜利获得 10 万基础哈夫币与一把基础枪械。" },
    { name: "零号大坝 · 物资护送", plane: 0, depth: 1, kind: "fight", openingReward: 2, scale: .4, enemies: ["gunner", "flankGunner"], next: [...nodes[0].next], refreshes: 2, note: "奖励关：2 名弱敌，干员倒地自动满血复活，不限次数。胜利获得两件紫色藏品素材与两次额外免费刷新。" }
  );
  const challenges = {
    fortress: { name: "铁壁封锁", level: "高危", icon: "shield", effect: "敌方生命 +60%，防护 +10。", modifiers: { hp: 1.6, armor: 10 }, cash: 60000, parts: ["plate", "fabric"], loss: 26 },
    crossfire: { name: "交叉火力", level: "高危", icon: "crosshair", effect: "敌方攻击 +40%，速度 +10%。", modifiers: { attack: 1.4, speed: 1.1 }, cash: 80000, parts: ["barrel", "grip"], loss: 28 },
    blitz: { name: "急行突袭", level: "高危", icon: "zap", effect: "敌方速度 +30%，攻击 +15%。", modifiers: { speed: 1.3, attack: 1.15 }, cash: 70000, parts: ["gas", "optic"], loss: 26 },
    juggernaut: { name: "重装清场", level: "极危", icon: "package", effect: "首领级重装增援，至少两波，每波至少 8 人。以同位面首领强度为基准再提高 10%，生命额外 +100%、攻击 +25%、防护 +8。", modifiers: { hp: 2, attack: 1.25, armor: 8 }, cash: 160000, parts: ["medical", "battery"], relic: "radio", loss: 32 },
    suppress: { name: "弹雨封锁", level: "极危", icon: "radio", effect: "首领级火力增援，至少两波，每波至少 8 人。以同位面首领强度为基准再提高 10%，攻击额外 +75%、生命 +35%、速度 +15%。", modifiers: { attack: 1.75, hp: 1.35, speed: 1.15 }, cash: 180000, parts: ["optic", "stock"], relic: "binoculars", loss: 34 },
    lockdown: { name: "全域清剿", level: "极危", icon: "route", effect: "首领级联合清剿，至少两波，每波至少 8 人。以同位面首领强度为基准再提高 10%，生命额外 +65%、攻击 +45%、防护 +12。", modifiers: { hp: 1.65, attack: 1.45, armor: 12 }, cash: 170000, parts: ["gas", "plate", "battery"], relic: "binoculars", loss: 34 }
  };
  const components = {
    gas: { name: "导气组件", quality: "blue", price: 25000 },
    optic: { name: "光学模组", quality: "blue", price: 25000 },
    plate: { name: "复合插板", quality: "blue", price: 25000, icon: "vest" },
    barrel: { name: "精密枪管", quality: "blue", price: 25000, icon: "rifle" },
    grip: { name: "稳定握把", quality: "blue", price: 25000, icon: "smg" },
    stock: { name: "轻量枪托", quality: "blue", price: 25000, icon: "rifle" },
    battery: { name: "高能电池", quality: "blue", price: 25000, icon: "helmet" },
    medical: { name: "医疗模组", quality: "blue", price: 25000, icon: "vest" },
    fabric: { name: "战术织物", quality: "blue", price: 25000, icon: "vest" },
    cooling: { name: "冷却循环芯片", quality: "blue", price: 25000, icon: "helmet", passive: "普通战术技能冷却减少 1 次自身行动，最低为 1；同类减冷却不叠加，不影响大招充能与激素针补充。" }
  };
  const componentBonuses = { gas: { chargeEfficiency: 10 }, optic: { attack: 4 }, plate: { armor: 4 }, barrel: { attack: 6 }, grip: { speed: 5 }, stock: { speed: 8 }, battery: { energy: 12 }, medical: { hp: 35 }, fabric: { hp: 20, speed: 3 }, cooling: { cooldownReduction: 1 } };
  for (const [key, bonus] of Object.entries(componentBonuses)) components[key].bonus = bonus;
  const advancedGear = {
    tuned416: { name: "K416 · 循环改装", slot: "weapon", quality: "gold", attack: 16, chargeEfficiency: 45, passive: "高速导气：充能效率 +45%。" },
    reconHelmet: { name: "战术观测头盔", slot: "helmet", quality: "gold", armor: 10, speed: 8, initialEnergy: 20, passive: "预判链路：初始充能 +20。" },
    relayVest: { name: "储能战术背心", slot: "armor", quality: "gold", hp: 85, armor: 12, chargeEfficiency: 25, passive: "储能供给：充能效率 +25%。" },
    stableM7: { name: "M7 · 稳固射击", slot: "weapon", quality: "gold", attack: 28, speed: -8, chargeEfficiency: 10 },
    marksman416: { name: "K416 · 精准校准", slot: "weapon", quality: "gold", attack: 26, speed: -5, initialEnergy: 10 },
    lightBison: { name: "野牛 · 轻装弹鼓", slot: "weapon", quality: "gold", attack: 4, speed: 18, attackEnergy: 14, passive: "普通攻击额外回复 14 能量；蜂医改为补充 20 点补针进度。" },
    circuitMP5: { name: "MP5 · 电控循环", slot: "weapon", quality: "gold", attack: 8, speed: 8, chargeEfficiency: 55 },
    rescueVest: { name: "急救供能背心", slot: "armor", quality: "gold", hp: 80, chargeEfficiency: 40 },
    assaultVest: { name: "复合突击护甲", slot: "armor", quality: "gold", hp: 110, armor: 15, speed: 2 },
    mobileVest: { name: "轻量机动背心", slot: "armor", quality: "gold", hp: 55, speed: 14 },
    linkHelmet: { name: "战术链路头盔", slot: "helmet", quality: "gold", armor: 8, speed: 4, chargeEfficiency: 35 },
    medicVest: { name: "医疗后勤背心", slot: "armor", quality: "gold", hp: 125, chargeEfficiency: 15 },
    rapidUzi: { name: "UZI · 疾速回转", slot: "weapon", quality: "gold", attack: 6, speed: 15, attackEnergy: 15, passive: "普通攻击额外回复 15 能量；蜂医改为补充 20 点补针进度。" },
    siegeM7: { name: "M7 · 攻坚火力", slot: "weapon", quality: "gold", attack: 34, speed: -12, killEnergy: 25, passive: "主动行动每击败一名敌人，额外回复 25 能量。" },
    traumaVest: { name: "创伤防护重甲", slot: "armor", quality: "gold", hp: 150, armor: 12, speed: -8 },
    commandHelmet: { name: "预充指挥头盔", slot: "helmet", quality: "gold", armor: 14, initialEnergy: 35 },
    scoutHelmet: { name: "轻量侦察头盔", slot: "helmet", quality: "gold", armor: 5, speed: 15, initialEnergy: 15 },
    tacticalVest: { name: "灵巧战术背心", slot: "armor", quality: "gold", hp: 65, armor: 8, speed: 10 },
    quick416: { name: "K416 · 快反循环", slot: "weapon", quality: "gold", attack: 16, chargeEfficiency: 20, cooldownReduction: 1 },
    resetHelmet: { name: "战术复位头盔", slot: "helmet", quality: "gold", armor: 9, initialEnergy: 15, cooldownReduction: 1 },
    coolingVest: { name: "冷却医疗背心", slot: "armor", quality: "gold", hp: 90, armor: 6, cooldownReduction: 1 }
  };
  for (const key of ["quick416", "resetHelmet", "coolingVest"]) advancedGear[key].passive = components.cooling.passive;
  const gearPassives = {
    k416: { name: "精准热机", trigger: "attack", kind: "attack", value: .05, stacks: 4, text: "每次普攻后攻击提高 5%，最多 4 层。" },
    mp5: { name: "轻装循环", trigger: "attack", kind: "speed", value: .08, stacks: 3, text: "每次普攻后速度提高 8%，最多 3 层。" },
    m7: { name: "战地收割", trigger: "kill", kind: "heal", value: .1, text: "击败敌人后恢复自身 10% 最大生命。" },
    bison: { name: "弹鼓还没打完", trigger: "attack", kind: "followup", value: .5, every: 3, text: "每第 3 次普攻后，追加一次 50% 攻击力的射击；原目标倒地时转火。" },
    uzi: { name: "越打越快", trigger: "attack", kind: "speed", value: .1, stacks: 3, text: "每次普攻后速度提高 10%，最多 3 层。" },
    helmet2: { name: "战况监听", trigger: "action", kind: "energy", value: 5, text: "常规行动后回复 5 基础能量。" },
    helmet4: { name: "掩护节拍", trigger: "action", kind: "shield", value: .05, every: 2, text: "每第 2 次常规行动后，获得最大生命 5% 的个人护盾。" },
    helmet5: { name: "紧急防护", trigger: "lowHp", kind: "shield", value: .25, once: true, text: "受伤后存活且生命不高于 40% 时，获得最大生命 25% 的个人护盾，每场一次。" },
    vest2: { name: "应急止血", trigger: "lowHp", kind: "heal", value: .12, once: true, text: "受伤后存活且生命不高于 40% 时，恢复最大生命的 12%，每场一次。" },
    vest4: { name: "反应插板", trigger: "hurt", kind: "shield", value: .06, perRound: true, text: "受伤后获得最大生命 6% 的个人护盾，每轮一次，从下一次受击生效。" },
    vest5: { name: "重甲适应", trigger: "hurt", kind: "armor", value: 2, stacks: 5, text: "每次受到生命伤害后防护提高 2，最多 5 层。" },
    tuned416: { name: "大招回路", trigger: "ultimate", kind: "energy", value: 20, text: "大招结算后回复 20 基础能量。" },
    reconHelmet: { name: "小队节拍", trigger: "action", kind: "teamEnergy", value: 6, perRound: true, text: "常规行动后，其他存活队友回复 6 基础能量，每轮一次。" },
    relayVest: { name: "动能回收", trigger: "hurt", kind: "energy", value: 10, perRound: true, text: "受到生命伤害后回复 10 基础能量，每轮一次。" },
    stableM7: { name: "火力升温", trigger: "attack", kind: "attack", value: .08, stacks: 5, text: "每次普攻后攻击提高 8%，最多 5 层。" },
    marksman416: { name: "第三发校准", trigger: "attack", kind: "followup", value: .8, every: 3, text: "每第 3 次普攻后追加一次 80% 攻击力射击；原目标倒地时转火。" },
    lightBison: { name: "加长弹鼓", trigger: "attack", kind: "followup", value: .6, every: 3, text: "每第 3 次普攻后追加一次 60% 攻击力射击；原目标倒地时转火。" },
    circuitMP5: { name: "持续供电", trigger: "action", kind: "energy", value: 12, text: "常规行动后回复 12 基础能量。" },
    rescueVest: { name: "急救广播", trigger: "ultimate", kind: "teamHeal", value: .06, perRound: true, text: "大招结算后，全体存活队友各恢复自身最大生命的 6%，每轮一次。" },
    assaultVest: { name: "复合硬化", trigger: "hurt", kind: "armor", value: 3, stacks: 5, text: "每次受到生命伤害后防护提高 3，最多 5 层。" },
    mobileVest: { name: "机动惯性", trigger: "action", kind: "speed", value: .15, stacks: 5, text: "每次常规行动后速度提高 15%，最多 5 层，影响下一轮行动排序。" },
    linkHelmet: { name: "终结接力", trigger: "ultimate", kind: "teamEnergy", value: 8, perRound: true, text: "大招结算后，其他存活队友回复 8 基础能量，每轮一次。" },
    medicVest: { name: "专业急救", trigger: "healing", kind: "healing", value: .25, text: "自身提供的治疗量提高 25%，包含技能、持续治疗和装备治疗，不影响复活。" },
    rapidUzi: { name: "疾速连射", trigger: "attack", kind: "speed", value: .12, stacks: 5, text: "每次普攻后速度提高 12%，最多 5 层。" },
    siegeM7: { name: "首领猎手", trigger: "damage", kind: "bossDamage", value: .3, text: "对首领造成的伤害提高 30%。" },
    traumaVest: { name: "创伤自救", trigger: "lowHp", kind: "heal", value: .3, once: true, text: "受伤后存活且生命不高于 40% 时，恢复最大生命的 30%，每场一次。" },
    commandHelmet: { name: "终结护卫", trigger: "ultimate", kind: "shield", value: .18, text: "每次大招结算后获得最大生命 18% 的个人护盾。" },
    scoutHelmet: { name: "主动侦测", trigger: "action", kind: "mark", value: 1, perRound: true, text: "常规行动后标记攻击最高的敌人至本轮结束，枪械伤害 +20% 且无视烟幕，每轮一次。" },
    tacticalVest: { name: "战地续航", trigger: "action", kind: "heal", value: .05, text: "每次常规行动后恢复自身最大生命的 5%。" },
    quick416: { name: "射击供能", trigger: "attack", kind: "energy", value: 10, text: "普攻后额外回复 10 基础能量。" },
    resetHelmet: { name: "终结复位", trigger: "ultimate", kind: "cooldown", value: 1, perRound: true, text: "释放大招后，所有正在冷却的普通战术技能再缩短 1 次行动，每轮一次，可使技能就绪；不影响大招充能和补针。" },
    coolingVest: { name: "循环急救", trigger: "action", kind: "heal", value: .04, text: "每次常规行动后恢复自身最大生命的 4%。" }
  };
  const recipes = [
    { output: "tuned416", parts: ["gas", "optic"] },
    { output: "reconHelmet", parts: ["optic", "plate"] },
    { output: "relayVest", parts: ["gas", "plate"] },
    { output: "stableM7", parts: ["barrel", "grip"] },
    { output: "marksman416", parts: ["barrel", "optic"] },
    { output: "lightBison", parts: ["stock", "grip"] },
    { output: "circuitMP5", parts: ["battery", "gas"] },
    { output: "rescueVest", parts: ["battery", "medical"] },
    { output: "assaultVest", parts: ["fabric", "plate"] },
    { output: "mobileVest", parts: ["stock", "fabric"] },
    { output: "linkHelmet", parts: ["optic", "battery"] },
    { output: "medicVest", parts: ["medical", "fabric"] },
    { output: "rapidUzi", parts: ["grip", "gas"] },
    { output: "siegeM7", parts: ["barrel", "plate"] },
    { output: "traumaVest", parts: ["medical", "plate"] },
    { output: "commandHelmet", parts: ["battery", "plate"] },
    { output: "scoutHelmet", parts: ["optic", "stock"] },
    { output: "tacticalVest", parts: ["grip", "fabric"] },
    { output: "quick416", parts: ["cooling", "gas"] },
    { output: "resetHelmet", parts: ["cooling", "battery"] },
    { output: "coolingVest", parts: ["cooling", "medical"] }
  ];
  const extraRecipes = [
    { parts: ["gas", "gas"], output: "twinGas416", name: "K416 · 双导气回路", slot: "weapon", stats: { attack: 12, chargeEfficiency: 55 }, passive: "tuned416" },
    { parts: ["gas", "barrel"], output: "ventedM7", name: "M7 · 泄压枪管", slot: "weapon", stats: { attack: 26, chargeEfficiency: 25, speed: -5 }, passive: "stableM7" },
    { parts: ["gas", "stock"], output: "runnerBison", name: "野牛 · 冲锋回路", slot: "weapon", stats: { attack: 8, speed: 16, chargeEfficiency: 20 }, passive: "bison" },
    { parts: ["gas", "medical"], output: "infusionVest", name: "加压输液背心", slot: "armor", stats: { hp: 90, armor: 5, chargeEfficiency: 25 }, passive: "rescueVest" },
    { parts: ["gas", "fabric"], output: "ventMeshVest", name: "散热网格背心", slot: "armor", stats: { hp: 60, speed: 10, chargeEfficiency: 25 }, passive: "relayVest" },
    { parts: ["optic", "optic"], output: "rangefinderHelmet", name: "双目测距头盔", slot: "helmet", stats: { attack: 12, armor: 7, initialEnergy: 20 }, passive: "scoutHelmet" },
    { parts: ["optic", "grip"], output: "steadySight416", name: "K416 · 稳瞄握持", slot: "weapon", stats: { attack: 22, speed: 8 }, passive: "marksman416" },
    { parts: ["optic", "medical"], output: "triageHelmet", name: "伤情识别头盔", slot: "helmet", stats: { hp: 50, armor: 7, chargeEfficiency: 15 }, passive: "medicVest" },
    { parts: ["optic", "fabric"], output: "camoObserverHelmet", name: "伪装观测头盔", slot: "helmet", stats: { hp: 35, armor: 7, speed: 10 }, passive: "scoutHelmet" },
    { parts: ["optic", "cooling"], output: "reconResetHelmet", name: "快照侦察头盔", slot: "helmet", stats: { attack: 6, armor: 8, cooldownReduction: 1 }, passive: "scoutHelmet" },
    { parts: ["plate", "plate"], output: "bastionVest", name: "双层壁垒重甲", slot: "armor", stats: { hp: 80, armor: 26, speed: -10 }, passive: "vest5" },
    { parts: ["plate", "grip"], output: "bracedVest", name: "抗冲击支撑护甲", slot: "armor", stats: { hp: 75, armor: 17, speed: 3 }, passive: "vest4" },
    { parts: ["plate", "stock"], output: "mobilePlateVest", name: "轻托插板护甲", slot: "armor", stats: { hp: 70, armor: 12, speed: 12 }, passive: "helmet4" },
    { parts: ["plate", "cooling"], output: "cooledPlateVest", name: "冷却插板护甲", slot: "armor", stats: { hp: 70, armor: 14, cooldownReduction: 1 }, passive: "vest4" },
    { parts: ["barrel", "barrel"], output: "heavyBarrelM7", name: "M7 · 双重精锻", slot: "weapon", stats: { attack: 38, speed: -14 }, passive: "marksman416" },
    { parts: ["barrel", "stock"], output: "carbine416", name: "K416 · 机动卡宾", slot: "weapon", stats: { attack: 24, speed: 9 }, passive: "k416" },
    { parts: ["barrel", "battery"], output: "capacitorM7", name: "M7 · 蓄能枪管", slot: "weapon", stats: { attack: 26, initialEnergy: 25, speed: -5 }, passive: "quick416" },
    { parts: ["barrel", "medical"], output: "rescue416", name: "K416 · 战地救援", slot: "weapon", stats: { attack: 18, hp: 40 }, passive: "m7" },
    { parts: ["barrel", "fabric"], output: "wrappedM7", name: "M7 · 隔热缠带", slot: "weapon", stats: { attack: 24, hp: 30, speed: 4 }, passive: "siegeM7" },
    { parts: ["barrel", "cooling"], output: "cooledBarrelM7", name: "M7 · 快冷枪管", slot: "weapon", stats: { attack: 26, speed: -4, cooldownReduction: 1 }, passive: "stableM7" },
    { parts: ["grip", "grip"], output: "doubleGripMP5", name: "MP5 · 双点稳固", slot: "weapon", stats: { attack: 16, speed: 12 }, passive: "marksman416" },
    { parts: ["grip", "battery"], output: "poweredGripMP5", name: "MP5 · 电控握把", slot: "weapon", stats: { attack: 12, speed: 10, initialEnergy: 25 }, passive: "circuitMP5" },
    { parts: ["grip", "medical"], output: "rescueHarness", name: "救援牵引背心", slot: "armor", stats: { hp: 90, speed: 8 }, passive: "medicVest" },
    { parts: ["grip", "cooling"], output: "quickGripMP5", name: "MP5 · 快反握持", slot: "weapon", stats: { attack: 14, speed: 8, cooldownReduction: 1 }, passive: "mp5" },
    { parts: ["stock", "stock"], output: "featherBison", name: "野牛 · 极轻折叠", slot: "weapon", stats: { attack: 6, speed: 24 }, passive: "lightBison" },
    { parts: ["stock", "battery"], output: "poweredStockUzi", name: "UZI · 蓄能枪托", slot: "weapon", stats: { attack: 10, speed: 15, initialEnergy: 25 }, passive: "rapidUzi" },
    { parts: ["stock", "medical"], output: "rescueRunnerVest", name: "轻装急救背心", slot: "armor", stats: { hp: 85, speed: 14 }, passive: "coolingVest" },
    { parts: ["stock", "cooling"], output: "quickStockBison", name: "野牛 · 快反折叠", slot: "weapon", stats: { attack: 8, speed: 18, cooldownReduction: 1 }, passive: "bison" },
    { parts: ["battery", "battery"], output: "dualCellHelmet", name: "双电芯指挥头盔", slot: "helmet", stats: { armor: 8, initialEnergy: 40, chargeEfficiency: 20 }, passive: "reconHelmet" },
    { parts: ["battery", "fabric"], output: "conductiveVest", name: "导电织物背心", slot: "armor", stats: { hp: 70, speed: 6, chargeEfficiency: 35 }, passive: "relayVest" },
    { parts: ["medical", "medical"], output: "fieldHospitalVest", name: "移动急救站背心", slot: "armor", stats: { hp: 140, chargeEfficiency: 10 }, passive: "medicVest" },
    { parts: ["fabric", "fabric"], output: "doubleWeaveVest", name: "双层机动织甲", slot: "armor", stats: { hp: 75, armor: 5, speed: 16 }, passive: "mobileVest" },
    { parts: ["fabric", "cooling"], output: "coolMeshVest", name: "冷却战术织甲", slot: "armor", stats: { hp: 70, speed: 10, cooldownReduction: 1 }, passive: "helmet4" },
    { parts: ["cooling", "cooling"], output: "dualResetHelmet", name: "双芯战术复位头盔", slot: "helmet", stats: { armor: 8, chargeEfficiency: 20, initialEnergy: 20, cooldownReduction: 1 }, passive: "resetHelmet" }
  ];
  // Each pair has a stable item ID; existing recipes and saved equipment keep their identity.
  for (const recipe of extraRecipes) {
    const icon = recipe.slot === "weapon" ? /^(野牛|MP5|UZI)/.test(recipe.name) ? "smg" : "rifle" : recipe.slot === "helmet" ? "helmet" : "vest";
    advancedGear[recipe.output] = { name: recipe.name, slot: recipe.slot, icon, quality: "gold", ...recipe.stats, passive: recipe.stats.cooldownReduction ? components.cooling.passive : "" };
    gearPassives[recipe.output] = { ...gearPassives[recipe.passive] };
    recipes.push({ output: recipe.output, parts: [...recipe.parts] });
  }
  const skillFamilies = {
    recon: { label: "侦察", actions: ["reconArrow", "decode", "resonance", "sonar", "falcon", "spyCamera"], examples: "露娜侦察箭、骇爪破译、回响共振与声呐、银翼无人机与摄像头" },
    blast: { label: "爆破", actions: ["bomb", "fire", "missile", "triple", "frag"], examples: "威龙磁吸炸弹、乌鲁鲁燃烧弹与巡飞弹、红狼三联装、露娜破片" },
    control: { label: "控制", actions: ["air", "knife", "flash", "wallSpike", "breachFlash", "grapple", "thermal", "toxicMist", "firefly", "echoFlash", "resonance"], examples: "威龙击倒、深蓝钩爪、疾风电刺、骇爪干扰、蛊致盲等控制技能" },
    mobility: { label: "机动", actions: ["dash", "roll", "anchor", "silent", "overdrive"], examples: "威龙推进、疾风翻滚与锚点、无名潜袭、红狼超载" },
    guard: { label: "防护", actions: ["cover", "riotSuit", "anchor"], examples: "乌鲁鲁掩体、深蓝防爆套装、疾风锚点" },
    cold: { label: "低温", actions: ["dewar", "thermal", "cryoBurst"], examples: "液氮的杜瓦、热压与低温弹幕" },
    affliction: { label: "持续伤害", actions: ["fire", "volt", "wallSpike", "razor", "razorWire", "dewar", "toxicMist"], examples: "乌鲁鲁燃烧、露娜电击、疾风电刺、无名旋刃、深蓝铁丝网、液氮冷却区、蛊毒蚀" },
    rally: { label: "团队增益或救援", actions: ["nano", "tradeWind", "rescueSwarm", "adrenaline", "firefly"], examples: "蝶的纳米救援、信风与救援群，蛊的肾上腺素与流萤" },
    smoke: { label: "烟幕", actions: ["smoke", "drone", "wolfSmoke", "tradeWind"], examples: "红狼突破烟幕、蝶信风、蜂医烟幕与烟墙" }
  };
  for (const [tag, actions] of Object.entries({blast:['sonicFrag','spiderNest','hunterSpider','falcon','pulseGrenade'],control:['sonicTrap','sonicQuake','hunterSpider','pulseGrenade','irritantSmoke'],affliction:['spiderNest','aerosol'],rally:['aerosolAid'],smoke:['smartSmoke','irritantSmoke']})) skillFamilies[tag].actions.push(...actions);
  const linkedGear = {
    rangefinderHelmet: { name: "锁定即开火", tag: "recon", kind: "markedShot", value: .75, text: "侦察技能后，对一名已标记敌人追加 75% 攻击力射击。" },
    camoObserverHelmet: { name: "情报接力", tag: "recon", kind: "teamEnergy", value: 10, text: "侦察技能后，其他存活队员各回复 10 基础能量。" },
    bracedVest: { name: "压制复位", tag: "control", kind: "cooldown", value: 1, text: "控制技能后，正在冷却的普通技能缩短 1 次行动。" },
    wrappedM7: { name: "爆破回声", tag: "blast", kind: "splash", value: .3, text: "爆破技能后，对所有存活敌人追加 30% 攻击力爆炸伤害。" },
    capacitorM7: { name: "创伤引爆", tag: "affliction", kind: "dotBurst", value: .5, text: "持续伤害技能后，对最多 3 名带燃烧、流血、电击、冷却区、铁丝网或毒蚀的敌人追加 50% 攻击力伤害，不消耗原效果。" },
    mobilePlateVest: { name: "突进保险", tag: "mobility", kind: "shield", value: .18, text: "机动技能后，为自身获得最大生命 18% 的护盾。" },
    cooledPlateVest: { name: "持盾成阵", tag: "guard", kind: "teamShield", value: .08, text: "防护技能后，前排各获得自身最大生命 8% 的护盾。" },
    conductiveVest: { name: "冷凝传导", tag: "cold", kind: "cold", value: 1, text: "低温技能后，为一名仍处于低温或冷却区的敌人追加 1 层低温，冻结免疫期间无效。" },
    rescueHarness: { name: "振奋接力", tag: "rally", kind: "teamEnergy", value: 10, text: "团队增益或救援技能后，其他存活队员各回复 10 基础能量。" }
  };
  for (const [key, rule] of Object.entries(linkedGear)) {
    gearPassives[key] = { ...rule, trigger: "skill", text: `${rule.text} 每位佩戴者每轮一次，不由普攻、协同或追加伤害触发。适配：${skillFamilies[rule.tag].examples}。` };
  }
  // Keep former limits as legacy metadata; new battles grow without a stack cap.
  for (const rule of Object.values(gearPassives)) if (rule.stacks) {
    rule.unlimited = true;
    if (rule.kind === "armor") {
      rule.legacyFlatArmor = rule.value;
      rule.value = rule.value === 3 ? .15 : .10;
      rule.text = `每次受到生命伤害后，防护提高开战防护的 ${Math.round(rule.value * 100)}%，层数无上限。`;
    } else rule.text = rule.text.replace(/最多 \d+ 层/g, "层数无上限");
  }
  for (const rule of Object.values(gearPassives)) if (["attack", "action"].includes(rule.trigger)) {
    if (rule.trigger === "action") rule.text = rule.text.replaceAll("常规行动", "行动").replace("影响下一轮行动排序", "实时缩短后续行动的等待");
    rule.text += " 连射普攻每发分别触发，协同与追加伤害不计。";
  }
  const investments = {
    bounty: { name: "战地承包协议", price: 30000, effect: "每次结算，每击败一名敌人额外返利 8000 哈夫币。" },
    fund: { name: "物流概念股", price: 50000, effect: "战斗胜利时按结算前本金分红 4%，每场上限 30000；失败无分红。" },
    salvage: { name: "资产保全协议", price: 25000, effect: "装备出售折旧由 50% 降至 30%；不影响干员和藏品。" }
  };
  for (const item of Object.values(investments)) item.quality = "purple";
  const relics = typeof module !== "undefined" && module.exports ? require("./haff-relics.js") : root.HaffRelics;
  for (const relic of Object.values(relics)) if (relic.link) relic.effect += ` 适配：${skillFamilies[relic.link.tag].examples}。`;
  const stackingRelics = Object.fromEntries(Object.entries(relics).filter(([, item]) => item.rule));
  // Complete unordered-pair tables: 3 purple -> 6 gold -> 21 red.
  const relicRecipes = [
    ['tally', 'tally', 'rotor'],
    ['tally', 'radio', 'lighter'],
    ['tally', 'tea', 'filter'],
    ['radio', 'radio', 'binoculars'],
    ['radio', 'tea', 'pulseCore'],
    ['tea', 'tea', 'vein'],
    ['rotor', 'rotor', 'bladeServer'],
    ['rotor', 'lighter', 'rocketFuel'],
    ['rotor', 'filter', 'mechanical'],
    ['rotor', 'binoculars', 'graphicsCard'],
    ['rotor', 'pulseCore', 'workerBee'],
    ['rotor', 'vein', 'caviar'],
    ['lighter', 'lighter', 'milShell'],
    ['lighter', 'filter', 'experiment'],
    ['lighter', 'binoculars', 'milDrone'],
    ['lighter', 'pulseCore', 'spinoClaw'],
    ['lighter', 'vein', 'robotVacuum'],
    ['filter', 'filter', 'carbonPlate'],
    ['filter', 'binoculars', 'claudiusBust'],
    ['filter', 'pulseCore', 'gtiAntenna'],
    ['filter', 'vein', 'scalpel'],
    ['binoculars', 'binoculars', 'cinemaCamera'],
    ['binoculars', 'pulseCore', 'quantum'],
    ['binoculars', 'vein', 'milRadio'],
    ['pulseCore', 'pulseCore', 'mandelUnit'],
    ['pulseCore', 'vein', 'laptop'],
    ['vein', 'vein', 'defibrillator']
  ].map(([first, second, output]) => {
    const parts = [first, second].sort();
    return { id: parts.join('+'), parts, output };
  });
  for (const [key, relic] of Object.entries(relics)) {
    relic.dropOnly = ['heart','ocean','watch'].includes(key);
    const recipe = relicRecipes.find(recipe => recipe.output === key);
    relic.acquisition = relic.dropOnly ? '稀有掉落 / 黑市低概率出售 · 不可合成' : recipe ? `唯一配方：${recipe.parts.map(part => relics[part].name).join(' + ')}；也可在黑市购买` : '紫色融合素材 · 可直接佩戴或在黑市购买';
  }
  // Retained only to recognize older saves; new runs use relic fusion exclusively.
  const legacyComponentRelics = { gas:'radio', optic:'radio', plate:'tea', barrel:'tally', grip:'tally', stock:'radio', battery:'radio', medical:'tea', fabric:'tea', cooling:'radio' };
  const legacyRelicKeys = Object.freeze({"silver":"tea","telescope":"radio","dogtags":"tally","thermal":"radio","gel":"tea","phone":"binoculars","camera":"binoculars","blueprint":"filter","pirateCoin":"rotor","goblet":"filter","ssd":"rotor","guardRing":"filter","employeeTrophy":"pulseCore","neuralTerminal":"pulseCore","titanium":"filter","milExplosives":"lighter","ballisticComputer":"rotor","satcom":"binoculars","dripCoffee":"rotor","governor":"rotor","oximeter":"vein","medal":"pulseCore","goldenGazelle":"graphicsCard","diskArray":"mandelUnit","flightRecorder":"mechanical","milTerminal":"cinemaCamera","ventilator":"defibrillator","champagne":"milRadio","flintlock":"graphicsCard","goldBar":"spinoClaw","portableRadar":"claudiusBust","milInfo":"quantum","tankModel":"carbonPlate","ifvModel":"carbonPlate","classifiedServer":"laptop","cloudArray":"scalpel","vacuum":"milDrone","resuscitator":"caviar","fuel":"lighter"});
  // All equipment benefits are non-negative. Keep removed costs only for old battle migration.
  function removeGearPenalties(catalogue) {
    const removed = {};
    for (const [key, item] of Object.entries(catalogue)) {
      for (const stat of ['hp','attack','armor','speed','chargeEfficiency','initialEnergy','cooldownReduction','attackEnergy','killEnergy']) {
        if (typeof item[stat] === 'number' && item[stat] < 0) {
          (removed[key] ||= {})[stat] = -item[stat]; item[stat] = 0;
        }
      }
    }
    return removed;
  }
  const legacyGearPenalties = removeGearPenalties(advancedGear);
  // Model names verified against https://www.playdeltaforce.com/events/hq/ .
  // Stable keys retain every saved item, numeric bonus and passive trigger.
  const firearms = {
    tuned416: ['M4A1', '突击步枪'], stableM7: ['AKM', '突击步枪'],
    marksman416: ['SR-25', '射手步枪'], lightBison: ['P90', '冲锋枪'],
    circuitMP5: ['QCQ171', '冲锋枪'], rapidUzi: ['Vector', '冲锋枪'],
    siegeM7: ['M250', '通用机枪'], quick416: ['SG552', '突击步枪'],
    twinGas416: ['K437', '突击步枪'], ventedM7: ['SCAR-H', '战斗步枪'],
    runnerBison: ['Vityaz', '冲锋枪'], steadySight416: ['AUG', '突击步枪'],
    heavyBarrelM7: ['AWM', '狙击步枪'], carbine416: ['CAR-15', '突击步枪'],
    capacitorM7: ['AS Val', '突击步枪'], rescue416: ['QBZ95-1', '突击步枪'],
    wrappedM7: ['M249', '轻机枪'], cooledBarrelM7: ['G3', '战斗步枪'],
    doubleGripMP5: ['SMG-45', '冲锋枪'], poweredGripMP5: ['MP7', '冲锋枪'],
    quickGripMP5: ['AKS-74', '突击步枪'], featherBison: ['MK4', '冲锋枪'],
    poweredStockUzi: ['AK-12', '突击步枪'], quickStockBison: ['SR-3M', '紧凑突击步枪']
  };
  for (const [key, [name, firearmType]] of Object.entries(firearms)) {
    const item = advancedGear[key];
    Object.assign(item, { legacyName: item.name, name, firearmType, icon: firearmType === '冲锋枪' ? 'smg' : 'rifle', acquisition: '战场概率回收 · 后续位面更容易获得' });
  }
  const Tempo = typeof module !== 'undefined' && module.exports ? require('./haff-tempo.js') : root.HaffTempo;
  Tempo?.installGear(advancedGear);
  Object.assign(advancedGear.heavyBarrelM7, { basicMultiplier: 3, basicCooldown: 1 });
  advancedGear.heavyBarrelM7.passive = '重型栓动：普攻每发伤害倍率 ×3；射击后需间隔 1 次自身常规行动才能再次普攻，可使用其他技能或主动装填。大招、免费行动与普通技能减冷却不推进装填；协同、追加伤害和技能不享受此倍率。';
  const economy = {
    startCoins: 250000, starterCash: 50000, parcelCash: [30000, 40000, 50000],
    supplyCash: 50000, victoryCash: 60000, planeCash: 20000, bossCash: 50000,
    defeatCash: 30000, battleRefreshes: 1, streakStep: 10000, streakCap: 30000, streakThresholds: [2, 3, 5],
    dropChance: { fight: .28, elite: .38, challenge: .38, boss: .5 },
    advancedWeaponChance: [.06, .22, .4], advancedArmorChance: [.04, .15, .28],
    challengeCashFactor: .5, challengePlaneCash: 10000
  };
  const api = { planes, nodes, openingNodes, challenges, components, legacyComponentRelics, legacyRelicKeys, recipes: [], relicRecipes, advancedGear, gearPassives, investments, relics, stackingRelics, skillFamilies, removeGearPenalties, legacyGearPenalties, firearms, economy };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.HaffSystems = api;
})(typeof window === "undefined" ? globalThis : window);
