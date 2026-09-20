/* Presentation only. All poses and rounds share the battle clock; no timers or combat mutations. */
(function(root){
 'use strict';
 const profiles=Object.freeze({
  shepherd:{color:0xe2c88f,accent:0xc2ad78,kick:8,lean:4,angle:.035,barrel:35,weight:1.2,style:'heavy'},
  gizmo:{color:0xe7b271,accent:0xc27d44,kick:6,lean:4,angle:.04,barrel:31,weight:1,style:'assault'},
  raptor:{color:0xa5cced,accent:0x789dbf,kick:5,lean:3,angle:.035,barrel:34,weight:1,style:'precision'},
  rover:{color:0xa8d599,accent:0x75975e,kick:5,lean:4,angle:.045,barrel:25,weight:.8,style:'compact'},
  vyron:{color:0xffc67c,accent:0xff7749,kick:11,lean:9,angle:.075,barrel:35,weight:1.3,style:'breach'},
  tempest:{color:0xaff4ff,accent:0x56b6e9,kick:6,lean:11,angle:.10,barrel:29,weight:.85,style:'stride'},
  dwolf:{color:0xffb899,accent:0xed7653,kick:8,lean:6,angle:.06,barrel:31,weight:1.1,style:'assault'},
  luna:{color:0xbbeeff,accent:0x70bacd,kick:5,lean:3,angle:.035,barrel:34,weight:1,style:'precision'},
  hackclaw:{color:0xe0d2ff,accent:0x9a83ce,kick:4,lean:5,angle:.05,barrel:23,weight:.7,style:'suppressed'},
  nameless:{color:0xd0deec,accent:0x7f99ad,kick:4,lean:5,angle:.04,barrel:25,weight:.75,style:'suppressed'},
  uluru:{color:0xffd797,accent:0xbda26d,kick:9,lean:4,angle:.035,barrel:35,weight:1.25,style:'heavy'},
  sineva:{color:0xc2dfff,accent:0x7599be,kick:7,lean:3,angle:.025,barrel:35,weight:1.2,style:'heavy'},
  nitro:{color:0xc7f6f8,accent:0x74bfca,kick:5,lean:4,angle:.035,barrel:29,weight:.95,style:'precision'},
  echo:{color:0xffe2b4,accent:0xbda074,kick:5,lean:4,angle:.04,barrel:31,weight:.95,style:'precision'},
  stinger:{color:0xd7f2b5,accent:0x92b08a,kick:5,lean:4,angle:.045,barrel:25,weight:.8,style:'compact'},
  butterfly:{color:0xcbf6e4,accent:0x85baa9,kick:4,lean:5,angle:.045,barrel:23,weight:.75,style:'compact'},
  toxik:{color:0xe4f3ac,accent:0x9caf75,kick:5,lean:3,angle:.04,barrel:24,weight:.8,style:'compact'}
 });
 const active=new WeakMap(),noise=new WeakMap(),clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
 function handles(event){return event?.kind==='shot'&&!event.ultimate&&!!profiles[event.actor];}
 function plan(event,state,stars=1,duration=920){
  if(!handles(event))return null;
  const actor=state.units.find(u=>u.id===event.actor);if(!actor||actor.hp<=0)return null;
  const valid=id=>state.units.some(u=>u.id===id&&u.side==='enemy');
  const ids=event.shots?.length?event.shots.filter(valid):[event.primaryTarget,...(event.targets||[])].filter(valid).slice(0,1);
  if(!ids.length)return null;
  const impact=duration*.52,flight=76,gap=88,first=impact-flight-(ids.length-1)*gap;
  return {profile:profiles[event.actor],actor:actor.id,rank:Math.max(1,Math.min(3,Number(stars)||1)),duration,impact,flight,rounds:ids.map((id,i)=>({id,at:first+i*gap,hit:first+i*gap+flight,critical:(event.effects||[]).some(e=>e.type==='damage'&&e.target===id&&e.critical)}))};
 }
 function stop(scene){const s=active.get(scene);if(!s)return;active.delete(scene);for(const [view,pose]of s.poses){if(view.art?.scene!==null)Object.assign(view.art,pose);}if(s.g.scene)scene.discard(s.g);}
 function start(scene,event,state,stars,reduced=false,onShot){
  stop(scene);const spec=plan(event,state,stars);if(!spec)return false;
  const view=scene.figures.get(spec.actor);if(!view)return false;
  const poses=new Map(),remember=v=>{if(v&&!poses.has(v))poses.set(v,{x:v.art.x,y:v.art.y,rotation:v.art.rotation||0,scaleX:v.art.scaleX,scaleY:v.art.scaleY});};remember(view);
  for(const r of spec.rounds)remember(scene.figures.get(r.id));
  const g=scene.keep(scene.add.graphics()).setDepth(24),s={...spec,g,poses,state,view,reduced,onShot,fired:0,time:0};active.set(scene,s);draw(scene,s,0);return true;
 }
 function advance(scene,time){const s=active.get(scene);if(!s)return false;s.time=Math.max(s.time,time);while(s.fired<s.rounds.length&&s.time>=s.rounds[s.fired].at){s.fired++;s.onShot?.(s.profile);}draw(scene,s,s.time);return true;}
 function draw(scene,s,t){
  const {g,profile:p,view,reduced,rank}=s;g.clear();
  const actor=s.state.units.find(u=>u.id===s.actor),foot=scene.position(actor.side,actor.slot),targetPoint=id=>{const u=s.state.units.find(u=>u.id===id),v=scene.figures.get(id),q=scene.position(u.side,u.slot);return{x:q.x,y:q.y-(v?.height||65)*.52-4};};
  const index=Math.min(s.rounds.length-1,Math.max(0,s.rounds.findLastIndex(r=>t>=r.at-30))),round=s.rounds[index],to=targetPoint(round.id),pose=s.poses.get(view),h=view.height||70;
  const aim=smooth(t/180)*(1-smooth((t-s.impact-100)/240)),direction=Math.sign(to.x-foot.x)||1,angle=Math.atan2(to.y-(foot.y-h*.4),to.x-foot.x);
  const recoil=s.rounds.reduce((n,r)=>{const age=t-r.at;return n+(age>=0&&age<150?Math.exp(-age/45)*Math.sin(Math.min(1,age/15)*Math.PI/2):0);},0);
  const unitScale=Math.max(.65,Math.min(1.25,h/85)),lean=reduced?0:p.lean*unitScale*aim,kick=reduced?0:recoil*p.kick*unitScale;
  const stride=!reduced&&p.style==='stride'?Math.sin(aim*Math.PI/2)*7*direction:0;
  view.art.x=pose.x+Math.cos(angle)*(lean-kick)+stride;view.art.y=pose.y+Math.sin(angle)*(lean-kick)+(!reduced&&p.style==='breach'?aim*2:0);
  view.art.rotation=pose.rotation+(reduced?0:direction*(p.angle*aim-recoil*.045));view.art.scaleX=pose.scaleX*(1+(reduced?0:aim*.025));view.art.scaleY=pose.scaleY*(1+(reduced?0:aim*.025));
  for(const [v,base]of s.poses){if(v===view)continue;let hit=0;for(const r of s.rounds)if(scene.figures.get(r.id)===v){const age=t-r.hit;if(age>=0&&age<140)hit+=Math.sin(age/140*Math.PI)*Math.exp(-age/90);}
   v.art.x=base.x+(reduced?0:Math.cos(angle)*hit*5);v.art.y=base.y+(reduced?0:Math.sin(angle)*hit*4);v.art.rotation=base.rotation+(reduced?0:hit*.035*direction);
  }
  if(aim<=0&&t>s.impact+350)return;
  const shoulder={x:foot.x+view.art.x,y:foot.y+view.art.y-h*.38},weaponAngle=angle+(reduced?0:(1-aim)*direction*.7-recoil*.035),size=unitScale;
  const point=(x,y)=>({x:shoulder.x+(Math.cos(weaponAngle)*x-Math.sin(weaponAngle)*y)*size,y:shoulder.y+(Math.sin(weaponAngle)*x+Math.cos(weaponAngle)*y)*size});
  const line=(a,b,color,width=1,alpha=1)=>{const x=point(...a),y=point(...b);g.lineStyle(width*size,color,alpha*aim).lineBetween(x.x,x.y,y.x,y.y);};
  // Stock, receiver, magazine, sight rail and barrel are rooted at the shoulder, not the card centre.
  line([-12,3],[9,3],0x081012,9);line([-10,-2],[12,-2],0x647477,2);line([-11,3],[-15,7],0x182225,6);line([1,5],[-2,14],0x26363a,5);line([8,5],[7,10],0x617572,3);line([8,1],[p.barrel-3,1],0x152023,5);line([9,-2],[p.barrel-7,-2],0x8b9c99,1.5);line([p.barrel-5,1],[p.barrel,1],0xa4b0a6,p.style==='suppressed'?5:3);line([1,-3],[6,-6],p.accent,2,.9);
  if(!reduced&&p.style==='breach'){g.lineStyle(1,p.accent,.25*aim);g.strokeEllipse(foot.x,foot.y+3,52+recoil*12,12);line([-8,8],[-12,13],0xffb067,2,.5);}
  if(!reduced&&p.style==='stride'&&aim>.2){g.lineStyle(1,p.accent,.22*aim);g.lineBetween(foot.x-direction*20,foot.y-10,foot.x-direction*9,foot.y-18);g.lineBetween(foot.x-direction*25,foot.y-6,foot.x-direction*15,foot.y-14);}
  const muzzle=point(p.barrel+2,1);
  for(const [i,r]of s.rounds.entries()){
   const age=t-r.at,dest=targetPoint(r.id),a=Math.atan2(dest.y-muzzle.y,dest.x-muzzle.x),ux=Math.cos(a),uy=Math.sin(a);
   if(age>=0&&age<65){const f=1-age/65,length=(p.style==='suppressed'?10:20+rank*4)*size;
    g.lineStyle((reduced?2:5)*size,p.color,f);g.lineBetween(muzzle.x,muzzle.y,muzzle.x+ux*length,muzzle.y+uy*length);
    g.fillStyle(0xfff4d6,f).fillCircle(muzzle.x,muzzle.y,(reduced?2:4)*size);
    if(!reduced){for(const sign of [-1,1]){g.lineStyle(2,p.accent,f*.8).lineBetween(muzzle.x,muzzle.y,muzzle.x+ux*length*.65-uy*sign*8*size,muzzle.y+uy*length*.65+ux*sign*8*size);}}
   }
   if(age>=0&&age<s.flight){const progress=clamp(age/s.flight),tail=Math.max(0,progress-.17),x=muzzle.x+(dest.x-muzzle.x)*progress,y=muzzle.y+(dest.y-muzzle.y)*progress;
    g.lineStyle(reduced?1:2,p.color,.9).lineBetween(muzzle.x+(dest.x-muzzle.x)*tail,muzzle.y+(dest.y-muzzle.y)*tail,x,y);
    if(!reduced)g.lineStyle(1,0xffffff,.8).lineBetween(x-ux*8,y-uy*8,x,y);
   }
   if(!reduced&&age>=0&&age<260){const k=age/260,eject=point(2,5),x=eject.x+direction*(9+24*k)*size,y=eject.y-18*Math.sin(k*Math.PI)+14*k;
    g.lineStyle(3,0xd3ac65,1-k).lineBetween(x,y,x+Math.cos(k*12+i)*4,y+Math.sin(k*12+i)*4);
   }
   const hitAge=t-r.hit;if(hitAge>=0&&hitAge<210){const f=1-hitAge/210,spread=(4+hitAge*.07)*size,critical=r.critical;
    g.lineStyle(critical?3:2,critical?0xffe795:p.color,f).lineBetween(dest.x-spread,dest.y-spread,dest.x-2,dest.y-2);g.lineBetween(dest.x+2,dest.y+2,dest.x+spread,dest.y+spread);g.lineBetween(dest.x+spread,dest.y-spread,dest.x+2,dest.y-2);g.lineBetween(dest.x-2,dest.y+2,dest.x-spread,dest.y+spread);
    if(!reduced){for(let n=0;n<(rank===3?7:4);n++){const theta=n*2.399+i*.6,d=spread*(1+n*.15);g.lineStyle(1,n%2?p.accent:p.color,f*.8).lineBetween(dest.x+Math.cos(theta)*d,dest.y+Math.sin(theta)*d,dest.x+Math.cos(theta)*(d+5),dest.y+Math.sin(theta)*(d+5));}}
   }
  }
 }
 function shotSound(audio,p){
  const now=audio.currentTime;let buffer=noise.get(audio);if(!buffer){buffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*.13),audio.sampleRate);const samples=buffer.getChannelData(0);let seed=73;for(let i=0;i<samples.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;samples[i]=seed/2147483648-1;}noise.set(audio,buffer);}
  const source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();source.buffer=buffer;filter.type='highpass';filter.frequency.value=p.style==='suppressed'?1100:650;gain.gain.setValueAtTime(.045*p.weight,now);gain.gain.exponentialRampToValueAtTime(.001,now+.105);source.connect(filter);filter.connect(gain);gain.connect(audio.destination);source.start(now);source.stop(now+.12);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
  const bass=audio.createOscillator(),body=audio.createGain();bass.type='triangle';bass.frequency.setValueAtTime(p.style==='breach'?130:170,now);bass.frequency.exponentialRampToValueAtTime(45,now+.085);body.gain.setValueAtTime(.035*p.weight,now);body.gain.exponentialRampToValueAtTime(.001,now+.11);bass.connect(body);body.connect(audio.destination);bass.start(now);bass.stop(now+.12);bass.onended=()=>{bass.disconnect();body.disconnect();};
 }
 const api={profiles,handles,plan,start,advance,stop,shotSound};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HaffRifleActions=api;
})(typeof window==='undefined'?globalThis:window);
