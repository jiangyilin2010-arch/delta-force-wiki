(function(root){
 'use strict';
 const H=root.HaffRankHazards;
 const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 function badges(entries){const row=el('div','hr-hazard-list');for(const rule of entries){const badge=el('span','hr-hazard',rule.name);badge.title=rule.detail;badge.tabIndex=0;badge.setAttribute('aria-label',`${rule.name}：${rule.detail}`);const tip=el('span','hr-hazard-tip',rule.detail);badge.append(tip);row.append(badge);}return row;}
 function preview(rank){const box=el('div','hr-preview'),count=H.count(rank);box.append(el('strong','',count?`开局随机负面词条 ×${count}`:'无额外负面词条'),el('p','',count?'开局抽取，本局固定；与职级的敌方属性增幅叠加。':'从上等兵起，行动将出现随机负面词条。'));if(count)box.append(badges(Object.values(H.rules)));return box;}
 function current(run){const entries=H.list(run);if(!entries.length)return null;const panel=el('details','hr-current');panel.open=run.phase==='opening';const name=root.HaffCareerRanks.ranks[run.careerRun.rank].name;panel.append(el('summary','',`${name} · 本局负面词条 ${entries.length}`));const content=el('div','hr-current-content');content.append(badges(entries));panel.append(content);return panel;}
 root.HaffRankHazardsUI={preview,current};
})(window);
