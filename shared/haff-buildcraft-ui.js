(function (root) {
  'use strict';
  const B = root.HaffBuildcraft;
  const make = (tag, cls, text) => { const el = document.createElement(tag); el.className = cls || ''; if (text !== undefined) el.textContent = text; return el; };
  let current = null;
  const bondContexts = new WeakMap();
  let shopOpen = false;
  function explain(title, lines, content) {
    document.querySelector('.hbc-help')?.remove();
    const dialog = make('dialog', 'hbc-help');
    const heading = make('h2', '', title); heading.id = 'hbc-help-title'; dialog.setAttribute('aria-labelledby', heading.id);
    dialog.append(heading, ...lines.map(line => make('p', '', line)));
    if (content) dialog.append(content);
    const close = make('button', 'primary', document.querySelector('#battle-view')?.hidden === false ? '返回战场' : '返回整备'); close.type = 'button';
    close.onclick = () => dialog.close(); dialog.addEventListener('close', () => dialog.remove());
    dialog.append(close); document.body.append(dialog); dialog.showModal(); close.focus();
  }
  function bondDetail(bond, run = current?.run) {
    if (root.HaffBondMembers?.detail) { explain(bond.name, [], root.HaffBondMembers.detail(bond, run, root.HaffWar.units, bond.primary?'主羁绊只计算上阵的不同干员，前后排均计数；同一干员的重复档案和星级不增加人数。':B.limitNote, false)); return; }
    const names = bond.members.map(id => {const state=current ? root.HaffBondMembers?.state(current.run,id) : null,label=root.HaffBondMembers?.states[state]?.label;return `${root.HaffWar.units[id].name}${label ? ` · ${label}` : ''}：${B.reasons?.[bond.category]?.[id] || ''}`;}).join('\n');
    explain(bond.name, [names, ...bond.tiers.map((text,i)=>`${bond.thresholds[i]} 人 · ${text}`), B.limitNote]);
  }
  function bindBond(element, bond, run) {
    element.dataset.hiBond = bond.key; element.dataset.hiTip = bond.name;
    element.dataset.primary = String(!!bond.primary);
    element.setAttribute('aria-haspopup', 'dialog'); bondContexts.set(element, run);
    element.onclick = () => bondDetail(bond, run || current?.run);
  }
  function bondTooltip(key, source) {
    const bond = (B.allBonds || B.bonds).find(item => item.key === key);
    return bond && root.HaffBondMembers?.detail(bond, bondContexts.get(source) || current?.run, root.HaffWar.units, bond.primary?'主羁绊只计算上阵的不同干员，前后排均计数；重复档案不增加人数。':B.limitNote);
  }
  function tagRow(id, run = current?.run) {
    const row = make('div', 'hbc-tags');
    for (const bond of B.tags(id)) {
      const tag = make('button', 'hbc-tag', bond.name); tag.type = 'button'; tag.style.setProperty('--bond', bond.color);
      bindBond(tag, bond, run); row.append(tag);
    }
    return row;
  }
  function offer(card, run, id, C) {
    card.dataset.operator = id;
    const info = B.promotion(id, run.copies[id]); card.dataset.promotion = String(info.ready);
    card.append(tagRow(id, run));
    const detail = make('button', 'hbc-promotion', info.maxed ? '三星技能已解锁' : `${info.ready ? '✦ 再招募即升星' : `距 ${info.next} 星还差 ${info.missing} 份`} · 查看强化`);
    detail.type = 'button'; detail.onclick = () => explain(`${root.HaffWar.units[id].name} · 技能升星`, [`当前档案 ${run.copies[id] || 0} / 9`, `二星（3 份） · ${B.upgrade(id, 2)}`, `三星（9 份） · ${B.upgrade(id, 3)}`, '强化随升星自动生效，无需额外装备。']);
    card.append(detail, make('span', 'hbc-upgrade-copy', B.upgrade(id, info.next)));
    const now = B.evaluateAll(run.deployed);
    const future = B.evaluateAll([...run.deployed, id]);
    const gains = future.filter((b, i) => b.tier > now[i].tier);
    if (gains.length) card.append(make('span', 'hbc-combo-hint', `上阵后：${gains.map(b => `${b.name} ${b.count}`).join(' / ')}`));
    // Keep the original transactional recruit button last and visually dominant.
    const buy = [...card.children].find(el => el.tagName === 'BUTTON' && !el.className.includes('hbc-'));
    if (buy) card.append(buy);
  }
  function prep(host, run, C, legacy) {
    current = { run, C };
    const group = make('section', 'hbc-bonds'); group.setAttribute('aria-label', '多重羁绊');
    group.append(make('h3', '', '阵容羁绊'), make('small', 'hbc-muted', '逐人进阶 · 全员满级'));
    const active = B.evaluateAll(run.deployed.filter(id => run.copies[id] > 0)).sort((a, b) => Number(!!b.primary)-Number(!!a.primary) || b.count - a.count);
    for (const bond of active) {
      if (bond === active[0] || !bond.primary && active[active.indexOf(bond)-1]?.primary) group.append(make('small','hbc-group-label',bond.primary?'主羁绊':'技能羁绊'));
      const row = make('button', 'hbc-bond'); row.type = 'button'; row.dataset.active = String(bond.active); row.dataset.mastered = String(bond.mastered); row.style.setProperty('--bond', bond.color);
      row.append(make('strong', '', bond.name), make('b', '', `${bond.count}/${bond.nextThreshold || bond.thresholds.at(-1)}`), make('small', '', bond.mastered ? `满级 · ${bond.mastery}` : `${bond.tier}/${bond.maxTier} 档 · 还差 ${bond.nextThreshold - bond.count} 人进阶`));
      bindBond(row, bond, run); group.append(row);
    }
    const old = make('details', 'hbc-legacy'); old.append(make('summary', '', '定位与后台加成'), legacy);
    host.replaceChildren(group, old);
    for (const card of document.querySelectorAll('#hbc-shop [data-operator]')) {
      card.querySelector('.hbc-combo-hint')?.remove();
      const before = B.evaluateAll(run.deployed), after = B.evaluateAll([...run.deployed, card.dataset.operator]);
      const gains = after.filter((b, i) => b.tier > before[i].tier);
      if (gains.length) { const hint = make('span','hbc-combo-hint',`上阵后：${gains.map(b=>`${b.name} ${b.count}`).join(' / ')}`); card.querySelector('button:last-child').before(hint); }
    }
  }
  function inspect(id, stars, campaign) {
    const previous=document.getElementById('hbc-inspect');
    if(campaign&&previous?.dataset.operator===id&&previous.dataset.stars===String(stars))return;
    document.getElementById('hbc-inspect')?.remove();
    if (!campaign) return;
    const panel = make('div', 'hbc-inspect'); panel.id = 'hbc-inspect'; panel.append(tagRow(id));
    panel.dataset.operator=id;panel.dataset.stars=String(stars);
    const next = stars >= 3 ? 3 : Math.max(2, stars + 1);
    panel.append(make('p', '', stars >= 2 ? `已生效 · ${B.upgrade(id, stars)}` : '一星 · 基础技能'));
    if (stars < 3) panel.append(make('small', '', `下一级 · ${B.upgrade(id, next)}`));
    document.getElementById('prep-stats').after(panel);
  }
  function layout(active) {
    document.body.classList.toggle('hbc-preparing', active);
    document.getElementById('hbc-shop')?.remove();
    document.getElementById('hbc-shop-toggle')?.remove();
    document.getElementById('hbc-ribbon')?.remove();
    document.getElementById('hbc-inspector-toggle')?.remove();
    document.getElementById('hbc-overview')?.remove();
    if (!active) { current = null; document.body.classList.remove('hbc-inspector-open'); return; }
    const button = make('button', 'hbc-inspector-toggle', '装备 / 技能'); button.id = 'hbc-inspector-toggle'; button.type = 'button';
    button.setAttribute('aria-expanded', String(document.body.classList.contains('hbc-inspector-open')));
    button.onclick = () => { const open = document.body.classList.toggle('hbc-inspector-open'); button.setAttribute('aria-expanded', String(open)); button.textContent = open ? '收起档案' : '装备 / 技能'; root.HaffPageMotion?.panel(document.querySelector(open ? '.formation-inspector' : '.squad-stage')); };
    document.querySelector('.board-heading').append(button);
    document.getElementById('hbc-panel-close')?.remove();
    const closePanel = make('button','hbc-panel-close','收起档案 ×'); closePanel.id='hbc-panel-close';closePanel.type='button';
    closePanel.onclick=()=>{document.body.classList.remove('hbc-inspector-open');button.setAttribute('aria-expanded','false');button.textContent='装备 / 技能';button.focus();root.HaffPageMotion?.panel(document.querySelector('.squad-stage'));};
    document.querySelector('.formation-inspector').prepend(closePanel);
    const overview = make('button', 'hbc-overview', '已选战术'); overview.type = 'button'; overview.id = 'hbc-overview';
    overview.onclick = () => { if (!current) return; const {run,C}=current; explain('已选战术', ['战术总威胁：' + C.tacticRiskText(C.tacticThreat(run)), ...C.activeTactics(run).map(d=>d.name+'：'+C.tacticDescription(d))]); };
    document.querySelector('.mission-band').append(overview);
  }
  function mountShop(dock) {
    const toggle = make('button', 'hbc-shop-toggle', '干员招募'); toggle.id = 'hbc-shop-toggle'; toggle.type = 'button';
    toggle.setAttribute('aria-controls', dock.id);
    function paint() {
      if (root.HaffPageMotion?.toggle && dock.isConnected) root.HaffPageMotion.toggle(dock, shopOpen); else dock.hidden = !shopOpen;
      toggle.setAttribute('aria-expanded', String(shopOpen));
      toggle.textContent = shopOpen ? '收起招募 ▴' : '干员招募 ▾';
    }
    toggle.onclick = () => { shopOpen = !shopOpen; paint(); };
    document.querySelector('.mission-band').insertBefore(toggle, document.getElementById('hbc-overview'));
    document.querySelector('#prep-view .formation-workspace').before(dock);
    paint();
  }
  function feedback(scene, event, display, reduced) {
    engineFX(scene,event,display,reduced);
    if (!event.links?.length) return;
    for (const shot of event.effects.filter(effect => effect.type === 'bondShot')) {
      const source = display.units.find(unit => unit.id === shot.source), target = display.units.find(unit => unit.id === shot.target);
      if (source && target) scene.projectile(scene.position(source.side, source.slot), scene.position(target.side, target.slot), 0xffe9a9, 'shot');
    }
    const links = [...event.links].sort((a,b)=>Number(b.label.startsWith('质变'))-Number(a.label.startsWith('质变'))).filter((item,index,all)=>all.findIndex(x=>x.label===item.label)===index).slice(0, 3);
    document.getElementById('hbc-ribbon')?.remove();
    const ribbon=make('div','hbc-ribbon');ribbon.id='hbc-ribbon';ribbon.setAttribute('role','status');ribbon.dataset.mastered=String(links.some(item=>item.label.startsWith('满级')));
    for(const item of links){const text=make('span','',item.label);text.style.color=B.bonds.find(bond=>bond.key===item.bond)?.color||'#ffe39b';ribbon.append(text);}
    document.getElementById('battlefield').append(ribbon);
    const fade={alpha:1};scene.tweens.add({targets:fade,alpha:0,delay:1500,duration:300,onUpdate:()=>{ribbon.style.opacity=String(fade.alpha)},onComplete:()=>ribbon.remove()});
    for (const [index, item] of links.entries()) {
      const source = display.units.find(u => u.id === item.source), target = display.units.find(u => u.id === item.target);
      if (!source || !target) continue;
      const a = scene.position(source.side, source.slot), b = scene.position(target.side, target.slot);
      const hex = B.bonds.find(bond => bond.key === item.bond)?.color || '#ffe39b', color = parseInt(hex.slice(1), 16);
      const graphic = scene.keep(scene.add.graphics()).setDepth(90);
      graphic.lineStyle(7, color, .16).lineBetween(a.x, a.y, b.x, b.y).lineStyle(2, color, .9).lineBetween(a.x, a.y, b.x, b.y).strokeCircle(a.x, a.y, 24).strokeCircle(b.x, b.y, 32);
      scene.tweens.add({ targets: graphic, alpha: 0, duration: reduced ? 250 : 1200, onComplete: () => scene.discard(graphic) });

    }
  }
  // Compact, event-driven indicators share the action rail; never cover the playfield.
  function combat(state) {
    const strip=document.querySelector('#battle-view .turn-strip');if(!strip)return;
    const rows=B.Engines.status(state,B.evaluate(state.units.filter(u=>u.side==='ally').map(u=>u.id),state.bondRevision||1));
    let host=document.getElementById('hbc-engine-hud');
    if(!rows.length){host?.remove();return;}
    if(!host){host=make('div','hbc-engine-hud');host.id='hbc-engine-hud';host.setAttribute('aria-label','满级羁绊蓄能');strip.querySelector('.strip-label').after(host);}
    const signature=JSON.stringify(rows);if(host.dataset.signature===signature)return;host.dataset.signature=signature;
    for(const old of [...host.children])if(!rows.some(row=>row.key===old.dataset.engine))old.remove();
    for(const row of rows){
      let button=host.querySelector(`[data-engine="${row.key}"]`);
      if(!button){button=make('button','hbc-engine');button.type='button';button.dataset.engine=row.key;button.style.setProperty('--bond',row.color);button.append(make('b','',row.icon),make('small',''),make('i',''));host.append(button);}
      button.querySelector('small').textContent=row.key==='recon'?`${row.current}层`:row.key==='demolition'?`${row.current}/3`:row.key==='breach'?`${row.current}次`:row.key==='smoke'?`${row.current}轮`:`${Math.floor(row.current/row.max*100)}%`;
      button.querySelector('i').style.transform=`scaleX(${Math.min(1,row.current/row.max)})`;
      button.dataset.hiTip=`${row.name}\n${row.label} · 羁绊伤害 ${row.damage}\n${row.detail}`;
      button.setAttribute('aria-label',button.dataset.hiTip);
      button.onclick=()=>explain(row.name,[row.label,`本场羁绊伤害 ${row.damage}`,row.detail]);
    }
  }
  function engineFX(scene,event,display,reduced){
    const bursts=(event.bondBursts||[]).filter((item,index,all)=>all.findIndex(x=>x.bond===item.bond&&x.source===item.source)===index).slice(0,8);
    for(const item of bursts){
      const source=display.units.find(u=>u.id===item.source);if(!source)continue;
      const from=scene.position(source.side,source.slot),color=parseInt(B.bonds.find(b=>b.key===item.bond).color.slice(1),16);
      const g=scene.keep(scene.add.graphics()).setDepth(95);
      for(const id of [...new Set(item.targets)]){
        const target=display.units.find(u=>u.id===id);if(!target)continue;
        const p=scene.position(target.side,target.slot),x=p.x,y=p.y-58;
        if(item.bond==='smoke'){g.lineStyle(4,color,.6).lineBetween(from.x,from.y-58,x,y).lineStyle(1,0xffffff,.9).lineBetween(from.x,from.y-64,x,y-6);}
        if(item.bond==='demolition'){g.lineStyle(4,color,.8).strokeCircle(x,y,42).lineStyle(2,color,.4).strokeCircle(x,y,60);g.lineBetween(x-65,y,x+65,y).lineBetween(x,y-65,x,y+65);}
        if(item.bond==='breach'){g.lineStyle(3,color,.9).strokeRect(x-32,y-32,64,64).lineBetween(x-48,y-48,x+48,y+48).lineBetween(x-48,y+48,x+48,y-48);}
        if(item.bond==='defense'){g.lineStyle(15,color,.25).lineBetween(from.x,from.y-58,x,y).lineStyle(4,0xdbf7ff,.9).lineBetween(from.x,from.y-58,x,y).strokeCircle(x,y,45);}
        if(item.bond==='charge'){g.lineStyle(4,color,.8).strokeEllipse(x,y,110,65).lineStyle(2,color,.5).strokeEllipse(x,y,150,95);}
        if(item.bond==='recon'){g.lineStyle(2,color,.85).strokeCircle(x,y,45);for(let i=0;i<6;i++){const a=i*Math.PI/3;g.lineBetween(x+Math.cos(a)*18,y+Math.sin(a)*18,x+Math.cos(a)*64,y+Math.sin(a)*64);}}
      }
      scene.tweens.add({targets:g,alpha:0,duration:reduced?200:1000,ease:'Cubic.easeOut',onComplete:()=>scene.discard(g)});
    }
  }
  function displayEffects(event){
    const effects=[],groups=new Map();
    for(const effect of event.effects){
      if(effect.type!=='damage'||!effect.bond){effects.push(effect);continue;}
      const key=`${effect.bond}:${effect.target}`,previous=groups.get(key);
      if(previous){previous.value+=effect.value;previous.critical=previous.critical&&effect.critical;}
      else{const copy={...effect};groups.set(key,copy);effects.push(copy);}
    }
    return effects;
  }
  root.HaffBuildcraftUI = { offer, prep, inspect, layout, mountShop, requestShopOpen() { shopOpen = true; }, feedback, bondTooltip, combat, displayEffects };
})(window);
