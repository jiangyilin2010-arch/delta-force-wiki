/* A horizontally pannable, connected talent graph. No persistent state lives here. */
(function(root){
 'use strict';
 const L=root.HaffLinkTree,width=1960,height=600;
 const positions={vitality:[80,110],damage:[120,290],energy:[80,470],armor:[570,85],precision:[620,280],reroll:[530,455],recovery:[1110,150],critical:[1050,340],funding:[1140,500],rebirth:[1640,105],execution:[1640,305],contingency:[1640,485]};
 const make=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls;if(text!==undefined)e.textContent=text;return e;};
 function render({levels,selected,onSelect,scrollLeft=0,scrollTop=0}){
  const shell=make('section','hl-network'),toolbar=make('div','hl-map-toolbar'),legend=make('div','hl-map-legend');
  for(const b of L.branches){const label=make('span','',b.name);label.style.setProperty('--hl-color',b.color);legend.append(label);}toolbar.append(legend);
  const controls=make('div','hl-map-controls');const pan=direction=>viewport.scrollBy({left:direction*viewport.clientWidth*.7,behavior:root.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  for(const [text,direction] of [['←',-1],['→',1]]){const b=make('button','',text);b.type='button';b.setAttribute('aria-label',direction<0?'向左查看链路':'向右查看链路');b.addEventListener('click',()=>pan(direction));controls.append(b);}toolbar.append(controls);shell.append(toolbar);
  const viewport=make('div','hl-map-viewport');viewport.tabIndex=0;viewport.setAttribute('role','region');viewport.setAttribute('aria-label','链路网络，可横向滚动；方向键左右移动，Home 回到起点，End 前往终端');
  const world=make('div','hl-map-world');world.style.width=`${width}px`;world.style.height=`${height}px`;
  for(const [x,code,label] of [[80,'01','基础接入'],[555,'02','交叉强化'],[1080,'03','协同扩展'],[1640,'04','核心协议']]){const heading=make('div','hl-map-stage');heading.style.left=`${x}px`;heading.append(make('small','',code),make('strong','',label));world.append(heading);}
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','hl-connections');svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('aria-hidden','true');
  for(const node of L.nodes)for(const [routeIndex,route] of L.paths(node).entries())for(const [source,min] of Object.entries(route)){
   const [sx,sy]=positions[source],[tx,ty]=positions[node.id],x1=sx+192,y1=sy+40,x2=tx,y2=ty+40,bend=Math.max(85,(x2-x1)*.46);
   const path=document.createElementNS(svg.namespaceURI,'path');path.dataset.source=source;path.dataset.target=node.id;path.dataset.minimum=String(min);path.dataset.alternate=String(routeIndex>0);path.setAttribute('d',`M ${x1} ${y1} C ${x1+bend} ${y1}, ${x2-bend} ${y2}, ${x2} ${y2}`);
   path.setAttribute('class',`hl-connection${levels[source]>=min?' is-powered':''}${selected===node.id||selected===source?' is-related':''}${routeIndex?' is-alternate':''}`);path.style.setProperty('--hl-color',L.branches.find(b=>b.id===node.branch).color);svg.append(path);
   {const label=document.createElementNS(svg.namespaceURI,'text');label.setAttribute('x',x1+10);label.setAttribute('y',y1-16-routeIndex*16);label.setAttribute('class','hl-connection-label');label.dataset.target=node.id;label.style.display=selected===node.id?'':'none';label.textContent=`${L.byId[source].name} Lv.${min}`;svg.append(label);}
  }
  world.append(svg);
  for(const node of [...L.nodes].sort((a,b)=>positions[a.id][0]-positions[b.id][0]||positions[a.id][1]-positions[b.id][1])){
   const level=levels[node.id],ready=L.canUnlock(node,levels),state=level===node.costs.length?'maxed':level?'active':ready?'available':'locked',card=make('button','hl-node');card.type='button';card.id=`hl-node-${node.id}`;card.dataset.state=state;card.style.left=`${positions[node.id][0]}px`;card.style.top=`${positions[node.id][1]}px`;card.style.setProperty('--hl-color',L.branches.find(b=>b.id===node.branch).color);card.setAttribute('aria-pressed',String(selected===node.id));card.setAttribute('aria-label',`${node.name}，${level}/${node.costs.length} 级，${state==='maxed'?'已满级':ready?'可升级':'前置未完成'}`);
   const glyph=make('span','hl-glyph'),icon=make('img','');icon.src=`assets/haff-war/icons/${node.icon}.svg`;icon.alt='';glyph.append(icon);const text=make('span','hl-node-copy');text.append(make('strong','',node.name),make('small','',`${level} / ${node.costs.length} · ${state==='maxed'?'已完成':!ready?'未连接':level?'已激活':'可解锁'}`));card.append(glyph,text);
   card.addEventListener('click',()=>onSelect(node.id));card.addEventListener('focus',()=>{if(card.offsetLeft<viewport.scrollLeft||card.offsetLeft+192>viewport.scrollLeft+viewport.clientWidth)viewport.scrollLeft=Math.max(0,card.offsetLeft-viewport.clientWidth/2+96);if(card.offsetTop<viewport.scrollTop||card.offsetTop+82>viewport.scrollTop+viewport.clientHeight)viewport.scrollTop=Math.max(0,card.offsetTop-viewport.clientHeight/2+41);});world.append(card);
  }
  viewport.append(world);shell.append(viewport,make('p','hl-map-hint','拖动空白处 / 滚轮横移 · 点选节点查看连线 · 前置线路任选一组完成'));
  viewport.scrollLeft=scrollLeft;viewport.scrollTop=scrollTop;
  viewport.addEventListener('wheel',event=>{if(event.ctrlKey||event.deltaX||Math.abs(event.deltaY)<1)return;const old=viewport.scrollLeft;viewport.scrollLeft+=event.deltaY*(event.deltaMode===1?20:event.deltaMode===2?viewport.clientWidth:1);if(old!==viewport.scrollLeft)event.preventDefault();},{passive:false});
  viewport.addEventListener('keydown',event=>{if(event.target!==viewport)return;const action={ArrowLeft:()=>pan(-1),ArrowRight:()=>pan(1),Home:()=>{viewport.scrollLeft=0;},End:()=>{viewport.scrollLeft=width;}}[event.key];if(action){event.preventDefault();action();}});
  let drag=null;viewport.addEventListener('pointerdown',event=>{if(event.pointerType!=='mouse'||event.button!==0||event.target.closest('button'))return;drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};viewport.setPointerCapture(event.pointerId);viewport.classList.add('is-dragging');event.preventDefault();});
  viewport.addEventListener('pointermove',event=>{if(!drag)return;viewport.scrollLeft=drag.left+drag.x-event.clientX;viewport.scrollTop=drag.top+drag.y-event.clientY;});
  const release=()=>{drag=null;viewport.classList.remove('is-dragging');};viewport.addEventListener('pointerup',release);viewport.addEventListener('pointercancel',release);viewport.addEventListener('lostpointercapture',release);
  return shell;
 }
 function refresh(shell,levels,selected){
  for(const card of shell.querySelectorAll('.hl-node')){
   const node=L.byId[card.id.slice('hl-node-'.length)],level=levels[node.id],ready=L.canUnlock(node,levels),state=level===node.costs.length?'maxed':level?'active':ready?'available':'locked';
   card.dataset.state=state;card.setAttribute('aria-pressed',String(node.id===selected));card.setAttribute('aria-label',`${node.name}，${level}/${node.costs.length} 级，${state==='maxed'?'已满级':ready?'可升级':'前置未完成'}`);
   card.querySelector('.hl-node-copy small').textContent=`${level} / ${node.costs.length} · ${state==='maxed'?'已完成':!ready?'未连接':level?'已激活':'可解锁'}`;
  }
  for(const path of shell.querySelectorAll('.hl-connection')){const d=path.dataset;path.setAttribute('class',`hl-connection${levels[d.source]>=Number(d.minimum)?' is-powered':''}${selected===d.target||selected===d.source?' is-related':''}${d.alternate==='true'?' is-alternate':''}`);}
  for(const label of shell.querySelectorAll('.hl-connection-label'))label.style.display=label.dataset.target===selected?'':'none';
 }
 root.HaffLinkGraph={render,refresh,positions,width,height};
})(window);
