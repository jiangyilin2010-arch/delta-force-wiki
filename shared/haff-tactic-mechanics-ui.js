(function (root) {
  'use strict';
  const M = root.HaffTacticMechanics, T = root.HaffTactics;
  const colors = { crossfire: '#ffc66f', bombardment: '#ff745f', execution:'#ff5065' };
  function combat(state) {
    const strip = document.querySelector('#battle-view .turn-strip'); if (!strip) return;
    const rows = [...(root.HaffRoleBonds?.status(state)||[]),...M.status(state)]; let host = document.getElementById('htm-hud');
    if (!rows.length) { host?.remove(); return; }
    if (!host) { host = document.createElement('div'); host.id = 'htm-hud'; host.className = 'hbc-engine-hud'; host.setAttribute('aria-label', '战术蓄能与伤害'); strip.querySelector('.strip-label').after(host); }
    const signature = JSON.stringify(rows); if (host.dataset.signature === signature) return; host.dataset.signature = signature;
    for (const old of [...host.children]) if (!rows.some(row => row.family === old.dataset.family)) old.remove();
    for (const row of rows) {
      let button = host.querySelector(`[data-family="${row.family}"]`);
      if (!button) {
        button = document.createElement('button'); button.type = 'button'; button.className = 'hbc-engine'; button.dataset.family = row.family; button.style.setProperty('--bond', row.color||colors[row.family]);
        for (const tag of ['b', 'small', 'i']) button.append(document.createElement(tag)); host.append(button);
      }
      button.querySelector('b').textContent = row.primary ? ({roleAssault:'↗',roleSupport:'✚',roleRecon:'◎',roleEngineer:'⬡'})[row.family] : row.family === 'execution' ? '×' : row.family === 'crossfire' ? '⌖' : '✹';
      button.querySelector('small').textContent = row.counter;
      button.querySelector('i').style.transform = `scaleX(${Math.min(1, row.current / row.max)})`;
      const key = (state.tactics || []).find(key => T.doctrines[key].family === row.family);
      const text = `${row.name}\n${row.counter} · 已触发 ${row.triggers} 次 · ${row.primary?'主羁绊':'战术'}伤害 ${row.damage}\n${row.detail||T.doctrines[key].effect}`;
      button.dataset.hiTip = text; button.setAttribute('aria-label', text);
      button.onclick = () => {
        document.querySelector('.htm-help')?.remove();
        const dialog = document.createElement('dialog'); dialog.className = 'hbc-help htm-help';
        const heading = document.createElement('h2'); heading.textContent = row.name; dialog.append(heading); dialog.setAttribute('aria-label', row.name);
        for (const line of text.split('\n').slice(1)) { const p = document.createElement('p'); p.textContent = line; dialog.append(p); }
        const close = document.createElement('button'); close.type = 'button'; close.textContent = '返回战场'; close.onclick = () => dialog.close(); dialog.append(close);
        dialog.addEventListener('close', () => dialog.remove()); document.body.append(dialog); dialog.showModal(); close.focus();
      };
    }
  }
  function feedback(scene, event, state, reduced) {
    for (const burst of [...(event.tacticBursts || []),...(event.roleBursts || [])].slice(0, 8)) {
      const source = state.units.find(u => u.id === burst.source); if (!source) continue;
      const from = scene.position(source.side, source.slot), color = parseInt((colors[burst.family]||root.HaffRoleBonds?.definitions.find(d=>d.key===burst.family)?.color||'#dbdda1').slice(1), 16);
      const graphic = scene.keep(scene.add.graphics()).setDepth(96);
      for (const id of new Set(burst.targets)) {
        const target = state.units.find(u => u.id === id); if (!target) continue;
        const p = scene.position(target.side, target.slot), x = p.x, y = p.y - 58;
        if (burst.family === 'execution') {
          graphic.lineStyle(14,color,.22).lineBetween(x-54,y-60,x+54,y+60).lineBetween(x-54,y+60,x+54,y-60).lineStyle(3,0xffe4da,.95).lineBetween(x-54,y-60,x+54,y+60).lineBetween(x-54,y+60,x+54,y-60);
        } else if (['crossfire','roleAssault','roleRecon','roleSupport'].includes(burst.family)) {
          graphic.lineStyle(8, color, .2).lineBetween(from.x, from.y - 58, x, y).lineStyle(2, 0xfff1d7, .95).lineBetween(from.x, from.y - 58, x, y);
          graphic.lineStyle(2, color, .9).strokeRect(x - 29, y - 29, 58, 58).lineBetween(x - 44, y, x + 44, y).lineBetween(x, y - 44, x, y + 44);
        } else {
          graphic.lineStyle(18, color, .18).lineBetween(x - 48, y - 200, x, y).lineStyle(3, 0xffe8bd, .9).lineBetween(x - 48, y - 200, x, y);
          graphic.lineStyle(4, color, .9).strokeCircle(x, y, 40).lineStyle(2, color, .45).strokeCircle(x, y, 66);
        }
      }
      scene.tweens.add({ targets: graphic, alpha: 0, duration: reduced ? 180 : 1000, ease: 'Cubic.easeOut', onComplete: () => scene.discard(graphic) });
    }
  }
  root.HaffTacticMechanicsUI = { combat, feedback };
})(window);
