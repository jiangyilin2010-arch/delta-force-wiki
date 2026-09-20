(function (root) {
  "use strict";
  const Ranks = typeof module !== "undefined" && module.exports ? require("./haff-career-ranks.js") : root.HaffCareerRanks;
  const Links = typeof module !== "undefined" && module.exports ? require("./haff-link-tree.js") : root.HaffLinkTree;
  const copy = value => JSON.parse(JSON.stringify(value));
  function create() { const profile = { version: 1, xp: 0, completed: 0, wins: 0, awards: {} }; Ranks.initialize(profile); Links.initialize(profile); return profile; }
  function progress(xp) {
    const level = Math.floor((Math.sqrt(9 + .08 * xp) - 1) / 2);
    const floor = 50 * (level - 1) * (level + 2), needed = 100 * (level + 1);
    return { level, current: xp - floor, needed, percent: (xp - floor) / needed * 100 };
  }
  function score(run) {
    if (run.phase !== "ended" || !["failed", "extracted"].includes(run.outcome)) throw new Error("行动尚未完成结算。");
    const won = run.outcome === "extracted";
    const base = won ? 300 : 80;
    const victories = run.history.filter(entry => entry.won === true).length * 20;
    const kills = run.kills * 2, bosses = run.clearedBosses.length * 40;
    const rankMultiplier = Ranks.pressure(run).xp;
    return { base, victories, kills, bosses, multiplier: won ? 1 : .5, rankMultiplier, points: Math.floor((base + victories + kills + bosses) * (won ? 1 : .5) * rankMultiplier) };
  }
  function award(profile, run) {
    if (Object.hasOwn(profile.awards, run.id)) return { added: false, receipt: profile.awards[run.id] };
    Ranks.initialize(profile);
    Links.initialize(profile);
    const breakdown = score(run), beforeXp = profile.xp;
    const receipt = { runId: run.id, outcome: run.outcome, points: breakdown.points, beforeXp, afterXp: beforeXp + breakdown.points, breakdown };
    profile.awards[run.id] = receipt; profile.xp = receipt.afterXp;
    profile.completed++; if (run.outcome === "extracted") profile.wins++;
    Ranks.record(profile, run, receipt);
    Links.award(profile, run, receipt);
    return { added: true, receipt };
  }
  function restore(data) {
    if (data == null) return create();
    const profile = copy(data), integer = n => Number.isSafeInteger(n) && n >= 0;
    if (profile.version !== 1 || !integer(profile.xp) || !integer(profile.completed) || !integer(profile.wins) || !profile.awards || typeof profile.awards !== "object" || Array.isArray(profile.awards)) throw new Error("行动等级记录无效。");
    const entries = Object.entries(profile.awards);
    if (entries.some(([id, item]) => item.runId !== id || !["failed", "extracted"].includes(item.outcome) || !integer(item.points) || !integer(item.beforeXp) || item.afterXp !== item.beforeXp + item.points) || entries.reduce((sum, [, item]) => sum + item.points, 0) !== profile.xp || entries.length !== profile.completed || entries.filter(([, item]) => item.outcome === "extracted").length !== profile.wins) throw new Error("行动积分记录无效。");
    return Links.restore(Ranks.restore(profile, progress(profile.xp).level));
  }
  function prepareRun(profile, run, selected) { Ranks.prepareRun(profile, run, selected); Links.prepareRun(profile, run); return run; }
  const api = { create, progress, score, award, restore, ranks: Ranks.ranks, tracks: Ranks.tracks, rank: Ranks.rank, pressure: Ranks.pressure, promotionProgress: Ranks.promotionProgress, prepareRun, training: p => Ranks.training(p, progress(p.xp).level), train: (p,k) => Ranks.train(p,k,progress(p.xp).level) };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.HaffCareer = api;
})(typeof window === "undefined" ? globalThis : window);
