/* Additive hall integration: native links keep keyboard and new-tab behavior. */
(() => {
  'use strict';
  for (const link of document.querySelectorAll('a[href]')) {
    const target = new URL(link.getAttribute('href'), document.baseURI);
    if (target.origin !== location.origin || !target.pathname.endsWith('/haff_currency_war.html')) continue;
    const intro = new URL('zhouchanchan-gti-cinematic.html', target);
    link.href = intro.href;
  }
})();
