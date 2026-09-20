/* Visual-only environment lighting and bounded, board-projected ultimate residue. */
(function(root){
  'use strict';
  const lighting=Object.freeze({
    dam:{topLeft:0xe0d6bc,topRight:0xfff0d4,bottomLeft:0xa8b1aa,bottomRight:0xc1c4b0,ground:0xcbb286,shadowX:-12},
    spaceport:{topLeft:0xb0d1e4,topRight:0xe4f4ff,bottomLeft:0x879cad,bottomRight:0xabc0cf,ground:0x85bfdc,shadowX:-7},
    prison:{topLeft:0xb0d7d0,topRight:0xd9e8e4,bottomLeft:0x869c9c,bottomRight:0xa7bbb5,ground:0x82b6ab,shadowX:9}
  });
  const pools=new WeakMap(),aftermathScenes=new Set();
  function clearAftermath(scene){
    if(!scene){for(const active of [...aftermathScenes])clearAftermath(active);return;}
    for(const g of pools.get(scene)||[]){scene.tweens.killTweensOf(g);if(g.scene)scene.discard(g);}
    pools.delete(scene);aftermathScenes.delete(scene);
  }
  function environment(state){return lighting[root.HaffPlaneBackdrops?.theme(state)?.id]||lighting.dam;}
  function depth(y,height){return .86+.16*Math.max(0,Math.min(1,y/Math.max(1,height)));}
  function light(art,state,alive=true){
    if(!alive){art.setTint(0x59615b);return;}
    const p=environment(state);art.setTint(p.topLeft,p.topRight,p.bottomLeft,p.bottomRight);
  }
  function grounding(scene,container,width,state){
    const p=environment(state),objects=[];
    for(const [scale,alpha]of [[1.35,.08],[1.08,.13],[.78,.22]]){
      objects.push(scene.add.ellipse(p.shadowX,5,width*scale,width*.22*scale,0x03080a,alpha));
    }
    objects.push(scene.add.ellipse(0,0,width*.9,width*.13,p.ground,.09));
    container.add(objects);return objects;
  }
  function aftermath(scene,s){
    if(s.rank!==3||!s.boardDepth||!scene.board?.scene)return false;
    const pool=(pools.get(scene)||[]).filter(g=>g.scene);
    while(pool.length>=2){const old=pool.shift();scene.tweens.killTweensOf(old);scene.discard(old);}
    const g=scene.keep(scene.add.graphics());scene.board.add(g);pool.push(g);pools.set(scene,pool);aftermathScenes.add(scene);
    const {map,to}=s.boardDepth,c=parseInt(s.profile.color.slice(1),16),theme=s.profile.theme;
    const line=(points,color=c,width=1,alpha=.55)=>{
      g.lineStyle(width,color,alpha);
      for(let i=1;i<points.length;i++){const a=map.project({...to,x:to.x+points[i-1][0],y:to.y+points[i-1][1],z:0}),b=map.project({...to,x:to.x+points[i][0],y:to.y+points[i][1],z:0});g.lineBetween(a.x,a.y,b.x,b.y);}
    };
    const ring=(r,color=c)=>line(Array.from({length:33},(_,i)=>[Math.cos(i*Math.PI/16)*r,Math.sin(i*Math.PI/16)*r*.3]),color,1,.35);
    if(['breach','missile','overdrive'].includes(theme)){
      for(let i=0;i<7;i++){const a=i*2.399,dx=Math.cos(a),dy=Math.sin(a)*.3;const pts=[[0,0],[dx*.035,dy*.035],[dx*.07+.008,dy*.07-.006],[dx*.12,dy*.12]];line(pts,0x08100f,4,.75);line(pts,0xd7a37d,1,.5);}
    }else if(theme==='spider'){
      ring(.07);for(let i=0;i<6;i++){const a=i*Math.PI/3;line([[0,0],[Math.cos(a)*.11,Math.sin(a)*.033]],c,1,.5);}
    }else if(theme==='hound'){
      for(let i=0;i<6;i++){const x=(i-3)*.027,y=i%2?.012:-.012;line([[x-.005,y],[x+.005,y]],c,3,.6);}
    }else if(theme==='hummingbird'){
      line([[-.085,-.025],[.085,-.025],[.085,.025],[-.085,.025],[-.085,-.025]],c,1,.5);line([[-.04,0],[.04,0]],c,1,.3);
    }else if(theme==='interference'){
      for(let i=-2;i<=2;i++)line([[-.12,i*.013],[-.04,i*.013],[-.04,i*.013+.006],[.11,i*.013+.006]],i%2?0xa7e5ee:0xc994df,2,.5);
    }else if(theme==='recon'||theme==='stealth'){
      for(let i=-1;i<=1;i++)line([[-.11,i*.014],[.08,i*.014],[.05,i*.014-.009]],c,2,.6);
    }else if(theme==='cryo'){
      for(let i=0;i<6;i++){const a=i*Math.PI/3;line([[0,0],[Math.cos(a)*.1,Math.sin(a)*.03]],c,2,.5);}ring(.07);
    }else if(['riot','anchor'].includes(theme)){
      line([[-.11,-.03],[.11,-.03],[.11,.03],[-.11,.03],[-.11,-.03]],c,2,.55);
      for(let i=-2;i<=2;i++)line([[i*.035,-.03],[i*.035,.03]],c,1,.25);
    }else if(['medical','swarm','firefly'].includes(theme)){
      ring(.1);for(let i=0;i<5;i++){const a=i*2.4,x=Math.cos(a)*.075,y=Math.sin(a)*.025;line([[x-.008,y],[x+.008,y]],c,2);line([[x,y-.004],[x,y+.004]],c,2);}
    }else{ring(.06);ring(.11);line([[0,0],[.1,-.018]],c,2);}
    scene.tweens.add({targets:g,alpha:0,delay:350,duration:1600,ease:'Sine.easeIn',onComplete:()=>{
      if(g.scene)scene.discard(g);
      const remaining=(pools.get(scene)||[]).filter(item=>item.scene);pools.set(scene,remaining);
      if(!remaining.length){pools.delete(scene);aftermathScenes.delete(scene);}
    }});
    return true;
  }
  function skillCue(scene,point,kind,color,reduced){
    const map=root.HaffBoardCinematics?.projection(scene.scale.width,scene.scale.height);
    if(!map||!scene.board?.scene)return false;
    const g=scene.keep(scene.add.graphics()),foot=map.ground(point);scene.board.add(g);
    const p=(x,y)=>map.project({...foot,x:foot.x+x,y:foot.y+y,z:0});
    const line=(points,width=2,alpha=.65)=>{g.lineStyle(width,color,alpha);for(let i=1;i<points.length;i++){const a=p(...points[i-1]),b=p(...points[i]);g.lineBetween(a.x,a.y,b.x,b.y);}};
    if(['cover','anchor','revive','smoke','wolfSmoke'].includes(kind)){
      line([[-.06,-.02],[.06,-.02],[.06,.02],[-.06,.02],[-.06,-.02]],1,.4);
      if(kind==='revive'){line([[-.014,0],[.014,0]]);line([[0,-.009],[0,.009]]);}
      else if(kind==='cover')line([[-.04,-.012],[0,-.024],[.04,-.012],[.032,.012],[0,.026],[-.032,.012],[-.04,-.012]]);
      else for(let i=-1;i<=1;i++)line([[-.035,i*.009],[.035,i*.009]],1,.3);
    }else if(['decode','volt','flash','reconArrow'].includes(kind)){
      for(const sign of [-1,1])line([[sign*.055,-.018],[sign*.035,-.018],[sign*.035,.018],[sign*.055,.018]],1,.65);
      if(kind==='volt')line([[-.035,0],[-.01,-.009],[.008,.009],[.035,0]],2,.8);
    }else{
      for(const side of [-1,1])line([[side*.065,-.02],[side*.042,-.02],[side*.042,-.01]],2,.7);
      line([[-.022,.018],[0,.029],[.022,.018]],2,.7);
    }
    scene.tweens.add({targets:g,alpha:0,delay:reduced?0:140,duration:reduced?180:420,ease:'Sine.easeIn',onComplete:()=>{if(g.scene)scene.discard(g);}});
    return true;
  }
  const api={lighting,environment,depth,light,grounding,aftermath,clearAftermath,skillCue};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HaffArtDirection=api;
})(typeof window!=='undefined'?window:globalThis);
