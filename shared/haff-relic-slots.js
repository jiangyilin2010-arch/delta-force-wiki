(function(root){
'use strict';
const slots=['relic','relic2','relic3'];
const slotOf=item=>item.slot||'relic';
function equip(inventory,item,owner,requested){
 if(!owner){item.owner=null;delete item.slot;return;}
 const slot=requested||(item.owner===owner?slotOf(item):slots.find(s=>!inventory.some(i=>i!==item&&i.kind==='relic'&&i.owner===owner&&slotOf(i)===s)));
 if(!slot)throw new Error('该干员的 3 个藏品位已满，请先卸下藏品或选择要替换的槽位。');
 if(!slots.includes(slot))throw new Error('请选择藏品槽 1、2 或 3。');
 for(const other of inventory)if(other!==item&&other.kind==='relic'&&other.owner===owner&&slotOf(other)===slot){other.owner=null;delete other.slot;}
 item.owner=owner;if(slot==='relic')delete item.slot;else item.slot=slot;
}
function equipped(inventory,owner){return slots.map(s=>inventory.find(i=>i.owner===owner&&i.kind==='relic'&&slotOf(i)===s)?.key||null);}
function memory(holder){holder.relicState||={stacks:0,momentum:0,extraRound:-1};holder.relicState.stackRound??=-1;holder.relicState.burstRound??=-1;holder.relicState.rescueUsed??=false;return holder.relicState;}
function entries(unit){return [...(unit.relic?[{key:unit.relic,slot:0,holder:unit}]:[]),...(unit.extraRelics||[]).map(e=>({key:e.key,slot:e.slot,holder:e}))].map(e=>({...e,memory:memory(e.holder)}));}
function bind(unit,keys){unit.relic=keys[0];unit.extraRelics=keys.slice(1).flatMap((key,i)=>key?[{key,slot:i+1}]:[]);memory(unit);entries(unit);}
function supreme(unit,catalog){return entries(unit).reduce((bonus,e)=>{const rule=catalog[e.key]?.supreme;if(rule){bonus.critRate=Math.max(bonus.critRate,rule.critRate||0);bonus.critDamage+=rule.critDamage||0;}return bonus;},{critRate:0,critDamage:0});}
const api={slots,slotOf,equip,equipped,memory,entries,bind,supreme};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HaffRelicSlots=api;
})(typeof window==='undefined'?globalThis:window);
