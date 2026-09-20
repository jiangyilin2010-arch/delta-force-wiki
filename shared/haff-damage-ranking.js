(function(root) {
  'use strict';
  const storageKey = 'haff-damage-ranking-visible';
  function report(state) {
    const units = (state?.units || []).filter(u => u.side === 'ally');
    const total = units.reduce((sum, u) => sum + Math.max(0, Number(u.damage) || 0), 0);
    const sorted = units.map((unit, index) => ({unit, index, damage:Math.max(0, Number(unit.damage) || 0)})).sort((a,b) => b.damage-a.damage || a.index-b.index);
    const max = sorted[0]?.damage || 0;
    return {total, rows:sorted.map(({unit,damage}, rank) => ({id:unit.id, name:unit.name, portrait:unit.portrait, art:unit.art, color:unit.color, down:unit.hp<=0, damage, rank:rank+1, share:total?damage/total:0, width:max?damage/max:0}))};
  }
  const number = value => value >= 1e8 ? `${(value/1e8).toFixed(1)}亿` : value >= 1e4 ? `${(value/1e4).toFixed(1)}万` : String(Math.round(value));
  function mount(doc, storage) {
    const view=doc.getElementById('battle-view'), rail=view?.querySelector('.turn-strip'), commands=view?.querySelector('.commands');
    if(!rail || !commands) return null;
    const make=(tag,cls,text)=>{const n=doc.createElement(tag);n.className=cls;if(text!==undefined)n.textContent=text;return n;};
    let enabled=true, current=null, active=false, order='', signature=''; const entries=new Map();
    try { enabled=storage?.getItem(storageKey)!=='false'; } catch(_) {}
    const panel=make('section','hr-damage'), heading=make('header','hr-heading'), title=make('h2','','伤害排行'), close=make('button','hr-close','收起');
    panel.id='live-damage-ranking';panel.setAttribute('aria-label','本场实时伤害排名');
    close.type='button';close.setAttribute('aria-label','关闭实时伤害排行');
    const total=make('p','hr-total'), caption=make('span','','全队伤害'), sum=make('strong','','0');total.append(caption,sum);
    const list=make('ol','hr-rows');list.setAttribute('aria-label','按累计伤害从高到低排列');
    const scroller=make('div','hr-scroll');scroller.tabIndex=0;
    scroller.setAttribute('role','region');scroller.setAttribute('aria-label','本场伤害前五名');
    scroller.append(list);
    const note=make('small','hr-note','含装备、藏品和羁绊');
    heading.append(title,close);panel.append(heading,total,scroller,note);rail.prepend(panel);
    const toggle=make('button','hr-toggle','伤害排行');toggle.type='button';toggle.setAttribute('aria-controls',panel.id);commands.prepend(toggle);
    function visibility(){panel.hidden=!enabled;view.dataset.damageRanking=enabled?'on':'off';toggle.setAttribute('aria-pressed',String(enabled));toggle.title=enabled?'关闭实时伤害排行':'显示实时伤害排行';}
    function setEnabled(value){enabled=value;try{storage?.setItem(storageKey,String(enabled));}catch(_){}visibility();if(enabled&&current)paint(current);}
    toggle.addEventListener('click',()=>setEnabled(!enabled));close.addEventListener('click',()=>{setEnabled(false);toggle.focus({preventScroll:true});});
    function create(row){
      const el=make('li','hr-row'),rank=make('b','hr-rank'),portrait=make('span','hr-portrait'),image=make('img','');image.alt='';image.src=row.portrait;
      if(row.art){const [x,y,w,h]=row.art.crop,[width,height]=row.art.size;Object.assign(image.style,{width:`${width/w*100}%`,height:`${height/h*100}%`,left:`${-x/w*100}%`,top:`${-y/h*100}%`});}
      portrait.append(image);const name=make('strong','hr-name',row.name),amount=make('span','hr-amount'),bar=make('span','hr-bar'),fill=make('i',''),share=make('small','hr-share');
      bar.setAttribute('aria-hidden','true');bar.append(fill);el.append(rank,portrait,name,amount,bar,share);el.dataset.operator=row.id;
      el.style.setProperty('--hr-color',`#${Number(row.color||0xb4d699).toString(16).padStart(6,'0')}`);
      const entry={el,rank,amount,fill,share};entries.set(row.id,entry);return entry;
    }
    function paint(state){
      const full=report(state),data={total:full.total,rows:full.rows.slice(0,5)},ids=new Set(data.rows.map(r=>r.id));
      const nextSignature=`${data.total}|`+data.rows.map(row=>`${row.id}:${row.damage}:${row.down}`).join('|');
      if(signature===nextSignature)return;signature=nextSignature;
      for(const [id,entry]of entries)if(!ids.has(id)){entry.el.remove();entries.delete(id);}
      sum.textContent=number(data.total);sum.title=String(data.total);
      list.style.setProperty('--hr-count',data.rows.length);
      for(const row of data.rows){const e=entries.get(row.id)||create(row);e.rank.textContent=String(row.rank);e.amount.textContent=number(row.damage);e.share.textContent=`${Math.round(row.share*100)}%`;e.fill.style.transform=`scaleX(${row.width})`;e.el.style.setProperty('--hr-index',row.rank-1);e.el.dataset.downed=String(row.down);e.el.setAttribute('aria-label',`第${row.rank}名，${row.name}，累计伤害${row.damage}，占比${Math.round(row.share*100)}%`);}
      const next=data.rows.map(r=>r.id).join(':');
      if(next!==order){order=next;for(const row of data.rows)list.append(entries.get(row.id).el);}
    }
    function update(state, started=true){current=state;active=started;toggle.disabled=!active;if(enabled&&active)paint(state);}
    visibility();return {update,setEnabled,report,get enabled(){return enabled;}};
  }
  const api={report,number,mount};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else {let storage;try{storage=root.localStorage;}catch(_){}root.HaffDamageRanking=mount(root.document,storage)||api;}
})(typeof window==='undefined'?globalThis:window);
