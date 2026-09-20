/* Presentation-only plane scenery. Images decode once; cached paints are synchronous. */
(function(root){
  'use strict';
  const Systems=typeof module!=='undefined'&&module.exports?require('./haff-systems.js'):root.HaffSystems;
  const themes=Object.freeze([
    Object.freeze({id:'dam',name:'零号大坝',file:'dam.png',base:0x292d23,tint:0x10170e,shade:.24,focusX:.5,focusY:.15}),
    Object.freeze({id:'spaceport',name:'航天基地',file:'spaceport.png',base:0x132431,tint:0x071422,shade:.18,focusX:.62,focusY:.1}),
    Object.freeze({id:'prison',name:'潮汐监狱',file:'prison.png',base:0x17272a,tint:0x081319,shade:.14,focusX:.5,focusY:.2})
  ]);
  const scriptBase=typeof document!=='undefined'?(document.currentScript?.src||document.baseURI):null;
  const cache=new Map();
  function theme(context){
    const index=typeof context==='number'?context:Systems.nodes[context?.campaign?.node]?.plane;
    return themes[index]||themes[0];
  }
  function frame(imageWidth,imageHeight,width,height,focusX=.5,focusY=.15){
    if(![imageWidth,imageHeight,width,height].every(n=>Number.isFinite(n)&&n>0))return null;
    const scale=Math.max(width/imageWidth,height/imageHeight),cropWidth=width/scale,cropHeight=height/scale;
    const cropX=Math.max(0,imageWidth-cropWidth)*Math.max(0,Math.min(1,focusX)),cropY=Math.max(0,imageHeight-cropHeight)*Math.max(0,Math.min(1,focusY));
    return {scale,cropX,cropY,cropWidth,cropHeight};
  }
  function preload(context){
    const selected=theme(context);if(cache.has(selected.id))return cache.get(selected.id).pending;
    const record={image:null,pending:null};cache.set(selected.id,record);
    record.pending=new Promise(resolve=>{
      if(!scriptBase||typeof root.Image!=='function'){resolve(null);return;}
      const image=new root.Image();image.decoding='async';
      image.onload=async()=>{
        if(typeof image.decode==='function')try{await image.decode();}catch{resolve(null);return;}
        record.image=image;resolve(image);
      };
      image.onerror=()=>resolve(null);
      image.src=new URL(`../assets/haff-war/backdrops-v2/${selected.file}`,scriptBase).href;
    });
    return record.pending;
  }
  function battleFrame(imageWidth,imageHeight,width,height,selected){
    // Put actual ground above the furthest enemy footpoint (.18h), including tall screens.
    const horizon={dam:.46,spaceport:.42,prison:.35}[selected.id]??.46;
    const scale=Math.max(width/imageWidth,height*.88/(imageHeight*(1-horizon)));
    const cropWidth=width/scale,cropHeight=height/scale;
    const cropX=(imageWidth-cropWidth)*selected.focusX;
    const cropY=Math.max(0,Math.min(imageHeight-cropHeight,imageHeight*horizon-cropHeight*.12));
    return {scale,cropX,cropY,cropWidth,cropHeight};
  }
  function draw(scene,board,width,height,context){
    if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return null;
    const selected=theme(context),slot=scene.add.container(0,0);board.add(slot);
    // Even a missing asset has its own stable plane palette, never another plane's image.
    slot.add(scene.add.rectangle(width/2,height/2,width,height,selected.base));
    function paint(image){
      if(!image||!slot.scene||!scene.sys?.game)return;
      const crop=battleFrame(image.naturalWidth,image.naturalHeight,width,height,selected);
      const key=`haff-plane-${selected.id}-v2`;
      if(!scene.textures.exists(key))scene.textures.addImage(key,image);
      const art=scene.add.image(-crop.cropX*crop.scale,-crop.cropY*crop.scale,key);
      art.setOrigin(0).setScale(crop.scale).setCrop(crop.cropX,crop.cropY,crop.cropWidth,crop.cropHeight);slot.add(art);
      slot.add(scene.add.rectangle(width/2,height/2,width,height,selected.tint,selected.shade));
      slot.add(scene.add.rectangle(width/2,23,width,46,selected.tint,.46));
      slot.add(scene.add.rectangle(width/2,height*.54+10,width,32,selected.tint,.34));
    }
    const ready=cache.get(selected.id)?.image;
    if(ready)paint(ready);else void preload(context).then(paint);
    return slot;
  }
  const api=Object.freeze({themes,theme,frame,battleFrame,preload,draw});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else {root.HaffPlaneBackdrops=api;root.HaffBattleBackdrop=api;themes.forEach((_,index)=>void preload(index));}
})(typeof window==='undefined'?globalThis:window);
