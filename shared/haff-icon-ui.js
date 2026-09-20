/* Presentation only: retain original controls, handlers and accessible descriptions. */
(function () {
  'use strict';
  const paths = {
    assault:'M3 20L19 4m-7 0h7v7M3 12l9-9m0 18 9-9',
    support:'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z',
    scout:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
    engineer:'M12 2l8 4v6c0 5-8 10-8 10S4 17 4 12V6zM8 10h8m-8 4h8',
    breach:'M4 5h8l-3 6h11L8 21l3-7H4z',
    flash:'M12 2v4m0 12v4M2 12h4m12 0h4M5 5l3 3m8 8 3 3M5 19l3-3m8-8 3-3M12 7l2 5-2 5-2-5z',
    healing:'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z',
    dot:'M13 2L5 12h6l-1 7 9-11h-6zM3 21h1m5 0h1m5 0h1m5 0h1',
    recon:'M12 2v4m0 12v4M2 12h4m12 0h4M7 7a7 7 0 1 1 0 10A7 7 0 0 1 7 7zM12 9v6m-3-3h6',
    demolition:'M8 7a7 7 0 1 0 9 2l-1-3-4-1zM16 5l2-2m1 5h3M16 2V0',
    defense:'M12 2l8 4v6c0 5-8 10-8 10S4 17 4 12V6zM8 12h8m-4-4v8',
    smoke:'M5 17h13a4 4 0 0 0 0-8 5 5 0 0 0-10-2 5 5 0 0 0-3 10M8 20h8',
    charge:'M13 2L5 14h6l-1 8 9-13h-6z',
    recruit:'M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8M2 21v-3a7 7 0 0 1 13-3m4-5v10m-5-5h10',
    refresh:'M20 10a8 8 0 0 0-14-5L3 8m0-6v6h6m-5 6a8 8 0 0 0 14 5l3-3m0 6v-6h-6',
    lock:'M5 10h14v11H5zM8 10V6a4 4 0 0 1 8 0v4m-4 4v3',
    star:'M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z',
    route:'M5 19V6a3 3 0 0 1 6 0v12a3 3 0 0 0 6 0V5m-3 3 3-3 3 3M2 19h6',
    grid:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
    bag:'M3 7h18v14H3zM8 7V3h8v4M3 13h18m-11-2v4h4v-4',
    play:'M7 3l14 9-14 9z', pause:'M7 3v18M17 3v18',
    close:'M5 5l14 14M19 5L5 19', back:'M11 4l-8 8 8 8M3 12h18',
    sell:'M4 5h10l7 7-9 9-8-8zM8 9h.1',
    strip:'M5 5h14v14H5zM2 12h20',
    info:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 11v6m0-10v1',
    health:'M12 21L3 12A5 5 0 0 1 12 5a5 5 0 0 1 9 7z',
    coins:'M12 3c-6 0-6 6 0 6s6 6 0 6-6 6 0 6M12 1v22',
    people:'M8 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6M2 21v-5a6 6 0 0 1 12 0v5m2-17a3 3 0 1 1 0 6m2 3a5 5 0 0 1 4 5v3',
    book:'M3 3h7l2 2 2-2h7v17h-7l-2 2-2-2H3zM12 5v17',
    sound:'M3 9h4l5-5v16l-5-5H3zM16 7a8 8 0 0 1 0 10m3-13a12 12 0 0 1 0 16',
    hand:'M8 12V4a2 2 0 0 1 4 0v7-8a2 2 0 0 1 4 0v9-6a2 2 0 0 1 4 0v9c0 8-10 10-14 4l-4-6a2 2 0 0 1 3-2l3 3',
    auto:'M5 7h14v14H5zM12 2v5M8 12h1m6 0h1M8 17h8',
    up:'M5 13l7-8 7 8M12 5v17M4 2h16',
    check:'M4 12l5 5L21 5', front:'M4 18h16M6 12l6-8 6 8', rear:'M4 6h16M6 12l6 8 6-8'
  };
  const memo = new WeakMap();
  function icon(key) {
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.classList.add('hi-symbol');
    const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',paths[key]||paths.info);svg.append(path);return svg;
  }
  const text = el => [...el.childNodes].filter(n=>n.nodeType!==1||!n.matches('.hi-symbol,.hi-number')).map(n=>n.textContent).join(' ').trim();
  function dress(el,key,badge='',detail) {
    if(!el)return;
    const label=detail||text(el);if(!label)return;
    const signature=[label,key,badge].join('|');if(memo.get(el)===signature&&el.querySelector(':scope>.hi-symbol'))return;
    memo.set(el,signature);el.querySelectorAll(':scope>.hi-symbol,:scope>.hi-number').forEach(n=>n.remove());
    el.classList.add('hi-control');el.dataset.hiTip=label;el.setAttribute('aria-label',label);
    if(owner===el&&tooltip){fillTooltip(el);placeTooltip(el);}
    if(!el.matches('button,a,summary'))el.tabIndex=0;
    el.append(icon(key));if(badge){const n=document.createElement('span');n.className='hi-number';n.textContent=badge;n.setAttribute('aria-hidden','true');el.append(n);}
  }
  function kind(label){
    if(/收起|关闭|取消/.test(label))return 'close';if(/已招募|已满星|已满级/.test(label))return 'check';
    if(/刷新/.test(label))return 'refresh';if(/锁定/.test(label))return 'lock';if(/升星|强化|星技能/.test(label))return 'star';
    if(/招募/.test(label))return 'recruit';if(/出售/.test(label))return 'sell';if(/卸下/.test(label))return 'strip';
    if(/升级/.test(label))return 'up';if(/路线|位面/.test(label))return 'route';if(/部署出战|开始行动|继续战斗/.test(label))return 'play';
    if(/暂停/.test(label))return 'pause';if(/返回|放弃/.test(label))return 'back';if(/技能/.test(label))return 'charge';
    if(/装备|武器|库存|快递|配件/.test(label))return 'bag';if(/藏品/.test(label))return 'star';if(/自动/.test(label))return 'auto';if(/手动/.test(label))return 'hand';if(/音效/.test(label))return 'sound';return 'grid';
  }
  // Keep skill descriptions readable, using the live roster's rear-support rules.
  function renderSkillText(){
    document.querySelectorAll('.prep-skill,#skills-tab,#gear-tab,#prep-passive').forEach(el=>{
      if(!el.classList.contains('hi-control'))return;
      el.classList.remove('hi-control');el.querySelectorAll(':scope>.hi-symbol,:scope>.hi-number').forEach(n=>n.remove());
      delete el.dataset.hiTip;el.removeAttribute('aria-label');
      if(el.matches('.prep-skill,#prep-passive'))el.removeAttribute('tabindex');
      memo.delete(el);
    });
    const core=window.HaffWar,panel=document.getElementById('prep-passive');
    const name=document.getElementById('prep-name')?.textContent;
    const id=core?.operatorIds.find(id=>core.units[id].name===name),support=core?.rearPassives[id];
    if(!panel||!support)return;
    const position=document.getElementById('prep-position')?.value;
    const active=position !== '' && core.Formation.validSlot(Number(position)) && !core.Formation.frontSlot(Number(position));
    const status=active?'后排支援 · 已激活':position==='bench'?'后排支援 · 备战席未激活':'后排支援 · 部署至后排激活';
    const signature=[id,position,support.name,support.detail].join('|');
    if(panel.dataset.hiRear===signature&&panel.querySelector('.hi-rear-detail'))return;
    panel.dataset.hiRear=signature;panel.dataset.active=String(active);
    const label=document.createElement('small');label.textContent=status;
    const title=document.createElement('strong');title.textContent=support.name;
    const detail=document.createElement('span');detail.className='hi-rear-detail';detail.textContent=support.detail;
    panel.replaceChildren(label,title,detail);
  }
  function decorate(){
    const prep=document.body.classList.contains('hbc-preparing');if(!prep)return;
    document.body.classList.add('hi-mode');
    document.querySelectorAll('.hbc-bond,.hbc-tag').forEach(el=>{
      const bond=(window.HaffBuildcraft.allBonds||window.HaffBuildcraft.bonds).find(b=>b.key===el.dataset.hiBond);if(!bond)return;
      const count=el.querySelector('b')?.textContent||'';dress(el,bond.category||bond.key,(count.match(/\d+/g)||[]).join('/'),`${bond.name}${count?' · '+count:''}${el.dataset.mastered==='true'?' · 已满级':''}\n${bond.tiers.map((text,i)=>`${bond.thresholds[i]} 人${i===bond.tiers.length-1?'满级':''}：${text}`).join('\n')}\n${window.HaffBuildcraft.limitNote}`);
    });
    const buttons='#hbc-shop-toggle,#hbc-overview,#hbc-inspector-toggle,#hbc-panel-close,#start,#sell-operator,#strip-operator,#terminal-upgrade,.topbar>a,.campaign-top-actions>button,#hbc-shop>.campaign-actions>button,#hbc-shop .market-card>button,.inventory-filters>button,.inventory-actions>button,.inventory-recipe>button,.parcel-history,.hbc-legacy>summary';
    document.querySelectorAll(buttons).forEach(el=>{
      const label=text(el),price=/招募|出售|刷新/.test(label)?label.match(/\d+(?:\.\d+)?\s*万/)?.[0]:'',amount=/还差/.test(label)?label.match(/还差\s*(\d+)/)?.[1]:'';
      dress(el,kind(label),price||amount||'');
    });
    document.querySelectorAll('.campaign-stat>span').forEach((el,i)=>dress(el,['coins','health','route','recon'][i]));
    document.querySelectorAll('.prep-stat>span').forEach((el,i)=>dress(el,['health','recon','defense','charge'][i]));
    document.querySelectorAll('.board-heading>h2,.bench-heading>h2,.armory-heading>h3').forEach(el=>dress(el,'grid'));
    document.querySelectorAll('.row-heading>h3').forEach(el=>dress(el,/前排/.test(text(el))?'front':'rear'));
    document.querySelectorAll('#hbc-inspect>p,#hbc-inspect>small,#prep-resource').forEach(el=>dress(el,/下一级/.test(text(el))?'star':'info'));
    document.querySelectorAll('#hbc-shop .market-card').forEach(card=>{
      const copies=card.querySelector(':scope>p');if(copies){const label=text(copies);dress(copies,'star',label.match(/已收集\s*(\d+\s*\/\s*9)/)?.[1]||'');}
      const promotion=card.querySelector('.hbc-promotion');if(promotion){const more=[text(promotion),card.querySelector('.hbc-upgrade-copy')?.textContent,card.querySelector('.hbc-combo-hint')?.textContent].filter(Boolean).join('\n');promotion.dataset.hiTip=more;promotion.setAttribute('aria-label',more);}
    });
    document.querySelectorAll('.roster-copy>small').forEach(el=>{const stars=Number(text(el).match(/([123]) 星/)?.[1]);if(stars)dress(el,'star','★'.repeat(stars));});
    document.querySelectorAll('#board-count,#bench-count,#deploy-summary,#terminal-capacity,.parcel-count,.career-badge,.inventory-empty').forEach(el=>{
      const label=text(el),numbers=label.match(/\d+(?:\s*\/\s*\d+)?/g)||[];dress(el,el.matches('.career-badge')?'star':el.matches('.parcel-count,.inventory-empty')?'bag':'people',numbers.slice(0,2).join(' · ')||'0');
    });
    document.querySelectorAll('.cell-index').forEach(el=>dress(el,/后排/.test(text(el))?'rear':'front',text(el).match(/\d+/)?.[0]||''));
    renderSkillText();
    document.querySelectorAll('.parcel-box').forEach(el=>{el.dataset.hiTip=el.getAttribute('title')||text(el);});
    const terminal=document.getElementById('terminal-upgrade');if(terminal){terminal.dataset.hiTip=[text(terminal),document.getElementById('terminal-next')?.textContent,document.getElementById('terminal-price')?.textContent].join('\n');terminal.setAttribute('aria-label',terminal.dataset.hiTip);}
  }
  let tooltip=null,owner=null,queued=false;
  function hide(){tooltip?.remove();tooltip=null;owner=null;}
  function fillTooltip(el){
    const content=el.dataset.hiBond&&window.HaffBuildcraftUI?.bondTooltip(el.dataset.hiBond,el);
    tooltip.classList.toggle('hi-bond-tooltip',!!content);
    if(content)tooltip.replaceChildren(content);else tooltip.textContent=el.dataset.hiTip;
  }
  function placeTooltip(el){
    const r=el.getBoundingClientRect(),t=tooltip.getBoundingClientRect(),bond=tooltip.classList.contains('hi-bond-tooltip');
    const left=bond?(r.right+t.width+8<=innerWidth?r.right+8:r.left-t.width-8):r.left;
    tooltip.style.left=`${Math.max(8,Math.min(innerWidth-t.width-8,left))}px`;
    tooltip.style.top=`${Math.max(8,Math.min(innerHeight-t.height-8,bond?r.top:r.bottom+t.height+8>innerHeight?r.top-t.height-8:r.bottom+8))}px`;
  }
  function show(el){
    if(!el?.dataset.hiTip)return;hide();owner=el;tooltip=document.createElement('div');tooltip.id='hi-tooltip';tooltip.setAttribute('role','tooltip');fillTooltip(el);document.body.append(tooltip);placeTooltip(el);
  }
  document.addEventListener('pointerover',e=>{const el=e.target.closest('[data-hi-tip]');if(el&&el!==owner)show(el);});
  document.addEventListener('pointerout',e=>{if(owner&&!owner.contains(e.relatedTarget))hide();});
  document.addEventListener('focusin',e=>show(e.target.closest('[data-hi-tip]')));
  document.addEventListener('focusout',hide);document.addEventListener('keydown',e=>{if(e.key==='Escape')hide();});
  window.addEventListener('resize',hide);document.addEventListener('scroll',hide,true);
  // Disconnect during our own icon writes so they cannot schedule another full-page pass.
  let decorationFrame=0;
  const observer=new MutationObserver(()=>{if(queued||!document.body.classList.contains('hbc-preparing'))return;queued=true;decorationFrame=requestAnimationFrame(refresh);});
  function refresh(){
    cancelAnimationFrame(decorationFrame);decorationFrame=0;queued=false;observer.disconnect();
    try{decorate();if(owner&&!owner.isConnected)hide();}finally{observer.observe(document.body,{childList:true,subtree:true,characterData:true});}
  }
  window.HaffIconUI={flush:refresh};
  refresh();
  window.addEventListener('pagehide',()=>{cancelAnimationFrame(decorationFrame);queued=false;observer.disconnect();hide();});
  window.addEventListener('pageshow',event=>{if(event.persisted)refresh();});
})();
