/* Battle debrief presentation. Rewards are settled by the campaign before this opens. */
(function(root){
'use strict';
const value=n=>Math.max(0,Number(n)||0);
const Buildcraft=typeof module!=='undefined'&&module.exports?require('./haff-buildcraft.js'):root.HaffBuildcraft;
const Tactics=typeof module!=='undefined'&&module.exports?require('./haff-tactics.js'):root.HaffTactics;
function report(battle,meta={}){
  const allies=(battle.units||[]).filter(u=>u.side==='ally').map(u=>({id:u.id,name:u.name,portrait:u.portrait||root.HaffWar?.units?.[u.id]?.portrait,alive:u.hp>0,damage:value(u.damage),healing:value(u.healing),build: battle.buildcraftStats?.[u.id] || null}));
  const leader=[...allies].sort((a,b)=>(b.damage+b.healing)-(a.damage+a.healing))[0];
  const receipt=meta.receipt;
  const funds=receipt?[['基础报酬',receipt.base],[receipt.interestPaid?'利息（已到账）':'利息收益',receipt.interest],['连胜奖励',receipt.streak],['战术收益',receipt.tactic],['投资收益',receipt.investment],['挑战额外奖励',receipt.challenge]].filter(([,n])=>value(n)>0):[];
  const bonds=[...Object.entries(battle.roleBondState?.ledger||{}),...Object.entries(battle.buildcraftEngine?.ledger||{})].map(([key,row])=>({key,name:(Buildcraft.allBonds||Buildcraft.bonds).find(b=>b.key===key)?.name||key,damage:value(row.damage),healing:value(row.healing),shield:value(row.shield),triggers:value(row.triggers)})).sort((a,b)=>b.damage-a.damage);
  const bondDamage=bonds.reduce((n,row)=>n+row.damage,0),totalDamage=allies.reduce((n,u)=>n+u.damage,0);
  const tactics=Tactics?.Mechanics?.status(battle)||[],tacticDamage=tactics.reduce((n,row)=>n+row.damage,0);
  return{won:receipt?receipt.won:battle.winner==='ally',rounds:value(battle.round),kills:receipt?value(receipt.kills):(battle.units||[]).filter(u=>u.side==='enemy'&&u.hp<=0&&(battle.reinforcementVersion?u.entered:!battle.waves||u.wave<=battle.waves.index)).length,survivors:allies.filter(u=>u.alive).length,allies,leader,funds,income:funds.reduce((s,[,n])=>s+value(n),0),loss:value(receipt?.loss),bonds,bondDamage,tactics,tacticDamage,nativeDamage:Math.max(0,totalDamage-bondDamage-tacticDamage),bondShare:totalDamage?Math.round(bondDamage/totalDamage*100):0};
}
let active=null;
function show(battle,meta={}){
  if(typeof document==='undefined'||!root.HTMLDialogElement)return false;
  if(active)active.close(false);
  const data=report(battle,meta),reduced=root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const make=(tag,cls,text)=>{const el=document.createElement(tag);el.className=cls;if(text!==undefined)el.textContent=text;return el;};
  const dialog=make('dialog','hd-debrief');dialog.dataset.outcome=data.won?'victory':'defeat';dialog.setAttribute('aria-labelledby','hd-title');
  const shell=make('div','hd-shell'),head=make('header','hd-header');head.append(make('span','','G.T.I. / AFTER ACTION REPORT'),make('span','',meta.mission||'训练交战'));
  const body=make('div','hd-body'),hero=make('section','hd-hero');
  if(data.leader?.portrait){const art=make('img','hd-portrait');art.src=data.leader.portrait;art.alt='';hero.append(art);}
  const stamp=make('div','hd-stamp',data.won?'✓':'×');stamp.setAttribute('aria-hidden','true');
  const heading=make('h2','hd-title',data.won?'作战胜利':meta.abandoned?'小队撤退':'作战失利');heading.id='hd-title';
  const heroCopy=make('div','hd-hero-copy');heroCopy.append(make('p','hd-eyebrow',data.won?'MISSION COMPLETE':'MISSION ENDED'),heading,make('p','hd-verdict',data.won?'目标已清除 · 战区控制确认':meta.abandoned?'小队已撤出 · 战后报告已归档':'行动受阻 · 重新整备小队'));
  const leader=make('div','hd-leader');leader.append(make('small','',data.leader&&data.leader.damage+data.leader.healing>0?'突出贡献 / DAMAGE + HEALING':'小队报告'),make('strong','',data.leader?.name||'G.T.I.'),make('span','',data.leader?`伤害 ${data.leader.damage} · 治疗 ${data.leader.healing}`:'等待下一次部署'));
  hero.append(stamp,heroCopy,leader);
  const details=make('section','hd-details'),metrics=make('div','hd-metrics'),counters=[];
  function metric(label,target,suffix=''){const item=make('div','hd-metric'),number=make('strong','',String(target)+suffix);item.append(make('span','',label),number);metrics.append(item);counters.push({node:number,target,suffix});}
  metric('交战轮数',data.rounds);metric('击败敌人',data.kills);metric('小队存活',data.survivors,` / ${data.allies.length}`);
  const team=make('section','hd-team');team.append(make('h3','','本场伤害统计'));const roster=make('div','hd-damage-roster'),maxDamage=Math.max(1,...data.allies.map(unit=>unit.damage));
  if(data.tactics.length){const summary=make('section','hd-bond-summary');summary.append(make('strong','',`战术额外伤害 ${data.tacticDamage}`));for(const row of data.tactics){const line=make('div','hd-bond-row');line.append(make('span','',row.name),make('b','',`${row.damage} 伤害 · ${row.triggers} 次`));summary.append(line);}summary.append(make('p','','已计入触发干员的总伤害，不重复累加。'));team.append(summary);}
  if(data.bonds.length){const summary=make('section','hd-bond-summary');summary.append(make('strong','',`羁绊贡献 ${data.bondDamage} · 占总伤害 ${data.bondShare}%`),make('p','',`角色自身伤害 ${data.nativeDamage} · 羁绊伤害 ${data.bondDamage}${data.bondDamage>data.nativeDamage?' · 羁绊已成为主要火力':''}`));for(const row of data.bonds){const line=make('div','hd-bond-row');line.append(make('span','',row.name),make('b','',row.damage?`${row.damage} 伤害`:row.healing||row.shield?`${row.healing} 治疗 / ${row.shield} 护盾`:`${row.triggers} 次触发`));summary.append(line);}summary.append(make('p','','以下干员总伤害已包含其触发的羁绊伤害。'));team.append(summary);}
  for(const unit of [...data.allies].sort((a,b)=>b.damage-a.damage)){const card=make('article','hd-unit hd-damage-unit');card.dataset.alive=String(unit.alive);if(unit.portrait){const img=make('img','');img.src=unit.portrait;img.alt='';card.append(img);}const info=make('div','hd-damage-info'),label=make('div','hd-damage-label');label.append(make('strong','',unit.name),make('small','',`伤害 ${unit.damage} · 治疗 ${unit.healing}`));const track=make('div','hd-damage-track'),fill=make('div','hd-damage-fill');track.setAttribute('aria-hidden','true');fill.style.width=`${unit.damage/maxDamage*100}%`;track.append(fill);info.append(label,track);if(unit.build){const s=unit.build,parts=[['羁绊触发',s.procs],['追击',s.followUps],['羁绊伤害',s.bondDamage],['羁绊治疗',s.bondHealing],['授予护盾',s.shield],['升星强化',s.starProcs]].filter(([,n])=>value(n)>0);if(parts.length)info.append(make('small','hbc-contribution',parts.map(([label,n])=>`${label} ${value(n)}`).join(' · ')));}card.append(info,make('span','hd-unit-state',unit.alive?'存活':'倒地'));roster.append(card);}team.append(roster);
  const rewards=make('section','hd-rewards');rewards.append(make('h3','',meta.receipt?'战后回收':'训练报告'));
  if(meta.receipt?.tools)rewards.append(make('p','hd-breakdown','⚒ 藏品重铸器 +1　⧉ 干员复制器 +1'));
  if(meta.receipt){const total=make('div','hd-total'),amount=make('strong','',`+${data.income.toLocaleString('zh-CN')}`);total.append(amount,make('span','',meta.receipt.cashPaid?'哈夫币 · 已全部到账':meta.receipt.interestPaid?'哈夫币 · 利息已到账，其余寄往快递站':'哈夫币 · 已寄往快递站'));rewards.append(total);counters.push({node:amount,target:data.income,prefix:'+',format:true});const breakdown=make('p','hd-breakdown',data.funds.map(([name,n])=>`${name} ${value(n).toLocaleString('zh-CN')}`).join(' / '));rewards.append(breakdown);
    const items=meta.items||[];rewards.append(make('p','hd-delivery',items.length?`待签收物资 ${items.length} 件 · ${items.join('、')}`:'战后快递待签收'));
    if(data.loss)rewards.append(make('p','hd-loss',`行动完整度 −${data.loss}${meta.integrity!==undefined?` · 剩余 ${meta.integrity}`:''}`));
    if(meta.receipt.linkRevived)rewards.append(make('p','hl-revive-notice',`绝境重启 · 恢复至 ${meta.integrity} 完整度\n已消耗本局唯一复活机会，可重新挑战当前节点。`));
    if(meta.receipt.linkRecovery)rewards.append(make('p','hl-recovery-notice',`持续作战 · 行动完整度 +${meta.receipt.linkRecovery}`));
  }else rewards.append(make('p','hd-delivery','训练交战已结束。返回整备后可调整阵容，再次部署。'));
  details.append(metrics,team,rewards);body.append(hero,details);
  const footer=make('footer','hd-footer'),skip=make('button','hd-skip','跳过结算动画'),continueButton=make('button','hd-continue',meta.ended?'查看行动总览':meta.receipt?'继续行动 →':'返回整备 →');skip.type=continueButton.type='button';footer.append(skip,continueButton);shell.append(head,body,footer);dialog.append(shell);document.body.append(dialog);
  let frame=0,start=null,closed=false;const previous=document.activeElement;
  function finishAnimation(){root.cancelAnimationFrame(frame);dialog.classList.add('hd-ready');for(const c of counters)c.node.textContent=(c.prefix||'')+(c.format?c.target.toLocaleString('zh-CN'):String(c.target))+(c.suffix||'');skip.hidden=true;}
  function close(proceed=true){if(closed)return;closed=true;root.cancelAnimationFrame(frame);dialog.close();dialog.remove();active=null;if(proceed){meta.onContinue?.();if(previous?.isConnected&&!previous.inert)previous.focus({preventScroll:true});document.dispatchEvent(new CustomEvent('haff:debrief-closed'));}}
  active={close};skip.addEventListener('click',finishAnimation);continueButton.addEventListener('click',()=>close());dialog.addEventListener('cancel',event=>{event.preventDefault();close();});dialog.showModal();continueButton.focus({preventScroll:true});
  function tick(now){if(closed)return;if(start===null)start=now;const p=Math.max(0,Math.min(1,(now-start)/550)),ease=1-(1-p)**3;for(const c of counters){const n=Math.round(c.target*ease);c.node.textContent=(c.prefix||'')+(c.format?n.toLocaleString('zh-CN'):String(n))+(c.suffix||'');}if(p===1)finishAnimation();else frame=root.requestAnimationFrame(tick);}
  if(reduced)finishAnimation();else frame=root.requestAnimationFrame(tick);
  return true;
}
const api={show,report};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HaffBattleDebrief=api;
})(typeof window==='undefined'?globalThis:window);
