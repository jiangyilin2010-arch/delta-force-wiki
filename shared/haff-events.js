// @ts-check
(function () {
  "use strict";
  /** @returns {import('./haff-events').EventBus} */
  function createBus() {
    /** @type {Map<keyof import('./haff-events').EventMap, Set<(payload: never) => void>>} */
    const listeners = new Map();
    return {
      on(type, handler) {
        const entries = listeners.get(type) || new Set();
        listeners.set(type, entries);
        const callback = /** @type {(payload: never) => void} */ (handler);
        entries.add(callback);
        return () => { entries.delete(callback); };
      },
      emit(type, payload) {
        for (const handler of [...(listeners.get(type) || [])]) handler(/** @type {never} */ (payload));
      }
    };
  }
  const api = { createBus, bus: createBus() };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else Object.assign(globalThis, { HaffEvents: api });
})();
