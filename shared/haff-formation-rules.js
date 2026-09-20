(function (root) {
  "use strict";
  const frontCount = 4, backCount = 5, total = frontCount + backCount;
  const slots = Object.freeze(Array.from({ length: total }, (_, slot) => slot < frontCount ? `前排 ${slot + 1}` : `后排 ${slot - frontCount + 1}`));
  const defaultOrder = Object.freeze([0, 4, 5, 1, 2, 6, 3, 7, 8]);
  const recruitOrder = Object.freeze([0, 1, 4, 2, 3, 5, 6, 7, 8]);
  const validSlot = slot => Number.isInteger(slot) && slot >= 0 && slot < total;
  const frontSlot = slot => Number.isInteger(slot) && slot >= 0 && slot < frontCount;
  const api = Object.freeze({ frontCount, backCount, total, slots, defaultOrder, recruitOrder, validSlot, frontSlot, maxRank: total - 1, benchSize: 12, layout: "4-5" });
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.HaffFormation = api;
})(typeof window === "undefined" ? globalThis : window);
