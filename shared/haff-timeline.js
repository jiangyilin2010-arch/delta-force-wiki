(function (root) {
  'use strict';
  const distance = 10000, cycle = 100, epsilon = 1e-7;
  const active = (state, offAxis) => state.units.filter(unit => unit.hp > 0 && !offAxis(unit));
  function sync(state, speed, offAxis) {
    const clock = state.timeline;
    if (!clock) return;
    const units = active(state, offAxis), ids = units.map(unit => unit.id);
    for (const id of Object.keys(clock.remaining)) if (!ids.includes(id)) delete clock.remaining[id];
    for (const id of ids) if (!Object.hasOwn(clock.remaining, id)) clock.remaining[id] = distance;
    clock.extra = clock.extra.filter(id => ids.includes(id));
    if (!ids.includes(clock.current)) { clock.current = null; clock.currentExtra = false; state.prepared = null; }
    const previous = state.queue;
    units.sort((a, b) => clock.remaining[a.id] / speed(a) - clock.remaining[b.id] / speed(b) || previous.indexOf(a.id) - previous.indexOf(b.id));
    state.queue = [...new Set([clock.current, ...clock.extra, ...units.map(unit => unit.id)].filter(Boolean))];
  }
  function initialize(state, speed, offAxis) {
    state.timeline = { version: 1, time: 0, nextCycle: cycle, remaining: {}, current: null, currentExtra: false, extra: [] };
    sync(state, speed, offAxis);
  }
  function elapse(state, amount, speed, offAxis) {
    for (const unit of active(state, offAxis)) state.timeline.remaining[unit.id] = Math.max(0, state.timeline.remaining[unit.id] - amount * speed(unit));
    state.timeline.time += amount;
  }
  function prepare(state, speed, offAxis, tick) {
    const clock = state.timeline;
    if (!state.round && tick()) return;
    sync(state, speed, offAxis);
    if (state.supportQueue.length || clock.current) return;
    if (clock.extra.length) {
      clock.current = clock.extra.shift(); clock.currentExtra = true;
      sync(state, speed, offAxis); return;
    }
    while (state.phase !== 'finished') {
      sync(state, speed, offAxis);
      const unit = state.units.find(unit => unit.id === state.queue[0]);
      if (!unit) return;
      const wait = clock.remaining[unit.id] / speed(unit), boundary = Math.max(0, clock.nextCycle - clock.time);
      // Actions due exactly at a boundary finish before the next global cycle starts.
      if (wait > boundary + epsilon) {
        elapse(state, boundary, speed, offAxis); clock.nextCycle += cycle;
        if (tick() || state.supportQueue.length) return;
        continue;
      }
      elapse(state, wait, speed, offAxis);
      clock.remaining[unit.id] = 0; clock.current = unit.id; clock.currentExtra = false;
      sync(state, speed, offAxis); return;
    }
  }
  function consume(state, actor) {
    const clock = state.timeline;
    if (!clock || clock.current !== actor.id) return;
    if (!clock.currentExtra) clock.remaining[actor.id] = distance;
    clock.current = null; clock.currentExtra = false;
  }
  function extra(state, id) {
    if (!state.timeline.extra.includes(id)) state.timeline.extra.push(id);
  }
  function advancePosition(state, target, index, speed) {
    const clock = state.timeline, anchor = state.units.find(unit => unit.id === state.queue[index]);
    if (!clock || !anchor || clock.current === target.id || clock.extra.includes(target.id)) return false;
    const wait = anchor.id === clock.current || clock.extra.includes(anchor.id) ? 0 : clock.remaining[anchor.id] / speed(anchor);
    clock.remaining[target.id] = Math.min(clock.remaining[target.id], wait * speed(target));
    return true;
  }
  function preview(state, speed, offAxis, count = 6) {
    const copy = JSON.parse(JSON.stringify(state));
    sync(copy, speed, offAxis);
    const clock = copy.timeline, units = active(copy, offAxis), rows = [];
    for (const task of copy.supportQueue || []) if (copy.units.some(unit => unit.id === task.actor && unit.hp > 0)) rows.push({ id: task.actor, wait: 0, support: true });
    if (clock.current) {
      rows.push({ id: clock.current, wait: 0 });
      if (!clock.currentExtra) clock.remaining[clock.current] = distance;
    }
    for (const id of clock.extra) rows.push({ id, wait: 0, extra: true });
    let elapsed = 0;
    while (rows.length < count && units.length) {
      units.sort((a, b) => clock.remaining[a.id] / speed(a) - clock.remaining[b.id] / speed(b) || copy.queue.indexOf(a.id) - copy.queue.indexOf(b.id));
      const next = units[0], wait = clock.remaining[next.id] / speed(next);
      elapsed += wait;
      for (const unit of units) clock.remaining[unit.id] = Math.max(0, clock.remaining[unit.id] - wait * speed(unit));
      rows.push({ id: next.id, wait: elapsed }); clock.remaining[next.id] = distance;
    }
    return rows.slice(0, count);
  }
  function validate(state, offAxis) {
    const c = state.timeline;
    if (c === undefined) return true;
    const finite = value => Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER;
    if (!c || c.version !== 1 || !finite(c.time) || !finite(c.nextCycle) || Math.abs(c.nextCycle - Math.max(1, state.round) * cycle) > epsilon || c.time > c.nextCycle + epsilon || c.time < c.nextCycle - cycle - epsilon) return false;
    const ids = active(state, offAxis).map(unit => unit.id);
    if (!c.remaining || Array.isArray(c.remaining) || Object.keys(c.remaining).length !== ids.length || !ids.every(id => finite(c.remaining[id]) && c.remaining[id] <= distance + epsilon)) return false;
    if (!Array.isArray(c.extra) || new Set(c.extra).size !== c.extra.length || !c.extra.every(id => ids.includes(id)) || typeof c.currentExtra !== 'boolean') return false;
    if (c.current !== null && (!ids.includes(c.current) || state.queue[0] !== c.current || !c.currentExtra && c.remaining[c.current] > epsilon)) return false;
    return (!state.prepared || state.prepared === c.current) && (!c.currentExtra || c.current !== null);
  }
  const api = { initialize, sync, prepare, consume, extra, advancePosition, preview, validate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HaffTimeline = api;
})(typeof window === 'undefined' ? globalThis : window);
