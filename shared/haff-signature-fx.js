/* Pure presentation: shares the scene tween clock and transient lifecycle. */
(function(root) {
  'use strict';
  const profiles = Object.freeze({vyron: {color:0xffc477,accent:0xff7549,kinds:['shot','dash','bomb','air']},hackclaw:{color:0xd0a1ff,accent:0x8b75ff,kinds:['shot','knife','flash','decode']},luna:{color:0x8cecff,accent:0x40adc9,kinds:['shot','volt','frag','reconArrow']}});
  function tier(value) { const n=Number(value); return Number.isFinite(n)?Math.max(1,Math.min(3,Math.floor(n))):1; }
  function describe(actor,kind,stars,reduced=false) {
    const profile=profiles[actor];
    if(!profile || !profile.kinds.includes(kind))return null;
    const rank=tier(stars), basic=kind==='shot';
    return {actor,kind,rank,color:profile.color,accent:profile.accent,layers:reduced?1:basic?1:rank,particles:reduced?0:basic?rank+1:4+rank*3,radius:basic?15:24+rank*7,duration:reduced?180:basic?260:520};
  }
  function play(scene,event,state,stars,phase,reduced=false) {
    const spec=describe(event.actor,event.kind,stars,reduced);
    if(!spec || !['cast','impact'].includes(phase))return;
    const actor=state.units.find(unit=>unit.id===event.actor);
    if(!actor || actor.hp<=0)return;
    const point=unit=>{const p=scene.position(unit.side,unit.slot);return{x:p.x,y:p.y-65};};
    const from=point(actor), targets=[...new Set(event.targets||[])].slice(0,6).map(id=>state.units.find(u=>u.id===id)).filter(Boolean);
    function own(object){return scene.keep(object);}
    function fade(object,options={}){scene.tweens.add({targets:object,alpha:0,duration:spec.duration,...options,onComplete:()=>{if(object.scene)scene.discard(object);}});}
    function graphic(x,y){return own(scene.add.graphics().setPosition(x,y));}
    function ring(p,radius,index=0){const g=graphic(p.x,p.y);g.lineStyle(index?1:2,spec.color,index?.45:.85);g.strokeCircle(0,0,radius);fade(g,reduced?{}:{scaleX:1.7,scaleY:1.7});}
    function lock(p,size,diamond=false){const g=graphic(p.x,p.y);g.lineStyle(2,spec.color,.9);for(const [x,y] of [[-1,-1],[-1,1],[1,-1],[1,1]]){g.lineBetween(x*size,y*size,x*(size-8),y*size);g.lineBetween(x*size,y*size,x*size,y*(size-8));}if(diamond)g.setRotation(Math.PI/4);fade(g,reduced?{}:{scaleX:.8,scaleY:.8});}
    function sparks(p){for(let i=0;i<spec.particles;i++){const a=i*Math.PI*2/spec.particles,d=spec.radius*(.65+(i%3)*.2);const dot=own(scene.add.rectangle(p.x,p.y,event.actor==='hackclaw'?4:2,2,i%2?spec.accent:spec.color,.85));fade(dot,{x:p.x+Math.cos(a)*d,y:p.y+Math.sin(a)*d});}}
    if(phase==='cast') {
      if(!targets.length)return;
      for(const target of targets){const to=point(target),angle=Math.atan2(to.y-from.y,to.x-from.x);
        if(!reduced){const trace=graphic(0,0);trace.lineStyle(spec.rank===3?3:1,spec.accent,.3);trace.lineBetween(from.x,from.y,to.x,to.y);fade(trace,{duration:280});
          for(let i=0;i<spec.layers;i++){const offset=(i-(spec.layers-1)/2)*6;const trail=graphic(from.x-Math.sin(angle)*offset,from.y+Math.cos(angle)*offset);trail.setRotation(angle);trail.lineStyle(i?1:2,spec.color,.9);trail.lineBetween(-22-spec.rank*5,0,6,0);
            if(event.actor==='hackclaw'){trail.lineBetween(-4,-4,7,0);trail.lineBetween(-4,4,7,0);}
            if(event.actor==='luna'){trail.lineBetween(-7,-5,0,0);trail.lineBetween(-7,5,0,0);}
            fade(trail,{x:to.x-Math.sin(angle)*offset,y:to.y+Math.cos(angle)*offset,duration:300,ease:'Quad.easeIn'});
          }
        }
      }
      if(event.kind==='dash'||event.kind==='air')for(let i=0;i<spec.layers;i++)ring(from,12+i*7,i);
      return;
    }
    for(const target of targets){const p=point(target);
      if(event.kind==='shot'){ring(p,10);sparks(p);continue;}
      if(event.actor==='vyron'){
        for(let i=0;i<spec.layers;i++)ring(p,spec.radius*.55+i*10,i);
        if(event.kind==='bomb')lock(p,16+spec.rank*3,true);
        if(event.kind==='dash'&&!reduced){const g=graphic(p.x,p.y);g.lineStyle(2,spec.accent,.8);for(let i=0;i<spec.rank+1;i++)g.lineBetween(-30,-12+i*8,22,-12+i*8);fade(g);}
      } else if(event.actor==='hackclaw'){
        for(let i=0;i<spec.layers;i++)lock(p,19+i*9,event.kind==='knife');
        const g=graphic(p.x,p.y);g.lineStyle(1,spec.accent,.8);
        for(let i=0;i<spec.rank+1;i++){const y=-16+i*12;g.lineBetween(-35,y,-14,y);g.lineBetween(14,y,35,y);}
        if(event.kind==='flash'){g.lineBetween(-26,0,26,0);g.lineBetween(0,-26,0,26);}fade(g);
      } else {
        for(let i=0;i<spec.layers;i++)ring(p,spec.radius*.6+i*10,i);
        if(event.kind==='volt'){const g=graphic(p.x,p.y);g.lineStyle(2,spec.color,.85);for(let i=0;i<spec.layers+1;i++){const a=i*2*Math.PI/(spec.layers+1),dx=Math.cos(a),dy=Math.sin(a);g.beginPath();g.moveTo(0,0);for(let k=1;k<=5;k++){const offset=k%2?5:-5;g.lineTo(dx*k*7-dy*offset,dy*k*7+dx*offset);}g.strokePath();}fade(g);}
        if(event.kind==='reconArrow')lock(p,20+spec.rank*4);
      }
      if(spec.rank===3&&!reduced){const g=graphic(p.x,p.y);g.lineStyle(1,spec.accent,.7);for(let i=0;i<12;i++){const a=i*Math.PI/6,r=spec.radius+15;g.lineBetween(Math.cos(a)*r,Math.sin(a)*r,Math.cos(a)*(r+5),Math.sin(a)*(r+5));}fade(g,{rotation:.25});}
      sparks(p);
    }
  }
  const api=Object.freeze({describe,play,tier});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.HaffSignatureFX=api;
})(typeof window!=='undefined'?window:globalThis);
