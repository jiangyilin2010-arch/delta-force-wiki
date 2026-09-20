/* Presentation only: campaign rewards are saved before this transition starts. */
(() => {
  'use strict';
  let current = null, frame = 0;
  function close(proceed = true) {
    if (!current) return;
    const { dialog, onComplete } = current;
    current = null; cancelAnimationFrame(frame);
    dialog.close(); dialog.remove();
    if (proceed) {
      onComplete?.();
      document.dispatchEvent(new CustomEvent('haff:boss-outro-closed'));
    }
  }
  function show({ mission = '首领战区', won = true, final = false, abandoned = false, onComplete } = {}) {
    if (current || !window.HTMLDialogElement) return false;
    const dialog = document.createElement('dialog');
    dialog.className = 'hb-outro';
    dialog.dataset.outcome = won ? 'victory' : 'defeat';
    dialog.dataset.stage = 'confirm';
    dialog.setAttribute('aria-labelledby', 'hb-outro-title');
    dialog.innerHTML = '<div class="hb-shutter hb-shutter-top" aria-hidden="true"></div><div class="hb-shutter hb-shutter-bottom" aria-hidden="true"></div><div class="hb-sweep" aria-hidden="true"></div><header class="hb-header"><span>G.T.I. / AFTER COMBAT</span><span class="hb-mission"></span></header><section class="hb-verdict"><div class="hb-lock" aria-hidden="true"><i></i><i></i><i></i><i></i><span>＋</span></div><p class="hb-code"></p><h2 id="hb-outro-title"></h2><div class="hb-rule" aria-hidden="true"></div><p class="hb-message"></p></section><footer class="hb-footer"><span class="hb-status">正在确认战区状态</span><button type="button">跳过 · 查看结算 ↗</button></footer><div class="hb-progress" aria-hidden="true"><i></i></div>';
    dialog.querySelector('.hb-mission').textContent = mission;
    dialog.querySelector('.hb-code').textContent = won ? final ? 'OPERATION COMPLETE' : 'PRIORITY TARGET / ELIMINATED' : 'SQUAD / DISENGAGING';
    dialog.querySelector('h2').textContent = won ? final ? '行动完成' : '首领已清除' : abandoned ? '小队撤离' : '突围受阻';
    dialog.querySelector('.hb-message').textContent = won ? final ? '最终防线突破 · 全域行动结束' : '区域威胁解除 · 战区控制权确认' : '终止交火 · 回收作战记录';
    window.HaffTransitionGlyph?.mount(dialog,won?'victory':'defeat',won?'首领已清除':'小队撤离');
    document.body.append(dialog);
    current = { dialog, onComplete };
    dialog.showModal();
    const skip = dialog.querySelector('button');
    skip.addEventListener('click', () => close()); skip.focus({ preventScroll: true });
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reduced ? 120 : 750;
    const animations = dialog.getAnimations({ subtree: true });
    animations.forEach(animation => animation.pause());
    let elapsed = 0, last = null;
    function tick(now) {
      if (current?.dialog !== dialog) return;
      const delta = last === null ? 0 : Math.min(100, now - last); last = now;
      if (!document.hidden) elapsed += delta;
      const progress = Math.min(1, elapsed / duration);
      animations.forEach(animation => { animation.currentTime = reduced ? 2200 : progress * 3400; });
      dialog.querySelector('.hb-progress i').style.transform = `scaleX(${progress})`;
      dialog.dataset.stage = progress < .2 ? 'confirm' : progress < .78 ? 'hold' : 'transfer';
      dialog.querySelector('.hb-status').textContent = progress < .78 ? won ? '目标清除确认 · 战区已安全' : '小队信号回收中' : '接入战后结算';
      if (progress === 1) close(); else frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return true;
  }
  window.HaffBossOutro = { show, close, get active() { return !!current; } };
  window.addEventListener('pagehide', () => close(false));
})();
