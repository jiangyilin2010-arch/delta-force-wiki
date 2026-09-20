(function(root){
'use strict';
const L=root.HaffLinkTree;
const n=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
const button=(text,action,cls='')=>{const b=n('button',cls,text);b.type='button';b.addEventListener('click',action);return b;};
function coin(){const e=n('span','hl-coin');e.setAttribute('aria-hidden','true');e.innerHTML='<svg viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="14"/><path d="m16 7 10 17H6Z"/><path d="m16 13 5 8H11Z"/></svg>';return e;}
function launcher(profile,open){const info=L.info(profile),row=n('section','hl-launcher'),copy=n('div');copy.append(n('small','','G.T.I. / NEURAL LINK'),n('strong','','链路系统'),n('span','',`已激活 ${info.activated} / ${L.nodes.length} 个节点`));const wallet=n('div','hl-wallet');wallet.append(coin(),n('strong','',info.balance.toLocaleString('zh-CN')),n('span','','三角圈'));row.append(copy,wallet,button('进入链路 →',open,'primary'));return row;}
let active=null;
function show(profile,{onChange=()=>{},onClose=()=>{}}={}){
 if(active){active.focus();return;}
 const dialog=n('dialog','hl-dialog hl-network-dialog');dialog.setAttribute('aria-labelledby','hl-title');let selected='vitality',message='',confirmReset=false;active=dialog;
 function redraw(focus){
  const oldNetwork=dialog.querySelector('.hl-network');
  const previousMap=dialog.querySelector('.hl-map-viewport'),mapPosition={scrollLeft:previousMap?.scrollLeft||0,scrollTop:previousMap?.scrollTop||0};
  const info=L.info(profile),levels=info.levels;
  dialog.replaceChildren();const head=n('header','hl-header'),title=n('div');title.append(n('small','','G.T.I. / LINK MATRIX'));const h=n('h2','','链路系统');h.id='hl-title';title.append(h);
  const balance=n('div','hl-wallet');balance.append(coin(),n('strong','',info.balance.toLocaleString('zh-CN')),n('span','','三角圈'));
  head.append(title,balance,button('返回',()=>dialog.close(),'hl-close'));dialog.append(head);
  const intro=n('p','hl-intro','完成对局获得三角圈，沿连线解锁更强节点。升级与重置从下一局生效。');dialog.append(intro);
  const body=n('div','hl-body'),tree=n('div','hl-tree');tree.setAttribute('aria-label','三条天赋链路');
  if(root.HaffLinkGraph){tree.className='hl-tree hl-tree-network';if(oldNetwork&&root.HaffLinkGraph.refresh){root.HaffLinkGraph.refresh(oldNetwork,levels,selected);tree.append(oldNetwork);}else tree.append(root.HaffLinkGraph.render({levels,selected,...mapPosition,onSelect:id=>{selected=id;confirmReset=false;message='';redraw(`hl-node-${id}`);}}));}
  else for(const branch of L.branches){
   const lane=n('section','hl-lane');lane.style.setProperty('--hl-color',branch.color);const label=n('header');label.append(n('h3','',branch.name),n('small','',branch.detail));lane.append(label);
   const list=n('ol','hl-nodes');
   for(const node of L.nodes.filter(x=>x.branch===branch.id)){
    const level=levels[node.id],ready=L.canUnlock(node,levels),state=level===node.costs.length?'maxed':level?'active':ready?'available':'locked';
    const item=n('li');item.dataset.linked=String(ready);const card=button('',()=>{selected=node.id;confirmReset=false;message='';redraw(`hl-node-${node.id}`);if(root.matchMedia?.('(max-width:1000px)').matches)dialog.querySelector('.hl-detail')?.scrollIntoView({block:'nearest',behavior:root.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});},'hl-node');card.id=`hl-node-${node.id}`;card.dataset.state=state;card.setAttribute('aria-pressed',String(selected===node.id));card.setAttribute('aria-label',`${node.name}，${level}/${node.costs.length} 级，${ready?'可查看升级':'前置未完成'}`);
    const glyph=n('span','hl-glyph'),img=n('img');img.src=`assets/haff-war/icons/${node.icon}.svg`;img.alt='';glyph.append(img);
    const text=n('span','hl-node-copy');text.append(n('strong','',node.name),n('small','',`${level} / ${node.costs.length} · ${state==='maxed'?'已完成':!ready?'未连接':level?'已激活':'可解锁'}`));
    card.append(glyph,text);if(state==='maxed')card.append(n('span','hl-node-check','✓'));item.append(card);list.append(item);
   }
   lane.append(list);tree.append(lane);
  }
  const node=L.byId[selected],level=levels[selected],ready=L.canUnlock(node,levels),maxed=level===node.costs.length,cost=node.costs[level];
  const detail=n('aside','hl-detail');detail.style.setProperty('--hl-color',L.branches.find(b=>b.id===node.branch).color);detail.setAttribute('aria-label','节点详情');
  detail.append(n('small','hl-kicker',`LINK / ${String(L.nodes.indexOf(node)+1).padStart(2,'0')}`),n('h3','',node.name),n('span','hl-detail-level',`等级 ${level} / ${node.costs.length}`),n('p','hl-description',node.detail));
  const requirements=n('div','hl-requirements');requirements.append(n('strong','','前置链路'));
  if(!Object.keys(node.requires).length)requirements.append(n('span','','起点节点 · 无前置要求'));
  else for(const [index,route] of L.paths(node).entries()){
   const group=n('div','hl-route-option');group.append(n('small','',`线路 ${index+1}${L.paths(node).length>1?' · 满足任一组即可':''}`));
   for(const [id,min] of Object.entries(route)){const req=button(`${levels[id]>=min?'✓':'○'} ${L.byId[id].name} ${levels[id]}/${min} 级`,()=>{selected=id;message='';redraw(`hl-node-${id}`);},'hl-requirement-link');req.dataset.met=String(levels[id]>=min);group.append(req);}requirements.append(group);
  }
  detail.append(requirements);
  const action=button(maxed?'已满级':!ready?'前置节点未完成':info.balance<cost?`还差 ${cost-info.balance} 三角圈`:`${level?'升级':'激活'} · ${cost} 三角圈`,()=>{
   try{L.upgrade(profile,selected);onChange();message=`${node.name}已升至 ${L.info(profile).levels[selected]} 级；下一局生效。`;confirmReset=false;redraw(`hl-node-${selected}`);}catch(error){message=error.message;redraw();}
  },'hl-upgrade');action.disabled=maxed||!ready||info.balance<cost;detail.append(action);
  const totals=L.bonuses(levels),summary=n('div','hl-summary');summary.append(n('strong','','当前链路增益'));
  summary.append(n('p','',`生命 +${totals.hp}% · 防护 +${totals.armor}\n增伤 +${totals.damage}% · 首领增伤 +${totals.bossDamage}%\n暴击率 ${totals.critRate}% · 暴击额外伤害 ${totals.critDamage}%\n战后恢复 ${totals.recovery} · 复活 ${totals.revive} 次/局\n战术刷新 ${totals.rerolls} 次/局 · 新位面补充 ${totals.planeReroll} 次\n开局能量 +${totals.energy} · 每个位面资金 +${totals.funding/10000} 万`));detail.append(summary);body.append(tree,detail);dialog.append(body);
  const foot=n('footer','hl-footer'),status=n('p','hl-status',message||'通关与失败均有结算奖励；推进越远、职级越高，获得越多。主动放弃整局与自由训练不发放。');status.setAttribute('role','status');status.setAttribute('aria-live','polite');foot.append(status);
  const reset=button(confirmReset?`确认重置 · 返还 ${info.spent} 三角圈`:'重置链路',()=>{if(!confirmReset){confirmReset=true;redraw('hl-reset');return;}L.reset(profile);onChange();message=`已返还 ${info.spent} 三角圈，可以重新规划链路。`;confirmReset=false;redraw('hl-reset');},'hl-reset');reset.id='hl-reset';reset.disabled=info.spent===0;foot.append(reset);dialog.append(foot);
  if(oldNetwork)root.HaffPageMotion?.panel(detail);
  const map=dialog.querySelector('.hl-map-viewport');if(map){map.scrollLeft=mapPosition.scrollLeft;map.scrollTop=mapPosition.scrollTop;}
  if(focus)dialog.querySelector(`#${focus}`)?.focus({preventScroll:true});
 }
 dialog.addEventListener('close',()=>{active=null;dialog.remove();onClose();});document.body.append(dialog);redraw();dialog.showModal();dialog.querySelector('.hl-close').focus();
}
function result(profile,receipt,open){const box=n('section','hl-result');const reward=n('div','hl-wallet');reward.append(coin(),n('strong','',`+${receipt.linkPoints||0}`),n('span','','三角圈'));const copy=n('div'),r=receipt.linkBreakdown;copy.append(n('strong','','链路强化资源已到账'),n('p','',r?`结算 ${r.base} · 节点 ${r.progress} · 首领 ${r.bosses} · 职级奖励 ${r.bonus}`:'历史结算补发 · 按行动经验的 10% 折算'),n('small','',`当前可用 ${L.info(profile).balance} 三角圈 · 升级从下一局生效`));box.append(reward,copy,button('前往加点 →',open));return box;}
root.HaffLinkUI={launcher,show,result};
})(window);
