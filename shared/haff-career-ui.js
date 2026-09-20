(function(root){
 'use strict';
 const P=root.HaffCareer;
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 function insignia(rank){
  const box=el('div','hcr-insignia');box.style.setProperty('--rank-color',rank.color);box.setAttribute('aria-hidden','true');
  const stripes=Array.from({length:Math.min(4,rank.group+1)},(_,i)=>`<path d="M25 ${44+i*9} L50 ${57+i*9} L75 ${44+i*9}"/>`).join('');
  box.innerHTML=`<svg viewBox="0 0 100 120" fill="none"><path class="hcr-shield" d="M50 5 90 21V77L50 113 10 77V21Z"/><path d="M50 14 82 27V73L50 101 18 73V27Z" opacity=".35"/>${stripes}<path class="hcr-star" d="m50 22 3.6 7.2 8 1.2-5.8 5.6 1.4 8-7.2-3.8-7.2 3.8 1.4-8-5.8-5.6 8-1.2Z"/>${rank.group>=4?'<path d="M5 38v43l31 28M95 38v43l-31 28"/>':''}</svg>`;return box;
 }
 function meter(current,max,label){const p=el('progress');p.max=max;p.value=current;p.setAttribute('aria-label',label);return p;}
 function render(profile,{selectedRank,onSelect,onTrain,onStart}){
  const rank=P.rank(profile),xp=P.progress(profile.xp),training=P.training(profile),section=el('section','hcr-panel');section.setAttribute('aria-label','职级与永久训练');section.style.setProperty('--rank-color',rank.color);
  const top=el('div','hcr-top'),identity=el('div','hcr-identity'),name=el('div');
  name.append(el('small','hcr-eyebrow','G.T.I. / SERVICE RECORD'),el('h2','',rank.name),el('span','hcr-muted',`职级 ${rank.index+1} / ${P.ranks.length} · ${profile.wins} 次成功撤离`));identity.append(insignia(rank),name);
  const growth=el('div','hcr-growth');growth.append(el('strong','',`行动等级 Lv.${xp.level}`),el('span','hcr-muted',`${xp.current} / ${xp.needed} 经验`),meter(xp.current,xp.needed,'行动等级经验进度'),el('small','hcr-muted',`再获 ${xp.needed-xp.current} 经验升级 · 每级获得 1 训练点`));top.append(identity,growth);section.append(top);
  const road=el('ol','hcr-road');road.setAttribute('aria-label','军衔晋升路线');
  for(const group of [...new Set(P.ranks.map(r=>r.group))]){const first=P.ranks.find(r=>r.group===group),item=el('li',group===rank.group?'is-current':group<rank.group?'is-unlocked':'is-locked');item.append(el('i'),el('span','',first.name.replace(/[ⅠⅡⅢⅣⅤ]/g,'')));if(group===rank.group)item.setAttribute('aria-current','step');road.append(item);}section.append(road);
  const promotion=P.promotionProgress(profile),atTop=rank.index===P.ranks.length-1;
  const challenge=el('div','hcr-challenge'),goal=el('div');goal.append(el('small','hcr-eyebrow','NEXT OPERATION'),el('strong','',atTop?'统帅Ⅰ已达成 · 挑战最高职级':`下阶目标 · ${P.ranks[rank.index+1].name}`),el('p','hcr-muted',promotion.description));
  if(promotion.wins>1)goal.append(el('strong','',`晋升试炼 ${promotion.current} / ${promotion.wins}`),meter(promotion.current,promotion.wins,'统帅晋升试炼进度'));
  const selectBox=el('div','hcr-select'),label=el('label','','挑战职级'),select=el('select');select.id='hcr-rank-select';label.htmlFor=select.id;
  P.ranks.forEach(r=>{const opt=el('option','',`${r.name}${r.index>rank.index?' · 未解锁':''}`);opt.value=r.index;opt.disabled=r.index>rank.index;select.append(opt);});select.value=String(selectedRank);select.addEventListener('change',()=>onSelect(Number(select.value)));
  const pressure=P.pressure({careerRun:{rank:selectedRank,difficultyVersion:2}}),pct=n=>Math.round((n-1)*100);
  selectBox.append(label,select,el('small','hcr-muted',`敌方生命 +${pct(pressure.hp)}% · 攻击 +${pct(pressure.attack)}% · 经验 +${pct(pressure.xp)}%`),el('small','hcr-muted',selectedRank<rank.index?'低职级可积累经验，本局不会晋升。':atTop?'最高职级挑战，通关继续获得行动经验。':'本局可推进晋升，敌方增幅叠加行动难度、战术与负面词条。'));
  const hazards=root.HaffRankHazardsUI?.preview(selectedRank);if(hazards)selectBox.append(hazards);
  const start=el('button','primary','开始行动');start.type='button';start.addEventListener('click',onStart);selectBox.append(start);challenge.append(goal,selectBox);section.append(challenge);
  const header=el('div','hcr-training-heading');header.append(el('strong','','永久训练'),el('span',training.available?'hcr-points':'hcr-muted',`可用训练点 ${training.available}`));section.append(header);
  const grid=el('div','hcr-training-grid');
  for(const [key,track] of Object.entries(P.tracks)){
   const level=training.levels[key],card=el('article','hcr-training-card'),head=el('div'),marks=el('div','hcr-marks');head.append(el('strong','',track.name),el('small','hcr-muted',`${level} / ${track.max}`));
   for(let i=0;i<track.max;i++)marks.append(el('i',i<level?'is-filled':''));marks.setAttribute('aria-hidden','true');
   const btn=el('button','',level===track.max?'已满级':'升级 · 1 点');btn.type='button';btn.id=`hcr-train-${key}`;btn.disabled=!training.available||level===track.max;btn.setAttribute('aria-label',`${track.name}，当前 ${level} 级，${track.detail}，${btn.textContent}`);btn.addEventListener('click',()=>onTrain(key));
   card.append(head,el('p','hcr-muted',track.detail),marks,btn);grid.append(card);
  }
  section.append(grid,el('small','hcr-footnote','训练加成从下一局开始生效。经验、职级与训练保存在当前浏览器；自由训练不计入成长。'));return section;
 }
 function result(profile,receipt){
  const box=el('section','hcr-result'),rank=P.ranks[receipt.rankAfter??P.rank(profile).index],gain=receipt.rankGain||0,levels=P.progress(receipt.afterXp).level-P.progress(receipt.beforeXp).level,body=el('div');box.style.setProperty('--rank-color',rank.color);
  body.append(el('small','hcr-eyebrow',gain?'RANK PROMOTED':'CAREER UPDATED'),el('h3','',gain?`${P.ranks[receipt.rankBefore].name} → ${rank.name} · 晋升 ${gain} 阶`:`职级保留 · ${rank.name}`),el('p','hcr-muted',levels?`行动等级提升 ${levels} 级，获得 ${levels} 训练点。返回开始页分配永久加成。`:`经验已积累，距离下一级还需 ${P.progress(receipt.afterXp).needed-P.progress(receipt.afterXp).current} 经验。`),el('small','hcr-muted',rank.index===P.ranks.length-1?'已达最高职级，可继续积累经验并完成训练。':`下一次行动目标：挑战 ${rank.name}，解锁更高职级。`));
  if(receipt.promotionVersion===1&&!gain&&receipt.rankBefore>=19&&receipt.rankBefore<P.ranks.length-1&&receipt.challengeRank===receipt.rankBefore){const progress=P.promotionProgress(profile);body.append(el('small','hcr-muted',receipt.trialQualified?`晋升试炼 ${receipt.trialAfter} / ${progress.wins}`:'本局未达晋升条件：需实战全通三个位面、达到完整度要求且不使用直通。本阶试炼进度已清零，职级保留。'));}
  box.append(insignia(rank),body);return box;
 }
 root.HaffCareerUI={render,result};
})(window);
