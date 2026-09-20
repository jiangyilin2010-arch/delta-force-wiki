/* Board-space presentation. Ground projection matches the .64 -> 1 grid convergence
   in WarScene.layout; Phaser applies the cinematic camera once, to every layer. */
(function(root){
  'use strict';
  const clamp=n=>Math.max(0,Math.min(1,n)),ease=n=>1-(1-clamp(n))**3;
  function projection(width,height){
    const w=Math.max(1,width),h=Math.max(51,height),top=35,bottom=h-15,v=top-.64*(bottom-top)/.36;
    function scale(y){return 1/(1+.5625*y);}
    function project(p){const q=scale(p.y);return{x:w*.5+p.x*w*q,y:v+(bottom-v)*q-(p.z||0)*w*q,q};}
    function ground(p){const q=(p.y-v)/(bottom-v);return{x:(p.x-w*.5)/(w*q),y:(1/q-1)/.5625,z:0};}
    return{w,h,project,ground,scale};
  }
  const plus=(p,x=0,y=0,z=0)=>({x:p.x+x,y:p.y+y,z:(p.z||0)+z});
  const mix=(a,b,q)=>({x:a.x+(b.x-a.x)*q,y:a.y+(b.y-a.y)*q,z:(a.z||0)+((b.z||0)-(a.z||0))*q});
  function attach(scene,s,unit,target){
    if(s.rank<2||!scene.board?.add)return false;
    const map=projection(s.w,s.h),from=map.ground(scene.position(unit.side,unit.slot)),to=map.ground(scene.position(target.side,target.slot));
    const height=u=>scene.figures?.get(u.id)?.height||Math.min(100,s.h*(u.side==='ally'?.13:.12));
    const muzzle=(p,u)=>({...p,z:height(u)*.7/(s.w*map.scale(p.y))});
    const ground=scene.keep(scene.add.graphics()),back=scene.keep(scene.add.graphics()),front=scene.keep(scene.add.graphics()).setDepth(7);
    // Parent to the board so ground/rear faces render after its backdrop, before figures.
    scene.board.add(ground);scene.board.add(back);
    s.boardDepth={map,from,to,muzzleFrom:muzzle(from,unit),muzzleTo:muzzle(to,target),ground,back,front};
    s.cut.dataset.boardSpace='true';return true;
  }
  function stop(scene,s){
    if(!s?.boardDepth)return;
    for(const key of ['ground','back','front']){const g=s.boardDepth[key];if(g?.scene)scene.discard(g);}
    s.boardDepth=null;
  }
  function renderer(s){
    const d=s.boardDepth,map=d.map,c=parseInt(s.profile.color.slice(1),16),fade=1-ease((s.time-1580)/240);
    const pivot=s.time<900?d.from.y:d.to.y;
    function stroke(points,{floor=false,width=2,alpha=.8,color=c,closed=false,anchor=pivot}={}){
      if(points.length<2)return;
      const all=closed?[...points,points[0]]:points;
      for(let i=1;i<all.length;i++){
        const a=all[i-1],b=all[i],mid=(a.y+b.y)/2,g=floor?d.ground:mid>anchor?d.back:d.front,p=map.project(a),q=map.project(b);
        g.lineStyle(Math.max(.65,width*map.scale(mid)*Math.min(1.2,s.w/1000)),color,alpha*fade);
        g.lineBetween(p.x,p.y,q.x,q.y);
      }
    }
    function face(points,{floor=false,color=c,alpha=.08,anchor=pivot}={}){
      const mid=points.reduce((sum,p)=>sum+p.y,0)/points.length,g=floor?d.ground:mid>anchor?d.back:d.front;
      const screen=points.map(map.project);g.fillStyle(color,alpha*fade);g.beginPath();g.moveTo(screen[0].x,screen[0].y);
      for(const p of screen.slice(1))g.lineTo(p.x,p.y);g.closePath();g.fillPath();
    }
    function ring(center,r,{floor=true,height=0,alpha=.65,width=2,start=0,end=Math.PI*2}={}){
      const count=s.w<650?20:32,points=Array.from({length:count+1},(_,i)=>{const angle=start+(end-start)*i/count;return plus(center,Math.cos(angle)*r,Math.sin(angle)*r*.3,height);});
      stroke(points,{floor,alpha,width,anchor:center.y});
    }
    function post(p,height,alpha=.7){stroke([p,plus(p,0,0,height)],{alpha,anchor:p.y});}
    function prism(center,width,depth,height){
      const base=[plus(center,-width/2,-depth/2),plus(center,width/2,-depth/2),plus(center,width/2,depth/2),plus(center,-width/2,depth/2)];
      const roof=base.map(p=>plus(p,0,0,height));
      face(base,{floor:true,alpha:.12});face(roof,{alpha:.16,anchor:center.y});stroke(roof,{closed:true,anchor:center.y});
      for(let i=0;i<4;i++){const j=(i+1)%4;face([base[i],base[j],roof[j],roof[i]],{alpha:i===0?.14:.06,anchor:center.y});stroke([base[i],roof[i]],{alpha:.7,anchor:center.y});}
      stroke(base,{floor:true,closed:true,alpha:.4});
    }
    function drone(p){
      const r=.012;stroke([plus(p,-r,0),plus(p,0,-r*.3),plus(p,r,0),plus(p,0,r*.3)],{closed:true});
      for(const x of [-1,1])for(const y of [-1,1]){const rotor=plus(p,x*.024,y*.007);stroke([p,rotor],{alpha:.5});ring(rotor,.012,{floor:false,alpha:.8});}
      ring({...p,z:0},.022,{alpha:.2});
    }
    return{stroke,face,ring,post,prism,drone};
  }
  function draw(s){
    const d=s.boardDepth;if(!d)return false;
    for(const key of ['ground','back','front'])d[key].clear();
    if(s.time>=1820)return true;
    const {stroke,face,ring,post,prism,drone}=renderer(s),a=d.from,b=d.to;
    const deploy=ease(s.time/420),flight=clamp((s.time-900)/480),q=ease(flight),hit=ease((s.time-1360)/210),prep=s.time<900;
    // Ground-only charge field follows the actor's actual footpoint, including rear rows.
    ring(a,.07+deploy*.035,{alpha:.25+deploy*.3,start:-Math.PI*.85,end:Math.PI*.85});
    if(s.rank===2){
      if(!prep){ring(b,.09,{alpha:.5});stroke([a,b],{floor:true,alpha:.35});}
      return true;
    }
    const center=prep?a:b,open=prep?deploy:1;
    switch(s.profile.theme){
      case 'resonator':{
        prism(a,.05,.022,.075*open);
        for(let i=0;i<4;i++)ring(center,.04+(prep?deploy:flight)*.1+i*.025,{alpha:.55-i*.1,width:2});
        if(!prep)for(const side of [-1,1])post(plus(b,side*.1,0),.045*hit,.65);
        break;
      }
      case 'spider':{
        const body=prep?a:mix(a,b,q);prism(body,.032,.018,.023);
        for(const side of [-1,1])for(let i=-1;i<=1;i++){const p=plus(body,side*.016,i*.009);stroke([p,plus(body,side*.045,i*.018,.016),plus(body,side*.062,i*.026)],{width:2});}
        if(!prep)for(let i=0;i<6;i++){const angle=i*Math.PI/3;stroke([b,plus(b,Math.cos(angle)*.1,Math.sin(angle)*.03)],{floor:true,alpha:.6*hit});}
        break;
      }
      case 'hummingbird':{
        const bird=plus(center,0,0,.14*open);drone(bird);
        for(const side of [-1,1])stroke([bird,plus(bird,side*.065,0,.025),plus(bird,side*.025,0,-.012)],{closed:true});
        face([bird,plus(center,-.075,-.025),plus(center,.075,-.025),plus(center,.075,.025),plus(center,-.075,.025)],{alpha:.08});
        ring(center,.08,{alpha:.55});break;
      }
      case 'hound':{
        const dog=prep?a:mix(a,b,q),stride=prep?0:Math.sin(flight*18)*.009;
        prism(plus(dog,0,0,.025),.065,.022,.018);prism(plus(dog,.04,0,.044),.023,.018,.02);
        for(const x of [-1,1])for(const y of [-1,1])stroke([plus(dog,x*.025,y*.01,.03),plus(dog,x*.025+stride*y,y*.014,0)],{width:3});
        stroke([plus(dog,-.034,0,.04),plus(dog,-.058,0,.065)],{width:2});
        if(!prep)stroke([a,dog],{floor:true,alpha:.3,width:3});break;
      }
      case 'breach':{
        for(const x of [-1,1]){const p=plus(a,x*.065,.003);prism(p,.022,.025,.07*deploy);}
        if(!prep){
          const head=mix(d.muzzleFrom,d.muzzleTo,q);stroke([d.muzzleFrom,head],{width:7,alpha:.55});
          stroke([a,{...head,z:0}],{floor:true,width:5,alpha:.18});
          for(let i=0;i<3;i++)ring(b,.045+hit*(.08+i*.025),{alpha:hit*(.7-i*.17),width:i?2:5});
          for(let i=0;i<6;i++){const angle=i*Math.PI/3;stroke([b,plus(b,Math.cos(angle)*.06*hit,Math.sin(angle)*.02*hit),plus(b,Math.cos(angle+.15)*.17*hit,Math.sin(angle+.15)*.055*hit)],{floor:true,alpha:.7*hit});}
        }break;
      }
      case 'interference':{
        for(let i=-2;i<=2;i++){
          stroke([plus(center,-.13,i*.016),plus(center,.13,i*.016)],{floor:true,alpha:.45*open});
          stroke([plus(center,i*.065,-.032),plus(center,i*.065,.032)],{floor:true,alpha:.35*open});
        }
        for(const x of [-1,1]){const p=plus(center,x*.11,0);post(p,.1*open);ring(plus(p,0,0,.075*open),.025,{floor:false});}
        const scan=plus(center,0,-.032+.064*(prep?deploy:q));
        stroke([plus(scan,-.13,0),plus(scan,-.13,0,.065),plus(scan,.13,0,.065),plus(scan,.13,0)],{alpha:.7,color:0x70efff});
        stroke([plus(scan,-.125,.003,.02),plus(scan,.135,.003,.055)],{color:0xe58aff,alpha:.65});
        if(!prep)stroke([a,plus(a,0,(b.y-a.y)*.5),plus(b,0,(a.y-b.y)*.2),b],{floor:true,width:3});break;
      }
      case 'recon':{
        const bow=d.muzzleFrom;stroke([plus(bow,-.055,0,.07*deploy),plus(bow,-.09,0),plus(bow,-.055,0,-.055*deploy),plus(bow,.018,0)],{closed:true,alpha:.8});
        if(!prep){
          const head=mix(d.muzzleFrom,d.muzzleTo,q),tail=mix(d.muzzleFrom,d.muzzleTo,Math.max(0,q-.33));
          stroke([tail,head],{width:12,alpha:.14});stroke([tail,head],{width:3,alpha:1});stroke([{...tail,z:0},{...head,z:0}],{floor:true,alpha:.2});
          ring(b,.045+.07*hit,{alpha:.7*hit});
          for(const offset of [-.08,.08])stroke([plus(b,offset,-.02),plus(b,offset*.65,0),plus(b,offset,.02)],{floor:true,alpha:hit});
        }break;
      }
      case 'overdrive':{
        for(const side of [-1,1]){const p=plus(a,side*.065,0);prism(p,.025,.015,.11*open);stroke([plus(p,0,0,.11*open),plus(a,side*.025,0,.15*open)],{width:3});}
        ring(a,.095,{height:.05*open,floor:false,alpha:.7});break;
      }
      case 'missile':{
        for(let i=0;i<3;i++){
          const dest=plus(b,(i-1)*.055,(i%2)*.022-.011);ring(dest,.035,{alpha:prep?.15:.6});
          if(!prep){const p=ease(clamp((flight-i*.06)/.85)),head=mix(d.muzzleFrom,dest,p);head.z+=.2*Math.sin(p*Math.PI);const tail=mix(d.muzzleFrom,dest,Math.max(0,p-.045));tail.z+=.2*Math.sin(Math.max(0,p-.045)*Math.PI);
            stroke([tail,head],{width:5});ring({...head,z:0},.012,{alpha:.25});ring(dest,.03+hit*.025,{alpha:hit*.7});}
        }break;
      }
      case 'medical':{
        for(let i=0;i<3;i++)ring(center,.075+i*.022,{height:i*.022*open,floor:i===0,alpha:.6-i*.1});
        const cross=plus(center,0,0,.06*open);stroke([plus(cross,-.025,0),plus(cross,.025,0)],{width:4});stroke([plus(cross,0,0,-.025),plus(cross,0,0,.025)],{width:4});
        for(const x of [-1,1])post(plus(center,x*.1,.015),.1*open,.35);break;
      }
      case 'swarm':case 'firefly':{
        const count=s.profile.theme==='swarm'?4:7,r=s.profile.theme==='swarm'?.11:.14;
        for(let i=0;i<count;i++){const angle=i*Math.PI*2/count+s.time*.00065,p=plus(center,Math.cos(angle)*r,Math.sin(angle)*r*.3,(.07+.025*Math.sin(angle))*open);drone(p);if(i%2===0)stroke([p,plus(center,0,0,.025)],{alpha:.35});}
        ring(center,r,{alpha:.35});break;
      }
      case 'anchor':{
        for(const anchor of prep?[a]:[a,b]){
          const points=Array.from({length:33},(_,i)=>{const angle=i*Math.PI/16;return plus(anchor,Math.cos(angle)*.055,Math.cos(angle)*.014,(.065+Math.sin(angle)*.065)*open);});stroke(points,{width:3});ring(anchor,.065,{alpha:.35});
        }
        if(!prep){const head=mix(d.muzzleFrom,d.muzzleTo,q);stroke([mix(d.muzzleFrom,d.muzzleTo,Math.max(0,q-.2)),head],{width:6});}break;
      }
      case 'riot':{
        for(let i=-1;i<=1;i++){const p=plus(center,i*.075,Math.abs(i)*.015-.012);prism(p,.07,.012,(i===0?.125:.095)*open);}
        break;
      }
      case 'cryo':{
        ring(center,.12,{alpha:.4});
        for(let i=0;i<6;i++){const angle=i*Math.PI/3,foot=plus(center,Math.cos(angle)*.1,Math.sin(angle)*.03),apex=plus(foot,.009,.004,(.065+(i%3)*.018)*open),base=[plus(foot,-.017,-.005),plus(foot,.019,-.005),plus(foot,.012,.006),plus(foot,-.012,.006)];
          face(base,{floor:true,alpha:.15});for(let j=0;j<4;j++){face([base[j],base[(j+1)%4],apex],{alpha:j%2?.08:.2});stroke([base[j],apex],{alpha:.8});}}
        break;
      }
      case 'sonar':{
        const angle=s.time*.002,r=.15;ring(center,r,{alpha:.5});ring(center,r*.55,{alpha:.3});
        const edge=plus(center,Math.cos(angle)*r,Math.sin(angle)*r*.3),trail=plus(center,Math.cos(angle-.45)*r,Math.sin(angle-.45)*r*.3);
        face([center,edge,trail],{floor:true,alpha:.15});stroke([center,edge],{floor:true});
        for(const [x,y]of [[-.07,-.02],[.055,.018],[.08,-.017]]){const p=plus(center,x,y);ring(p,.012,{alpha:.7});post(p,.045,.5);}break;
      }
      case 'stealth':{
        for(let i=0;i<3;i++){const p=plus(center,(i-1)*.045,(i-1)*.014),end=plus(p,.032,-.018,.13*open);stroke([p,end],{width:4});stroke([p,{...end,z:0}],{floor:true,alpha:.25});face([p,end,plus(p,.01,0,.045)],{alpha:.15});}break;
      }
    }
    return true;
  }
  const api={projection,attach,draw,stop};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HaffBoardCinematics=api;
})(typeof window!=='undefined'?window:globalThis);
