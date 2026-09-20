(() => {
'use strict';
const panel=document.getElementById('action-panel'),skills=document.getElementById('skill-options');if(!panel||!skills)return;
const note=document.createElement('div');note.className='hb-skill-note';const text=document.createElement('span'),help=document.createElement('button');help.type='button';help.textContent='技能说明';note.append(text,help);skills.insertAdjacentElement('afterend',note);
const dialog=document.createElement('dialog');dialog.className='hb-help';const title=document.createElement('h2'),detail=document.createElement('p'),close=document.createElement('button');title.id='hb-skill-help-title';dialog.setAttribute('aria-labelledby',title.id);close.textContent='返回战场';close.type='button';dialog.append(title,detail,close);document.body.append(dialog);
function selected(){return skills.querySelector('[aria-pressed="true"]')||skills.querySelector(':focus')||skills.querySelector('.skill-option');}
function update(){const button=selected(),paused=document.getElementById('phase-label')?.textContent==='已暂停',auto=document.querySelector('[data-mode="auto"][aria-pressed="true"]');text.textContent=paused?'战斗已暂停 · 点击自动可接管':auto?'自动战斗中 · 可随时切回手动':!skills.querySelector('button:not(:disabled)')?'行动结算中…':button?.getAttribute('aria-pressed')==='true'?(document.getElementById('target-options').dataset.previewHint||'点击高亮角色施放 · Esc 取消'):'先选择技能，再点击战场目标';help.disabled=!button;}
help.addEventListener('click',()=>{const button=selected();if(!button)return;if(window.HaffCombatInspectorUI){window.HaffCombatInspectorUI.open();return;}title.textContent=button.querySelector('strong').textContent;detail.textContent=button.querySelector('span').textContent;dialog.showModal();close.focus();});close.addEventListener('click',()=>dialog.close());
const view=document.getElementById('battle-view'),savedInert=new Map();
const bossBar=document.createElement('section');bossBar.className='hb-boss-health';bossBar.hidden=true;
const bossName=document.createElement('strong'),bossValue=document.createElement('span'),bossShield=document.createElement('span'),bossTrack=document.createElement('div'),bossFill=document.createElement('i');
bossName.className='hb-boss-name';bossValue.className='hb-boss-value';bossShield.className='hb-boss-shield';bossTrack.className='hb-boss-track';bossTrack.setAttribute('role','progressbar');bossTrack.setAttribute('aria-valuemin','0');bossTrack.append(bossFill);bossBar.append(bossName,bossShield,bossValue,bossTrack);view.querySelector('.battle-toolbar').prepend(bossBar);
const waveLabel=document.createElement('span');waveLabel.className='hb-wave-label';waveLabel.hidden=true;view.querySelector('.battle-status').append(waveLabel);
const waveNotice=document.createElement('div');waveNotice.className='hb-wave-notice';waveNotice.hidden=true;waveNotice.setAttribute('role','status');document.getElementById('battlefield').append(waveNotice);let waveTimer;
function updateBattle(state){
  const boss=window.HaffWar.visibleUnits(state).find(unit=>unit.side==='enemy'&&unit.boss);
  bossBar.hidden=!boss;view.dataset.boss=String(!!boss);
  if(boss){const hp=Math.max(0,boss.hp),shield=hp>0?boss.gearState?.shield||0:0;bossName.textContent=boss.name;bossValue.textContent=`${hp.toLocaleString()} / ${boss.maxHp.toLocaleString()}`;bossShield.textContent=shield?`护盾 ${shield.toLocaleString()}`:'';bossTrack.setAttribute('aria-label',`${boss.name}生命`);bossTrack.setAttribute('aria-valuenow',String(hp));bossTrack.setAttribute('aria-valuemax',String(boss.maxHp));bossTrack.setAttribute('aria-valuetext',`${hp} / ${boss.maxHp}${shield?`，护盾 ${shield}`:''}`);bossFill.style.width=`${Math.min(100,hp/boss.maxHp*100)}%`;}
  waveLabel.hidden=!state.waves&&!state.openingRevival;
  if(state.openingRevival)waveLabel.textContent=`奖励关 · 无限救援 · 已复活 ${state.openingRevival.count} 次`;
  else if(state.waves)waveLabel.textContent=`第 ${state.waves.index+1} / ${state.waves.total} 波${state.reinforcementVersion?` · 待援 ${window.HaffWar.reserves(state).length} 人`:''}`;
}
function announceWave(event){clearTimeout(waveTimer);waveNotice.textContent=`${event.name} · ${event.note}`;waveNotice.hidden=false;waveTimer=setTimeout(()=>{waveNotice.hidden=true;},1400);}
// Reuse the existing accessible target buttons as hit areas over the characters.
const targets=document.getElementById('target-options');document.getElementById('battlefield').append(targets);view.dataset.directTargeting='true';
window.HaffBattleHUD={update:updateBattle,announceWave,placeTargets(scene,units){for(const button of targets.children){const unit=units.find(u=>u.id===button.dataset.target),figure=scene.figures.get(unit?.id);if(!unit||!figure)continue;const p=scene.position(unit.side,unit.slot),width=Math.max(64,Math.min(110,figure.art.displayWidth+18)),height=figure.height+60;button.style.left=((p.x-width/2)/scene.scale.width*100)+'%';button.style.top=((p.y-figure.height-8)/scene.scale.height*100)+'%';button.style.width=(width/scene.scale.width*100)+'%';button.style.height=(height/scene.scale.height*100)+'%';}}};
function syncBattle(){if(!view.hidden){for(const node of [...document.querySelectorAll('body>.topbar, main>*')]){if(node===view||node.tagName==='DIALOG')continue;if(!savedInert.has(node))savedInert.set(node,node.inert);node.inert=true;}}else{for(const [node,value]of savedInert)node.inert=value;savedInert.clear();if(dialog.open)dialog.close();}}
new MutationObserver(syncBattle).observe(view,{attributes:true,attributeFilter:['hidden']});syncBattle();
const record=document.createElement('button');record.type='button';record.textContent='交战记录';document.querySelector('#battle-view .commands').prepend(record);record.addEventListener('click',()=>{title.textContent='交战记录';detail.textContent=[...document.querySelectorAll('#combat-log li')].map(n=>n.textContent).join('\n')||'尚未交战';dialog.showModal();close.focus();});
new MutationObserver(update).observe(targets,{attributes:true,attributeFilter:['data-preview-hint']});
new MutationObserver(update).observe(skills,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-pressed']});update();
})();
