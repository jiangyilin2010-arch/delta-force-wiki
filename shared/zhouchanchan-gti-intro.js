/* Standalone entry controller. Does not alter game state or storage. */
(() => {
  'use strict';
  const stage = document.querySelector('.gti-stage');
  if (!stage) return;
  const enter = document.getElementById('gti-enter');
  const replay = document.getElementById('gti-replay');
  const phase = document.getElementById('gti-phase');
  const counter = document.getElementById('gti-counter');
  const fill = document.getElementById('gti-progress-fill');
  const preview = new URLSearchParams(location.search).get('preview') === '1';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration = reduced ? 900 : 4200;
  const phases = ['建立行动链路', '校准战术视野', '小队部署就绪'];
  let frame = 0;
  let previousPhase = -1;
  function tick(start, now) {
    const progress = Math.min(1, (now - start) / duration);
    const index = Math.min(2, Math.floor(progress * 3));
    if (index !== previousPhase) { phase.textContent = phases[index]; previousPhase = index; }
    counter.textContent = `${String(Math.floor(progress * 100)).padStart(2, '0')} / 100`;
    fill.style.width = `${progress * 100}%`;
    if (progress < 1) frame = requestAnimationFrame(time => tick(start, time));
    else if (preview) { phase.textContent = '行动就绪'; enter.firstChild.textContent = '进入游戏 '; replay.hidden = false; }
    else location.replace(enter.href);
  }
  function start() {
    cancelAnimationFrame(frame);
    previousPhase = -1;
    replay.hidden = true;
    stage.getAnimations({subtree: true}).forEach(animation => { animation.cancel(); animation.play(); });
    const now = performance.now();
    frame = requestAnimationFrame(time => tick(now, time));
  }
  replay.addEventListener('click', start);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { cancelAnimationFrame(frame); location.replace(enter.href); }
  });
  window.addEventListener('pagehide', () => cancelAnimationFrame(frame));
  start();
})();
