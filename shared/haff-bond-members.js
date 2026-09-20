/* Read-only roster presentation. A duplicate copy never creates another member. */
(function(root){
 'use strict';
 const states={deployed:{label:'已上阵',mark:'✓',order:0},owned:{label:'已获得 · 未上阵',mark:'○',order:1},missing:{label:'未获得',mark:'−',order:2}};
 function state(run,id){return run?.copies?.[id]>0?run.deployed.includes(id)?'deployed':'owned':'missing';}
 function members(bond,run,units){return [...new Set(bond.members)].filter(id=>units[id]).map(id=>({id,unit:units[id],state:state(run,id)})).sort((a,b)=>states[a.state].order-states[b.state].order);}
 function render(bond,run,units,onInspect,passive=false){
  const row=document.createElement('div');row.className='hbc-bond-members';row.setAttribute('role','group');row.setAttribute('aria-label',`${bond.name} · 包含干员`);
  for(const member of members(bond,run,units)){
   const {id,unit}=member,info=states[member.state],button=document.createElement(passive?'span':'button');if(!passive)button.type='button';button.className='hbc-member-avatar';button.dataset.member=id;button.dataset.state=member.state;if(!passive)button.dataset.hiTip=`${unit.name}\n${info.label}`;button.setAttribute('aria-label',`${unit.name} · ${info.label}`);
   const frame=document.createElement('span');frame.className='hbc-member-image';frame.setAttribute('aria-hidden','true');const image=document.createElement('img');image.src=unit.portrait;image.alt='';image.draggable=false;
   if(unit.art){const [width,height]=unit.art.size,[cx,cy,cw,ch]=unit.art.crop,side=Math.min(cw,ch),x=cx+(cw-side)/2;image.style.width=`${width/side*100}%`;image.style.height=`${height/side*100}%`;image.style.left=`${-x/side*100}%`;image.style.top=`${-cy/side*100}%`;}
   frame.append(image);const badge=document.createElement('span');badge.className='hbc-member-state';badge.textContent=info.mark;badge.setAttribute('aria-hidden','true');button.append(frame,badge);if(!passive)button.addEventListener('click',()=>onInspect?.(member,info));row.append(button);
  }
  return row;
 }
 function legend(){const row=document.createElement('div');row.className='hbc-member-legend';row.setAttribute('aria-label','头像状态图例');for(const [key,info] of Object.entries(states)){const mark=document.createElement('span');mark.dataset.state=key;mark.textContent=info.mark;mark.tabIndex=0;mark.dataset.hiTip=info.label;mark.setAttribute('aria-label',info.label);row.append(mark);}return row;}
 function detail(bond,run,units,limitNote='',heading=true){
  const make=(tag,cls,text)=>{const el=document.createElement(tag);el.className=cls;if(text!==undefined)el.textContent=text;return el;};
  const panel=make('section','hbc-bond-detail'),list=members(bond,run,units);
  if(heading)panel.append(make('h3','',bond.name));
  if(heading)panel.append(make('small','hbc-tier-open','点击羁绊查看完整档位说明'));
  if(bond.primary)panel.append(make('small','hbc-bond-kind','主羁绊 · 干员定位'));
  panel.append(make('small','hbc-bond-roster-count',`包含 ${list.length} 名干员 · 已上阵 ${list.filter(member=>member.state==='deployed').length} 名`));
  const row=render(bond,run,units,null,true),tiles=[];
  for(const avatar of [...row.children]){const tile=make('div','hbc-hover-member'),status=avatar.dataset.state;tile.dataset.state=status;tile.append(avatar,make('strong','',units[avatar.dataset.member].name),make('small','',{deployed:'已上阵',owned:'已获得',missing:'未获得'}[status]));tiles.push(tile);}
  row.replaceChildren(...tiles);panel.append(row);
  const count=list.filter(member=>member.state==='deployed').length,thresholds=bond.thresholds||[2,3],level=thresholds.filter(n=>count>=n).length;
  panel.append(make('small','hbc-tier-progress',`当前 ${level}/${thresholds.length} 档 · ${level===thresholds.length?'全员集结 · 已满级':`再上阵 ${thresholds[level]-count} 名成员进阶`} · 高档替换低档`));
  bond.tiers.forEach((text,index)=>{const tier=make('p','hbc-hover-tier');tier.dataset.state=index===level-1?'current':index<level?'passed':'locked';tier.append(make('b','',`${thresholds[index]} 人${index===thresholds.length-1?' · 满级':''}${index===level-1?' · 当前':''}`));const marker=text.indexOf('质变 · ');if(marker>=0){tier.append(make('span','hbc-base-copy',text.slice(0,marker)),make('span','hbc-engine-copy',text.slice(marker)));}else tier.append(make('span','',text));panel.append(tier);});
  if(limitNote)panel.append(make('small','hbc-hover-limit',limitNote));
  return panel;
 }
 const api={states,state,members,render,legend,detail};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HaffBondMembers=api;
})(typeof window==='undefined'?globalThis:window);
