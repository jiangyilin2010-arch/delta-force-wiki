(function(root){
  'use strict';
  const Guide=root.HaffLoadoutGuide;
  const make=(tag,cls,text)=>{const el=document.createElement(tag);el.className=cls||'';if(text!==undefined)el.textContent=text;return el;};
  let card=null,origin=null;
  function image(item){
    const data=Guide.itemInfo(item),img=make('img');img.alt='';img.draggable=false;
    img.src=item.kind==='relic'?data.image:`assets/haff-war/equip-${data.icon||(data.slot==='armor'?'vest':data.slot==='helmet'?'helmet':/mp5|bison|uzi/i.test(item.key)?'smg':'rifle')}.svg`;
    return img;
  }
  function close(restore=false){const target=origin;card?.remove();card=null;origin=null;if(restore&&target?.isConnected)target.focus({preventScroll:true});}
  function place(rect){
    if(!card)return;const bounds=card.getBoundingClientRect(),pad=10,width=innerWidth,height=innerHeight;
    let left=rect.right+10;if(left+bounds.width>width-pad)left=rect.left-bounds.width-10;
    card.style.left=`${Math.max(pad,Math.min(left,width-bounds.width-pad))}px`;
    card.style.top=`${Math.max(pad,Math.min(rect.top,height-bounds.height-pad))}px`;
  }
  function showItem(item,anchor,options={}){
    const info=Guide.describe(item);if(!info)return;
    const rect=options.rect||anchor?.getBoundingClientRect()||{left:innerWidth/2,right:innerWidth/2,top:innerHeight/3};
    close();origin=anchor;card=make('section','hgl-item-card');card.dataset.quality=info.quality;card.setAttribute('role','dialog');card.setAttribute('aria-labelledby','hgl-item-title');card.setAttribute('popover','manual');
    const header=make('header'),title=make('div'),heading=make('h3','',info.name);heading.id='hgl-item-title';
    title.append(make('small','',`${info.qualityName} · ${info.slot}${Guide.itemInfo(item).supreme?' · 至臻':''}`),heading);header.append(image(item),title);
    const exit=make('button','hgl-close','×');exit.type='button';exit.setAttribute('aria-label','关闭装备属性');exit.onclick=()=>close(true);header.append(exit);card.append(header);
    if(options.status)card.append(make('p','hgl-item-status',options.status));
    const attributes=make('dl','hgl-attributes');for(const stat of info.attributes){const row=make('div');row.append(make('dt','',stat.label),make('dd','',stat.value));attributes.append(row);}card.append(attributes);
    if(info.effect)card.append(make('p','hgl-item-effect',info.effect));
    if(options.reason)card.append(make('p','hgl-item-reason',`推荐原因 · ${options.reason}`));
    if(info.acquisition)card.append(make('small','hgl-item-source',info.acquisition));
    document.body.append(card);if(typeof card.showPopover==='function')card.showPopover();else card.removeAttribute('popover');
    place(rect);root.HaffPageMotion?.panel(card);exit.focus({preventScroll:true});
  }
  function render(id,position,inventory){
    close();const advice=Guide.advice(id,position,inventory);if(!advice)return;
    let host=document.getElementById('hgl-guide');if(!host){host=make('section','hgl-guide');host.id='hgl-guide';host.setAttribute('aria-label','干员站位与配装建议');}
    const workbench=document.querySelector('.prep-workbench');if(workbench&&workbench.nextElementSibling!==host)workbench.after(host);
    const signature=JSON.stringify(advice);if(host.dataset.advice===signature)return;host.dataset.advice=signature;
    host.replaceChildren();host.dataset.operator=id;
    const role=make('div','hgl-lane');role.dataset.lane=advice.lane;role.append(make('strong','',advice.label),make('small','',advice.context));host.append(role,make('p','hgl-lane-reason',advice.reason));
    for(const kind of ['gear','relic']){
      const group=make('div','hgl-recommendations'),label=make('span','hgl-group-label',kind==='gear'?'推荐装备':'推荐藏品');group.append(label);
      for(const item of advice.items.filter(item=>item.kind===kind)){
        const data=Guide.itemInfo(item),button=make('button','hgl-recommendation');button.type='button';button.dataset.quality=data.quality;button.dataset.status=item.status.key;
        const summary=`${data.name}\n${item.status.label}\n${item.reason}`;button.dataset.hiTip=summary;button.setAttribute('aria-label',summary);button.setAttribute('aria-haspopup','dialog');
        const mark={equipped:'✓',available:'＋',other:'↗',missing:'·',reference:'◇'}[item.status.key];button.append(image(item),make('small','hgl-availability',mark));
        button.onclick=()=>showItem(item,button,{status:item.status.label,reason:item.reason});group.append(button);
      }
      host.append(group);
    }
  }
  document.addEventListener('pointerdown',event=>{if(card&&!card.contains(event.target)&&!origin?.contains(event.target))close();},true);
  document.addEventListener('keydown',event=>{if(card&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close(true);}},true);
  document.addEventListener('scroll',event=>{if(card&&!card.contains(event.target))close();},true);
  document.addEventListener('dragstart',()=>close(),true);
  document.addEventListener('haff:page-revealed',()=>close());
  window.addEventListener('resize',()=>close());window.addEventListener('pagehide',()=>close());
  root.HaffLoadoutGuideUI={render,showItem,close};
})(window);
