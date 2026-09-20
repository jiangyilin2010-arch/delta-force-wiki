(function () {
  "use strict";
  const C = window.HaffCampaign, Core = window.HaffWar, Battle = window.HaffWarUI, Career = window.HaffCareer;
  /** @type {import('./haff-events').EventBus} */
  const events = window.HaffEvents.bus;
  const host = document.getElementById("campaign-shell");
  if (!C || !Battle || !host) return;
  const saveKey = "haff-currency-war-campaign-v1";
  let run = null, checkpoint = null, tab = "prep", training = false, confirmAction = null;
  let profile = Career.create();
  let careerRankChoice = null;
  let openingSelection = null, tacticalSelection = null, difficulty = "normal", notice = "";
  const $ = id => document.getElementById(id);
  const cash = amount => `${(amount / 10000).toLocaleString("zh-CN", { maximumFractionDigits: 2 })} 万`;
  const tacticIcons = { assault: "crosshair", smoke: "radio", salvage: "package", compound: "coins", refresh: "refresh-cw", bounty: "crosshair", fund: "coins", charge: "zap", bulwark: "shield", supply: "package", education: "graduation-cap", welfare: "hand-coins", recon: "radio", logistics: "heart-pulse", barrage: "crosshair" };
  const nodeLabels = { fight: "交火", supply: "搜刮", market: "黑市", elite: "精锐交火", challenge: "高难挑战", tactical: "战术补给", tactic: "战术决策", boss: "首领" };
  const nodeIcons = { fight: "crosshair", supply: "package", market: "coins", elite: "shield", challenge: "zap", tactical: "users", tactic: "radio", boss: "crosshair" };
  let choiceFocusKey = null;
  let openSynergy = null;
  function closeSynergy() { if (openSynergy) openSynergy.tip.hidden = true; openSynergy = null; }
  document.addEventListener("pointerdown", event => { if (openSynergy && !openSynergy.row.contains(event.target)) closeSynergy(); });
  document.addEventListener("keydown", event => { if (event.key === "Escape") closeSynergy(); });
  window.addEventListener("resize", closeSynergy);
  window.addEventListener("scroll", closeSynergy, true);
  function tacticIcon(name) { const icon = n("img", "tactic-icon"); icon.src = `assets/haff-war/icons/${name}.svg`; icon.alt = ""; return icon; }
  const n = (tag, cls, text) => { const el = document.createElement(tag); if (cls) el.className = cls; if (text !== undefined) el.textContent = text; return el; };
  function button(text, action, cls = "", disabled = false) {
    const el = n("button", cls, text); el.type = "button"; el.disabled = disabled;
    el.addEventListener("click", action); return el;
  }
  function iconHint(id, name, detail, status, icon, cls = "", tag = "div") {
    const row = n(tag, "icon-hint"), tip = n("div", "synergy-tooltip");
    tip.id = id; tip.setAttribute("role", "tooltip"); tip.hidden = true;
    tip.append(n("strong", "", name), n("small", "", status), n("p", "", detail));
    let leaveTimer;
    const show = () => {
      clearTimeout(leaveTimer); closeSynergy(); tip.hidden = false; openSynergy = { row, tip };
      const rect = control.getBoundingClientRect();
      tip.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - tip.offsetWidth - 12))}px`;
      const below = rect.bottom + 8;
      tip.style.top = `${Math.max(12, below + tip.offsetHeight <= window.innerHeight - 12 ? below : rect.top - tip.offsetHeight - 8)}px`;
    };
    const control = button("", show, `campaign-icon ${cls}`);
    control.setAttribute("aria-label", `${name}，${status}`); control.setAttribute("aria-describedby", id); control.append(tacticIcon(icon));
    row.addEventListener("mouseenter", show);
    row.addEventListener("mouseleave", () => { leaveTimer = setTimeout(() => { if (openSynergy?.row === row && !row.contains(document.activeElement)) closeSynergy(); }, 150); });
    control.addEventListener("focus", show);
    row.addEventListener("focusout", event => { if (!row.contains(event.relatedTarget)) closeSynergy(); });
    row.append(control, tip); return { row, control };
  }
  function title(text, meta) { const el = n("div", "campaign-heading"); el.append(n("h2", "", text)); if (meta) el.append(n("span", "", meta)); return el; }
  function stat(name, value) { const el = n("div", "campaign-stat"); el.append(n("span", "", name), n("strong", "", value)); return el; }
  function careerBadge() {
    const data = Career.progress(profile.xp), el = n("div", "career-badge"), bar = n("progress");
    bar.max = data.needed; bar.value = data.current; bar.setAttribute("aria-label", "行动等级积分进度");
    el.append(n("strong", "", `行动等级 Lv.${data.level}`), bar, n("small", "", `${data.current} / ${data.needed} 积分`)); return el;
  }
  const inventory = window.HaffInventoryUI.create({ Core, C, getRun: () => run, execute: action => { C.command(run, action); save(); }, onChange: owner => { Battle.focusOperator(owner); Battle.refreshEquipment(); }, sell, sellMany });
  function save() {
    try { window.localStorage.setItem(saveKey, JSON.stringify({ run, checkpoint, profile })); }
    catch (_) { notice = "浏览器无法保存进度，本次关闭页面后不会保留行动。"; }
  }
  function commit(action) {
    const previousCopies = { ...run?.copies },previousCards=C.Cards.list(run).map(card=>({...card})),previousClaims=new Set(run.toolTacticClaims||[]);
    const wornBeforeSale = action.type === 'sellOperator' ? run.inventory.filter(item=>item.owner===action.id).map(item=>item.uid) : [];
    try { window.HaffPrepDecisions?.clear();C.command(run, action); checkpoint = null; notice = (run.toolTacticClaims||[]).filter(key=>!previousClaims.has(key)).map(key=>`${C.doctrines[key].name}：${C.doctrines[key].toolReward?.reforge?'藏品重铸器 ×2':'干员复制器 ×1'} 已领取`).join(' · ');
      const returned = wornBeforeSale.filter(uid=>run.inventory.some(item=>item.uid===uid&&!item.owner));
      if(returned.length){inventory.revealReturned(returned);Battle.focusOperator(run.deployed[0]);notice=[notice,`${returned.length} 件装备与藏品已返还库存`].filter(Boolean).join(' · ');}
      save(); if(action.type!=='buyMarketItem'||!refreshMarketPurchase())render(); if(window.HaffBattleRewards?.cardsUpgraded)window.HaffBattleRewards.cardsUpgraded(previousCards,C.Cards.list(run));else window.HaffBattleRewards?.upgraded(previousCopies, run.copies);return true; }
    catch (error) { notice = error.message; renderNotice();return false; }
  }
  function refreshMarketPurchase(){
    if(run.phase!=='market')return false;
    const market=host.querySelector('.hbm-market');
    if(!market||!window.HaffBlackMarketUI?.update)return false;
    const work=()=>{
      if(!window.HaffBlackMarketUI.update(market,run))return false;
      const balance=host.querySelector('.hc-wallet > strong'),interest=host.querySelector('.hc-interest-preview');
      if(balance)balance.textContent=cash(run.coins);
      if(interest)interest.textContent=`利息 +${cash(C.interest(run))}`;
      for(const card of host.querySelectorAll('.hbm-recruits .market-card')){
        const offer=run.shop.find(item=>item.uid===card.dataset.offerUid),buy=card.querySelector('.hbm-price');
        if(offer&&buy)buy.disabled=offer.sold||run.coins<C.recruitPrice(run,offer.key)||!C.recruitSpace(run,offer.key).allowed;
      }
      renderNotice();return true;
    };
    return window.HaffPrepStability?window.HaffPrepStability.update(work):work();
  }
  function cardAction(action){if(!commit(action))throw Error(notice);return true;}
  function manageCards(){window.HaffOperatorCardsUI?.manage({run,C,Core,execute:cardAction});}
  events.on("run:changed", event => { if (run?.id === event.runId) save(); });
  events.on("plane:entered", event => { if (run?.id === event.runId) checkpoint = null; });
  function renderNotice() { $("campaign-notice").textContent = notice; }
  function ask(text, action) {
    confirmAction = action; $("campaign-confirm-text").textContent = text;
    $("campaign-confirm").showModal(); $("campaign-confirm-no").focus();
  }
  $("campaign-confirm-yes").addEventListener("click", () => {
    $("campaign-confirm").close(); const action = confirmAction; confirmAction = null; if (action) action();
  });
  $("campaign-confirm-no").addEventListener("click", () => { confirmAction = null; $("campaign-confirm").close(); });
  $("campaign-confirm").addEventListener("cancel", () => { confirmAction = null; });
  function sell(item, pending = false) {
    const data = C.itemInfo(item), action = () => commit({ type: pending ? "sellDrop" : "sell", uid: item.uid });
    if (data.quality === "gold") ask(`出售「${data.name}」，获得 ${cash(C.salePrice(run, item))} 哈夫币？出售后本局无法撤销。`, action);
    else action();
  }
  function sellMany(uids, onSold) {
    try {
      const { items, total } = C.saleSelection(run, uids);
      const valuable = items.filter(item => ["gold", "red"].includes(C.itemInfo(item).quality));
      const action = () => { if (commit({ type: "sellItems", uids })) onSold(); };
      if (valuable.length) {
        const names = new Map();
        for (const item of valuable) { const name = C.itemInfo(item).name; names.set(name, (names.get(name) || 0) + 1); }
        ask(`出售所选 ${items.length} 件物品，获得 ${cash(total)} 哈夫币？包含金色／红色物品：${[...names].map(([name, count]) => `${name} ×${count}`).join("、")}。出售后本局无法撤销。`, action);
      } else action();
    } catch (error) { notice = error.message; renderNotice(); }
  }
  function sellOperator(id) {
    if (!run.copies[id]) return;
    commit({ type: "sellOperator", id });
  }
  function context() {
    const nodeIndex = run.node;
    return {
      difficulty: run.difficulty,
      renderPrepExtras,
      renderItemInventory: inventory.render,
      itemSlotButton: inventory.slotButton,
      bindInventoryDrop: inventory.bindDrop,
      hasItems: inventory.hasItems,
      guideInventory: () => run.inventory,
      canStart: () => run.phase === "prep" || run.phase === "combat",
      canBypass: () => C.canBypass(run),
      bypass() {
        if (!commit({ type: "bypass", node: nodeIndex })) return;
        if (run.phase === "ended") Career.award(profile, run);
        else window.HaffBuildcraftUI.requestShopOpen();
        checkpoint = null; tab = "prep";
        notice = "非洲之心已直通本节点，现金已到账，物资已送达快递箱。";
        save(); render();
      },
      missionName: `${C.nodes[run.node].name}${C.nodes[run.node].openingReward ? ' · 奖励关 / 无限救援' : ''}${run.challengeDraft?.selected ? ` · ${C.challenges[run.challengeDraft.selected].name}` : ""}`,
      enemyNames: (() => { const plan = C.encounter(run); return (plan.enemyWaves || [plan.enemies || []]).map((wave,index,waves) => `${waves.length > 1 ? `第 ${index+1} 波：` : ''}${[...new Set(wave.map(id=>Core.units[id].name))].join(' / ')}（${wave.length} 人${wave.length>5?`，含 ${wave.length-5} 名待援`:''}）`).join(' → '); })(),
      recruitedCount: () => C.operators.filter(id => run.copies[id]).length,
      capacity: () => C.capacity(run),
      terminal: () => ({ rank: run.rank, price: C.upgradePrice(run), odds: C.recruitRates[run.rank - 1], nextOdds: C.recruitRates[run.rank], canUpgrade: ["prep", "route"].includes(run.phase) && run.rank < Core.Formation.maxRank && run.coins >= C.upgradePrice(run) }),
      upgrade: () => commit({ type: "upgrade" }),
      parcels: () => run.parcels.filter(item => !item.opened).map(({ uid, label }) => ({ uid, label })),
      lastParcel: () => run.lastParcel,
      openParcel: uid => commit({ type: "openParcel", uid }),
      openAllParcels: () => commit({type:'openAllParcels'}),
      previewPlace: (id,slot,uid) => window.HaffPrepDecisions?.place({run,C,id,slot,uid}),
      owns: id => run.copies[id] > 0,
      benchCards: () => C.Cards.bench(run),
      card: id => C.Cards.primary(run,id),
      inspectCard: uid => window.HaffOperatorCardsUI?.inspect({run,C,Core,uid,execute:cardAction}),
      sellOperator,
      salePrice: id => C.operatorSalePrice(run, id),
      canSell: id => ["prep", "route"].includes(run.phase) && run.copies[id] > 0 && (!run.deployed.includes(id) || run.deployed.some(other => other !== id && Core.Formation.frontSlot(run.positions[other]))),
      strip(id) { C.tooling.stripAll(run, id); save(); },
      loadouts: () => C.loadouts(run), stats: (id, override) => C.stats(run, id, override),
      inspectionBonuses: () => [...C.activeTactics(run).map(t => ({ name: t.name, detail: t.effect || t.detail || "" })), ...C.synergies(run).filter(s => s.active).map(s => ({ name: s.name, detail: s.effect }))],
      status: id => run.copies[id] ? `${C.Cards.primary(run,id).stars} 星 · ${run.deployed.includes(id) ? "出战" : "待命"}` : "尚未招募",
      stars: id => C.Cards.primary(run,id)?.stars || 1,
      deployed: () => run.deployed,
      positions: () => C.positions(run),
      place(id, slot, cardUid) { C.command(run, { type: "place", id, slot, cardUid }); save(); },
      availableGear: () => [...new Set(run.inventory.filter(item => item.kind === "gear" && !item.owner).map(item => item.key))],
      gearCount: key => run.inventory.filter(item => item.kind === "gear" && item.key === key && !item.owner).length,
      gearStatus: key => { const items = run.inventory.filter(item => item.kind === "gear" && item.key === key); return items.some(item => !item.owner) ? "库存" : `${Core.units[items[0].owner].name}携带`; },
      equip(key, owner, slot, sourceOwner = null) {
        if (!run.copies[owner]) throw new Error("请先在招募终端招募这名干员。");
        const item = key ? sourceOwner ? run.inventory.find(item => item.kind === "gear" && item.key === key && item.owner === sourceOwner) : run.inventory.find(item => item.kind === "gear" && item.key === key && !item.owner) || run.inventory.find(item => item.kind === "gear" && item.key === key) : run.inventory.find(item => item.owner === owner && C.itemSlot(item) === slot);
        if (!item) return;
        C.command(run, { type: "equip", uid: item.uid, owner: key ? owner : null }); save();
      },
      order(order) { run.deployed = order.filter(id => run.deployed.includes(id)); save(); },
      preview: () => C.battlePreview(run),
      start() {
        if (run.phase === "combat") {
          if (checkpoint) return Core.snapshot(checkpoint);
          run.phase = "prep";
          const battle = C.battlePreview(run);
          C.command(run, { type: "start" });
          checkpoint = Core.snapshot(battle); save(); renderHeader();
          return battle;
        }
        const battle = C.battlePreview(run); C.command(run, { type: "start" }); checkpoint = Core.snapshot(battle); save(); renderHeader();
        return battle;
      },
      checkpoint(battle) { checkpoint = Core.snapshot(battle); save(); },
      finish(battle, abandoned) {
        if (run.phase !== "combat") return;
        const bossFight = C.nodes[run.node].kind === "boss";
        const mission = C.nodes[run.node].name;
        const receipt = C.settle(run, battle, abandoned);
        if (run.phase === "ended") Career.award(profile, run);
        else window.HaffBuildcraftUI.requestShopOpen();
        notice = `${receipt.won ? "作战胜利" : `作战失利 · 完整度 −${receipt.loss}`}，现金已到账，物资已送达快递站${run.node !== receipt.node ? `。已抵达${C.nodes[run.node].name}` : ""}`;
        if (receipt.linkRevived) notice += `。绝境重启已触发：恢复至 ${run.integrity} 完整度，重新备战（本局已用）`;
        if (receipt.linkRecovery) notice += `。持续作战恢复 ${receipt.linkRecovery} 完整度`;
        checkpoint = null; tab = "prep"; save();
        const delivery = run.parcels.findLast(parcel => parcel.label === `${mission} · 战后快递`);
        const openDebrief = () => {
          Battle.hide(); render();
          window.scrollTo?.({ top: 0, behavior: "instant" });
          window.HaffBattleDebrief?.show(battle, { mission, receipt, abandoned, integrity: run.integrity, ended: run.phase === "ended", items: (delivery?.items || []).map(item => C.itemInfo(item).name) });
        };
        if (!bossFight || !window.HaffBossOutro?.show({ mission, won: receipt.won, final: run.outcome === "extracted", abandoned, onComplete: openDebrief })) openDebrief();
      }
    };
  }
  function startRun() {
    if (run) return;
    run = C.createRun({ difficulty });
    Career.prepareRun(profile, run, careerRankChoice);
    openingSelection = null; checkpoint = null; training = false; tab = "prep"; notice = ""; save(); render();
    window.HaffInsertion?.show({ mission: "零号大坝", briefing: "小队抵达 · 接收本次行动协议" });
  }
  function openLinks() { window.HaffLinkUI.show(profile, { onChange: save, onClose: render }); }
  function renderSetup() {
    host.append(careerBadge());
    host.append(title("哈夫币战争 · 连续行动", "三个位面 / 分支路线"));
    host.append(window.HaffLinkUI.launcher(profile, openLinks));
    host.append(window.HaffCareerUI.render(profile, {
      selectedRank: careerRankChoice ?? Career.rank(profile).index,
      onStart: startRun,
      onSelect: rank => { careerRankChoice = rank; render(); document.getElementById("hcr-rank-select")?.focus({ preventScroll: true }); },
      onTrain: key => {
        try { Career.train(profile, key); notice = `${Career.tracks[key].name}已升级，将在下一局生效。`; save(); render(); document.getElementById(`hcr-train-${key}`)?.focus({ preventScroll: true }); }
        catch (error) { notice = error.message; renderNotice(); }
      }
    }));
    const brief = n("div", "campaign-brief");
    const image = n("img"); image.src = Core.units.saeed.portrait; image.alt = "赛伊德";
    const text = n("div"); text.append(n("p", "eyebrow", "G.T.I. / OPERATION"), n("h3", "", "零号大坝 → 航天基地 → 潮汐监狱"), n("p", "", `启动资金 ${C.economy.startCoins / 10000 + Career.training(profile).levels.funding} 万哈夫币 · 行动完整度 100 · 三名前台 / 三名后台`));
    brief.append(image, text); host.append(brief);
    const terms = n("div", "opening-terms");
    terms.append(stat("首发干员", "随机派遣"), stat("开局协议", "免费三选一"), stat("入场快递", "随机装备 + 额外资金")); host.append(terms);
    const actions = n("div", "campaign-actions");
    const label = n("label", "difficulty", "行动难度 "); const select = n("select");
    for (const [value, text] of [["normal", "标准"], ["hard", "强化"]]) { const option = n("option", "", text); option.value = value; select.append(option); }
    select.value = difficulty; select.addEventListener("change", () => { difficulty = select.value; }); label.append(select);
    actions.append(label, button("开始行动", startRun, "primary"), button("自由训练", () => { training = true; render(); }));
    host.append(actions, n("p", "campaign-footnote", "非官方同人。敌人身份取自原作，回合制技能、数值、编队与路线均为改编。"));
  }
  function renderOpening() {
    const operator = Core.units[run.deployed[0]];
    const page = choicePage("开局战术", "免费三选一 · 全局生效");
    const reveal = n("div", "opening-operator"), art = n("img"); art.src = operator.portrait; art.alt = operator.name;
    const detail = n("div"); detail.append(n("small", "eyebrow", "G.T.I. / DEPLOYED"), n("h3", "", operator.name), n("p", "", `${operator.role} · ${Core.rearPassives[operator.id].role}`));
    reveal.append(art, detail); page.append(reveal);
    renderTacticChoices(page, run.openingChoices, true);
  }
  function choicePage(name, meta) {
    const page = n("section", "campaign-choice-page"); page.setAttribute("aria-label", name);
    page.append(title(name, meta)); host.append(page);
    const focusKey = `${run.id}:${run.node}:${run.phase}`;
    if (choiceFocusKey !== focusKey) {
      choiceFocusKey = focusKey;
      const heading = page.querySelector("h2"); heading.tabIndex = -1;
      queueMicrotask(() => { if (heading.isConnected) heading.focus({ preventScroll: true }); });
    }
    return page;
  }
  function renderTacticChoices(page, offers, opening = false) {
    if (!offers.includes(openingSelection)) openingSelection = null;
    const gradeLegend = n("p", "hq-grade-legend", "战术品级：");
    for (const quality of ["purple", "gold", "red"]) {
      const label = n("span", "", `${C.tacticQualities[quality].name}${quality === "red" ? " · 最高" : ""}`); label.dataset.quality = quality;
      gradeLegend.append(label); if (quality !== "red") gradeLegend.append(document.createTextNode("＜"));
    }
    page.append(gradeLegend);
    if (!opening) page.append(n("p", "choice-current-tactics", `已选战术：${run.tactics.map(key => C.doctrines[key].name).join("、")} · ${C.tacticRiskText(C.tacticThreat(run))}`));
    const choices = n("div", "opening-protocols");
    for (const key of offers) {
      const data = C.doctrines[key], change = C.tacticChoice(run, key), el = button("", () => { openingSelection = key; render(); host.querySelector(`[data-tactic="${key}"]`)?.focus({ preventScroll: true }); }, "opening-protocol");
      el.dataset.quality = data.quality; el.dataset.tactic = key;
      el.setAttribute("aria-pressed", String(openingSelection === key));
      const heading = n("div", "tactic-grade"), gradeBadge = n("span", "hq-badge");
      const gradeMarks = n("span", "hq-grade-marks", ({ purple: "Ⅰ", gold: "Ⅱ", red: "Ⅲ" })[data.quality]); gradeMarks.setAttribute("aria-hidden", "true");
      gradeBadge.append(gradeMarks, document.createTextNode(`${C.tacticQualities[data.quality].name}品级`));
      heading.append(tacticIcon(data.icon), gradeBadge, n("small", "tactic-theme", data.theme));
      const risk = n("p", "tactic-risk", `新增压力：${C.tacticRiskText(change.extra)}\n选择后累计：${C.tacticRiskText(change.after)}`);
      el.append(heading, n("h3", "", data.name), n("p", "", data.effect));
      const progress = C.tacticProgress(run, key);
      if (progress) el.append(n('small', 'tactic-progress', progress));
      if (change.previous) el.append(n("small", "tactic-upgrade", `升级替换「${C.doctrines[change.previous].name}」；即时奖励只补差额`));
      el.append(risk, n("strong", "", openingSelection === key ? "已选择 · 免费" : "免费签订")); choices.append(el);
    }
    const actions = n("div", "choice-page-actions");
    const refreshes = window.HaffLinkTree.remaining(run);
    actions.append(button(`刷新战术 · 剩余 ${refreshes} 次`, () => { openingSelection = null; commit({ type: "refreshTactic" }); }, "hl-tactic-refresh", refreshes < 1));
    actions.append(button(opening ? "确认战术 · 前往备战" : "确认战术 · 选择路线", () => { tab = "prep"; commit({ type: opening ? "chooseOpening" : "chooseTactic", key: openingSelection }); }, "primary", !offers.includes(openingSelection)));
    page.append(choices, actions);
  }
  function renderTacticDecision() {
    const page = choicePage("战术决策", "共享战术池 · 免费三选一");
    renderTacticChoices(page, run.tacticDraft.offers);
  }
  function renderHeader() {
    closeSynergy();
    host.replaceChildren();
    const node = C.nodes[run.node];
    const actions = n("div", "campaign-top-actions");
    if (run.phase !== "ended") actions.append(button("放弃本次行动", () => ask("放弃整次行动？当前进度和所有物资将被清空，已获得的行动等级保留。", () => { run = null; checkpoint = null; save(); render(); }), "abandon-run"));
    actions.append(careerBadge()); host.append(actions);
    const hud = n("div", "campaign-hud");
    const wallet = stat("哈夫币", cash(run.coins)); wallet.classList.add("hc-wallet");
    const projectedInterest = n("small", "hc-interest-preview", `利息 +${cash(C.interest(run))}`);
    projectedInterest.title = "按当前余额预计的下次节点利息；消费或获得哈夫币后同步更新。";
    const streakPreview=n('small','hc-streak-preview',`连胜 +${cash(C.streakBonus(run.streak+1))}`);
    streakPreview.title=`当前 ${run.streak} 连胜；显示下一场获胜可得的奖金。2 连胜 +1 万，3～4 连胜 +2 万，5 连胜起每场 +3 万。失败或撤退清零；非战斗节点保留。奖金在战后结算直接到账。`;
    streakPreview.tabIndex=0;streakPreview.setAttribute('aria-label',`${streakPreview.textContent}；${streakPreview.title}`);
    const incomePreview=n('div','hc-income-preview');incomePreview.append(projectedInterest,streakPreview);wallet.append(incomePreview);
    hud.append(wallet, stat("行动完整度", `${run.integrity} / 100`), stat("位面进度", `${node.plane + 1} / 3`), stat("当前区域", node.name));
    host.append(hud);
    const rankHazards = window.HaffRankHazardsUI?.current(run); if (rankHazards) host.append(rankHazards);
    $("view-phase").textContent = run.phase === "ended" ? "行动结算" : `位面 ${node.plane + 1} / ${C.planes[node.plane].name}`;
    $("view-status").textContent = { opening: "免费开局协议", finance: "备战理财", prep: "招募与构筑", combat: "交战中", loot: "阵亡与收益结算", route: "路线选择", market: "黑市交易", supply: "物资搜刮", challenge: "高难挑战 · 二选一", tactical: "战术补给 · 五选一", tactic: "战术三选一", ended: "行动结束" }[run.phase];
    const progress = n("div", "compact-progress"), currentPlane = n("div", "current-plane");
    currentPlane.setAttribute("aria-label", `当前位面：${C.planes[node.plane].name}，第 ${node.plane + 1} / 3 位面`);
    currentPlane.append(n("strong", "", C.planes[node.plane].name), n("small", "", `${node.plane + 1}/3`));
    progress.append(currentPlane);
    const flow = n("ol", "plane-node-flow"); flow.setAttribute("aria-label", `${C.planes[node.plane].name}位面流程`);
    const entries = C.planeFlow(run), currentDepth = entries.find(entry => entry.index === run.node)?.depth ?? node.depth;
    const finalDepth = Math.max(...entries.map(entry => entry.depth));
    for (let depth = 0; depth <= finalDepth; depth++) {
      const column = n("li", "plane-flow-step");
      for (const { index, node: entry, depth: entryDepth } of entries) {
        if (entryDepth !== depth) continue;
        if(entry.branchOnly&&!run.visited.includes(index)&&!run.branchDraft?.offers.includes(index))continue;
        if(entry.branchEvent&&run.branchDraft&&!run.branchDraft.offers.includes(index))continue;
        const complete = run.history.some(item => item.node === index), current = index === run.node;
        const skipped = !current && !run.visited.includes(index) && currentDepth > depth;
        const state = current ? "current" : complete ? "done" : skipped ? "skipped" : "future";
        const status = current ? complete ? "已完成" : "当前位置" : complete ? "已完成" : skipped ? "未经过" : "待抵达";
        let detail = entry.note;
        if (current && run.challengeDraft?.selected) {
          const key = run.challengeDraft.selected;
          detail = `${C.challenges[key].name}：${C.challenges[key].effect} 胜利额外获得：${challengeRewards(key).join("、")}。失利扣除 ${C.challengeReward(run).loss} 完整度。`;
        }
        const { row, control } = iconHint(`flow-tip-${index}`, `${entry.easter?'彩蛋遭遇':nodeLabels[entry.kind]} · ${entry.name}`, detail, status, nodeIcons[entry.kind], "flow-icon");
        control.dataset.state = state; control.dataset.kind = entry.kind;
        if (current) control.setAttribute("aria-current", "step"); column.append(row);
      }
      flow.append(column);
    }
    const track = n("div", "compact-flow-track"); track.append(flow); progress.append(track); host.append(progress);
  }
  function tabs() {
    const nav = n("nav", "campaign-tabs"); nav.setAttribute("aria-label", "行动整备");
    for (const [key, name] of [["prep", "作战整备"], ["shop", "干员招募"]].filter(([key]) => run.phase !== "market" || key !== "prep")) {
      const el = button(name, () => { tab = key; notice = ""; render(); }); el.setAttribute("aria-current", key === tab ? "page" : "false"); nav.append(el);
    }
    host.append(nav);
  }
  function renderShop(destination = host) {
    const blackMarket=run.phase==='market';
    const actions = n("div", "campaign-actions");
    const lock = button(run.locked ? "已锁定商店" : "锁定商店", () => commit({ type: "lock" })); lock.setAttribute("aria-pressed", String(run.locked));
    lock.title = "锁定仅在当前位面有效；进入下个位面时免费刷新并解锁。";
    const refreshCost = C.refreshPrice(run);
    if(!blackMarket)actions.append(button(run.freeRefreshes ? `免费刷新 · 剩余 ${run.freeRefreshes} 次` : `刷新 · ${cash(refreshCost)}`, () => commit({ type: "refresh" }), "", !C.operators.some(id => run.copies[id] < 9) || !run.freeRefreshes && run.coins < refreshCost), lock, n("span", "", `预计利息 ${cash(C.interest(run))}`));
    const contract = run.tactics.find(key => C.doctrines[key].family === 'longline');
    if (contract&&!blackMarket) actions.append(n('small', 'tactic-progress', C.tacticProgress(run, contract)));
    if (!blackMarket&&run.tactics.some(key=>C.doctrines[key].recruitRole)) actions.append(n('small','tactic-progress',`后续刷新定位概率：${C.recruitOdds(run).map(row=>`${row.name} ${(row.probability*100).toFixed(1)}%`).join(' / ')}`));
    destination.append(title("干员招募", blackMarket ? "" : "3 份档案升二星 · 9 份档案升三星"));if(!blackMarket)destination.append(actions);
    const odds = n("div", "recruit-odds"), chances = C.recruitChances(run);
    odds.append(n("small", "", `Lv.${run.rank} 招募概率`));
    for (const cost of [3, 4, 5]) {
      const rate = n("span", "recruit-rate", `${cost}费 ${(chances[cost] * 100).toFixed(1).replace(/\.0$/, "")}%`);
      rate.dataset.quality = { 3: "purple", 4: "gold", 5: "red" }[cost]; odds.append(rate);
    }
    odds.tabIndex = 0;
    odds.title = C.recruitRates.map((row, index) => `Lv.${index + 1}：${[3, 4, 5].map(cost => `${cost}费 ${Math.round(row[cost] * 100)}%`).join(" / ")}`).join("\n") + "\n升级影响下次刷新，保留当前货架。满星干员不再出现；某档全部满星时，概率按剩余档位重新分配。定位战术仅调整同费用内的权重。";
    if(!blackMarket)destination.append(odds);
    const grid = n("div", "campaign-shop");
    if (!run.shop.length) grid.append(n("p", "shop-empty", "全部干员已满星"));
    for (const offer of run.shop) {
      const data = Core.units[offer.key],price=C.recruitPrice(run,offer.key);
      const card = n("article", "market-card"); card.dataset.quality = data.quality || "blue";
      card.dataset.offerUid=offer.uid;window.HaffPrepDecisions?.offer(card,{run,C,id:offer.key});
      const img = n("img"); img.src = data.portrait; img.alt = data.name; card.append(img);
      if(!blackMarket)card.append(n("small", "recruit-cost", `${data.cost}费 · ${data.cost}万`));card.append(n("h3", "", data.name));
      const space=C.recruitSpace(run,offer.key),owned=C.Cards.list(run).filter(c=>c.id===offer.key);
      const detail = `${owned.length} 张卡牌 · ${owned.map(c=>'★'.repeat(c.stars)).join(' / ')||'未招募'}`;
      const buy=button(offer.sold ? "已招募" : run.copies[offer.key]>=9 ? "已满星" : !space.allowed ? '备战席已满' : `招募 · ${cash(price)}`, () => commit({ type: "buy", uid: offer.uid }), "", offer.sold || run.coins < price || !space.allowed);
      buy.title=space.allowed?(space.upgrades.length?'购入后自动合成，释放备战席':space.auto?'购入后自动上阵':'购入后占用 1 格备战席'):space.reason;
      if(blackMarket){
        buy.classList?.add('hbm-price');
        buy.setAttribute('aria-label',`${data.name} · ${buy.disabled?buy.textContent:'购买'} · 现价 ${cash(price)} · 原价 ${cash(C.recruitCost(offer.key))}`);
        buy.title=[buy.title,detail,Core.rearPassives[offer.key].role].filter(Boolean).join('\n');
        if(!offer.sold&&run.copies[offer.key]<9){buy.textContent='';buy.append(n('strong','hbm-current',cash(price)),n('del','hbm-original',cash(C.recruitCost(offer.key))));}
        card.append(buy);
      }else{card.append(n("p", "", detail),buy);card.append(n("small", "", Core.rearPassives[offer.key].role));window.HaffBuildcraftUI?.offer(card, run, offer.key, C);}
      grid.append(card);
    }
    destination.append(grid);
    destination.append(button(`备战席 ${C.Cards.bench(run).length}/${C.Cards.limit} · 管理卡牌`,manageCards,'oc-bench-note'));
    window.HaffPageMotion?.panel(grid);
  }
  function gearSummary(data) { return Object.entries({ hp: "生命", attack: "攻击", armor: "防护", speed: "速度", chargeEfficiency: "充能效率", initialEnergy: "初始能量" }).filter(([key]) => data[key]).map(([key, label]) => `${label} ${data[key] > 0 ? "+" : ""}${data[key]}${key === "chargeEfficiency" ? "%" : ""}`).concat(data.passive ? [data.passive] : []).join(" · "); }
  function renderPrepExtras() {
    closeSynergy();
    const tactics = $("prep-tactics"), synergyHost = $("prep-synergies"); tactics.replaceChildren(); synergyHost.replaceChildren();
    const active = n("div", "active-tactics"); active.setAttribute("aria-label", "行动战术");
    for (const data of C.activeTactics(run)) {
      const key = data.key;
      const hint = iconHint(`tactic-tip-${key}`, data.name, C.tacticDescription(data), `${C.tacticQualities[data.quality].name} · 已生效`, data.icon || tacticIcons[key.replace("legacy-", "")], "tactic-control");
      hint.control.dataset.quality = data.quality; active.append(hint.row);
    }
    active.append(iconHint("tactic-threat-total", "战术总威胁", `${C.tacticRiskText(C.tacticThreat(run))}。适用于全部敌人，首领也生效；与节点、行动难度及高难挑战加成相乘。`, "当前累计敌方加成", "shield", "tactic-threat-control").row);
    tactics.append(active);
    const icons = ["users", "crosshair", "radio", "zap", "shield", "heart-pulse", "route"];
    const synergies = C.synergies(run).filter(item => !item.key).map((item, index) => ({ ...item, icon: icons[index], index })).sort((a, b) => Number(b.active) - Number(a.active));
    const list = n("ul", "synergy-list");
    for (const item of synergies) {
      const { row, control } = iconHint(`synergy-tip-${item.index}`, item.name, item.effect, item.active ? "已激活" : "未激活", item.icon, "synergy-icon", "li");
      row.classList.add("synergy-entry"); control.dataset.active = String(item.active); list.append(row);
    }
    if (window.HaffBuildcraftUI) window.HaffBuildcraftUI.prep(synergyHost, run, C, list);
    else synergyHost.append(list);
    window.HaffPrepDecisions?.mount({run,C,Core,execute:action=>window.HaffPrepStability?window.HaffPrepStability.update(()=>cardAction(action)):cardAction(action)});
  }
  function renderSupply() {
    host.append(title(C.nodes[run.node].name, "选择一项补给"));
    const choices = n("div", "campaign-choices");
    for (const [key, name, text] of [["cash", "补充资金", `获得 ${cash(C.economy.supplyCash)}哈夫币`], ["repair", "休整接应", "恢复 25 点行动完整度，上限 100"], ["relic", "藏品素材箱", "快递送达一件紫色藏品"], ["gear", "防具补给", "快递送达一件随机防具"]]) {
      const el = button("", () => { tab = "prep"; commit({ type: "supply", choice: key }); }, "doctrine-choice", key === "repair" && run.integrity === 100);
      el.append(n("strong", "", name), n("span", "", text)); choices.append(el);
    }
    host.append(choices);
  }
  function challengeRewards(key) {
    const reward = C.challengeReward(run, key);
    return [`${cash(reward.coins)} 哈夫币`, ...reward.relics.map(key => C.relics[key].name)];
  }
  function renderChallenge() {
    host.append(title("补给通道封锁", "高难挑战 · 选择一项"));
    const actions = n("div", "campaign-actions");
    actions.append(button(run.challengeDraft.refreshes ? "免费刷新 · 剩余 1 次" : "刷新已用完", () => commit({ type: "refreshChallenge" }), "", !run.challengeDraft.refreshes)); host.append(actions);
    const grid = n("div", "challenge-cards");
    for (const key of run.challengeDraft.offers) {
      const data = C.challenges[key], reward = C.challengeReward(run, key), card = n("article", "challenge-card");
      card.dataset.risk = data.level === "极危" ? "extreme" : "high";
      const encounter = C.encounter(run, C.nodes[run.node], key);
      const header = n("div", "challenge-card-heading"); header.append(tacticIcon(data.icon), n("small", "", `${data.level} · ${encounter.enemyWaves ? `${encounter.enemyWaves.length} 波 · ${encounter.enemyWaves.flat().length}` : encounter.enemies.length} 名敌军`));
      card.append(header, n("h3", "", data.name), n("p", "challenge-modifiers", data.effect));
      card.append(n("p", "challenge-stakes", `失利扣除 ${reward.loss} 点完整度，存活则继续补给。`));
      const rewards = n("div", "challenge-rewards"); rewards.append(n("strong", "", "胜利额外奖励"));
      const list = n("ul"); for (const text of challengeRewards(key)) list.append(n("li", "", text)); rewards.append(list);
      card.append(rewards, button("接受挑战 · 前往整备", () => { tab = "prep"; commit({ type: "chooseChallenge", key }); }, "primary")); grid.append(card);
    }
    host.append(grid);
  }
  function renderTacticalSupply() {
    const draft = run.tacticalDraft;
    if (!draft.offers.some(offer => offer.uid === tacticalSelection)) tacticalSelection = null;
    host.append(title("战术补给", "首领战前增援 · 免费五选一"));
    host.append(button(`备战席 ${C.Cards.bench(run).length}/${C.Cards.limit} · 管理卡牌`,manageCards,'oc-bench-note'));
    const grid = n("div", "tactical-draft");
    for (const offer of draft.offers) {
      const operator = Core.units[offer.operator], gear = Core.equipment[offer.gear], copies = run.copies[offer.operator];
      const card = n("article", "tactical-candidate"); card.dataset.selected = String(offer.uid === tacticalSelection); card.dataset.quality = operator.quality;
      const portrait = n("img", "tactical-portrait"); portrait.src = operator.portrait; portrait.alt = operator.name;
      card.append(portrait, n("h3", "", operator.name), n("small", "recruit-cost", `${operator.cost}费 · ${Core.rearPassives[offer.operator].role}`));
      const space=C.recruitSpace(run,offer.operator);
      const status = copies >= 9 ? `已满星 · 档案折现 ${cash(C.recruitCost(offer.operator))}` : !space.allowed ? '备战席已满 · 请先管理卡牌' : space.upgrades.length ? '接收后自动合成升星' : space.auto ? '新干员 · 自动上阵' : '新增一张卡牌 · 占用 1 格备战席';
      card.append(n("p", "draft-roster-status", status));
      const equipment = n("div", "draft-equipment"), icon = n("img");
      icon.src = `assets/haff-war/equip-${gear.slot === "helmet" ? "helmet" : gear.slot === "armor" ? "vest" : ["mp5", "bison", "uzi"].includes(offer.gear) ? "smg" : "rifle"}.svg`; icon.alt = "";
      equipment.append(icon, n("strong", "", gear.name), n("small", "", `${{ blue: "蓝", purple: "紫", gold: "金" }[gear.quality]}品质 · ${Core.equipmentSlots[gear.slot]}`));
      card.append(equipment, n("p", "draft-gear-stats", gearSummary(gear)));
      const select = button(offer.uid === tacticalSelection ? "已选定" : "选择增援", () => { tacticalSelection = offer.uid; render(); });
      select.setAttribute("aria-pressed", String(offer.uid === tacticalSelection)); select.setAttribute("aria-label", `选择${operator.name}，携带${gear.name}`);
      card.append(select); grid.append(card);
    }
    host.append(grid);
    const offer = draft.offers.find(item => item.uid === tacticalSelection), actions = n("div", "campaign-actions");
    actions.append(button(offer ? `确认接收${Core.units[offer.operator].name} · 前往首领备战` : "请选定一名增援干员", () => { tab = "prep"; commit({ type: "chooseTactical", uid: tacticalSelection }); }, "primary", !offer||run.copies[offer.operator]<9&&!C.recruitSpace(run,offer.operator).allowed));
    if (offer && run.inventory.some(item => item.owner === offer.operator && C.itemSlot(item) === Core.equipment[offer.gear].slot)) actions.append(n("span", "", "替换下来的装备将退回库存"));
    host.append(actions);
  }
  function renderEmergencyFunding() {
    host.append(button(run.bloodNodes.includes(run.node) ? "本节点已垫资" : "应急垫资 · 完整度 −15 / 哈夫币 +5 万", () => ask("消耗 15 点行动完整度，获得 5 万哈夫币？这会降低后续战败的承受次数。", () => commit({ type: "blood" })), "danger-command", run.bloodNodes.includes(run.node) || run.integrity <= 15));
  }
  function renderRoute() {
    const current = C.nodes[run.node];
    const page = choicePage("选择下一站", `${C.planes[current.plane].name}${run.branchDraft?' · 随机三选一 · 本次选项已锁定':''}`);
    const choices = n("div", "route-choice-grid");
    for (const next of C.routeChoices(run)) {
      const target = C.nodes[next];
      const card = button("", () => { tab = "prep"; commit({ type: "route", node: next }); }, "route-choice-card");
      card.dataset.easter=String(!!target.easter);
      card.append(tacticIcon(target.easter?'package':nodeIcons[target.kind]), n("small", "", target.easter?'彩蛋战斗 · 藏品搜寻':nodeLabels[target.kind]), n("h3", "", target.name), n("p", "", target.note), n("strong", "", "前往此处")); choices.append(card);
    }
    page.append(choices);
  }
  function renderEnd() {
    const extracted = run.outcome === "extracted";
    host.append(title(extracted ? "撤离成功 · 战利品已带出" : "行动结束 · 突破失败", extracted ? "三个位面防线已突破" : run.integrity ? "最终首领未被击败" : "行动完整度耗尽"));
    const award = profile.awards[run.id];
    if (award) {
      const before = Career.progress(award.beforeXp), after = Career.progress(award.afterXp), band = n("section", "career-result");
      band.append(n("strong", "career-points", `+${award.points} 积分`), n("span", "", after.level > before.level ? `等级提升！Lv.${before.level} → Lv.${after.level}` : `行动等级 Lv.${after.level}`), careerBadge());
      const detail = award.breakdown;
      if (detail) band.append(n("small", "career-breakdown", `行动 ${detail.base} + 胜场 ${detail.victories} + 击败敌人 ${detail.kills} + 首领 ${detail.bosses}${extracted ? "" : "，失利按 50% 结算"}`));
      if (detail?.rankMultiplier > 1) band.append(n("small", "career-breakdown", `职级经验加成 +${Math.round((detail.rankMultiplier - 1) * 100)}%`));
      host.append(band);
      host.append(window.HaffCareerUI.result(profile, award));
      host.append(window.HaffLinkUI.result(profile, award, openLinks));
    }
    const participants = C.operators.filter(id => run.combatStats[id].battles > 0).sort((a, b) => run.combatStats[b].damage - run.combatStats[a].damage);
    const totalDamage = participants.reduce((sum, id) => sum + run.combatStats[id].damage, 0);
    const maxDamage = Math.max(1, ...participants.map(id => run.combatStats[id].damage));
    host.append(title("整局伤害统计", `累计伤害 ${totalDamage.toLocaleString("zh-CN")}`));
    const chart = n("ol", "campaign-damage-chart");
    for (const id of participants) {
      const data = run.combatStats[id], row = n("li", "campaign-damage-row"), portrait = n("img"), body = n("div", "campaign-damage-body"), label = n("div", "campaign-damage-label");
      portrait.src = Core.units[id].portrait; portrait.alt = "";
      label.append(n("strong", "", Core.units[id].name), n("span", "", `${data.damage.toLocaleString("zh-CN")} · ${totalDamage ? (data.damage / totalDamage * 100).toFixed(1) : "0"}%`));
      const track = n("div", "campaign-damage-track"), fill = n("div", "campaign-damage-fill");
      track.setAttribute("aria-hidden", "true"); fill.style.width = `${data.damage / maxDamage * 100}%`; track.append(fill);
      body.append(label, track, n("small", "", `参战 ${data.battles} 场 · 治疗 ${data.healing.toLocaleString("zh-CN")}`)); row.append(portrait, body); chart.append(row);
    }
    host.append(chart);
    if (run.combatStatsPartial) host.append(n("p", "campaign-footnote", "旧存档未记录的伤害无法追溯，以上仅统计更新后的已结算战斗。"));
    else if (!participants.length) host.append(n("p", "campaign-footnote", "暂无已结算的战斗记录。"));
    const deliveries = run.parcels.filter(parcel => !parcel.opened);
    if (deliveries.length) {
      host.append(title("待签收快递", `${deliveries.length} 箱`));
      const actions = n("div", "campaign-actions");
      for (const parcel of deliveries) actions.append(button(`打开 · ${parcel.label}`, () => { commit({ type: "openParcel", uid: parcel.uid }); Battle.showParcelReceipt(run.lastParcel); }));
      host.append(actions);
    }
    const stats = n("div", "reward-receipt");
    const collectionValue = run.inventory.reduce((sum, item) => sum + C.salePrice(run, item), 0);
    stats.append(stat("累计回收收入", cash(run.revenue)), stat("累计投入", cash(run.spent)), stat("剩余哈夫币", cash(run.coins)), stat(extracted ? "带出物资估值" : "未带出物资估值", cash(collectionValue))); host.append(stats);
    host.append(title("行动记录", `累计击败 ${run.kills} 名敌人`));
    const list = n("ol", "campaign-history");
    for (const entry of run.history) list.append(n("li", "", `${entry.name || C.nodes[entry.node].name} · ${entry.supply ? "完成补给 / 交易" : entry.won ? "突破成功" : "突破失败"}${entry.income ? ` · 收入 ${cash(entry.income)}` : ""}`));
    host.append(list, button("开始新行动", () => { run = null; checkpoint = null; careerRankChoice = null; notice = ""; save(); render(); }, "primary"), n("p", "campaign-footnote", "行动等级、职级与永久训练保存在当前浏览器，跨局保留；哈夫币、阵容与装备每局重置。"));
  }
  function render() {
    window.HaffBuildcraftUI?.layout(!training && !!run && run.phase === "prep");
    document.body.classList.toggle("campaign-choosing", !training && !!run && ["opening", "tactic", "route", "supply", "challenge", "tactical"].includes(run.phase));
    window.HaffPageMotion?.enter({
      key: training ? "training" : !run ? "setup" : `${run.id}:${run.node}:${run.phase}:${tab}`,
      label: training ? "自由训练" : !run ? "行动待命" : run.phase === "prep" ? (tab === "shop" ? "干员招募" : "作战整备") : ({ opening: "行动协议", finance: "备战理财", combat: "继续交战", loot: "战后回收", route: "下一站部署", market: "黑市交易", supply: "物资搜刮", tactical: "战术增援", ended: "行动总览" }[run.phase] || "作战整备")
    });
    Battle.hide(); host.hidden = false; host.replaceChildren(); renderNotice();
    if (training) {
      host.append(button("返回行动模式", () => { training = false; render(); })); Battle.training(); return;
    }
    if (!run) { renderSetup(); return; }
    renderHeader();
    if (run.phase === "combat") {
      host.append(button("继续未完成的交战", () => Battle.launch(context()), "primary")); return;
    }
    if (run.phase === "opening") renderOpening();
    else if (run.phase === "tactic") renderTacticDecision();
    else if (run.phase === "route") renderRoute();
    else if (run.phase === "challenge") renderChallenge();
    else if (run.phase === "supply") renderSupply();
    else if (run.phase === "tactical") renderTacticalSupply();
    else if (run.phase === "ended") renderEnd();
    else if (run.phase === "market") {
      if (tab === "prep") tab = "shop";
      if(!run.blackMarket){C.command(run,{type:'prepareMarket'});save();}
      host.append(window.HaffBlackMarketUI.render(run,C,commit));
      const recruits=n('section','hbm-recruits');recruits.setAttribute('aria-label','黑市折价干员');renderShop(recruits);host.append(recruits);
      renderEmergencyFunding();
      host.append(button("完成交易 · 返回备战", () => { tab = "prep"; commit({ type: "leaveMarket" }); }, "primary"));
    }
    else {
      tab = "prep";
      Battle.prepare(context());
      $("view-phase").textContent = `位面 ${C.nodes[run.node].plane + 1} / ${C.planes[C.nodes[run.node].plane].name}`;
      const dock = n("section", "hbc-shop"); dock.id = "hbc-shop"; dock.setAttribute("aria-label", "同屏干员招募");
      renderShop(dock); window.HaffBuildcraftUI.mountShop(dock);
    }
  }
  try {
    const stored = window.localStorage.getItem(saveKey);
    if (stored) {
      const envelope = JSON.parse(stored);
      try { profile = Career.restore(envelope.profile); }
      catch (_) { notice = "行动等级记录损坏，等级已重置，本局进度仍会尝试恢复。"; }
      if (envelope.run) {
        run = C.restore(envelope.run);
        if (run.phase === "combat") {
          try {
            checkpoint = C.restoreCheckpoint(run, envelope.checkpoint);
          } catch (_) {
            run.phase = "prep";
            checkpoint = null;
            notice = "上次交战快照缺失，已回到整备，可从当前阵容重新部署。";
          }
        } else checkpoint = null;
        if (run.phase === "ended") Career.award(profile, run);
        save();
        if (run.migrated) { notice = "原有干员、装备与资金已保留，旧交战已返回备战，新行动采用三位面路线。"; delete run.migrated; save(); }
      }
    }
  } catch (_) { run = null; checkpoint = null; notice = "旧进度无法读取，可以重新开始行动。"; }
  render();
})();
