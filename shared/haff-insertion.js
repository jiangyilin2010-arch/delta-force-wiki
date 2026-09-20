/* Presentation-only insertion. The battle controller gates turns while active. */
(() => {
  'use strict';
  let current = null, frame = 0;
  const helicopter = `<svg viewBox="0 0 900 360" aria-hidden="true"><defs><linearGradient id="hi-metal" x2="0" y2="1"><stop stop-color="#64736c"/><stop offset=".5" stop-color="#202d2b"/><stop offset="1" stop-color="#080f10"/></linearGradient></defs><g fill="url(#hi-metal)" stroke="#71867a" stroke-width="2"><path d="M92 197L42 90 74 84 142 178 397 160 472 111 638 108 718 140 772 206 738 242 452 252 373 207Z"/><path d="M402 164L471 106 511 83 604 87 640 108M462 246L453 279 708 279 700 245"/><path d="M527 110V65H551V111M501 68H579V55H501Z"/><path d="M460 147H566V231H443Z" fill="#030a0b"/><path d="M628 123L699 149 727 187 635 181Z" fill="#8dac9b"/><path d="M616 122L618 181 581 176 581 122Z" fill="#61877b"/><path d="M143 178L68 217 89 230 219 197"/><path d="M572 199H703M590 212H727M392 180L154 192"/><circle cx="468" cy="280" r="13" fill="#081013"/><circle cx="696" cy="280" r="13" fill="#081013"/></g><g class="hi-rotor" stroke="#bdc9b6"><path d="M70 54L852 54" stroke-width="7"/><path d="M180 42L790 67" stroke-width="2" opacity=".5"/></g><circle cx="738" cy="207" r="5" fill="#f8eab3"/><circle cx="105" cy="169" r="4" fill="#e67750"/><text x="580" y="235" fill="#9bae9f" font-size="17" font-family="monospace">G.T.I. / 07</text></svg>`;
  const operator = `<svg viewBox="0 0 100 150" aria-hidden="true"><g fill="#111c1b" stroke="#879388" stroke-width="1.5"><path d="M38 23Q36 5 52 5T67 25L61 37H42Z"/><path d="M34 40L65 37 76 85 65 105 35 99 26 66Z"/><path d="M34 45L16 58 8 29 17 24 29 44 46 35M65 44L85 27 79 9 88 5 98 31 73 65"/><path d="M39 93L53 98 39 124 26 145 14 139 24 113ZM57 98L69 94 71 119 88 136 81 145 57 126Z"/><path d="M25 49L13 54 19 90 34 94M33 57L76 86 82 81 40 49Z" fill="#080e10"/><path d="M41 47H60V77H38Z" fill="#39473e"/></g></svg>`;
  function close() {
    if (!current) return;
    cancelAnimationFrame(frame);
    const { dialog, previous } = current; current = null;
    dialog.close(); dialog.remove();
    const focus = previous?.isConnected && !previous.closest('[hidden]') ? previous : document.querySelector('#battle-view:not([hidden]) #pause, #campaign-shell button:not(:disabled)');
    focus?.focus({ preventScroll: true });
    document.dispatchEvent(new CustomEvent('haff:insertion-closed'));
  }
  function show({ mission = '零号大坝', briefing = '小队就位，准备行动', combat = false } = {}) {
    if (current) return false;
    const dialog = document.createElement('dialog'); dialog.className = 'hi-insertion';
    dialog.setAttribute('aria-labelledby', 'hi-title');
    dialog.innerHTML = `<div class="hi-scene"><div class="hi-terrain"></div><div class="hi-grid"></div><div class="hi-haze"></div><div class="hi-aircraft">${helicopter}</div><div class="hi-ground"></div><div class="hi-team">${[0,1,2].map(i=>`<div class="hi-rappeller" style="--i:${i}"><div class="hi-rope"></div><div class="hi-operator">${operator}</div></div>`).join('')}</div><div class="hi-door hi-door-left"></div><div class="hi-door hi-door-right"></div><div class="hi-vignette"></div><header class="hi-header"><span>G.T.I. / AIR INSERTION</span><span>RAVEN 07 · 安全索降</span></header><div class="hi-telemetry" aria-hidden="true">ALT <b class="hi-alt">120</b> M<br>WIND 04 / NW<br>LINK ● SECURE</div><section class="hi-copy"><p class="hi-kicker">01 / 低空接近</p><h2 id="hi-title"></h2><p class="hi-brief"></p></section><footer class="hi-footer"><span class="hi-radio" role="status">「渡鸦七号，正在接近投放点。」</span><button class="hi-skip" type="button">跳过入场 ↗</button></footer><div class="hi-progress"><i></i></div></div>`;
    dialog.querySelector('h2').textContent = mission;
    dialog.querySelector('.hi-brief').textContent = briefing;
    const ready=document.createElement('div');ready.className='hi-ready';ready.innerHTML='<span>✓</span><div><small>DEPLOYMENT COMPLETE</small><strong></strong></div>';
    ready.querySelector('strong').textContent=combat?'全员就位 · 即将接敌':'全员落地 · 行动就绪';
    dialog.querySelector('.hi-scene').append(ready);
    window.HaffTransitionGlyph?.mount(dialog,'insertion',`小队部署 · ${mission}`);
    const previous = document.activeElement;
    current = { dialog, previous };
    document.body.append(dialog); dialog.showModal();
    const skip = dialog.querySelector('button');skip.addEventListener('click',close);skip.focus({preventScroll:true});
    dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reduced ? 160 : 1800;
    const animations = dialog.getAnimations({subtree:true});animations.forEach(a=>a.pause());
    const stages = [['01 / 低空接近','「渡鸦七号，正在接近投放点。」'],['02 / 舱门开启','「投放区确认，放索，准备离机。」'],['03 / 索降部署','「保持间距，落地后建立警戒。」'],['04 / 全员落地','「小队就位，行动开始。」']];
    let elapsed=0,last=null,stage=-1;
    function tick(now) {
      if(current?.dialog!==dialog)return;
      const delta=last===null?0:Math.min(100,now-last);last=now;
      if(!document.hidden)elapsed+=delta;
      const p=Math.min(1,elapsed/duration),next=p<.25?0:p<.43?1:p<.8?2:3;
      animations.forEach(a=>{a.currentTime=reduced?6400:p*6400;});
      dialog.querySelector('.hi-progress i').style.transform=`scaleX(${p})`;
      dialog.querySelector('.hi-alt').textContent=String(Math.round(120*(1-p)) ).padStart(3,'0');
      if(next!==stage){stage=next;dialog.dataset.stage=String(stage);dialog.querySelector('.hi-kicker').textContent=stages[stage][0];dialog.querySelector('.hi-radio').textContent=stages[stage][1];}
      if(p===1)close();else frame=requestAnimationFrame(tick);
    }
    frame=requestAnimationFrame(tick);return true;
  }
  window.HaffInsertion={show,close,get active(){return !!current;}};
  window.addEventListener('pagehide',close);
})();
