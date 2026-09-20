/* Presentation clock only. No combat RNG, state mutations, timers or save writes. */
(function(root){
'use strict';
const profiles={vyron:{kind:'air',name:'威龙',title:'虎蹲炮',tag:'KINETIC BREAK',color:0xffc785,css:'#ffc785'},hackclaw:{kind:'decode',name:'麦晓雯 · 骇爪',title:'信号破译',tag:'SYSTEM BREACH',color:0xc9a3ff,css:'#c9a3ff'},luna:{kind:'reconArrow',name:'露娜',title:'侦察箭矢',tag:'HORIZON PIERCER',color:0x8eeaff,css:'#8eeaff'}};
const active=new WeakMap();
const clamp=n=>Math.max(0,Math.min(1,n));
const ease=n=>1-Math.pow(1-clamp(n),3);
function eligible(event){return profiles[event.actor]?.kind===event.kind;}
function isUltimate(event){return !!event&&event.ultimate!==false&&(!!event.freeAction||eligible(event)||!!root.HaffWar?.units?.[event.actor]?.skills?.some(skill=>skill.id===event.kind&&skill.ultimate));}
function playbackRate(event,speed=1){return isUltimate(event)?Math.min(1.5,Math.max(1,speed)):speed;}
// Keep the controller's action window aligned with the director's 900–1820 shot track.
function actionDuration(event,normal=920){return isUltimate(event)?2400:normal;}
function stop(scene){const s=active.get(scene);if(!s)return;const c=scene.cameras.main;c.setZoom(s.base.zoom);c.setScroll(s.base.x,s.base.y);s.cut?.remove();if(s.trail?.scene)scene.discard(s.trail);active.delete(scene);}
function start(scene,event,state,stars,reduced){if(!eligible(event))return false;stop(scene);if(reduced)return false;
const unit=state.units.find(u=>u.id===event.actor),target=state.units.find(u=>u.id===event.targets?.[0]);if(!unit||!target)return false;
const profile=profiles[event.actor],rank=Math.max(1,Math.min(3,Number(stars)||1)),c=scene.cameras.main,w=scene.scale.width,h=scene.scale.height;
const point=u=>{const p=scene.position(u.side,u.slot);return{x:p.x,y:p.y-60};};
const host=document.getElementById('battlefield'),cut=document.createElement('div');if(!document.getElementById('battle-view'))host.scrollIntoView({block:'start',behavior:'instant'});cut.className='hu-cut';cut.dataset.operator=event.actor;cut.setAttribute('aria-hidden','true');cut.style.setProperty('--hu-color',profile.css);
const portrait=document.createElement('img');portrait.className='hu-portrait';portrait.src=root.HaffWar.units[event.actor].portrait;portrait.alt='';cut.append(portrait);
const copy=document.createElement('div');copy.className='hu-copy';for(const [tag,text] of [['small',profile.tag],['b',profile.title],['p',profile.name],['em','★'.repeat(rank)]]){const node=document.createElement(tag);node.textContent=text;copy.append(node);}cut.append(copy);
for(const cls of ['hu-slash','hu-letterbox top','hu-letterbox bottom']){const node=document.createElement('div');node.className=cls;cut.append(node);}const cue=document.createElement('div');cue.className='hu-cue';cue.textContent={vyron:'推进器点火 / 空气压缩',hackclaw:'扫描 → 破译 → 锁定',luna:'锁定地平线 / 箭矢上弦'}[event.actor];cut.append(cue);host.append(cut);
active.set(scene,{time:0,profile,rank,actor:event.actor,trail:scene.keep(scene.add.graphics()),from:point(unit),to:point(target),w,h,cut,portrait,copy,base:{zoom:c.zoom,x:c.scrollX,y:c.scrollY}});return true;}
function shotPose(s,t){
const a=s.actor,p=ease((t-900)/490),home={x:s.base.x+s.w/2,y:s.base.y+s.h/2};
let focus={...s.from},zoom=s.base.zoom;
if(t<900){const q=ease(t/800);if(a==='vyron'){focus.y+=35*(1-q);zoom+=.34*q;}else if(a==='hackclaw'){focus.x+=45*(1-q);zoom+=.2*q;}else{focus.y-=35*q;zoom+=.26*q;}}
else if(t<1390){if(a==='hackclaw'){const q=clamp((t-940)/100);focus={x:s.from.x+(s.to.x-s.from.x)*q,y:s.from.y+(s.to.y-s.from.y)*q};zoom+=.36;}
else if(a==='luna'){focus={x:s.from.x+(s.to.x-s.from.x)*p,y:s.from.y+(s.to.y-s.from.y)*p-45*Math.sin(p*Math.PI)};zoom+=.26-.16*Math.sin(p*Math.PI);}
else{const q=Math.pow(p,2);focus={x:s.from.x+(s.to.x-s.from.x)*q,y:s.from.y+(s.to.y-s.from.y)*q};zoom+=.3+.08*Math.sin(p*Math.PI);}}
else{const q=ease((t-1390)/430);focus={x:s.to.x+(home.x-s.to.x)*q,y:s.to.y+(home.y-s.to.y)*q};zoom+=(a==='hackclaw'?.36:a==='vyron'?.3:.26)*(1-q);}
return{focus,zoom};}
function ribbon(g,a,b,color,width,alpha){g.lineStyle(width,color,alpha);g.lineBetween(a.x,a.y,b.x,b.y);}
function choreography(s){const g=s.trail,t=s.time;g.clear();if(s.boardStaging||t<660||t>1460)return;const p=clamp((t-870)/450),a=s.from,b=s.to,color=s.profile.color,dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;
if(s.actor==='vyron'){
const head={x:a.x+dx*p,y:a.y+dy*p};for(let i=0;i<s.rank+2;i++){const back=Math.max(0,p-i*.08),x=a.x+dx*back,y=a.y+dy*back,r=14+back*(36+s.rank*8);g.lineStyle(i?2:5,color,.75-i*.1);g.beginPath();g.moveTo(x+nx*r-dx*.025,y+ny*r-dy*.025);g.lineTo(x+dx*.03,y+dy*.03);g.lineTo(x-nx*r-dx*.025,y-ny*r-dy*.025);g.strokePath();}
for(let i=-s.rank;i<=s.rank;i++)ribbon(g,{x:a.x+nx*i*9,y:a.y+ny*i*9},head,color,i===0?6:2,.4);
}else if(s.actor==='hackclaw'){
const r=72-30*p;g.lineStyle(2,color,.85);for(const k of [-1,1]){g.strokeRect(b.x+k*r-8,b.y-r,16,24);g.strokeRect(b.x+k*r-8,b.y+r-24,16,24);}for(let i=0;i<s.rank+2;i++){const yy=a.y+(i-1)*18,mid=a.x+dx*(.25+i*.12);g.lineStyle(i?1:3,color,.5);g.beginPath();g.moveTo(a.x,yy);g.lineTo(mid,yy);g.lineTo(mid,b.y+(i-1)*12);g.lineTo(b.x,b.y+(i-1)*12);g.strokePath();}g.fillStyle(color,.16);g.fillRect(b.x-65,b.y-70+140*p,130,5);
}else{
const head={x:a.x+dx*p,y:a.y+dy*p-28*Math.sin(p*Math.PI)};for(const [w,alpha]of [[16,.08],[7,.3],[2,1]])ribbon(g,a,head,color,w,alpha);
g.lineStyle(3,color,.9);g.beginPath();g.moveTo(head.x-dx/len*18+nx*10,head.y-dy/len*18+ny*10);g.lineTo(head.x,head.y);g.lineTo(head.x-dx/len*18-nx*10,head.y-dy/len*18-ny*10);g.strokePath();
for(let i=1;i<=s.rank;i++){const r=24+i*12;g.lineStyle(1,color,.35);g.strokeEllipse(a.x,a.y,r*.7,r*2);}}
}
// Solve cubic-bezier x -> y so each camera move has explicit acceleration.
function curve(x,x1,y1,x2,y2){const bez=(t,a,b)=>3*(1-t)*(1-t)*t*a+3*(1-t)*t*t*b+t*t*t;let low=0,high=1;for(let i=0;i<14;i++){const mid=(low+high)/2;if(bez(mid,x1,x2)<x)low=mid;else high=mid;}return bez((low+high)/2,y1,y2);}
function portraitPose(progress,width){
  const p=clamp(progress),w=Math.max(1,width);
  const frames=[
    {t:0,x:.34,angle:-18,scale:.68},
    {t:.18,x:.025,angle:0,scale:.82},
    {t:.38,x:.28,angle:0,scale:.8},
    {t:.68,x:.18,angle:360,scale:.84},
    {t:.86,x:-.025,angle:360,scale:1.16},
    {t:1,x:-.025,angle:360,scale:1.16}
  ];
  let i=1;while(i<frames.length-1&&p>frames[i].t)i++;
  const a=frames[i-1],b=frames[i],local=clamp((p-a.t)/(b.t-a.t));
  const q=i===3?curve(local,.65,0,.35,1):curve(local,.22,1,.36,1);
  return{x:(a.x+(b.x-a.x)*q)*w,angle:a.angle+(b.angle-a.angle)*q,scale:a.scale+(b.scale-a.scale)*q};
}
function advance(scene,delta,speed=1){const s=active.get(scene);if(!s)return false;const playback=Math.min(1.5,Math.max(1,speed)),rate=s.time<900?900/4200:920/2400;s.time+=Math.max(0,delta)*rate*playback;const t=s.time,c=scene.cameras.main;
const p=clamp(t/900),reveal=ease(t/95),depart=clamp((t-850)/90),pose=portraitPose(p,s.w);
s.cut.style.opacity=String(reveal*(1-depart));
s.portrait.style.transform=`perspective(1100px) translate3d(${pose.x}px,0,0) rotateY(${pose.angle}deg) scale(${pose.scale})`;
const titleIn=ease((p-.7)/.16);s.copy.style.opacity=String(titleIn);s.copy.style.transform=`translateX(${(1-titleIn)*90}px)`;
const {focus,zoom}=shotPose(s,t);choreography(s);
c.setZoom(zoom);c.setScroll(focus.x-s.w/2,focus.y-s.h/2);if(t>=1820)stop(scene);
return t<900;}
function impact(scene,event,state,stars,reduced){if(!eligible(event))return;const profile=profiles[event.actor],rank=Math.max(1,Math.min(3,Number(stars)||1));
for(const id of [...new Set(event.targets||[])].slice(0,6)){const unit=state.units.find(u=>u.id===id);if(!unit)continue;const point=scene.position(unit.side,unit.slot),x=point.x,y=point.y-65;
const g=scene.keep(scene.add.graphics().setPosition(x,y));
const power=reduced?1:rank,extent=45+power*22;
if(event.actor==='vyron'){
for(let i=0;i<power+2;i++){const r=extent+i*18;g.lineStyle(i?2:5,profile.color,.8/(1+i*.45));g.beginPath();g.arc(0,0,r,-Math.PI*.85,-Math.PI*.15);g.strokePath();}
for(let i=0;i<5+power*3;i++){const a=Math.PI+i*Math.PI/(4+power*3),r=extent*.6;g.lineStyle(i%2?2:4,profile.color,.75);g.lineBetween(Math.cos(a)*r,Math.sin(a)*r,Math.cos(a)*(r+25+power*12),Math.sin(a)*(r+25+power*12));}
g.fillStyle(profile.color,.12);g.fillEllipse(0,0,extent*2.2,30);
}else if(event.actor==='hackclaw'){
for(let i=0;i<power+1;i++){const r=35+i*17;g.lineStyle(i?1:3,profile.color,.8);for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){g.lineBetween(sx*r,sy*r,sx*(r-15),sy*r);g.lineBetween(sx*r,sy*r,sx*r,sy*(r-15));}}
for(let i=0;i<5+power*4;i++){const side=i%2?-1:1,xx=side*(45+(i%4)*13),yy=-60+i*9;g.fillStyle(profile.color,.25+(i%3)*.2);g.fillRect(xx,yy,8+(i%3)*9,3);}
g.lineStyle(2,profile.color,.8);g.strokeRect(-22,-32,44,64);g.lineBetween(-22,0,22,0);
}else{
for(let i=0;i<power+2;i++){g.lineStyle(i?1:3,profile.color,.85/(1+i*.25));g.strokeEllipse(0,0,70+i*40,35+i*20);}
for(let i=0;i<4+power*2;i++){const a=i*Math.PI*2/(4+power*2),r=extent;g.lineStyle(2,profile.color,.7);g.lineBetween(Math.cos(a)*r,Math.sin(a)*r*.5,Math.cos(a)*(r+14),Math.sin(a)*(r+14)*.5);}g.lineStyle(3,profile.color,.85);g.lineBetween(0,-extent,0,extent*.5);
}
scene.tweens.add({targets:g,alpha:0,scaleX:reduced?1:event.actor==='hackclaw'?1.08:1.9,scaleY:reduced?1:event.actor==='vyron'?1.35:1.6,duration:reduced?180:1080,onComplete:()=>{if(g.scene)scene.discard(g);}});
}}
function setBoardStaging(scene,value=true){const s=active.get(scene);if(s)s.boardStaging=Boolean(value);}
const api={start,advance,stop,impact,eligible,isUltimate,playbackRate,actionDuration,shotPose,portraitPose,setBoardStaging};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HaffUltimateDirector=api;
})(typeof window!=='undefined'?window:globalThis);
