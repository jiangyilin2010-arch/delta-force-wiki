/* Opaque viewport shutter: page/background changes happen entirely behind it. */
(() => {
  'use strict';
  let mask = null, animation = null, frame = 0, timer = 0, revision = 0;
  const quiet = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  function cancel() {
    revision++; cancelAnimationFrame(frame); clearTimeout(timer);
    animation?.cancel(); animation = null; mask?.remove(); mask = null;
  }
  function cover() {
    cancel();
    mask = document.createElement('div'); mask.className = 'hx-screen-mask';
    mask.setAttribute('aria-hidden', 'true');
    window.HaffTransitionGlyph?.mount(mask);
    document.body.append(mask);
    const token = revision;
    // A navigation error or suspended frame must never leave an input-blocking cover.
    timer = setTimeout(() => { if (token === revision) cancel(); }, 1100);
    return token;
  }
  function reveal() {
    if (!mask) cover();
    const token = revision, node = mask;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => { frame = requestAnimationFrame(() => {
      if (token !== revision || mask !== node) return;
      if (typeof node.animate !== 'function') { cancel(); return; }
      const frames = quiet() ? [{opacity:1}, {opacity:0}] : [{clipPath:'circle(150% at 50% 50%)'}, {clipPath:'circle(0% at 50% 50%)'}];
      animation = node.animate(frames, {duration:quiet()?80:280, easing:'cubic-bezier(.65,0,.2,1)', fill:'forwards'});
      const done = () => { if (token === revision) cancel(); };
      animation.finished.then(done, done);
    }); });
  }
  function depart(next) {
    const token = cover();
    frame = requestAnimationFrame(() => { frame = requestAnimationFrame(() => { if (token === revision) next(); }); });
  }
  window.HaffScreenMask = {cover, reveal, cancel, depart, get active() { return !!mask; }};
  window.addEventListener('pagehide', cancel);
})();
