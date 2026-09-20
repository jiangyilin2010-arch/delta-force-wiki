/* Equipment updates keep the same page, board, viewport and scrolling surfaces. */
(() => {
  'use strict';
  const selectors = ['.formation-inspector', '.unified-inventory', '#gear-candidates', '#prep-skills', '.inventory-recipes', '#bench-squad', '.deployment-grid'];
  let depth = 0;
  function capture() {
    const scroll = selectors.map(selector => { const node = document.querySelector(selector); return {selector, top:node?.scrollTop || 0, left:node?.scrollLeft || 0}; });
    const x = window.scrollX, y = window.scrollY;
    const focused = document.activeElement;
    const identity = focused?.dataset;
    const focusSelector = identity?.inventoryAction ? `[data-inventory-action="${identity.inventoryAction}"]` : identity?.inventoryUid ? `[data-inventory-uid="${identity.inventoryUid}"]` : identity?.owner && identity?.slot ? `.worn-icon[data-owner="${identity.owner}"][data-slot="${identity.slot}"]` : null;
    return () => {
      if (focused && !focused.isConnected && focusSelector) document.querySelector(focusSelector)?.focus({preventScroll:true});
      for (const entry of scroll) { const node = document.querySelector(entry.selector); if (node) { node.scrollTop = entry.top; node.scrollLeft = entry.left; } }
      if (window.scrollX !== x || window.scrollY !== y) window.scrollTo({left:x, top:y, behavior:'instant'});
    };
  }
  function update(work) {
    if (depth) return work();
    const restore = capture();
    const commit = () => {
      depth++;
      try { return work(); }
      finally {
        try { window.HaffIconUI?.flush(); } finally { depth--; restore(); }
      }
    };
    return window.HaffPageMotion?.still ? window.HaffPageMotion.still(commit, document.getElementById('prep-view')) : commit();
  }
  window.HaffPrepStability = {capture, update};
})();
