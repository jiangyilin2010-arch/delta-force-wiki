(function (root) {
  "use strict";
  const Buildcraft = typeof module !== "undefined" && module.exports ? require("./haff-buildcraft.js") : root.HaffBuildcraft;
  const Systems = typeof module !== "undefined" && module.exports ? require("./haff-systems.js") : root.HaffSystems;
  const Enemies = typeof module !== "undefined" && module.exports ? require("./haff-enemies.js") : root.HaffEnemies;
  const RelicSlots = typeof module !== "undefined" && module.exports ? require("./haff-relic-slots.js") : root.HaffRelicSlots;
  const Tactics = typeof module !== "undefined" && module.exports ? require("./haff-tactics.js") : root.HaffTactics;
  const Links = typeof module !== "undefined" && module.exports ? require("./haff-link-tree.js") : root.HaffLinkTree;
  const Timeline = typeof module !== "undefined" && module.exports ? require("./haff-timeline.js") : root.HaffTimeline;
  const damageRules = Object.freeze({ shieldMultiplier: 2, smokeMultiplier: .6, wallMultiplier: .5, fractureReduction: .3, knockdownBonus: .35, razorPower: 1.6, razorReturnPower: 1, handCannonPower: .7, wolfShotPower: .9 });
  /** @type {import('./haff-events').EventBus} */
  const events = (typeof module !== "undefined" && module.exports ? require("./haff-events.js") : root.HaffEvents).bus;
  const units = {
    shepherd: { id: "shepherd", name: "牧羊人", role: "工程", side: "ally", hp: 365, attack: 43, speed: 99, armor: 13, portrait: "assets/haff-war/portraits-verified/shepherd-pending.svg", art: { size: [445, 206], crop: [120, 0, 205, 206] }, color: 0xe2c88f, weapon: "M7", portraitNote: "官方立绘待补" },
    gizmo: { id: "gizmo", name: "比特", role: "工程", side: "ally", hp: 330, attack: 48, speed: 103, armor: 10, portrait: "assets/haff-war/portraits-verified/gizmo-pending.svg", art: { size: [445, 206], crop: [120, 0, 205, 206] }, color: 0xe7b271, weapon: "K416", portraitNote: "官方立绘待补" },
    raptor: { id: "raptor", name: "银翼", role: "侦察", side: "ally", hp: 305, attack: 50, speed: 111, armor: 7, portrait: "assets/haff-war/portraits-verified/raptor-pending.svg", art: { size: [445, 206], crop: [120, 0, 205, 206] }, color: 0xa5cced, weapon: "K416", portraitNote: "官方立绘待补" },
    rover: { id: "rover", name: "旅人", role: "支援", side: "ally", hp: 325, attack: 44, speed: 106, armor: 8, portrait: "assets/haff-war/portraits-verified/rover-pending.svg", art: { size: [445, 206], crop: [120, 0, 205, 206] }, color: 0xa8d599, weapon: "MP5", portraitNote: "官方立绘待补" },
    sineva: { id: "sineva", name: "深蓝", role: "工程", side: "ally", hp: 420, attack: 42, speed: 94, armor: 17, portrait: "assets/haff-war/portraits/sineva.jpg", art: { size: [445, 206], crop: [115, 0, 210, 206] }, color: 0x8eb9e2, weapon: "M7" },
    nitro: { id: "nitro", name: "液氮", role: "工程", side: "ally", hp: 345, attack: 44, speed: 100, armor: 11, portrait: "assets/haff-war/portraits/nitro.jpg", art: { size: [445, 206], crop: [125, 0, 200, 206] }, color: 0x91e6ef, weapon: "K416" },
    toxik: { id: "toxik", name: "蛊", role: "支援", side: "ally", hp: 305, attack: 35, speed: 105, armor: 7, portrait: "assets/haff-war/portraits/toxik.jpg", art: { size: [445, 206], crop: [125, 0, 190, 206] }, color: 0xc3d88b, weapon: "MP5" },
    echo: { id: "echo", name: "回响", role: "侦察", side: "ally", hp: 310, attack: 47, speed: 109, armor: 7, portrait: "assets/haff-war/portraits/echo.jpg", art: { size: [445, 206], crop: [125, 0, 200, 206] }, color: 0xe1be8e, weapon: "K416" },
    butterfly: { id: "butterfly", name: "蝶", role: "支援", side: "ally", hp: 300, attack: 34, speed: 103, armor: 6, portrait: "assets/haff-war/butterfly-official.jpg", art: { size: [445, 206], crop: [138, 0, 177, 206] }, color: 0x9be2cd, weapon: "MP5" },
    tempest: { id: "tempest", name: "疾风", role: "突击", side: "ally", hp: 315, attack: 53, speed: 119, armor: 6, portrait: "assets/haff-war/tempest-official.jpg", art: { size: [445, 206], crop: [127, 0, 168, 206] }, color: 0xf1a17a, weapon: "K416" },
    nameless: { id: "nameless", name: "无名", role: "突击", side: "ally", hp: 310, attack: 52, speed: 112, armor: 7, portrait: "assets/haff-war/nameless-official.jpg", art: { size: [445, 206], crop: [138, 8, 182, 198] }, color: 0xb8c3d3, weapon: "MP5" },
    dwolf: { id: "dwolf", name: "红狼", role: "突击", side: "ally", hp: 340, attack: 55, speed: 108, armor: 7, portrait: "assets/haff-war/dwolf-wiki.jpg", art: { size: [1024, 576], crop: [255, 20, 570, 556] }, color: 0xef9588, weapon: "K416", passive: "战术滑铲：外骨骼开启期间，受到的枪械伤害降低 15%。（回合制改编）" },
    luna: { id: "luna", name: "露娜", role: "侦察", side: "ally", hp: 295, attack: 49, speed: 105, armor: 6, portrait: "assets/haff-war/luna-wiki.jpg", art: { size: [1024, 576], crop: [310, 30, 410, 546] }, color: 0x86d9de, weapon: "K416", passive: "敌情追踪：造成伤害后标记敌人至本轮结束。标记使其受到的枪械伤害增加 20%，且无法受烟幕保护。（回合制改编）" },
    hackclaw: { id: "hackclaw", name: "骇爪", role: "侦察", side: "ally", hp: 285, attack: 46, speed: 115, armor: 5, portrait: "assets/haff-war/hackclaw-wiki.jpg", art: { size: [1024, 576], crop: [290, 20, 435, 556] }, color: 0xc5b4e8, weapon: "MP5", passive: "隐匿消声：首轮受到的枪械伤害降低 20%。（回合制改编）" },
    vyron: { id: "vyron", name: "威龙", role: "突击", side: "ally", hp: 330, attack: 54, speed: 110, armor: 8, portrait: "assets/haff-war/vyron-wiki.jpg", art: { size: [1024, 683], crop: [275, 0, 560, 683] }, color: 0xe8c17b, weapon: "K416", skills: [
      { name: "虎蹲炮", detail: "压缩空气弹击倒全部存活敌人，使其各跳过下一次行动；不造成直接伤害。", kind: "群体控制" },
      { name: "动力推进", detail: "推进后衔接射击；下一轮行动提前。射击伤害来自主武器。", kind: "机动" },
      { name: "磁吸炸弹", detail: "在目标身上附着炸弹，目标下次行动前引爆，并波及其他敌人。", kind: "爆破" }
    ] },
    uluru: { id: "uluru", name: "乌鲁鲁", role: "工程", side: "ally", hp: 400, attack: 43, speed: 101, armor: 16, portrait: "assets/haff-war/uluru-wiki.jpg", art: { size: [1024, 683], crop: [315, 0, 560, 683] }, color: 0x85bce1, weapon: "M7", skills: [
      { name: "速凝掩体", detail: "在己方前排建立 145 耐久的掩体，吸收正面射击；爆炸可穿过部分掩体。", kind: "防御" },
      { name: "巡飞弹", detail: "能量满时发射制导飞弹，命中后散射子弹药，对敌方全体造成爆炸伤害。", kind: "爆破" },
      { name: "复合型燃烧弹", detail: "在敌方前排制造燃烧区域，在目标行动前持续造成伤害。", kind: "封锁" }
    ] },
    stinger: { id: "stinger", name: "蜂医", role: "支援", side: "ally", hp: 290, attack: 32, speed: 98, armor: 6, portrait: "assets/haff-war/stinger-wiki.jpg", art: { size: [1024, 683], crop: [265, 0, 515, 683] }, color: 0x87e2aa, weapon: "MP5", skills: [
      { name: "激素枪", detail: "治疗生命比例最低的友军 82 点，并附加两次持续恢复。可治疗自己。", kind: "治疗" },
      { name: "蜂巢科技烟雾弹", detail: "部署烟雾后用激素枪染烟，形成两轮治疗烟，降低受到的枪械伤害。", kind: "烟幕" },
      { name: "烟幕无人机", detail: "铺设烟墙，降低全队受到的枪械伤害。", kind: "掩护" }
    ] },
    saeed: { id: "saeed", name: "赛伊德", role: "零号大坝首领", side: "enemy", hp: 510, attack: 117, speed: 104, armor: 19, portrait: "assets/haff-war/saeed-handbook.jpg", art: { size: [1920, 800], crop: [620, 0, 570, 790] }, color: 0xf37c76, weapon: "机枪", skills: [
      { name: "机枪压制", detail: "连续射击己方前排。下一行动的攻击意图会提前显示。", kind: "首领行为" },
      { name: "扫射火力", detail: "蓄力后扫射所有存活干员；可被虎蹲炮打断本次行动。", kind: "首领行为" }
    ] },
    gunner: { id: "gunner", name: "阿萨拉机枪兵", role: "火力支援", side: "enemy", hp: 220, attack: 77, speed: 86, armor: 7, portrait: "assets/haff-war/ahsarah-official-guide.jpg", art: { size: [750, 4113], crop: [65, 910, 360, 390] }, color: 0xdfaa77, weapon: "M134", skills: [
      { name: "掩护射击", detail: "持续攻击前排目标，掩护首领行动。", kind: "敌方行为" }
    ] },
    shield: { id: "shield", name: "阿萨拉盾兵", role: "防御", side: "enemy", hp: 265, attack: 54, speed: 77, armor: 13, portrait: "assets/haff-war/ahsarah-official-guide.jpg", art: { size: [750, 4113], crop: [290, 2905, 440, 540] }, color: 0xd1b293, weapon: "UZI / 防暴盾", skills: [
      { name: "持盾推进", detail: "建立正面防护，优先承受枪械攻击；爆炸能越过部分防护。", kind: "敌方行为" }
    ] }
  };
  for (const [id, name] of [["baseCommander", "基地重装指挥官"], ["prisonCommander", "监狱守备指挥官"]]) {
    units[id] = { ...units.gunner, id, name, role: "同人首领 · 临时守军立绘", hp: 440, attack: 95, armor: 18, speed: 95 };
  }
  units.flankGunner = { ...units.gunner, id: "flankGunner", name: "侧翼机枪兵", attack: 62, speed: 89 };
  units.rearShield = { ...units.shield, id: "rearShield", name: "后卫盾兵", hp: 230, armor: 11 };
  for (const id of ["sineva", "nitro", "toxik", "echo", "butterfly", "tempest", "nameless", "dwolf", "luna", "hackclaw", "vyron", "uluru", "stinger", "saeed", "gunner", "shield", "baseCommander", "prisonCommander", "flankGunner", "rearShield"]) {
    units[id].portrait = `assets/haff-war/portraits/${id}.jpg`;
  }
  const slots = ["前排", "后排·左", "后排·右"];
  Object.assign(units, Enemies.units);
  units.saeed.boss = true;
  // The local roster currently contains stand-in portraits for these four operators.
  for (const [id, standIn] of Object.entries({ sineva: "uluru", nitro: "stinger", toxik: "vyron", echo: "nameless" })) {
    units[id].art = units[standIn].art;
    units[id].portraitNote = "临时立绘";
  }
  // Verified official replacements supersede the legacy stand-ins without overwriting their files.
  for (const [id, extension, crop] of [
    ["sineva", "png", [40, 0, 275, 206]],
    ["toxik", "jpg", [100, 0, 240, 206]],
    ["nitro", "jpg", [140, 0, 215, 206]],
    ["echo", "jpg", [140, 0, 215, 206]]
  ]) {
    units[id].portrait = `assets/haff-war/portraits-verified/${id}-official-v1.${extension}`;
    units[id].art = { size: [445, 206], crop };
    units[id].portraitNote = "";
  }
  const Formation = typeof module !== "undefined" && module.exports ? require("./haff-formation-rules.js") : root.HaffFormation;
  const boardSlots = Formation.slots;
  const defaultPositions = order => Object.fromEntries(order.map((id, index) => [id, Formation.defaultOrder[index]]));
  const equipmentSlots = { weapon: "武器", helmet: "头盔", armor: "防弹衣" };
  const equipment = {
    k416: { name: "K416", slot: "weapon", quality: "purple", attack: 8, speed: 0 },
    m7: { name: "M7", slot: "weapon", quality: "gold", attack: 20, speed: -10 },
    mp5: { name: "MP5", slot: "weapon", quality: "blue", attack: 0, speed: 8 },
    bison: { name: "野牛", slot: "weapon", quality: "green", attack: -6, speed: 12 },
    uzi: { name: "UZI", slot: "weapon", quality: "green", attack: -10, speed: 16 },
    helmet2: { name: "二级轻型头盔", slot: "helmet", quality: "green", armor: 3, speed: 0 },
    helmet4: { name: "四级防弹头盔", slot: "helmet", quality: "purple", armor: 9, speed: -3 },
    helmet5: { name: "五级重型头盔", slot: "helmet", quality: "gold", armor: 15, speed: -8 },
    vest2: { name: "二级轻型防弹衣", slot: "armor", quality: "green", hp: 25, armor: 4, speed: 0 },
    vest4: { name: "四级战术防弹衣", slot: "armor", quality: "purple", hp: 65, armor: 11, speed: -6 },
    vest5: { name: "五级重型防弹衣", slot: "armor", quality: "gold", hp: 110, armor: 18, speed: -15 }
  };
  const legacyGearPenalties = { ...Systems.legacyGearPenalties, ...Systems.removeGearPenalties(equipment) };
  const defaultLoadouts = {
    shepherd: { weapon: "m7", helmet: "helmet2", armor: "vest2" },
    gizmo: { weapon: "k416", helmet: "helmet2", armor: "vest2" },
    raptor: { weapon: "k416", helmet: "helmet2", armor: "vest2" },
    rover: { weapon: "mp5", helmet: "helmet2", armor: "vest2" },
    sineva: { weapon: "m7", helmet: "helmet4", armor: "vest4" },
    nitro: { weapon: "k416", helmet: "helmet2", armor: "vest2" },
    toxik: { weapon: "mp5", helmet: "helmet2", armor: "vest2" },
    echo: { weapon: "k416", helmet: "helmet2", armor: "vest2" },
    butterfly: { weapon: "mp5", helmet: "helmet2", armor: "vest2" },
    tempest: { weapon: "k416", helmet: "helmet2", armor: "vest2" },
    nameless: { weapon: "mp5", helmet: "helmet2", armor: "vest2" },
    dwolf: { weapon: "k416", helmet: "helmet2", armor: "vest2" },
    luna: { weapon: "k416", helmet: "helmet2", armor: "vest2" },
    hackclaw: { weapon: "mp5", helmet: "helmet2", armor: "vest2" },
    vyron: { weapon: "k416", helmet: "helmet2", armor: "vest2" },
    uluru: { weapon: "m7", helmet: "helmet4", armor: "vest4" },
    stinger: { weapon: "mp5", helmet: "helmet2", armor: "vest2" }
  };
  Object.assign(equipment, Systems.advancedGear);
  const catalogs = {
    shepherd: [
      { id: "attack", name: "普攻", target: "enemy", detail: "使用已装备武器射击一个敌人。", cooldown: 0 },
      { id: "sonicTrap", name: "声波陷阱", target: "enemy", area: "row", detail: "在目标同排布设声波陷阱：各造成 70% 攻击力伤害，随后两次行动速度 −20、伤害 −20%。（回合制触发改编）", cooldown: 2 },
      { id: "sonicFrag", name: "强化型破片手雷", target: "enemy", detail: "主目标受到 140% 攻击力爆炸伤害，其他敌人受到 65%。", cooldown: 2 },
      { id: "sonicQuake", name: "声波震慑", target: "enemy", area: "all", detail: "声波扫过全场，造成 110% 攻击力伤害；全体敌人两次行动速度 −20、伤害 −20%，清除狙击锁定，下一次战术行动改为普攻。大招不占行动。（回合制改编）", ultimate: true, cooldown: 0 }
    ],
    gizmo: [
      { id: "attack", name: "普攻", target: "enemy", detail: "使用已装备武器射击一个敌人。", cooldown: 0 },
      { id: "spiderNest", name: "哨兵母巢", target: "enemy", area: "row", detail: "向目标同排部署自爆蜘蛛：立即各造成 60% 攻击力爆炸伤害，随后两次行动前各再爆炸一次（65% 攻击力）；持续期间速度 −20。同一目标刷新次数，不重复叠加。（回合制改编）", cooldown: 2 },
      { id: "smartSmoke", name: "智能烟雾地雷", target: "team", detail: "在我方阵地展开两轮覆盖烟幕，全队受到的枪械伤害降低 40%，并各获得自身最大生命 30% 的个人护盾（总量上限 50%）。不会清除已有治疗烟；可触发烟雾羁绊。（回合制防护改编）", cooldown: 2 },
      { id: "hunterSpider", name: "寻猎蜘蛛", target: "enemy", detail: "寻猎蜘蛛扑向主目标，造成 240% 攻击力爆炸伤害并束缚，跳过一次行动；其他敌人受到 100% 爆炸伤害，速度 −20，持续两次行动。大招不占行动。（回合制改编）", ultimate: true, cooldown: 0 }
    ],
    raptor: [
      { id: "attack", name: "普攻", target: "enemy", detail: "使用已装备武器射击一个敌人。", cooldown: 0 },
      { id: "falcon", name: "猎鹰无人机", target: "enemy", area: "row", detail: "无人机向目标同排投送 EMP，各造成 90% 攻击力爆炸伤害并标记两轮。标记降低 20% 防护、枪械承伤 +20%。（回合制改编）", cooldown: 2 },
      { id: "pulseGrenade", name: "脉冲手雷", target: "enemy", area: "row", detail: "目标同排各受到 110% 攻击力爆炸伤害，清除狙击锁定，下一次战术行动改为普攻；可用 EMP 击破护盾并触发碎甲。（回合制改编）", cooldown: 2 },
      { id: "spyCamera", name: "蜂鸟间谍摄像头", target: "enemy", area: "all", detail: "追踪并标记全体敌人三轮，防护降低 35%、枪械承伤 +20%。随后两次自身常规行动结束，重新标记敌方并追加一次 90% 攻击力射击；不额外回能或触发普攻叠层。大招不占行动。（火力联动为同人改编）", ultimate: true, cooldown: 0 }
    ],
    rover: [
      { id: "attack", name: "普攻", target: "enemy", detail: "使用已装备武器射击一个敌人。", cooldown: 0 },
      { id: "aerosol", name: "气雾针剂枪", target: "unit", detail: "可选敌我目标：友方恢复 80＋60% 攻击力生命，并清除控制、流血和其他负面状态；敌方生命上限暂降 15%，随后两次行动前各受到 65% 攻击力持续伤害，结束后恢复上限但不回血。刷新不叠加。（回合制改编）", cooldown: 2 },
      { id: "irritantSmoke", name: "刺激性烟雾", target: "enemy", area: "row", detail: "刺激目标同排敌人咳嗽，标记两轮、下一次行动伤害减半；我方获得一轮烟幕。军犬优先追击被标记者。（回合制改编）", cooldown: 2 },
      { id: "clover", name: "军犬协同 · 四叶", target: "enemy", detail: "召唤军犬扑击目标，造成 160% 攻击力伤害并标记两轮；随后两次自身常规行动后，军犬再次追击（每次 160%），优先标记者，目标倒下自动转火。追击不额外回能、不计普攻或行动。大招不占行动。（回合制改编）", ultimate: true, cooldown: 0 }
    ],
    sineva: [
      { id: "attack", name: "普攻", target: "enemy", detail: "使用已装备武器射击一个敌人。", cooldown: 0 },
      { id: "grapple", name: "多功能钩爪枪", target: "enemy", detail: "造成 50% 攻击伤害，将目标拉到敌方最前位置，并打断一次行动。", cooldown: 2 },
      { id: "razorWire", name: "刀片刺网手雷", target: "enemy", detail: "布置刺网，目标随后两次行动前受到 22 点基础爆炸伤害；期间排序速度 −20。", cooldown: 2 },
      { id: "riotSuit", name: "防爆套装", target: "self", detail: "为自己增加 120 点个人护盾，随后两次行动结束前减伤 40%；其他前排各获得 35 护盾。后排释放时套装交给最前方队友。（回合制改编）", ultimate: true, cooldown: 0 }
    ],
    nitro: [
      { id: "attack", name: "普攻", target: "enemy", detail: "使用已装备武器射击一个敌人。", cooldown: 0 },
      { id: "dewar", name: "杜瓦冷罐", target: "enemy", area: "row", detail: "目标及同排敌人进入低温区，立即各叠 1 层低温；随后两次行动前受到 18 点基础爆炸伤害并再叠 1 层。每层排序速度 −8，立即影响尚未行动的顺序；满 3 层冻结并跳过一次行动，清空层数，解冻后两次行动免疫再次冻结。（区域为回合制改编）", cooldown: 2 },
      { id: "thermal", name: "温感追踪震撼弹", target: "enemy", detail: "令目标下一次行动伤害减半；已有低温或冷罐效果的目标同时被标记两轮。", cooldown: 2 },
      { id: "cryoBurst", name: "连发冷凝榴弹", target: "enemy", area: "all", detail: "六发范围榴弹，每发对主目标造成 22、其他敌人 8 点基础爆炸伤害；主目标倒下后自动转火。第一发与最后一发各给全体叠 1 层低温，与冷罐配合冻结敌群。（回合制改编）", ultimate: true, cooldown: 0 }
    ],
    toxik: [
      { id: "attack", name: "普攻", target: "enemy", detail: "使用已装备武器射击一个敌人。", cooldown: 0 },
      { id: "adrenaline", name: "肾上腺素激活", target: "team", detail: "全队随后两次常规行动伤害 +20%、排序速度 +25；不与其他固定 +25 加速重复叠加。", cooldown: 2 },
      { id: "toxicMist", name: "致盲毒雾", target: "enemy", detail: "令目标及另一名存活敌人下一次行动伤害减半，并附加 3 次毒蚀：每次行动前受到蛊攻击力 45% 的持续伤害，可参与持续伤害羁绊。", cooldown: 2 },
      { id: "firefly", name: "流荧·集群系统", target: "team", detail: "为全队刷新两次行动的肾上腺素增益；全队存活干员（含自身与后排）的普通技能冷却立即缩短 1 次行动，不改变大招能量或激素针储备。并干扰全体敌人：下一次战术行动改为普攻，随后两次行动伤害降低 20%。激活持续伤害羁绊时，额外引爆全体敌人的感染：每层造成蛊攻击力 150% 的基础伤害，不暴击，消耗感染层数，保留原有持续效果。", ultimate: true, cooldown: 0 }
    ],
    echo: [
      { id: "attack", name: "普攻", target: "enemy", detail: "使用已装备武器射击一个敌人。", cooldown: 0 },
      { id: "resonance", name: "共振干扰装置", target: "enemy", area: "row", detail: "干扰目标及同排敌人：清除蓄力与狙击锁定，下一次战术行动改为普攻且伤害减半；两次行动排序速度 −20，立即影响未行动顺序。标记两轮，防护降低 20%，枪械承伤 +20%。（回合制声学干扰改编）", cooldown: 2 },
      { id: "echoFlash", name: "复合型闪光弹", target: "enemy", detail: "目标下一次行动伤害减半；已受共振减速的目标持续两次行动。", cooldown: 2 },
      { id: "sonar", name: "回声探测器", target: "self", detail: "立即标记全体敌人两轮，并在随后两次自身常规行动结束时重新标记；标记者防护降低 20%、枪械承伤 +20%，不受烟幕保护。", ultimate: true, cooldown: 0 }
    ],
    butterfly: [
      { id: "attack", name: "普攻", target: "enemy", detail: "使用已装备武器射击一个敌人。", cooldown: 0 },
      { id: "nano", name: "纳米医疗粉尘", target: "ally", detail: "治疗目标 200 点、其他存活前排 100 点；全部前排随后两次行动前各恢复 50 点生命。（区域治疗改编）", cooldown: 2 },
      { id: "tradeWind", name: "烟雾弹·信风", target: "team", detail: "为全队铺设两轮烟幕，并使全队下一轮速度 +25；不覆盖已有治疗烟。", cooldown: 2 },
      { id: "rescueSwarm", name: "蝶式救援无人机群", target: "team", detail: "消耗 100 能量，持续 2 回合（全局轮，含施放当轮）。蝶存活且大招生效时，全队受到伤害降低 40%、造成伤害提高 25%。部署时治疗存活前排 200 点，给予 40 护盾和一次爆炸拦截。仅在持续期间、蝶存活时自动救起倒地前排，每人每场限救一次；1/2/3 星恢复 35%/50%/70% 生命。大招未开启或结束后不能复活。不占常规行动。（回合制救援改编）", ultimate: true, cooldown: 0 }
    ],
    tempest: [
      { id: "attack", name: "普攻", target: "enemy", detail: "使用已装备武器射击。大招强化期间三连射，每发 90% 攻击力，总倍率 270%；击败目标后剩余子弹自动转火。每发独立触发普攻与行动类装备、藏品效果；仅推进一次行动条，基础回能共 45，武器普攻回能也只触发一次；仍享受充能效率加成。", cooldown: 0 },
      { id: "roll", name: "战术翻滚", target: "self", detail: "不消耗当前行动，翻滚后可继续选择普攻、技能与目标，不会自动射击。扑灭燃烧、清除流血，下一次受伤减半；随后一次常规行动结束前伤害 +30%、排序速度 +20%。不扣除大招强化的剩余行动次数，也不触发大招或普攻专属效果。（进攻强化为同人改编）", freeAction: true, cooldown: 2 },
      { id: "wallSpike", name: "钻墙电刺", target: "enemy", detail: "造成 90% 攻击力爆炸伤害，击倒目标并打断一次行动；随后两次行动前各受到 25 点基础电击伤害。（回合制伤害改编）", cooldown: 2 },
      { id: "anchor", name: "紧急回避装置", target: "self", detail: "随后两次常规行动期间排序速度 +35%，普攻变为三连射，每发 90% 攻击力；三发仅结算一次普攻回能。期间部署回避锚点，首次受到致命伤害时恢复 35% 生命并消耗锚点。后排释放时锚点保护最前方队友，进攻强化仍属于疾风。大招不消耗行动，需 100 能量。（进攻强化为同人改编）", ultimate: true, cooldown: 0 }
    ],
    nameless: [
      { id: "attack", name: "普攻", target: "enemy", detail: "使用已装备武器射击一个敌人。", cooldown: 0 },
      { id: "razor", name: "旋刃飞行器", target: "enemy", detail: "飞盘双段切割：去程造成 160%、回程造成 100% 攻击力爆炸伤害，目标倒下后回程自动转火。命中目标随后两次行动前各流血 24＋50% 无名当前攻击力，期间排序速度 −20。两段均享受爆炸破盾，去程击破可让回程吃到碎甲减防。", cooldown: 2 },
      { id: "breachFlash", name: "突破型闪光弹", target: "enemy", detail: "令目标下一次行动伤害降低 50%。", cooldown: 2 },
      { id: "silent", name: "静默潜袭", target: "self", detail: "清除自身标记与追踪，随后两次常规行动伤害 +30%，期间受到伤害降低 30%。不消耗行动，需 100 能量。（回合制潜袭改编）", ultimate: true, cooldown: 0 }
    ],
    dwolf: [
      { id: "attack", name: "普攻", target: "enemy", detail: "使用已装备武器射击。外骨骼期间改为双连射，每发 90% 攻击力；击杀后自动转火；每发独立触发普攻与行动类装备、藏品效果，行动条和基础回能仅结算一次。", cooldown: 0 },
      { id: "triple", name: "三联装手炮", target: "enemy", detail: "连续三次爆炸攻击，每发造成 70% 攻击力伤害，击杀后剩余炮弹自动转火；护盾、掩体削减翻倍，击破后碎甲。", cooldown: 2 },
      { id: "wolfSmoke", name: "突破型烟雾弹", target: "team", detail: "铺设一轮烟幕，全队枪械减伤 40%；不覆盖已有治疗烟。", cooldown: 2 },
      { id: "overdrive", name: "动力外骨骼", target: "self", detail: "随后两次自身行动伤害 +25%、排序速度 +25，普攻改为每发 90% 攻击力的双连射；击败敌人恢复 45 生命并延长一次行动，最多剩余三次。", ultimate: true, cooldown: 0 }
    ],
    luna: [
      { id: "attack", name: "普攻", target: "enemy", detail: "使用已装备武器射击一个敌人。", cooldown: 0 },
      { id: "volt", name: "电击箭矢", target: "enemy", area: "row", detail: "电击目标及同排敌人，各造成 30 点基础爆炸伤害，随后两次行动前各受到 25 点电击伤害。", cooldown: 2 },
      { id: "frag", name: "增强型破片手雷", target: "enemy", detail: "主目标受到 64 点爆炸伤害，其他敌人受到 30 点。", cooldown: 2 },
      { id: "reconArrow", name: "侦查箭矢", target: "enemy", detail: "标记全体敌人两轮：防护降低 20%、枪械承伤 +20%，烟幕与烟墙无法保护被标记者。减防不叠加，优先使用更强的破译效果。", ultimate: true, cooldown: 0 }
    ],
    hackclaw: [
      { id: "attack", name: "普攻", target: "enemy", detail: "使用已装备武器射击一个敌人。", cooldown: 0 },
      { id: "knife", name: "数据飞刀", target: "enemy", detail: "造成攻击力 +25 的爆炸伤害，干扰目标下一次战术行动，使其只能普攻；对破译目标额外造成 20 点伤害。", cooldown: 2 },
      { id: "flash", name: "闪光巡飞器", target: "enemy", detail: "目标下一次行动伤害降低 50%；被信号破译的目标持续两次行动。", cooldown: 2 },
      { id: "decode", name: "信号破译器", target: "enemy", detail: "追踪并标记一个敌人三轮，防护降低 35%，强化飞刀和闪光；枪械承伤 +20%，无法受到烟幕保护。与普通标记的 20% 减防取更强效果，不叠加。", ultimate: true, cooldown: 0 }
    ],
    vyron: [
      { id: "attack", name: "普攻", target: "enemy", detail: "使用已装备武器射击一个敌人。", cooldown: 0 },
      { id: "dash", name: "动力推进", target: "enemy", detail: "推进后射击，造成 220% / 280% / 340% 攻击力伤害（随星级提升）；下一轮速度 +25。", cooldown: 1 },
      { id: "bomb", name: "磁吸炸弹", target: "enemy", detail: "C4 附着目标，每次受到友方直接命中增加 1 层蓄能（连射每发独立、护盾吸收也计数；持续伤害与 C4 爆炸不计），每层使主爆与溅射伤害 +20%，无层数上限。重复附着保留层数。目标下次行动前或倒下时引爆，也可用大招遥爆：主目标承受 95＋200% 威龙当前攻击力，其他敌人承受 22＋70% 攻击力的基础爆炸伤害。护盾、掩体削减翻倍，击破后碎甲。引爆后为我方提供 1 轮烟幕，可触发烟雾羁绊。", cooldown: 2 },
      { id: "air", name: "虎蹲炮", target: "enemy", area: "all", detail: "先对全体敌人造成 320% / 480% 攻击力爆炸伤害（一星 / 二星），并立即引爆已有 C4，再击倒幸存敌人，各打断一次行动。三星替换为全场爆破。威龙存活且在场时，被击倒的敌人受到我方前排的直接攻击伤害提高 35%（普攻、技能及 C4 引爆均可，持续伤害与后排攻击不享受）；其他干员造成的击倒也能联动。", ultimate: true, cooldown: 0 }
    ],
    uluru: [
      { id: "attack", name: "普攻", target: "enemy", detail: "使用已装备武器射击一个敌人。", cooldown: 0 },
      { id: "cover", name: "速凝掩体", target: "front", detail: "在己方前排建立 145 点掩体，爆炸能穿过部分防护。", cooldown: 2 },
      { id: "fire", name: "复合型燃烧弹", target: "enemy", area: "row", detail: "目标及同排敌人各受到 48 点基础爆炸伤害，并在随后两次行动前各承受 22 点燃烧伤害。", cooldown: 2 },
      { id: "missile", name: "巡飞弹", target: "enemy", detail: "主目标受到高额爆炸伤害，子弹药散射至其队友。", ultimate: true, cooldown: 0 }
    ],
    stinger: [
      { id: "attack", name: "普攻", target: "enemy", detail: "使用已装备武器射击一个敌人。", cooldown: 0 },
      { id: "drone", name: "烟幕无人机", target: "team", detail: "铺设烟墙，两轮内全队受到的枪械伤害降低 50%；与普通烟幕取较强效果，不相乘。", cooldown: 3 },
      { id: "smoke", name: "蜂巢科技烟雾弹", target: "team", detail: "铺设两轮烟雾，枪械伤害降低 40%；激素枪可将其染成治疗烟。", cooldown: 2 },
      { id: "heal", name: "激素枪", target: "ally", detail: "不占行动，每次消耗 1 根激素针。开局携带 3 根，基础每两轮补 1 根，充能效率可加快补充。标为基础能量的回复按每 1 点换算 2 点补针进度，200 点补 1 根。立即治疗 120 点并持续恢复；可激活蜂巢治疗烟。", ultimate: true, ammo: { capacity: 3, rechargeRounds: 2 }, cooldown: 0 }
    ]
  };
  const explosiveActions = new Set(["razor", "triple", "bomb", "frag", "fire", "missile", "knife", "wallSpike", "volt", "cryoBurst", "sonicFrag", "spiderNest", "hunterSpider", "falcon", "pulseGrenade"]);
  for (const actions of Object.values(catalogs)) for (const action of actions) if (explosiveActions.has(action.id)) action.detail += " 爆炸直接命中对护盾和掩体的削减 ×2，不将额外削盾量转成生命伤害；击破后防护降低 30%，持续至目标两次行动结束，与其他减防取最高值。";
  units.vyron.passive = "震荡集火：威龙存活且在场时，处于击倒状态的敌人受到我方前排直接攻击的伤害 +35%；前后台威龙均可提供，其他干员造成的击倒也能联动。";
  for (const id of Object.keys(catalogs)) units[id].skills = catalogs[id].slice(1).map(action => ({ ...action, kind: action.ammo ? "储备型战术装备" : action.ultimate ? "充能大招" : "战术技能" }));
  const operatorIds = ["vyron", "uluru", "stinger", "dwolf", "luna", "hackclaw", "butterfly", "tempest", "nameless", "sineva", "nitro", "toxik", "echo", "shepherd", "gizmo", "raptor", "rover"];
  const operatorCosts = Object.freeze({ stinger: 3, hackclaw: 3, dwolf: 3, echo: 3, sineva: 3, shepherd: 3, nameless: 4, luna: 4, uluru: 4, toxik: 4, nitro: 4, gizmo: 4, raptor: 4, rover: 4, vyron: 5, tempest: 5, butterfly: 5 });
  for (const id of operatorIds) Object.assign(units[id], { cost: operatorCosts[id], quality: { 3: "purple", 4: "gold", 5: "red" }[operatorCosts[id]] });
  const rearPassives = {
    shepherd: { name: "减振防御", role: "前后排角色", mode: "active", detail: "仅在后排存活且未被击倒时，全体前排受到爆炸伤害降低 20%；到轴自动释放声波或手雷。前排不提供此光环。（团队光环为同人改编）" },
    gizmo: { name: "机械陷阱", role: "前后排角色", mode: "active", detail: "后排自身对被减速、干扰或击倒的目标伤害 +25%；到轴自动布置母巢、烟雾地雷或放出寻猎蜘蛛。前排不触发额外增伤。（回合制改编）" },
    raptor: { name: "踪迹探查", role: "前后排角色", mode: "active", detail: "后排到轴自动侦察和施放 EMP。前排队友直接命中标记敌人后，协同射击造成 60% 攻击力伤害、回复自身 12 能量，每轮一次；前排不触发协同。（回合制改编）" },
    rover: { name: "求生专家", role: "前后排角色", mode: "active", detail: "后排每次到轴前，为生命比例最低的前排净化减速、重伤与流血，恢复 35 生命，自身回复 10 能量；自动使用针剂、烟雾和军犬。前排仍可主动施放针剂救援，但不触发此被动。（回合制改编）" },
    sineva: { name: "后方防护", role: "前后排角色", mode: "active", detail: "后排到轴前，为最前方队友增加 25 个人护盾，自身回复 10 能量；到轴自动用钩爪、刺网或防爆套装。前排不触发此被动。" },
    nitro: { name: "霜化反应", role: "前后排角色", mode: "active", detail: "后排到轴自动施放低温技能；自身对有低温层数或冷罐效果的敌人伤害 +20%。低温叠层冻结属于技能本身，前排同样可用。" },
    toxik: { name: "高效治疗", role: "后排角色", mode: "active", detail: "后排到轴前，为最受伤的存活前排恢复 25 生命，并推进其技能冷却 1 次；自动为小队增幅、致盲敌人或释放流荧集群。前排不触发此被动。" },
    echo: { name: "声纹感知", role: "前后排角色", mode: "active", detail: "位于后排时，敌人完成射击后标记该敌人两轮并回复自身 15 能量，每轮一次；到轴自动施放共振、闪光或声呐。前排不触发此被动。" },
    butterfly: { name: "体征监测", role: "后排角色", mode: "active", detail: "后排到轴前，为最受伤的存活前排恢复 20 生命并回复自身 15 能量；到轴自动治疗、封烟或释放救援无人机群。前排不触发被动。" },
    tempest: { name: "爆发型辅助脊椎", role: "前后排角色", mode: "active", detail: "后排到轴自动用电刺攻击，开大后优先三连射；满能量为最前方队友部署锚点，自身获得进攻强化。前排队友受到生命伤害后，自身回复 20 能量并使该队友下一轮速度 +25，每轮一次。（支援锚点为同人改编）" },
    nameless: { name: "重伤延滞", role: "前后排角色", mode: "active", detail: "后排到轴自动释放技能；造成伤害使目标随后两次行动期间受到的治疗减半。后排自身对流血目标造成的伤害额外 +20%。前排不触发以上被动。" },
    vyron: { name: "推进掩护", role: "前后排角色", mode: "active", detail: "后排到轴自动释放技能，不提供可操作回合。前排队友造成直接伤害后，协同射击同一目标，造成 50% 攻击力伤害并回复 12 能量，每轮一次。" },
    dwolf: { name: "击破接应", role: "前后排角色", mode: "active", detail: "后排到轴自动释放技能，不提供可操作回合。其他队友击败敌人后，为生命比例最低的前排队友恢复 35 生命，自身回复 25 能量，每轮一次。" },
    luna: { name: "敌情追踪", role: "前后排角色", mode: "active", detail: "后排到轴自动释放技能，不提供可操作回合；造成伤害会标记敌人至本轮结束。前排队友命中标记目标后，协同射击造成 45% 攻击力伤害并回复 12 能量，每轮一次。" },
    stinger: { name: "专业救援", role: "后排角色", mode: "active", detail: "后排到轴自动治疗或施放烟幕，不提供可操作回合。支援前为最受伤队友恢复 25 生命；每场还可自动救起一名倒地队友，恢复其 30% 生命。前排不触发以上被动。" },
    uluru: { name: "筑垒火力站", role: "后排角色", mode: "reserve", detail: "后排不占普通行动位。每轮建立 60 掩体（累计上限 180）并回复 30 能量；前排队友行动后再回复 10 能量。满能量自动释放巡飞弹。" },
    hackclaw: { name: "电子猎手", role: "后排角色", mode: "reserve", detail: "后排不占普通行动位。每轮标记最高攻击敌人并回复 35 能量；前排队友命中标记者后协同飞刀，造成 45% 攻击力爆炸伤害并干扰一次行动、回复 12 能量，每轮一次。满能量自动释放信号破译器。" }
  };
  for (const id of operatorIds) { units[id].rearPassive = rearPassives[id]; units[id].passive = `${rearPassives[id].name}：${rearPassives[id].detail}`; }
  Object.assign(equipment.k416, { chargeEfficiency: 20, passive: "导气调校：充能效率 +20%。" });
  Object.assign(equipment.mp5, { chargeEfficiency: 30, passive: "轻量循环：充能效率 +30%，也加快激素针补充。" });
  Object.assign(equipment.m7, { killEnergy: 20, passive: "火力回收：主动行动每击败一个敌人，额外回复 20 能量。" });
  Object.assign(equipment.bison, { attackEnergy: 10, passive: "弹鼓续航：普通攻击额外回复 10 能量；蜂医改为增加 20 点补针进度。" });
  Object.assign(equipment.uzi, { initialEnergy: 15, passive: "轻装先手：初始能量 +15；蜂医首次补针预备 30 点进度。" });
  for (const [key, rule] of Object.entries(Systems.gearPassives)) {
    const scope = rule.trigger === "action" ? "（技能、大招、免费翻滚各触发一次；后排到轴技能和自动大招也触发，驻守支援每周期触发；协同与持续伤害不计。）" : "";
    const duration = rule.stacks ? "叠层仅本场生效，百分比按开战属性加算。" : rule.kind === "shield" ? "个人护盾本场保留，合计不超过最大生命的 50%。" : "";
    equipment[key].passive = `${equipment[key].passive || ""} ${rule.name}：${rule.text}${scope}${duration}`.trim();
  }
  const rear = unit => unit?.side === "ally" && unit.slot >= Formation.frontCount;
  const offAxis = unit => rear(unit) && rearPassives[unit.id]?.mode === "reserve";
  const actionClock = unit => rear(unit) ? unit.supportTicks || 0 : unit.turns;
  const skillCooldown = (unit, action) => action.id === 'attack' ? equipment[unit.equipment?.weapon]?.basicCooldown || 0 : action.ultimate || !action.cooldown ? 0 : Math.max(1, action.cooldown - Math.min(1, Math.max(0, unit.cooldownReduction || 0)));
  function reduceSkillCooldown(unit, amount) {
    let reducedTotal = 0;
    for (const action of (catalogs[unit.id] || []).filter(action => !action.ultimate && action.cooldown > 0)) {
      const remaining = Math.max(0, (unit.cooldowns[action.id] || 0) - actionClock(unit));
      const reduced = Math.min(amount, remaining);
      if (reduced) { unit.cooldowns[action.id] -= reduced; reducedTotal += reduced; }
    }
    return reducedTotal;
  }
  const efficiency = unit => Math.min(100, Math.max(0, unit.chargeEfficiency || 0));
  function gainEnergy(unit, amount) {
    if (!unit || unit.hp <= 0 || unit.supply) return 0;
    const value = Math.min(100 - unit.energy, Math.round(amount * (1 + efficiency(unit) / 100)));
    unit.energy += value; return value;
  }
  const needleRounds = unit => Math.max(1, Math.ceil((200 - unit.supply.progress) / (100 + efficiency(unit))));
  function rechargeNeedle(unit, amount) {
    if (!unit.supply || unit.hp <= 0) return;
    if (unit.supply.count === 3) { unit.supply.progress = 0; return; }
    unit.supply.progress += amount;
    while (unit.supply.progress >= 200 && unit.supply.count < 3) { unit.supply.count++; unit.supply.progress -= 200; }
    if (unit.supply.count === 3) unit.supply.progress = 0;
  }
  function initGearState(unit) {
    unit.gearState ||= { baseSpeed: unit.speed, baseAttack: unit.attack, baseArmor: unit.armor, stackRules: 2, shield: 0, counts: {}, stacks: {}, rounds: {} };
    // Migrate old flat-armor stacks once, preserving their existing layer count.
    if (unit.gearState.stackRules === undefined) {
      const memory = unit.gearState, rules = Object.values(unit.equipment || {}).filter(key => Systems.gearPassives[key]?.kind === "armor");
      const previous = rules.reduce((sum, key) => sum + (Systems.gearPassives[key].legacyFlatArmor || 0) * (memory.stacks?.[key] || 0), 0);
      memory.baseArmor = Math.max(0, unit.armor - previous); memory.stackRules = 2;
      const ratio = rules.reduce((sum, key) => sum + Systems.gearPassives[key].value * (memory.stacks?.[key] || 0), 0);
      unit.armor = Math.round(memory.baseArmor * (1 + ratio));
    }
    return unit.gearState;
  }
  const wornRules = unit => Object.values(unit?.equipment || {}).filter(key => Systems.gearPassives[key]).map(key => [key, Systems.gearPassives[key]]);
  function initRelicState(unit) {
    unit.relicState ||= { stacks: 0, momentum: 0, extraRound: -1 };
    unit.relicState.stackRound ??= -1;
    unit.relicState.burstRound ??= -1;
    unit.relicState.rescueUsed ??= false;
    return unit.relicState;
  }
  function stackedStats(unit) {
    const memory = initGearState(unit);
    const stats = {};
    for (const kind of ["speed", "attack", "armor"]) {
      const ratio = wornRules(unit).reduce((sum, [key, rule]) => sum + (rule.kind === kind ? rule.value * (memory.stacks[key] || 0) : 0), 0) + RelicSlots.entries(unit).reduce((sum,e)=>sum+(Systems.stackingRelics[e.key]?.rule[kind]||0)*e.memory.stacks,0);
      stats[kind] = Math.round(memory[{speed:"baseSpeed",attack:"baseAttack",armor:"baseArmor"}[kind]] * (1 + ratio));
    }
    return stats;
  }
  function relicConversion(unit, raw = stackedStats(unit)) {
    const items = RelicSlots.entries(unit).map(entry => Systems.relics[entry.key]).filter(Boolean);
    const attackMultiplier = Math.max(1, ...items.map(item => item.supreme?.attackMultiplier || 1));
    const toAttack = Math.max(0, ...items.map(item => item.convert?.to === 'attack' ? item.convert.ratio : 0));
    const toSpeed = Math.max(0, ...items.map(item => item.convert?.to === 'speed' ? item.convert.ratio : 0));
    const linked = !!(toAttack && toSpeed && items.some(item => item.coupler));
    const feedback = linked ? attackMultiplier * toAttack * toSpeed : 0;
    if (feedback >= 1) throw new Error('属性转化系数无法收敛。');
    // Solve A = M * (A0 + c*S), S = S0 + d*A, without frame-by-frame feedback.
    const attack = Math.round(attackMultiplier * (raw.attack + raw.speed * toAttack) / (1 - feedback));
    const speed = Math.round(raw.speed + toSpeed * (linked
      ? attackMultiplier * (raw.attack + raw.speed * toAttack) / (1 - feedback)
      : raw.attack * attackMultiplier));
    return { attack: attack - raw.attack, speed: speed - raw.speed,
      convertedAttack: attack - Math.round(raw.attack * attackMultiplier), attackMultiplier, linked, toAttack, toSpeed };
  }
  function relicDamageReduction(unit) {
    return Math.max(0, ...RelicSlots.entries(unit).map(entry => Systems.relics[entry.key]?.supreme?.damageReduction || 0));
  }
  function refreshStackStats(unit) {
    const raw = stackedStats(unit), converted = relicConversion(unit, raw);
    Object.assign(unit, raw, { attack: raw.attack + converted.attack, speed: raw.speed + converted.speed });
  }
  function restoreRelicKeys(unit, round, refreshRules = false) {
    if (unit.side !== 'ally') return;
    let foldedStacks = false;
    for (const entry of RelicSlots.entries(unit)) {
      if (refreshRules && ['heart','ocean'].includes(entry.key)) {
        entry.memory.burstRound = -1; entry.memory.rescueUsed = false;
      }
      const next = Object.hasOwn(Systems.legacyRelicKeys, entry.key) ? Systems.legacyRelicKeys[entry.key] : null;
      if (!next) {
        if (refreshRules && ['rotor','bladeServer','workerBee','mechanical','graphicsCard','mandelUnit','rocketFuel'].includes(entry.key)) {
          const rule = Systems.relics[entry.key].rule;
          if (!rule?.stacks) entry.holder.relicState = { stacks: 0, momentum: 0, extraRound: -1, stackRound: round, burstRound: -1, rescueUsed: false };
          else {
            if (!rule.unlimited) entry.memory.stacks = Math.min(entry.memory.stacks, rule.stacks);
            entry.memory.momentum = 0; entry.memory.extraRound = -1;
          }
          if (!Systems.relics[entry.key].link) delete unit.skillLinkRounds?.[`relic:${entry.key}${entry.slot ? `:${entry.slot}` : ''}`];
        }
        continue;
      }
      const oldLink = `relic:${entry.key}${entry.slot ? `:${entry.slot}` : ''}`;
      const newLink = `relic:${next}${entry.slot ? `:${entry.slot}` : ''}`;
      unit.skillLinkRounds ||= {};
      if (Systems.relics[next].link && unit.skillLinkRounds[oldLink] !== undefined) {
        unit.skillLinkRounds[newLink] = Math.max(unit.skillLinkRounds[newLink] ?? -1, unit.skillLinkRounds[oldLink]);
      }
      delete unit.skillLinkRounds[oldLink];
      foldedStacks ||= entry.memory.stacks > 0;
      const careRounds = entry.memory.careRounds;
      entry.holder.relicState = { stacks: 0, momentum: 0, extraRound: -1, stackRound: round, burstRound: -1, rescueUsed: false };
      if (careRounds && Systems.relics[next].care?.cleanse) entry.holder.relicState.careRounds = careRounds;
      if (entry.slot) entry.holder.key = next; else unit.relic = next;
    }
    if (!foldedStacks) return;
    // Keep earned live stats, HP, energy and turn order; only future stacks use the new relic.
    const memory = initGearState(unit);
    for (const kind of ['speed', 'attack', 'armor']) {
      const ratio = wornRules(unit).reduce((sum, [key, rule]) => sum + (rule.kind === kind ? rule.value * (memory.stacks[key] || 0) : 0), 0)
        + RelicSlots.entries(unit).reduce((sum, entry) => sum + (Systems.stackingRelics[entry.key]?.rule[kind] || 0) * entry.memory.stacks, 0);
      memory[{speed:'baseSpeed',attack:'baseAttack',armor:'baseArmor'}[kind]] = Math.round(unit[kind] / (1 + ratio));
    }
  }
  function restoreEquipmentBenefits(unit, stars = 1) {
    if (unit.side !== 'ally') return;
    const removed = Object.values(unit.equipment || {}).reduce((sum, key) => {
      for (const [stat, amount] of Object.entries(legacyGearPenalties[key] || {})) sum[stat] = (sum[stat] || 0) + amount;
      return sum;
    }, {});
    if (!removed.attack && !removed.speed) return;
    const base = initGearState(unit), rawAttack = loadoutStats(unit.id, unit.equipment).attack;
    const multiplier = [1, 1, 1.35, 1.8][Math.max(1, Math.min(3, stars))];
    const deltas = {speed: removed.speed || 0, attack: Math.round(rawAttack * multiplier) - Math.round((rawAttack - (removed.attack || 0)) * multiplier)};
    // Restore only removed costs; existing stacks, statuses and other battle changes survive.
    for (const kind of ['attack','speed']) if (deltas[kind]) {
      const key = kind === 'attack' ? 'baseAttack' : 'baseSpeed', before = base[key];
      const ratio = wornRules(unit).reduce((sum, [id, rule]) => sum + (rule.kind === kind ? rule.value * (base.stacks[id] || 0) : 0), 0) + RelicSlots.entries(unit).reduce((sum, e) => sum + (Systems.stackingRelics[e.key]?.rule[kind] || 0) * e.memory.stacks, 0);
      base[key] += deltas[kind];
      unit[kind] += Math.round(base[key] * (1 + ratio)) - Math.round(before * (1 + ratio));
    }
  }
  function relicDamageBonus(unit) {
    const ratio = RelicSlots.entries(unit).reduce((sum,e)=>sum+(Systems.stackingRelics[e.key]?.rule.speedDamage||0),0);
    return Math.max(0, unit.speed / Math.max(1, initGearState(unit).baseSpeed) - 1) * ratio;
  }
  function relicSummary(unit) {
    if (unit.extraRelics?.length) return RelicSlots.entries(unit).map(e=>relicSummary({...unit,relic:e.key,relicState:e.memory,extraRelics:[]})).filter(Boolean).join(" / ");
    if (unit.relic === "heart") return "非洲之心 · 局内主动跳过交战";
    if (unit.relic === "ocean") return "海洋之泪 · 攻击 ×1.99 / 减伤 99% / 主动海浪";
    const relic = Systems.stackingRelics[unit.relic];
    if (!relic) return "";
    const memory = initRelicState(unit), base = initGearState(unit);
    if (relic.rule.momentum && !relic.rule.stacks) return `${relic.name} · 动量 ${memory.momentum}/100`;
    return `${relic.name} ${memory.stacks}${relic.rule.unlimited ? " 层 · 无上限" : `/${relic.rule.stacks}层`} · 速度 ${unit.speed}（+${Math.round((unit.speed / Math.max(1, base.baseSpeed) - 1) * 100)}%） · 攻击 ${unit.attack}${relic.rule.speedDamage ? ` · 伤害 +${Math.round(relicDamageBonus(unit) * 100)}%` : ""}${relic.rule.momentum ? ` · 动量 ${memory.momentum}/100` : ""}`;
  }
  function triggerRelic(state, unit, trigger, event) {
    for (const entry of RelicSlots.entries(unit)) {
    const relic = Systems.stackingRelics[entry.key];
    if (!relic) continue;
    const memory = entry.memory, rule = relic.rule;
    let stacked = false;
    if (rule.trigger === trigger && (rule.unlimited || memory.stacks < rule.stacks) && (!rule.perRound || memory.stackRound !== state.round)) {
      memory.stackRound = state.round; memory.stacks++; stacked = true; refreshStackStats(unit);
      const label = `${relic.name} ${memory.stacks}${rule.unlimited ? " 层 · 无上限" : `/${rule.stacks}层`}`;
      event.effects.push({ type: "gear", target: unit.id, value: 1, label });
    }
    // Extra turns consume the normal action clock, but cannot generate another extra turn this round.
    if (rule.momentum && trigger === "action" && !rear(unit) && memory.extraRound !== state.round) {
      memory.momentum = Math.min(199, memory.momentum + Math.round(Math.max(0, unit.speed / Math.max(1, initGearState(unit).baseSpeed) - 1) * 100));
      if (memory.momentum >= 100 && (!state.queue.includes(unit.id) || state.prepared === unit.id && state.queue.filter(id => id === unit.id).length === 1)) {
        memory.momentum -= 100; memory.extraRound = state.round;
        if (state.timeline) Timeline.extra(state, unit.id);
        else state.queue.splice(Math.min(1, state.queue.length), 0, unit.id);
        event.effects.push({ type: "gear", target: unit.id, value: 1, label: `${relic.name} · 额外行动` });
        event.note = [event.note, `${relic.name}：追加一次行动`].filter(Boolean).join(" · ");
      }
    }
    if (stacked) event.note = [event.note, relicSummary(unit)].filter(Boolean).join(" · ");
    }
  }
  function gearHeal(target, amount, source, event) {
    if (!target || target.hp <= 0 || !source || amount <= 0) return 0;
    const care = RelicSlots.entries(source).map(entry => ({ ...entry, item: Systems.relics[entry.key] })).filter(entry => entry.item?.care);
    // Treatment effects follow the healer, including delayed healing and rear support.
    for (const entry of care) if (entry.item.care.cleanse && source.hp > 0) {
      const rounds = entry.memory.careRounds ||= {};
      if (rounds[target.id] === event.round) continue;
      rounds[target.id] = event.round;
      for (const key of ["stun", "burn", "marked", "traced", "jammed", "blinded", "suppressed", "wounded", "hobbled", "frost"]) target[key] = 0;
      for (const key of ["shock", "bleeding", "venom", "coldField", "wireField", "bomb"]) target[key] = null;
      delete target.burnSource;
      const reduced = reduceSkillCooldown(target, entry.item.care.cooldown);
      if (target.supply) rechargeNeedle(target, entry.item.care.energy * 2); else gainEnergy(target, entry.item.care.energy);
      event.effects.push({ type: "gear", source: source.id, target: target.id, value: 1, label: `${entry.item.name} · 净化与充能` });
      if (reduced) event.effects.push({ type: "cooldown", source: source.id, target: target.id, value: reduced, label: entry.item.name });
    }
    const bonus = wornRules(source).reduce((sum, [, rule]) => sum + (rule.kind === "healing" ? rule.value : 0), 0)
      + care.reduce((sum, entry) => sum + (entry.item.care.healing || 0) + (target.hp < target.maxHp * .5 ? entry.item.care.triage || 0 : 0), 0);
    const attempted = Math.round(amount * (1 + bonus) * (target.wounded ? .5 : 1));
    const value = Math.min(target.maxHp - target.hp, attempted);
    if (event.overhealing && attempted > value) event.overhealing.push({source:source.id,target:target.id,value:attempted-value});
    if (value > 0) { target.hp += value; source.healing += value; event.effects.push({ type: "heal", source: source.id, target: target.id, value }); }
    for (const entry of care) if (entry.item.care.overflow && attempted > value) {
      const memory = initGearState(target), shield = Math.max(0, Math.min(Math.round((attempted - value) * entry.item.care.overflow), Math.floor(target.maxHp * .5) - memory.shield));
      memory.shield += shield;
      if (shield) event.effects.push({ type: "gear", source: source.id, target: target.id, value: shield, label: `${entry.item.name} · 溢出治疗转盾` });
    }
    return value;
  }
  function triggerGear(state, unit, trigger, event, hit = null, target = null) {
    if (!unit || unit.side !== "ally" || unit.hp <= 0) return;
    const memory = initGearState(unit);
    for (const [key, rule] of wornRules(unit)) {
      if (rule.trigger !== trigger || rule.once && memory.counts[key] || rule.perRound && memory.rounds[key] === state.round || rule.stacks && !rule.unlimited && (memory.stacks[key] || 0) >= rule.stacks) continue;
      if (trigger === "lowHp" && unit.hp > unit.maxHp * .4) continue;
      memory.counts[key] = (memory.counts[key] || 0) + 1;
      if (rule.every && memory.counts[key] % rule.every) continue;
      memory.rounds[key] = state.round;
      let value = 0, label = rule.name;
      if (rule.stacks) {
        memory.stacks[key] = (memory.stacks[key] || 0) + 1;
        if (["speed", "attack", "armor"].includes(rule.kind)) {
          const previous = unit[rule.kind]; refreshStackStats(unit); value = unit[rule.kind] - previous;
        } else { value = rule.value; unit.armor += value; }
        label += ` ${memory.stacks[key]}${rule.unlimited ? " 层 · 无上限" : `/${rule.stacks}层`}`;
      } else if (rule.kind === "shield") {
        value = Math.max(0, Math.min(Math.round(unit.maxHp * rule.value), Math.floor(unit.maxHp * .5) - memory.shield));
        memory.shield += value; label += ` 护盾+${value}`;
      } else if (rule.kind === "heal" || rule.kind === "teamHeal") {
        for (const ally of rule.kind === "teamHeal" ? living(state, "ally") : [unit]) value += gearHeal(ally, ally.maxHp * rule.value, unit, event);
        label += ` 治疗+${value}`;
      } else if (rule.kind === "energy" || rule.kind === "teamEnergy") {
        for (const ally of rule.kind === "teamEnergy" ? living(state, "ally").filter(ally => ally.id !== unit.id) : [unit]) {
          if (ally.supply) {
            const before = ally.supply.count * 200 + ally.supply.progress;
            rechargeNeedle(ally, rule.value * 2); value += ally.supply.count * 200 + ally.supply.progress - before;
          } else value += gainEnergy(ally, rule.value);
        }
        label += " 充能补给";
      } else if (rule.kind === "cooldown") {
        value = reduceSkillCooldown(unit, rule.value);
        label += " 技能冷却缩短";
      } else if (rule.kind === "mark") {
        const enemy = living(state, "enemy").sort((a, b) => b.attack - a.attack)[0];
        if (enemy) { enemy.marked = Math.max(enemy.marked, rule.value); value = 1; event.effects.push({ type: "marked", target: enemy.id, value: enemy.marked }); }
      } else if (rule.kind === "followup" && hit) {
        const enemy = target?.hp > 0 ? target : living(state, "enemy")[0];
        if (enemy) { hit(enemy, unit.attack * rule.value, false, unit); value = 1; }
      }
      if (value > 0) {
        event.effects.push({ type: "gear", target: unit.id, value, label, gear: key });
        event.note = [event.note, `${unit.name}·${label}`].filter(Boolean).join(" · ");
      }
    }
    triggerRelic(state, unit, trigger, event);
  }
  function skillLinkSources(state, unit) {
    const sources = wornRules(unit).filter(([, rule]) => rule.trigger === "skill").map(([key, rule]) => ({ key: `gear:${key}`, name: rule.name, rule }));
    for (const entry of RelicSlots.entries(unit)) {
      const relic = Systems.relics[entry.key];
      if (relic?.link) sources.push({ key: `relic:${entry.key}${entry.slot?`:${entry.slot}`:""}`, name: relic.name, rule: relic.link });
    }
    for (const key of state.tactics || (state.tactic ? [state.tactic] : [])) {
      const tactic = Tactics?.doctrines[key];
      if (tactic?.link) sources.push({ key: `tactic:${key}`, name: tactic.name, rule: tactic.link });
    }
    return sources;
  }
  function triggerSkillLinks(state, actor, actionId, event, hit, applyCold) {
    const tags = Object.keys(Systems.skillFamilies).filter(tag => Systems.skillFamilies[tag].actions.includes(actionId));
    if (!tags.length || actor.hp <= 0) return;
    event.skillTags = tags;
    actor.skillLinkRounds ||= {};
    // Resolve once after the complete skill, never from an individual hit, DOT tick or assist.
    for (const source of skillLinkSources(state, actor)) {
      const { key, rule, name } = source;
      if (!tags.includes(rule.tag) || actor.skillLinkRounds[key] === state.round) continue;
      actor.skillLinkRounds[key] = state.round;
      const allies = living(state, "ally"), enemies = living(state, "enemy");
      const targets = [...enemies.filter(u => event.targets.includes(u.id)), ...enemies.filter(u => !event.targets.includes(u.id))];
      let value = 0;
      if (rule.kind === "shield" || rule.kind === "teamShield") {
        for (const ally of rule.kind === "shield" ? [actor] : allies.filter(u => !rear(u))) {
          const memory = initGearState(ally), amount = Math.max(0, Math.min(Math.round(ally.maxHp * rule.value), Math.floor(ally.maxHp * .5) - memory.shield));
          memory.shield += amount; value += amount;
          if (amount) event.effects.push({ type: "gear", target: ally.id, value: amount, label: `${name} · 护盾` });
        }
      } else if (rule.kind === "energy" || rule.kind === "teamEnergy") {
        for (const ally of rule.kind === "energy" ? [actor] : allies.filter(u => u !== actor)) {
          const before = ally.supply ? ally.supply.count * 200 + ally.supply.progress : ally.energy;
          if (ally.supply) rechargeNeedle(ally, rule.value * 2); else gainEnergy(ally, rule.value);
          const amount = (ally.supply ? ally.supply.count * 200 + ally.supply.progress : ally.energy) - before;
          value += amount;
          if (amount) event.effects.push({ type: "gear", target: ally.id, value: amount, label: `${name} · 充能` });
        }
      } else if (rule.kind === "cooldown") {
        value = reduceSkillCooldown(actor, rule.value);
        if (value) event.effects.push({ type: "cooldown", target: actor.id, value: rule.value, label: name });
      } else if (rule.kind === "cold") {
        const target = targets.find(u => !u.frostImmune && (u.frost || u.coldField));
        if (target) { applyCold(target, rule.value); value = 1; }
      } else {
        const selected = rule.kind === "markedShot" ? targets.filter(u => u.marked).slice(0, 1) : rule.kind === "dotBurst" ? targets.filter(u => u.burn || u.bleeding || u.shock || u.coldField || u.wireField || u.spiderMines || u.aerosolField || u.venom).slice(0, 3) : rule.kind === "splash" ? enemies : [];
        for (const target of selected) { hit(target, actor.attack * rule.value, rule.kind !== "markedShot", actor); value++; }
      }
      if (value) {
        event.effects.push({ type: "skillLink", target: actor.id, source: actor.id, key, value, label: name });
        event.note = [event.note, `${actor.name} · ${name}`].filter(Boolean).join(" · ");
      }
    }
  }
  const statusDefaults = { marked: 0, traced: 0, jammed: 0, blinded: 0, overdrive: 0, shock: null, bleeding: null, venom: null, nano: null, anchorGuard: null, tempestRush: 0, rollBoost: 0, stealth: 0, evade: 0, wounded: 0, hobbled: 0, frost: 0, frostImmune: 0, coldField: null, wireField: null, adrenaline: 0, suppressed: 0, riot: 0, sonar: 0, rescueGuard: 0, rescueWindow: 0, fractured: 0, spiderMines: null, aerosolField: null, clover: 0, spyCamera: 0 };
  const sonicProtection = (state, unit) => unit?.side === 'ally' && !rear(unit) && living(state, 'ally').some(u => u.id === 'shepherd' && rear(u) && !u.stun);
  const rescueAura = (state, unit) => unit?.side === 'ally' ? state.units.find(u => u.id === 'butterfly' && u.hp > 0 && u.rescueWindow > 0) : undefined;
  function clearAerosol(unit) {
    if (unit.aerosolField) unit.maxHp += unit.aerosolField.reduction;
    unit.aerosolField = null;
  }
  const legendaryDefaults = { legendaryChain: 0, legendaryRoll: false, legendaryBombArmed: false, rescueDebt: 0 };
  const isLegendary = unit => !!unit && unit.side === 'ally' && unit.stars === 3 && units[unit.id]?.cost === 5 && !!Buildcraft.legendary[unit.id];
  function loadoutStats(id, loadout = defaultLoadouts[id]) {
    if (!catalogs[id] || !loadout || Object.keys(loadout).some(slot => !equipmentSlots[slot])) throw new Error("无效的装备配置。");
    const data = units[id];
    const result = { hp: data.hp, attack: data.attack, armor: data.armor, speed: data.speed, chargeEfficiency: 0, initialEnergy: 0, cooldownReduction: 0, weapon: "制式步枪" };
    for (const slot of Object.keys(equipmentSlots)) {
      const itemId = loadout[slot];
      if (itemId == null) continue;
      const item = equipment[itemId];
      if (!item || item.slot !== slot) throw new Error("装备与槽位不匹配。");
      for (const stat of ["hp", "attack", "armor", "speed", "chargeEfficiency", "initialEnergy", "cooldownReduction"]) result[stat] += item[stat] || 0;
      if (slot === "weapon") result.weapon = item.name;
    }
    result.cooldownReduction = Math.min(1, result.cooldownReduction);
    return result;
  }
  function createBattle(order = ["uluru", "vyron", "stinger"], difficulty = "normal", loadouts = defaultLoadouts, config = {}) {
    if ((config.campaign ? order.length < 1 || order.length > Formation.total : order.length !== 3) || new Set(order).size !== order.length || order.some(id => !catalogs[id])) throw new Error("小队干员配置无效。");
    if (!["normal", "hard"].includes(difficulty)) throw new Error("未知的行动难度。");
    const enemyWaves = config.enemyWaves || [config.enemies || ["shield", "saeed", "gunner"]];
    if (!Array.isArray(enemyWaves) || !enemyWaves.length || enemyWaves.length > (config.reinforcementVersion ? 3 : 2) || enemyWaves.some(wave => !Array.isArray(wave) || !wave.length || wave.length > (config.reinforcementVersion ? 20 : 5))) throw new Error("敌方波次配置无效。");
    const enemies = enemyWaves.flat();
    const positions = config.positions || defaultPositions(order);
    if (order.some(id => !Formation.validSlot(positions[id])) || new Set(order.map(id => positions[id])).size !== order.length) throw new Error("阵位配置无效。");
    if (!order.some(id => Formation.frontSlot(positions[id]))) throw new Error("至少部署一名前台作战干员。");
    if (new Set(enemies).size !== enemies.length || enemies.some(id => units[id]?.side !== "enemy")) throw new Error("敌方配置无效。");
    const all = [...order, ...enemies].map((id, index) => {
      const data = units[id];
      const modifiers = config.enemyModifiers || {};
      const stats = data.side === "ally" ? config.stats?.[id] || loadoutStats(id, loadouts[id]) : { ...data, hp: data.hp * (modifiers.hp || 1), attack: data.attack * (modifiers.attack || 1), speed: Math.round(data.speed * (modifiers.speed || 1)), armor: data.armor + (modifiers.armor || 0) };
      const scale = data.side === "enemy" ? (difficulty === "hard" ? 1.15 : 1) * (config.enemyScale || 1) : 1;
      const ammo = catalogs[id]?.find(action => action.ammo)?.ammo;
      return { ...data, ...stats, ...statusDefaults, hp: Math.round(stats.hp * scale), maxHp: Math.round(stats.hp * scale), attack: Math.round(stats.attack * scale), slot: data.side === "ally" ? positions[id] : index - order.length, turns: 0, energy: 0, supply: ammo ? { count: ammo.capacity, progress: 0 } : null, cooldowns: {}, stun: 0, burn: 0, regen: 0, bomb: null, boosted: false, rescued: false, damage: 0, healing: 0, blocked: 0, equipment: data.side === "ally" ? { ...loadouts[id] } : {} };
    });
    for (const unit of all) {
      Object.assign(unit, legendaryDefaults);
      unit.assistRound = -1;
      unit.supportBlockedRound = -1;
      unit.track = rear(unit) ? "back" : "front";
      unit.supportTicks = 0;
      unit.skillLinkRounds = {};
      if (unit.side === "ally" && !unit.supply) unit.energy = isLegendary(unit) ? 100 : Math.max(0, Math.min(100, 20 + (unit.initialEnergy || 0)));
      if (unit.supply) unit.needlePrimer = (equipment[unit.equipment.weapon]?.initialEnergy || 0) * 2;
      initGearState(unit);
      if (unit.side === "enemy" && (enemyWaves.length > 1 || config.reinforcementVersion)) {
        unit.wave = enemyWaves.findIndex(wave => wave.includes(unit.id));
        unit.slot = enemyWaves[unit.wave].indexOf(unit.id);
        if (config.reinforcementVersion) {
          unit.reserveOrder = unit.slot;
          unit.entered = unit.wave === 0 && unit.slot < 5;
          unit.retired = false;
          unit.slot %= 5;
          if (!unit.entered) unit.hp = 0;
        } else if (unit.wave > 0) unit.hp = 0;
      }
    }
    const battle = { units: all, ...(config.reinforcementVersion ? { reinforcementVersion: 1 } : {}), ...(enemyWaves.length > 1 || config.reinforcementVersion ? { waves: { index: 0, total: enemyWaves.length, startedRound: 0 } } : {}), equipmentBenefitsVersion: 1, ...(config.buildcraft ? { buildcraftVersion: 2, buildcraftStats: {}, buildcraftRounds: {} } : {}), dualTrack: true, rearRules: 1, supportQueue: [], layout: Formation.layout, round: 0, actions: 0, queue: [], prepared: null, covers: { ally: 0, enemy: 0 }, smoke: { ally: 0, enemy: 0 }, dyed: { ally: false, enemy: false }, walls: { ally: 0, enemy: 0 }, phase: "ready", winner: null, difficulty, lastEvent: null };
    if (config.timeline) Timeline.initialize(battle, initiativeSpeed, offAxis);
    battle.supremeActives = { version: 1, actions: 0, spent: {} };
    return battle;
  }
  const visibleUnits = state => state.units.filter(unit => unit.side === "ally" || (!state.waves || unit.wave === state.waves.index) && (!state.reinforcementVersion || unit.entered && !unit.retired));
  const defeatedEnemies = state => state.units.filter(unit => unit.side === "enemy" && unit.hp <= 0 && (state.reinforcementVersion ? unit.entered : !state.waves || unit.wave <= state.waves.index) && (!state.bypassed || state.bypassVersion !== 2 || state.bypassDefeated?.includes(unit.id)));
  const reserves = state => state.reinforcementVersion ? state.units.filter(unit => unit.side === "enemy" && unit.wave === state.waves.index && !unit.entered) : [];
  const waveRoundLimit = state => 18 + (state.reinforcementVersion ? Math.max(0, state.units.filter(unit => unit.side === "enemy" && unit.wave === state.waves.index).length - 5) * 2 : 0);
  const hasNextWave = state => state.waves && state.waves.index + 1 < state.waves.total;
  const living = (state, side) => state.units.filter(unit => unit.side === side && unit.hp > 0);
  const combatants = (state, side) => living(state, side).filter(unit => !state.dualTrack || !rear(unit));
  const find = (state, id) => state.units.find(unit => unit.id === id);
  const frontline = (state, side) => combatants(state, side).sort((a, b) => a.slot - b.slot)[0];
  function enemyAttackTarget(state, actor) {
    const targets = combatants(state, "ally").sort((a, b) => a.slot - b.slot);
    // Derive the draw from saved action state so previews and reloads cannot reroll it.
    const key = `${state.campaign?.id || "training"}:${state.campaign?.node || 0}:${state.round}:${state.actions}:${actor.id}`;
    let hash = 2166136261;
    for (let i = 0; i < key.length; i++) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
    hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
    hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
    hash = (hash ^ (hash >>> 16)) >>> 0;
    return targets[Math.floor(hash / 4294967296 * targets.length)];
  }
  const areaTargets = (state, target) => combatants(state, target.side).filter(unit => (target.side === "ally" ? rear(unit) === rear(target) : Math.floor(unit.slot / 3) === Math.floor(target.slot / 3)));
  const effectiveArmor = unit => Math.max(0, unit.armor * (1 - Math.max(unit.traced ? .35 : 0, unit.marked ? .2 : 0, unit.fractured ? damageRules.fractureReduction : 0)));
  const bleedDamage = source => 24 + Math.round((source?.attack || 0) * .5);
  const knockdownVulnerable = (state, target) => target.side === "enemy" && target.stun > 0 && living(state, "ally").some(unit => unit.id === "vyron");
  const knockdownBonus = state => living(state, 'ally').some(unit => unit.id === 'vyron' && isLegendary(unit)) ? 2 : damageRules.knockdownBonus;
  const initiativeSpeed = unit => Math.max(1, Math.round(unit.speed * (1 + (unit.tempestRush ? .35 : 0) + (unit.rollBoost ? .2 : 0))) + (unit.boosted || unit.overdrive || unit.adrenaline ? 25 : 0) - (unit.hobbled ? 20 : 0) - (unit.frost || 0) * 8);
  const damageMultiplier = (modifiers, source = modifiers) => (modifiers.overdrive ? 1.25 : 1) * (modifiers.stealth ? 1.3 : 1) * (modifiers.rollBoost ? 1.3 : 1) * (modifiers.adrenaline ? 1.2 : 1) * (modifiers.suppressed ? .8 : 1) * (modifiers.blinded ? .5 : 1) * (1 + relicDamageBonus(source));
  const initiative = state => state.units.filter(unit => unit.hp > 0 && !offAxis(unit)).sort((a, b) => initiativeSpeed(b) - initiativeSpeed(a)).map(unit => unit.id);
  function openingRescue(state, event) {
    if (!state.openingRevival) return false;
    const fallen = state.units.filter(unit => unit.side === "ally" && unit.hp <= 0);
    for (const unit of fallen) {
      clearAerosol(unit);
      for (const key of ['stun', 'burn', 'marked', 'traced', 'jammed', 'blinded', 'wounded', 'hobbled', 'frost', 'suppressed', 'fractured']) unit[key] = 0;
      for (const key of ['shock', 'bleeding', 'venom', 'coldField', 'wireField', 'bomb', 'spiderMines']) unit[key] = null;
      unit.hp = unit.maxHp;
      state.openingRevival.count++;
      event.effects.push({ type: "revive", target: unit.id, value: unit.hp });
    }
    if (fallen.length) event.note = [event.note, `奖励关救援：${fallen.map(unit => unit.name).join('、')}满血复活（不限次数）`].filter(Boolean).join(' · ');
    return fallen.length > 0;
  }
  function finished(state) {
    const enemiesCleared = !living(state, "enemy").length && !reserves(state).length;
    if (enemiesCleared && !hasNextWave(state) || !state.openingRevival && (!combatants(state, "ally").length || state.round > (state.waves?.startedRound || 0) + waveRoundLimit(state))) {
      state.phase = "finished";
      state.winner = enemiesCleared && !hasNextWave(state) && (combatants(state, "ally").length || state.openingRevival) ? "ally" : "enemy";
      return true;
    }
    return false;
  }
  function reinforce(state) {
    const waiting = reserves(state), targets = [];
    for (let slot = 0; slot < 5 && waiting.length; slot++) {
      if (living(state, "enemy").some(unit => unit.slot === slot)) continue;
      for (const unit of visibleUnits(state).filter(unit => unit.side === "enemy" && unit.slot === slot)) unit.retired = true;
      const unit = waiting.shift();
      unit.entered = true; unit.slot = slot; unit.hp = unit.maxHp;
      targets.push(unit.id);
    }
    if (!targets.length) return null;
    // New arrivals join the pending queue; already-used allied turns are not reset.
    state.queue = [...state.queue.filter(id => find(state, id).hp > 0), ...targets];
    Timeline.sync(state, initiativeSpeed, offAxis);
    if (!state.queue.includes(state.prepared)) state.prepared = null;
    const event = { actor: targets[0], name: "敌方增援补位", kind: "wave", reinforcement: true, wave: state.waves.index + 1, round: state.round, targets, effects: [], freeAction: true, note: `本波待援 ${reserves(state).length} 人` };
    state.lastEvent = event;
    return event;
  }
  function nextWave(state) {
    state.waves.index += 1;
    state.waves.startedRound = state.round;
    const reinforcements = state.units.filter(unit => unit.side === "enemy" && unit.wave === state.waves.index).slice(0, state.reinforcementVersion ? 5 : undefined);
    for (const unit of reinforcements) { unit.hp = unit.maxHp; if (state.reinforcementVersion) unit.entered = true; }
    for (const key of ["covers", "smoke", "walls"]) state[key].enemy = 0;
    state.dyed.enemy = false;
    if (state.timeline) Timeline.sync(state, initiativeSpeed, offAxis);
    else { state.queue = initiative(state); state.prepared = null; }
    state.supportQueue = (state.supportQueue || []).filter(task => !task.target && find(state, task.actor)?.hp > 0);
    const bomber = living(state, 'ally').find(unit => unit.id === 'vyron' && isLegendary(unit) && unit.legendaryBombArmed);
    if (bomber) { bomber.legendaryBombArmed = false; state.supportQueue.unshift({actor:bomber.id,kind:'legendaryBomb',target:null}); }
    const event = { actor: reinforcements[0].id, name: `第 ${state.waves.index + 1} 波 · 敌方增援`, kind: "wave", wave: state.waves.index + 1, round: state.round, targets: reinforcements.map(unit => unit.id), effects: [], freeAction: true, note: reinforcements.some(unit => unit.boss) ? "首领已入场" : "新的敌人正在逼近" };
    state.lastEvent = event;
    return event;
  }
  function nextRound(state) {
    state.round += 1;
    if (!state.timeline) state.queue = initiative(state);
    for (const unit of state.units) unit.boosted = false;
    if (state.round > 1) for (const unit of state.units) {
      if (unit.id === 'butterfly' && isLegendary(unit) && unit.rescueWindow === 1 && unit.hp > 0) state.supportQueue.push({actor:unit.id,kind:'legendaryFinale',target:null});
      for (const key of ["marked", "traced", "rescueWindow"]) unit[key] = Math.max(0, (unit[key] || 0) - 1);
    }
    if (state.round > 1) for (const unit of state.units) {
      const ammo = catalogs[unit.id]?.find(action => action.ammo)?.ammo;
      if (!ammo || unit.hp <= 0) continue;
      if (unit.supply.count === ammo.capacity) { unit.supply.progress = 0; continue; }
      rechargeNeedle(unit, 100 + efficiency(unit) + (unit.needlePrimer || 0)); unit.needlePrimer = 0;
    }
    if (state.round > 1) for (const side of ["ally", "enemy"]) {
      state.smoke[side] = Math.max(0, state.smoke[side] - 1);
      state.walls[side] = Math.max(0, state.walls[side] - 1);
      if (!state.smoke[side]) state.dyed[side] = false;
    }
    for (const unit of living(state, "ally").filter(offAxis)) state.supportQueue.push({ actor: unit.id, kind: "round", target: null });
  }
  function enhancedAttackName(actor) {
    if (actor.side !== 'ally') return null;
    if (actor.id === 'tempest' && actor.tempestRush > 0) return isLegendary(actor) ? '无限九连射' : '疾风三连射';
    if (actor.id === 'dwolf' && actor.overdrive > 0) return '外骨骼双连射';
    if (actor.rollBoost > 0) return '翻滚反击';
    if (actor.stealth > 0) return '匿踪射击';
    if (actor.adrenaline > 0) return '激素强化射击';
    return null;
  }
  function actionOptions(state, id) {
    const actor = find(state, id);
    if (!actor || !catalogs[id]) return [];
    const actions = [...catalogs[id]];
    const weapon = equipment[actor.equipment?.weapon];
    if (weapon?.basicCooldown && (actor.cooldowns.attack || 0) > actionClock(actor)) actions.push({ id: 'weaponReload', name: '拉栓装填', target: 'self', cooldown: 0, detail: '消耗一次常规行动完成 AWM 装填，不造成伤害，不触发普攻叠层。也可使用其他普通技能等待装填完成。' });
    return actions.map(action => {
      if (action.id === 'attack') action = {...action, name:enhancedAttackName(actor) || action.name};
      const legend = isLegendary(actor) && Buildcraft.legendary[id];
      if (legend && action.id === legend.action) action = {...action, name:`${action.name} · ${legend.name}`, detail:legend.detail};
      if (legend && id === 'tempest' && action.id === 'attack') action = {...action, detail:'大招期间九连射，每发 150% 攻击力，击杀自动转火；整组基础回能 45、武器普攻回能一次。前两组后翻滚可续接，最多连续三组。'};
      if (action.id === 'attack' && weapon?.basicMultiplier) action = { ...action, name: `${action.name} · 重狙`, detail: `${action.detail} AWM：每发普攻伤害倍率 ×3；射击后间隔 1 次自身常规行动，期间可放技能或主动装填。` };
      const remaining = Math.max(0, (actor.cooldowns[action.id] || 0) - actionClock(actor));
      const targets = action.target === "unit" ? [...living(state, "ally"), ...living(state, "enemy")].map(unit => unit.id) : action.target === "enemy" ? living(state, "enemy").map(unit => unit.id) : action.target === "ally" ? combatants(state, "ally").map(unit => unit.id) : action.target === "front" ? [frontline(state, "ally")?.id].filter(Boolean) : [actor.id];
      const ammoRemaining = action.ammo ? needleRounds(actor) : 0;
      if (action.id === "rescueSwarm" && actor.rescueWindow) return { ...action, remaining: 0, targets, available: false, reason: `无人机群生效中 · 剩余 ${actor.rescueWindow} 回合` };
      if (['clover','spyCamera'].includes(action.id) && actor[action.id]) return { ...action, remaining: 0, targets, available: false, reason: `持续支援中 · 剩余 ${actor[action.id]} 次追击` };
      if (legend && id === 'tempest' && (action.id === 'anchor' && actor.tempestRush || action.id === 'attack' && actor.legendaryRoll)) return {...action, remaining:0, targets, available:false, reason:actor.legendaryRoll ? '翻滚后继续射击' : '无限突进生效中'};
      const reason = actor.hp <= 0 ? "已倒地" : actor.stun ? "被击倒" : offAxis(actor) ? "后排支援 · 满能量自动大招" : remaining ? `冷却 ${remaining} 次行动` : action.ammo && !actor.supply.count ? `激素针用尽 · ${ammoRemaining} 轮后补充` : action.ultimate && !action.ammo && actor.energy < 100 ? `充能 ${actor.energy}/100` : !targets.length ? "没有目标" : "";
      return { ...action, detail: [action.detail, state.buildcraftVersion && Buildcraft?.upgrades[id]?.action === action.id ? Buildcraft.upgrade(id, actor.stars) : ""].filter(Boolean).join("；"), effectiveCooldown: skillCooldown(actor, action), remaining, targets, stock: action.ammo ? actor.supply.count : null, available: !reason, reason };
    });
  }
  function availableActions(state, id) {
    const options = actionOptions(state, id);
    return rear(find(state, id)) ? options.map(action => ({ ...action, available: false, reason: "后排自动支援 · 不接受手动指令" })) : options;
  }
  function choose(state, actor) {
    const options = actionOptions(state, actor.id).filter(action => action.available);
    const has = id => options.find(action => action.id === id);
    const enemies = living(state, "enemy");
    const boss = enemies.find(unit => units[unit.id]?.boss) || enemies[0];
    const patient = combatants(state, "ally").sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    let choice;
    if (actor.id === "vyron") choice = has("air") || has("bomb") || has("dash");
    if (actor.id === "uluru") choice = has("missile") || (state.covers.ally < 35 && has("cover")) || has("fire");
    if (actor.id === "stinger") choice = (patient.hp < patient.maxHp * .8 && has("heal")) || (!state.smoke.ally && has("smoke")) || (!state.walls.ally && has("drone"));
    if (actor.id === "dwolf") choice = (!actor.overdrive && has("overdrive")) || has("triple") || (actor.overdrive && has("attack")) || (!state.smoke.ally && has("wolfSmoke"));
    if (actor.id === "luna") choice = has("reconArrow") || has("volt") || has("frag");
    if (actor.id === "hackclaw") choice = has("decode") || has("knife") || has("flash");
    if (actor.id === "butterfly") choice = has("rescueSwarm") || (patient.hp < patient.maxHp * .85 && has("nano")) || (!state.smoke.ally && has("tradeWind"));
    if (actor.id === "tempest") choice = (actor.legendaryRoll && has('roll')) || (!actor.tempestRush && has("anchor")) || (actor.tempestRush && ((!rear(actor) && !actor.rollBoost && has("roll")) || has("attack"))) || (enemies.some(unit => !unit.stun) && has("wallSpike")) || (actor.rollBoost && has("attack")) || (!rear(actor) && !actor.evade && has("roll"));
    if (actor.id === "nameless") choice = (!actor.stealth && has("silent")) || has("razor") || (actor.stealth && has("attack")) || has("breachFlash");
    if (actor.id === "sineva") choice = (!(rear(actor) ? frontline(state, "ally") : actor).riot && has("riotSuit")) || has("grapple") || has("razorWire");
    if (actor.id === "nitro") choice = has("cryoBurst") || has("dewar") || has("thermal");
    if (actor.id === "toxik") choice = has("firefly") || (combatants(state, "ally").some(unit => !unit.adrenaline) && has("adrenaline")) || has("toxicMist");
    if (actor.id === "echo") choice = (!actor.sonar && has("sonar")) || has("resonance") || has("echoFlash");
    if (actor.id === "shepherd") choice = has("sonicQuake") || (enemies.some(u => !u.hobbled) && has("sonicTrap")) || has("sonicFrag");
    if (actor.id === "gizmo") choice = ((!state.smoke.ally || combatants(state,"ally").some(u => (u.gearState?.shield || 0) < u.maxHp * .15)) && has("smartSmoke")) || has("hunterSpider") || has("spiderNest") || has("smartSmoke");
    if (actor.id === "raptor") choice = has("spyCamera") || has("falcon") || has("pulseGrenade");
    if (actor.id === "rover") choice = has("clover") || has("aerosol") || has("irritantSmoke");
    const activeBonds = state.buildcraftVersion === 2 ? Buildcraft.evaluate(state.units.filter(u=>u.side==='ally').map(u=>u.id),state.bondRevision||1) : [];
    choice = Buildcraft?.Engines?.plan(state,actor,options,choice,activeBonds,Buildcraft.triggers,patient) || choice;
    choice ||= has("attack") || has("weaponReload") || options[0];
    const traced = ["knife", "flash"].includes(choice.id) && enemies.find(unit => unit.traced);
    const unstunned = choice.id === "wallSpike" && enemies.filter(unit => !unit.stun).sort((a, b) => a.hp - b.hp)[0];
    const aid = choice.id === 'aerosol' && (patient.hp < patient.maxHp * .8 || patient.stun || patient.wounded || patient.bleeding || patient.burn);
    const target = ["team", "front", "self"].includes(choice.target) ? choice.targets[0] : choice.target === "ally" || aid ? patient.id : ["air", "bomb", "decode", "aerosol"].includes(choice.id) ? boss.id : traced ? traced.id : unstunned ? unstunned.id : enemies.slice().sort((a, b) => a.hp - b.hp)[0].id;
    return { actor: actor.id, action: choice.id, target: Buildcraft?.Engines?.target(state,actor,choice,activeBonds,Buildcraft.triggers) || target };
  }
  function intent(state, id) {
    const unit = find(state, id);
    if (!unit || unit.hp <= 0) return "已倒地";
    if (!living(state, "enemy").length && (hasNextWave(state) || reserves(state).length)) return "敌方增援接近中";
    if (unit.stun) return "击倒 · 本次无法行动";
    if (offAxis(unit)) return unit.energy >= 100 ? "后排大招就绪" : `后排支援 · ${unit.energy}/100`;
    if (rear(unit)) return `自动支援 · ${actionOptions(state, id).find(action => action.id === choose(state, unit).action).name}`;
    if (Enemies.units[id]) {
      const action = Enemies.plan(state, unit), locked = find(state, unit.enemyLock);
      return action.name + (action.key === "snipe" && locked?.hp > 0 ? ` · ${locked.name}` : "");
    }
    if (unit.jammed && unit.side === "enemy") return "设备干扰 · 改用射击";
    const identity = unit.enemyBase || id;
    if (identity === "saeed") return (unit.turns + 1) % 3 === 0 ? "扫射全队" : "机枪压制前排";
    if (["shield", "rearShield"].includes(identity)) return state.covers.enemy < 30 ? "举盾防护" : "持盾射击";
    if (["gunner", "flankGunner"].includes(identity)) return "掩护射击";
    if (unit.side === "enemy") return (unit.turns + 1) % 3 === 0 ? "扫射全队" : "重装压制";
    return actionOptions(state, id).find(action => action.id === choose(state, unit).action).name;
  }
  function snapshot(state) { return JSON.parse(JSON.stringify(state)); }
  function relicActions(state) {
    const memory = state.supremeActives || { actions: 0, spent: {} };
    return state.units.filter(u => u.side === 'ally').flatMap(unit => {
      const keys = new Set(RelicSlots.entries(unit).map(entry => entry.key));
      return ['heart', 'ocean'].filter(key => keys.has(key)).map(key => {
        const charges = key === 'heart' ? 1 : 1 + Math.floor(memory.actions / 3) - (memory.spent[unit.id] || 0);
        const reason = state.phase === 'finished' ? '战斗已结束' : key === 'ocean' && unit.hp <= 0 ? '佩戴者已倒地' : charges <= 0 ? `再行动 ${3 - memory.actions % 3} 次` : '';
        return {key, actor: unit.id, name: key === 'heart' ? '跳过交战' : '海浪冲击波', charges, progress: memory.actions % 3, available: !reason, reason};
      });
    });
  }
  function validateCommand(state, command) {
    if (command.relic) {
      const action = relicActions(state).find(a => a.key === command.action && a.actor === command.actor);
      if (!action?.available) throw new Error(action?.reason || '未佩戴这件藏品。');
      return action;
    }
    const actor = find(state, state.prepared);
    if (!actor || actor.id !== command.actor || actor.side !== "ally" || state.queue[0] !== actor.id) throw new Error("尚未轮到该干员。");
    if (rear(actor)) throw new Error("后排技能由系统自动释放，不接受手动指令。");
    const action = availableActions(state, actor.id).find(option => option.id === command.action);
    if (!action || !action.available) throw new Error(action?.reason || "无效技能。");
    if (!action.targets.includes(command.target)) throw new Error("无效的技能目标。");
    return action;
  }
  function advance(state, command) {
    if (state.phase === "finished") return null;
    const relicCommand = command?.relic === true;
    Timeline.sync(state, initiativeSpeed, offAxis);
    const rescue = { actor: state.units.find(unit => unit.side === "ally").id, name: "奖励关 · 无限救援", kind: "revive", round: state.round, targets: [], effects: [], freeAction: true };
    if (!relicCommand && openingRescue(state, rescue)) {
      rescue.targets = rescue.effects.map(effect => effect.target);
      Timeline.sync(state, initiativeSpeed, offAxis);
      state.actions++; state.lastEvent = rescue;
      return rescue;
    }
    if (finished(state)) return null;
    const reinforcement = relicCommand ? null : reinforce(state);
    if (reinforcement) return reinforcement;
    if (!relicCommand && !living(state, "enemy").length && hasNextWave(state)) return nextWave(state);
    state.supportQueue ||= [];
    state.queue = state.queue.filter(id => find(state, id).hp > 0 && !offAxis(find(state, id)));
    if (!relicCommand && state.timeline) Timeline.prepare(state, initiativeSpeed, offAxis, () => { nextRound(state); return finished(state); });
    else if (!relicCommand && !state.queue.length && !state.supportQueue.length) nextRound(state);
    if (finished(state)) return null;
    state.phase = "fighting";
    const support = relicCommand ? null : state.supportQueue.shift();
    const actor = find(state, relicCommand ? command.actor : support ? support.actor : state.queue[0]);
    const event = { actor: actor.id, name: "", kind: "shot", round: state.round, effects: [], targets: [], note: "", support: !!support || rear(actor) };
    if (state.buildcraftVersion === 2 && Buildcraft.evaluate(state.units.filter(u=>u.side==='ally').map(u=>u.id),state.bondRevision||1).some(b=>b.key==='charge'&&b.mastered)) event.overhealing = [];
    let resolvedAction = false, actionId = null, reorderPending = false;
    let actionModifiers = null;
    let spentAction = false;
    let basicShotsResolved = 0;
    const bulletGearEffects = new Set();
    let continueTempest = false;
    function heal(target, amount, source = actor) {
      return gearHeal(target, amount, source || actor, event);
    }
    function personalShield(target, amount, label) {
      if (!target || target.hp <= 0) return;
      const memory = initGearState(target), value = Math.max(0, Math.min(amount, Math.floor(target.maxHp * .5) - memory.shield));
      memory.shield += value; event.effects.push({ type: "gear", target: target.id, value, label });
    }
    function applyCold(target, layers = 1) {
      if (!target || target.hp <= 0 || target.frostImmune) return;
      reorderPending = true;
      target.frost = Math.min(3, (target.frost || 0) + layers);
      if (target.frost >= 3) {
        target.frost = 0; target.stun = Math.max(1, target.stun); target.frostImmune = 3;
        event.effects.push({ type: "stun", target: target.id, value: 1 });
        event.note = [event.note, `${target.name}低温叠满，冻结`].filter(Boolean).join(" · ");
      } else event.effects.push({ type: "gear", target: target.id, value: target.frost, label: `低温 ${target.frost}/3` });
    }
    function sonarPulse() {
      for (const enemy of living(state, "enemy")) { enemy.marked = Math.max(2, enemy.marked); event.effects.push({ type: "marked", target: enemy.id, value: 2 }); }
    }
    function rescueFallen(target) {
      const rescuer = state.units.find(unit => unit.id === "butterfly" && unit.rescueWindow > 0 && (unit.hp > 0 || isLegendary(unit)));
      const legend = isLegendary(rescuer);
      if (!rescuer || target.side !== "ally" || target.hp > 0 || !legend && (rear(target) || target.butterflyRescued)) return false;
      target.butterflyRescued = true;
      if (legend) cleanse(target); else Object.assign(target, statusDefaults);
      target.burn = 0; target.bomb = null; target.stun = 0;
      target.hp = legend ? target.maxHp : Math.max(1, Math.round(target.maxHp * [0, .35, .5, .7][Math.min(3, rescuer.stars || 1)]));
      rescuer.healing += target.hp;
      target.rescueGuard = 1;
      personalShield(target, 40, "救援无人机护盾");
      event.effects.push({ type: "revive", source: rescuer.id, target: target.id, value: target.hp });
      event.note = [event.note, `${target.name}被无人机救回 · 大招剩余 ${rescuer.rescueWindow} 回合`].filter(Boolean).join(" · ");
      if (!offAxis(target) && !state.queue.includes(target.id)) state.queue.push(target.id);
      return true;
    }
    function cleanse(unit) {
      clearAerosol(unit);
      for (const key of ['stun','burn','marked','traced','jammed','blinded','wounded','hobbled','frost','suppressed','fractured']) unit[key] = 0;
      for (const key of ['shock','bleeding','venom','coldField','wireField','bomb','spiderMines']) unit[key] = null;
    }
    function companionStrike(source, power, label, preferred) {
      const enemy = preferred?.hp > 0 ? preferred : living(state, 'enemy').sort((a,b) => Number(!!b.marked) - Number(!!a.marked) || a.slot - b.slot)[0];
      if (!enemy || source.hp <= 0 || source.stun) return;
      const start = event.effects.length;
      hit(enemy, source.attack * power, false, source);
      for (const effect of event.effects.slice(start)) effect.source ||= source.id;
      if (enemy.hp > 0) enemy.marked = Math.max(enemy.marked, 2);
      event.effects.push({type:'marked',source:source.id,target:enemy.id,value:2,label});
      event.targets = [...new Set([...event.targets, enemy.id])];
      event.note = [event.note, label].filter(Boolean).join(' · ');
    }
    function bombSmoke(source) {
      if (source?.id !== 'vyron' || source.side !== 'ally') return;
      state.smoke.ally = Math.max(1, state.smoke.ally);
      event.effects.push({ type: 'smoke', source: source.id, target: source.id, value: 1, label: 'C4 引爆烟幕' });
    }
    // Detach before resolving damage: a bomb can explode exactly once, including death chains.
    let c4Resolving = false;
    const c4Pending = [];
    const c4Factor = bomb => 1 + (bomb?.stacks || 0) * .2;
    function detonateC4(target, bomb = target.bomb) {
      if (!bomb) return;
      if (target.bomb === bomb) target.bomb = null;
      c4Pending.push({target, bomb});
      if (c4Resolving) return;
      c4Resolving = true;
      const effectStart = event.effects.length;
      try {
        while (c4Pending.length) {
          const {target: host, bomb: charge} = c4Pending.shift(), source = find(state, charge.source);
          if (!source) continue;
          bombSmoke(source);
          const factor = c4Factor(charge);
          event.targets = [...new Set([...event.targets, host.id])];
          for (const enemy of living(state, host.side)) {
            hit(enemy, (enemy === host ? 95 + source.attack * 2 : 22 + source.attack * .7) * factor, true, source, true, false, true);
            event.targets = [...new Set([...event.targets, enemy.id])];
          }
          event.effects.push({type:'detonate',source:source.id,target:host.id,value:charge.stacks || 0,label:`C4 引爆 · ${charge.stacks || 0}层 / +${Math.round((factor-1)*100)}%`});
        }
      } finally {
        for (const effect of event.effects.slice(effectStart)) effect.c4 = true;
        c4Resolving = false;
      }
    }
    function legendaryBomb() {
      event.kind = 'explosion'; event.name = '三星威龙 · 全场爆破';
      const enemies = living(state,'enemy'); event.targets = enemies.map(unit => unit.id);
      const bombs = enemies.filter(unit=>unit.bomb).map(unit=>({id:unit.id,...unit.bomb})), cover = state.covers.enemy;
      for (const enemy of enemies) enemy.bomb = null;
      if (bombs.length) bombSmoke(actor);
      state.covers.enemy = 0;
      for (const enemy of enemies) {
        const c4 = bombs.reduce((sum,bomb)=>sum + (enemy.id === bomb.id ? 95 + actor.attack * 2 : 22 + actor.attack * .7) * c4Factor(bomb), 0);
        const removed = initGearState(enemy).shield + (enemy === enemies[0] ? cover : 0);
        if (removed) event.effects.push({type:'shieldBreak',target:enemy.id,source:actor.id,value:removed,label:'全场爆破 · 防护清空'});
        enemy.bomb = null; initGearState(enemy).shield = 0;
        hit(enemy, actor.attack * 20 + c4, true, actor, true, false, false, .9);
        if (enemy.hp > 0) { enemy.stun = Math.max(1,enemy.stun); event.effects.push({type:'stun',target:enemy.id,value:1}); }
      }
      for (const bomb of bombs) event.effects.push({type:'detonate',source:bomb.source,target:bomb.id,value:bomb.stacks||0,label:`C4 引爆 · ${bomb.stacks||0}层 / +${(bomb.stacks||0)*20}%`});
      event.note = '全场破盾 · 2000% 攻击 · 击倒易伤 +200%';
    }
    // Each fired basic round earns its own attack/action procs. The initiative
    // clock and ordinary attack energy still settle once for the whole command.
    function basicShot(target, power = 1) {
      if (!target || target.hp <= 0 || state.dualTrack && rear(target)) return;
      hit(target, actor.attack * power * (equipment[actor.equipment?.weapon]?.basicMultiplier || 1));
      basicShotsResolved++;
      event.basicShots = basicShotsResolved;
      if (actor.side === "ally" && basicShotsResolved > 1) actor.basicShotExtras = (actor.basicShotExtras || 0) + 1;
      const start = event.effects.length;
      triggerGear(state, actor, "attack", event, hit, target);
      if (!support && !event.freeAction) triggerGear(state, actor, "action", event);
      // Gear follow-ups must not become primary hits for tactical echo effects.
      for (const effect of event.effects.slice(start)) bulletGearEffects.add(effect);
    }
    function burstAttack(primary) {
      event.shots = [];
      const legend = isLegendary(actor);
      for (let i = 0; i < (legend ? 9 : 3); i++) {
        const enemy = primary?.hp > 0 ? primary : frontline(state, "enemy");
        if (!enemy) break;
        event.shots.push(enemy.id); basicShot(enemy, legend ? 1.5 : .9);
      }
      event.targets = [...new Set(event.shots)];
    }
    let linkPeriodic = false;
    function hit(target, amount, explosive = false, source = actor, canCrit = !linkPeriodic, execution = false, impact = !linkPeriodic && canCrit, armorPierce = 0) {
      if (!target || target.hp <= 0 || state.dualTrack && rear(target)) return;
      source ||= actor;
      if (target.bomb && source.side === 'ally' && target.side === 'enemy' && impact && !execution && !linkPeriodic && !c4Resolving) {
        target.bomb.stacks = (target.bomb.stacks || 0) + 1;
        event.effects.push({type:'gear',source:target.bomb.source,target:target.id,value:target.bomb.stacks,label:`C4 ${target.bomb.stacks}层 · +${target.bomb.stacks*20}%`});
      }
      const linkStrike = execution ? {amount:target.hp,critical:false} : Links.strike(state, source, target, amount, canCrit, RelicSlots.supreme(source, Systems.relics));
      amount = linkStrike.amount;
      // Effects appended after the action clock advances retain that action's buffs/debuffs.
      const modifiers = source.id === actor.id && actionModifiers ? actionModifiers : source;
      const bossBonus = units[target.id]?.boss ? wornRules(source).reduce((sum, [, rule]) => sum + (rule.kind === "bossDamage" ? rule.value : 0), 0) : 0;
      const outgoing = damageMultiplier(modifiers, source) * (rescueAura(state, source) ? 1.25 : 1) * (source.id === "nitro" && rear(source) && (target.frost || target.coldField) ? 1.2 : 1) * (source.id === "nameless" && rear(source) && target.bleeding ? 1.2 : 1) * (source.id === "gizmo" && rear(source) && (target.hobbled || target.jammed || target.stun) ? 1.25 : 1) * (1 + bossBonus);
      let damage = Math.max(1, Math.round(amount * outgoing - effectiveArmor(target) * (1 - armorPierce) * (explosive ? .3 : .65)));
      if (execution) damage = target.hp;
      else {
      if (explosive && target.rescueGuard) {
        target.rescueGuard = 0; target.blocked += damage;
        event.effects.push({ type: "shieldBlock", target: target.id, value: damage, label: "无人机爆炸拦截" });
        return;
      }
      if (target.stealth) damage = Math.round(damage * .7);
      if (target.riot) damage = Math.round(damage * .6);
      if (rescueAura(state, target)) {
        const reduced = damage - Math.round(damage * .6); damage -= reduced; target.blocked += reduced;
        if (reduced) event.effects.push({ type: 'mitigation', source: 'butterfly', target: target.id, value: reduced, label: '救援无人机群 · 减伤 40%' });
      }
      if (explosive && sonicProtection(state, target)) {
        const reduced = damage - Math.round(damage * .8); damage -= reduced; target.blocked += reduced;
        event.effects.push({type:'mitigation',source:'shepherd',target:target.id,value:reduced,label:'减振防御 · 爆炸减伤 20%'});
      }
      if (target.evade) { damage = Math.round(damage * .5); target.evade = 0; event.effects.push({ type: "gear", target: target.id, value: 1, label: "翻滚规避" }); }
      if (impact && source.side === "ally" && !rear(source) && knockdownVulnerable(state, target)) {
        const bonus = knockdownBonus(state);
        damage = Math.round(damage * (1 + bonus));
        if (!event.effects.some(effect => effect.type === "vulnerable" && effect.target === target.id)) event.effects.push({ type: "vulnerable", target: target.id, source: "vyron", value: bonus * 100, label: `震荡集火 +${bonus * 100}%` });
      }
      if (!explosive) {
        damage = Math.round(damage * (target.marked ? 1.2 : state.walls[target.side] ? damageRules.wallMultiplier : state.smoke[target.side] ? damageRules.smokeMultiplier : 1));
      }
      const reduction = relicDamageReduction(target);
      if (damage > 0 && reduction) {
        const reduced = damage - Math.max(1, Math.round(damage * (1 - reduction)));
        damage -= reduced; target.blocked += reduced;
        if (reduced) event.effects.push({ type: "mitigation", target: target.id, value: reduced, label: "海洋之泪 · 减伤 99%" });
      }
      const efficiency = explosive && impact && source.side === "ally" ? damageRules.shieldMultiplier : 1;
      function absorbGuard(pool, budget, type) {
        const removed = Math.min(pool, budget * efficiency), blocked = Math.ceil(removed / efficiency);
        // Extra shield damage never becomes extra health damage after a shield breaks.
        damage -= blocked; target.blocked += blocked;
        if (removed) event.effects.push({ type, target: target.id, source: source.id, value: removed });
        if (removed > 0 && efficiency > 1) {
          if (removed === pool) target.fractured = Math.max(target.fractured || 0, 2);
          const feedback = event.effects.find(effect => effect.type === "shieldBreak" && effect.target === target.id);
          const label = removed === pool ? `${type === "block" ? "掩体" : "护盾"}击破 · 碎甲` : "爆炸破盾 ×2";
          if (feedback) { feedback.value += removed; if (removed === pool) feedback.label = label; }
          else event.effects.push({ type: "shieldBreak", target: target.id, source: source.id, value: removed, label });
        }
        return pool - removed;
      }
      if (frontline(state, target.side)?.id === target.id) state.covers[target.side] = absorbGuard(state.covers[target.side], Math.round(damage * (explosive ? .35 : 1)), "block");
      const shield = initGearState(target);
      shield.shield = absorbGuard(shield.shield, damage, "shieldBlock");
      }
      const savior = state.units.find(unit => unit.id === 'butterfly' && isLegendary(unit) && unit.rescueWindow > 0);
      if (savior && target.side === 'ally' && damage >= target.hp) savior.rescueDebt = Math.min(Number.MAX_SAFE_INTEGER, savior.rescueDebt + damage);
      damage = Math.min(target.hp, damage);
      target.hp -= damage; source.damage += damage;
      if (damage) {
        if (source.id === "nameless" && rear(source)) target.wounded = Math.max(target.wounded, 2);
        if (source.id === "luna" && rear(source)) target.marked = Math.max(target.marked, 1);
        gainEnergy(target, 12);
        event.effects.push({ type: "damage", target: target.id, value: damage, ...(c4Resolving ? {source:source.id,c4:true} : {}) });
        if (linkStrike.critical) event.effects[event.effects.length - 1].critical = true;
        triggerGear(state, target, "hurt", event);
        triggerGear(state, target, "lowHp", event);
        const tempest = living(state, "ally").find(unit => unit.id === "tempest" && rear(unit) && !unit.stun && unit.assistRound !== state.round);
        if (tempest && target.side === "ally" && !rear(target)) {
          tempest.assistRound = state.round; gainEnergy(tempest, 20); target.boosted = true;
          event.effects.push({ type: "gear", target: target.id, value: 25, label: "辅助脊椎 · 加速接应" });
        }
      }
      if (!target.hp && savior && target.side === 'ally' && rescueFallen(target)) return;
      if (!target.hp && target.anchorGuard) {
        const rescuer = find(state, target.anchorGuard.source); target.anchorGuard = null;
        target.hp = Math.round(target.maxHp * .35); target.burn = 0; target.bleeding = null; target.stun = 0;
        if (rescuer) rescuer.healing += target.hp;
        event.effects.push({ type: "heal", source: rescuer?.id || target.id, target: target.id, value: target.hp });
        event.note = [event.note, `${target.name}触发紧急回避，锚点回撤`].filter(Boolean).join(" · ");
      }
      if (!target.hp) {
        if (rescueFallen(target)) return;
        event.effects.push({ type: "down", target: target.id, source: source.id, value: 0 });
        if (source.id === "dwolf" && source.overdrive) { heal(source, 45, source); source.overdrive = Math.min(4, source.overdrive + 1); }
        triggerGear(state, source, "kill", event);
        if (target.bomb) detonateC4(target);
      }
    }
    function consume() {
      Timeline.consume(state, actor);
      for (const key of ["stealth", "tempestRush", "rollBoost", "wounded", "hobbled", "adrenaline", "suppressed", "riot", "frostImmune", "fractured"]) actor[key] = Math.max(0, (actor[key] || 0) - 1);
      if (actor.anchorGuard && --actor.anchorGuard.ticks <= 0) actor.anchorGuard = null;
      for (const key of ["jammed", "blinded", "overdrive"]) if (key !== "overdrive" || event.kind !== "overdrive") actor[key] = Math.max(0, actor[key] - 1);
      if (rear(actor)) actor.supportTicks = (actor.supportTicks || 0) + 1;
      else actor.turns += 1;
      state.queue.shift(); state.prepared = null;
    }
    function record() {
      const tacticPrimaryEffects = event.effects.filter(effect => !bulletGearEffects.has(effect));
      if (resolvedAction && actor.side === "ally") {
        if (event.ultimate && actionId !== "firefly" && reduceSkillCooldown(actor, 1)) {
          event.effects.push({ type: "cooldown", target: actor.id, value: 1 });
          event.note = [event.note, "大招推进技能冷却 1 次"].filter(Boolean).join(" · ");
        }
        if (!basicShotsResolved && (actionId === "attack" || event.comboAttack)) triggerGear(state, actor, "attack", event, hit, find(state, event.targets[0]));
        // Proc eligibility is separate from spending the scheduled turn.
        if (!basicShotsResolved && (!support || support.kind === "ultimate")) triggerGear(state, actor, "action", event);
        if (event.ultimate) triggerGear(state, actor, "ultimate", event);
        if (!support || support.kind === "ultimate") triggerSkillLinks(state, actor, actionId, event, hit, applyCold);
      }
      if (resolvedAction && actor.sonar && !event.freeAction && !support) { sonarPulse(); actor.sonar--; }
      if (resolvedAction && actor.side === 'ally' && !event.freeAction && !support) {
        if (actor.clover) { companionStrike(actor, 1.6 + Math.max(0, (actor.stars || 1) - 1) * .4, '四叶 · 协同扑击'); actor.clover--; }
        if (actor.spyCamera) { sonarPulse(); companionStrike(actor, .9, '蜂鸟锁敌 · 火力追击'); actor.spyCamera--; }
      }
      if (resolvedAction && actor.side === "enemy" && ["shot", "barrage"].includes(event.kind)) {
        const listener = living(state, "ally").find(unit => unit.id === "echo" && rear(unit) && !unit.stun && unit.assistRound !== state.round);
        if (listener && actor.hp > 0) { listener.assistRound = state.round; actor.marked = Math.max(actor.marked, 2); gainEnergy(listener, 15); event.effects.push({ type: "marked", target: actor.id, value: 2 }); }
      }
      const finishBonds = Buildcraft?.afterAction({ state, actor, event, resolvedAction, actionId, hit, heal, applyCold, gainEnergy, rechargeNeedle, initGearState, bleedDamage });
      Tactics?.afterAction({ state, actor, event, resolvedAction, support, heal, gainEnergy, rechargeNeedle, initGearState, hit, primaryEffects: tacticPrimaryEffects });
      Buildcraft?.Roles?.afterAction({state,actor,event,resolvedAction,actionId,hit,gainEnergy,rechargeNeedle,primaryEffects:tacticPrimaryEffects});
      finishBonds?.();
      const kills = event.effects.filter(effect => effect.type === "down" && effect.source === actor.id && find(state, effect.target)?.side === "enemy");
      if (resolvedAction && actor.side === "ally" && kills.length) gainEnergy(actor, kills.length * (equipment[actor.equipment?.weapon]?.killEnergy || 0));
      if (reorderPending && !state.timeline) {
        const prepared = state.prepared && state.queue.includes(state.prepared) ? state.prepared : null;
        const pending = state.queue.filter(id => id !== prepared).sort((a, b) => initiativeSpeed(find(state, b)) - initiativeSpeed(find(state, a)));
        state.queue = prepared ? [prepared, ...pending] : pending;
      }
      if (continueTempest && actor.hp > 0 && living(state,'enemy').length) {
        if (state.timeline) { state.timeline.current = actor.id; state.timeline.currentExtra = true; }
        state.queue = [actor.id, ...state.queue.filter(id => id !== actor.id)];
        state.prepared = actor.id;
        event.note += ' · 免费翻滚后可继续射击';
      }
      // Apply queue advancement after speed reordering, preserving a prepared action.
      if (resolvedAction && actor.side === 'ally' && !event.freeAction && !support) {
        state.supremeActives ||= { version: 1, actions: 0, spent: {} };
        state.supremeActives.actions++;
      }
      Timeline.sync(state, initiativeSpeed, offAxis);
      Tactics?.Tempo?.afterAction({ state, actor, event, resolvedAction, support, heal, rechargeNeedle, entries: RelicSlots.entries, doctrines: Tactics.doctrines, initiativeSpeed });
      events.emit("combat:action", { state, actor, event, resolvedAction, spentAction, support: event.support });
      // This counter tracks log entries; only consume() advances a unit's action.
      openingRescue(state, event);
      Timeline.sync(state, initiativeSpeed, offAxis);
      if (state.timeline) event.actionValue = state.timeline.time;
      state.actions += 1; finished(state); state.lastEvent = event;
      return event;
    }
    if (relicCommand) {
      state.supremeActives ||= { version: 1, actions: 0, spent: {} };
      event.freeAction = true; event.relicActive = command.action;
      event.name = command.action === 'heart' ? '非洲之心 · 跳过交战' : '海洋之泪 · 海浪冲击波';
      event.kind = command.action === 'heart' ? 'heartPassage' : 'oceanWave';
      event.effects.push({type: 'supreme', key: command.action, target: actor.id, label: event.name});
      if (command.action === 'heart') {
        state.bypassDefeated = defeatedEnemies(state).map(u => u.id);
        for (const enemy of state.units.filter(u => u.side === 'enemy')) {
          enemy.hp = 0;
          if (state.reinforcementVersion) { enemy.entered = true; enemy.retired = true; }
        }
        if (state.waves) state.waves.index = state.waves.total - 1;
        Object.assign(state, {bypassed: true, bypassVersion: 2, phase: 'finished', winner: 'ally'});
        state.queue = []; state.prepared = null; state.supportQueue = [];
        if (state.timeline) { state.timeline.current = null; state.timeline.currentExtra = false; }
        event.note = '已跳过剩余交战与增援 · 战利品结算';
      } else {
        state.supremeActives.spent[actor.id] = (state.supremeActives.spent[actor.id] || 0) + 1;
        for (const ally of living(state, 'ally')) personalShield(ally, Math.floor(ally.maxHp * .5), '海洋之泪 · 满额护盾');
        const enemies = visibleUnits(state).filter(u => u.side === 'enemy' && u.hp > 0);
        event.targets = enemies.map(u => u.id);
        for (const enemy of enemies) hit(enemy, actor.attack * 99999.99, true);
        event.note = '全队护盾补满 · 9,999,999% 攻击力海浪 · 不消耗行动';
        finished(state);
      }
      Timeline.sync(state, initiativeSpeed, offAxis);
      state.actions++; state.lastEvent = event;
      if (state.timeline) event.actionValue = state.timeline.time;
      return event;
    }
    if (support && ['legendaryBomb','legendaryFinale'].includes(support.kind)) {
      event.freeAction = true;
      event.ultimate = false;
      if (actor.hp <= 0 || !isLegendary(actor)) { event.kind='status'; event.name='传奇支援中断'; return record(); }
      if (support.kind === 'legendaryBomb') legendaryBomb();
      else {
        event.kind='explosion'; event.name='三星蝶 · 拒绝死亡'; event.targets=living(state,'enemy').map(unit=>unit.id);
        const damage = actor.attack * 20 + actor.rescueDebt; actor.rescueDebt = 0;
        for (const enemy of living(state,'enemy')) hit(enemy,damage,true,actor);
        event.note='救援窗口结束 · 致命伤害反击';
      }
      return record();
    }
    if (support && (actor.hp <= 0 || !rear(actor))) {
      event.name = "后排支援取消"; event.kind = "status"; return record();
    }
    if (support && support.kind === "round") {
      actor.adrenaline = Math.max(0, actor.adrenaline - 1);
      // Off-axis operators still resolve turn-bound status effects once per round.
      linkPeriodic = true;
      if (actor.bomb) detonateC4(actor);
      if (actor.burn && actor.hp > 0) { hit(actor, 22, true, find(state, actor.burnSource || "uluru"), false); actor.burn--; }
      if (actor.shock && actor.hp > 0) { hit(actor, 25, true, find(state, actor.shock.source)); if (actor.shock && --actor.shock.ticks <= 0) actor.shock = null; }
      if (actor.stun || actor.hp <= 0) {
        actor.stun = Math.max(0, actor.stun - 1); actor.assistRound = state.round; actor.supportBlockedRound = state.round;
        event.kind = "status"; event.name = "支援中断"; event.targets = [actor.id]; return record();
      }
      if (actor.regen) { heal(actor, 22, find(state, "stinger")); actor.regen--; }
      if (state.smoke.ally && state.dyed.ally) heal(actor, 15, find(state, "stinger"));
      actor.jammed = Math.max(0, actor.jammed - 1); actor.blinded = Math.max(0, actor.blinded - 1);
      if (actor.id === "uluru") {
        state.covers.ally = Math.min(180, state.covers.ally + 60); gainEnergy(actor, 30);
        event.kind = "cover"; event.name = "筑垒火力站 · 后排被动"; event.targets = [frontline(state, "ally").id];
        event.effects.push({ type: "cover", target: event.targets[0], value: state.covers.ally });
      } else {
        const target = living(state, "enemy").sort((a, b) => b.attack - a.attack)[0];
        if (target) { target.marked = Math.max(target.marked, 1); event.targets = [target.id]; event.effects.push({ type: "marked", target: target.id, value: 1 }); }
        gainEnergy(actor, 35); event.kind = "decode"; event.name = "电子猎手 · 后排被动";
      }
      event.note = `充能 ${actor.energy}/100`; triggerGear(state, actor, "action", event); return record();
    }
    if (support && actor.stun) { event.name = "支援中断 · 击倒"; event.kind = "status"; return record(); }
    if (support && support.kind === "assist") {
      const target = find(state, support.target);
      event.targets = target ? [target.id] : []; event.kind = actor.id === "hackclaw" ? "knife" : "shot";
      event.name = `${rearPassives[actor.id].name} · 协同攻击`;
      if (target?.hp > 0) {
        hit(target, actor.attack * (actor.id === "vyron" ? .5 : actor.id === "raptor" ? .6 : .45), actor.id === "hackclaw");
        if (actor.id === "hackclaw" && target.hp > 0) { target.jammed = 1; event.effects.push({ type: "jammed", target: target.id, value: 1 }); }
        gainEnergy(actor, 12);
      }
      return record();
    }
    if (support && support.kind === "rally") {
      const target = living(state, "ally").filter(unit => Formation.frontSlot(unit.slot)).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      heal(target, 35); gainEnergy(actor, 25); event.kind = "heal"; event.name = "击破接应 · 后排被动"; event.targets = target ? [target.id] : [actor.id]; event.note = `红狼充能 ${actor.energy}/100`; return record();
    }
    // Resolve start-of-turn effects once, before asking for a manual command.
    if (!support && state.prepared !== actor.id) {
      linkPeriodic = true;
      state.prepared = actor.id;
      for (const [key, power] of [['spiderMines', .65], ['aerosolField', .65], ['venom', .45]]) if (actor[key] && actor.hp > 0) {
        const field = actor[key], source = find(state, field.source);
        if (source) hit(actor, source.attack * power, true, source, false);
        if (actor[key] && --actor[key].ticks <= 0) { if (key === 'aerosolField') clearAerosol(actor); else actor[key] = null; }
      }
      if (actor.coldField && actor.hp > 0) {
        hit(actor, 18, true, find(state, actor.coldField.source)); applyCold(actor);
        if (actor.coldField && --actor.coldField.ticks <= 0) actor.coldField = null;
      }
      if (actor.wireField && actor.hp > 0) { hit(actor, 22, true, find(state, actor.wireField.source)); if (actor.wireField && --actor.wireField.ticks <= 0) actor.wireField = null; }
      if (actor.bleeding && actor.hp > 0) {
        const source = find(state, actor.bleeding.source); hit(actor, bleedDamage(source), true, source);
        if (actor.bleeding && --actor.bleeding.ticks <= 0) actor.bleeding = null;
      }
      if (actor.bomb) detonateC4(actor);
      if (actor.burn && actor.hp > 0) { hit(actor, 22, true, find(state, actor.burnSource || "uluru"), false); actor.burn = Math.max(0, actor.burn - 1); }
      if (actor.shock && actor.hp > 0) {
        hit(actor, 25, true, find(state, actor.shock.source));
        if (actor.shock && --actor.shock.ticks <= 0) actor.shock = null;
      }
      if (actor.hp <= 0 || finished(state)) {
        consume(); event.name = "延时伤害结算"; event.kind = "explosion"; event.targets = [actor.id]; return record();
      }
      if (actor.stun) {
        if (actor.side === "enemy") actor.enemyLock = null;
        actor.stun -= 1; consume();
        event.name = "击倒 · 无法行动"; event.kind = "stun"; event.targets = [actor.id]; return record();
      }
      if (actor.regen) { heal(actor, 22, find(state, "stinger")); actor.regen -= 1; }
      if (actor.nano) { heal(actor, 50, find(state, actor.nano.source)); if (--actor.nano.ticks <= 0) actor.nano = null; }
      if (actor.id === "butterfly" && rear(actor)) {
        const patient = combatants(state, "ally").sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
        heal(patient, 20); gainEnergy(actor, 15);
      }
      if (actor.id === "sineva" && rear(actor)) { personalShield(frontline(state, "ally"), 25, "后方防护"); gainEnergy(actor, 10); }
      if (actor.id === "rover" && rear(actor)) {
        const patient = combatants(state, "ally").sort((a,b) => a.hp/a.maxHp - b.hp/b.maxHp)[0];
        if (patient) {
          const cleared = patient.hobbled || patient.wounded || patient.bleeding;
          patient.hobbled = 0; patient.wounded = 0; patient.bleeding = null;
          if (cleared) event.effects.push({type:'gear',source:actor.id,target:patient.id,value:0,label:'求生专家 · 净化'});
          heal(patient,35); gainEnergy(actor,10);
        }
      }
      if (actor.id === "toxik" && rear(actor)) {
        const patient = combatants(state, "ally").sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
        heal(patient, 25); if (reduceSkillCooldown(patient, 1)) event.effects.push({ type: "cooldown", target: patient.id, value: 1 });
      }
      if (state.smoke[actor.side] && state.dyed[actor.side]) heal(actor, 15, find(state, "stinger"));
      if (actor.id === "stinger" && rear(actor)) heal(living(state, "ally").sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0], 25);
      if (actor.id === "stinger" && rear(actor) && !actor.rescued) {
        const downed = state.units.find(unit => unit.side === "ally" && unit.hp <= 0);
        if (downed) {
          downed.hp = Math.round(downed.maxHp * .3); downed.burn = 0; downed.stun = 0; downed.bomb = null;
          Object.assign(downed, statusDefaults);
          actor.rescued = true; actor.healing += downed.hp;
          event.effects.push({ type: "revive", target: downed.id, value: downed.hp });
          event.name = "专业救援 · 被动"; event.kind = "revive";
        }
      }
      if (event.effects.length || event.overhealing?.length) {
        event.name ||= "战场状态结算"; if (event.kind !== "revive") event.kind = "status";
        event.targets = [...new Set(event.effects.map(effect => effect.target))];
        return record();
      }
    }
    linkPeriodic = false;
    if (!support && actor.side === "ally" && !rear(actor) && command === null) return { waiting: true, actor: actor.id };
    let action, target;
    if (support) {
      if (actor.energy < 100) { event.name = "后排大招等待充能"; event.kind = "status"; return record(); }
      action = catalogs[actor.id].find(action => action.ultimate);
      target = living(state, "enemy").find(unit => units[unit.id]?.boss) || living(state, "enemy")[0];
    } else if (actor.side === "ally") {
      command ||= choose(state, actor);
      action = rear(actor) ? actionOptions(state, actor.id).find(option => option.id === command.action && option.available) : validateCommand(state, command);
      target = find(state, command.target);
    } else {
      const name = intent(state, actor.id);
      action = Enemies.plan(state, actor) || { id: name === "举盾防护" ? "cover" : name === "扫射全队" ? "barrage" : "attack", name };
      target = enemyAttackTarget(state, actor);
      if (action.key === "snipe") target = combatants(state, "ally").find(unit => unit.id === actor.enemyLock) || target;
      if (["lock", "judgment"].includes(action.key)) target = combatants(state, "ally").slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    }
    const foes = combatants(state, actor.side === "ally" ? "enemy" : "ally");
    actionId = action.id;
    event.kind = action.id; event.name = action.name; event.targets = [target.id];
    event.primaryTarget = target.id;
    if (action.key) {
      const key = action.key;
      event.kind = "shot";
      if (key === "lock") {
        actor.enemyLock = target.id; event.kind = "decode";
        event.effects.push({ type: "gear", target: target.id, value: 1, label: "狙击锁定" });
        event.note = `${target.name}被锁定 · 下一次敌方行动将开火`;
      } else if (key === "snipe") {
        hit(target, actor.attack * 1.55); actor.enemyLock = null;
      } else if (key === "guard") {
        state.covers.enemy = Math.max(state.covers.enemy, 110); personalShield(actor, Math.round(actor.maxHp * .12), "盾阵推进");
        event.kind = "cover"; event.targets = [actor.id];
      } else if (key === "ward" || key === "command") {
        event.kind = "cover"; event.targets = living(state, "enemy").map(unit => unit.id);
        for (const guard of living(state, "enemy")) {
          personalShield(guard, Math.round(guard.maxHp * .12), key === "command" ? "钢铁秩序" : "卫队协防");
          if (key === "command") guard.adrenaline = Math.max(guard.adrenaline, guard === actor ? 2 : 1);
        }
      } else if (key === "approach") {
        event.kind = "cover"; event.targets = [actor.id]; personalShield(actor, Math.round(actor.maxHp * .15), "重锤逼近");
        event.note = "下一次行动挥锤 · 可用控制打断";
      } else if (key === "flame") {
        event.kind = "fire"; event.targets = foes.slice(0, 2).map(unit => unit.id);
        for (const victim of foes.slice(0, 2)) {
          hit(victim, actor.attack * .65, true);
          if (victim.hp > 0) { victim.burn = Math.max(victim.burn, 2); victim.burnSource = actor.id; event.effects.push({ type: "burn", target: victim.id, value: 2 }); }
        }
      } else if (key === "fog") {
        event.kind = "smoke"; event.targets = foes.map(unit => unit.id);
        for (const victim of foes) { victim.hobbled = Math.max(victim.hobbled, 2); victim.wounded = Math.max(victim.wounded, 1); }
        event.note = "迷幻毒雾 · 减速与重伤已生效";
      } else if (key === "bombard") {
        event.kind = "missile"; event.targets = foes.map(unit => unit.id);
        for (const victim of foes) hit(victim, actor.attack * .65, true);
      } else if (key === "revolver" || key === "judgment") {
        const count = key === "revolver" ? 3 : 2; event.kind = "triple"; event.shots = [];
        for (let i = 0; i < count && target.hp > 0; i++) { event.shots.push(target.id); hit(target, actor.attack * (count === 3 ? .4 : .7)); }
      } else if (key === "hammer") {
        event.kind = "knife"; hit(target, actor.attack * 1.45, true);
        if (target.hp > 0) target.hobbled = Math.max(target.hobbled, 1);
      } else if (key === "evadeShot") {
        hit(target, actor.attack * .85); actor.evade = 1; event.kind = "dash";
      } else {
        hit(target, actor.attack * (key === "suppress" ? .95 : 1));
        if (key === "suppress" && target.hp > 0) target.suppressed = Math.max(target.suppressed, 1);
        if (actor.jammed) actor.enemyLock = null;
      }
    } else if (action.id === 'weaponReload') {
      event.kind = 'reload'; event.note = 'AWM · 拉栓完成';
      event.effects.push({ type: 'gear', source: actor.id, target: actor.id, value: 1, label: '拉栓装填' });
    } else if (action.id === "attack") {
      event.kind = "shot"; event.name = `${actor.weapon} · ${enhancedAttackName(actor) || '射击'}`;
      if (actor.id === "tempest" && actor.tempestRush) {
        burstAttack(target);
        event.note = "三连射 · 270% 攻击 · 普攻回能仅一次";
        if (isLegendary(actor)) {
          event.note = '无限突进 · 九连射 · 普攻回能仅一次';
          if (actor.legendaryChain > 0) { actor.legendaryChain--; continueTempest = true; }
        }
      } else if (actor.id === "dwolf" && actor.overdrive) {
        event.shots = [];
        for (let i = 0; i < 2; i++) { const enemy = target.hp > 0 ? target : frontline(state, "enemy"); if (!enemy) break; event.shots.push(enemy.id); basicShot(enemy, damageRules.wolfShotPower); }
        event.targets = [...new Set(event.shots)]; event.note = "双连射 · 每发独立叠层 · 普攻回能仅一次";
      } else basicShot(target);
    } else if (action.id === "sonicTrap" || action.id === "sonicQuake") {
      const victims = action.ultimate ? foes : areaTargets(state,target); event.kind='sonar'; event.targets=victims.map(u=>u.id);
      for (const enemy of victims) {
        hit(enemy,actor.attack*(action.ultimate?1.1:.7),true);
        if (enemy.hp <= 0) continue;
        enemy.hobbled = 2; enemy.suppressed = 2; reorderPending = true;
        if (action.ultimate) { enemy.jammed = Math.max(enemy.jammed,1); enemy.enemyLock = null; }
        event.effects.push({type:'gear',target:enemy.id,value:2,label:'声波压制 · 减速与减伤'});
      }
    } else if (action.id === "sonicFrag") {
      event.kind='frag'; event.targets=foes.map(u=>u.id);
      for (const enemy of foes) hit(enemy,actor.attack*(enemy===target?1.4:.65),true);
    } else if (action.id === "smartSmoke") {
      const covered = living(state, "ally");
      state.smoke.ally = Math.max(state.smoke.ally, 2);
      event.kind = 'smoke'; event.targets = covered.map(unit => unit.id);
      for (const ally of covered) personalShield(ally, Math.round(ally.maxHp * .3), '覆盖烟幕 · 防护');
      event.note = '覆盖全队 · 两轮烟幕 · 枪伤减免 40% · 生命上限 30% 护盾';
    } else if (action.id === "spiderNest") {
      const victims=areaTargets(state,target); event.kind='bomb'; event.targets=victims.map(u=>u.id);
      for (const enemy of victims) {
        hit(enemy,actor.attack*.6,true);
        if (enemy.hp <= 0) continue;
        enemy.hobbled=2; reorderPending=true;
        enemy.spiderMines={source:actor.id,ticks:2}; event.effects.push({type:'bomb',target:enemy.id,value:2,label:'哨兵母巢'});
      }
    } else if (action.id === "hunterSpider") {
      event.kind='missile'; event.targets=foes.map(u=>u.id);
      for (const enemy of foes) {
        hit(enemy,actor.attack*(enemy===target?2.4:1),true);
        if (enemy.hp <= 0) continue;
        enemy.hobbled=2; reorderPending=true;
        if (enemy===target) { enemy.stun=Math.max(1,enemy.stun); event.effects.push({type:'stun',target:enemy.id,value:1,label:'寻猎蜘蛛 · 束缚'}); }
      }
    } else if (action.id === "falcon" || action.id === "pulseGrenade") {
      const victims=areaTargets(state,target); event.kind=action.id==='falcon'?'reconArrow':'frag'; event.targets=victims.map(u=>u.id);
      for (const enemy of victims) {
        hit(enemy,actor.attack*(action.id==='falcon'?.9:1.1),true);
        if (enemy.hp <= 0) continue;
        if (action.id==='falcon') { enemy.marked=Math.max(2,enemy.marked); event.effects.push({type:'marked',target:enemy.id,value:2}); }
        else { enemy.jammed=Math.max(1,enemy.jammed); enemy.enemyLock=null; event.effects.push({type:'jammed',target:enemy.id,value:1}); }
      }
    } else if (action.id === "spyCamera") {
      event.kind='decode'; event.targets=foes.map(u=>u.id); actor.spyCamera=2;
      for (const enemy of foes) { enemy.traced=Math.max(3,enemy.traced); enemy.marked=Math.max(3,enemy.marked); event.effects.push({type:'marked',target:enemy.id,value:3}); }
    } else if (action.id === "aerosol") {
      if (target.side === 'ally') {
        actionId='aerosolAid'; event.kind='heal'; cleanse(target); heal(target,80+actor.attack*.6);
        event.effects.push({type:'gear',source:actor.id,target:target.id,value:0,label:'气雾针剂 · 净化'});
      } else {
        event.kind='toxicMist'; clearAerosol(target);
        const reduction=Math.min(target.maxHp-1,Math.floor(target.maxHp*.15));
        target.maxHp-=reduction; target.hp=Math.min(target.hp,target.maxHp);
        target.aerosolField={source:actor.id,ticks:2,reduction}; target.marked=Math.max(2,target.marked);
        event.effects.push({type:'gear',target:target.id,value:reduction,label:'气雾针剂 · 生命上限 -15%'});
      }
    } else if (action.id === "irritantSmoke") {
      event.kind='smoke'; const victims=areaTargets(state,target); event.targets=victims.map(u=>u.id);
      for (const enemy of victims) { enemy.marked=Math.max(2,enemy.marked); enemy.blinded=Math.max(1,enemy.blinded); event.effects.push({type:'marked',target:enemy.id,value:2},{type:'blinded',target:enemy.id,value:1}); }
      state.smoke.ally=Math.max(state.smoke.ally,1);
    } else if (action.id === "clover") {
      event.kind='knife'; actor.clover=2; companionStrike(actor,1.6+Math.max(0,(actor.stars||1)-1)*.4,'四叶 · 出击',target);
    } else if (action.id === "grapple") {
      hit(target, actor.attack * .5);
      if (target.hp > 0) { const first = frontline(state, "enemy"); [first.slot, target.slot] = [target.slot, first.slot]; target.stun = Math.max(target.stun, 1); event.effects.push({ type: "stun", target: target.id, value: 1 }); }
      event.kind = "knife";
    } else if (action.id === "razorWire") {
      target.wireField = { source: actor.id, ticks: 2 }; target.hobbled = Math.max(2, target.hobbled); event.kind = "bomb";
      event.effects.push({ type: "gear", target: target.id, value: 2, label: "刀片刺网" });
    } else if (action.id === "riotSuit") {
      const protectedUnit = rear(actor) ? frontline(state, "ally") : actor; protectedUnit.riot = 2;
      personalShield(protectedUnit, 120, "防爆套装");
      for (const ally of combatants(state, "ally").filter(unit => unit !== protectedUnit)) personalShield(ally, 35, "持盾掩护");
      event.targets = combatants(state, "ally").map(unit => unit.id); event.kind = "cover";
    } else if (action.id === "dewar") {
      const targets = areaTargets(state, target); event.targets = targets.map(unit => unit.id); event.kind = "volt";
      for (const enemy of targets) { enemy.coldField = { source: actor.id, ticks: 2 }; applyCold(enemy); }
    } else if (action.id === "thermal") {
      target.blinded = Math.max(target.blinded, 1); if (target.frost || target.coldField) target.marked = Math.max(2, target.marked);
      event.effects.push({ type: "blinded", target: target.id, value: 1 }); event.kind = "flash";
    } else if (action.id === "cryoBurst") {
      event.targets = foes.map(unit => unit.id); event.kind = "triple"; event.shots = [];
      for (let i = 0; i < 6; i++) {
        const primary = target.hp > 0 ? target : frontline(state, "enemy"); if (!primary) break;
        event.shots.push(primary.id);
        for (const enemy of living(state, "enemy")) { hit(enemy, enemy === primary ? 22 : 8, true); if (i === 0 || i === 5) applyCold(enemy); }
      }
    } else if (action.id === "adrenaline" || action.id === "firefly") {
      for (const ally of living(state, "ally")) ally.adrenaline = 2;
      // The casting action must not consume one of the caster's two future buffed actions.
      if (action.id === "adrenaline") actor.adrenaline = 3;
      event.targets = living(state, "ally").map(unit => unit.id); event.kind = "overdrive";
      if (action.id === "firefly") for (const enemy of foes) { enemy.jammed = Math.max(enemy.jammed, 1); enemy.suppressed = 2; event.effects.push({ type: "jammed", target: enemy.id, value: 1 }); }
      if (action.id === "firefly") for (const ally of living(state, "ally")) {
        // Includes the caster once; record() skips its generic ultimate reduction.
        if (reduceSkillCooldown(ally, 1)) event.effects.push({ type: "cooldown", source: actor.id, target: ally.id, value: 1, label: "流荧集群 · 技能冷却 −1" });
      }
      event.note = action.id === "firefly" ? "肾上腺素强化 · 全队普通技能冷却 −1" : "肾上腺素强化 · 小队增幅";
    } else if (action.id === "toxicMist" || action.id === "echoFlash") {
      const targets = action.id === "toxicMist" ? [target, ...foes.filter(unit => unit !== target)].slice(0, 2) : [target]; event.targets = targets.map(unit => unit.id); event.kind = "flash";
      for (const enemy of targets) {
        enemy.blinded = Math.max(enemy.blinded, action.id === "echoFlash" && enemy.hobbled ? 2 : 1);
        event.effects.push({ type: "blinded", target: enemy.id, value: enemy.blinded });
        if (action.id === 'toxicMist') { enemy.venom = {source:actor.id,ticks:3}; event.effects.push({type:'gear',source:actor.id,target:enemy.id,value:3,label:'毒蚀 · 3 次'}); }
      }
    } else if (action.id === "resonance") {
      const targets = areaTargets(state, target); event.targets = targets.map(unit => unit.id); event.kind = "decode"; reorderPending = true;
      for (const enemy of targets) {
        enemy.hobbled = 2; enemy.jammed = Math.max(1, enemy.jammed); enemy.blinded = Math.max(1, enemy.blinded); enemy.marked = Math.max(2, enemy.marked); enemy.enemyLock = null;
        event.effects.push({ type: "marked", target: enemy.id, value: 2 }, { type: "jammed", target: enemy.id, value: 1 }, { type: "blinded", target: enemy.id, value: 1 });
      }
      event.note = "区域共振 · 打断蓄力、致盲、减速、减防";
    } else if (action.id === "sonar") {
      actor.sonar = 2; sonarPulse(); event.targets = foes.map(unit => unit.id); event.kind = "reconArrow";
    } else if (action.id === "nano") {
      const allies = combatants(state, "ally"); event.targets = [target.id, ...allies.filter(unit => unit !== target).map(unit => unit.id)]; event.kind = "heal";
      for (const ally of allies) { heal(ally, ally === target ? 200 : 100); ally.nano = { source: actor.id, ticks: 2 }; }
    } else if (action.id === "tradeWind") {
      state.smoke.ally = Math.max(2, state.smoke.ally); event.kind = "smoke";
      event.targets = living(state, "ally").map(unit => unit.id);
      for (const ally of living(state, "ally")) ally.boosted = true;
      event.note = "信风烟幕 · 小队加速转移";
    } else if (action.id === "rescueSwarm") {
      const legend = isLegendary(actor);
      const allies = state.units.filter(unit => unit.side === "ally" && (legend || !rear(unit))); event.kind = "heal"; event.targets = allies.map(unit => unit.id);
      actor.rescueWindow = 2;
      actor.rescueDebt = 0;
      for (const ally of allies) {
        if (legend) {
          cleanse(ally);
          for (const skill of catalogs[ally.id].filter(skill=>!skill.ultimate && !(skill.id === 'attack' && equipment[ally.equipment?.weapon]?.basicCooldown))) ally.cooldowns[skill.id] = actionClock(ally);
          if (ally !== actor) { if (ally.supply) { ally.supply.count = 3; ally.supply.progress = 0; } else ally.energy = 100; }
        }
        if (rescueFallen(ally)) continue;
        heal(ally, legend ? ally.maxHp : 200);
        if (ally.hp > 0) { personalShield(ally, 40, "救援无人机护盾"); ally.rescueGuard = 1; }
      }
      event.note = legend ? '拒绝死亡 · 全队不死 2 回合 · 满血 / 满能 / 净化 · 减伤40% / 增伤25%' : "救援群已部署 · 前排治疗200 · 全队减伤40% / 增伤25% · 复活窗口2回合";
    } else if (action.id === "roll") {
      actor.legendaryRoll = false;
      actor.evade = 1; actor.rollBoost = 1; actor.burn = 0; actor.bleeding = null; event.kind = "dash";
      event.effects.push({ type: "gear", target: actor.id, value: 1, label: "翻滚反击 · 伤害+30% / 速度+20%" });
      event.note = "翻滚完成 · 保留当前行动";
    } else if (action.id === "wallSpike") {
      hit(target, actor.attack * .9, true); event.kind = "volt";
      if (target.hp > 0) {
        target.stun = Math.max(target.stun, 1); target.shock = { source: actor.id, ticks: 2 };
        event.effects.push({ type: "stun", target: target.id, value: 1 }, { type: "shock", target: target.id, value: 2 });
      }
      event.note = "电刺穿透 · 直接伤害、击倒与持续电击";
    } else if (action.id === "anchor") {
      const protectedUnit = rear(actor) ? frontline(state, "ally") : actor;
      actor.tempestRush = 2; protectedUnit.anchorGuard = { source: actor.id, ticks: 2 }; event.targets = [...new Set([actor.id, protectedUnit.id])];
      if (isLegendary(actor)) { actor.legendaryChain = 2; actor.legendaryRoll = false; }
      event.effects.push({ type: "gear", target: protectedUnit.id, value: 1, label: "回避锚点已部署" }, { type: "gear", target: actor.id, value: 2, label: isLegendary(actor) ? '无限突进 · 九连射 / 速度+35%' : "疾风突击 · 三连射 / 速度+35%" });
    } else if (action.id === "razor") {
      event.kind = "knife"; event.shots = [];
      for (const power of [damageRules.razorPower, damageRules.razorReturnPower]) {
        const enemy = target.hp > 0 ? target : frontline(state, "enemy"); if (!enemy) break;
        event.shots.push(enemy.id); hit(enemy, actor.attack * power, true);
        if (enemy.hp > 0) { enemy.bleeding = { source: actor.id, ticks: 2 }; enemy.hobbled = 2; }
      }
      event.targets = [...new Set(event.shots)]; event.note = "旋刃双段切割 · 回程追击";
      for (const id of event.targets) event.effects.push({ type: "gear", target: id, value: 2, label: "旋刃流血 · 减速" });
    } else if (action.id === "breachFlash") {
      target.blinded = 1; event.kind = "flash"; event.effects.push({ type: "blinded", target: target.id, value: 1 });
    } else if (action.id === "silent") {
      actor.marked = 0; actor.traced = 0; actor.stealth = 2;
      event.effects.push({ type: "gear", target: actor.id, value: 2, label: "静默潜袭" });
    } else if (action.id === "triple") {
      event.shots = [];
      for (let i = 0; i < 3; i++) { const enemy = target.hp > 0 ? target : frontline(state, "enemy"); if (!enemy) break; event.shots.push(enemy.id); hit(enemy, actor.attack * damageRules.handCannonPower, true); }
      event.targets = [...new Set(event.shots)];
    } else if (action.id === "wolfSmoke") {
      state.smoke.ally = Math.max(1, state.smoke.ally); event.targets = living(state, "ally").map(unit => unit.id);
      event.note = "突破烟幕展开";
    } else if (action.id === "overdrive") {
      actor.overdrive = 2; event.effects.push({ type: "overdrive", target: actor.id, value: 2 });
    } else if (action.id === "volt") {
      const targets = areaTargets(state, target); event.targets = targets.map(unit => unit.id);
      for (const enemy of targets) { hit(enemy, 30, true); if (enemy.hp > 0) { enemy.shock = { source: actor.id, ticks: 2 }; event.effects.push({ type: "shock", target: enemy.id, value: 2 }); } }
    } else if (action.id === "frag") {
      event.targets = foes.map(unit => unit.id);
      for (const enemy of foes) hit(enemy, enemy.id === target.id ? 64 : 30, true);
    } else if (action.id === "reconArrow" || action.id === "decode") {
      const targets = action.id === "decode" ? [target] : foes;
      event.targets = targets.map(unit => unit.id);
      for (const enemy of targets) {
        enemy.marked = Math.max(enemy.marked, action.id === "decode" ? 3 : 2);
        if (action.id === "decode") enemy.traced = 3;
        event.effects.push({ type: "marked", target: enemy.id, value: enemy.marked });
      }
    } else if (action.id === "knife") {
      hit(target, actor.attack + 25 + (target.traced ? 20 : 0), true);
      if (target.hp > 0) target.jammed = 1;
      event.effects.push({ type: "jammed", target: target.id, value: 1 });
    } else if (action.id === "flash") {
      target.blinded = target.traced ? 2 : 1;
      event.effects.push({ type: "blinded", target: target.id, value: target.blinded });
    } else if (action.id === "air") {
      event.targets = foes.map(enemy => enemy.id);
      if (isLegendary(actor)) { legendaryBomb(); actor.legendaryBombArmed = !!hasNextWave(state); }
      else {
        const bombs = foes.filter(enemy => enemy.bomb).map(enemy=>({host:enemy,charge:enemy.bomb}));
        for (const {host} of bombs) host.bomb = null;
        for (const enemy of foes) hit(enemy, actor.attack * ((actor.stars || 1) >= 2 ? 4.8 : 3.2), true);
        for (const {host,charge} of bombs) detonateC4(host,charge);
        for (const enemy of foes.filter(enemy=>enemy.hp>0)) {
          enemy.stun = Math.max(enemy.stun, 1);
          event.effects.push({ type: "stun", target: enemy.id, value: 1 });
        }
      }
      if (!isLegendary(actor)) event.note = `${(actor.stars || 1) >= 2 ? 480 : 320}% 全体爆炸 · 遥爆 C4 · 击倒幸存者 · 前排震荡集火 +35%`;
    } else if (action.id === "dash") {
      actor.boosted = true; hit(target, actor.attack * [0, 2.2, 2.8, 3.4][Math.min(3, actor.stars || 1)]);
      event.name = "动力推进 · 突击射击";
    } else if (action.id === "bomb") {
      target.bomb = { source: actor.id, stacks: target.bomb?.stacks || 0 }; event.effects.push({ type: "bomb", target: target.id, value: 1 });
    } else if (action.id === "cover") {
      const value = actor.side === "ally" ? 145 : 80;
      state.covers[actor.side] = value; event.targets = [frontline(state, actor.side).id];
      event.effects.push({ type: "cover", target: event.targets[0], value });
    } else if (action.id === "fire") {
      const targets = areaTargets(state, target); event.targets = targets.map(unit => unit.id);
      for (const enemy of targets) { hit(enemy, 48, true); if (enemy.hp > 0) { enemy.burn = 2; enemy.burnSource = actor.id; event.effects.push({ type: "burn", target: enemy.id, value: 2 }); } }
    } else if (action.id === "missile") {
      event.targets = foes.map(unit => unit.id);
      for (const enemy of foes) hit(enemy, enemy.id === target.id ? 107 : 67, true);
    } else if (action.id === "drone") {
      state.walls.ally = 2; event.kind = "smoke"; event.targets = living(state, "ally").map(unit => unit.id);
      event.note = "烟墙展开 · 枪械减伤 50%";
    } else if (action.id === "smoke") {
      state.smoke.ally = 2; state.dyed.ally = false;
      event.targets = living(state, "ally").map(unit => unit.id); event.note = "蜂巢烟雾已铺设，尚未染烟";
    } else if (action.id === "heal") {
      heal(target, 120); target.regen = 2;
      if (state.smoke.ally) {
        state.dyed.ally = true; state.smoke.ally = 2;
        for (const ally of living(state, "ally")) heal(ally, 25);
        event.targets = living(state, "ally").map(unit => unit.id); event.note = "激素染烟 · 全队持续治疗";
      }
    } else if (action.id === "barrage") {
      event.name = `${actor.name} · 扫射火力`; event.targets = foes.map(unit => unit.id);
      for (const enemy of foes) hit(enemy, actor.attack * .72);
    }
    actionModifiers = Object.fromEntries(["overdrive", "stealth", "rollBoost", "adrenaline", "suppressed", "blinded"].map(key => [key, actor[key]]));
    if (!support && !action.ultimate && !action.freeAction) consume();
    if (isLegendary(actor) && actor.id === 'tempest' && action.id === 'attack') {
      if (continueTempest) { actor.tempestRush = Math.max(1,actor.tempestRush); actor.legendaryRoll = true; actor.cooldowns.roll = actionClock(actor); }
      else if (event.shots?.length) { actor.tempestRush = 0; actor.legendaryRoll = false; }
    }
    if (actor.side === "ally") {
      // Multi-hit attacks settle action and weapon energy once, outside the hit loop.
      if (action.ammo) actor.supply.count -= 1;
      else if (action.ultimate) actor.energy = 0;
      else gainEnergy(actor, action.id === "attack" ? 45 : 35);
      if (action.id === "attack" && equipment[actor.equipment?.weapon]?.attackEnergy) {
        if (actor.supply && actor.supply.count < 3) rechargeNeedle(actor, 20);
        else gainEnergy(actor, equipment[actor.equipment.weapon].attackEnergy);
      }
      if (!support) actor.cooldowns[action.id] = actionClock(actor) + skillCooldown(actor, action);
    }
    resolvedAction = true;
    // Free tactical skills retain the turn but are not ultimate casts.
    event.ultimate = !!action.ultimate;
    event.freeAction = !!(action.ultimate || action.freeAction);
    spentAction = !event.freeAction && !rear(actor);
    if (event.freeAction) event.note = `${event.note ? `${event.note} · ` : ""}不消耗行动轴回合`;
    if (support) event.name += " · 后排自动大招";
    else if (rear(actor)) event.name += " · 后排自动支援";
    return record();
  }
  function step(state, command) {
    if (command) validateCommand(state, command);
    const draft = snapshot(state);
    const result = advance(draft, command);
    Object.assign(state, draft);
    if (result && !result.waiting && result.kind !== "wave") events.emit("battle:resolved", { runId: state.campaign?.id || null, round: state.round, actor: result.actor, kills: (result.effects || []).filter(effect => effect.type === "down").length, freeAction: !!result.freeAction });
    return result;
  }
  events.on("combat:action", ({ state, actor, event, resolvedAction, spentAction, support }) => {
    const kills = event.effects.filter(effect => effect.type === "down" && find(state, effect.target)?.side === "enemy");
    const wolf = living(state, "ally").find(unit => unit.id === "dwolf" && rear(unit) && !unit.stun && unit.assistRound !== state.round);
    if (wolf && kills.some(effect => effect.source !== wolf.id && find(state, effect.source)?.side === "ally")) {
      wolf.assistRound = state.round; state.supportQueue.push({ actor: wolf.id, kind: "rally", target: null });
    }
    if (resolvedAction && !support && actor.side === "ally") {
      const damaged = event.effects.filter(effect => effect.type === "damage" && find(state, effect.target)?.side === "enemy");
      for (const ally of living(state, "ally").filter(unit => rear(unit) && unit.id !== actor.id && !unit.stun && unit.supportBlockedRound !== state.round)) {
        if (ally.id === "uluru" && Formation.frontSlot(actor.slot) && spentAction) gainEnergy(ally, 10);
        if (ally.assistRound === state.round) continue;
        let task;
        if (Formation.frontSlot(actor.slot) && ["vyron", "luna", "hackclaw", "raptor"].includes(ally.id)) {
          const target = damaged.map(effect => find(state, effect.target)).find(unit => unit.hp > 0 && (ally.id === "vyron" || unit.marked));
          if (target) task = { actor: ally.id, kind: "assist", target: target.id };
        }
        if (task) { ally.assistRound = state.round; state.supportQueue.push(task); }
      }
    }
    for (const ally of living(state, "ally").filter(unit => offAxis(unit) && !unit.stun && unit.supportBlockedRound !== state.round && unit.energy >= 100)) {
      if (!state.supportQueue.some(task => task.actor === ally.id && task.kind === "ultimate")) state.supportQueue.push({ actor: ally.id, kind: "ultimate", target: null });
    }
  });
  function previewQueue(state) {
    if (state.phase === "finished") return [];
    if (state.timeline) return Timeline.preview(state, initiativeSpeed, offAxis).map(entry => entry.id);
    const queue = state.queue.filter(id => find(state, id).hp > 0 && !offAxis(find(state, id)));
    return [...(state.supportQueue || []).filter(task => find(state, task.actor)?.hp > 0).map(task => task.actor), ...queue, ...initiative(state)].slice(0, 6);
  }
  const api = { Formation, Buildcraft, units, operatorIds, statusDefaults, rearPassives, rear, offAxis, combatants, areaTargets, effectiveArmor, damageRules, bleedDamage, knockdownVulnerable, visibleUnits, defeatedEnemies, gainEnergy, needleRounds, initGearState, initRelicState, relicSummary, skillLinkSources, skillCooldown, initiativeSpeed, damageMultiplier, actionOptions, slots, boardSlots, defaultPositions, equipment, equipmentSlots, defaultLoadouts, loadoutStats, createBattle, step, snapshot, intent, availableActions, previewQueue, restoreRelicKeys, refreshStackStats, relicConversion, relicDamageReduction, restoreEquipmentBenefits, legacyGearPenalties };
  Object.assign(api,{relicActions,isLegendary,legendaryDefaults,knockdownBonus,sonicProtection,rescueAura,clearAerosol,reserves,waveRoundLimit,enemyEncounter:Enemies.encounter,Timeline});
  api.previewTimeline = state => state.phase === 'finished' ? [] : state.timeline ? Timeline.preview(state, initiativeSpeed, offAxis) : previewQueue(state).map(id => ({ id }));
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.HaffWar = api;
})(typeof window === "undefined" ? globalThis : window);
