(function(root){
 'use strict';
 const views=new WeakMap();
 function update(host,run){
  const view=views.get(host),stock=run.blackMarket;
  if(!view||!stock)return false;
  const offers=[...stock.gear,...stock.relics];
  if(offers.length!==view.size||offers.some(offer=>!view.has(offer.uid)))return false;
  for(const offer of offers){
   const {card,buy,name}=view.get(offer.uid),price=`${(offer.price/10000).toLocaleString('zh-CN',{maximumFractionDigits:2})} 万`;
   card.dataset.sold=String(offer.sold);buy.disabled=offer.sold||run.coins<offer.price;
   buy.textContent=offer.sold?'已售出':price;buy.setAttribute('aria-label',`${name} · ${offer.sold?'已售出':'购买 '+price}`);
  }
  return true;
 }
 function render(run,C,onAction){
  const make=(tag,cls,text)=>{const el=document.createElement(tag);el.className=cls||'';if(text!==undefined)el.textContent=text;return el;};
  const host=make('section','hbm-market');host.setAttribute('aria-label','黑市装备与藏品');
  const head=make('header','hbm-heading'),help=make('summary','hbm-help','ⓘ'),helpWrap=make('details','hbm-help-wrap');help.setAttribute('aria-label','黑市规则');help.title='干员减价 1 万；货架固定，不可刷新。装备与藏品购买后入库，回收价不超过购价的 50%。';helpWrap.append(help);head.append(make('h2','','黑市交易'),helpWrap);host.append(head);
  const stock=run.blackMarket;if(!stock){const retry=make('button','hbm-buy','载入装备与藏品货架');retry.type='button';retry.onclick=()=>onAction({type:'prepareMarket'});host.append(make('p','','黑市物资尚未载入。'),retry);return host;}
  const entries=new Map();views.set(host,entries);
  const odds=C.marketRarity(run),cash=n=>`${(n/10000).toLocaleString('zh-CN',{maximumFractionDigits:2})} 万`;
  for(const [kind,title,offers]of [['gear','装备货架',stock.gear],['relic','藏品货架',stock.relics]]){
   const section=make('section','hbm-shelf'),bar=make('header','hbm-shelf-heading');bar.append(make('h3','',title));
   if(kind==='relic')help.title+=`\n藏品每格：红色 ${(odds.red*100).toFixed(0)}%（其中至臻 ${(odds.supreme*100).toFixed(1)}%）· 金色 ${(odds.gold*100).toFixed(0)}%。`;section.append(bar);
   const grid=make('div','hbm-grid');
   for(const offer of offers){
    const data=C.itemInfo(offer),info=root.HaffLoadoutGuide?.describe(offer),card=make('article','hbm-card');card.dataset.quality=data.quality;card.dataset.sold=String(offer.sold);card.dataset.supreme=String(!!data.supreme);
    const detail=make('button','hbm-detail');detail.type='button';detail.setAttribute('aria-label',`查看${data.name}属性`);detail.title=[data.name,...(info?.attributes||[]).map(row=>`${row.label} ${row.value}`),data.effect||data.passive||''].filter(Boolean).join('\n');
    const image=make('img');image.alt='';image.draggable=false;image.src=kind==='relic'?data.image:`assets/haff-war/equip-${data.icon||(data.slot==='armor'?'vest':data.slot==='helmet'?'helmet':'rifle')}.svg`;
    detail.append(image,make('strong','',data.name));if(data.supreme)detail.title='至臻藏品\n'+detail.title;
    detail.onclick=()=>root.HaffLoadoutGuideUI?.showItem(offer,detail,{status:`黑市售价 ${cash(offer.price)} · 查看完整属性`});card.append(detail);
    const buy=make('button','hbm-buy',offer.sold?'已售出':cash(offer.price));buy.type='button';buy.setAttribute('aria-label',`${data.name} · ${offer.sold?'已售出':'购买 '+cash(offer.price)}`);buy.disabled=offer.sold||run.coins<offer.price;buy.onclick=()=>onAction({type:'buyMarketItem',uid:offer.uid});card.append(buy);grid.append(card);
    entries.set(offer.uid,{card,buy,name:data.name});
   }
   section.append(grid);host.append(section);
  }

  helpWrap.append(make('p','hbm-help-copy',help.title));
  return host;
 }
 root.HaffBlackMarketUI={render,update};
})(window);
