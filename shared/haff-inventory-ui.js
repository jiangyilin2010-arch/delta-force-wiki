(function () {
  "use strict";
  window.HaffInventoryUI = { create({ Core, C, getRun, execute, onChange, sell, sellMany }) {
    let selected = null, filter = "all", dragged = null, craftOn = null, currentOwner = null, fusion = null;
    let bulkMode = false, bulkRunId = null;
    const bulkSelected = new Set();
    const returnedItems = new Set();
    let returnedRunId = null;
    const views = new WeakMap(), slotsCache = new Map();
    const n = (tag, cls, text) => { const el = document.createElement(tag); el.className = cls || ""; if (text !== undefined) el.textContent = text; return el; };
    const btn = (text, action, cls = "", disabled = false) => { const el = n("button", cls, text); el.type = "button"; el.disabled = disabled; el.addEventListener("click", action); return el; };
    const saleIcon = () => { const el = n("img", "inventory-sale-icon"); el.src = "assets/haff-war/icons/hand-coins.svg"; el.alt = ""; return el; };
    const allowed = () => ["prep", "route", "market"].includes(getRun().phase);
    const find = uid => getRun().inventory.find(item => item.uid === uid);
    const worn = (owner, slot) => getRun().inventory.find(item => item.owner === owner && C.itemSlot(item) === slot);
    const relicSlots = ["relic", "relic2", "relic3"];
    const slotName = slot => relicSlots.includes(slot) ? `藏品 ${relicSlots.indexOf(slot) + 1}` : Core.equipmentSlots[slot];
    const kindName = item => C.itemInfo(item).supreme ? "至臻藏品" : ({ gear: "成品装备", relic: "干员藏品" })[item.kind];
    // Worn items dropped anywhere in the inspector return to stock. Capture
    // before nested slots/recipes so this gesture never equips or fuses them.
    const unloadZone = document.querySelector(".formation-inspector");
    const draggedWornItem = () => dragged && allowed() && !bulkMode ? find(dragged) : null;
    unloadZone?.addEventListener("dragover", event => {
      if (!draggedWornItem()?.owner) return;
      event.preventDefault(); event.stopPropagation();
      event.dataTransfer.dropEffect = "move";
      unloadZone.classList.add("inventory-drop-ready");
    }, true);
    unloadZone?.addEventListener("dragleave", event => {
      if (!unloadZone.contains(event.relatedTarget)) unloadZone.classList.remove("inventory-drop-ready");
    });
    unloadZone?.addEventListener("drop", event => {
      const item = draggedWornItem(); if (!item?.owner) return;
      event.preventDefault(); event.stopPropagation(); dragged = null;
      document.querySelectorAll(".inventory-drop-ready").forEach(el => el.classList.remove("inventory-drop-ready"));
      perform({ type: "equip", uid: item.uid, owner: null });
    }, true);
    function icon(item, slot) {
      const image = n("img", "equipment-icon"); image.alt = ""; image.draggable = false;
      if (item?.kind === "relic" || relicSlots.includes(slot)) {
        image.src = item ? C.itemInfo(item).image : "assets/haff-war/icons/coins.svg";
        image.classList.add(item ? "relic-art" : "relic-symbol");
      }
      else {
        const data = item && C.itemInfo(item);
        const type = data?.icon || ((data?.slot || slot) === "armor" ? "vest" : (data?.slot || slot) === "helmet" ? "helmet" : ["bison", "uzi", "mp5", "lightBison", "rapidUzi", "circuitMP5"].includes(item?.key) ? "smg" : "rifle");
        image.src = `assets/haff-war/equip-${type}.svg`;
      }
      if (!item) image.classList.add("empty-icon"); return image;
    }
    function attributes(item) {
      const data = C.itemInfo(item), values = item.kind === "relic" ? data.bonus : data;
      return Object.entries({ hp:"生命", attack:"攻击", armor:"防护", speed:"速度", energy:"初始能量", initialEnergy:"初始能量", chargeEfficiency:"充能效率" })
        .filter(([key]) => values?.[key]).map(([key,label]) => `${label} +${values[key]}${key === "chargeEfficiency" ? "%" : ""}`).join(" · ");
    }
    function description(item) {
      const data = C.itemInfo(item);
      if (item.kind === "relic") return `${attributes(item)}\n${data.effect}`;
      const stats = data;
      return Object.entries({ hp: "生命", attack: "攻击", armor: "防护", speed: "速度", energy: "初始能量", initialEnergy: "初始能量", chargeEfficiency: "充能效率" }).filter(([key]) => stats[key]).map(([key, label]) => `${label} ${stats[key] > 0 ? "+" : ""}${stats[key]}${key === "chargeEfficiency" ? "%" : ""}`).concat(data.passive || []).join(" · ");
    }
    function perform(action, owner = currentOwner) {
      try {
        execute(action);
        returnedItems.clear();
        if (action.type === "craftRelic") selected = getRun().inventory.at(-1).uid;
        if (action.type === "craftRelic") { fusion = selected; filter = "relic"; }
        if (selected && !find(selected)) selected = null;
        onChange(owner);
        if (action.type === "craftRelic") document.getElementById("prep-feedback").textContent = `${C.itemInfo(find(selected)).name}合成成功`;
      } catch (error) { document.getElementById("prep-feedback").textContent = error.message; }
    }
    function recipeFor(a, b) {
      return C.relicRecipeFor(a, b);
    }
    function combine(a, b, owner) {
      const recipe = recipeFor(a, b);
      if (!recipe) { document.getElementById("prep-feedback").textContent = "仅同品质的两件紫色或金色藏品可合成；红色已是最高品质。物品未消耗。"; return; }
      const wornMaterial = [b, a].find(item => owner && item.owner === owner);
      perform({ type: "craftRelic", key: recipe.id, uids: [a.uid, b.uid], owner, ...(wornMaterial ? { slot: C.itemSlot(wornMaterial) } : {}) }, owner || currentOwner);
    }
    function bindDrag(el, item) {
      el.draggable = allowed() && !bulkMode;
      el.addEventListener("dragstart", event => {
        if (!allowed() || bulkMode) { event.preventDefault(); return; }
        event.stopPropagation(); dragged = item.uid; event.dataTransfer.setData("application/x-haff-inventory", item.uid); event.dataTransfer.effectAllowed = "move";
      });
      el.addEventListener("dragend", () => { dragged = null; document.querySelectorAll(".inventory-drop-ready").forEach(el => el.classList.remove("inventory-drop-ready")); });
    }
    function dropHandler(el, handler) {
      el.addEventListener("dragover", event => { if (!dragged || !allowed() || bulkMode) return; event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = "move"; el.classList.add("inventory-drop-ready"); });
      el.addEventListener("dragleave", event => { if (!el.contains(event.relatedTarget)) el.classList.remove("inventory-drop-ready"); });
      el.addEventListener("drop", event => { if (!dragged || !allowed() || bulkMode) return; event.preventDefault(); event.stopPropagation(); const item = find(dragged); dragged = null; el.classList.remove("inventory-drop-ready"); if (item) handler(item); });
    }
    function bindDrop(el, owner, slot = null) {
      dropHandler(el, item => {
        const existing = slot && worn(owner, slot);
        if (existing?.uid === item.uid) return;
        if (existing?.kind === "relic" && item.kind === "relic" && recipeFor(item, existing)) combine(item, existing, owner);
        else perform({ type: "equip", uid: item.uid, owner, slot }, owner);
      });
    }
    function slotButton(owner, slot) {
      const item = worn(owner, slot), name = item ? C.itemInfo(item).name : `${slotName(slot)}空槽`;
      const cacheKey=`${owner}:${slot}`, signature=`${item?.uid || ''}:${item?.key || ''}:${allowed()}`, cached=slotsCache.get(cacheKey);
      if(cached?.signature===signature)return cached.el;
      const el = btn("", () => {
        bulkMode = false; bulkSelected.clear();
        const rect = el.getBoundingClientRect();
        if (!item && find(selected)) { perform({ type: "equip", uid: selected, owner, slot }, owner); return; }
        selected = item?.uid || null; if (relicSlots.includes(slot)) filter = "relic";
        craftOn = owner; onChange(owner);
        if (item) window.HaffLoadoutGuideUI?.showItem(item, document.querySelector(`.worn-icon[data-owner="${owner}"][data-slot="${slot}"]`) || el, { rect, status: `${Core.units[owner].name} · 已穿戴 · ${slotName(slot)}` });
      }, relicSlots.includes(slot) ? "relic-slot worn-icon" : "worn-icon", !allowed());
      el.dataset.quality = item ? C.itemInfo(item).quality : "none"; el.dataset.owner = owner; el.dataset.slot = slot;
      if (item && C.itemInfo(item).supreme) el.dataset.supreme = item.key;
      el.title = `${Core.units[owner].name} · ${name}${item ? `：${description(item)}` : ""}`; el.setAttribute("aria-label", el.title);
      if (item) el.setAttribute("aria-haspopup", "dialog");
      el.append(icon(item, slot)); bindDrop(el, owner, slot);
      if (item) bindDrag(el, item);
      slotsCache.set(cacheKey,{signature,el});
      return el;
    }
    function render(host, owner) {
      const work=()=>renderContents(host,owner);
      if(window.HaffPrepStability)window.HaffPrepStability.update(work);else work();
    }
    function renderContents(host, owner) {
      window.HaffPageMotion?.panel(host, `${owner}:${filter}:${craftOn}`);
      currentOwner = owner; const run = getRun();
      if (returnedRunId !== run.id) returnedItems.clear();
      const stock = run.inventory.filter(item => !item.owner).sort((a,b)=>Number(returnedItems.has(b.uid))-Number(returnedItems.has(a.uid)));
      if (bulkRunId !== run.id || !allowed()) { bulkMode = false; bulkSelected.clear(); }
      bulkRunId = run.id;
      const stockIds = new Set(stock.map(item => item.uid));
      for (const uid of bulkSelected) if (!stockIds.has(uid)) bulkSelected.delete(uid);
      const filtered = stock.filter(item => filter === "all" || item.kind === filter);
      let view=views.get(host);
      if(!view||!host.contains(view.grid)){
        const heading=n('div','armory-heading'),count=n('span'),filters=n('div','inventory-filters'),grid=n('div','unified-inventory');
        const toggle = btn('', () => {
          bulkMode = !bulkMode; bulkSelected.clear(); selected = null; craftOn = null; dragged = null;
          render(host, currentOwner);
        }, 'inventory-sale-toggle');
        toggle.append(saleIcon()); toggle.title = '批量出售'; toggle.setAttribute('aria-label', '批量出售');
        heading.append(n('h3','','装备库存'),count,toggle);grid.setAttribute('aria-label','装备库存与藏品合成');
        for(const [key,label]of [['all','全部'],['gear','装备'],['relic','藏品']]){
          const el=btn(label,()=>{filter=key;render(host,currentOwner);});el.dataset.inventoryFilter=key;filters.append(el);
        }
        const bulk = n('div', 'inventory-bulk'), selection = n('label', 'inventory-bulk-select'), selectAll = n('input');
        selectAll.type = 'checkbox'; selectAll.addEventListener('change', () => {
          for (const item of getRun().inventory.filter(item => !item.owner && (filter === 'all' || item.kind === filter))) {
            if (selectAll.checked) bulkSelected.add(item.uid); else bulkSelected.delete(item.uid);
          }
          render(host, currentOwner);
        });
        selection.append(selectAll, n('span', '', '全选当前'));
        const clear = btn('清空', () => { bulkSelected.clear(); render(host, currentOwner); }, 'inventory-bulk-clear');
        const summary = n('output', 'inventory-bulk-summary'), value = n('strong'), quantity = n('span');
        summary.setAttribute('aria-live', 'polite'); summary.append(quantity, value);
        const sale = btn('出售已选', () => {
          const uids = [...bulkSelected];
          sellMany(uids, () => { for (const uid of uids) bulkSelected.delete(uid); if (host.isConnected) render(host, currentOwner); });
        }, 'inventory-bulk-sell');
        sale.prepend(saleIcon());
        bulk.append(selection, clear, summary, sale);
        dropHandler(grid,incoming=>{if(incoming.owner)perform({type:'equip',uid:incoming.uid,owner:null});});
        host.replaceChildren(heading,filters,bulk,grid);view={count,filters,grid,toggle,bulk,selectAll,clear,sale,value,quantity,items:new Map(),empty:n('p','inventory-empty','暂无库存'),detail:null};views.set(host,view);
      }
      const returnedCount = stock.filter(item=>returnedItems.has(item.uid)).length;
      view.count.textContent=`${stock.length} 件${returnedCount ? ` · 已返还 ${returnedCount} 件` : ''}`;
      view.toggle.disabled = !allowed(); view.toggle.setAttribute('aria-pressed', String(bulkMode));
      view.toggle.title = bulkMode ? '结束多选' : '批量出售'; view.toggle.setAttribute('aria-label', view.toggle.title);
      view.bulk.hidden = !bulkMode; view.grid.dataset.bulk = String(bulkMode);
      const visibleSelected = filtered.filter(item => bulkSelected.has(item.uid)).length;
      view.selectAll.checked = filtered.length > 0 && visibleSelected === filtered.length;
      view.selectAll.indeterminate = visibleSelected > 0 && visibleSelected < filtered.length;
      view.selectAll.disabled = !allowed() || !filtered.length;
      view.sale.disabled = view.clear.disabled = !allowed() || !bulkSelected.size;
      const total = bulkSelected.size ? C.saleSelection(run, [...bulkSelected]).total : 0;
      view.quantity.textContent = `已选 ${bulkSelected.size} 件${bulkSelected.size > visibleSelected ? `（其他分类 ${bulkSelected.size - visibleSelected} 件）` : ''}`;
      view.value.textContent = `+${(total / 10000).toLocaleString('zh-CN', { maximumFractionDigits: 2 })} 万`;
      for(const el of view.filters.children)el.setAttribute('aria-pressed',String(filter===el.dataset.inventoryFilter));
      const grid=view.grid,visible=[];
      for (const item of filtered) {
        const data = C.itemInfo(item);let el=view.items.get(item.uid);
        if(!el){
          el=btn('',()=>{
            if (bulkMode) { if (bulkSelected.has(item.uid)) bulkSelected.delete(item.uid); else bulkSelected.add(item.uid); }
            else { selected=item.uid;craftOn=null; }
            render(host,currentOwner);
          },'inventory-item');el.dataset.inventoryUid=item.uid;
          el.append(icon(item),n('small','item-tier',data.supreme?'臻':item.kind==='relic'?'藏':''));bindDrag(el,item);
          el.dataset.itemVisual = `${item.kind}:${item.key}`;
          dropHandler(el,incoming=>{const target=find(item.uid);if(target)combine(incoming,target,null);});view.items.set(item.uid,el);
        }
        // Reforging keeps the UID, so the cached button survives but its art
        // must follow the new item key. Preserve the grid, focus and scroll.
        const visual = `${item.kind}:${item.key}`;
        if (el.dataset.itemVisual !== visual) {
          el.querySelector(".equipment-icon").replaceWith(icon(item));
          el.querySelector(".item-tier").textContent = data.supreme ? "臻" : item.kind === "relic" ? "藏" : "";
          el.dataset.itemVisual = visual;
        }
        el.disabled=!allowed();el.draggable=allowed() && !bulkMode;
        if(returnedItems.has(item.uid))el.dataset.returned='true';else delete el.dataset.returned;
        if (bulkMode) { el.setAttribute('role', 'checkbox'); el.setAttribute('aria-checked', String(bulkSelected.has(item.uid))); el.removeAttribute('aria-pressed'); }
        else { el.removeAttribute('role'); el.removeAttribute('aria-checked'); el.setAttribute('aria-pressed', String(selected === item.uid)); }
        el.dataset.quality = data.quality; el.title = `${data.name} · ${kindName(item)}${bulkMode ? ` · 售价 ${(C.salePrice(run, item) / 10000).toLocaleString('zh-CN')} 万` : ''}`; el.setAttribute("aria-label", el.title);
        if (data.supreme) el.dataset.supreme = item.key; else delete el.dataset.supreme;
        visible.push(el);
      }
      if(!visible.length)visible.push(view.empty);
      const visibleSet=new Set(visible);
      for(const el of [...grid.children])if(!visibleSet.has(el))el.remove();
      visible.forEach((el,index)=>{if(grid.children[index]!==el)grid.insertBefore(el,grid.children[index]||null);});
      for(const uid of view.items.keys())if(!find(uid))view.items.delete(uid);
      const item = find(selected); if (bulkMode || !item) {view.detail?.remove();view.detail=null;return;}
      const detail = n("div", "inventory-detail"), data = C.itemInfo(item);
      detail.dataset.inventoryUid=item.uid;detail.dataset.kind=item.kind;
      if(view.detail?.dataset.inventoryUid===item.uid){const height=view.detail.getBoundingClientRect().height;if(height>0)detail.style.minHeight=`${height}px`;}
      detail.dataset.quality = data.quality;
      if (data.supreme) detail.dataset.supreme = item.key;
      detail.append(n("strong", "", data.name), n("small", "", `${kindName(item)} · ${item.owner ? `${Core.units[item.owner].name}佩戴` : "库存"}`));
      detail.append(n("small", "item-base-stats", attributes(item)), n("p", "item-special-effect", item.kind === "relic" ? data.effect : data.passive || ""));
      if (item.kind === "relic") {
        const rules = n("details", "item-rule-details");
        rules.append(n("summary", "", "判定细则与配方"), n("p", "", data.details), n("small", "", `原作尺寸 ${data.grid.join("×")} · ${data.acquisition}`));
        detail.append(rules);
      }
      if (fusion === item.uid) {
        const reveal = n("div", "relic-fusion-result"); reveal.setAttribute("role", "status"); reveal.dataset.quality = data.quality;
        const stories = { experiment: "两份数据终于拼齐，终端亮起红光。这把的伤害，有着落了！", quantum: "存储核心亮起红光，能量读数猛地跃升。你笑着把它收进了装备栏。", mechanical: "零件严丝合缝地咬合，表盘映出红光。听见那声清脆的走针声，你就知道这把稳了。" };
        reveal.append(icon(item), n("strong", "", `${data.quality === "red" ? "红色" : "金色"}藏品 · ${data.name}`), n("p", "", stories[item.key] || data.story));
        detail.insertBefore(reveal, detail.firstChild); fusion = null;
      }
      const actions = n("div", "inventory-actions");
      if (item.owner) {
        if(item.kind==='relic'){const position=n('select');position.disabled=true;position.setAttribute('aria-label','藏品装备位置');position.append(n('option','',`已穿戴 · ${slotName(C.itemSlot(item))}`));actions.append(position);}
        const remove=btn('卸回库存',()=>perform({type:'equip',uid:item.uid,owner:null}),'',!allowed());remove.dataset.inventoryAction='toggle';actions.append(remove);
      }
      else {
        const slots = n("select");
        if (item.kind === "relic") {
          slots.setAttribute("aria-label", "藏品装备位置");const auto=n("option","","自动填入空藏品位");auto.value="";slots.append(auto);
          for (const slot of relicSlots) {const current=worn(owner,slot),option=n("option","",`${slotName(slot)} · ${current?`替换${C.itemInfo(current).name}`:"空槽"}`);option.value=slot;slots.append(option);}
          actions.append(slots);
        }
        const equip=btn(`装备给${Core.units[owner].name}`, () => perform({ type: "equip", uid: item.uid, owner, slot: item.kind === "relic" ? slots.value || undefined : undefined }), "primary", !allowed());equip.dataset.inventoryAction='toggle';actions.append(equip);
      }
      const saleValue = data.supreme ? `${C.salePrice(run, item).toLocaleString("zh-CN")} 哈夫币` : `${(C.salePrice(run, item) / 10000).toLocaleString("zh-CN")} 万`;
      actions.append(btn(`出售 · ${saleValue}`, () => sell(item), "", !!item.owner || !allowed()));
      detail.append(actions);
      const availableRecipes = item.kind === "relic" ? C.relicRecipes : [];
      if (availableRecipes.some(recipe => recipe.parts.includes(item.key))) {
        const label = n("label", "craft-location", "合成位置 "), location = n("select"); location.setAttribute("aria-label", "合成位置");
        if (!item.owner) { const option = n("option", "", "装备库存"); option.value = ""; location.append(option); }
        const targetOwner = item.owner || owner, option = n("option", "", `${Core.units[targetOwner].name}身上`); option.value = targetOwner; location.append(option);
        craftOn = item.owner || (craftOn === owner ? owner : null); location.value = craftOn || "";
        location.addEventListener("change", () => { craftOn = location.value || null; render(host, owner); }); label.append(location); detail.append(label);
        const list = n("div", "inventory-recipes");
        for (const recipe of availableRecipes.filter(recipe => recipe.parts.includes(item.key))) {
          const otherKey = recipe.parts[1 - recipe.parts.indexOf(item.key)];
          const other = run.inventory.find(other => other.uid !== item.uid && other.kind === item.kind && other.key === otherKey && (!other.owner || other.owner === craftOn));
          const outputItem = { kind: "relic", key: recipe.output };
          const row = n("div", "inventory-recipe"), output = C.itemInfo(outputItem), ingredients = C.relics;
          row.dataset.quality = output.quality;
          row.append(n("strong", "", output.name), n("small", "", otherKey === item.key ? `${data.name} × 2` : `${data.name} + ${ingredients[otherKey].name}`));
          const product = row.firstElementChild;
          if (item.kind === "relic") product.prepend(icon(outputItem));
          const quality = ({ green: "绿色", blue: "蓝色", purple: "紫色", gold: "金色", red: "红色" })[output.quality] || "";
          const preview = `${output.name}\n${quality} · ${item.kind === "relic" ? "藏品融合" : Core.equipmentSlots[output.slot]} · 合成后属性\n${description(outputItem)}${output.cooldownReduction ? `\n技能冷却 −${output.cooldownReduction} 次行动` : ""}`;
          row.dataset.hiTip = preview; row.removeAttribute("title");
          product.classList.add("inventory-recipe-output"); product.tabIndex = 0;
          product.dataset.hiTip = preview; product.setAttribute("aria-label", preview);
          product.addEventListener("click", () => product.focus({ preventScroll: true }));
          row.append(btn(other ? "合成" : "缺藏品", () => combine(item, other, craftOn), "", !other || !allowed())); list.append(row);
        }
        detail.append(list);
      }
      if(view.detail)view.detail.replaceWith(detail);else host.append(detail);view.detail=detail;
    }
    function revealReturned(uids) {
      returnedItems.clear(); returnedRunId = getRun().id;
      for (const uid of uids) if (find(uid) && !find(uid).owner) returnedItems.add(uid);
      if (!returnedItems.size) return;
      filter = 'all'; bulkMode = false; bulkSelected.clear(); selected = null; craftOn = null; dragged = null;
    }
    return { render, slotButton, bindDrop, revealReturned, hasItems: owner => getRun().inventory.some(item => item.owner === owner) };
  } };
})();
