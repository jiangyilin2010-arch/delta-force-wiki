(function (root) {
  'use strict';
  const kinds = { toxicMist: 'pair', frag: 'splash', missile: 'splash', bomb: 'delayed', reconArrow: 'mark', air: 'control', cryoBurst: 'splash', dewar: 'row', resonance: 'row', volt: 'row', fire: 'row', sonicTrap:'row', sonicQuake:'splash', sonicFrag:'splash', spiderNest:'row', smartSmoke:'row', hunterSpider:'splash', falcon:'row', pulseGrenade:'row', spyCamera:'mark', irritantSmoke:'row' };
  // Preview only the skill's own effects; equipment procs remain conditional.
  function describe(Core, state, actorId, action, primary = null) {
    const actor = state.units.find(unit => unit.id === actorId);
    let kind = action?.id === 'decode' && state.buildcraftVersion && actor?.stars >= 2 ? 'mark' : kinds[action?.id];
    let bondHint = '';
    if(state.buildcraftVersion===2&&actor?.side==='ally'){
      const bonds=Core.Buildcraft.evaluate(state.units.filter(u=>u.side==='ally').map(u=>u.id),state.bondRevision||1);
      const group=bonds.find(b=>b.active&&b.present.includes(actorId)&&['dot','flash','demolition'].includes(b.category)&&Core.Buildcraft.triggers[b.category].includes(action?.id));
      if(group){
        const ready=state.buildcraftRounds[group.key]!==state.round;
        const all=group.mastered||ready&&(group.profile.all||group.profile.targets===Infinity);
        if(all){
          kind=group.category==='flash'?'mark':'splash';
          bondHint=group.category==='flash'?(group.mastered?'全体获得处决标记':'全体致盲与标记'):group.category==='dot'?(group.mastered?'全体持续伤害感染':'全体电击与持续伤害引爆'):(state.buildcraftEngine?.shells||0)===2?'全场饱和轰炸':ready?'全场追加爆破':'爆破蓄能 · 击杀可连环殉爆';
        }
      }
    }
    if (!actor || !kind || !action.available || action.target !== 'enemy') return null;
    const side = actor.side === 'ally' ? 'enemy' : 'ally';
    let units = Core.combatants(state, side);
    if (kind === 'pair') { const target=units.find(unit=>unit.id===primary); units=target ? [target,...units.filter(unit=>unit!==target)].slice(0,2) : []; }
    if (kind === 'row') {
      const target = units.find(unit => unit.id === primary);
      units = target ? Core.areaTargets(state, target) : [];
      if (target && action.id === 'resonance' && state.buildcraftVersion && actor.stars >= 2) units = [...units, ...Core.combatants(state, side).filter(unit => !units.includes(unit)).slice(0, actor.stars - 1)];
    }
    if(state.buildcraftVersion===2&&Core.Buildcraft.triggers.dot.includes(action.id)){
      const bond=Core.Buildcraft.evaluate(state.units.filter(u=>u.side==='ally').map(u=>u.id),state.bondRevision||1).find(b=>b.key==='recon'&&b.active&&b.present.includes(actorId));
      if(bond){
        const foes=Core.combatants(state,side);
        const extra=state.buildcraftRounds.recon!==state.round ? foes.filter(u=>u.id!==primary&&(!u.shock||u.shock.ticks<bond.profile.ticks)).concat(foes).filter((u,i,list)=>list.indexOf(u)===i).slice(0,bond.profile.targets) : [];
        units=[...new Set([...units,...extra,...foes.filter(u=>['burn','bleeding','shock','coldField','wireField','spiderMines','aerosolField','venom'].some(key=>u[key]))])];
        bondHint='持续伤害 · 感染叠层';
      }
    }
    return { kind, primary: action.targets.includes(primary) ? primary : null, affected: units.map(unit => unit.id), ...(bondHint?{bondHint}:{}) };
  }
  function bind(Core, state, actorId, action, container) {
    delete container.dataset.previewHint;
    const info = describe(Core, state, actorId, action);
    if (!info) return;
    const buttons = [...container.querySelectorAll('button[data-target]')];
    let hovered = null;
    function paint() {
      if (!buttons.length || buttons[0].parentElement !== container) return;
      const focused = buttons.find(button => button === document.activeElement)?.dataset.target;
      const primary = hovered || focused;
      const current = describe(Core, state, actorId, action, primary);
      container.dataset.previewHint = info.kind === 'control' ? '全体击倒 · 点击敌人施放' : info.kind === 'mark' ? '全体标记 · 点击敌人施放' : info.kind === 'delayed' ? '延时爆炸波及全体 · 点击附着目标' : '橙框为波及范围 · 点击主目标施放';
      if(info.bondHint)container.dataset.previewHint=info.bondHint+' · 点击主目标施放';
      if(info.kind==='pair')container.dataset.previewHint='毒蚀覆盖两名敌人 · 悬停查看范围';
      if(info.kind==='row')container.dataset.previewHint='目标及同排敌人 · 悬停查看范围';
      for (const button of buttons) {
        delete button.dataset.preview; delete button.dataset.previewLabel;
        if (!current.affected.includes(button.dataset.target)) continue;
        const main = primary === button.dataset.target;
        button.dataset.preview = info.kind === 'mark' ? 'mark' : main ? 'primary' : 'splash';
        button.dataset.previewLabel = info.kind === 'control' ? '全体击倒' : info.kind === 'mark' ? '侦察标记' : main ? info.kind === 'delayed' ? '炸弹附着' : '主目标' : info.kind === 'delayed' ? '延时波及' : primary ? '波及' : '波及范围';
        if(info.bondHint)button.dataset.previewLabel=main?'主目标':info.bondHint;
      }
    }
    for (const button of buttons) {
      const suffix = info.kind === 'control' ? '，击倒所有存活敌人' : info.kind === 'mark' ? '，标记所有存活敌人' : info.kind === 'delayed' ? '，下次行动前引爆并波及其他存活敌人' : '，同时波及其他敌人';
      button.setAttribute('aria-label', button.getAttribute('aria-label') + suffix);
      button.addEventListener('pointerenter', () => { hovered = button.dataset.target; paint(); });
      button.addEventListener('pointerleave', () => { hovered = null; paint(); });
      button.addEventListener('focus', paint);
      button.addEventListener('blur', () => { queueMicrotask(paint); });
    }
    paint();
  }
  const api = { describe, bind };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HaffTargetPreview = api;
})(typeof window === 'undefined' ? globalThis : window);
