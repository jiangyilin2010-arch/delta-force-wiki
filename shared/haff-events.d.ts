export interface Receipt { base: number; interest: number; streak: number; tactic: number; investment: number; challenge?: number; loss: number }
export type Phase = "opening" | "finance" | "prep" | "combat" | "loot" | "route" | "supply" | "challenge" | "tactical" | "tactic" | "market" | "ended";
export interface EventMap {
  "combat:action": { state: RearState; actor: RearUnit; event: CombatEvent; resolvedAction: boolean; spentAction: boolean; support: boolean };
  "economy:settle": { receipt: Receipt; principal: number; kills: number; won: boolean; protocols: string[]; doctrine: string | null; tactics: string[] };
  "roster:changed": { runId: string; front: string[]; back: string[] };
  "battle:resolved": { runId: string | null; round: number; actor: string; kills: number; freeAction: boolean };
  "plane:entered": { runId: string; plane: number };
  "tooling:stripped": { runId: string; owner: string; items: string[] };
  "run:changed": { runId: string; phase: Phase; node: number };
}
export interface RearUnit {
  id: string; side: string; hp: number; slot: number; energy: number; stun: number;
  assistRound: number; supportBlockedRound: number; marked: number;
  chargeEfficiency?: number; supply?: { count: number; progress: number } | null;
  rearPassive?: { mode: string }; equipment?: { weapon?: string };
  skillLinkRounds?: Record<string, number>;
}
export interface RearState { units: RearUnit[]; round: number; supportQueue: { actor: string; kind: string; target: string | null }[] }
export type SkillTag = "recon" | "blast" | "control" | "mobility" | "guard" | "cold" | "affliction" | "rally" | "smoke";
export type BondKey = "smoke" | "demolition" | "breach" | "defense" | "charge" | "recon";
export interface CombatEvent { skillTags?: SkillTag[]; shots?: string[]; overhealing?: { source: string; target: string; value: number }[]; bondBursts?: { bond: BondKey; source: string; targets: string[] }[]; effects: { type: string; target: string; source?: string; value: number; label?: string; gear?: string; key?: string; critical?: boolean; bond?: BondKey | 'star' | null }[] }
export interface EventBus {
  on<K extends keyof EventMap>(type: K, handler: (payload: EventMap[K]) => void): () => void;
  emit<K extends keyof EventMap>(type: K, payload: EventMap[K]): void;
}
export function createBus(): EventBus;
export const bus: EventBus;
