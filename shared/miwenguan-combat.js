(() => {
  const TAU = Math.PI * 2;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function distance(a, b) {
    return Math.hypot((a?.x || 0) - (b?.x || 0), (a?.y || 0) - (b?.y || 0));
  }

  function angleTo(a, b) {
    return Math.atan2((b?.y || 0) - (a?.y || 0), (b?.x || 0) - (a?.x || 0));
  }

  function pointSegmentDistance(px, py, ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    const lengthSq = dx * dx + dy * dy || 1;
    const t = clamp(((px - ax) * dx + (py - ay) * dy) / lengthSq, 0, 1);
    return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
  }

  function diamond(ctx, x, y, size, fill, stroke) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.fillRect(-size, -size, size * 2, size * 2);
    ctx.strokeRect(-size, -size, size * 2, size * 2);
    ctx.restore();
  }

  function crescent(ctx, x, y, radius, angle, color, alpha = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(-radius * 0.18, 0, radius, -Math.PI * 0.82, Math.PI * 0.82, false);
    ctx.arc(radius * 0.36, 0, radius * 0.92, Math.PI * 0.82, -Math.PI * 0.82, true);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 247, 216, 0.92)";
    ctx.lineWidth = Math.max(2, radius * 0.1);
    ctx.stroke();
    ctx.restore();
  }

  function create(adapter) {
    const state = {
      time: 0,
      heroOuterOrbActiveLeft: 0,
      heroOuterOrbCooldownLeft: 0,
      heroOrbSpinBoostActive: false,
      heroOrbIdleStillTime: 0,
      heroOrbFocusProgress: 0,
      heroHaloPulse: 0,
      catClawCooldownLeft: 0,
      catTeleportCooldownLeft: 0,
      catExecuteCooldownLeft: 0,
      catClaws: [],
      catExecutionState: null,
      catExecutionMarks: [],
      eggBeamCooldownLeft: 0,
      eggBallCooldownLeft: 0,
      eggBallCharges: 2,
      eggBallRechargeLeft: 0,
      eggBeam: { active: false, activeLeft: 0, duration: 3.2, angle: 0, tick: 0, range: 455, width: 56 },
      eggBalls: [],
      iceFields: [],
      nightShardCooldownLeft: 0,
      nightBloodModeLeft: 0,
      nightBloodModeCooldownLeft: 0,
      nightAfterimageCooldownLeft: 0,
      nightAfterimage: null,
      nightShardProjectiles: [],
      nightComboIndex: 0,
      hathorRage: 0,
      hathorSekhmetLeft: 0,
      hathorTransformLeft: 0,
      hathorReturnLeft: 0,
      hathorStillTime: 0,
      hathorQuietTime: 0,
      hathorBellFieldKind: "hathor",
      hathorBellCooldownLeft: 0,
      hathorBellFieldLeft: 0,
      hathorBurstCooldownLeft: 0,
      sekhmetBellCooldownLeft: 0,
      sekhmetBurstCooldownLeft: 0,
      hathorShield: 0,
      bastetStepCooldownLeft: 0,
      bastetCounterCooldownLeft: 0,
      bastetCounterLeft: 0,
      bastetCounterCharges: 0,
      bastetMoonShadow: null,
      bastetMoonBlades: [],
      bursts: [],
      pet: {
        x: adapter.player().x - 76,
        y: adapter.player().y + 58,
        activeLeft: 0,
        cooldownLeft: 0,
        tickLeft: 0,
        shield: 0,
        squash: 0
      }
    };

    const cfg = {
      heroOuterOrbDuration: 10,
      heroOuterOrbCooldown: 15,
      heroHaloRadius: 92,
      heroHaloDamageRadius: 112,
      heroHaloBulletRadius: 124,
      heroHaloLaserRadius: 132,
      heroOrbIdleCharge: 2,
      heroOrbRampUp: 1.05,
      heroOrbRampDown: 0.8,
      catClawCooldown: 1.5,
      catTeleportCooldown: 5.8,
      catExecuteCooldown: 3.2,
      catExecutionDuration: 3.65,
      catExecutionApproach: 0.62,
      catExecutionDraw: 1.55,
      catExecutionShuriken: 0.86,
      catExecutionMarkDuration: 7.5,
      catExecutionStarRadius: 86,
      catExecutionGuardRadius: 142,
      catExecutionBossDamage: 14,
      catExecutionBossStun: 1.45,
      catExecutionPvpDamage: 72,
      eggBeamCooldown: 5.2,
      eggBallCooldown: 8.8,
      nightShardCooldown: 0.85,
      nightBloodDuration: 12,
      nightBloodCooldown: 18,
      nightAfterimageCooldown: 10,
      nightAfterimageTauntRadius: 860,
      nightAfterimageDamageReduction: 0.6,
      nightBurnDuration: 6,
      hathorSekhmetDuration: 10,
      hathorBellCooldown: 14,
      hathorBellField: 7,
      hathorBellPersist: 6,
      hathorTransform: 1.08,
      hathorReturn: 1.18,
      hathorReturnTrigger: 3,
      hathorBurstCooldown: 12,
      bastetStepCooldown: 8.5,
      bastetStepShadow: 6.5,
      bastetCounterCooldown: 13,
      bastetCounterDuration: 5.2
    };

    function selected() {
      return adapter.selectedCharacter();
    }

    function player() {
      return adapter.player();
    }

    function health() {
      return adapter.activeHealth();
    }

    function enemies() {
      return adapter.enemies();
    }

    function prompt(html) {
      adapter.prompt?.(html);
    }

    function flash(x, y, color) {
      adapter.flash?.(x, y, color);
    }

    function canAct() {
      return !adapter.runEnded?.() && !adapter.blocked?.();
    }

    function aim(range = 760) {
      return adapter.aimPoint ? adapter.aimPoint(range) : { x: player().x + range, y: player().y };
    }

    function target(range = 760) {
      return adapter.nearestEnemy ? adapter.nearestEnemy(range) : null;
    }

    function damageEnemy(enemy, amount, source, quiet = true) {
      if (!enemy || enemy.dead) return false;
      markHathorCombat(source);
      let finalAmount = Number(amount || 0) * hathorFieldAttackMultiplier();
      if (hathorFieldActive() && source !== "灼烧" && source !== "赤砂领域" && Math.random() < hathorFieldCritChance()) {
        finalAmount *= hathorFieldCritDamageMultiplier();
        burst(enemy.x, enemy.y - (enemy.r || enemy.radius || 18), 42, "#ffe284", "暴击", { duration: 0.52 });
      }
      return adapter.damageEnemy(enemy, finalAmount, source, quiet);
    }

    function active(id) {
      if (id === "hero-focus-spin") return state.heroOrbSpinBoostActive;
      if (id === "hero-outer-orbs") return state.heroOuterOrbActiveLeft > 0;
      if (id === "egg-beam") return state.eggBeam.active;
      if (id === "night-blood") return state.nightBloodModeLeft > 0;
      if (id === "night-afterimage") return Boolean(state.nightAfterimage);
      if (id === "night-blood-reflection") return selected() === "night" && health().hp / Math.max(1, health().maxHp) < 0.5;
      if (id === "hathor-mask") return hathorSekhmetActive();
      if (id === "hathor-bell") return state.hathorBellFieldLeft > 0;
      if (id === "bastet-night-patron") return selected() === "bastet" && bastetNightPatronActive();
      if (id === "bastet-step") return Boolean(state.bastetMoonShadow);
      if (id === "bastet-counter") return state.bastetCounterLeft > 0;
      if (id === "pet") return state.pet.activeLeft > 0;
      return false;
    }

    function hathorSekhmetActive() {
      return selected() === "hathor" && state.hathorSekhmetLeft > 0;
    }

    function hathorFieldActive() {
      return state.hathorBellFieldLeft > 0;
    }

    function hathorFieldTouches(enemy) {
      if (!hathorFieldActive() || !enemy) return false;
      return distance(player(), enemy) <= 230 + (enemy.r || enemy.radius || 20);
    }

    function hathorFieldSpeedMultiplier() {
      return hathorFieldActive() ? 1.18 : 1;
    }

    function hathorFieldEnemySlowMultiplier(enemy) {
      return hathorFieldTouches(enemy) ? 0.58 : 1;
    }

    function hathorFieldDefenseMultiplier() {
      return hathorFieldActive() ? 0.84 : 1;
    }

    function hathorFieldEnemyDamageMultiplier() {
      return hathorFieldActive() ? 0.82 : 1;
    }

    function hathorFieldAttackMultiplier() {
      return hathorFieldActive() ? 1.22 : 1;
    }

    function hathorFieldCritChance() {
      return hathorFieldActive() ? 0.18 : 0;
    }

    function hathorFieldCritDamageMultiplier() {
      return hathorFieldActive() ? 1.55 : 1;
    }

    function markHathorCombat(source = "") {
      if (selected() !== "hathor") return;
      if (["灼烧", "赤砂领域", "赤砂圣铃", "圣铃"].includes(source)) return;
      state.hathorQuietTime = 0;
    }

    function extendHathorFieldAfterChange() {
      if (state.hathorBellFieldLeft > 0) state.hathorBellFieldLeft = Math.max(state.hathorBellFieldLeft, cfg.hathorBellPersist);
    }

    function reduceSekhmetSunCooldown(amount = 0) {
      const reduction = clamp(2 + Number(amount || 0) * 0.08, 2, 4.5);
      state.sekhmetBurstCooldownLeft = Math.max(0, state.sekhmetBurstCooldownLeft - reduction);
      burst(player().x, player().y, 78, "#e5583e", "日轮", { duration: 0.48 });
    }

    function hathorFormInfo() {
      const sekhmet = hathorSekhmetActive();
      return {
        active: sekhmet,
        name: sekhmet ? "塞赫麦特 · 赤砂祭司" : "哈托尔 · 赤日双冕",
        symbol: sekhmet ? "塞" : "哈",
        iconColor: sekhmet ? "#e5583e" : "#f1cf7a",
        iconGlow: sekhmet ? "rgba(229, 88, 62, 0.82)" : "rgba(241, 207, 122, 0.62)"
      };
    }

    function triggerHathorSekhmet() {
      if (selected() !== "hathor" || state.hathorSekhmetLeft > 0 || state.hathorTransformLeft > 0) return;
      extendHathorFieldAfterChange();
      state.hathorTransformLeft = cfg.hathorTransform;
      state.hathorReturnLeft = 0;
      state.hathorStillTime = 0;
      state.hathorQuietTime = 0;
      burst(player().x, player().y, 250, "#e5583e", "翻面", { type: "hathor-form", duration: cfg.hathorTransform });
      flash(player().x, player().y, "#e5583e");
      prompt("<strong>哈托尔</strong> 赤日双冕开始翻面。");
    }

    function completeHathorSekhmetTransform() {
      if (selected() !== "hathor") return;
      state.hathorSekhmetLeft = cfg.hathorSekhmetDuration;
      state.hathorRage = 0;
      state.hathorTransformLeft = 0;
      player().sekhmetLeft = state.hathorSekhmetLeft;
      burst(player().x, player().y, 250, "#e5583e", "塞", { type: "hathor-form", duration: 0.55 });
      flash(player().x, player().y, "#e5583e");
      prompt("<strong>塞赫麦特</strong> 赤日双冕翻面。");
    }

    function startHathorReturn() {
      if (selected() !== "hathor" || state.hathorReturnLeft > 0 || state.hathorSekhmetLeft <= 0) return;
      extendHathorFieldAfterChange();
      state.hathorReturnLeft = cfg.hathorReturn;
      burst(player().x, player().y, 170, "#a6363e", "石榴", { type: "hathor-pomegranate", duration: cfg.hathorReturn });
    }

    function completeHathorReturn() {
      if (selected() !== "hathor") return;
      state.hathorSekhmetLeft = 0;
      state.hathorReturnLeft = 0;
      state.hathorStillTime = 0;
      state.hathorQuietTime = 0;
      player().sekhmetLeft = 0;
      burst(player().x, player().y, 150, "#f1cf7a", "哈", { duration: 0.62 });
      prompt("<strong>哈托尔</strong> 金杯光芒回流。");
    }

    function skillDefs(extra = {}) {
      const pet = petDef();
      const defs = {
        hero: [
          { id: "hero-inner-orbs", name: "内圈光球", short: "内圈", icon: "orbs", keyLabel: "被动", passive: true },
          { id: "hero-focus-spin", name: "凝光回旋", short: "凝光", icon: "orbs", keyLabel: "被动", passive: true, active: () => active("hero-focus-spin") },
          { id: "hero-outer-orbs", name: "外圈光环", short: "光环", icon: "orbs", keyLabel: "Q/空格", activeLabel: "展开", cooldownLeft: () => cooldown("hero-outer-orbs"), cooldownMax: () => cooldownMax("hero-outer-orbs"), active: () => active("hero-outer-orbs") }
        ],
        cat: [
          { id: "cat-stealth", name: "潜行疾走", short: "潜行", icon: "teleport", keyLabel: "被动", passive: true },
          { id: "cat-teleport", name: "瞬移", short: "瞬移", icon: "teleport", keyLabel: "R", cooldownLeft: () => cooldown("cat-teleport"), cooldownMax: () => cooldownMax("cat-teleport") },
          { id: "cat-claw", name: "三重猫爪", short: "猫爪", icon: "claw", keyLabel: "Q", cooldownLeft: () => cooldown("cat-claw"), cooldownMax: () => cooldownMax("cat-claw") },
          { id: "cat-execution", name: "五芒星处决", short: "处决", icon: "execute", keyLabel: "E", unlocked: catExecutionUnlocked, active: () => Boolean(state.catExecutionState), cooldownLeft: () => cooldown("cat-execution"), cooldownMax: () => cooldownMax("cat-execution") }
        ],
        egg: [
          { id: "egg-beam", name: "冰冻爷爷", short: "爷爷", icon: "beam", keyLabel: "Q长按", activeLabel: "持续", cooldownLeft: () => cooldown("egg-beam"), cooldownMax: () => cooldownMax("egg-beam"), active: () => active("egg-beam") },
          { id: "egg-ball", name: "冰冻奶奶", short: "奶奶", icon: "iceball", keyLabel: "R", cooldownLeft: () => cooldown("egg-ball"), cooldownMax: () => cooldownMax("egg-ball"), charges: () => charges("egg-ball"), maxCharges: () => maxCharges("egg-ball") }
        ],
        night: [
          { id: "night-shard", name: "镜片碎击", short: "镜片", icon: "mirror", keyLabel: "Q/左键", cooldownLeft: () => cooldown("night-shard"), cooldownMax: () => cooldownMax("night-shard") },
          { id: "night-blood", name: "赤镜模式", short: "赤镜", icon: "bloodmirror", keyLabel: "R", activeLabel: "赤镜", cooldownLeft: () => cooldown("night-blood"), cooldownMax: () => cooldownMax("night-blood"), active: () => active("night-blood") },
          { id: "night-afterimage", name: "回烬镜面", short: "镜面", icon: "shade", keyLabel: "空格/右键", activeLabel: "回位", cooldownLeft: () => cooldown("night-afterimage"), cooldownMax: () => cooldownMax("night-afterimage"), active: () => active("night-afterimage") },
          { id: "night-blood-reflection", name: "裂血映照", short: "裂血", icon: "bloodmirror", keyLabel: "被动", passive: true, active: () => active("night-blood-reflection") }
        ],
        hathor: hathorSkillDefs(),
        bastet: [
          { id: "bastet-night-patron", name: "夜行圣宠", short: "夜宠", icon: "shade", keyLabel: "被动", passive: true, active: () => active("bastet-night-patron") },
          { id: "bastet-step", name: "猫神跃步", short: "跃步", icon: "teleport", keyLabel: "Q", activeLabel: "回位", cooldownLeft: () => cooldown("bastet-step"), cooldownMax: () => cooldownMax("bastet-step"), active: () => active("bastet-step") },
          { id: "bastet-counter", name: "月盘反狩", short: "月盘", icon: "moonblade", keyLabel: "R", activeLabel: "反狩", cooldownLeft: () => cooldown("bastet-counter"), cooldownMax: () => cooldownMax("bastet-counter"), active: () => active("bastet-counter") }
        ]
      };
      const list = [...(defs[selected()] || defs.hero)];
      if (pet) {
        list.push({
          id: "pet",
          name: pet.skillName || pet.name,
          short: pet.skillShort || pet.short,
          icon: pet.icon,
          pet: true,
          accentColor: pet.markColor || pet.color,
          keyLabel: "F",
          activeLabel: adapter.selectedPet?.() === "guard" ? `盾${Math.ceil(state.pet.shield)}` : "发动",
          cooldownLeft: () => cooldown("pet"),
          cooldownMax: () => cooldownMax("pet"),
          active: () => active("pet")
        });
      }
      if (extra.teamSwitch) list.push(extra.teamSwitch);
      return list;
    }

    function hathorSkillDefs() {
      const sekhmet = hathorSekhmetActive();
      const accentColor = sekhmet ? "#e5583e" : "#f1cf7a";
      const activeIcon = sekhmet ? "bloodmirror" : "orbs";
      return [
        { id: "hathor-mask", name: sekhmet ? "塞赫麦特形态" : "哈托尔形态", short: sekhmet ? "塞" : "哈", icon: activeIcon, accentColor, keyLabel: "被动", passive: true, active: () => active("hathor-mask") },
        { id: "hathor-bell", name: sekhmet ? "赤砂圣铃" : "圣铃安抚", short: sekhmet ? "赤铃" : "圣铃", icon: activeIcon, accentColor, keyLabel: "Q", activeLabel: "领域", cooldownLeft: () => cooldown("hathor-bell"), cooldownMax: () => cooldownMax("hathor-bell"), active: () => active("hathor-bell") },
        { id: "hathor-cup", name: sekhmet ? "日轮啸杀" : "丰饶金杯", short: sekhmet ? "日轮" : "金杯", icon: activeIcon, accentColor, keyLabel: "R", cooldownLeft: () => cooldown("hathor-cup"), cooldownMax: () => cooldownMax("hathor-cup") }
      ];
    }

    function currentHathorBellCooldownLeft() {
      return hathorSekhmetActive() ? state.sekhmetBellCooldownLeft : state.hathorBellCooldownLeft;
    }

    function currentHathorBurstCooldownLeft() {
      return hathorSekhmetActive() ? state.sekhmetBurstCooldownLeft : state.hathorBurstCooldownLeft;
    }

    function setCurrentHathorBellCooldown(value) {
      if (hathorSekhmetActive()) state.sekhmetBellCooldownLeft = value;
      else state.hathorBellCooldownLeft = value;
    }

    function setCurrentHathorBurstCooldown(value) {
      if (hathorSekhmetActive()) state.sekhmetBurstCooldownLeft = value;
      else state.hathorBurstCooldownLeft = value;
    }

    function cooldown(id) {
      if (id === "hero-outer-orbs") return state.heroOuterOrbCooldownLeft;
      if (id === "cat-claw") return state.catClawCooldownLeft;
      if (id === "cat-teleport") return state.catTeleportCooldownLeft;
      if (id === "cat-execution") return state.catExecuteCooldownLeft;
      if (id === "egg-beam") return state.eggBeam.active ? state.eggBeam.activeLeft : state.eggBeamCooldownLeft;
      if (id === "egg-ball") return state.eggBallCharges > 0 ? 0 : state.eggBallRechargeLeft;
      if (id === "night-shard") return state.nightShardCooldownLeft;
      if (id === "night-blood") return state.nightBloodModeLeft > 0 ? state.nightBloodModeLeft : state.nightBloodModeCooldownLeft;
      if (id === "night-afterimage") return state.nightAfterimage ? 0 : state.nightAfterimageCooldownLeft;
      if (id === "hathor-bell") return state.hathorBellFieldLeft > 0 ? state.hathorBellFieldLeft : currentHathorBellCooldownLeft();
      if (id === "hathor-cup") return currentHathorBurstCooldownLeft();
      if (id === "bastet-step") return state.bastetMoonShadow ? 0 : state.bastetStepCooldownLeft;
      if (id === "bastet-counter") return state.bastetCounterLeft > 0 ? state.bastetCounterLeft : state.bastetCounterCooldownLeft;
      if (id === "pet") return state.pet.activeLeft > 0 ? state.pet.activeLeft : state.pet.cooldownLeft;
      return 0;
    }

    function cooldownMax(id) {
      if (id === "hero-outer-orbs") return cfg.heroOuterOrbCooldown;
      if (id === "cat-claw") return cfg.catClawCooldown;
      if (id === "cat-teleport") return cfg.catTeleportCooldown;
      if (id === "cat-execution") return cfg.catExecuteCooldown;
      if (id === "egg-beam") return state.eggBeam.active ? state.eggBeam.duration : cfg.eggBeamCooldown;
      if (id === "egg-ball") return cfg.eggBallCooldown;
      if (id === "night-shard") return cfg.nightShardCooldown;
      if (id === "night-blood") return state.nightBloodModeLeft > 0 ? cfg.nightBloodDuration : cfg.nightBloodCooldown;
      if (id === "night-afterimage") return cfg.nightAfterimageCooldown;
      if (id === "hathor-bell") return state.hathorBellFieldLeft > 0 ? cfg.hathorBellField : cfg.hathorBellCooldown;
      if (id === "hathor-cup") return cfg.hathorBurstCooldown;
      if (id === "bastet-step") return cfg.bastetStepCooldown;
      if (id === "bastet-counter") return state.bastetCounterLeft > 0 ? cfg.bastetCounterDuration : cfg.bastetCounterCooldown;
      if (id === "pet") return state.pet.activeLeft > 0 ? petDuration() : petCooldown();
      return 0;
    }

    function charges(id) {
      return id === "egg-ball" ? state.eggBallCharges : 0;
    }

    function maxCharges(id) {
      return id === "egg-ball" ? 2 : 0;
    }

    function snapshot() {
      return {
        skillTime: state.time,
        heroOuterOrbActiveLeft: state.heroOuterOrbActiveLeft,
        heroOuterOrbCooldownLeft: state.heroOuterOrbCooldownLeft,
        heroOrbSpinBoostActive: state.heroOrbSpinBoostActive,
        heroOrbIdleStillTime: state.heroOrbIdleStillTime,
        heroOrbFocusProgress: state.heroOrbFocusProgress,
        catClawCooldownLeft: state.catClawCooldownLeft,
        catTeleportCooldownLeft: state.catTeleportCooldownLeft,
        eggBeamCooldownLeft: state.eggBeamCooldownLeft,
        eggBallCooldownLeft: state.eggBallCharges > 0 ? 0 : state.eggBallRechargeLeft,
        eggBeam: { ...state.eggBeam },
        nightShardCooldownLeft: state.nightShardCooldownLeft,
        nightBloodModeLeft: state.nightBloodModeLeft,
        nightBloodModeCooldownLeft: state.nightBloodModeCooldownLeft,
        nightAfterimageCooldownLeft: state.nightAfterimageCooldownLeft,
        nightAfterimage: state.nightAfterimage,
        hathorRage: state.hathorRage,
        hathorSekhmetLeft: state.hathorSekhmetLeft,
        hathorBellCooldownLeft: state.hathorBellCooldownLeft,
        hathorBurstCooldownLeft: state.hathorBurstCooldownLeft,
        sekhmetBellCooldownLeft: state.sekhmetBellCooldownLeft,
        sekhmetBurstCooldownLeft: state.sekhmetBurstCooldownLeft,
        bastetMoonShadow: state.bastetMoonShadow,
        catExecutionActive: Boolean(state.catExecutionState)
      };
    }

    function syncPlayerFields() {
      const p = player();
      p.hathorBellCooldown = state.hathorBellCooldownLeft;
      p.hathorBurstCooldown = state.hathorBurstCooldownLeft;
      p.sekhmetBellCooldown = state.sekhmetBellCooldownLeft;
      p.sekhmetBurstCooldown = state.sekhmetBurstCooldownLeft;
      p.coolFieldLeft = state.hathorBellFieldLeft;
      p.hathorShield = Math.max(p.hathorShield || 0, state.hathorShield);
      p.hathorRage = state.hathorRage;
      p.sekhmetLeft = state.hathorSekhmetLeft;
      p.bastetStepCooldown = state.bastetStepCooldownLeft;
      p.bastetCounterCooldown = state.bastetCounterCooldownLeft;
      p.bastetCounterLeft = state.bastetCounterLeft;
      p.bastetCounterCharges = state.bastetCounterCharges;
      p.executeCooldown = state.catExecuteCooldownLeft;
    }

    function setCooldowns(dt) {
      [
        "heroOuterOrbCooldownLeft",
        "catClawCooldownLeft",
        "catTeleportCooldownLeft",
        "catExecuteCooldownLeft",
        "eggBeamCooldownLeft",
        "nightShardCooldownLeft",
        "nightBloodModeCooldownLeft",
        "nightAfterimageCooldownLeft",
        "hathorBellCooldownLeft",
        "hathorBurstCooldownLeft",
        "sekhmetBellCooldownLeft",
        "sekhmetBurstCooldownLeft",
        "bastetStepCooldownLeft",
        "bastetCounterCooldownLeft"
      ].forEach((key) => { state[key] = Math.max(0, state[key] - dt); });
      state.heroOuterOrbActiveLeft = Math.max(0, state.heroOuterOrbActiveLeft - dt);
      state.nightBloodModeLeft = Math.max(0, state.nightBloodModeLeft - dt);
      state.hathorBellFieldLeft = Math.max(0, state.hathorBellFieldLeft - dt);
      state.hathorShield = Math.max(0, state.hathorShield - dt * 1.6);
      if (state.bastetCounterLeft > 0) {
        state.bastetCounterLeft = Math.max(0, state.bastetCounterLeft - dt);
        if (state.bastetCounterLeft <= 0) state.bastetCounterCharges = 0;
      }
      if (state.eggBallCharges < 2) {
        state.eggBallRechargeLeft = Math.max(0, state.eggBallRechargeLeft - dt);
        if (state.eggBallRechargeLeft <= 0) {
          state.eggBallCharges += 1;
          state.eggBallRechargeLeft = state.eggBallCharges < 2 ? cfg.eggBallCooldown : 0;
        }
      }
    }

    function update(dt, movingIntent) {
      state.time += dt;
      setCooldowns(dt);
      updateHero(dt, movingIntent);
      updateCat(dt);
      updateEgg(dt);
      updateNight(dt);
      updateHathor(dt, movingIntent);
      updateBastet(dt);
      updatePet(dt);
      updateBursts(dt);
      syncPlayerFields();
      return true;
    }

    function use(key = "") {
      if (!canAct()) return false;
      const id = selected();
      const normalized = key.toLowerCase();
      if (normalized === "f") return usePet();
      if (id === "hero" && (normalized === "q" || normalized === " " || normalized === "attack")) return castHeroOuter();
      if (id === "cat") {
        if (normalized === "q" || normalized === "attack") return castCatClaw();
        if (normalized === "r" || normalized === " ") return castCatTeleport();
        if (normalized === "execute" || normalized === "e") return castCatExecution();
      }
      if (id === "egg") {
        if (normalized === "q" || normalized === "attack") return startEggBeam();
        if (normalized === "r" || normalized === " ") return castEggBall();
      }
      if (id === "night") {
        if (normalized === "q" || normalized === "attack") return fireNightShard();
        if (normalized === "r") return castNightBlood();
        if (normalized === " " || normalized === "right") return castNightAfterimage();
      }
      if (id === "hathor") {
        if (normalized === "q" || normalized === "attack") return castHathorBell();
        if (normalized === "r" || normalized === " ") return castHathorBurst();
      }
      if (id === "bastet") {
        if (normalized === "q" || normalized === "attack") return castBastetStep();
        if (normalized === "r" || normalized === " ") return castBastetCounter();
      }
      return false;
    }

    function release(key = "") {
      if (key.toLowerCase() === "q" && selected() === "egg") stopEggBeam();
    }

    function castHeroOuter() {
      if (state.heroOuterOrbCooldownLeft > 0) {
        prompt(`<strong>主角</strong> 冷却 ${Math.ceil(state.heroOuterOrbCooldownLeft)} 秒。`);
        return false;
      }
      state.heroOuterOrbActiveLeft = cfg.heroOuterOrbDuration;
      state.heroOuterOrbCooldownLeft = cfg.heroOuterOrbCooldown;
      state.heroHaloPulse = 0.28;
      adapter.recordSkillUse?.("hero");
      burst(player().x, player().y, 190, "#ffe09a", "外圈");
      prompt("<strong>主角</strong> 外圈光球展开。");
      return true;
    }

    function heroOrbSpinMultiplier(movingIntent) {
      if (state.heroOuterOrbActiveLeft > 0) return 2.9;
      if (state.heroOrbFocusProgress > 0) return 1 + (2.3 - 1) * smooth(state.heroOrbFocusProgress);
      return movingIntent ? 1 : 1.12;
    }

    function updateHero(dt, movingIntent) {
      state.heroHaloPulse = Math.max(0, state.heroHaloPulse - dt);
      const focused = selected() === "hero" && !movingIntent && !adapter.searching?.();
      if (focused) state.heroOrbIdleStillTime = Math.min(cfg.heroOrbIdleCharge, state.heroOrbIdleStillTime + dt);
      else state.heroOrbIdleStillTime = 0;
      const targetFocus = focused && state.heroOrbIdleStillTime >= cfg.heroOrbIdleCharge;
      state.heroOrbFocusProgress = targetFocus
        ? Math.min(1, state.heroOrbFocusProgress + dt / cfg.heroOrbRampUp)
        : Math.max(0, state.heroOrbFocusProgress - dt / cfg.heroOrbRampDown);
      state.heroOrbSpinBoostActive = selected() === "hero" && state.heroOrbFocusProgress > 0.05;
      const orbs = heroOrbPositions(heroOrbSpinMultiplier(movingIntent));
      if (state.heroOuterOrbActiveLeft > 0) {
        enemies().forEach((enemy) => {
          const d = distance(player(), enemy);
          if (d > cfg.heroHaloDamageRadius + (enemy.r || 20)) return;
          const bossScale = enemy.isBoss ? 1 : 0.38;
          damageEnemy(enemy, 9.5 * bossScale * dt, "光环", true);
        });
      }
      orbs.forEach((orb) => {
        enemies().forEach((enemy) => {
          if (distance(orb, enemy) > (enemy.r || 20) + 30 * orb.alpha) return;
          damageEnemy(enemy, (orb.outer ? 8.5 : 4.2) * orb.alpha, "光球", true);
        });
      });
    }

    function heroOrbPositions(multiplier = 1) {
      const p = player();
      const focusAlpha = clamp(state.heroOrbFocusProgress, 0, 1);
      const list = [];
      const innerCount = state.heroOuterOrbActiveLeft > 0 || focusAlpha > 0.1 ? 2 : 1;
      for (let i = 0; i < innerCount; i += 1) {
        const angle = state.time * 2.05 * multiplier + (TAU / innerCount) * i;
        list.push({ x: p.x + Math.cos(angle) * 88, y: p.y + Math.sin(angle) * 88, outer: false, alpha: i === 0 ? 1 : focusAlpha });
      }
      if (state.heroOuterOrbActiveLeft > 0) {
        for (let i = 0; i < 2; i += 1) {
          const angle = -state.time * 1.26 * multiplier + Math.PI * i;
          list.push({ x: p.x + Math.cos(angle) * 150, y: p.y + Math.sin(angle) * 150, outer: true, alpha: 1 });
        }
      }
      return list;
    }

    function castCatClaw() {
      if (state.catClawCooldownLeft > 0) {
        prompt(`<strong>忍者猫猫</strong> 冷却 ${Math.ceil(state.catClawCooldownLeft)} 秒。`);
        return false;
      }
      const p = player();
      const end = aim(620);
      const base = angleTo(p, end);
      [-0.18, 0, 0.18].forEach((offset) => {
        state.catClaws.push({
          x: p.x,
          y: p.y,
          vx: Math.cos(base + offset) * 720,
          vy: Math.sin(base + offset) * 720,
          age: 0,
          life: 0.62,
          hit: new Set()
        });
      });
      state.catClawCooldownLeft = cfg.catClawCooldown;
      adapter.recordSkillUse?.("cat");
      prompt("<strong>忍者猫猫</strong> 银爪掠出。");
      return true;
    }

    function castCatTeleport() {
      if (state.catTeleportCooldownLeft > 0) {
        prompt(`<strong>忍者猫猫</strong> 冷却 ${Math.ceil(state.catTeleportCooldownLeft)} 秒。`);
        return false;
      }
      const p = player();
      const end = aim(330);
      if (adapter.canMoveTo?.(end.x, end.y)) {
        burst(p.x, p.y, 90, "#d9e0ea", "影步");
        p.x = end.x;
        p.y = end.y;
        burst(p.x, p.y, 90, "#d9e0ea", "现身");
      }
      state.catTeleportCooldownLeft = cfg.catTeleportCooldown;
      adapter.recordSkillUse?.("cat");
      return true;
    }

    function castCatExecution() {
      if (state.catExecuteCooldownLeft > 0) return false;
      if (!catExecutionUnlocked() || state.catExecutionState) return false;
      const enemy = target(165);
      if (!enemy) return false;
      state.catExecuteCooldownLeft = cfg.catExecuteCooldown;
      const stand = executionStandPoint(enemy);
      const starPoints = catExecutionStarPoints(enemy.x, enemy.y);
      const mark = {
        x: enemy.x,
        y: enemy.y,
        points: starPoints,
        progress: 0,
        age: 0,
        duration: cfg.catExecutionMarkDuration,
        complete: false
      };
      state.catExecutionMarks.push(mark);
      state.catExecutionState = {
        target: enemy,
        age: 0,
        startX: player().x,
        startY: player().y,
        standX: stand.x,
        standY: stand.y,
        starPoints,
        mark,
        finished: false
      };
      enemy.target = null;
      enemy.wait = Math.max(enemy.wait || 0, cfg.catExecutionDuration);
      enemy.aggro = 0;
      enemy.attackCooldown = Math.max(enemy.attackCooldown || 0, cfg.catExecutionDuration);
      if (enemy.isBoss) {
        enemy.dashCharge = 0;
        enemy.dashDuration = 0;
        enemy.laserCooldown = Math.max(enemy.laserCooldown || 0, cfg.catExecutionDuration);
        enemy.meleeCooldown = Math.max(enemy.meleeCooldown || 0, cfg.catExecutionDuration);
      }
      adapter.recordSkillUse?.("cat");
      prompt(`<strong>${enemy.name || "目标"}</strong> 已锁定。`);
      return true;
    }

    function catExecutionUnlocked() {
      if (typeof adapter.catExecutionUnlocked === "function") return Boolean(adapter.catExecutionUnlocked());
      if (typeof adapter.hasUnlock === "function") return Boolean(adapter.hasUnlock("cat-pentagram-execution"));
      return true;
    }

    function catExecutionStarPoints(cx, cy, radius = cfg.catExecutionStarRadius) {
      const outer = Array.from({ length: 5 }, (_, index) => {
        const angle = -Math.PI / 2 + index * (TAU / 5);
        return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
      });
      return [0, 2, 4, 1, 3, 0].map((index) => outer[index]);
    }

    function executionStandPoint(enemy) {
      const p = player();
      const baseAngle = Math.atan2(p.y - enemy.y, p.x - enemy.x);
      const candidates = [0, 0.7, -0.7, 1.35, -1.35, Math.PI].map((offset) => baseAngle + offset);
      for (const angle of candidates) {
        const point = { x: enemy.x + Math.cos(angle) * 92, y: enemy.y + Math.sin(angle) * 92 };
        if (!adapter.canMoveTo || adapter.canMoveTo(point.x, point.y)) return point;
      }
      return { x: p.x, y: p.y };
    }

    function pointOnPolyline(points, ratio) {
      if (!points.length) return { x: player().x, y: player().y };
      if (points.length === 1) return points[0];
      const lengths = [];
      let total = 0;
      for (let index = 1; index < points.length; index += 1) {
        const segment = distance(points[index], points[index - 1]);
        lengths.push(segment);
        total += segment;
      }
      let remaining = clamp(ratio, 0, 1) * total;
      for (let index = 1; index < points.length; index += 1) {
        const length = lengths[index - 1] || 1;
        if (remaining <= length) {
          const t = remaining / length;
          return {
            x: points[index - 1].x + (points[index].x - points[index - 1].x) * t,
            y: points[index - 1].y + (points[index].y - points[index - 1].y) * t
          };
        }
        remaining -= length;
      }
      return points[points.length - 1];
    }

    function finishCatExecution() {
      const execution = state.catExecutionState;
      if (!execution || execution.finished) return;
      const enemy = execution.target;
      execution.finished = true;
      execution.mark.complete = true;
      execution.mark.progress = 1;
      if (!enemy || enemy.dead || enemy.active === false) return;
      if (enemy.isPvpOpponent) {
        if (typeof adapter.damagePvpOpponent === "function") adapter.damagePvpOpponent(cfg.catExecutionPvpDamage, "五芒星处决");
        else damageEnemy(enemy, cfg.catExecutionPvpDamage, "五芒星处决", true);
        burst(enemy.x, enemy.y, 170, "#d9e0ea", "重创");
      } else if (enemy.isBoss) {
        damageEnemy(enemy, cfg.catExecutionBossDamage, "五芒星处决", true);
        if (!enemy.dead) {
          enemy.stunLeft = Math.max(enemy.stunLeft || 0, cfg.catExecutionBossStun);
          enemy.dashCharge = 0;
          enemy.dashDuration = 0;
          enemy.laserCooldown = Math.max(enemy.laserCooldown || 0, cfg.catExecutionBossStun);
          enemy.meleeCooldown = Math.max(enemy.meleeCooldown || 0, cfg.catExecutionBossStun);
          burst(enemy.x, enemy.y, 170, "#d9e0ea", "眩晕");
        }
      } else {
        enemy.dead = true;
        enemy.target = null;
        enemy.hp = 0;
        enemy.aggro = 0;
        enemy.attackCooldown = 0;
        adapter.recordDefeat?.("cat", enemy);
        burst(enemy.x, enemy.y, 170, "#d9e0ea", "处决");
      }
      adapter.afterEnemyStateChange?.();
    }

    function updateCat(dt) {
      for (let i = state.catClaws.length - 1; i >= 0; i -= 1) {
        const claw = state.catClaws[i];
        claw.age += dt;
        claw.x += claw.vx * dt;
        claw.y += claw.vy * dt;
        enemies().forEach((enemy) => {
          if (claw.hit.has(enemy.id) || distance(claw, enemy) > (enemy.r || 20) + 20) return;
          claw.hit.add(enemy.id);
          damageEnemy(enemy, 26, "猫爪", true);
        });
        if (claw.age >= claw.life) state.catClaws.splice(i, 1);
      }
      for (let i = state.catExecutionMarks.length - 1; i >= 0; i -= 1) {
        const mark = state.catExecutionMarks[i];
        if (mark.complete) mark.age += dt;
        if (mark.complete && mark.age >= mark.duration) state.catExecutionMarks.splice(i, 1);
      }
      const execution = state.catExecutionState;
      if (execution) {
        const enemy = execution.target;
        execution.age += dt;
        if (!enemy || enemy.dead || enemy.active === false) {
          state.catExecutionState = null;
          return;
        }
        const p = player();
        const drawStart = cfg.catExecutionApproach;
        const drawEnd = drawStart + cfg.catExecutionDraw;
        const shurikenEnd = drawEnd + cfg.catExecutionShuriken;
        if (execution.age < drawStart) {
          const t = smooth(execution.age / drawStart);
          p.x = execution.startX + (execution.standX - execution.startX) * t;
          p.y = execution.startY + (execution.standY - execution.startY) * t;
        } else if (execution.age < drawEnd) {
          const t = (execution.age - drawStart) / cfg.catExecutionDraw;
          const point = pointOnPolyline(execution.starPoints, t);
          p.x = point.x;
          p.y = point.y;
          execution.mark.progress = clamp(t, 0, 1);
        } else {
          const last = execution.starPoints[execution.starPoints.length - 1];
          p.x = last.x;
          p.y = last.y;
          execution.mark.progress = 1;
        }
        enemy.target = null;
        enemy.attackCooldown = Math.max(enemy.attackCooldown || 0, 0.12);
        if (execution.age >= shurikenEnd && !execution.finished) finishCatExecution();
        if (execution.age >= cfg.catExecutionDuration) state.catExecutionState = null;
      }
    }

    function startEggBeam() {
      if (state.eggBeam.active) return true;
      if (state.eggBeamCooldownLeft > 0) {
        prompt(`<strong>椰蛋</strong> 冷却 ${Math.ceil(state.eggBeamCooldownLeft)} 秒。`);
        return false;
      }
      const p = player();
      state.eggBeam.active = true;
      state.eggBeam.activeLeft = state.eggBeam.duration;
      state.eggBeam.tick = 0;
      state.eggBeam.angle = angleTo(p, aim(state.eggBeam.range));
      adapter.recordSkillUse?.("egg");
      prompt("<strong>椰蛋</strong> 冰冻爷爷展开。");
      return true;
    }

    function stopEggBeam() {
      if (!state.eggBeam.active) return;
      state.eggBeam.active = false;
      state.eggBeam.activeLeft = 0;
      state.eggBeamCooldownLeft = cfg.eggBeamCooldown;
    }

    function castEggBall() {
      if (state.eggBallCharges <= 0) {
        prompt(`<strong>椰蛋</strong> 奶奶还要 ${Math.ceil(state.eggBallRechargeLeft)} 秒。`);
        return false;
      }
      const p = player();
      const end = aim(580);
      const a = angleTo(p, end);
      state.eggBalls.push({ x: p.x, y: p.y, vx: Math.cos(a) * 430, vy: Math.sin(a) * 430, age: 0, life: 1.15, exploded: false });
      state.eggBallCharges -= 1;
      if (state.eggBallCharges < 2 && state.eggBallRechargeLeft <= 0) state.eggBallRechargeLeft = cfg.eggBallCooldown;
      adapter.recordSkillUse?.("egg");
      prompt(`<strong>椰蛋</strong> 冰冻奶奶 ${state.eggBallCharges}/2。`);
      return true;
    }

    function updateEgg(dt) {
      if (state.eggBeam.active) {
        state.eggBeam.activeLeft = Math.max(0, state.eggBeam.activeLeft - dt);
        const p = player();
        const desired = angleTo(p, aim(state.eggBeam.range));
        const delta = Math.atan2(Math.sin(desired - state.eggBeam.angle), Math.cos(desired - state.eggBeam.angle));
        state.eggBeam.angle += clamp(delta, -1.55 * dt, 1.55 * dt);
        state.eggBeam.tick += dt;
        const ux = Math.cos(state.eggBeam.angle);
        const uy = Math.sin(state.eggBeam.angle);
        const endX = p.x + ux * state.eggBeam.range;
        const endY = p.y + uy * state.eggBeam.range;
        enemies().forEach((enemy) => {
          const radius = enemy.r || 20;
          const d = pointSegmentDistance(enemy.x, enemy.y, p.x, p.y, endX, endY);
          if (d > radius + state.eggBeam.width / 2) return;
          enemy.frozen = Math.max(enemy.frozen || 0, 0.45);
          if (state.eggBeam.tick >= 0.18) damageEnemy(enemy, 7.2, "冰冻爷爷", true);
        });
        if (state.eggBeam.tick >= 0.18) state.eggBeam.tick = 0;
        if (state.eggBeam.activeLeft <= 0) stopEggBeam();
      }
      for (let i = state.eggBalls.length - 1; i >= 0; i -= 1) {
        const ball = state.eggBalls[i];
        ball.age += dt;
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;
        const hit = enemies().some((enemy) => distance(ball, enemy) <= (enemy.r || 20) + 22);
        if (hit || ball.age >= ball.life) {
          state.iceFields.push({ x: ball.x, y: ball.y, age: 0, duration: 4.2, r: 190 });
          burst(ball.x, ball.y, 190, "#8fd7ff", "霜");
          state.eggBalls.splice(i, 1);
        }
      }
      for (let i = state.iceFields.length - 1; i >= 0; i -= 1) {
        const field = state.iceFields[i];
        field.age += dt;
        enemies().forEach((enemy) => {
          if (distance(field, enemy) > field.r + (enemy.r || 20)) return;
          enemy.frozen = Math.max(enemy.frozen || 0, 0.5);
          damageEnemy(enemy, 2.2 * dt, "冰冻奶奶", true);
        });
        if (field.age >= field.duration) state.iceFields.splice(i, 1);
      }
    }

    function nightBloodActive() {
      return selected() === "night" && state.nightBloodModeLeft > 0;
    }

    function nightHpRatio() {
      const h = health();
      return h.hp / Math.max(1, h.maxHp);
    }

    function fireNightShard() {
      if (state.nightShardCooldownLeft > 0) {
        prompt(`<strong>夜镜</strong> 冷却 ${Math.ceil(state.nightShardCooldownLeft)} 秒。`);
        return false;
      }
      const p = player();
      const end = aim(660);
      const forward = angleTo(p, end);
      const comboId = state.nightAfterimage ? `mirror-${state.nightComboIndex += 1}` : "";
      spawnNightShard(p.x, p.y, forward, false, comboId, "night");
      spawnNightShard(p.x, p.y, forward + Math.PI, true, comboId, "night");
      if (state.nightAfterimage) {
        const clone = mirrorPoint(p.x, p.y);
        const cloneAim = mirrorVector(Math.cos(forward), Math.sin(forward));
        const cloneAngle = Math.atan2(cloneAim.y, cloneAim.x);
        spawnNightShard(clone.x, clone.y, cloneAngle, false, comboId, "mirror");
        spawnNightShard(clone.x, clone.y, cloneAngle + Math.PI, true, comboId, "mirror");
      }
      state.nightShardCooldownLeft = nightBloodActive() ? cfg.nightShardCooldown * 0.82 : cfg.nightShardCooldown;
      adapter.recordSkillUse?.("night");
      prompt(state.nightAfterimage ? "<strong>夜镜</strong> 镜像同击。" : "<strong>夜镜</strong> 镜片碎击。");
      return true;
    }

    function spawnNightShard(x, y, angle, back, comboId, owner) {
      const blood = nightBloodActive();
      const ratio = nightHpRatio();
      const mirrorBoost = owner === "mirror" && ratio < 0.5 ? 1.75 : 1;
      const backBoost = back && owner === "night" && ratio < 0.25 ? 1.95 : 1;
      state.nightShardProjectiles.push({
        x,
        y,
        vx: Math.cos(angle) * (blood ? 780 : 650),
        vy: Math.sin(angle) * (blood ? 780 : 650),
        age: 0,
        life: back ? 0.68 : 0.75,
        back,
        owner,
        comboId,
        damage: (back ? 15 : 4.5) * (blood ? 2.1 : 1) * mirrorBoost * backBoost,
        hit: new Set()
      });
    }

    function castNightBlood() {
      if (state.nightBloodModeLeft > 0) return false;
      if (state.nightBloodModeCooldownLeft > 0) {
        prompt(`<strong>夜镜</strong> 冷却 ${Math.ceil(state.nightBloodModeCooldownLeft)} 秒。`);
        return false;
      }
      const h = health();
      const cost = Math.max(1, Math.ceil(h.maxHp * 0.1));
      if (h.hp <= cost + 1) return false;
      h.hp = Math.max(1, h.hp - cost);
      state.nightBloodModeLeft = cfg.nightBloodDuration;
      state.nightBloodModeCooldownLeft = cfg.nightBloodCooldown;
      adapter.recordSkillUse?.("night");
      burst(player().x, player().y, 120, "#e58f70", "赤镜");
      prompt("<strong>夜镜</strong> 赤镜开启。");
      return true;
    }

    function castNightAfterimage() {
      if (state.nightAfterimage) {
        const mirror = state.nightAfterimage;
        const p = player();
        const old = { x: p.x, y: p.y };
        p.x = mirror.x;
        p.y = mirror.y;
        explodeNightMirror(mirror);
        burst(old.x, old.y, 150, "#f1f5f9", "回位");
        state.nightAfterimage = null;
        state.nightAfterimageCooldownLeft = cfg.nightAfterimageCooldown;
        return true;
      }
      if (state.nightAfterimageCooldownLeft > 0) {
        prompt(`<strong>夜镜</strong> 冷却 ${Math.ceil(state.nightAfterimageCooldownLeft)} 秒。`);
        return false;
      }
      const p = player();
      const end = aim(280);
      const axisAngle = angleTo(p, end) + Math.PI / 2;
      state.nightAfterimage = {
        x: p.x,
        y: p.y,
        r: 24,
        hp: 300,
        maxHp: 300,
        axisAngle,
        age: 0,
        duration: 8
      };
      if (adapter.canMoveTo?.(end.x, end.y)) {
        p.x = end.x;
        p.y = end.y;
      }
      burst(state.nightAfterimage.x, state.nightAfterimage.y, cfg.nightAfterimageTauntRadius, "#f1f5f9", "镜面");
      adapter.recordSkillUse?.("night");
      prompt("<strong>夜镜</strong> 回烬镜面立起。");
      return true;
    }

    function applyNightBurn(enemy, duration = cfg.nightBurnDuration) {
      enemy.burn = Math.max(enemy.burn || 0, duration);
    }

    function updateNight(dt) {
      if (state.nightAfterimage) {
        state.nightAfterimage.age += dt;
        if (state.nightAfterimage.age >= state.nightAfterimage.duration || state.nightAfterimage.hp <= 0) {
          state.nightAfterimage = null;
          state.nightAfterimageCooldownLeft = cfg.nightAfterimageCooldown;
        }
      }
      for (let i = state.nightShardProjectiles.length - 1; i >= 0; i -= 1) {
        const shard = state.nightShardProjectiles[i];
        shard.age += dt;
        shard.x += shard.vx * dt;
        shard.y += shard.vy * dt;
        enemies().forEach((enemy) => {
          if (shard.hit.has(enemy.id) || distance(shard, enemy) > (enemy.r || 20) + 16) return;
          shard.hit.add(enemy.id);
          damageEnemy(enemy, shard.damage, shard.back ? "背棱" : "镜片", true);
          if (nightBloodActive()) applyNightBurn(enemy);
          markNightCombo(enemy, shard);
        });
        if (shard.age >= shard.life) state.nightShardProjectiles.splice(i, 1);
      }
      enemies().forEach((enemy) => {
        if ((enemy.burn || 0) > 0) damageEnemy(enemy, 1.2 * dt, "灼烧", true);
      });
    }

    function markNightCombo(enemy, shard) {
      if (!shard.comboId || !state.nightAfterimage) return;
      enemy.nightCombos = enemy.nightCombos || {};
      const combo = enemy.nightCombos[shard.comboId] || { night: false, mirror: false, triggered: false };
      combo[shard.owner] = true;
      enemy.nightCombos[shard.comboId] = combo;
      if (combo.triggered || !combo.night || !combo.mirror) return;
      combo.triggered = true;
      const h = health();
      h.hp = Math.min(h.maxHp, h.hp + Math.max(4, Math.round(h.maxHp * 0.08)));
      enemies().forEach((targetEnemy) => {
        const d = distance(enemy, targetEnemy);
        if (d > 175 + (targetEnemy.r || 20)) return;
        damageEnemy(targetEnemy, 7.5 * clamp(1 - d / 175, 0.4, 1), "镜面共振", true);
      });
      burst(enemy.x, enemy.y, 175, "#f1f5f9", "共振");
    }

    function mirrorPoint(x, y) {
      const mirror = state.nightAfterimage;
      if (!mirror) return { x, y };
      const ax = Math.cos(mirror.axisAngle);
      const ay = Math.sin(mirror.axisAngle);
      const vx = x - mirror.x;
      const vy = y - mirror.y;
      const projection = vx * ax + vy * ay;
      return { x: mirror.x + 2 * projection * ax - vx, y: mirror.y + 2 * projection * ay - vy };
    }

    function mirrorVector(x, y) {
      const mirror = state.nightAfterimage;
      if (!mirror) return { x, y };
      const ax = Math.cos(mirror.axisAngle);
      const ay = Math.sin(mirror.axisAngle);
      const projection = x * ax + y * ay;
      return { x: 2 * projection * ax - x, y: 2 * projection * ay - y };
    }

    function explodeNightMirror(mirror) {
      enemies().forEach((enemy) => {
        const d = distance(mirror, enemy);
        if (d > 265 + (enemy.r || 20)) return;
        damageEnemy(enemy, 24 * clamp(1 - d / 265, 0.42, 1), "碎镜爆裂", true);
        applyNightBurn(enemy);
      });
      burst(mirror.x, mirror.y, 265, "#e58f70", "爆裂");
    }

    function threatTargetFor(enemy) {
      if (!state.nightAfterimage || selected() !== "night" || !enemy || enemy.dead) return null;
      return distance(enemy, state.nightAfterimage) <= cfg.nightAfterimageTauntRadius ? state.nightAfterimage : null;
    }

    function damageThreatTarget(amount, source) {
      if (!state.nightAfterimage) return false;
      const mirror = state.nightAfterimage;
      const reduced = Math.max(1, Math.round(Number(amount || 0) * (1 - cfg.nightAfterimageDamageReduction)));
      const applied = Math.min(mirror.hp, reduced);
      mirror.hp = Math.max(0, mirror.hp - reduced);
      const h = health();
      h.hp = Math.min(h.maxHp, h.hp + applied);
      flash(mirror.x, mirror.y, "#f1f5f9");
      if (mirror.hp <= 0) {
        state.nightAfterimage = null;
        state.nightAfterimageCooldownLeft = cfg.nightAfterimageCooldown;
      }
      void source;
      return true;
    }

    function castHathorBell() {
      const sekhmet = hathorSekhmetActive();
      const cooldownLeft = currentHathorBellCooldownLeft();
      if (cooldownLeft > 0) {
        prompt(`<strong>${sekhmet ? "塞赫麦特" : "哈托尔"}</strong> 冷却 ${Math.ceil(cooldownLeft)} 秒。`);
        return false;
      }
      state.hathorBellFieldLeft = cfg.hathorBellField;
      state.hathorBellFieldKind = sekhmet ? "sekhmet" : "hathor";
      setCurrentHathorBellCooldown(cfg.hathorBellCooldown);
      adapter.recordSkillUse?.("hathor");
      const p = player();
      if (sekhmet) {
        enemies().forEach((enemy) => {
          if (distance(p, enemy) <= 235 + (enemy.r || 20)) {
            damageEnemy(enemy, 22, "赤砂圣铃", true);
            applyNightBurn(enemy, cfg.nightBurnDuration + 2);
          }
        });
        prompt("<strong>塞赫麦特</strong> 赤砂圣铃震开。");
      } else {
        const h = health();
        h.hp = Math.min(h.maxHp, h.hp + Math.round(h.maxHp * 0.16));
        adapter.setHeat?.(Math.max(0, (adapter.getHeat?.() || p.heat || 0) - 18));
        enemies().forEach((enemy) => {
          if (distance(p, enemy) <= 220 + (enemy.r || 20)) enemy.frozen = Math.max(enemy.frozen || 0, 1.1);
        });
        prompt("<strong>哈托尔</strong> 圣铃安抚。");
      }
      burst(p.x, p.y, 230, sekhmet ? "#e5583e" : "#f1cf7a", sekhmet ? "赤砂" : "圣铃", {
        type: sekhmet ? "hathor-red-bell" : "hathor-bell",
        duration: 1.05
      });
      return true;
    }

    function castHathorBurst() {
      const sekhmet = hathorSekhmetActive();
      const cooldownLeft = currentHathorBurstCooldownLeft();
      if (cooldownLeft > 0) {
        prompt(`<strong>${sekhmet ? "塞赫麦特" : "哈托尔"}</strong> 冷却 ${Math.ceil(cooldownLeft)} 秒。`);
        return false;
      }
      setCurrentHathorBurstCooldown(cfg.hathorBurstCooldown);
      adapter.recordSkillUse?.("hathor");
      const p = player();
      if (sekhmet) {
        enemies().forEach((enemy) => {
          if (distance(p, enemy) <= 320 + (enemy.r || 20)) {
            damageEnemy(enemy, 48, "日轮啸杀", true);
            applyNightBurn(enemy, cfg.nightBurnDuration + 2);
          }
        });
        prompt("<strong>塞赫麦特</strong> 日轮啸杀。");
        burst(p.x, p.y, 320, "#e5583e", "日轮", { type: "hathor-sun", duration: 0.95 });
      } else {
        const h = health();
        h.hp = Math.min(h.maxHp, h.hp + Math.round(h.maxHp * 0.22));
        state.hathorShield = Math.max(state.hathorShield, Math.round(h.maxHp * 0.16));
        adapter.setHeat?.(Math.max(0, (adapter.getHeat?.() || p.heat || 0) - 24));
        prompt("<strong>哈托尔</strong> 丰饶金杯覆光。");
        burst(p.x, p.y, 160, "#f1cf7a", "金杯", { type: "hathor-cup", duration: 1.25 });
      }
      return true;
    }

    function updateHathor(dt, movingIntent = false) {
      const p = player();
      if (selected() === "hathor") {
        if (state.hathorTransformLeft > 0) {
          state.hathorTransformLeft = Math.max(0, state.hathorTransformLeft - dt);
          if (state.hathorTransformLeft <= 0) completeHathorSekhmetTransform();
        }
        if (state.hathorSekhmetLeft > 0) {
          state.hathorQuietTime += dt;
          state.hathorStillTime = movingIntent ? 0 : state.hathorStillTime + dt;
          if (state.hathorReturnLeft > 0) {
            state.hathorReturnLeft = Math.max(0, state.hathorReturnLeft - dt);
            if (state.hathorReturnLeft <= 0) completeHathorReturn();
          } else if (state.hathorQuietTime >= cfg.hathorReturnTrigger || state.hathorStillTime >= cfg.hathorReturnTrigger) {
            startHathorReturn();
          }
          if (state.hathorSekhmetLeft > 0 && state.hathorReturnLeft <= 0) {
            if (state.hathorSekhmetLeft <= dt) startHathorReturn();
            else state.hathorSekhmetLeft = Math.max(0, state.hathorSekhmetLeft - dt);
          }
        } else {
          state.hathorStillTime = 0;
          state.hathorQuietTime = 0;
        }
      }
      p.sekhmetLeft = state.hathorSekhmetLeft;
      p.hathorRage = state.hathorRage;
      if (state.hathorBellFieldLeft <= 0) return;
      const sekhmet = state.hathorBellFieldKind === "sekhmet";
      adapter.setHeat?.(Math.max(0, (adapter.getHeat?.() || p.heat || 0) - (sekhmet ? 10 : 18) * dt));
      enemies().forEach((enemy) => {
        if (distance(p, enemy) > 230 + (enemy.r || 20)) return;
        if (sekhmet) {
          applyNightBurn(enemy, cfg.nightBurnDuration + 1);
          damageEnemy(enemy, 7.2 * dt, "赤砂领域", true);
        }
        else enemy.frozen = Math.max(enemy.frozen || 0, 0.45);
      });
    }

    function bastetNightPatronActive() {
      const areaKind = adapter.activeAreaKind?.() || "";
      const heat = adapter.getHeat?.() || player().heat || 0;
      return heat <= 55 || ["camp", "logistics", "visitor", "pyramid", "tunnel"].includes(areaKind);
    }

    function movementMultiplier(characterId) {
      let multiplier = hathorFieldSpeedMultiplier();
      if (characterId === "cat") multiplier *= 1.25;
      if (characterId === "bastet" && bastetNightPatronActive()) multiplier *= 1.12;
      return multiplier;
    }

    function enemyMovementMultiplier(enemy) {
      return hathorFieldEnemySlowMultiplier(enemy);
    }

    function castBastetStep() {
      const p = player();
      if (state.bastetMoonShadow) {
        const shadow = state.bastetMoonShadow;
        const sx = p.x;
        const sy = p.y;
        p.x = shadow.x;
        p.y = shadow.y;
        releaseBastetBlades(sx, sy, shadow.x, shadow.y);
        state.bastetMoonShadow = null;
        state.bastetStepCooldownLeft = Math.max(0, state.bastetStepCooldownLeft - 2.4);
        return true;
      }
      if (state.bastetStepCooldownLeft > 0) {
        prompt(`<strong>巴斯特</strong> 冷却 ${Math.ceil(state.bastetStepCooldownLeft)} 秒。`);
        return false;
      }
      const end = aim(360);
      state.bastetMoonShadow = { x: p.x, y: p.y, age: 0, duration: cfg.bastetStepShadow };
      if (adapter.canMoveTo?.(end.x, end.y)) {
        p.x = end.x;
        p.y = end.y;
      }
      state.bastetStepCooldownLeft = cfg.bastetStepCooldown;
      adapter.recordSkillUse?.("bastet");
      burst(state.bastetMoonShadow.x, state.bastetMoonShadow.y, 120, "#e1b956", "月影");
      prompt("<strong>巴斯特</strong> 月影留步。");
      return true;
    }

    function releaseBastetBlades(ax, ay, bx, by) {
      const angle = Math.atan2(by - ay, bx - ax);
      for (let i = 0; i < 3; i += 1) {
        state.bastetMoonBlades.push({ x: ax, y: ay, vx: Math.cos(angle) * 720, vy: Math.sin(angle) * 720, age: -i * 0.08, life: 0.9, size: 18, hit: new Set() });
      }
      enemies().forEach((enemy) => {
        if (pointSegmentDistance(enemy.x, enemy.y, ax, ay, bx, by) <= (enemy.r || 20) + 60) {
          damageEnemy(enemy, 18, "月刃路径", true);
          state.bastetStepCooldownLeft = Math.max(0, state.bastetStepCooldownLeft - 1.4);
        }
      });
    }

    function castBastetCounter() {
      if (state.bastetCounterLeft > 0) return false;
      if (state.bastetCounterCooldownLeft > 0) {
        prompt(`<strong>巴斯特</strong> 冷却 ${Math.ceil(state.bastetCounterCooldownLeft)} 秒。`);
        return false;
      }
      state.bastetCounterLeft = cfg.bastetCounterDuration;
      state.bastetCounterCharges = 3;
      state.bastetCounterCooldownLeft = cfg.bastetCounterCooldown;
      adapter.recordSkillUse?.("bastet");
      burst(player().x, player().y, 130, "#e1b956", "月盘");
      prompt("<strong>巴斯特</strong> 月盘反狩。");
      return true;
    }

    function tryBastetCounter() {
      if (selected() !== "bastet" || state.bastetCounterLeft <= 0 || state.bastetCounterCharges <= 0) return false;
      state.bastetCounterCharges -= 1;
      if (state.bastetCounterCharges <= 0) state.bastetCounterLeft = 0;
      adapter.setHeat?.(Math.max(0, (adapter.getHeat?.() || player().heat || 0) - 7));
      const enemy = target(720);
      if (enemy) {
        const a = angleTo(player(), enemy);
        state.bastetMoonBlades.push({ x: player().x, y: player().y, vx: Math.cos(a) * bastetBladeSpeed(), vy: Math.sin(a) * bastetBladeSpeed(), age: 0, life: 0.95, size: 20, hit: new Set() });
      }
      flash(player().x, player().y, "#e1b956");
      return true;
    }

    function catExecutionBlocksMelee(enemy) {
      if (!state.catExecutionState || !enemy || enemy === state.catExecutionState.target) return false;
      return distance(player(), enemy) <= cfg.catExecutionGuardRadius + (enemy.r || enemy.radius || 0);
    }

    function catExecutionNpcOffset(enemy) {
      const execution = state.catExecutionState;
      if (!execution || execution.target !== enemy) return { x: 0, y: 0 };
      const impactStart = cfg.catExecutionApproach + cfg.catExecutionDraw + cfg.catExecutionShuriken;
      if (execution.age < impactStart) return { x: 0, y: 0 };
      const t = clamp((execution.age - impactStart) / Math.max(0.1, cfg.catExecutionDuration - impactStart), 0, 1);
      const shake = Math.sin(t * TAU * 8) * (1 - t) * 10;
      return { x: shake, y: 0 };
    }

    function beforePlayerDamage(amount, source = "") {
      if (state.catExecutionState && selected() === "cat") return { amount: 0, blocked: true, reason: "cat-execution" };
      if (tryBastetCounter(source)) return { amount: 0, blocked: true, reason: "bastet-counter" };
      let nextAmount = Number(amount || 0) * hathorFieldDefenseMultiplier() * hathorFieldEnemyDamageMultiplier();
      nextAmount = absorbWithPetShield(nextAmount, source);
      if (selected() === "hathor" && nextAmount > 0) {
        markHathorCombat(source);
        reduceSekhmetSunCooldown(nextAmount);
        triggerHathorSekhmet();
      }
      if (selected() === "hathor" && state.hathorShield > 0 && nextAmount > 0) {
        const blocked = Math.min(nextAmount, state.hathorShield);
        state.hathorShield = Math.max(0, state.hathorShield - blocked);
        nextAmount = Math.max(0, nextAmount - blocked);
        if (blocked > 0) flash(player().x, player().y, "#f1cf7a");
      }
      return { amount: nextAmount, blocked: nextAmount <= 0, reason: nextAmount <= 0 ? "shield" : "" };
    }

    function heroHaloActive() {
      return selected() === "hero" && state.heroOuterOrbActiveLeft > 0;
    }

    function blocksProjectile(projectile) {
      if (!projectile) return false;
      if (heroHaloActive() && distance(player(), projectile) <= cfg.heroHaloBulletRadius + (projectile.r || projectile.radius || 0)) {
        burst(projectile.x, projectile.y, 70, "#ffe09a", "挡");
        return true;
      }
      if (state.nightAfterimage && distance(state.nightAfterimage, projectile) <= state.nightAfterimage.r + (projectile.r || projectile.radius || 0)) {
        damageThreatTarget(projectile.damage || 1, "弹幕");
        return true;
      }
      return false;
    }

    function blocksLaserSegment(ax, ay, bx, by, radius = 0) {
      if (!heroHaloActive()) return false;
      const d = pointSegmentDistance(player().x, player().y, ax, ay, bx, by);
      if (d > cfg.heroHaloLaserRadius + radius) return false;
      burst(player().x, player().y, cfg.heroHaloLaserRadius, "#ffe09a", "挡");
      return true;
    }

    function bastetBladeSpeed() {
      const heat = adapter.getHeat?.() || player().heat || 0;
      return 600 + clamp(70 - heat, 0, 70) * 3.6;
    }

    function updateBastet(dt) {
      if (state.bastetMoonShadow) {
        state.bastetMoonShadow.age += dt;
        if (state.bastetMoonShadow.age > state.bastetMoonShadow.duration) state.bastetMoonShadow = null;
      }
      for (let i = state.bastetMoonBlades.length - 1; i >= 0; i -= 1) {
        const blade = state.bastetMoonBlades[i];
        blade.age += dt;
        if (blade.age < 0) continue;
        blade.x += blade.vx * dt;
        blade.y += blade.vy * dt;
        blade.size = Math.min(44, blade.size + 44 * dt);
        enemies().forEach((enemy) => {
          if (blade.hit.has(enemy.id) || distance(blade, enemy) > (enemy.r || 20) + blade.size) return;
          blade.hit.add(enemy.id);
          damageEnemy(enemy, 31, "月刃", true);
          blade.life += 0.16;
        });
        if (blade.age >= blade.life) state.bastetMoonBlades.splice(i, 1);
      }
    }

    function petDef() {
      return adapter.petDef?.() || null;
    }

    function petBondRatio() {
      return clamp(Number(adapter.petBondRatio?.() || 0), 0, 1);
    }

    function petDuration() {
      const def = petDef();
      return def ? (def.duration || 8) * (0.72 + petBondRatio() * 0.38) : 0;
    }

    function petCooldown() {
      const def = petDef();
      return def ? (def.cooldown || 22) * (1.12 - petBondRatio() * 0.24) : 0;
    }

    function petShieldMax() {
      const h = health();
      return Math.round(h.maxHp * (0.1 + petBondRatio() * 0.18));
    }

    function usePet() {
      const def = petDef();
      if (!def) return false;
      if (state.pet.cooldownLeft > 0) {
        prompt(`<strong>${def.name}</strong> 还要 ${Math.ceil(state.pet.cooldownLeft)} 秒。`);
        return false;
      }
      state.pet.activeLeft = petDuration();
      state.pet.cooldownLeft = petCooldown();
      state.pet.tickLeft = 0;
      state.pet.squash = 1;
      if (adapter.selectedPet?.() === "guard") state.pet.shield = Math.max(state.pet.shield, petShieldMax());
      burst(state.pet.x, state.pet.y, 145, def.markColor || def.color, def.short);
      prompt(`<strong>${def.name}</strong> ${def.skillName || "发动技能"}。`);
      return true;
    }

    function updatePet(dt) {
      const def = petDef();
      if (!def) return;
      const p = player();
      const facing = adapter.playerFacing?.() || { x: 1, y: 0 };
      const side = adapter.selectedPet?.() === "mender" ? -1 : 1;
      const desiredX = p.x - facing.x * 82 + -facing.y * 44 * side;
      const desiredY = p.y - facing.y * 82 + facing.x * 44 * side;
      const ease = 1 - Math.pow(0.0018, dt);
      state.pet.x += (desiredX - state.pet.x) * ease;
      state.pet.y += (desiredY - state.pet.y) * ease;
      state.pet.cooldownLeft = Math.max(0, state.pet.cooldownLeft - dt);
      state.pet.activeLeft = Math.max(0, state.pet.activeLeft - dt);
      state.pet.tickLeft = Math.max(0, state.pet.tickLeft - dt);
      state.pet.squash = Math.max(0, state.pet.squash - dt * 3.4);
      if (adapter.selectedPet?.() === "guard" && state.pet.activeLeft <= 0) state.pet.shield = 0;
      if (state.pet.activeLeft <= 0 || state.pet.tickLeft > 0) return;
      const kind = adapter.selectedPet?.();
      if (kind === "spark") {
        state.pet.tickLeft = 0.5;
        const enemy = adapter.nearestFrom?.(state.pet, 560);
        if (!enemy) return;
        const a = angleTo(state.pet, enemy);
        state.pet.x += Math.cos(a) * Math.min(92, distance(state.pet, enemy));
        state.pet.y += Math.sin(a) * Math.min(92, distance(state.pet, enemy));
        damageEnemy(enemy, 14 + petBondRatio() * 18, def.skillName || "团子冲撞", true);
        burst(state.pet.x, state.pet.y, 80, def.markColor || def.color, def.short);
      } else if (kind === "mender") {
        state.pet.tickLeft = 0.72;
        const h = health();
        h.hp = Math.min(h.maxHp, h.hp + (4 + petBondRatio() * 8));
        flash(p.x, p.y, def.markColor || def.color);
      } else if (kind === "guard") {
        state.pet.tickLeft = 0.85;
        state.pet.shield = Math.min(petShieldMax(), state.pet.shield + 5 + petBondRatio() * 10);
        flash(p.x, p.y, def.markColor || def.color);
      } else if (kind === "cooler") {
        state.pet.tickLeft = 0.85;
        adapter.setHeat?.(Math.max(0, (adapter.getHeat?.() || p.heat || 0) - (5 + petBondRatio() * 8)));
        enemies().forEach((enemy) => {
          if (distance(state.pet, enemy) <= 220 + petBondRatio() * 80) enemy.frozen = Math.max(enemy.frozen || 0, 0.65);
        });
        burst(state.pet.x, state.pet.y, 220, def.markColor || def.color, "凉雾");
      }
    }

    function absorbWithPetShield(amount) {
      if (adapter.selectedPet?.() !== "guard" || state.pet.shield <= 0 || amount <= 0) return amount;
      const blocked = Math.min(amount, state.pet.shield);
      state.pet.shield = Math.max(0, state.pet.shield - blocked);
      flash(player().x, player().y, "#d7f5ff");
      return Math.max(0, amount - blocked);
    }

    function updateBursts(dt) {
      for (let i = state.bursts.length - 1; i >= 0; i -= 1) {
        state.bursts[i].age += dt;
        if (state.bursts[i].age >= state.bursts[i].duration) state.bursts.splice(i, 1);
      }
    }

    function burst(x, y, r, color, label = "", extra = {}) {
      state.bursts.push({ x, y, r, color, label, age: 0, duration: extra.duration || 0.55, ...extra });
      flash(x, y, color);
    }

    function smooth(value) {
      const t = clamp(value, 0, 1);
      return t * t * (3 - 2 * t);
    }

    function draw() {
      const ctx = adapter.ctx();
      drawBursts(ctx);
      drawHero(ctx);
      drawEgg(ctx);
      drawNight(ctx);
      drawCat(ctx);
      drawHathor(ctx);
      drawBastet(ctx);
      drawPet(ctx);
      drawBurnParticles(ctx);
    }

    function drawBursts(ctx) {
      state.bursts.forEach((entry) => {
        const t = clamp(entry.age / entry.duration, 0, 1);
        if (String(entry.type || "").startsWith("hathor-")) {
          drawHathorBurstEffect(ctx, entry, t);
          return;
        }
        ctx.save();
        ctx.globalAlpha = 1 - t;
        ctx.strokeStyle = entry.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(entry.x, entry.y, entry.r * (0.25 + t * 0.75), 0, TAU);
        ctx.stroke();
        if (entry.label) {
          ctx.fillStyle = entry.color;
          ctx.font = "18px serif";
          ctx.textAlign = "center";
          ctx.fillText(entry.label, entry.x, entry.y - entry.r * 0.25);
        }
        ctx.restore();
      });
    }

    function drawHathorBurstEffect(ctx, entry, t) {
      const fade = Math.max(0, 1 - t);
      const pulse = Math.sin(t * Math.PI);
      const red = entry.type === "hathor-red-bell" || entry.type === "hathor-form" || entry.type === "hathor-sun";
      const rgb = red ? "229, 88, 62" : "241, 207, 122";
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      if (entry.type === "hathor-sun") {
        const facing = adapter.playerFacing?.() || { x: 1, y: 0 };
        ctx.translate(entry.x, entry.y);
        ctx.rotate(Math.atan2(facing.y || 0, facing.x || 1));
        const length = entry.r + 180;
        const beam = ctx.createLinearGradient(0, 0, length, 0);
        beam.addColorStop(0, `rgba(255, 226, 132, ${0.62 * fade})`);
        beam.addColorStop(0.5, `rgba(229, 88, 62, ${0.82 * fade})`);
        beam.addColorStop(1, `rgba(229, 88, 62, ${0.04 * fade})`);
        ctx.fillStyle = beam;
        ctx.beginPath();
        ctx.moveTo(0, -22 - pulse * 18);
        ctx.lineTo(length, -70 - pulse * 24);
        ctx.lineTo(length, 70 + pulse * 24);
        ctx.lineTo(0, 22 + pulse * 18);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 238, 190, ${0.9 * fade})`;
        ctx.lineWidth = 5 + pulse * 5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(length, 0);
        ctx.stroke();
        ctx.translate(length, 0);
        ctx.rotate(t * TAU * 2.5);
        ctx.strokeStyle = `rgba(255, 226, 132, ${fade})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, 32 + pulse * 28, 0, TAU);
        ctx.stroke();
        for (let i = 0; i < 12; i += 1) {
          const a = (i / 12) * TAU;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 18, Math.sin(a) * 18);
          ctx.lineTo(Math.cos(a) * (58 + pulse * 40), Math.sin(a) * (58 + pulse * 40));
          ctx.stroke();
        }
        ctx.restore();
        return;
      }
      if (entry.type === "hathor-pomegranate") {
        ctx.translate(entry.x, entry.y);
        ctx.rotate(t * TAU * 1.35);
        for (let i = 0; i < 5; i += 1) {
          const local = clamp(t - i * 0.08, 0, 1);
          if (local <= 0) continue;
          ctx.globalAlpha = fade * (0.58 - i * 0.07);
          ctx.strokeStyle = i % 2 ? "rgba(229, 88, 62, 0.7)" : "rgba(112, 24, 38, 0.78)";
          ctx.lineWidth = 7 - i * 0.6;
          ctx.beginPath();
          ctx.arc(0, 0, entry.r * (0.2 + local * 0.65), -Math.PI * 0.78 + i * 0.42, Math.PI * 0.36 + i * 0.42);
          ctx.stroke();
        }
        for (let i = 0; i < 22; i += 1) {
          const seed = i * 2.19;
          const dist = entry.r * (0.18 + (i % 7) * 0.085) * (0.65 + t * 0.55);
          ctx.globalAlpha = fade * (0.5 + (i % 3) * 0.1);
          ctx.fillStyle = i % 4 === 0 ? "rgba(255, 205, 132, 0.7)" : "rgba(166, 54, 62, 0.86)";
          ctx.beginPath();
          ctx.arc(Math.cos(seed + t * 3.6) * dist, Math.sin(seed + t * 2.9) * dist, 2.4 + (i % 3), 0, TAU);
          ctx.fill();
        }
        ctx.restore();
        return;
      }
      const ringCount = entry.type === "hathor-cup" ? 4 : 3;
      if (entry.type === "hathor-form") {
        ctx.globalAlpha = fade * (1 - t) * 0.52;
        ctx.strokeStyle = "rgba(241, 207, 122, 0.9)";
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.arc(entry.x, entry.y, entry.r * (0.42 + t * 0.24), 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = pulse * 0.64;
        ctx.strokeStyle = "rgba(229, 88, 62, 0.94)";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(entry.x, entry.y, entry.r * (0.26 + t * 0.62), 0, TAU);
        ctx.stroke();
      }
      for (let i = 0; i < ringCount; i += 1) {
        const local = clamp(t - i * 0.12, 0, 1);
        if (local <= 0) continue;
        ctx.globalAlpha = fade * (0.7 - i * 0.12);
        ctx.strokeStyle = `rgba(${rgb}, ${0.95 - i * 0.14})`;
        ctx.lineWidth = entry.type === "hathor-form" ? 5 : 3;
        ctx.beginPath();
        ctx.arc(entry.x, entry.y, entry.r * (0.18 + local * 0.82), 0, TAU);
        ctx.stroke();
      }
      if (entry.type === "hathor-cup") {
        ctx.translate(entry.x, entry.y - 6 - pulse * 20);
        ctx.globalAlpha = 0.9 * fade;
        ctx.strokeStyle = "rgba(255, 238, 190, 0.98)";
        ctx.fillStyle = "rgba(241, 207, 122, 0.26)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-40, -14);
        ctx.quadraticCurveTo(-32, 42, 0, 48);
        ctx.quadraticCurveTo(32, 42, 40, -14);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        for (let i = 0; i < (red ? 28 : 18); i += 1) {
          const seed = i * 2.399;
          const dist = entry.r * (0.14 + t * (0.58 + (i % 5) * 0.05));
          const x = entry.x + Math.cos(seed + t * 2.2) * dist;
          const y = entry.y + Math.sin(seed + t * 1.7) * dist - (red ? t * 22 : t * 10);
          ctx.globalAlpha = fade * (red ? 0.74 : 0.55);
          ctx.fillStyle = red
            ? (i % 3 ? "rgba(229, 88, 62, 0.92)" : "rgba(132, 124, 110, 0.62)")
            : "rgba(255, 238, 190, 0.86)";
          ctx.beginPath();
          ctx.arc(x, y, red ? 2.8 + (i % 3) : 2.2, 0, TAU);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    function drawHero(ctx) {
      if (selected() !== "hero") return;
      const p = player();
      const orbs = heroOrbPositions(1);
      ctx.save();
      if (state.heroOuterOrbActiveLeft > 0) {
        ctx.strokeStyle = "rgba(255, 224, 154, 0.7)";
        ctx.shadowColor = "rgba(255, 224, 154, 0.75)";
        ctx.shadowBlur = 18;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, cfg.heroHaloRadius + state.heroHaloPulse * 70, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = "rgba(255, 224, 154, 0.08)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, cfg.heroHaloDamageRadius, 0, TAU);
        ctx.fill();
      }
      orbs.forEach((orb) => {
        ctx.globalAlpha = orb.alpha;
        ctx.fillStyle = orb.outer ? "#ffe09a" : "#f7e2ba";
        ctx.shadowColor = "#ffe09a";
        ctx.shadowBlur = orb.outer ? 24 : 16;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.outer ? 15 : 12, 0, TAU);
        ctx.fill();
      });
      ctx.restore();
    }

    function drawCat(ctx) {
      state.catClaws.forEach((claw) => {
        ctx.save();
        ctx.translate(claw.x, claw.y);
        ctx.rotate(Math.atan2(claw.vy, claw.vx));
        ctx.strokeStyle = "#d9e0ea";
        ctx.shadowColor = "#d9e0ea";
        ctx.shadowBlur = 14;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-20, -8);
        ctx.lineTo(20, 0);
        ctx.lineTo(-20, 8);
        ctx.stroke();
        ctx.restore();
      });
      state.catExecutionMarks.forEach((mark) => {
        const t = mark.complete ? 1 : clamp(mark.progress, 0, 1);
        ctx.save();
        const alpha = mark.complete ? clamp(1 - mark.age / mark.duration, 0, 1) : 1;
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = `rgba(217, 224, 234, ${0.25 + 0.65 * t})`;
        ctx.shadowColor = "#d9e0ea";
        ctx.shadowBlur = mark.complete ? 24 : 18;
        ctx.lineWidth = 3;
        ctx.beginPath();
        const visiblePoints = [];
        for (let i = 0; i < mark.points.length - 1; i += 1) {
          visiblePoints.push(mark.points[i]);
          const segmentStart = i / (mark.points.length - 1);
          const segmentEnd = (i + 1) / (mark.points.length - 1);
          if (t > segmentStart && t < segmentEnd) {
            const local = (t - segmentStart) / (segmentEnd - segmentStart);
            visiblePoints.push({
              x: mark.points[i].x + (mark.points[i + 1].x - mark.points[i].x) * local,
              y: mark.points[i].y + (mark.points[i + 1].y - mark.points[i].y) * local
            });
            break;
          }
          if (t < segmentEnd) break;
        }
        if (t >= 1) visiblePoints.push(mark.points[mark.points.length - 1]);
        visiblePoints.forEach((point, drawIndex) => {
          if (drawIndex === 0) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
        if (mark.complete) {
          ctx.fillStyle = "rgba(217, 224, 234, 0.12)";
          ctx.beginPath();
          ctx.arc(mark.x, mark.y, cfg.catExecutionStarRadius + 28, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
      });
      const execution = state.catExecutionState;
      if (execution) {
        const drawEnd = cfg.catExecutionApproach + cfg.catExecutionDraw;
        const shurikenEnd = drawEnd + cfg.catExecutionShuriken;
        if (execution.age >= drawEnd) {
          const t = clamp((execution.age - drawEnd) / cfg.catExecutionShuriken, 0, 1);
          const p = player();
          const enemy = execution.target;
          if (enemy) {
            const cx = (p.x + enemy.x) / 2;
            const cy = (p.y + enemy.y) / 2;
            const rx = Math.max(42, Math.abs(p.x - enemy.x) / 2);
            const ry = Math.max(42, Math.abs(p.y - enemy.y) / 2);
            const angle = t * TAU;
            const sx = cx + Math.cos(angle) * rx;
            const sy = cy + Math.sin(angle) * ry;
            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(angle + state.time * 6);
            ctx.strokeStyle = "#d9e0ea";
            ctx.fillStyle = "rgba(217, 224, 234, 0.22)";
            ctx.shadowColor = "#d9e0ea";
            ctx.shadowBlur = 22;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(0, -24);
            ctx.lineTo(9, -5);
            ctx.lineTo(24, 0);
            ctx.lineTo(9, 5);
            ctx.lineTo(0, 24);
            ctx.lineTo(-9, 5);
            ctx.lineTo(-24, 0);
            ctx.lineTo(-9, -5);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          }
        }
      }
    }

    function drawEgg(ctx) {
      if (state.eggBeam.active) {
        const p = player();
        const ux = Math.cos(state.eggBeam.angle);
        const uy = Math.sin(state.eggBeam.angle);
        ctx.save();
        ctx.strokeStyle = "rgba(143, 215, 255, 0.35)";
        ctx.shadowColor = "#8fd7ff";
        ctx.shadowBlur = 18;
        ctx.lineWidth = state.eggBeam.width;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + ux * state.eggBeam.range, p.y + uy * state.eggBeam.range);
        ctx.stroke();
        ctx.strokeStyle = "#d7f5ff";
        ctx.lineWidth = Math.max(8, state.eggBeam.width * 0.22);
        ctx.stroke();
        ctx.restore();
      }
      state.eggBalls.forEach((ball) => diamond(ctx, ball.x, ball.y, 16, "rgba(143, 215, 255, 0.32)", "#d7f5ff"));
      state.iceFields.forEach((field) => {
        const t = clamp(field.age / field.duration, 0, 1);
        ctx.save();
        ctx.globalAlpha = 1 - t * 0.7;
        ctx.fillStyle = "rgba(143, 215, 255, 0.12)";
        ctx.strokeStyle = "rgba(215, 245, 255, 0.58)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(field.x, field.y, field.r, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });
    }

    function drawNight(ctx) {
      if (state.nightAfterimage) {
        const mirror = state.nightAfterimage;
        const clone = selected() === "night" ? mirrorPoint(player().x, player().y) : null;
        ctx.save();
        ctx.strokeStyle = "rgba(241, 245, 249, 0.36)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(mirror.x, mirror.y, cfg.nightAfterimageTauntRadius, 0, TAU);
        ctx.stroke();
        ctx.translate(mirror.x, mirror.y);
        ctx.rotate(mirror.axisAngle);
        ctx.fillStyle = "rgba(241, 245, 249, 0.1)";
        ctx.strokeStyle = "#f1f5f9";
        ctx.shadowColor = "#f1f5f9";
        ctx.shadowBlur = 16;
        ctx.fillRect(-8, -58, 16, 116);
        ctx.strokeRect(-8, -58, 16, 116);
        ctx.restore();
        diamond(ctx, mirror.x, mirror.y, mirror.r, "rgba(238, 243, 255, 0.12)", "#f1f5f9");
        if (clone) {
          ctx.save();
          ctx.globalAlpha = 0.68;
          diamond(ctx, clone.x, clone.y, player().r, nightBloodActive() ? "rgba(229, 143, 112, 0.22)" : "rgba(238, 243, 255, 0.12)", nightBloodActive() ? "#e58f70" : "#f1f5f9");
          ctx.fillStyle = nightBloodActive() ? "#e58f70" : "#f1f5f9";
          ctx.font = "22px serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("镜", clone.x, clone.y + 1);
          ctx.restore();
        }
      }
      state.nightShardProjectiles.forEach((shard) => {
        ctx.save();
        ctx.translate(shard.x, shard.y);
        ctx.rotate(Math.atan2(shard.vy, shard.vx) + Math.PI / 4);
        const color = shard.back ? "#e58f70" : "#f1f5f9";
        ctx.fillStyle = shard.back ? "rgba(229, 143, 112, 0.28)" : "rgba(238, 243, 255, 0.2)";
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = shard.back ? 18 : 10;
        ctx.lineWidth = shard.back ? 3 : 2;
        const w = shard.back ? 13 : 9;
        const h = shard.back ? 28 : 22;
        ctx.beginPath();
        ctx.moveTo(0, -h);
        ctx.lineTo(w, 0);
        ctx.lineTo(0, h);
        ctx.lineTo(-w, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });
    }

    function drawHathor(ctx) {
      if (state.hathorBellFieldLeft <= 0 && state.hathorShield <= 0) return;
      const p = player();
      ctx.save();
      const red = state.hathorBellFieldLeft > 0 ? state.hathorBellFieldKind === "sekhmet" : p.sekhmetLeft > 0;
      const rgb = red ? "229, 88, 62" : "241, 207, 122";
      const radius = state.hathorBellFieldLeft > 0 ? 230 : 84;
      const pulse = 0.5 + Math.sin(state.time * 3.2) * 0.5;
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = `rgba(${rgb}, ${red ? 0.13 : 0.1})`;
      ctx.strokeStyle = `rgba(${rgb}, ${0.64 + pulse * 0.22})`;
      ctx.lineWidth = 3 + pulse * 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius + pulse * 8, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([10, 12]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * 0.74 - pulse * 10, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      const count = red ? 14 : 10;
      for (let i = 0; i < count; i += 1) {
        const angle = (i / count) * TAU + state.time * (red ? 0.42 : 0.22);
        const x = p.x + Math.cos(angle) * (radius * 0.88);
        const y = p.y + Math.sin(angle) * (radius * 0.88);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle + Math.PI / 2);
        ctx.globalAlpha = red ? 0.56 : 0.48;
        ctx.strokeStyle = red ? "rgba(229, 88, 62, 0.92)" : "rgba(255, 238, 190, 0.86)";
        ctx.fillStyle = red ? "rgba(229, 88, 62, 0.28)" : "rgba(241, 207, 122, 0.22)";
        ctx.lineWidth = 2;
        if (red) {
          ctx.beginPath();
          ctx.moveTo(0, -10);
          ctx.lineTo(7, 8);
          ctx.lineTo(-7, 8);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(-7, -6);
          ctx.quadraticCurveTo(0, 8, 7, -6);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, 8, 2.5, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
      }
      ctx.restore();
    }

    function drawBastet(ctx) {
      if (state.bastetMoonShadow) {
        const shadow = state.bastetMoonShadow;
        ctx.save();
        ctx.globalAlpha = 0.72;
        diamond(ctx, shadow.x, shadow.y, 20, "rgba(225, 185, 86, 0.16)", "#e1b956");
        ctx.strokeStyle = "rgba(225, 185, 86, 0.42)";
        ctx.beginPath();
        ctx.arc(shadow.x, shadow.y, 46 + Math.sin(state.time * 5) * 4, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
      if (selected() === "bastet" && state.bastetCounterLeft > 0) {
        const p = player();
        ctx.save();
        ctx.strokeStyle = "#e1b956";
        ctx.shadowColor = "#e1b956";
        ctx.shadowBlur = 18;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 76, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = "#e1b956";
        ctx.font = "18px serif";
        ctx.textAlign = "center";
        ctx.fillText(state.bastetCounterCharges, p.x, p.y - 92);
        ctx.restore();
      }
      state.bastetMoonBlades.forEach((blade) => {
        if (blade.age < 0) return;
        crescent(ctx, blade.x, blade.y, blade.size, Math.atan2(blade.vy, blade.vx), "#e1b956", clamp(1 - blade.age / blade.life, 0.25, 1));
      });
    }

    function drawPet(ctx) {
      const def = petDef();
      if (!def) return;
      const pet = state.pet;
      const activeRatio = petDuration() > 0 ? clamp(pet.activeLeft / petDuration(), 0, 1) : 0;
      ctx.save();
      if (pet.shield > 0) {
        ctx.strokeStyle = "rgba(215, 245, 255, 0.7)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player().x, player().y, 50 + Math.sin(state.time * 4) * 4, 0, TAU);
        ctx.stroke();
      }
      ctx.translate(pet.x, pet.y + Math.sin(state.time * 5) * 3);
      ctx.scale(1 + pet.squash * 0.16, 1 - pet.squash * 0.1);
      ctx.fillStyle = def.color || "#e6ddc8";
      ctx.strokeStyle = def.markColor || "#f7e2ba";
      ctx.shadowColor = def.glow || def.markGlow || "rgba(247,226,186,.5)";
      ctx.shadowBlur = activeRatio > 0 ? 18 : 10;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 17, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = def.markColor || "#f7e2ba";
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (adapter.selectedPet?.() === "mender") {
        ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.moveTo(0, -8); ctx.lineTo(0, 8);
      } else if (adapter.selectedPet?.() === "guard") {
        ctx.arc(0, 0, 8, -Math.PI * 0.8, Math.PI * 0.8);
      } else if (adapter.selectedPet?.() === "cooler") {
        ctx.moveTo(-8, 6); ctx.quadraticCurveTo(0, -8, 8, 6);
      } else {
        ctx.moveTo(-8, 4); ctx.lineTo(0, -8); ctx.lineTo(8, 4);
      }
      ctx.stroke();
      ctx.restore();
    }

    function drawBurnParticles(ctx) {
      enemies().forEach((enemy) => {
        if ((enemy.burn || 0) <= 0 || enemy.dead) return;
        ctx.save();
        for (let i = 0; i < 5; i += 1) {
          const a = state.time * (2.2 + i * 0.3) + i * 1.7;
          const r = (enemy.r || 20) + 8 + Math.sin(state.time * 3 + i) * 5;
          ctx.fillStyle = i % 2 ? "rgba(255, 164, 93, 0.72)" : "rgba(78, 68, 58, 0.58)";
          ctx.beginPath();
          ctx.arc(enemy.x + Math.cos(a) * r, enemy.y + Math.sin(a) * r - i * 3, i % 2 ? 3.5 : 2.5, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
      });
    }

    return {
      active,
      cooldown,
      cooldownMax,
      charges,
      maxCharges,
      skillDefs,
      snapshot,
      update,
      use,
      release,
      usePet,
      draw,
      tryBastetCounter,
      beforePlayerDamage,
      blocksProjectile,
      blocksLaserSegment,
      catExecutionBlocksMelee,
      catExecutionNpcOffset,
      threatTargetFor,
      damageThreatTarget,
      absorbWithPetShield,
      movementMultiplier,
      enemyMovementMultiplier,
      extendHathorFieldAfterChange,
      petState: () => state.pet,
      hathorFormInfo,
      nightStealthActive: () => selected() === "night" && Boolean(state.nightAfterimage)
    };
  }

  window.MiwenguanCombatFactory = { create };
})();
