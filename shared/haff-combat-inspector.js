(function () {
  'use strict';
  const n=(tag,cls,text)=>{const el=document.createElement(tag);el.className=cls||'';if(text!==undefined)el.textContent=text;return el;};
  const button=(label,fn)=>{const el=n('button','',label);el.type='button';el.addEventListener('click',fn);return el;};
  const dialog=n('dialog','combat-inspector');dialog.setAttribute('aria-labelledby','ci-title');
  const heading=n('header','ci-heading'),title=n('h2','','战况档案');title.id='ci-title';
  const close=button('返回战场',()=>dialog.close());heading.append(title,close);
  const roster=n('nav','ci-roster');roster.setAttribute('aria-label','查看战场单位');
  const body=n('div','ci-body');dialog.append(heading,roster,body);document.body.append(dialog);
  let selected=null,context=null;
  function section(label,cls='') {const el=n('section',cls);el.append(n('h3','',label));return el;}
  function render() {
    const report=window.HaffCombatReport.read(context.state,selected,context.prepared[selected],context.bonuses);if(!report)return;
    title.textContent=`${report.name} · ${report.position}${report.hp<=0?' · 已倒地':''}`;
    for(const el of roster.children)el.setAttribute('aria-pressed',String(el.dataset.unit===selected));
    body.replaceChildren();
    const skills=section('技能','ci-skills');
    for(const skill of report.skills){const entry=n('article','ci-skill');entry.dataset.active=String(skill.state==='已激活');entry.append(n('small','',`${skill.kind} · ${skill.state}${skill.note?` · ${skill.note}`:''}`),n('h4','',skill.name),n('p','',skill.detail));skills.append(entry);}
    const panel=section('实时面板','ci-panel'),vitals=n('p','ci-vitals',`生命 ${report.hp}/${report.maxHp} · ${report.supply?`激素针 ${report.supply.count}/3 · 补充 ${report.supply.progress}/200`:`充能 ${report.energy}/100`}`);
    panel.append(vitals);const table=n('table','ci-stats'),thead=n('thead'),tr=n('tr');
    for(const label of ['属性','当前','局前加成','战斗变化'])tr.append(n('th','',label));thead.append(tr);table.append(thead);
    const tbody=n('tbody'),signed=value=>value===0?'—':`${value>0?'+':''}${value}`;
    for(const stat of report.stats){const row=n('tr');row.append(n('th','',stat.label),n('td','',String(stat.value)),n('td','',signed(stat.permanent)),n('td','',signed(stat.combat)));row.title=`基础 ${stat.base} · 开战 ${stat.opening}`;tbody.append(row);}table.append(tbody);panel.append(table);
    if(report.stacks.length){
      const stacks=section('装备 / 藏品叠层','ci-stack-panel');
      for(const item of report.stacks){const row=n('div','ci-stack-row');row.dataset.slot=item.slot;row.append(n('span','',item.name),n('strong','',item.label),n('small','',item.bonus));stacks.append(row);}
      panel.append(stacks);
    }
    const derived=n('dl','ci-derived');
    for(const [label,value] of [['独立攻击倍率',`×${report.attackMultiplier.toFixed(2)}`],['独立伤害减免',`${Math.round(report.damageReduction*100)}%`],['通用伤害倍率',`×${report.damageMultiplier.toFixed(2)}`],['暴击率',`${report.critRate}%`],['暴击总伤害',`${report.critDamage}%`],['充能效率',`${report.chargeEfficiency}%`],['技能冷却缩减',`${report.cooldownReduction} 次行动`],['累计伤害',report.damage]])derived.append(n('dt','',label),n('dd','',String(value)));
    panel.append(derived);for(const text of report.conditional)panel.append(n('p','ci-conditional',text));
    const states=section('生效状态','ci-statuses');
    for(const [type,label]of [['buff','增益'],['debuff','负面状态']]){
      states.append(n('h4','',label));const effects=report.effects.filter(e=>e.type===type);
      if(!effects.length)states.append(n('p','ci-empty','无'));
      for(const effect of effects){const row=n('div','ci-effect');row.dataset.type=type;row.append(n('strong','',effect.name),n('small','',effect.duration),n('p','',`${effect.detail}${effect.source?` · 来源：${effect.source}`:''}`));states.append(row);}
    }
    panel.append(states);
    const sources=n('details','ci-sources');sources.append(n('summary','',`装备、藏品与队伍加成 · ${report.equipment.length+report.bonuses.length}`));
    for(const source of [...report.equipment,...report.bonuses]){const row=n('div','ci-source');if(source.image){const img=n('img');img.src=source.image;img.alt='';row.append(img);}row.append(n('strong','',source.name),n('small','',source.state||'已激活'),n('small','ci-source-attributes',source.attributes || ''),n('p','',source.detail));sources.append(row);}panel.append(sources);
    body.append(skills,panel);
  }
  function open(id) {
    context=window.HaffWarUI?.inspection();if(!context?.state?.units.length)return;
    const visible=window.HaffWar.visibleUnits(context.state);
    selected=visible.some(u=>u.id===id)?id:visible.some(u=>u.id===context.actor)?context.actor:visible[0].id;
    roster.replaceChildren();
    for(const unit of visible){
      const el=button('',()=>{selected=unit.id;render();}),portrait=n('span','ci-portrait'),img=n('img');img.src=unit.portrait;img.alt='';
      const [x,y,w,h]=unit.art.crop,[width,height]=unit.art.size;
      Object.assign(img.style,{width:`${width/w*100}%`,height:`${height/h*100}%`,left:`${-x/w*100}%`,top:`${-y/h*100}%`});portrait.append(img);
      el.dataset.unit=unit.id;el.dataset.side=unit.side;el.dataset.downed=String(unit.hp<=0);el.setAttribute('aria-label',`查看${unit.name}，${unit.side==='ally'?'我方':'敌方'}${unit.hp<=0?'，已倒地':''}`);el.append(portrait,n('span','',unit.name));roster.append(el);
    }
    render();window.HaffWarUI.inspectionOpen(true);if(!dialog.open)dialog.showModal();close.focus();
  }
  dialog.addEventListener('close',()=>window.HaffWarUI?.inspectionOpen(false));
  const control=button('干员面板',()=>open());control.setAttribute('aria-haspopup','dialog');control.title='查看双方技能、实时属性与状态';
  const icon=n('img');icon.src='assets/haff-war/icons/users.svg';icon.alt='';control.prepend(icon);
  document.querySelector('.hb-skill-note')?.append(control);
  new MutationObserver(()=>{if(document.getElementById('battle-view').hidden&&dialog.open)dialog.close();}).observe(document.getElementById('battle-view'),{attributes:true,attributeFilter:['hidden']});
  window.HaffCombatInspectorUI={open};
})();
