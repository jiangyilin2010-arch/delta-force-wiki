(function () {
  "use strict";
  const Core = window.HaffWar;
  const needleSpec = Core.units.stinger.skills.find(skill => skill.ammo).ammo;
  const assetUrl = value => {
    if (typeof value !== "string") return value;
    if (value.startsWith("blob:") || value.startsWith("data:") || /^[a-z]+:\/\//i.test(value)) return value;
    try {
      return new URL(value, document.baseURI).href;
    } catch {
      return value;
    }
  };
  const phaserAsset = value => {
    if (typeof value !== "string") return value;
    if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("blob:") || value.startsWith("data:")) return value;
    return value;
  };
  const $ = id => document.getElementById(id);
  let formation = ["uluru", "vyron", "stinger"];
  let trainingPositions = Core.defaultPositions(formation);
  let draggedOperator = null;
  let draggedCardUid = null;
  let equipmentDetails = false;
  let loadouts = JSON.parse(JSON.stringify(Core.defaultLoadouts));
  let battle = Core.createBattle(formation, "normal", loadouts, { timeline: true });
  let display = Core.snapshot(battle);
  let scene = null;
  let game = null;
  let resize = null;
  let prepOperator = "stinger";
  let prepSlot = "weapon";
  let prepTab = "gear";
  let candidateId = loadouts.stinger.weapon;
  let resumeAfterDialog = false;
  let draggedItemId = null;
  let draggedItemOwner = null;
  let campaign = null;
  let loaded = false;
  let started = false;
  let playing = false;
  let mode = "manual";
  let speed = 1;
  let awaiting = null;
  let selectedAction = null;
  let selectedTarget = null;
  let committed = null;
  let pendingRelic = null;
  let cycle = null;
  let selectedId = null;
  let soundEnabled = false;
  let audio = null;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const duration = 920;
  function node(tag, cls, text) {
    const result = document.createElement(tag);
    if (cls) result.className = cls;
    if (text !== undefined) result.textContent = text;
    return result;
  }
  function portraitNode(data, label = "") {
    const portrait = node("span", "portrait");
    const [width, height] = data.art.size;
    const [x, y, w, h] = data.art.crop;
    portrait.style.backgroundImage = `url("${assetUrl(data.portrait)}")`;
    portrait.style.backgroundSize = `${width / w * 100}% ${height / h * 100}%`;
    portrait.style.backgroundPosition = `${x / (width - w) * 100}% ${height === h ? 0 : y / (height - h) * 100}%`;
    if (label) { portrait.setAttribute("role", "img"); portrait.setAttribute("aria-label", label); }
    else portrait.setAttribute("aria-hidden", "true");
    return portrait;
  }
  function sound(kind, rifleProfile) {
    if (!soundEnabled) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === "suspended") void audio.resume();
      if (rifleProfile && window.HaffRifleActions) { window.HaffRifleActions.shotSound(audio, rifleProfile); return; }
      const gain = audio.createGain();
      const osc = audio.createOscillator();
      const soft = ["heal", "smoke", "revive", "cover"].includes(kind);
      osc.type = soft ? "sine" : "triangle";
      osc.frequency.setValueAtTime(soft ? 520 : kind === "missile" ? 130 : 230, audio.currentTime);
      osc.frequency.exponentialRampToValueAtTime(soft ? 780 : 45, audio.currentTime + 0.13);
      gain.gain.setValueAtTime(0.045, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.17);
      osc.connect(gain); gain.connect(audio.destination);
      osc.start(); osc.stop(audio.currentTime + 0.18);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    } catch (_) { soundEnabled = false; $("sound").textContent = "音效不可用"; $("sound").setAttribute("aria-pressed", "false"); }
  }
  const positions = () => campaign ? campaign.positions() : trainingPositions;
  function equipmentIcon(id, slot) {
    const item = Core.equipment[id];
    const kind = slot === "helmet" ? "helmet" : slot === "armor" ? "vest" : ["mp5", "bison", "uzi"].includes(id) ? "smg" : "rifle";
    const img = node("img", "equipment-icon"); img.src = assetUrl(`assets/haff-war/equip-${kind}.svg`); img.alt = ""; img.draggable = false;
    if (!item) img.className += " empty-icon";
    return img;
  }
  function inspectEquipment(id, owner = prepOperator, slot = Core.equipment[id]?.slot || prepSlot) {
    if (started) return;
    prepOperator = owner; prepSlot = slot; prepTab = "gear"; candidateId = id; equipmentDetails = true; renderSquad(false);
  }
  function bindItemDrag(element, id, owner = null) {
    element.draggable = !started && !!id;
    element.addEventListener("dragstart", event => {
      if (started || !id) { event.preventDefault(); return; }
      event.stopPropagation(); draggedOperator = null; draggedItemId = id; draggedItemOwner = owner;
      event.dataTransfer.setData("application/x-haff-equipment", id); event.dataTransfer.effectAllowed = campaign ? "move" : "copy";
      $("prep-view").classList.toggle("gear-dragging", true);
    });
    element.addEventListener("dragend", endEquipmentDrag);
  }
  function operatorPiece(id, card = null) {
    const data = Core.units[id], piece = node("article", "operator-piece");
    piece.dataset.quality = data.quality;
    piece.dataset.operator = id;
    piece.dataset.selected = String(!card && id === prepOperator);
    if(card)piece.dataset.cardUid=card.uid;
    const button = node("button", "roster-member"); button.type = "button"; button.dataset.roster = id; button.disabled = started;
    button.setAttribute("aria-pressed", String(!card && id === prepOperator));
    button.setAttribute("aria-label", `${data.name}，${data.role}，${positions()[id] === undefined ? "备战席" : Core.boardSlots[positions()[id]]}`);
    button.title=`${data.name} · ${data.role}${campaign?` · ${campaign.status(id)}`:''}`;
    if(card){button.title=`${data.name} · ${card.stars} 星 · 备战卡牌`;button.setAttribute('aria-label',button.title+'，点击管理或拖动上阵');}
    const img = node("img", "operator-avatar"); img.src = assetUrl(data.portrait); img.alt = data.name; img.draggable = false;
    const copy = node("span", "roster-copy"); copy.append(node("strong", "", data.name), node("small", "", campaign ? `${data.cost}费 · ${campaign.status(id)}` : data.role));
    copy.title = `${data.name} · ${data.cost}费 · 招募价 ${data.cost}万哈夫币`;
    button.append(img); if (!campaign) button.append(copy); button.draggable = !started;
    button.addEventListener("click", () => { if (started) return; if(card){campaign.inspectCard(card.uid);return;}prepOperator = id; candidateId = loadouts[id][prepSlot]; equipmentDetails = false; renderSquad(false); });
    button.addEventListener("dragstart", event => {
      if (started) { event.preventDefault(); return; }
      draggedOperator = id; draggedCardUid=card?.uid||null; draggedItemId = null; event.dataTransfer.setData("application/x-haff-operator", id); event.dataTransfer.effectAllowed = "move";
      window.HaffPrepDecisions?.beginDrag({id,uid:draggedCardUid,onEnd:()=>{draggedOperator=null;draggedCardUid=null;$('prep-view').classList.toggle('operator-dragging',false);}});
      $("prep-view").classList.toggle("operator-dragging", true);
    });
    button.addEventListener("dragend", () => { draggedOperator = null; draggedCardUid=null;window.HaffPrepDecisions?.endDrag(); $("prep-view").classList.toggle("operator-dragging", false); });
    if(card){piece.append(button,node('span','oc-card-stars','★'.repeat(card.stars)));return piece;}
    if (campaign) {
      const names = node("div", "operator-namebar"), relicSlots = node("div", "operator-relic-slots");
      for (const slot of ["relic", "relic2", "relic3"]) relicSlots.append(campaign.itemSlotButton(id, slot));
      names.append(copy, relicSlots);
      const worn = node("div", "worn-equipment");
      for (const slot of Object.keys(Core.equipmentSlots)) worn.append(campaign.itemSlotButton(id, slot));
      const stars=node('span','seat-stars','★'.repeat(campaign.stars(id)));stars.setAttribute('aria-hidden','true');
      piece.append(button, names, worn, stars); return piece;
    }
    const worn = node("div", "worn-equipment");
    for (const [slot, label] of Object.entries(Core.equipmentSlots)) {
      const key = loadouts[id][slot], item = Core.equipment[key];
      const icon = node("button", "worn-icon"); icon.type = "button"; icon.disabled = started;
      icon.dataset.worn = key || ""; icon.dataset.owner = id; icon.dataset.quality = item?.quality || "none";
      icon.title = item?.name || `${label}空槽`; icon.setAttribute("aria-label", `${data.name}：${icon.title}`);
      icon.append(equipmentIcon(key, slot)); bindEquipmentDrop(icon, id, slot); bindItemDrag(icon, key, id);
      if (item) icon.setAttribute("aria-haspopup", "dialog");
      icon.addEventListener("click", () => { const rect=icon.getBoundingClientRect();inspectEquipment(key, id, slot);if(item)window.HaffLoadoutGuideUI?.showItem({kind:"gear",key},icon,{rect,status:`${data.name} · 已穿戴 · ${label}`}); }); worn.append(icon);
    }
    piece.append(button, worn); return piece;
  }
  function formationCell(slot, id, bench = false, card = null) {
    const cell = node("div", `formation-cell${bench ? " bench-cell" : ""}`);
    cell.dataset.position = bench ? "bench" : String(slot);
    const index = node("button", "cell-index", bench ? String(slot + 1).padStart(2, "0") : Core.boardSlots[slot]);
    index.type = "button"; index.disabled = started;
    index.title = `将${Core.units[prepOperator].name}${bench ? "移至备战席" : `移至${Core.boardSlots[slot]}`}`;
    index.setAttribute("aria-label", index.title);
    index.addEventListener("click", () => swapTo(prepOperator, bench ? null : slot)); cell.append(index);
    if (id) { cell.append(operatorPiece(id,card)); if(!card)bindEquipmentDrop(cell, id); }
    else {
      const empty = node("button", "empty-position", "+"); empty.type = "button"; empty.disabled = started;
      empty.setAttribute("aria-label", bench ? "移至备战席" : `部署到${Core.boardSlots[slot]}`);
      empty.addEventListener("click", () => swapTo(prepOperator, bench ? null : slot)); cell.append(empty);
    }
    cell.addEventListener("dragover", event => { if (!started && draggedOperator) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; cell.classList.toggle("drop-ready", true);if(bench&&card&&positions()[draggedOperator]!==undefined)campaign?.previewPlace?.(card.id,positions()[draggedOperator],card.uid);else campaign?.previewPlace?.(draggedOperator,bench?null:slot,draggedCardUid); } });
    cell.addEventListener("dragleave", event => { if (!cell.contains(event.relatedTarget)){cell.classList.toggle("drop-ready", false);window.HaffPrepDecisions?.clear();} });
    cell.addEventListener("drop", event => {
      if (started || !draggedOperator) return;
      event.preventDefault(); event.stopPropagation(); const operator = draggedOperator,uid=draggedCardUid; draggedOperator = null;draggedCardUid=null;
      window.HaffPrepDecisions?.endDrag();
      $("prep-view").classList.toggle("operator-dragging", false);
      if(bench&&card&&positions()[operator]!==undefined)swapTo(card.id,positions()[operator],card.uid);
      else if(!bench||!uid)swapTo(operator, bench ? null : slot,uid);
    });
    return cell;
  }
  function renderFormation() {
    const current = positions(), active = Object.keys(current);
    $("board-count").textContent = `上阵 ${active.length} / ${campaign ? campaign.capacity() : 3} · 前台 ${active.filter(id => Core.Formation.frontSlot(current[id])).length} / 后台 ${active.filter(id => current[id] >= Core.Formation.frontCount).length}`;
    const cells = Core.boardSlots.map((_, slot) => formationCell(slot, active.find(id => current[id] === slot)));
    $("squad").replaceChildren(...cells.slice(0, Core.Formation.frontCount)); $("rear-squad").replaceChildren(...cells.slice(Core.Formation.frontCount));
    const physical=campaign?.benchCards?.();
    const bench = physical || formation.filter(id => current[id] === undefined && (!campaign || campaign.owns(id)));
    const benchSize = Math.max(Core.Formation.benchSize, bench.length);
    $("bench-count").textContent = `${bench.length} / ${campaign?Core.Formation.benchSize:benchSize}${bench.length>Core.Formation.benchSize?' · 超额待整理':' 待命'}`;
    $("bench-count").classList.toggle('oc-capacity-full',!!campaign&&bench.length>=Core.Formation.benchSize);
    $("bench-squad").replaceChildren(...Array.from({ length: benchSize }, (_, index) => physical?formationCell(index,bench[index]?.id,true,bench[index]):formationCell(index,bench[index],true)));
    $("bench-terminal").hidden = !campaign;
    $("bench-with-terminal").classList.toggle("training-bench", !campaign);
    if (campaign) {
      const terminal = campaign.terminal();
      $("terminal-level").textContent = `Lv.${terminal.rank}`;
      $("terminal-capacity").textContent = `上阵 ${active.length} / ${campaign.capacity()} 人`;
      $("terminal-next").textContent = terminal.price === null ? `人数上限 ${Core.Formation.total} 人` : `下一级 ${campaign.capacity() + 1} 人`;
      $("terminal-price").textContent = terminal.price === null ? "终端已满级" : `${terminal.price / 10000} 万哈夫币`;
      $("terminal-upgrade").textContent = terminal.price === null ? "已满级" : "升级终端";
      $("terminal-upgrade").disabled = started || !terminal.canUpgrade;
      let odds = $("terminal-odds");
      if (!odds) { odds = node("div", "terminal-odds"); odds.id = "terminal-odds"; $("terminal-next").after(odds); }
      odds.replaceChildren(...[3, 4, 5].map(cost => {
        const rate = node("span", "recruit-rate", `${Math.round(terminal.odds[cost] * 100)}%`);
        rate.dataset.quality = { 3: "purple", 4: "gold", 5: "red" }[cost];
        rate.title = `${cost}费招募概率${terminal.nextOdds ? `，升级后 ${Math.round(terminal.nextOdds[cost] * 100)}%` : "，已满级"}`;
        rate.setAttribute("aria-label", rate.title); return rate;
      }));
      $("terminal-upgrade").title = terminal.nextOdds ? `升级后：${[3, 4, 5].map(cost => `${cost}费 ${Math.round(terminal.nextOdds[cost] * 100)}%`).join(" / ")}，下次刷新生效` : "终端已满级";
    }
    renderParcels();
    $("prep-tactics").hidden = !campaign;
    $("prep-synergies").hidden = !campaign;
    if (campaign) campaign.renderPrepExtras();
  }
  function showParcelReceipt(value = null) {
    const receipt = value?.items ? value : campaign?.lastParcel(); if (!receipt) return;
    $("parcel-title").textContent = `${receipt.label} · 已签收`;
    $("parcel-cash").textContent = `+ ${receipt.coins / 10000} 万哈夫币`;
    $("parcel-items").replaceChildren(...receipt.items.map((item, index) => {
      const data = window.HaffCampaign.itemInfo(item);
      const entry = node("div", "parcel-item"); entry.dataset.quality = data.quality; entry.style.setProperty("--reveal-delay", `${index * 70}ms`);
      const icon = equipmentIcon(item.key, data.slot || (item.key === "optic" ? "helmet" : item.key === "plate" ? "armor" : "weapon"));
      if (item.kind === "relic") { icon.src = data.image; icon.classList.add("relic-art"); }
      entry.append(icon, node("strong", "", data.name), node("small", "", item.kind === "component" ? "一级配件" : item.kind === "relic" ? "藏品" : Core.equipmentSlots[data.slot]));
      if (item.kind === "relic") entry.append(node("p", "parcel-relic-effect", data.effect));
      if (data.quality === "red") { entry.classList.add("precious-loot"); entry.append(node("p", "parcel-relic-story", data.story)); }
      if (data.supreme) {
        entry.dataset.supreme = item.key;
        entry.append(node("strong", "supreme-value", `至臻藏品 · 基础售价 ${data.sell.toLocaleString("zh-CN")} 哈夫币`));
      }
      return entry;
    }));
    for (const [key,label] of [['duplicate','干员复制器'],['reforge','藏品重铸器']]) {
      if (!receipt.tools?.[key]) continue;
      const entry = node('div','parcel-item'); entry.dataset.quality='red';
      entry.append(node('strong','',label),node('p','parcel-relic-effect',`× ${receipt.tools[key]}`),node('small','','已加入道具栏'));
      $('parcel-items').append(entry);
    }
    $("parcel-dialog").showModal(); $("parcel-close").focus();
  }
  function renderParcels() {
    const station = $("parcel-station"); station.hidden = !campaign;
    $("deployment-with-parcels").classList.toggle("training-deployment", !campaign);
    station.replaceChildren(); if (!campaign) return;
    const parcels = campaign.parcels();
    station.append(node("span", "eyebrow", "G.T.I. 快递"), node("strong", "parcel-count", parcels.length ? `${parcels.length} 箱待签收` : "暂无待收快递"));
    if(parcels.length){const all=node('button','parcel-history','✓');all.type='button';all.disabled=started;all.title='一键签收全部快递';all.setAttribute('aria-label',all.title);all.onclick=()=>{if(!started&&campaign.openAllParcels?.())showParcelReceipt();};station.append(all);}
    for (const parcel of parcels) {
      const button = node("button", "parcel-box"); button.type = "button"; button.disabled = started; button.title = `打开${parcel.label}`;
      const box = node("span", "parcel-case"); box.setAttribute("aria-hidden", "true"); box.append(node("i", "case-lid"), node("i", "case-lock"), node("span", "case-stamp", "G.T.I."));
      button.append(box, node("strong", "", parcel.label), node("small", "", "打开快递"));
      button.addEventListener("click", () => { if (started || button.disabled) return; button.disabled = true; campaign.openParcel(parcel.uid); showParcelReceipt(); });
      station.append(button);
    }
    if (campaign.lastParcel()) {
      const receipt = node("button", "parcel-history", "最近签收清单"); receipt.type = "button"; receipt.addEventListener("click", showParcelReceipt); station.append(receipt);
    }
  }
  function renderSquad(rebuildFormation = true) {
    $("mission-name").textContent = campaign ? campaign.missionName : "零号大坝 · 控制权争夺";
    $("mission-enemies").textContent = campaign ? campaign.enemyNames : "赛伊德 / 机枪兵 / 盾兵";
    $("mission-team").textContent = `${Object.keys(positions()).length} 人出战`;
    $("roster-count").textContent = campaign ? `${campaign.recruitedCount()} / ${Core.operatorIds.length}` : "3 / 3";
    const armoryScroll = $("gear-candidates").scrollTop || 0;
    const quality = { green: "绿", blue: "蓝", purple: "紫", gold: "金" };
    if (rebuildFormation) renderFormation();
    else document.querySelectorAll('[data-roster]').forEach(button => { const selected=button.dataset.roster===prepOperator;button.setAttribute('aria-pressed',String(selected));const piece=button.closest('.operator-piece');if(piece)piece.dataset.selected=String(selected); });
    const data = Core.units[prepOperator], equipped = campaign ? campaign.stats(prepOperator) : Core.loadoutStats(prepOperator, loadouts[prepOperator]);
    const legend = Core.isLegendary({...data,...equipped}) && Core.Buildcraft.legendary[prepOperator];
    $("prep-name").textContent = data.name;
    $("prep-art").dataset.operator = prepOperator;
    $("prep-role").textContent = `${data.role} / ${Core.rearPassives[prepOperator].role}${data.portraitNote ? ` / ${data.portraitNote}` : ""}`;
    $("prep-callsign").textContent = `${prepOperator.toUpperCase()} / ${equipped.weapon}`;
    $("prep-resource").textContent = `${prepOperator === "stinger" ? `激素针 ${needleSpec.capacity} / ${needleSpec.capacity}` : `初始能量 ${legend ? 100 : Math.min(100, 20 + equipped.initialEnergy)} / 100`} · 充能效率 ${100 + equipped.chargeEfficiency}%${equipped.cooldownReduction ? " · 战术冷却 −1" : ""}`;
    $("prep-position").value = positions()[prepOperator] === undefined ? "bench" : String(positions()[prepOperator]);
    $("prep-position").disabled = started;
    const artwork = node("img"); artwork.src = assetUrl(data.portrait); artwork.alt = `${data.name}干员立绘`;
    if ($("prep-art").firstElementChild?.src !== artwork.src) $("prep-art").replaceChildren(artwork);
    $("prep-stats").replaceChildren(...Object.entries({ hp: "生命", attack: "攻击", armor: "防护", speed: "速度" }).map(([key, name]) => {
      const stat = node("div", "prep-stat");
      const bonus = equipped[key] - data[key];
      stat.append(node("span", "", name), node("strong", "", equipped[key]), node("small", bonus < 0 ? "stat-down" : "stat-up", bonus ? `${campaign ? "总加成" : "装备"} ${bonus > 0 ? "+" : ""}${bonus}` : "基础属性"));
      return stat;
    }));
    $("gear-slots").replaceChildren(...Object.entries(Core.equipmentSlots).map(([slot, name]) => {
      const item = Core.equipment[loadouts[prepOperator][slot]];
      const button = node("button", "equipment-slot"); button.type = "button"; button.disabled = started;
      button.dataset.slot = slot; button.dataset.quality = item?.quality || "none";
      button.setAttribute("aria-pressed", String(slot === prepSlot));
      button.title = item?.name || `${name}空槽`; button.setAttribute("aria-label", button.title);
      button.append(equipmentIcon(loadouts[prepOperator][slot], slot), node("small", "", name));
      bindEquipmentDrop(button, prepOperator, slot);
      if (item) button.setAttribute("aria-haspopup", "dialog");
      button.addEventListener("click", () => { const rect=button.getBoundingClientRect(),key=loadouts[prepOperator][slot];inspectEquipment(key, prepOperator, slot);if(item)window.HaffLoadoutGuideUI?.showItem({kind:"gear",key},document.querySelector(`#gear-slots [data-slot="${slot}"]`),{rect,status:`${data.name} · 已穿戴 · ${name}`}); });
      return button;
    }));
    $("gear-slots").hidden = !!campaign;
    const options = Object.entries(Core.equipment).filter(([id]) => !campaign || campaign.availableGear().includes(id));
    $("armory-title").textContent = "装备库存";
    $("armory-count").textContent = `${options.length} 件可选`;
    $("gear-candidates").replaceChildren(...options.map(([id, item]) => {
      const button = node("button", "gear-candidate"); button.type = "button"; button.disabled = started;
      button.draggable = !started;
      button.dataset.item = id; button.dataset.quality = item.quality;
      button.setAttribute("aria-pressed", String(candidateId === id));
      button.title = item.name; button.setAttribute("aria-label", item.name);
      button.append(equipmentIcon(id, item.slot));
      if (campaign) button.append(node("span", "item-state", campaign.gearCount(id)));
      bindItemDrag(button, id);
      button.addEventListener("click", () => inspectEquipment(id));
      return button;
    }));
    const candidate = Core.equipment[candidateId];
    const prospectiveLoadout = { ...loadouts[prepOperator], [prepSlot]: candidateId || null };
    const prospective = campaign ? campaign.stats(prepOperator, prospectiveLoadout) : Core.loadoutStats(prepOperator, prospectiveLoadout);
    const difference = Object.entries({ hp: "生命", attack: "攻击", armor: "防护", speed: "速度" }).filter(([key]) => prospective[key] !== equipped[key]);
    $("gear-preview").replaceChildren(node("strong", "", candidate ? candidate.name : "当前配装"),
      node("span", "", candidateId !== loadouts[prepOperator][prepSlot] ? "候选 · 尚未装备" : "当前已装备"));
    if (candidate) $("gear-preview").append(node("p", "", `${quality[candidate.quality]}色品质 · ${gearSummary(candidate)}`), node("small", "", campaign ? campaign.gearStatus(candidateId) : "训练配装"));
    $("gear-preview").hidden = !equipmentDetails; $("equip-actions").hidden = !equipmentDetails;
    const changes = node("div", "gear-changes");
    difference.forEach(([key, name]) => changes.append(node("span", prospective[key] > equipped[key] ? "stat-up" : "stat-down", `${name} ${equipped[key]} → ${prospective[key]}`)));
    $("gear-preview").append(changes);
    $("equip-item").disabled = started || !candidate || candidateId === loadouts[prepOperator][prepSlot] || !!campaign && !campaign.owns(prepOperator);
    $("equip-item").textContent = candidateId && candidateId === loadouts[prepOperator][prepSlot] ? "已装备" : "确认装备";
    $("unequip-item").disabled = started || !loadouts[prepOperator][prepSlot];
    $("unequip-item").textContent = prepSlot === "weapon" ? "换回制式步枪" : "卸下装备";
    $("restore-loadout").disabled = started;
    $("restore-loadout").hidden = !!campaign;
    $("training-equipment").hidden = !!campaign;
    $("campaign-items").hidden = !campaign;
    $("gear-tab").textContent = campaign ? "装备与藏品" : "武器与防护";
    if (campaign) campaign.renderItemInventory($("campaign-items"), prepOperator);
    $("prep-skills").replaceChildren(...data.skills.map(skill => {
      if (legend && skill.id === legend.action) skill = {...skill,name:`${skill.name} · ${legend.name}`,detail:legend.detail};
      if (legend && prepOperator === 'tempest' && skill.id === 'attack') skill = {...skill,detail:'大招期间九连射，每发 150% 攻击力，击杀自动转火；整组回能一次。翻滚可续接，最多连续三组。'};
      const entry = node("article", "prep-skill");
      entry.append(node("small", "", skill.kind), node("h3", "", skill.name), node("p", "", skill.detail));
      entry.append(node("span", "skill-resource", skill.ammo ? `不占行动 · 推进技能冷却 1 次 · 初始 ${skill.ammo.capacity} 根 · 基础 ${skill.ammo.rechargeRounds} 轮补针` : skill.ultimate ? "不占行动 · 100 充能 · 推进技能冷却 1 次" : `${skill.freeAction ? "不占行动 · " : ""}冷却 ${Core.skillCooldown(equipped, skill)} 次自身行动${equipped.cooldownReduction && skill.cooldown > 1 ? `（原 ${skill.cooldown} 次）` : ""}`));
      return entry;
    }));
    const passiveActive = positions()[prepOperator] >= Core.Formation.frontCount;
    $("prep-passive").hidden = true;
    const rearSkill = node("article", "prep-skill rear-skill"); rearSkill.dataset.active = String(passiveActive);
    rearSkill.append(node("small", "", `后排被动 · ${passiveActive ? "已激活" : "未激活"}`), node("h3", "", Core.rearPassives[prepOperator].name), node("p", "", Core.rearPassives[prepOperator].detail));
    $("prep-skills").append(rearSkill);
    $("sell-operator").hidden = !campaign;
    $("strip-operator").hidden = !campaign;
    $("strip-operator").disabled = started || (campaign ? !campaign.hasItems(prepOperator) : !Object.values(loadouts[prepOperator]).some(Boolean));
    $("sell-operator").disabled = started || !!campaign && !campaign.canSell(prepOperator);
    if (campaign) $("sell-operator").textContent = `出售当前卡 · ${(campaign.salePrice(prepOperator) / 10000).toLocaleString("zh-CN")} 万`;
    $("gear-panel").hidden = prepTab !== "gear";
    $("skills-panel").hidden = prepTab !== "skills";
    document.querySelectorAll("[data-prep-tab]").forEach(button => {
      const active = button.dataset.prepTab === prepTab;
      button.setAttribute("aria-selected", String(active)); button.tabIndex = active ? 0 : -1;
    });
    const totalHp = Object.keys(positions()).filter(id => Core.Formation.frontSlot(positions()[id])).reduce((sum, id) => sum + (campaign ? campaign.stats(id) : Core.loadoutStats(id, loadouts[id])).hp, 0);
    const pendingEquipment = !campaign && candidateId !== loadouts[prepOperator][prepSlot];
    $("deploy-summary").textContent = `${Object.keys(positions()).length} 名出战 · 前台生命 ${totalHp}${pendingEquipment ? " · 候选装备未穿戴" : ""}`;
    $("start").textContent = campaign && !campaign.canStart() ? "先选择下一站" : pendingEquipment ? "使用当前配装出战" : "部署出战";
    $("start").dataset.bypass = 'false';
    $("start").title = '';
    $("gear-candidates").scrollTop = armoryScroll;
    window.HaffBuildcraftUI?.inspect(prepOperator, campaign?.stars?.(prepOperator) ?? 1, campaign);
    window.HaffLoadoutGuideUI?.render(prepOperator, positions()[prepOperator], campaign?.guideInventory?.());
    window.HaffPageMotion?.panel(document.querySelector(".formation-inspector"), `${prepOperator}:${prepTab}`);
  }
  function refreshEquipment() {
    if (started) return;
    const update = () => {
      if (campaign) loadouts = campaign.loadouts();
      candidateId = loadouts[prepOperator][prepSlot];
      // Roster portraits and board cells keep their identity; only worn slots change.
      if (campaign) for (const card of document.querySelectorAll('.operator-piece')) {
        const id = card.querySelector('[data-roster]')?.dataset.roster;
        if (!id) continue;
        const syncSlots=(host,slots)=>{if(!host)return;slots.forEach((slot,index)=>{const button=campaign.itemSlotButton(id,slot),old=host.children[index];if(old!==button){if(old)old.replaceWith(button);else host.append(button);}});};
        syncSlots(card.querySelector('.worn-equipment'),Object.keys(Core.equipmentSlots));
        syncSlots(card.querySelector('.operator-relic-slots'),['relic','relic2','relic3']);
      }
      renderSquad(!campaign);
      battle = campaign ? campaign.preview() : Core.createBattle(Object.keys(trainingPositions), $('difficulty').value, loadouts, {campaign:true, timeline:true, positions:trainingPositions});
      display = Core.snapshot(battle);
    };
    if (window.HaffPrepStability) window.HaffPrepStability.update(update); else update();
  }
  function endEquipmentDrag() {
    draggedItemId = null;
    draggedItemOwner = null;
    $("prep-view").classList.toggle("gear-dragging", false);
    document.querySelectorAll(".drop-ready,.drop-invalid").forEach(element => {
      element.classList.toggle("drop-ready", false); element.classList.toggle("drop-invalid", false);
    });
  }
  function bindEquipmentDrop(element, operator, slot = null) {
    if (campaign) { campaign.bindInventoryDrop(element, operator, slot); return; }
    element.addEventListener("dragover", event => {
      if (started || !draggedItemId) return;
      event.preventDefault(); event.stopPropagation();
      const valid = !slot || Core.equipment[draggedItemId].slot === slot;
      event.dataTransfer.dropEffect = valid ? campaign ? "move" : "copy" : "none";
      element.classList.toggle("drop-ready", valid); element.classList.toggle("drop-invalid", !valid);
    });
    element.addEventListener("dragleave", event => {
      if (element.contains(event.relatedTarget)) return;
      element.classList.toggle("drop-ready", false); element.classList.toggle("drop-invalid", false);
    });
    element.addEventListener("drop", event => {
      if (started || !draggedItemId) return;
      event.preventDefault(); event.stopPropagation();
      const id = draggedItemId, item = Core.equipment[id], owner = draggedItemOwner;
      endEquipmentDrag();
      if (slot && item.slot !== slot) {
        $("prep-feedback").textContent = `${item.name}不能放入${Core.equipmentSlots[slot]}槽位`; return;
      }
      equip(id, operator, item.slot, owner);
      document.querySelector(`[data-roster="${operator}"]`)?.focus({ preventScroll: true });
    });
  }
  function equip(itemId, operator = prepOperator, slot = prepSlot, sourceOwner = null) {
    if (started) return;
    if (campaign) {
      try { campaign.equip(itemId, operator, slot, sourceOwner); loadouts = campaign.loadouts(); }
      catch (error) { $("prep-feedback").textContent = error.message; return; }
      prepOperator = operator; prepSlot = slot; candidateId = loadouts[operator][slot]; refreshEquipment();
      $("prep-feedback").textContent = `${Core.units[operator].name}配装已更新`;
      return;
    }
    const next = { ...loadouts[operator], [slot]: itemId };
    Core.loadoutStats(operator, next);
    loadouts[operator] = next; prepOperator = operator; prepSlot = slot; candidateId = itemId; refreshEquipment();
    $("prep-feedback").textContent = itemId ? `${Core.units[operator].name}已装备${Core.equipment[itemId].name}` : `${Core.units[operator].name}已卸下${Core.equipmentSlots[slot]}`;
  }
  function gearSummary(item) {
    return Object.entries({ hp: "生命", attack: "攻击", armor: "防护", speed: "速度", chargeEfficiency: "充能效率", initialEnergy: "初始能量" }).filter(([key]) => item[key]).map(([key, name]) => `${name}${item[key] > 0 ? "+" : ""}${item[key]}${key === "chargeEfficiency" ? "%" : ""}`).concat(item.passive ? [item.passive] : []).join(" / ");
  }
  function selectTarget(id) {
    if (!awaiting || !selectedAction || cycle || committed || !playing || mode !== "manual") return;
    const action = Core.availableActions(battle, awaiting).find(item => item.id === selectedAction);
    if (!action?.available || !action.targets.includes(id)) return;
    selectedTarget = id;
    committed = { actor: awaiting, action: selectedAction, target: id };
    renderActions();
  }
  function setBattleMode(nextMode) {
    if (!["manual", "auto"].includes(nextMode)) return;
    mode = nextMode;
    document.querySelectorAll("[data-mode]").forEach(item => item.setAttribute("aria-pressed", String(item.dataset.mode === mode)));
    awaiting = null; selectedAction = null; selectedTarget = null;
    // A submitted command belongs to the next action even if auto takes over now.
    if (mode === "auto" && started && (battle.phase !== "finished" || cycle) && !document.hidden && !document.querySelector("dialog[open]")) {
      playing = true;
      scene?.tweens.resumeAll();
      game?.loop?.wake();
      if (!cycle) $("action-name").textContent = "自动接管中";
    }
    controls(); renderActions();
  }
  function renderActions() {
    const panel = $("action-panel");
    panel.hidden = !started || (battle.phase === "finished" && !cycle);
    const actorId = awaiting || (cycle && Core.units[cycle.event.actor].side === "ally" ? cycle.event.actor : null);
    const actor = display.units.find(unit => unit.id === actorId);
    $("decision-title").textContent = Core.rear(actor) ? `${actor.name} · 后排自动支援` : awaiting ? `${Core.units[awaiting].name} · 行动指令` : mode === "auto" ? "自动指挥" : "行动结算中";
    let stacks = $("action-stacks");
    if (!stacks) {
      stacks = node("div", "hb-action-stacks"); stacks.id = "action-stacks";
      stacks.setAttribute("aria-label", "当前干员装备与藏品叠层");
      stacks.tabIndex = 0;
      panel.querySelector(".decision-heading").append(stacks);
    }
    const stackRows = window.HaffCombatReport?.stacks(actor) || [];
    stacks.hidden = !stackRows.length;
    stacks.replaceChildren(...stackRows.map(item => {
      const chip = node("span", "hb-stack-chip");
      chip.title = `${item.name} · ${item.label} · ${item.bonus}`;
      chip.append(node("span", "", item.name), node("b", "", item.label)); return chip;
    }));
    const supply = actor?.supply;
    $("charge-label").textContent = supply ? `激素针 ${supply.count}/${needleSpec.capacity}${supply.count < needleSpec.capacity ? ` · ${Core.needleRounds(actor)} 轮后补 1 根` : " · 储备充足"}` : actor ? `大招充能 ${actor.energy}/100 · 效率 ${100 + (actor.chargeEfficiency || 0)}%` : "";
    $("charge-meter").max = supply ? 200 : 100;
    $("charge-meter").value = supply ? supply.progress : actor?.energy || 0;
    $("charge-meter").setAttribute("aria-label", supply ? "激素针补充进度" : "大招充能");
    $("charge-meter").hidden = !actor || !!supply && supply.count === needleSpec.capacity;
    $("needle-stock").hidden = !supply;
    $("needle-stock").replaceChildren(...(supply ? Array.from({ length: needleSpec.capacity }, (_, index) => node("i", index < supply.count ? "full" : "empty")) : []));
    const canChoose = !!awaiting && !Core.rear(actor) && mode === "manual" && playing && !cycle && !committed;
    const options = actorId && !Core.rear(actor) ? Core.availableActions(battle, actorId) : [];
    $("skill-options").replaceChildren(...options.map(action => {
      const button = node("button", `skill-option${action.ultimate ? " ultimate" : ""}`);
      button.type = "button"; button.disabled = !canChoose || !action.available;
      button.dataset.action = action.id;
      button.setAttribute("aria-pressed", String(selectedAction === action.id));
      const cost = action.ammo ? `不占行动 · 冷却推进 1 次 · 消耗 1 根针 · ${action.stock}/${action.ammo.capacity}` : action.ultimate ? "不占行动 · 冷却推进 1 次 · 消耗 100 充能" : action.freeAction ? `不占行动 · 基础回能 +35 · 冷却 ${action.effectiveCooldown}` : actor?.supply ? action.id === "attack" ? "主武器射击" : `战术技能 · 冷却 ${action.effectiveCooldown}` : `基础回能 +${action.id === "attack" ? 45 : 35}${action.id === "attack" ? "" : ` · 冷却 ${action.effectiveCooldown}`}`;
      button.append(node("small", "", action.reason || cost), node("strong", "", action.name), node("span", "", action.detail));
      button.addEventListener("click", event => {
        if (!canChoose || committed || cycle || !playing || mode !== "manual") return;
        selectedAction = selectedAction === action.id ? null : action.id; selectedTarget = null; renderActions();
        if (event.detail === 0 && selectedAction) $("target-options").querySelector("button")?.focus({ preventScroll: true });
      }); return button;
    }));
    const chosen = options.find(action => action.id === selectedAction);
    $("target-options").replaceChildren(...(canChoose && chosen ? (chosen.area === "all" ? chosen.targets.slice(0, 1) : chosen.targets).map(id => {
      const target = battle.units.find(unit => unit.id === id);
      const targetLabel = `${chosen.target === 'unit' ? target.side === 'ally' ? '救援 · ' : '压制 · ' : ''}${target.name} ${target.hp}/${target.maxHp}`;
      const button = node("button", "target-option", chosen.area === "all" ? `敌方全体 · ${chosen.targets.length} 人` : chosen.target === "team" ? "己方全队" : targetLabel);
      button.dataset.target = id;
      button.setAttribute("aria-label", chosen.area === "all" ? `对全部 ${chosen.targets.length} 名敌人施放${chosen.name}` : `对${target.name}施放${chosen.name}${chosen.target === "team" ? "（作用于全队）" : ""}`);
      button.title = `${chosen.name} → ${chosen.target === "team" ? "己方全队" : target.name}`;
      button.type = "button"; button.addEventListener("click", () => selectTarget(id)); return button;
    }) : []));
    window.HaffTargetPreview?.bind(Core, battle, actorId, canChoose ? chosen : null, $("target-options"));
    $("confirm-action").disabled = !canChoose || !chosen || !selectedTarget;
    $("cancel-action").disabled = !canChoose || !chosen;
    $("target-row").hidden = !awaiting || mode !== "manual";
    if (scene?.board) {
      scene.clearHighlight();
      if (awaiting) scene.figures.get(awaiting)?.ring.setStrokeStyle(3, 0xf2dc91);
      if (canChoose && chosen?.available) for (const id of chosen.targets) scene.figures.get(id)?.ring.setStrokeStyle(3, 0x84cde5);
      if (selectedTarget) scene.figures.get(selectedTarget)?.ring.setStrokeStyle(3, 0x84cde5);
      window.HaffBattleHUD?.placeTargets(scene, display.units);
    }
  }
  function renderQueue() {
    $("turn-order").replaceChildren(...Core.previewTimeline(battle).map(({ id, wait, support, extra }) => {
      const unit = battle.units.find(item => item.id === id);
      const chip = node("div", `turn-chip ${unit.side === "enemy" ? "enemy" : ""}`);
      chip.title = [wait === undefined ? '' : `当前速度 ${Core.initiativeSpeed(unit)} · 预计剩余 ${wait.toFixed(1)} 行动值${support ? ' · 协同支援' : extra ? ' · 额外行动' : ''}，后续技能可能改变顺序`, Core.relicSummary(unit), unit.gearState?.shield ? `个人护盾 ${unit.gearState.shield}` : "", ...Object.entries(unit.gearState?.stacks || {}).map(([key, count]) => `${Core.equipment[key].name} · ${count} 层`)].filter(Boolean).join(" / ");
      const portrait = portraitNode(unit);
      const text = node("span", "", unit.name); text.append(node("small", "", unit.stun ? '击倒' : Core.rear(unit) ? '自动技能' : `速度 ${Core.initiativeSpeed(unit)}`));
      if (wait !== undefined) text.append(node('small', 'turn-av', `${wait.toFixed(1)} AV`));
      chip.append(portrait, text); return chip;
    }));
  }
  function renderRelicActions() {
    let bar = document.getElementById('supreme-active-actions');
    if (!bar) { bar = node('div', 'supreme-active-actions'); bar.id = 'supreme-active-actions'; bar.setAttribute('aria-label', '藏品主动技能'); document.querySelector('#battle-view .commands').append(bar); }
    const options = started ? Core.relicActions(battle) : [];
    const signature = JSON.stringify([options, pendingRelic]);
    bar.hidden = !options.length;
    if (bar.dataset.signature === signature) return;
    bar.dataset.signature = signature;
    bar.replaceChildren(...options.map(action => {
      const button = node('button', 'supreme-active'); button.type = 'button'; button.dataset.relic = action.key;
      const icon = node('img'); icon.src = `assets/haff-war/relics/${action.key}.png`; icon.alt = '';
      const queued = pendingRelic?.actor === action.actor && pendingRelic?.action === action.key;
      button.append(icon, node('span', '', action.name), node('small', '', queued ? '待释放' : action.key === 'ocean' ? `×${action.charges} · ${action.progress}/3` : '主动'));
      button.title = `${Core.units[action.actor].name} · ${window.HaffSystems?.relics?.[action.key]?.effect || (action.key === 'heart' ? '跳过剩余战斗及增援，正常结算奖励' : '全队护盾补满；全体敌人承受 9,999,999% 攻击力海浪。全队每三次常规行动补充一次，不占行动')}${action.reason ? ` · ${action.reason}` : ''}`;
      button.setAttribute('aria-label', `${Core.units[action.actor].name}：${action.name}${action.key === 'ocean' ? `，剩余 ${action.charges} 次，充能 ${action.progress}/3` : ''}${action.reason ? `，${action.reason}` : ''}`);
      button.disabled = !action.available || !!pendingRelic;
      button.addEventListener('click', () => {
        if (!started || !Core.relicActions(battle).some(a=>a.key===action.key&&a.actor===action.actor&&a.available)) return;
        pendingRelic = {relic: true, actor: action.actor, action: action.key}; committed = null;
        playing = true; scene?.tweens.resumeAll(); game?.loop?.wake(); controls();
      });
      return button;
    }));
  }
  function controls() {
    renderRelicActions();
    window.HaffDamageRanking?.update(display, started);
    window.HaffBuildcraftUI?.combat?.(display);
    window.HaffTacticMechanicsUI?.combat(display);
    const ended = battle.phase === "finished" && !cycle;
    $("phase-label").textContent = ended ? "战斗结束" : !started ? "战前部署" : !playing ? "已暂停" : awaiting && mode === "manual" ? "等待指令" : "交战中";
    $("round-label").textContent = display.timeline ? `周期 ${display.round} · ${display.timeline.time.toFixed(1)} AV` : `第 ${Math.max(0, display.round)} 轮`;
    $("start").hidden = started;
    $("start").disabled = !window.Phaser || !!campaign && !campaign.canStart();
    $("pause").disabled = !started || ended;
    $("pause").textContent = playing ? "暂停" : "继续";
    $("difficulty").disabled = started || !!campaign;
    $("difficulty").parentElement.hidden = !!campaign;
    document.querySelector(".battle-record").hidden = !started;
    $("formation-state").textContent = started ? "阵位与装备已锁定" : "战前整备";
    $("prep-position").disabled = started;
    $("cover-value").textContent = String(display.covers.ally);
    $("smoke-value").textContent = display.smoke.ally ? `${display.dyed.ally ? "治疗烟" : "待染烟"} ${display.smoke.ally}轮` : display.walls.ally ? `烟墙 ${display.walls.ally}轮` : "未部署";
    $("rear-support").replaceChildren(...display.units.filter(Core.rear).map(unit => {
      const item = node("span", "rear-support-unit");
      item.append(node("strong", "", unit.name), node("small", "", unit.hp <= 0 ? "倒地 · 支援停止" : unit.supply ? `针 ${unit.supply.count}/3 · 自动救援` : `${unit.energy}/100 · ${Core.offAxis(unit) ? "自动大招" : "自动技能"}`));
      return item;
    }));
  }
  function swapTo(id, slot, cardUid) {
    if (started || !formation.includes(id) || slot !== null && !Core.Formation.validSlot(slot)) return;
    try {
      if (campaign) campaign.place(id, slot, cardUid);
      else {
        const previous = trainingPositions[id];
        if (slot === null) {
          if (previous === undefined || Object.keys(trainingPositions).length === 1) throw new Error("至少保留一名出战干员。");
          delete trainingPositions[id];
        } else {
          const occupant = Object.keys(trainingPositions).find(other => trainingPositions[other] === slot);
          if (occupant && occupant !== id) {
            if (previous === undefined) delete trainingPositions[occupant]; else trainingPositions[occupant] = previous;
          }
          trainingPositions[id] = slot;
        }
      }
    } catch (error) { $("prep-feedback").textContent = error.message; renderFormation(); return; }
    prepOperator = id; candidateId = loadouts[id][prepSlot]; equipmentDetails = false;
    reset();
    $("prep-feedback").textContent = `${Core.units[id].name}已${slot === null ? "转入备战席" : `移至${Core.boardSlots[slot]}`}`;
    document.querySelector(`[data-roster="${id}"]`)?.focus({ preventScroll: true });
  }
  function reset() {
    if (scene) window.HaffUltimateDirector?.stop(scene);
    endEquipmentDrag();
    const wasStarted = started;
    battle = campaign ? campaign.preview() : Core.createBattle(Object.keys(trainingPositions).sort((a, b) => trainingPositions[a] - trainingPositions[b]), $("difficulty").value, loadouts, { campaign: true, timeline: true, positions: trainingPositions });
    display = Core.snapshot(battle);
    cycle = null; pendingRelic = null; started = false; playing = false; selectedId = null;
    void window.HaffPlaneBackdrops?.preload(display);
    awaiting = null; selectedAction = null; selectedTarget = null; committed = null;
    $("prep-view").hidden = false; $("battle-view").hidden = true;
    $("view-phase").textContent = "01 / 小队整备"; $("view-status").textContent = "待命";
    document.title = "哈夫币战争｜小队整备";
    $("result-overlay").hidden = true;
    $("combat-log").replaceChildren(); $("log-count").textContent = "0 条记录";
    $("actor-name").textContent = "G.T.I."; $("action-name").textContent = "小队已集结"; $("action-note").textContent = "等待行动指令";
    if (scene?.board) { scene.tweens.killAll(); scene.tweens.resumeAll(); scene.clearTransient(); scene.render(display); }
    renderSquad(); renderQueue(); controls(); renderActions();
    if (loaded) game?.loop?.sleep();
    if (wasStarted) { window.scrollTo?.({ top: 0, behavior: "instant" }); $("start").focus({ preventScroll: true }); }
    if (!campaign) window.HaffPageMotion?.enter({ key: "training", label: "小队整备" });
  }
  function begin() {
    if (started) return;
    if (!window.Phaser) return;
    if (campaign) {
      try { battle = campaign.start(); display = Core.snapshot(battle); }
      catch (error) { $("prep-feedback").textContent = error.message; return; }
    }
    window.HaffPageMotion?.enter({ key: 'battle', label: '', battle: true });
    endEquipmentDrag();
    started = true; playing = true;
    $("prep-view").hidden = true; $("battle-view").hidden = false;
    $("asset-error").hidden = true;
    $("loading").hidden = true;
    const battlefield = window.HaffPlaneBackdrops?.theme(display).name || "零号大坝";
    $("view-phase").textContent = `02 / ${battlefield}`; $("view-status").textContent = "任务执行中";
    document.title = `哈夫币战争｜${battlefield}`;
    ensureGame();
    window.HaffCombatEntry?.show({ mission: campaign?.missionName || "零号大坝 · 训练交战" });
    $("action-note").textContent = "接敌，行动开始";
    controls(); renderActions();
    window.scrollTo?.({ top: 0, behavior: "instant" }); $("pause").focus({ preventScroll: true });
    window.HaffPageMotion?.enter({ key: "battle", label: "", battle: true });
  }
  function finish() {
    pendingRelic = null;
    playing = false; awaiting = null; selectedAction = null; selectedTarget = null; committed = null;
    if (campaign) { campaign.finish(battle); return; }
    if (window.HaffBattleDebrief?.show(battle, { mission: "零号大坝 · 训练交战", onContinue: reset })) { controls(); renderActions(); return; }
    const won = battle.winner === "ally";
    $("result-overlay").hidden = false;
    $("result-overlay").querySelector(".result-box").classList.toggle("loss", !won);
    $("result-kicker").textContent = won ? "G.T.I. / MISSION COMPLETE" : "G.T.I. / MISSION FAILED";
    $("result-title").textContent = won ? "大坝控制权，拿下。" : battle.round > 18 ? "行动超时，未能突破" : "小队失去战斗能力";
    const survivors = battle.units.filter(unit => unit.side === "ally" && unit.hp > 0).length;
    $("result-summary").textContent = `${battle.round} 轮交战 · ${survivors} 名干员存活${!won && !battle.openingRevival && battle.round > 18 ? " · 超出行动时限" : ""}`;
    $("result-stats").replaceChildren(...battle.units.filter(unit => unit.side === "ally").map(unit => {
      const stat = node("div", "result-stat", unit.name);
      stat.append(node("strong", "", String(unit.id === "stinger" ? unit.healing : unit.damage)), node("span", "", unit.id === "stinger" ? "累计治疗" : "累计伤害")); return stat;
    }));
    controls(); renderActions(); $("result-retry").focus({ preventScroll: true });
  }
  function tick(delta) {
    if (window.HaffInsertion?.active || window.HaffCombatEntry?.active || window.HaffScreenMask?.active) return;
    if (document.querySelector(".combat-inspector[open], .hb-help[open]")) return;
    if (!loaded || !started || !playing) return;
    if (!cycle) {
      if (pendingRelic && !Core.relicActions(battle).some(a=>a.key===pendingRelic.action&&a.actor===pendingRelic.actor&&a.available)) { pendingRelic = null; controls(); }
      if (awaiting && mode === "manual" && !committed && !pendingRelic) return;
      const before = Core.snapshot(battle);
      const event = Core.step(battle, pendingRelic || committed || (mode === "manual" ? null : undefined));
      pendingRelic = null;
      if (campaign) campaign.checkpoint(battle);
      committed = null;
      if (event?.waiting) {
        awaiting = event.actor; display = Core.snapshot(battle); scene.render(display);
        $("actor-name").textContent = Core.units[awaiting].name; $("action-name").textContent = "等待行动指令"; $("action-note").textContent = "";
        renderQueue(); controls(); renderActions(); return;
      }
      if (!event) { display = Core.snapshot(battle); scene.render(display); finish(); return; }
      awaiting = null; selectedAction = null; selectedTarget = null;
      cycle = { event, before, after: Core.snapshot(battle), elapsed: 0, applied: false };
      $("actor-name").textContent = Core.units[event.actor].name;
      $("action-name").textContent = event.name;
      $("action-note").textContent = event.note || (Core.units[event.actor].side === "ally" ? "G.T.I. 小队行动" : `${Core.units[event.actor].faction || "阿萨拉卫队"}行动`);
      renderActions(); scene.playEvent(event); if (!window.HaffRifleActions?.handles(event)) sound(event.kind); controls();
    }
    const playbackSpeed = window.HaffUltimateDirector?.playbackRate(cycle.event, speed) ?? speed;
    const playbackDuration = cycle.event.relicActive ? 1800 : window.HaffUltimateDirector?.actionDuration(cycle.event, duration) ?? duration;
    scene.tweens.timeScale = playbackSpeed;
    if (window.HaffUltimateDirector?.advance(scene, Math.min(delta, 100), playbackSpeed)) return;
    cycle.elapsed += Math.min(delta, 100) * playbackSpeed;
    window.HaffRifleActions?.advance(scene, cycle.elapsed);
    if (!cycle.applied && cycle.elapsed >= playbackDuration * 0.52) {
      cycle.applied = true;
      display = cycle.after;
      window.HaffDamageRanking?.update(display, started);
      scene.render(display); scene.showEffects(cycle.event);
      $("cover-value").textContent = String(display.covers.ally);
      $("smoke-value").textContent = display.smoke.ally ? `${display.dyed.ally ? "治疗烟" : "待染烟"} ${display.smoke.ally}轮` : display.walls.ally ? `烟墙 ${display.walls.ally}轮` : "未部署";
      $("round-label").textContent = display.timeline ? `周期 ${display.round} · ${display.timeline.time.toFixed(1)} AV` : `第 ${display.round} 轮`;
    }
    if (cycle.elapsed >= playbackDuration) {
      const event = cycle.event;
      const entry = node("li", "", `第 ${event.round} 轮 · ${Core.units[event.actor].name}：${event.name}${event.note ? `，${event.note}` : ""}`);
      $("combat-log").prepend(entry); $("log-count").textContent = `${battle.actions} 条记录`;
      cycle = null;
      window.HaffRifleActions?.stop(scene);
      scene.tweens.timeScale = speed;
      window.HaffUltimateDirector?.stop(scene);
      scene.clearHighlight(); renderQueue(); controls();
      if (battle.phase === "finished") finish();
    }
  }

  if (!window.Phaser) { renderSquad(); renderQueue(); controls(); $("prep-error").hidden = false; $("prep-error").textContent = "战斗组件未能载入，请刷新后重试。"; return; }
  class WarScene extends Phaser.Scene {
    constructor() { super("war"); this.figures = new Map(); this.transient = new Set(); this.failed = []; }
    preload() {
    this.load.on("loaderror", file => this.failed.push({ key: file.key, src: file.url, unit: Object.values(Core.units).find(unit => unit.id === file.key)?.name || file.key }));
      for (const data of Object.values(Core.units).filter(unit => !unit.enemyBase)) this.load.image(data.id, phaserAsset(data.portrait));
      for (const key of ["heart", "ocean"]) this.load.image(`supreme-${key}`, `assets/haff-war/relics/${key}.png`);
    }
    create() {
      scene = this;
      $("asset-error").hidden = true;
      if (this.failed.length) {
        const unitEntries = Object.values(Core.units);
        const failedText = this.failed.map(entry => `${entry.key}: ${entry.src}`).join("；");
        const totalUnits = unitEntries.length;
        const totalPortraitSources = new Set(unitEntries.map(unit => phaserAsset(unit.portrait))).size;
        console.warn("[HAFF] 战场素材未能完整载入，将使用占位图继续：", failedText);
        for (const { key } of this.failed) {
          if (this.textures.exists(key)) continue;
          const data = Object.values(Core.units).find(unit => unit.id === key);
          const width = data?.art?.size?.[0] ?? 512;
          const height = data?.art?.size?.[1] ?? 512;
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext("2d");
          context.fillStyle = data?.color ? `#${data.color.toString(16).padStart(6, "0")}` : "#2a2f2d";
          context.fillRect(0, 0, width, height);
          context.strokeStyle = "#6ba88a";
          context.lineWidth = Math.max(2, Math.floor(Math.min(width, height) * 0.015));
          context.strokeRect(6, 6, width - 12, height - 12);
          context.fillStyle = "#edf6ef";
          context.font = `bold ${Math.max(20, Math.floor(Math.min(width, height) * 0.08))}px sans-serif`;
          context.textAlign = "center";
          context.textBaseline = "middle";
          const title = (data?.name || key) + "（离线占位）";
          context.fillText(title, width / 2, height / 2);
          this.textures.addCanvas(key, canvas);
        }
        const detail = this.failed.map(item => `${item.key}（${item.unit}）`).join("；");
        $("loading").hidden = true;
        $("asset-error").hidden = false;
        $("asset-error").querySelector("p").textContent = `有 ${this.failed.length} 个单位贴图未能载入（共 ${totalUnits} 个单位、${totalPortraitSources} 个立绘源文件），已使用离线占位图接管继续战斗。详情：${detail}`;
      }
      for (const data of Object.values(Core.units).filter(unit => !unit.enemyBase)) this.textures.get(data.id).add("portrait", 0, ...data.art.crop);
      this.board = this.add.container(0, 0);
      this.figuresLayer = this.add.container(0, 0);
      this.overlay = this.add.graphics().setDepth(8);
      this.scale.on("resize", () => { if (this.scale.width > 0 && this.scale.height > 0 && started) scheduleBattleLayout(); });
      this.input.on("drag", (_pointer, object, x, y) => { if (!started) { object.x = x; object.y = y; } });
      this.input.on("dragend", (_pointer, object) => {
        if (started) return;
        const nearest = Core.boardSlots.map((_, slot) => ({ slot, p: this.position("ally", slot) })).sort((a, b) => Math.hypot(object.x - a.p.x, object.y - a.p.y) - Math.hypot(object.x - b.p.x, object.y - b.p.y))[0];
        swapTo(object.getData("unitId"), nearest.slot);
      });
      this.layout();
      loaded = true; $("loading").hidden = true; controls();
    }
    position(side, slot) {
      const w = this.scale.width, h = this.scale.height;
      const expanded = Core.visibleUnits(display).filter(unit => unit.side === "enemy").length > 3;
      if (side === "ally") {
        const front = Core.Formation.frontSlot(slot), count = front ? Core.Formation.frontCount : Core.Formation.backCount;
        const column = front ? slot : slot - Core.Formation.frontCount;
        return { x: (column + .5) / count * w, y: front ? h * (expanded ? .64 : .56) : Math.min(h * .92, h - 60) };
      }
      if (expanded) return { x: [.2, .5, .8, .35, .65][slot] * w, y: (slot < 3 ? .4 : .18) * h };
      return { x: [.5, .8, .2][slot] * w, y: .28 * h };
    }
    layout() {
      window.HaffUltimateDirector?.stop(this);
      this.tweens.killAll(); this.clearTransient();
      this.board.removeAll(true); this.figuresLayer.removeAll(true); this.figures.clear();
      const w = this.scale.width, h = this.scale.height;
      this.board.add(this.add.rectangle(w / 2, h / 2, w, h, 0x16211e));
      window.HaffBattleBackdrop?.draw(this, this.board, w, h, display);
      const lines = this.add.graphics(); lines.lineStyle(1, window.HaffArtDirection?.environment(display).ground ?? 0xabcbbb, .11);
      for (let fraction of [.16, .34, .53, .76, .98]) lines.lineBetween(w * .04, h * fraction, w * .96, h * fraction);
      for (let fraction of [.04, .34, .66, .96]) lines.lineBetween(w * (.5 + (fraction - .5) * .64), 35, w * fraction, h - 15);
      this.board.add(lines);
      const factions = [...new Set(Core.visibleUnits(display).filter(unit => unit.side === "enemy").map(unit => unit.faction || "阿萨拉卫队"))];
      this.board.add(this.add.text(18, 12, `敌方 / ${factions.join(" · ")}`, { fontFamily: "system-ui", fontSize: "12px", color: "#f8b1a1" }));
      this.board.add(this.add.text(18, h * .54, "己方 / G.T.I. 突击小队", { fontFamily: "system-ui", fontSize: "12px", color: "#c5efa9" }));
      this.waveIndex = display.waves?.index || 0;
      for (const unit of Core.visibleUnits(display)) this.makeFigure(unit);
      this.render(display);
      renderActions();
    }
    makeFigure(unit) {
      const p = this.position(unit.side, unit.slot);
      const mobile = this.scale.width < 650;
      const expandedEnemy = unit.side === "enemy" && Core.visibleUnits(display).filter(unit => unit.side === "enemy").length > 3;
      const maxHeight = unit.side === "ally" ? Math.max(35, Math.min(100, this.scale.height * .13)) : expandedEnemy ? Math.min(70, this.scale.height * .09) : Math.max(40, Math.min(mobile ? 100 : 125, this.scale.height * .26 - 40));
      const maxWidth = this.scale.width * (unit.side === "ally" ? .16 : .18);
      const container = this.add.container(p.x, p.y);
      window.HaffArtDirection?.grounding(this, container, Math.min(maxWidth, mobile ? 72 : 106), display);
      const ring = this.add.ellipse(0, 0, mobile ? 76 : 113, mobile ? 20 : 28, 0x122319, .86).setStrokeStyle(1, unit.side === "ally" ? 0x9ddf86 : 0xed9589, .65);
      ring.setFillStyle(0x122319, .24);
      const art = this.add.image(0, -4, unit.enemyBase || unit.id, "portrait").setOrigin(.5, 1);
      art.setScale(Math.min(maxHeight / art.height, maxWidth / art.width) * (window.HaffArtDirection?.depth(p.y, this.scale.height) ?? 1));
      const baseScale = art.scaleX;
      const frame = this.add.rectangle(0, -4 - art.displayHeight / 2, art.displayWidth + 2, art.displayHeight + 2).setStrokeStyle(1, unit.color, .65);
      const name = this.add.text(0, 10, unit.name, { fontFamily: "system-ui", fontSize: mobile ? "12px" : "14px", color: "#f6f4e9", stroke: "#0b1410", strokeThickness: 4 }).setOrigin(.5, 0);
      const labelWidth = this.scale.width * (unit.side === "ally" ? Core.rear(unit) ? .18 : .22 : .27);
      name.setScale(Math.min(1, labelWidth / name.width));
      const bars = this.add.graphics();
      const info = this.add.text(0, 42, "", { fontFamily: "system-ui", fontSize: mobile ? "10px" : "11px", color: "#c7d6ca", stroke: "#0b1410", strokeThickness: 3 }).setOrigin(.5, 0);
      const condition = this.add.text(0, -art.displayHeight - 22, "", { fontFamily: "system-ui", fontSize: "12px", color: "#ffcf8b", backgroundColor: "#16221d", padding: { x: 4, y: 2 } }).setOrigin(.5, 0);
      const intent = this.add.text(0, -art.displayHeight - 42, "", { fontFamily: "system-ui", fontSize: "11px", color: "#f5b0a3", stroke: "#102016", strokeThickness: 3 }).setOrigin(.5, 0);
      container.add([ring, art, frame, name, bars, info, condition, intent]);
      this.figuresLayer.add(container);
      const hitWidth = Math.min(labelWidth, Math.max(64, art.displayWidth));
      container.setSize(hitWidth, art.displayHeight + 54);
      container.setInteractive(new Phaser.Geom.Rectangle(-hitWidth / 2, -art.displayHeight, hitWidth, art.displayHeight + 54), Phaser.Geom.Rectangle.Contains);
      container.setData("unitId", unit.id);
      if (unit.side === "ally") this.input.setDraggable(container);
      container.on("pointerup", pointer => {
        if (pointer.getDistance() > 8) return;
        if (started) {
          if (document.querySelector("dialog[open]")) return;
          if (selectedAction) selectTarget(unit.id); else window.HaffCombatInspectorUI?.open(unit.id);
          return;
        }
        if (unit.side !== "ally") return;
        if (selectedId && selectedId !== unit.id) { swapTo(selectedId, positions()[unit.id]); selectedId = null; }
        else { selectedId = unit.id; this.clearHighlight(); ring.setStrokeStyle(3, 0xb6ef7b); }
      });
      this.figures.set(unit.id, { container, ring, art, bars, info, condition, intent, baseScale, labelWidth, height: art.displayHeight });
    }
    render(state) {
      window.HaffBattleHUD?.update(state);
      if (this.waveIndex !== (state.waves?.index || 0) || Core.visibleUnits(state).some(unit => !this.figures.has(unit.id))) { this.layout(); return; }
      for (const unit of Core.visibleUnits(state)) {
        const view = this.figures.get(unit.id); if (!view) continue;
        const p = this.position(unit.side, unit.slot); view.container.setPosition(p.x, p.y);
        view.art.setAlpha(unit.hp > 0 ? 1 : .28);
        if (window.HaffArtDirection) window.HaffArtDirection.light(view.art, state, unit.hp > 0);
        else if (unit.hp <= 0) view.art.setTint(0x59615b); else view.art.clearTint();
        view.bars.clear(); const width = Math.min(this.scale.width < 650 ? 78 : 106, view.labelWidth);
        if ((!state.dualTrack || !Core.rear(unit)) && !unit.boss) {
          view.bars.fillStyle(0x142019).fillRect(-width / 2, 30, width, 5);
          view.bars.fillStyle(unit.side === "ally" ? 0xa7e781 : 0xef8a7c).fillRect(-width / 2, 30, width * Math.max(0, unit.hp / unit.maxHp), 5);
          const executionTier=window.HaffTacticMechanics?.tier(state,'execution')??-1;
          if(unit.side==='enemy'&&executionTier>=0)view.bars.fillStyle(0xffdbab).fillRect(-width/2+width*[.1,.15,.2][executionTier]-1,28,2,9);
          if (unit.gearState?.shield) view.bars.fillStyle(0x84cde5).fillRect(-width / 2, 26, width * unit.gearState.shield / unit.maxHp, 2);
        }
        view.ring.setVisible(!state.dualTrack || !Core.rear(unit));
        if (unit.side === "ally") {
          view.bars.fillStyle(0x18242d).fillRect(-width / 2, 37, width, 2);
          if (unit.supply) {
            for (let index = 0; index < needleSpec.capacity; index++) view.bars.fillStyle(index < unit.supply.count ? 0x87e2aa : 0x3a4942).fillRect(-width / 2 + index * width / needleSpec.capacity, 37, width / needleSpec.capacity - 3, 3);
          } else view.bars.fillStyle(unit.energy === 100 ? 0xe4c17c : 0x84cde5).fillRect(-width / 2, 37, width * unit.energy / 100, 2);
        }
        view.info.setText(state.dualTrack && Core.rear(unit) ? "后台支援" : unit.boss ? unit.hp > 0 ? "首领" : "已击败" : unit.hp > 0 ? `${unit.hp}/${unit.maxHp}${unit.supply && this.scale.width >= 650 ? ` · 针${unit.supply.count}` : ""}` : "倒地");
        view.info.setScale(Math.min(1, view.labelWidth / Math.max(1, view.info.width)));
        const gearLayers = Object.values(unit.gearState?.stacks || {}).reduce((sum, value) => sum + value, 0) + (unit.relicState?.stacks || 0) + (unit.extraRelics || []).reduce((sum,e)=>sum+(e.relicState?.stacks||0),0);
        const labels = [unit.rescueWindow ? `救援 ${unit.rescueWindow} 回合` : "", unit.stun ? "击倒" : "", unit.bomb ? `C4 ${unit.bomb.stacks || 0}层` : "", unit.burn ? "燃烧" : "", unit.regen ? "持续恢复" : "", unit.overdrive ? "外骨骼" : "", unit.traced ? "减防35%" : unit.marked ? "减防20%" : "", unit.blinded ? "致盲" : "", unit.jammed ? "干扰" : "", unit.frost ? `低温 ${unit.frost}/3` : unit.hobbled ? "减速" : "", unit.shock ? "电击" : "", unit.venom ? "毒蚀" : "", state.buildcraftEngine?.infection?.[unit.id] ? `感染 ${state.buildcraftEngine.infection[unit.id]}层` : "", unit.gearState?.shield ? `护盾 ${unit.gearState.shield}` : "", gearLayers ? `装备增益 ${gearLayers}层` : ""].filter(Boolean);
        const engineLabels=[state.buildcraftEngine?.exposed?.[unit.id] ? `处决 ${state.buildcraftEngine.exposed[unit.id]}` : '',state.buildcraftEngine?.infection?.[unit.id] ? `感染 ${state.buildcraftEngine.infection[unit.id]}层` : ''].filter(Boolean);
        if(engineLabels.length)labels.unshift(engineLabels.join(' · '));
        labels.push(...[unit.clover ? `四叶追击 ${unit.clover}次` : '', unit.spyCamera ? `蜂鸟追击 ${unit.spyCamera}次` : '', unit.spiderMines ? '哨兵母巢' : '', unit.aerosolField ? '生命上限 -15%' : '', Core.sonicProtection(state,unit) ? '爆炸减伤20%' : '', Core.rescueAura(state,unit) ? '救援群：减伤40% / 增伤25%' : ''].filter(Boolean));
        labels.push(...[unit.bleeding ? "流血" : "", unit.nano ? "医疗粉尘" : "", unit.anchorGuard ? "回避锚点" : "", unit.stealth ? "静默潜袭" : "", unit.evade ? "翻滚待避" : "", unit.wounded ? "重伤" : ""].filter(Boolean));
        labels.push(...[unit.tempestRush ? `三连射 ${unit.tempestRush}次` : "", unit.rollBoost ? "翻滚反击" : "", display.buildcraftMemory?.ambush.includes(unit.id) ? "伏击弹就绪" : ""].filter(Boolean));
        labels.push(...[unit.frost ? `低温 ${unit.frost}` : "", unit.coldField ? "冷凝区" : "", unit.wireField ? "刀片刺网" : "", unit.riot ? "防爆套装" : "", unit.adrenaline ? "肾上腺素" : "", unit.suppressed ? "集群压制" : "", unit.sonar ? "声呐探测" : ""].filter(Boolean));
        if (Core.knockdownVulnerable(state, unit)) labels.unshift("震荡集火 +35%");
        if (unit.fractured) labels.unshift(`碎甲 ${unit.fractured}次`);
        view.condition.setText(labels.length > 1 ? `${labels[0]} +${labels.length - 1}` : labels.join("")).setVisible(labels.length > 0 && unit.hp > 0);
        view.condition.setScale(Math.min(1, view.labelWidth / Math.max(1, view.condition.width)));
        view.intent.setText(unit.side === "enemy" && unit.hp > 0 ? unit.jammed ? "干扰 · 普攻" : Core.intent(state, unit.id) : "").setVisible(this.scale.width >= 650 || !!unit.boss);
      }
      this.figuresLayer.sort('y');
      this.drawCover(state);
    }
    drawCover(state) {
      this.overlay.clear();
      for (const side of ["ally", "enemy"]) {
        const front = state.units.filter(unit => unit.side === side && unit.hp > 0).sort((a, b) => a.slot - b.slot)[0];
        if (!front) continue;
        const p = this.position(side, front.slot);
        const width = this.scale.width < 650 ? 78 : 120;
        if (state.covers[side] > 0) {
          this.overlay.fillStyle(side === "ally" ? 0x769e9c : 0x927b67, .77);
          this.overlay.fillRoundedRect(p.x - width / 2, p.y - 19, width, 25, 2);
          this.overlay.lineStyle(2, side === "ally" ? 0xb2d8cd : 0xe4bb96, .8);
          this.overlay.strokeRect(p.x - width / 2, p.y - 19, width, 25);
        }
        if (state.smoke[side] || state.walls[side]) {
          for (const unit of state.units.filter(item => item.side === side && item.hp > 0)) {
            const point = this.position(side, unit.slot);
            this.overlay.fillStyle(state.dyed[side] ? 0x86d7ac : 0xb1bec4, .18).fillEllipse(point.x, point.y - 20, width * 1.35, 54);
          }
        }
      }
    }
    clearHighlight() { for (const [id, view] of this.figures) view.ring.setStrokeStyle(1, Core.units[id].side === "ally" ? 0x9ddf86 : 0xed9589, .65); }
    keep(object) { object.setDepth(20); this.transient.add(object); return object; }
    discard(object) { this.transient.delete(object); object.destroy(); }
    clearTransient() { window.HaffRifleActions?.stop(this); window.HaffArtDirection?.clearAftermath(this); for (const object of this.transient) object.destroy(); this.transient.clear(); }
    burst(point, color, radius = 60) {
      const pulse = this.keep(this.add.circle(point.x, point.y - 65, 8).setStrokeStyle(3, color));
      this.tweens.add({ targets: pulse, scale: reducedMotion ? 2 : radius / 8, alpha: 0, duration: 450, onComplete: () => this.discard(pulse) });
    }
    projectile(from, to, color, kind = "shot") {
      const source = { x: from.x, y: from.y - 65 }, target = { x: to.x, y: to.y - 65 };
      const tracer = this.keep(this.add.graphics());
      tracer.lineStyle(kind === "heal" ? 3 : 1, color, .55).lineBetween(source.x, source.y, target.x, target.y);
      const bullet = this.keep(this.add.circle(source.x, source.y, kind === "shot" ? 3 : 5, color));
      this.tweens.add({ targets: bullet, x: target.x, y: target.y, duration: reducedMotion ? 120 : 330, ease: "Quad.easeIn", onComplete: () => { this.discard(bullet); this.discard(tracer); } });
    }
    playEvent(event) {
      if (event.relicActive) {
        this.clearHighlight();
        if (event.relicActive === 'ocean') {
          const w = Math.max(1, this.scale.width), h = Math.max(1, this.scale.height);
          const wave = this.keep(this.add.container(reducedMotion ? w * .5 : -w * .28, 0)).setDepth(80);
          for (let layer = 0; layer < 4; layer++) {
            const g = this.add.graphics(), points = [];
            for (let y = 0; y <= h; y += h / 40) points.push(new Phaser.Math.Vector2(Math.sin(y / h * 9 + layer * .5) * 22 - layer * 36, y));
            g.fillStyle([0xe8ffff,0x98fff1,0x36c5df,0x126cba][layer], .65 - layer * .12);
            g.fillPoints([...points, new Phaser.Math.Vector2(-w * .24 - layer * 36,h),new Phaser.Math.Vector2(-w * .24 - layer * 36,0)],true);
            g.lineStyle(3,0xe6ffff,.8-layer*.16);g.strokePoints(points,false);wave.add(g);
          }
          this.tweens.add({targets:wave,x:reducedMotion?w*.5:w*1.3,alpha:0,duration:reducedMotion?650:1200,ease:'Cubic.easeInOut',onComplete:()=>this.discard(wave)});
        }
        return;
      }
      if (event.kind === "wave") { window.HaffBattleHUD?.announceWave(event); return; }
      if (window.HaffUltimateDirector?.start(this, event, display, campaign?.stars?.(event.actor) ?? 1, reducedMotion)) return;
      if (window.HaffRifleActions?.start(this, event, display, campaign?.stars?.(event.actor) ?? 1, reducedMotion, profile => sound('shot', profile))) {
        this.clearHighlight(); this.figures.get(event.actor)?.ring.setStrokeStyle(3, 0xf2dc91);
        for (const id of event.targets || []) this.figures.get(id)?.ring.setStrokeStyle(2, 0xf5a894);
        return;
      }
      window.HaffSignatureFX?.play(this, event, display, campaign?.stars?.(event.actor) ?? 1, "cast", reducedMotion);
      this.clearHighlight();
      const actor = this.figures.get(event.actor);
      actor.ring.setStrokeStyle(3, 0xf2dc91);
      if (!reducedMotion) this.tweens.add({ targets: actor.art, y: -12, duration: 130, yoyo: true });
      const from = this.position(Core.units[event.actor].side, display.units.find(unit => unit.id === event.actor).slot);
      for (const id of event.targets) {
        const targetUnit = display.units.find(unit => unit.id === id);
        const to = this.position(targetUnit.side, targetUnit.slot);
        const good = ["heal", "revive", "smoke", "wolfSmoke", "overdrive", "cover", "anchor", "silent"].includes(event.kind);
        const color = ["volt", "reconArrow"].includes(event.kind) ? 0x86d9de : ["decode", "knife", "flash"].includes(event.kind) ? 0xc5b4e8 : good ? 0x91e8b4 : event.kind === "air" ? 0xb4e9ff : 0xffbd73;
        this.figures.get(id).ring.setStrokeStyle(2, good ? 0x91e8b4 : 0xf5a894);
        if (["air", "missile", "explosion", "fire", "smoke", "cover", "revive", "stun", "triple", "wolfSmoke", "overdrive", "volt", "frag", "reconArrow", "decode", "flash", "anchor", "silent"].includes(event.kind)) {
          if (!window.HaffArtDirection?.skillCue(this, to, event.kind, color, reducedMotion)) this.burst(to, color, event.kind === "missile" ? 80 : 50);
        }
        if (!event.shots && !["cover", "smoke", "wolfSmoke", "overdrive", "stun", "explosion", "status", "anchor", "silent"].includes(event.kind) && !(event.actor === "tempest" && event.kind === "dash")) this.projectile(from, to, color, good ? "heal" : event.kind);
        if (event.kind === "triple") for (let i = 1; i < 3; i++) this.projectile({ x: from.x, y: from.y + i * 10 }, to, color);
        if (event.kind === "barrage") for (let i = 0; i < 2; i += 1) this.projectile({ x: from.x, y: from.y + i * 8 }, { x: to.x + i * 8, y: to.y }, color);
        if (["smoke", "wolfSmoke"].includes(event.kind)) {
          const fog = this.keep(this.add.ellipse(to.x, to.y - 35, 105, 62, 0x99dabb, .28));
          this.tweens.add({ targets: fog, alpha: 0, scaleX: 1.6, duration: 850, onComplete: () => this.discard(fog) });
        }
      }
      for (const [index, id] of (event.shots || []).entries()) {
        const unit = display.units.find(unit => unit.id === id), to = this.position(unit.side, unit.slot);
        this.projectile({ x: from.x, y: from.y + (index - 1) * 7 }, to, 0x86cbff, "shot");
      }
      if (event.kind === "dash" && !reducedMotion) {
        this.tweens.add({ targets: actor.art, y: -40, duration: 160, yoyo: true, hold: 130 });
      }
    }
    showEffects(event) {
      if (event.kind === "wave") {
        if (!reducedMotion) for (const id of event.targets) { const figure = this.figures.get(id); if (figure) this.tweens.add({ targets: figure.container, alpha: { from: 0, to: 1 }, duration: 350 }); }
        return;
      }
      window.HaffBuildcraftUI?.feedback(this, event, display, reducedMotion);
      window.HaffTacticMechanicsUI?.feedback(this, event, display, reducedMotion);
      window.HaffBattleRewards?.kill(this, event, display, reducedMotion);
      window.HaffUltimateDirector?.impact(this, event, display, campaign?.stars?.(event.actor) ?? 1, reducedMotion);
      if (!window.HaffRifleActions?.handles(event)) window.HaffSignatureFX?.play(this, event, display, campaign?.stars?.(event.actor) ?? 1, "impact", reducedMotion);
      const counts = {};
      for (const effect of window.HaffBuildcraftUI?.displayEffects?.(event) || event.effects) {
        if (effect.type === "supreme") { this.showSupremeEffect(effect); continue; }
        const unit = display.units.find(item => item.id === effect.target);
        const p = this.position(unit.side, unit.slot);
        const offset = counts[unit.id] || 0; counts[unit.id] = offset + 1;
        let label = "", color = "#f2ad8c";
        if (effect.type === "damage") label = `−${effect.value}`;
        if (effect.type === "damage" && effect.critical) { label = `暴击 −${effect.value}`; color = "#ffe099"; }
        if (effect.type === "damage" && effect.bond) { label = `羁绊 −${effect.value}`; color = Core.Buildcraft.bonds.find(b=>b.key===effect.bond)?.color || '#ffe099'; }
        if (effect.type === "heal" || effect.type === "revive") { label = `+${effect.value}${effect.type === "revive" ? " 救援" : ""}`; color = "#a8f0bd"; }
        if (effect.type === "block") { label = `掩体 −${effect.value}`; color = "#b6e7ef"; }
        if (effect.type === "shieldBlock") { label = `护盾 −${effect.value}`; color = "#84cde5"; }
        if (effect.type === "shieldBreak") { label = effect.label; color = "#ffc16e"; }
        if (effect.type === "vulnerable") { label = effect.label; color = "#ffd18a"; }
        if (effect.type === "gear") { label = effect.label; color = "#e4c17c"; }
        if (effect.type === "stun") { label = "击倒"; color = "#c2eaff"; }
        if (effect.type === "cooldown") { label = "技能冷却 −1"; color = "#a8ead4"; }
        if (effect.type === "overdrive") { label = "外骨骼启动"; color = "#ef9588"; }
        if (effect.type === "marked") { label = "侦察标记"; color = "#86d9de"; }
        if (effect.type === "shock") { label = "电击"; color = "#86d9de"; }
        if (effect.type === "jammed") { label = "设备干扰"; color = "#c5b4e8"; }
        if (effect.type === "blinded") { label = "致盲"; color = "#e8e3ff"; }
        if (effect.type === "cover") { label = `防护 +${effect.value}`; color = "#b6e7ef"; }
        if (effect.type === "bomb") label = "炸弹附着";
        if (effect.type === "burn") label = "燃烧";
        if (effect.type === "detonate") { label = effect.label || "磁吸炸弹引爆"; this.burst(p, 0xffb574, 74); }
        if (effect.type === "down") label = "倒地";
        if (!label) continue;
        const text = this.keep(this.add.text(p.x, p.y - 75 - offset * 22, label, { fontFamily: "system-ui", fontSize: this.scale.width < 650 ? "14px" : "18px", fontStyle: "bold", color, stroke: "#112117", strokeThickness: 4 }).setOrigin(.5));
        this.tweens.add({ targets: text, y: text.y - (reducedMotion ? 0 : 28), alpha: 0, duration: 720, onComplete: () => this.discard(text) });
      }
    }
    showSupremeEffect(effect) {
      const ocean = effect.key === "ocean", color = ocean ? 0x87f2ea : 0xff7399;
      const width = Math.min(420, this.scale.width - 24);
      const banner = this.keep(this.add.container(this.scale.width / 2, 54)).setDepth(90);
      banner.add(this.add.rectangle(0, 0, width, 62, 0x121c22, .96).setStrokeStyle(2, color));
      banner.add(this.add.image(-width / 2 + 34, 0, `supreme-${effect.key}`).setDisplaySize(48, 48));
      banner.add(this.add.text(-width / 2 + 72, 0, effect.label, { fontFamily: "system-ui", fontSize: "18px", fontStyle: "bold", color: ocean ? "#b0fff2" : "#ffb5c8", wordWrap: { width: width - 86 } }).setOrigin(0, .5));
      if (!reducedMotion) {
        this.cameras.main.shake(200, .005);
        for (const unit of Core.visibleUnits(display).filter(unit => ocean ? unit.side === "ally" && !Core.rear(unit) : unit.side === "enemy")) this.burst(this.position(unit.side, unit.slot), color, 105);
      }
      this.tweens.add({ targets: banner, alpha: 0, delay: 1000, duration: 450, onComplete: () => this.discard(banner) });
    }
    update(_time, delta) { tick(delta); }
  }

  $("start").addEventListener("click", begin);
  $("reset").addEventListener("click", () => {
    if (!started || battle.phase === "finished" && !cycle) { reset(); return; }
    resumeAfterDialog = playing; playing = false; scene?.tweens.pauseAll(); controls(); renderActions();
    $("leave-dialog").showModal();
  });
  function continueBattle() {
    $("leave-dialog").close(); playing = resumeAfterDialog;
    if (playing) scene?.tweens.resumeAll(); controls(); renderActions();
  }
  $("continue-battle").addEventListener("click", continueBattle);
  $("leave-dialog").addEventListener("cancel", event => { event.preventDefault(); continueBattle(); });
  $("leave-battle").addEventListener("click", () => { $("leave-dialog").close(); if (campaign) campaign.finish(battle, true); else reset(); });
  $("prep-position").addEventListener("change", () => swapTo(prepOperator, $("prep-position").value === "bench" ? null : Number($("prep-position").value)));
  $("sell-operator").addEventListener("click", () => { if (!started && campaign?.canSell(prepOperator)) campaign.sellOperator(prepOperator); });
  $("terminal-upgrade").addEventListener("click", () => { if (!started && campaign?.terminal().canUpgrade) campaign.upgrade(); });
  $("parcel-close").addEventListener("click", () => $("parcel-dialog").close());
  $("strip-operator").addEventListener("click", () => {
    if (started || !campaign) return;
    campaign.strip(prepOperator); loadouts = campaign.loadouts(); candidateId = null; refreshEquipment();
  });
  $("equip-item").addEventListener("click", () => { if (candidateId) equip(candidateId); });
  const trainingUnloadZone = document.querySelector(".formation-inspector");
  trainingUnloadZone.addEventListener("dragover", event => {
    if (campaign || started || !draggedItemOwner || !draggedItemId) return;
    event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = "move";
    trainingUnloadZone.classList.add("drop-ready");
  }, true);
  trainingUnloadZone.addEventListener("dragleave", event => {
    if (!trainingUnloadZone.contains(event.relatedTarget)) trainingUnloadZone.classList.remove("drop-ready");
  });
  trainingUnloadZone.addEventListener("drop", event => {
    if (campaign || started || !draggedItemOwner || !draggedItemId) return;
    event.preventDefault(); event.stopPropagation();
    const owner = draggedItemOwner, item = Core.equipment[draggedItemId];
    endEquipmentDrag(); if (item) equip(null, owner, item.slot);
  }, true);
  $("unequip-item").addEventListener("click", () => equip(null));
  $("restore-loadout").addEventListener("click", () => {
    if (started || campaign) return;
    loadouts[prepOperator] = { ...Core.defaultLoadouts[prepOperator] };
    candidateId = loadouts[prepOperator][prepSlot]; refreshEquipment();
  });
  function switchPrepTab(tab) {
    if (prepTab === tab) return;
    prepTab = tab;
    $("gear-panel").hidden = tab !== "gear"; $("skills-panel").hidden = tab !== "skills";
    document.querySelectorAll('[data-prep-tab]').forEach(button => {const active=button.dataset.prepTab===tab;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;});
    window.HaffPageMotion?.panel($(`${tab}-panel`));
  }
  document.querySelectorAll("[data-prep-tab]").forEach(button => {
    button.addEventListener("click", () => switchPrepTab(button.dataset.prepTab));
    button.addEventListener("keydown", event => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault(); switchPrepTab(event.key === "Home" ? "gear" : event.key === "End" ? "skills" : prepTab === "gear" ? "skills" : "gear");
      $(`${prepTab}-tab`).focus();
    });
  });
  $("result-retry").addEventListener("click", reset);
  $("difficulty").addEventListener("change", () => { if (!campaign) reset(); });
  $("reload-assets").addEventListener("click", () => window.location.reload());
  $("pause").addEventListener("click", () => {
    if (!started || (battle.phase === "finished" && !cycle)) return;
    playing = !playing;
    if (playing) scene.tweens.resumeAll(); else scene.tweens.pauseAll();
    controls(); renderActions();
  });
  $("confirm-action").addEventListener("click", () => {
    if (!awaiting || !selectedAction || !selectedTarget || committed || cycle || !playing || mode !== "manual") return;
    committed = { actor: awaiting, action: selectedAction, target: selectedTarget };
    renderActions();
  });
  $("cancel-action").addEventListener("click", () => { if (committed) return; selectedAction = null; selectedTarget = null; renderActions(); });
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape" || !awaiting || !selectedAction || committed || cycle || document.querySelector("dialog[open]")) return;
    event.preventDefault(); const previous = selectedAction;
    selectedAction = null; selectedTarget = null; renderActions();
    $("skill-options").querySelector(`[data-action="${previous}"]`)?.focus({ preventScroll: true });
  });
  $("sound").addEventListener("click", () => { soundEnabled = !soundEnabled; $("sound").setAttribute("aria-pressed", String(soundEnabled)); $("sound").textContent = soundEnabled ? "音效开" : "音效关"; if (soundEnabled) sound("heal"); });
  document.querySelectorAll("[data-speed]").forEach(button => button.addEventListener("click", () => { speed = Number(button.dataset.speed); document.querySelectorAll("[data-speed]").forEach(item => item.setAttribute("aria-pressed", String(item === button))); if (scene) scene.tweens.timeScale = window.HaffUltimateDirector?.playbackRate(cycle?.event, speed) ?? speed; }));
  document.querySelectorAll("[data-mode]").forEach(button => button.addEventListener("click", () => setBattleMode(button.dataset.mode)));
  document.addEventListener("visibilitychange", () => { if (document.hidden && playing) { playing = false; scene?.tweens.pauseAll(); controls(); renderActions(); } });
  renderSquad(); renderQueue(); controls(); renderActions();
  window.HaffWarUI = {
    inspection() {
      return { state: Core.snapshot(display), actor: awaiting || cycle?.event.actor || display.queue[0],
        prepared: Object.fromEntries(display.units.filter(u => u.side === "ally").map(u => [u.id, campaign ? campaign.stats(u.id) : Core.loadoutStats(u.id, loadouts[u.id])])),
        bonuses: campaign?.inspectionBonuses?.() || [] };
    },
    inspectionOpen(open) { if (open) scene?.tweens.pauseAll(); else if (playing) scene?.tweens.resumeAll(); },
    focusOperator(id) { if (id && Core.operatorIds.includes(id)) { prepOperator = id; prepTab = "gear"; } },
    refreshEquipment,
    showParcelReceipt,
    prepare(context) {
      campaign = context; loadouts = context.loadouts();
      if (!context.owns(prepOperator)) prepOperator = context.deployed()[0];
      formation = [...context.deployed(), ...Core.operatorIds.filter(id => !context.deployed().includes(id))];
      $("difficulty").value = context.difficulty;
      candidateId = loadouts[prepOperator][prepSlot];
      reset();
      $("leave-dialog").querySelector("p").textContent = "放弃本场会扣除行动完整度，不获得战利品。本次行动仍可继续。";
    },
    launch(context) { campaign = context; begin(); },
    training() {
      campaign = null; loadouts = JSON.parse(JSON.stringify(Core.defaultLoadouts));
      formation = ["uluru", "vyron", "stinger"]; trainingPositions = Core.defaultPositions(formation); if (!formation.includes(prepOperator)) prepOperator = formation[0]; candidateId = loadouts[prepOperator][prepSlot]; equipmentDetails = false; reset();
      $("leave-dialog").querySelector("p").textContent = "本局战斗将结束，已穿戴的装备会保留。";
    },
    hide() {
      if (scene) window.HaffRifleActions?.stop(scene);
      if (scene) window.HaffUltimateDirector?.stop(scene);
      started = false; playing = false; cycle = null; awaiting = null; committed = null; pendingRelic = null;
      endEquipmentDrag(); scene?.tweens.killAll(); if (loaded) game?.loop?.sleep();
      $("prep-view").hidden = true; $("battle-view").hidden = true;
    }
  };
  let layoutFrame = 0;
  function scheduleBattleLayout() {
    if (layoutFrame) return;
    layoutFrame = requestAnimationFrame(() => { layoutFrame = 0; if (started && scene?.board && scene.scale.width > 0 && scene.scale.height > 0) scene.layout(); });
  }
  function ensureGame() {
    const host = $("battlefield");
    if (game) {
      game.loop?.wake();
      if (game.scale.width !== host.clientWidth || game.scale.height !== host.clientHeight) game.scale.resize(host.clientWidth, host.clientHeight);
      if (scene?.board) scheduleBattleLayout();
      return;
    }
    game = new Phaser.Game({ type: Phaser.CANVAS, parent: host, width: host.clientWidth, height: host.clientHeight, transparent: true, antialias: true, audio: { noAudio: true }, scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: WarScene, banner: false });
    resize = new ResizeObserver(() => { if (started && scene?.board && host.clientWidth > 0 && host.clientHeight > 0 && (game.scale.width !== host.clientWidth || game.scale.height !== host.clientHeight)) game.scale.resize(host.clientWidth, host.clientHeight); });
    resize.observe(host);
  }
  window.addEventListener("pagehide", event => { if (!event.persisted) { cancelAnimationFrame(layoutFrame); resize?.disconnect(); game?.destroy(true); if (audio) void audio.close(); } });
})();
