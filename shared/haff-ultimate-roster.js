/* Additive cinematic adapter. Combat state, RNG and damage resolution remain in the controller. */
(function (root) {
  'use strict';
  const base = root.HaffUltimateDirector;
  if (!base || root.HaffUltimateRoster) return;
  const doc = root.document, running = new Map(), impacts = new Map();
  const preferenceKey = 'haff-ultimate-animation-enabled-v1';
  let enabled = true;
  try { enabled = root.localStorage.getItem(preferenceKey) !== 'false'; } catch (_) {}
  const profiles = {
    shepherd: {kind:'sonicQuake',theme:'resonator',color:'#e2c88f',tag:'SONIC / SUPPRESSION',cue:'声波震慑 / 全域压制'},
    gizmo: {kind:'hunterSpider',theme:'spider',color:'#e7b271',tag:'HUNTER / SPIDER',cue:'寻猎蜘蛛启动 / 目标束缚'},
    raptor: {kind:'spyCamera',theme:'hummingbird',color:'#a5cced',tag:'HUMMINGBIRD / TRACK',cue:'蜂鸟摄像头 / 火力链路接入'},
    rover: {kind:'clover',theme:'hound',color:'#a8d599',tag:'CLOVER / PURSUIT',cue:'军犬四叶出击 / 标记追踪'},
    vyron: { kind:'air', theme:'breach', color:'#ffc785', tag:'KINETIC BREAK', cue:'推进器点火 / 空气压缩' },
    hackclaw: { kind:'decode', theme:'interference', color:'#c9a3ff', tag:'SIGNAL / CORRUPTED', cue:'频段侵入 → 信号破译 → 锁定' },
    luna: { kind:'reconArrow', theme:'recon', color:'#8eeaff', tag:'HORIZON PIERCER', cue:'侦察箭上弦 / 全域扫描' },
    dwolf: { kind:'overdrive', theme:'overdrive', color:'#ff826b', tag:'EXOSKELETON / ONLINE', cue:'动力核心充能 / 外骨骼解限' },
    uluru: { kind:'missile', theme:'missile', color:'#ffbd72', tag:'LOITERING / STRIKE', cue:'弹道接管 / 子弹药散射' },
    stinger: { kind:'heal', theme:'medical', color:'#93f1bb', tag:'VITAL / RESTORE', cue:'激素注入 / 生命体征恢复' },
    butterfly: { kind:'rescueSwarm', theme:'swarm', color:'#91f0dd', tag:'RESCUE / SWARM', cue:'救援编队展开 / 生命信号连接' },
    tempest: { kind:'anchor', theme:'anchor', color:'#86cbff', tag:'ANCHOR / ASSAULT', cue:'回避锚点部署 / 三连射强化' },
    sineva: { kind:'riotSuit', theme:'riot', color:'#80beff', tag:'RIOT / FORTRESS', cue:'防爆装甲闭合 / 防线展开' },
    nitro: { kind:'cryoBurst', theme:'cryo', color:'#a4edff', tag:'CRYO / SALVO', cue:'冷凝弹装填 / 六连发齐射' },
    toxik: { kind:'firefly', theme:'firefly', color:'#c4ed81', tag:'FIREFLY / CLUSTER', cue:'流荧集群部署 / 战场压制' },
    echo: { kind:'sonar', theme:'sonar', color:'#80e4cd', tag:'ECHO / DETECTION', cue:'声波扩散 / 回声定位' },
    nameless: { kind:'silent', theme:'stealth', color:'#bac7e9', tag:'SILENT / INFILTRATION', cue:'信号隐去 / 静默潜袭' }
  };
  const clamp = n => Math.max(0, Math.min(1, n));
  const ease = n => 1 - (1-clamp(n)) ** 3;
  const tier = n => Math.max(1, Math.min(3, Math.floor(Number(n) || 1)));
  function profileFor(event) {
    if (!event || event.ultimate === false) return null;
    const unit = root.HaffWar?.units?.[event.actor];
    if (unit?.side !== 'ally') return null;
    // Resolved combat events reuse visual kinds (e.g. rescueSwarm -> heal).
    // Older saved events use freeAction; newer events distinguish free skills.
    if (Array.isArray(event.effects) && !event.freeAction) return null;
    const known = profiles[event.actor];
    if (known && (event.freeAction || known.kind === event.kind)) return known;
    const skill = unit.skills?.find(s => s.ultimate && (s.id === event.kind || s.name === event.name));
    if (skill) return {kind:skill.id, theme:'breach', color:'#b6ef7b', tag:'TACTICAL / RELEASE', cue:'战术装备启动'};
    return null;
  }
  function node(tag, cls, text) {
    const el=doc.createElement(tag); el.className=cls || '';
    if (text) el.textContent=text;
    return el;
  }
  function ring(x,y,r,extra='') { return `<circle cx="${x}" cy="${y}" r="${r}" ${extra}/>`; }
  function line(x1,y1,x2,y2,extra='') { return `<path d="M${x1} ${y1}L${x2} ${y2}" ${extra}/>`; }
  function artwork(theme, rank) {
    let out='';
    if (['resonator','spider','hummingbird','hound'].includes(theme)) {
      out+=`<path d="${root.HaffStarCinematics?.devices[theme] || ''}" stroke-width="3"/>`;
      for(let i=0;i<rank+1;i++)out+=`<path d="M${90+i*22} 160V${430-i*18}H${250+i*35} M${910-i*22} 440V${170+i*18}H${750-i*35}" opacity=".4"/>`;
    } else if (theme==='interference') {
      for(let i=0;i<rank+2;i++) out+=ring(500,300,65+i*62,'stroke-dasharray="110 18 12 18"');
      for(let j=0;j<3;j++) {
        let d='M0 '+(220+j*85);
        for(let x=0;x<=1000;x+=10) d+=` L${x} ${220+j*85+Math.sin(x*.039+j)*Math.sin(x*.009)*48}`;
        out+=`<path d="${d}" opacity="${.7-j*.15}"/>`;
      }
      for(let i=0;i<18+rank*8;i++) out+=`<rect x="${(i*157)%990}" y="${(i*79)%550+25}" width="${12+i%5*14}" height="${2+i%3*2}" fill="currentColor" stroke="none" opacity=".35"/>`;
    } else if (theme==='riot') {
      for(let i=0;i<rank+2;i++){const r=75+i*33;out+=`<path d="M${500-r} ${230-r*.5}L500 ${200-r*.5}L${500+r} ${230-r*.5}V${320+r*.3}L500 ${400+r*.4}L${500-r} ${320+r*.3}Z"/>`;}
      for(let x of [220,780])out+=`<path d="M${x-45} 180H${x+45}V410L${x} 450L${x-45} 410Z" fill="currentColor" fill-opacity=".13"/>`;
    } else if (theme==='cryo') {
      for(let i=0;i<6;i++){const a=i*Math.PI/3,x=500+Math.cos(a)*190,y=300+Math.sin(a)*190;out+=line(500,300,x,y,'stroke-width="4"');
        for(let j=1;j<=rank;j++){const q=.3+j*.16,bx=500+(x-500)*q,by=300+(y-300)*q;for(let side of [-1,1])out+=line(bx,by,bx+Math.cos(a+side)*45,by+Math.sin(a+side)*45);}}
      out+=ring(500,300,235,'stroke-dasharray="10 18"');
    } else if (theme==='firefly') {
      for(let i=0;i<rank*5+12;i++){const a=i*2.399,r=65+Math.sqrt(i)*39,x=500+Math.cos(a)*r,y=300+Math.sin(a)*r*.7;out+=ring(x,y,5,'fill="currentColor"')+line(x-14,y-10,x+14,y+10,'opacity=".4"');if(i%3===0)out+=line(500,300,x,y,'stroke-dasharray="3 10" opacity=".35"');}
      out+=ring(500,300,90)+ring(500,300,110,'stroke-dasharray="4 8"');
    } else if (theme==='sonar') {
      for(let i=0;i<rank+3;i++)out+=ring(500,300,50+i*42,'stroke-dasharray="180 8"');
      out+='<path d="M500 300L710 150A258 258 0 0 1 755 345Z" fill="currentColor" fill-opacity=".12"/>';
      for(let i=0;i<rank+2;i++)out+=ring(380+i*85,210+(i%2)*170,8,'fill="currentColor"');
    } else if (theme==='overdrive') {
      for(let i=0;i<rank+2;i++) { const r=60+i*28; out+=ring(500,300,r,'stroke-dasharray="70 22"'); }
      for(let side of [-1,1]) for(let i=0;i<7;i++) out+=`<path d="M${500+side*105} ${125+i*54}l${side*78} 25l${side*55} -25" stroke-width="${i%2?2:5}"/>`;
      out+='<path d="M475 220L520 280L488 280L527 376L461 304L493 304Z" fill="currentColor"/>';
    } else if (theme==='missile') {
      out+='<path d="M120 520Q220 60 800 180L700 370" stroke-dasharray="10 10"/><path d="M530 70L585 235L535 210L508 260Z" fill="currentColor"/>';
      out+=ring(700,370,100)+line(560,370,840,370)+line(700,230,700,510);
      for(let i=0;i<rank+2;i++) out+=`<path d="M545 235Q${600+i*55} 240 ${600+i*50} 470" stroke-dasharray="6 9"/>`;
    } else if (theme==='medical') {
      out+='<path d="M400 265H465V200H535V265H600V335H535V400H465V335H400Z" fill="currentColor" fill-opacity=".12" stroke-width="4"/><path d="M50 450H285L320 420L354 490L388 370L425 450H930" stroke-width="4"/>';
      for(let i=0;i<rank+1;i++) out+=ring(500,300,155+i*32,'stroke-dasharray="70 12"');
    } else if (theme==='swarm') {
      for(let i=0;i<rank+3;i++) {
        const a=i*Math.PI*2/(rank+3),x=500+Math.cos(a)*220,y=300+Math.sin(a)*175;
        out+=line(500,300,x,y,'stroke-dasharray="7 8"')+ring(x,y,30);
        for(const sx of [-1,1]) for(const sy of [-1,1]) out+=ring(x+sx*22,y+sy*18,13);
      }
      out+='<path d="M470 300H530M500 270V330" stroke-width="7"/>';
      out+=ring(500,300,78);
    } else if (theme==='anchor') {
      for(let i=0;i<rank+2;i++) out+=`<ellipse cx="500" cy="300" rx="${95+i*45}" ry="${170+i*20}" transform="rotate(${i*18-20} 500 300)" stroke-dasharray="200 35"/>`;
      out+='<path d="M500 130V420M455 175L500 130L545 175M420 350L500 430L580 350" stroke-width="5"/>';
    } else if (theme==='stealth') {
      for(let i=0;i<rank+3;i++) out+=`<path d="M${180+i*120} 85L${320+i*120} 235L${235+i*120} 370L${355+i*120} 515" stroke-width="${i===2?6:1}"/>`;
      out+='<path d="M365 300L500 190L635 300L500 410Z" stroke-dasharray="30 12"/>';
    } else {
      for(let i=0;i<rank+2;i++) out+=ring(500,300,90+i*56,'stroke-dasharray="100 12"');
      out+=line(100,300,900,300)+line(500,80,500,520);
    }
    return `<svg viewBox="0 0 1000 600" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${out}</svg>`;
  }
  function decorateCut(s) {
    const cut=s.cut;
    cut.classList.add('hur-cut'); cut.dataset.theme=s.profile.theme; cut.dataset.rank=String(s.rank);
    const art=node('div','hur-art'); art.innerHTML=artwork(s.profile.theme,s.rank); cut.prepend(art); s.art=art;
    const scan=node('div','hur-scan'); cut.append(scan); s.scan=scan;
    const status=node('span','hur-status'); cut.append(status); s.status=status;
    if(s.profile.theme==='interference') {
      s.ghosts=['cyan','magenta'].map(color=>{
        const ghost=s.portrait.cloneNode(false); ghost.className=`hu-portrait hur-ghost hur-${color}`;
        cut.append(ghost); return ghost;
      });
      const noise=node('div','hur-noise'); cut.append(noise); s.noise=noise;
    }
  }
  function createCut(profile,event,rank) {
    const unit=root.HaffWar.units[event.actor],skill=unit.skills.find(s=>s.id===profile.kind);
    const cut=node('div','hu-cut'); cut.dataset.operator=event.actor; cut.setAttribute('aria-hidden','true');
    cut.style.setProperty('--hu-color',profile.color);
    const portrait=node('img','hu-portrait'); portrait.src=unit.portrait; portrait.alt=''; cut.append(portrait);
    const copy=node('div','hu-copy');
    for(const [tag,value] of [['small',profile.tag],['b',skill?.name||event.name],['p',unit.name],['em','★'.repeat(rank)]]) copy.append(node(tag,'',value));
    cut.append(copy,node('div','hu-slash'),node('div','hu-letterbox top'),node('div','hu-letterbox bottom'),node('div','hu-cue',profile.cue));
    return {cut,portrait,copy};
  }
  function start(scene,event,state,stars,reduced) {
    stop(scene);
    if(!enabled || reduced) return false;
    const profile=profileFor(event);
    if(!profile) return false;
    const unit=state.units.find(u=>u.id===event.actor),host=doc.getElementById('battlefield');
    if(!unit || !host) return false;
    const target=state.units.find(u=>u.id===event.targets?.[0]) || unit;
    const point=u=>{const p=scene.position(u.side,u.slot);return {x:p.x,y:p.y-60};};
    const camera=scene.cameras.main,rank=tier(stars),original=base.eligible(event);
    const s={profile,event,rank,original,time:0,w:scene.scale.width,h:scene.scale.height,from:point(unit),to:point(target),
      base:{zoom:camera.zoom,x:camera.scrollX,y:camera.scrollY}};
    if(original) {
      if(!base.start(scene,event,state,rank,reduced)) return false;
      s.cut=host.querySelector('.hu-cut'); s.portrait=s.cut.querySelector('.hu-portrait'); s.copy=s.cut.querySelector('.hu-copy');
    } else { Object.assign(s,createCut(profile,event,rank)); host.append(s.cut); }
    s.graphic=scene.keep(scene.add.graphics()).setDepth(92);
    decorateCut(s); root.HaffStarCinematics?.attach(s);
    if(root.HaffBoardCinematics?.attach(scene,s,unit,target))base.setBoardStaging?.(scene);
    running.set(scene,s); return true;
  }
  function animateCut(s) {
    const t=s.time,p=clamp(t/900),phase=Math.min(2,Math.floor(p*3));
    if(!s.original) {
      const pose=base.portraitPose(p,s.w);
      s.cut.style.opacity=String(ease(t/95)*(1-clamp((t-850)/90)));
      s.portrait.style.transform=`perspective(1100px) translate3d(${pose.x}px,0,0) rotateY(${pose.angle}deg) scale(${pose.scale})`;
      const titleIn=ease((p-.7)/.16);s.copy.style.opacity=String(titleIn);s.copy.style.transform=`translateX(${(1-titleIn)*90}px)`;
    }
    s.status.textContent=s.profile.theme==='interference'?['频段侵入','信号劫持','破译完成'][phase]:['装置启动','能量释放','战术展开'][phase];
    s.art.style.transform=`translateX(${(1-ease(p/.35))*18}%) scale(${.85+.22*ease(p)}) rotate(${s.profile.theme==='anchor'?p*145:s.profile.theme==='sonar'?p*230:s.profile.theme==='swarm'||s.profile.theme==='firefly'?p*30:0}deg)`;
    s.art.style.opacity=String(.3+.45*ease(p/.3));
    s.scan.style.transform=`translateY(${p*1100-180}%)`;
    if(s.ghosts) {
      // Displacement changes are localized; never alternate full-screen light/dark frames.
      const wave=Math.sin(p*27)*Math.sin(p*9),shift=wave*(10+s.rank*7),band=18+Math.floor(p*11)%6*10;
      s.cut.style.setProperty('--hur-shift',`${shift}px`);
      s.cut.style.setProperty('--hur-band',`${band}%`);
      s.ghosts.forEach((ghost,i)=>{
        ghost.style.transform=s.portrait.style.transform+` translateX(${shift*(i?-1:1)}px)`;
        ghost.style.opacity=String(.28+Math.abs(wave)*.2);
      });
      s.noise.style.backgroundPosition=`${Math.floor(p*150)}px ${Math.floor(p*47)}px`;
    }
  }
  function drawTrack(s) {
    const g=s.graphic,t=s.time; g.clear(); if(s.boardDepth || t<900 || t>1750) return;
    const p=clamp((t-900)/500),a=s.from,b=s.to,c=parseInt(s.profile.color.slice(1),16),n=s.rank;
    g.lineStyle(2,c,.75*(1-clamp((t-1450)/300)));
    if(s.profile.theme==='interference') {
      for(let j=0;j<n+2;j++) {
        g.beginPath();g.moveTo(a.x,a.y);
        for(let i=1;i<=32;i++) {const q=i/32; g.lineTo(a.x+(b.x-a.x)*q,a.y+(b.y-a.y)*q+Math.sin(q*30-t*.02+j)*18*Math.sin(q*Math.PI));}
        g.strokePath();
      }
      for(let i=0;i<n+1;i++) g.strokeCircle(b.x,b.y,25+(p*100+i*32)%115);
    } else if(s.profile.theme==='riot') {
      for(let i=0;i<n+2;i++){const r=35+i*17;g.strokeRect(b.x-r,b.y-r,r*2,r*2.5);}
    } else if(s.profile.theme==='cryo') {
      for(let i=0;i<6;i++){const q=clamp(p-i*.055);g.lineBetween(a.x+(b.x-a.x)*q,a.y+(b.y-a.y)*q-i*6,a.x+(b.x-a.x)*q-18,a.y+(b.y-a.y)*q-i*6-12);}
      for(let i=0;i<n+2;i++){const z=i*Math.PI*2/(n+2);g.lineBetween(b.x,b.y,b.x+Math.cos(z)*80,b.y+Math.sin(z)*80);}
    } else if(s.profile.theme==='firefly') {
      for(let i=0;i<n*4+8;i++){const q=clamp(p-i*.025),x=a.x+(b.x-a.x)*q,y=a.y+(b.y-a.y)*q+Math.sin(i*2.4+q*8)*35;g.strokeCircle(x,y,3);}
    } else if(s.profile.theme==='sonar') {
      for(let i=0;i<n+3;i++)g.strokeCircle(a.x,a.y,25+(p*190+i*40)%240);
      g.lineBetween(a.x,a.y,a.x+Math.cos(p*5)*220,a.y+Math.sin(p*5)*220);
    } else if(s.profile.theme==='missile') {
      for(let i=0;i<n+2;i++) {const q=clamp(p-i*.06),x=a.x+(b.x-a.x)*q,y=a.y+(b.y-a.y)*q-170*Math.sin(q*Math.PI);
        g.lineBetween(x-8,y-25,x,y);g.strokeCircle(b.x,b.y,32+i*18);}
    } else if(s.profile.theme==='medical'||s.profile.theme==='swarm') {
      for(let i=0;i<n+2;i++) {const r=28+i*24+p*25;g.strokeEllipse(b.x,b.y,r*2,r);}
      g.lineBetween(a.x,a.y,b.x,b.y);g.lineStyle(5,c,.8);g.lineBetween(b.x-12,b.y,b.x+12,b.y);g.lineBetween(b.x,b.y-12,b.x,b.y+12);
    } else if(s.profile.theme==='overdrive') {
      for(let i=0;i<n+2;i++){const r=32+i*18;g.strokeCircle(a.x,a.y,r);g.lineBetween(a.x-r,a.y+60,a.x-r+20,a.y-80-p*30);g.lineBetween(a.x+r,a.y+60,a.x+r-20,a.y-80-p*30);}
    } else if(s.profile.theme==='anchor') {
      for(let i=0;i<n+2;i++)g.strokeEllipse(b.x,b.y,60+i*30+Math.sin(p*Math.PI)*20,150+i*22);
      g.lineBetween(b.x-45,b.y+80,b.x+45,b.y+80);
    } else if(s.profile.theme==='stealth') {
      for(let i=0;i<n+2;i++)g.lineBetween(a.x-70+i*28+p*80,a.y-90,a.x-120+i*28+p*80,a.y+70);
    }
  }
  function advance(scene,delta,speed=1) {
    const s=running.get(scene);
    if(!s) return base.advance(scene,delta,speed);
    if(!enabled) {stop(scene); return false;}
    const rate=s.time<900?900/4200:920/2400;
    s.time+=Math.max(0,delta)*rate*Math.min(1.5,Math.max(1,speed));
    const blocked=s.original?base.advance(scene,delta,speed):s.time<900;
    if(!s.original) {
      const c=scene.cameras.main,enter=ease(s.time/800),recover=ease((s.time-1390)/430),travel=ease((s.time-900)/450);
      const f={x:s.from.x+(s.to.x-s.from.x)*travel,y:s.from.y+(s.to.y-s.from.y)*travel};
      c.setZoom(s.base.zoom+.25*enter*(1-recover));
      c.setScroll((f.x-s.w/2)*(1-recover)+s.base.x*recover,(f.y-s.h/2)*(1-recover)+s.base.y*recover);
    }
    animateCut(s);root.HaffStarCinematics?.animate(s);drawTrack(s);
    if(!root.HaffBoardCinematics?.draw(s))root.HaffStarCinematics?.draw(s);
    if(s.time>=1700&&!s.aftermathShown){s.aftermathShown=true;root.HaffArtDirection?.aftermath(scene,s);}
    if(s.time>=1820)stop(scene);
    return blocked;
  }
  function stop(scene) {
    const effects=impacts.get(scene);
    if(effects){for(const g of effects){scene.tweens.killTweensOf?.(g);if(g.scene)scene.discard(g);}impacts.delete(scene);}
    const s=running.get(scene); base.stop(scene);
    if(!s)return;
    root.HaffBoardCinematics?.stop(scene,s);
    if(!s.original){scene.cameras.main.setZoom(s.base.zoom);scene.cameras.main.setScroll(s.base.x,s.base.y);s.cut.remove();}
    if(s.graphic?.scene)scene.discard(s.graphic);
    running.delete(scene);
  }
  function impact(scene,event,state,stars,reduced) {
    if(!enabled)return;
    const p=profileFor(event);if(!p)return;
    // The projected release already contains its impact, on the shared action clock.
    if(running.get(scene)?.boardDepth&&!reduced)return;
    if(base.eligible(event))base.impact(scene,event,state,stars,reduced);
    const rank=reduced?1:tier(stars),color=parseInt(p.color.slice(1),16);
    for(const id of [...new Set(event.targets?.length?event.targets:[event.actor])].slice(0,6)) {
      const unit=state.units.find(u=>u.id===id);if(!unit)continue;
      const point=scene.position(unit.side,unit.slot),g=scene.keep(scene.add.graphics().setPosition(point.x,point.y-60));
      if(!impacts.has(scene))impacts.set(scene,new Set());impacts.get(scene).add(g);
      g.lineStyle(2,color,.8);
      if(p.theme==='medical'||p.theme==='swarm') {
        for(let i=0;i<rank+2;i++)g.strokeEllipse(0,0,60+i*30,35+i*18);
        g.lineStyle(4,color,.9);g.lineBetween(-16,0,16,0);g.lineBetween(0,-16,0,16);
      } else if(p.theme==='riot') {
        for(let i=0;i<rank+2;i++){const r=28+i*15;g.beginPath();g.moveTo(-r,-r);g.lineTo(r,-r);g.lineTo(r,r);g.lineTo(0,r+22);g.lineTo(-r,r);g.closePath();g.strokePath();}
      } else if(p.theme==='cryo') {
        for(let i=0;i<6;i++){const a=i*Math.PI/3;g.lineBetween(0,0,Math.cos(a)*(45+rank*15),Math.sin(a)*(45+rank*15));for(let j=1;j<=rank;j++)g.strokeCircle(Math.cos(a)*j*18,Math.sin(a)*j*18,4);}
      } else if(p.theme==='firefly') {
        for(let i=0;i<rank*4+8;i++){const a=i*2.4,r=20+Math.sqrt(i)*18;g.strokeCircle(Math.cos(a)*r,Math.sin(a)*r*.7,4);}
      } else if(p.theme==='sonar') {
        for(let i=0;i<rank+3;i++)g.strokeEllipse(0,0,40+i*35,25+i*20);
        g.lineBetween(-70,0,70,0);g.lineBetween(0,-45,0,45);
      } else if(p.theme==='anchor') {
        for(let i=0;i<rank+2;i++)g.strokeEllipse(0,0,40+i*30,100+i*25);
      } else if(p.theme==='stealth') {
        for(let i=0;i<rank+2;i++)g.lineBetween(-55+i*24,75,-15+i*24,-75);
      } else if(p.theme==='overdrive') {
        for(let i=0;i<rank+2;i++){const r=28+i*17;g.strokeCircle(0,0,r);g.lineBetween(-r,60,-r,-50);g.lineBetween(r,60,r,-50);}
      } else if(p.theme==='interference') {
        for(let i=0;i<6+rank*4;i++){const y=-85+i*12;g.lineBetween(-80+(i%3)*9,y,-28,y);g.lineBetween(28,y,70+(i%4)*6,y);}
      } else if(p.theme==='missile') {
        for(let i=0;i<rank+2;i++)g.strokeCircle(0,0,28+i*20);
        for(let i=0;i<rank*4+8;i++){const a=i*Math.PI*2/(rank*4+8);g.lineBetween(Math.cos(a)*35,Math.sin(a)*35,Math.cos(a)*100,Math.sin(a)*100);}
      }
      scene.tweens.add({targets:g,alpha:0,scaleX:reduced?1:1.5,scaleY:reduced?1:1.5,duration:reduced?180:1100,
        onComplete:()=>{if(g.scene)scene.discard(g);const set=impacts.get(scene);set?.delete(g);if(!set?.size)impacts.delete(scene);}});
    }
  }
  const icon='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 8h18M7 4l3 4m3-4 3 4m-6 3 6 3-6 3z"/><path class="hur-off" d="M2 22L22 2"/></svg>';
  function updateButton() {
    const button=doc.getElementById('hur-animation-toggle');if(!button)return;
    button.setAttribute('aria-pressed',String(enabled));
    button.setAttribute('aria-label',`大招动画${enabled?'已开启，点击关闭':'已关闭，点击开启'}`);
    button.title=`大招动画：${enabled?'开':'关'}（点击${enabled?'关闭':'开启'}）`;
  }
  function setEnabled(value) {
    enabled=Boolean(value);
    try{root.localStorage.setItem(preferenceKey,String(enabled));}catch(_){}
    if(!enabled) {
      root.HaffArtDirection?.clearAftermath();
      for(const scene of running.keys())stop(scene);
      for(const [scene,objects]of impacts)for(const g of objects){scene.tweens.killTweensOf?.(g);if(g.scene)scene.discard(g);}
      impacts.clear();
    }
    updateButton();return enabled;
  }
  function mount() {
    if(doc.getElementById('hur-animation-toggle'))return;
    const controls=doc.querySelector('.battle-toolbar .controls');if(!controls)return;
    const button=node('button','hur-animation-toggle');button.id='hur-animation-toggle';button.type='button';button.innerHTML=icon;
    button.addEventListener('click',()=>setEnabled(!enabled));controls.append(button);updateButton();
  }
  root.HaffUltimateDirector={...base,start,advance,stop,impact,
    eligible:event=>!!profileFor(event),
    isUltimate:event=>!!profileFor(event),
    playbackRate:(event,speed=1)=>enabled&&profileFor(event)?Math.min(1.5,Math.max(1,speed)):speed,
    actionDuration:(event,normal=920)=>enabled&&profileFor(event)?2400:normal};
  root.HaffUltimateRoster={profiles,profileFor,setEnabled,isEnabled:()=>enabled};
  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})(typeof window!=='undefined'?window:globalThis);
