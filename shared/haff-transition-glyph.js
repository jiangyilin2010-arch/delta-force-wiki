/* Shared, text-free transition marks. Existing controllers retain timing and input ownership. */
(() => {
  'use strict';
  const marks = {
    link:'M50 22 77 70H23Z M50 39 61 60H39Z',
    combat:'M25 38V25H38 M62 25H75V38 M75 62V75H62 M38 75H25V62 M50 34V66 M34 50H66',
    insertion:'M50 20V61 M34 47 50 63 66 47 M25 71V80H75V71',
    victory:'M50 19 77 30V49Q76 69 50 83Q24 69 23 49V30Z M36 49 46 59 65 40',
    defeat:'M31 24H67V76H31 M46 50H82 M71 39 82 50 71 61'
  };
  function mount(host, kind='link', label='页面切换') {
    host.classList.add('ht-icons');
    host.removeAttribute('aria-labelledby'); host.setAttribute('aria-label',label);
    const glyph=document.createElement('div'); glyph.className='ht-glyph'; glyph.setAttribute('aria-hidden','true');
    glyph.innerHTML=`<i class="ht-orbit ht-orbit-outer"></i><i class="ht-orbit ht-orbit-inner"></i><svg class="ht-mark" viewBox="0 0 100 100"><path d="${marks[kind]||marks.link}"/></svg><i class="ht-dot"></i>`;
    host.append(glyph);
    const skip=host.querySelector('button');
    if(skip){skip.setAttribute('aria-label','跳过动画');skip.setAttribute('title','跳过动画');skip.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 5 8 7-8 7m8-14 8 7-8 7"/></svg>';}
    return glyph;
  }
  window.HaffTransitionGlyph={mount};
})();
