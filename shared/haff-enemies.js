(function (root) {
  "use strict";
  // Identities follow Delta Force; timings and multipliers are turn-based adaptations.
  const actions = {
    guard: { name: "盾阵推进", detail: "为敌方前线建立 110 点掩体，再为自己补充 12% 生命上限的护盾。" },
    suppress: { name: "机枪压制", detail: "对前台目标造成 95% 攻击力伤害，使其下一次行动伤害降低 20%。" },
    flame: { name: "火焰封路", detail: "对两名前台目标造成 65% 攻击力的范围伤害，并附加两次燃烧。" },
    lock: { name: "红光锁定", detail: "锁定生命比例最低的前台干员，不造成伤害；下一次行动进行狙击。" },
    snipe: { name: "定点狙杀", detail: "对已锁定目标造成 155% 攻击力枪械伤害。烟幕、护盾、击倒和干扰均可应对。" },
    bombard: { name: "自动战车 · 火箭齐射", detail: "德穆兰指挥战车，对全体前台干员造成 65% 攻击力的范围伤害。击倒或干扰德穆兰可打断本次指令。" },
    approach: { name: "重锤逼近", detail: "推进并获得 15% 生命上限护盾；下一次行动挥动石工锤。" },
    hammer: { name: "石工锤重击", detail: "对前台造成 145% 攻击力伤害，穿过部分护甲与掩体，并使其减速一次行动。" },
    fog: { name: "迷幻毒雾", detail: "令全体前台减速两次行动，并重伤一次行动；毒雾本身不造成伤害。" },
    revolver: { name: "左轮速射", detail: "朝同一名前台连续射击三发，每发造成 40% 攻击力伤害。" },
    evadeShot: { name: "翻滚反击", detail: "射击造成 85% 攻击力伤害，随后规避下一次命中，使该次伤害降低 50%。" },
    ward: { name: "卫队协防", detail: "为全部存活守军补充各自 12% 生命上限的个人护盾。" },
    command: { name: "钢铁秩序", detail: "为全体守军补充 12% 生命上限护盾，并强化一次行动：伤害 +20%、排序速度 +25。" },
    judgment: { name: "ASH-12 · 审判", detail: "对生命比例最低的前台干员进行两发重弹射击，每发造成 70% 攻击力伤害。" },
    attack: { name: "警戒射击", detail: "攻击最前方的前台干员，造成 100% 攻击力枪械伤害。" }
  };
  const units = {};
  function define(id, name, faction, hp, attack, speed, armor, weapon, pattern, extra = {}) {
    units[id] = { id, name, faction, side: "enemy", hp, attack, speed, armor, weapon,
      role: `${faction} · ${extra.boss ? "首领" : "特殊兵种"}`, color: faction === "哈夫克" ? 0x80bbd0 : 0xcb9982,
      pattern, skills: [...new Set(pattern)].map(key => ({ id: `enemy_${key}`, name: actions[key].name, detail: actions[key].detail, kind: "敌方行为" })), ...extra };
  }
  define("haavkShield", "哈夫克盾兵", "哈夫克", 255, 48, 79, 15, "防暴盾 / 冲锋枪", ["guard", "attack"]);
  define("haavkGunner", "哈夫克机枪兵", "哈夫克", 275, 70, 83, 12, "加特林机枪", ["attack", "suppress"]);
  define("haavkFlamer", "哈夫克喷火兵", "哈夫克", 240, 66, 88, 10, "火焰喷射器", ["flame", "flame"]);
  define("haavkSniper", "哈夫克狙击兵", "哈夫克", 165, 88, 98, 5, "狙击步枪", ["lock", "snipe"]);
  // Keep the two shipped commander IDs stable for saves and boss-damage equipment.
  define("baseCommander", "德穆兰", "哈夫克", 430, 92, 97, 16, "M700", ["lock", "snipe", "bombard"], { boss: true });
  define("prisonGuard", "潮汐监狱狱警", "典狱长卫队", 235, 62, 97, 12, "突击步枪", ["suppress", "attack"]);
  define("prisonShield", "监狱防暴盾兵", "典狱长卫队", 270, 49, 80, 16, "防暴盾 / 冲锋枪", ["guard", "attack"]);
  define("wardenGuard", "典狱长近卫", "典狱长卫队", 265, 62, 86, 14, "突击步枪", ["ward", "attack"]);
  define("prisonCommander", "格赫罗斯 · 典狱长", "典狱长卫队", 445, 92, 96, 18, "ASH-12", ["command", "suppress", "judgment"], { boss: true });
  define("prisonHammer", "死囚护卫 · 锤哥", "渡鸦势力", 280, 72, 82, 12, "石工锤", ["approach", "hammer"]);
  define("prisonHammerFlank", "死囚护卫 · 侧翼", "渡鸦势力", 235, 64, 89, 10, "石工锤", ["approach", "hammer"]);
  define("prisonRaven", "渡鸦", "渡鸦势力", 360, 82, 106, 13, "左轮手枪", ["fog", "revolver", "evadeShot"], { boss: true });
  function art(ids, file, size, crop) {
    for (const id of ids) Object.assign(units[id], { portrait: `assets/haff-war/enemies/${file}`, art: { size, crop } });
  }
  art(["haavkGunner"], "haavk-guide.jpg", [750,5272], [325,1730,410,470]);
  art(["haavkFlamer"], "haavk-guide.jpg", [750,5272], [85,2360,400,450]);
  art(["haavkShield"], "haavk-guide.jpg", [750,5272], [260,3195,470,480]);
  art(["haavkSniper"], "haavk-guide.jpg", [750,5272], [10,3965,375,430]);
  art(["baseCommander"], "desmoulins.png", [928,452], [210,20,450,432]);
  art(["prisonCommander"], "warden-close.jpg", [1080,608], [405,100,255,450]);
  art(["prisonGuard","wardenGuard"], "warden-close.jpg", [1080,608], [730,165,235,420]);
  art(["prisonShield"], "warden-close.jpg", [1080,608], [160,180,220,420]);
  art(["prisonRaven"], "raven-portrait.jpg", [640,360], [260,5,240,330]);
  art(["prisonHammer","prisonHammerFlank"], "hammer.svg", [256,256], [0,0,255,255]);
  for (const id of ["prisonHammer","prisonHammerFlank"]) units[id].portraitNote = "兵种图标 · 暂未取得可用立绘";
  // Verified in-game death-row guard: closed helmet, prison uniform and raised masonry hammer.
  // Override before vanguard cloning so every hammer guard receives the same corrected identity.
  art(["prisonHammer","prisonHammerFlank"], "prison-hammer-game-v1.jpg", [1080,477], [460,136,190,341]);
  for (const id of ["prisonHammer","prisonHammerFlank"]) units[id].portraitNote = "";
  // Separate identities keep damage credit and delayed effects scoped to each wave.
  for (const id of ["haavkShield", "haavkGunner", "haavkSniper", "prisonGuard", "prisonShield", "prisonHammer", "prisonHammerFlank"]) {
    const source = units[id], key = `${id}Vanguard`;
    units[key] = { ...source, id: key, hp: Math.round(source.hp * .7), attack: Math.round(source.attack * .8) };
  }
  const encounters = {
    5: { name: "中控桥 · 哈夫克警戒", enemies: ["haavkShield", "haavkSniper"] },
    8: { name: "总裁室 · 火焰封锁", enemies: ["haavkShield", "haavkFlamer", "haavkGunner"] },
    9: { name: "发射区 · 德穆兰", enemies: ["haavkShield", "baseCommander", "haavkGunner", "haavkSniper"] },
    19: { name: "离心机室 · 哈夫克精锐", enemies: ["haavkShield", "haavkGunner", "haavkFlamer", "haavkSniper"] },
    10: { name: "监区入口 · 狱警封锁", enemies: ["prisonShield", "prisonGuard"] },
    13: { name: "牢房区 · 死囚暴动", enemies: ["prisonHammer", "prisonHammerFlank"] },
    20: { name: "猎鸦行动 · 渡鸦", enemies: ["prisonHammer", "prisonRaven", "prisonHammerFlank"] },
    14: { name: "典狱长办公室 · 格赫罗斯", enemies: ["prisonShield", "prisonCommander", "wardenGuard", "prisonGuard", "haavkSniper"] }
  };
  for (const id of [8, 9, 19]) encounters[id].enemyWaves = [
    ["haavkShieldVanguard", "haavkGunnerVanguard", "haavkSniperVanguard"], encounters[id].enemies.slice()
  ];
  for (const id of [10, 14]) encounters[id].enemyWaves = [
    ["prisonShieldVanguard", "prisonGuardVanguard"], encounters[id].enemies.slice()
  ];
  for (const id of [13, 20]) encounters[id].enemyWaves = [
    ["prisonHammerVanguard", "prisonHammerFlankVanguard"], encounters[id].enemies.slice()
  ];
  function encounter(run, node, boss, registry, challenge) {
    const rank = run.careerRun?.rank || 0, extreme = challenge?.level === "极危";
    const source = extreme ? boss : node;
    if (!['fight','elite','boss','challenge'].includes(node.kind) || rank < 3 && !extreme) return { enemies: node.enemies, enemyWaves: node.enemyWaves, enemyScale: node.scale };
    const waves = (source.enemyWaves || [source.enemies]).map(ids => ids.slice());
    const targetWaves = Math.max(waves.length, extreme || rank >= 14 ? 2 : 1, rank >= 24 ? 3 : 1);
    const pool = node.plane === 0 ? ["shield", "gunner", "flankGunner"] : node.plane === 1
      ? ["haavkShield", "haavkGunner", "haavkFlamer", "haavkSniper"]
      : source.enemies.includes("prisonRaven") ? ["prisonHammer", "prisonHammerFlank"] : ["prisonShield", "prisonGuard", "wardenGuard"];
    while (waves.length < targetWaves) waves.unshift(pool.slice(0, 3));
    const size = 5 + Math.floor(Math.max(0, rank - 3) / 3) + node.plane + (extreme ? 3 : node.kind === "boss" ? 1 : 0);
    // Stable instance IDs isolate damage, statuses and rewards for identical reinforcements.
    const enemyWaves = waves.map((ids, wave) => {
      while (ids.length < size) ids.push(pool[(ids.length + wave) % pool.length]);
      return ids.map((id, index) => {
        const key = `${id}_reinforcement_${wave}_${index}`;
        registry[key] = { ...registry[id], id: key, enemyBase: id };
        if (units[id]) units[key] = registry[key];
        return key;
      });
    });
    return { enemyWaves, enemyScale: extreme ? Math.max(node.scale, boss.scale * 1.1) : node.scale, reinforcementVersion: 1 };
  }
  function plan(state, unit) {
    const data = units[unit.id]; if (!data) return null;
    const key = unit.jammed ? "attack" : data.pattern[unit.turns % data.pattern.length];
    return { id: `enemy_${key}`, name: unit.jammed ? "设备干扰 · 警戒射击" : actions[key].name, key };
  }
  const api = { units, encounters, actions, plan, encounter };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.HaffEnemies = api;
})(typeof window === "undefined" ? globalThis : window);
