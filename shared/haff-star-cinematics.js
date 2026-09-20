/* Star-specific staging. Uses the existing presentation clock; never schedules combat or changes targets. */
(function(root){
  'use strict';
  const clamp=n=>Math.max(0,Math.min(1,n));
  const ease=n=>1-(1-clamp(n))**3;
  const forms={breach:'重装突破',interference:'全域劫持',recon:'贯穿地平线',overdrive:'动力解限',missile:'集束饱和',medical:'生命脉冲',swarm:'救援矩阵',anchor:'折跃突袭',riot:'钢铁壁垒',cryo:'极寒封锁',firefly:'流荧天幕',sonar:'全域回响',stealth:'无声猎杀'};
  // Large silhouettes, not more copies of the one-star rings.
  const devices={
    resonator:'M390 150H610V450H390Z M430 195H570V265H430Z M500 310V410 M440 360H560 M300 160Q120 300 300 440 M240 110Q10 300 240 490 M700 160Q880 300 700 440 M760 110Q990 300 760 490',
    spider:'M420 230L500 180L580 230V350L500 410L420 350Z M420 240L290 120L160 210 M420 280L250 240L120 320 M420 340L290 420L200 520 M580 240L710 120L840 210 M580 280L750 240L880 320 M580 340L710 420L800 520 M465 265H535V325H465Z',
    hummingbird:'M430 270L200 130L120 240L420 330 M570 270L800 130L880 240L580 330 M420 270H580V390H420Z M455 300H545V360H455Z M420 390L360 470 M580 390L640 470 M500 360L300 530H700Z',
    hound:'M210 260L340 210L610 230L720 140L820 170L860 245L790 300L660 285L610 360L410 360L350 310L240 335Z M720 140L690 70L780 130 M780 145L830 95L820 170 M410 360L380 475H310L340 360 M610 360L650 470H730L685 350 M240 280L160 220L100 250',
    breach:'M180 230L420 140L500 230L580 140L820 230L620 260L500 460L380 260Z M160 340L330 300L430 450 M840 340L670 300L570 450 M460 210L500 275L540 210',
    interference:'M180 130H360V230H440 M180 470H360V370H440 M820 130H640V230H560 M820 470H640V370H560 M440 220H560V380H440Z M100 260H280V300H410 M900 340H720V300H590 M470 265L530 335 M530 265L470 335',
    recon:'M470 80Q170 300 470 520L390 300Z M470 80L590 300L470 520 M240 300H850L790 265 M850 300L790 335 M285 280L320 300L285 320',
    overdrive:'M420 100H580L650 200L600 410L540 490H460L400 410L350 200Z M350 200L220 130L140 240L300 330 M650 200L780 130L860 240L700 330 M510 170L450 305H520L480 420L570 265H505Z',
    missile:'M140 150L220 80L300 150L220 370Z M420 100L500 30L580 100L500 320Z M700 150L780 80L860 150L780 370Z M150 490H850 M220 410V530 M500 350V530 M780 410V530',
    medical:'M440 120H560V235H680V355H560V470H440V355H320V235H440Z M60 330H190L230 270L275 400L315 300 M685 300H755L795 235L845 370L880 300H960',
    swarm:'M200 170L500 80L800 170L800 430L500 520L200 430Z M200 170L800 430 M800 170L200 430 M500 80V520 M155 125H245V215H155Z M755 125H845V215H755Z M155 385H245V475H155Z M755 385H845V475H755Z M460 300H540 M500 260V340',
    anchor:'M250 70Q50 300 250 530L320 450Q200 300 320 150Z M750 70Q950 300 750 530L680 450Q800 300 680 150Z M330 300H670 M540 240L610 300L540 360 M440 240L510 300L440 360',
    riot:'M350 100L500 50L650 100V370L500 530L350 370Z M100 180L300 120V400L200 500L100 400Z M700 120L900 180V400L800 500L700 400Z M420 220H580 M500 150V390',
    cryo:'M500 60L550 230L730 130L620 290L830 340L610 360L670 520L500 400L330 520L390 360L170 340L380 290L270 130L450 230Z M500 180V390 M380 265L610 385 M620 265L390 385',
    firefly:'M130 350Q250 50 500 150Q750 50 870 350 M130 350Q300 250 500 450Q700 250 870 350 M230 300L290 220L350 300L290 360Z M650 300L710 220L770 300L710 360Z M450 220L500 170L550 220L500 290Z',
    sonar:'M500 300L790 100Q930 300 790 500Z M300 100Q80 300 300 500 M380 175Q230 300 380 425 M430 240Q355 300 430 360 M660 230H740V310H660Z M560 370H620V430H560Z',
    stealth:'M150 520L430 70L360 350Z M390 530L650 60L590 330Z M650 520L860 80L830 310Z M160 300H850'
  };
  function attach(s){
    if(s.rank<2)return;
    const el=root.document.createElement('div');el.className='hsc-stage';
    const frame='<path d="M60 180V85H220 M780 85H940V180 M60 420V515H220 M780 515H940V420"/>';
    el.innerHTML=`<svg viewBox="0 0 1000 600" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><g class="hsc-frame">${frame}</g>${s.rank===3?`<g class="hsc-device"><path d="${devices[s.profile.theme]||devices.breach}"/></g><g class="hsc-charge"><path d="M60 565H330L355 540H645L670 565H940"/><path d="M400 558H600" stroke-width="9"/></g>`:''}</svg>`;
    s.cut.prepend(el);s.starStage=el;
    const legend=root.HaffWar?.Buildcraft?.legendary?.[s.event?.actor || s.actor];
    const badge=root.document.createElement('div');badge.className='hsc-badge';badge.textContent=s.rank===3?`★★★  ${legend?.name || forms[s.profile.theme]||'战术全开'}`:'★★  强化启动';s.cut.append(badge);s.starBadge=badge;
    s.starDevice=el.querySelector('.hsc-device');s.starCharge=el.querySelector('.hsc-charge');
  }
  function animate(s){
    if(!s.starStage)return;
    const p=clamp(s.time/900),deploy=ease(p/.38),charge=ease((p-.38)/.32),release=ease((p-.7)/.25);
    s.cut.dataset.starPhase=p<.38?'deploy':p<.7?'charge':'release';
    s.starStage.style.opacity=String(deploy*(1-release*.75));
    s.starStage.style.transform=`perspective(900px) rotateY(${(1-deploy)*-38}deg) scale(${.68+deploy*.32+release*.28})`;
    if(s.starDevice){s.starDevice.style.transform=`translateX(${(1-deploy)*180}px) scale(${1+charge*.06})`;s.starDevice.style.opacity=String(.3+charge*.55);}
    if(s.starCharge){s.starCharge.style.transform=`scaleX(${charge})`;s.starCharge.style.opacity=String(1-release);}
    s.starBadge.style.opacity=String(ease((p-.42)/.18));
    s.starBadge.style.transform=`translateX(${(1-ease((p-.42)/.18))*40}px)`;
  }
  function path(g,points,close=false){g.beginPath();g.moveTo(...points[0]);for(const p of points.slice(1))g.lineTo(...p);if(close)g.closePath();g.strokePath();}
  function polygon(g,x,y,r,sides=6,turn=0,flat=1){path(g,Array.from({length:sides},(_,i)=>{const a=turn+i*Math.PI*2/sides;return[x+Math.cos(a)*r,y+Math.sin(a)*r*flat];}),true);}
  function shield(g,x,y,r){path(g,[[x-r,y-r*.8],[x,y-r],[x+r,y-r*.8],[x+r,y+r*.5],[x,y+r],[x-r,y+r*.5]],true);}
  function drone(g,x,y,r){polygon(g,x,y,r,4,Math.PI/4);g.lineBetween(x-r*1.7,y-r,x+r*1.7,y+r);g.lineBetween(x-r*1.7,y+r,x+r*1.7,y-r);}
  function draw(s){
    if(s.rank<2||s.time<900||s.time>=1820)return;
    const g=s.graphic,a=s.from,b=s.to,t=s.time,p=clamp((t-900)/480),hit=ease((t-1370)/190),fade=1-ease((t-1590)/230),c=parseInt(s.profile.color.slice(1),16);
    g.lineStyle(2,c,.65*fade);
    if(s.rank===2){
      // Two-star: a deployed targeting frame and a directional power rail.
      for(const side of [-1,1])path(g,[[b.x+side*82,b.y-85],[b.x+side*105,b.y-85],[b.x+side*105,b.y+85],[b.x+side*82,b.y+85]]);
      g.lineBetween(a.x,a.y+30,b.x,b.y+30);return;
    }
    const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy)||1,nx=-dy/length,ny=dx/length;
    const head={x:a.x+dx*ease(p),y:a.y+dy*ease(p)};
    // One bounded Graphics object. A held impact silhouette replaces screen flashes.
    g.lineStyle(3,c,.88*fade);
    switch(s.profile.theme){
      case 'breach':{
        path(g,[[a.x+nx*28,a.y+ny*28],[head.x,head.y],[a.x-nx*28,a.y-ny*28]]);
        for(const side of [-1,1])path(g,[[b.x,b.y],[b.x+side*65*hit,b.y+22],[b.x+side*130*hit,b.y+8],[b.x+side*210*hit,b.y+42]]);
        g.lineStyle(8,c,.3*fade*hit);g.strokeEllipse(b.x,b.y+40,320*hit,90*hit);break;
      }
      case 'interference':{
        for(let i=0;i<5;i++){const y=b.y-100+i*50,x=a.x+dx*(.2+i*.13);path(g,[[a.x,a.y],[x,a.y],[x,y],[b.x+100,y]]);}
        g.lineStyle(3,0x70efff,.7*fade*hit);g.strokeRect(b.x-94,b.y-104,180,200);
        g.lineStyle(3,0xe58aff,.65*fade*hit);g.strokeRect(b.x-86,b.y-96,180,200);
        g.fillStyle(c,.12*fade);g.fillRect(b.x-100,b.y-110+220*p,200,16);
        path(g,[[b.x-40,b.y-40],[b.x+40,b.y+40]]);path(g,[[b.x+40,b.y-40],[b.x-40,b.y+40]]);break;
      }
      case 'recon':{
        path(g,[[a.x+18,a.y-135],[a.x-50,a.y],[a.x+18,a.y+135],[a.x+55*ease(p),a.y]],true);
        for(const width of [20,7,2]){g.lineStyle(width,c,(width===20?.12:width===7?.4:1)*fade);g.lineBetween(a.x,a.y,head.x+dx/length*110*hit,head.y+dy/length*110*hit);}
        for(const side of [-1,1])path(g,[[b.x-75,b.y+side*95],[b.x,b.y+side*60],[b.x+75,b.y+side*95]]);break;
      }
      case 'overdrive':{
        for(const side of [-1,1])path(g,[[a.x+side*30,a.y+95],[a.x+side*80,a.y+55],[a.x+side*90,a.y-55],[a.x+side*45,a.y-100]],false);
        polygon(g,a.x,a.y,55+25*hit,6,Math.PI/6);path(g,[[a.x+10,a.y-55],[a.x-25,a.y+5],[a.x+20,a.y],[a.x-10,a.y+65]]);break;
      }
      case 'missile':{
        for(let i=0;i<5;i++){const q=ease((p-i*.055)/.78),x=b.x+(i-2)*42,y=b.y-260*(1-q);path(g,[[x-12,y-50],[x,y],[x+8,y-30]]);g.strokeEllipse(x,b.y+30,50+hit*50,20+hit*20);}
        g.lineBetween(b.x-160,b.y+30,b.x+160,b.y+30);break;
      }
      case 'medical':{
        for(let i=0;i<3;i++){const r=70+i*40;g.strokeEllipse(b.x,b.y+70-i*25*p,r*2,r*.5);}
        path(g,[[b.x-30,b.y-90],[b.x+30,b.y-90],[b.x+30,b.y-40],[b.x+80,b.y-40],[b.x+80,b.y+20],[b.x+30,b.y+20],[b.x+30,b.y+70],[b.x-30,b.y+70],[b.x-30,b.y+20],[b.x-80,b.y+20],[b.x-80,b.y-40],[b.x-30,b.y-40]],true);break;
      }
      case 'swarm':{
        for(let i=0;i<4;i++){const angle=Math.PI/4+i*Math.PI/2+p*.35,x=b.x+Math.cos(angle)*135,y=b.y+Math.sin(angle)*100;drone(g,x,y,15);g.lineBetween(x,y,b.x,b.y);}
        polygon(g,b.x,b.y,65,6);g.lineBetween(b.x-20,b.y,b.x+20,b.y);g.lineBetween(b.x,b.y-20,b.x,b.y+20);break;
      }
      case 'anchor':{
        for(const x of [a.x,b.x]){g.strokeEllipse(x,b.y,70+hit*40,220);path(g,[[x-30,b.y-110],[x-55,b.y],[x-30,b.y+110]]);}
        for(let i=0;i<3;i++){const x=a.x+dx*clamp(p-i*.12);path(g,[[x-25,b.y-35],[x+15,b.y],[x-25,b.y+35]]);}break;
      }
      case 'riot':{
        for(let i=-1;i<=1;i++)shield(g,b.x+i*100,b.y+Math.abs(i)*20,65-10*Math.abs(i));
        g.fillStyle(c,.08*fade);g.fillRect(b.x-145,b.y-60,290,135);break;
      }
      case 'cryo':{
        for(let i=0;i<7;i++){const x=b.x+(i-3)*35,r=65+(3-Math.abs(i))*22;path(g,[[x-17,b.y+65],[x-8,b.y-r*p],[x+12,b.y-r*p+25],[x+20,b.y+65]],true);}
        g.strokeEllipse(b.x,b.y+65,310,80);break;
      }
      case 'firefly':{
        for(let i=0;i<9;i++){const angle=i*2.4+p*.45,r=65+Math.sqrt(i)*34,x=b.x+Math.cos(angle)*r,y=b.y+Math.sin(angle)*r*.65;polygon(g,x,y,9,4);path(g,[[x-22,y-8],[x,y],[x+22,y-8]]);if(i%3===0)g.lineBetween(x,y,b.x,b.y);}
        g.strokeEllipse(b.x,b.y,330,220);break;
      }
      case 'sonar':{
        const r=180,angle=-1.1+p*2.2;g.strokeEllipse(b.x,b.y,360,240);g.lineBetween(b.x,b.y,b.x+Math.cos(angle)*r,b.y+Math.sin(angle)*r*.66);
        for(const [x,y]of [[-95,-50],[80,55],[40,-70]]){g.strokeRect(b.x+x-13,b.y+y-13,26,26);g.lineBetween(b.x,b.y,b.x+x,b.y+y);}break;
      }
      case 'stealth':{
        for(let i=0;i<3;i++){const x=b.x+(i-1)*65,q=ease((p-i*.12)/.7);path(g,[[x-50,b.y+120],[x+55*q,b.y-125*q],[x+5,b.y+50]],true);}
        g.lineStyle(2,0xffffff,.7*fade*hit);g.lineBetween(b.x-160,b.y+65,b.x+160,b.y-65);break;
      }
    }
  }
  const api={attach,animate,draw,forms,devices};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HaffStarCinematics=api;
})(typeof window!=='undefined'?window:globalThis);
