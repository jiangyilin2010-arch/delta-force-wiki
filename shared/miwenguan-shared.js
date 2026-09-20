(function () {
  "use strict";

  const characterBaseDefs = {
    hero: { id: "hero", name: "主角", seal: "人", symbol: "@", iconColor: "#c7a96b", iconGlow: "rgba(199, 169, 107, 0.55)", hp: 320 },
    cat: { id: "cat", name: "忍者猫猫调查员", seal: "忍", symbol: "忍", iconColor: "#d9e0ea", iconGlow: "rgba(222, 230, 240, 0.58)", hp: 250 },
    egg: { id: "egg", name: "椰蛋", seal: "椰", symbol: "椰", iconColor: "#8fd7ff", iconGlow: "rgba(125, 220, 255, 0.58)", hp: 280 },
    night: { id: "night", name: "夜镜", seal: "镜", symbol: "镜", iconColor: "#f1f5f9", iconGlow: "rgba(238, 243, 255, 0.62)", hp: 260 },
    hathor: { id: "hathor", name: "哈托尔 · 赤日双冕", seal: "哈", symbol: "哈", iconColor: "#f1cf7a", iconGlow: "rgba(241, 207, 122, 0.62)", hp: 300 },
    bastet: { id: "bastet", name: "巴斯特 · 月刃", seal: "月", symbol: "月", iconColor: "#e1b956", iconGlow: "rgba(225, 185, 86, 0.64)", hp: 270 }
  };

  const characterOrder = ["hero", "cat", "egg", "night", "hathor", "bastet"];

  const backpackConfigs = [
    { name: "灰白旧背包", short: "灰白", className: "tier-1", slots: 14, columns: 6, materials: {} },
    { name: "绿色加宽背包", short: "绿色", className: "tier-2", slots: 18, columns: 6, materials: { cloth: 4, wood: 2 } },
    { name: "蓝色框架背包", short: "蓝色", className: "tier-3", slots: 22, columns: 7, materials: { cloth: 6, wood: 4, metal: 2 } },
    { name: "紫色工坊背包", short: "紫色", className: "tier-4", slots: 26, columns: 7, materials: { cloth: 8, metal: 4, thread: 3 } },
    { name: "金色秘纹背包", short: "金色", className: "tier-5", slots: 30, columns: 8, materials: { cloth: 10, metal: 6, thread: 4, crystal: 2 } },
    { name: "红色馆长背包", short: "红色", className: "tier-6", slots: 36, columns: 8, materials: { cloth: 12, metal: 8, thread: 6, crystal: 3 } }
  ];

  const petDefs = {
    spark: {
      name: "赤豆团子",
      short: "赤豆",
      seal: "赤",
      skill: "撞击伤害",
      color: "#c37a68",
      glow: "rgba(195, 122, 104, 0.45)",
      markColor: "#ffb19a",
      markGlow: "rgba(255, 177, 154, 0.7)",
      skillName: "团子冲撞",
      skillShort: "冲撞",
      icon: "pet-damage",
      duration: 7,
      cooldown: 18
    },
    mender: {
      name: "糯米团子",
      short: "糯米",
      seal: "糯",
      skill: "持续回血",
      color: "#e6ddc8",
      glow: "rgba(230, 221, 200, 0.42)",
      markColor: "#9edbbd",
      markGlow: "rgba(158, 219, 189, 0.68)",
      skillName: "团子回甘",
      skillShort: "回甘",
      icon: "pet-heal",
      duration: 8,
      cooldown: 22
    },
    guard: {
      name: "青团子",
      short: "青团",
      seal: "青",
      skill: "生成护盾",
      color: "#7dbfa4",
      glow: "rgba(125, 191, 164, 0.42)",
      markColor: "#d7f5ff",
      markGlow: "rgba(125, 220, 255, 0.72)",
      skillName: "团子护壳",
      skillShort: "护壳",
      icon: "pet-shield",
      duration: 9,
      cooldown: 24
    },
    cooler: {
      name: "绿豆团子",
      short: "绿豆",
      seal: "绿",
      skill: "清暑降温",
      color: "#84c480",
      glow: "rgba(132, 196, 128, 0.46)",
      markColor: "#daf4bc",
      markGlow: "rgba(218, 244, 188, 0.72)",
      skillName: "清暑凉雾",
      skillShort: "凉雾",
      icon: "pet-cool",
      duration: 9,
      cooldown: 24
    }
  };

  function clone(value) {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function itemSize(item) {
    const shape = String(item?.shape || "1x1").toLowerCase();
    const match = shape.match(/^(\d+)x(\d+)$/);
    if (!match) return 1;
    return Math.max(1, Number(match[1]) || 1) * Math.max(1, Number(match[2]) || 1);
  }

  function itemFootprint(item) {
    const shape = String(item?.shape || "1x1").toLowerCase();
    const match = shape.match(/^(\d+)x(\d+)$/);
    return {
      width: Math.max(1, Number(match?.[1]) || 1),
      height: Math.max(1, Number(match?.[2]) || 1)
    };
  }

  function layoutItems(items, columns, limit) {
    const occupied = new Set();
    return items.map((item) => {
      const footprint = itemFootprint(item);
      for (let slot = 0; slot < limit; slot += 1) {
        const x = slot % columns;
        const y = Math.floor(slot / columns);
        if (x + footprint.width > columns) continue;
        let fits = true;
        for (let yy = 0; yy < footprint.height; yy += 1) {
          for (let xx = 0; xx < footprint.width; xx += 1) {
            const key = (y + yy) * columns + x + xx;
            if (key >= limit || occupied.has(key)) fits = false;
          }
        }
        if (!fits) continue;
        for (let yy = 0; yy < footprint.height; yy += 1) {
          for (let xx = 0; xx < footprint.width; xx += 1) {
            occupied.add((y + yy) * columns + x + xx);
          }
        }
        return slot;
      }
      return 0;
    });
  }

  function slotStyle(slot, footprint = { width: 1, height: 1 }, columns = 6) {
    const safeFootprint = footprint || { width: 1, height: 1 };
    const x = Number(slot || 0) % columns;
    const y = Math.floor(Number(slot || 0) / columns);
    return `grid-column:${x + 1} / span ${safeFootprint.width || 1}; grid-row:${y + 1} / span ${safeFootprint.height || 1};`;
  }

  window.MiwenguanShared = Object.freeze({
    characterBaseDefs,
    characterOrder,
    backpackConfigs,
    petDefs,
    clone,
    itemSize,
    itemFootprint,
    layoutItems,
    slotStyle
  });
})();
