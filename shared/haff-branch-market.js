/* Random route offers and black-market stock are generated only inside campaign transactions. */
(function(root){
 'use strict';
 const pools={};
 function install(nodes,planes){
  for(const [p,plane]of planes.entries()){
   const market=nodes.findIndex(n=>n.plane===p&&n.kind==='market'),supply=nodes.findIndex(n=>n.plane===p&&n.kind==='supply'),elite=nodes.findIndex(n=>n.plane===p&&n.kind==='elite');
   nodes[market].note='枪械、护甲、头盔各一件，另有藏品与折价干员。干员比正常招募便宜 1 万；本次到访货架固定，不可刷新，藏品有机会出现红色及至臻品质。';
   nodes[market].branchEvent=nodes[supply].branchEvent=true;
   pools[p]=[market,supply];
   const encounters=[
    {name:'赛伊德的私房货',enemies:['saeed','gunner'],note:'熟悉的机枪声从保险箱旁传来。赛伊德这次守的，似乎不是行政楼。'},
    {name:'只带刀也敢来',enemies:['shield','gunner'],note:'一支轻装搜刮队正在分赃，看到你们后才开始翻找弹匣。'},
    {name:'神秘押运车',enemies:['shield','gunner','flankGunner'],note:'押运车突然熄火，几个守卫围着一箱发光的藏品争论不休。'}
   ];
   for(const encounter of encounters){pools[p].push(nodes.length);nodes.push({...encounter,name:`${plane.name} · ${encounter.name}`,note:`彩蛋遭遇：${encounter.note} 胜利保底 1 件紫色藏品；击败敌人后，全房仅有 25% 概率额外发现 1 件藏品。基础掉落最多 2 件，战术奖励另计。`,kind:'fight',plane:p,depth:2,scale:[.66,1.15,1.85][p],next:[elite],easter:true,branchEvent:true,branchOnly:true});}
  }
 }
 function drawBranch(run,nodes,random){const pool=[...pools[nodes[run.node].plane]],offers=[];while(offers.length<3)offers.push(pool.splice(Math.floor(random(run)*pool.length),1)[0]);run.branchDraft={node:run.node,offers};}
 const choices=(run,nodes)=>run.branchDraft?.node===run.node?run.branchDraft.offers:nodes[run.node].next;
 const rarity=plane=>({red:[.01,.03,.06][plane],gold:[.24,.32,.39][plane],supreme:[.001,.003,.006][plane]});
 function relicKey(plane,relics,random,{easter=false}={}){
  const roll=random(),odds=easter?{red:.01,gold:.14,supreme:.001}:rarity(plane),supreme=roll<odds.supreme;
  const quality=roll<odds.red?'red':roll<odds.red+odds.gold?'gold':'purple';
  let pool=Object.keys(relics).filter(key=>relics[key].quality===quality&&(quality!=='red'||!!relics[key].supreme===supreme));
  if(!pool.length)pool=Object.keys(relics).filter(key=>relics[key].quality===quality);
  return pool[Math.floor(random()*pool.length)];
 }
 function price(kind,key,equipment,relics){const data=kind==='gear'?equipment[key]:relics[key];if(kind==='gear')return {green:30000,blue:50000,purple:80000,gold:120000}[data.quality]||60000;return data.supreme?1500000:{purple:70000,gold:160000,red:480000}[data.quality];}
 function stock(run,nodes,equipment,relics,random,onlyRelics=false){
  const plane=nodes[run.node].plane;
  const make=(kind,key)=>({uid:`market-${++run.serial}`,kind,key,price:price(kind,key,equipment,relics),sold:false});
  const gearPool=Object.keys(equipment).filter(key=>plane>0?['purple','gold'].includes(equipment[key].quality):['blue','purple'].includes(equipment[key].quality));
  if(!onlyRelics){const gear=['weapon','armor','helmet'].map(slot=>{const pool=gearPool.filter(key=>equipment[key].slot===slot);return make('gear',pool[Math.floor(random(run)*pool.length)]);});run.blackMarket={node:run.node,refreshes:0,gear,relics:[]};}
  run.blackMarket.relics=Array.from({length:4},()=>make('relic',relicKey(plane,relics,()=>random(run))));
 }
 const refreshPrice=(run,nodes)=>20000+nodes[run.node].plane*10000;
 function validate(run,nodes,equipment,relics){
  const d=run.branchDraft;if(d!==undefined&&d!==null&&!(run.phase==='route'&&d.node===run.node&&nodes[run.node].kind==='tactic'&&Array.isArray(d.offers)&&d.offers.length===3&&new Set(d.offers).size===3&&d.offers.every(id=>pools[nodes[run.node].plane]?.includes(id))))return false;
  const m=run.blackMarket;if(m===undefined||m===null)return true;
  if(run.phase!=='market'||m.node!==run.node||!Number.isSafeInteger(m.refreshes)||m.refreshes<0||!Array.isArray(m.gear)||![2,3].includes(m.gear.length)||!Array.isArray(m.relics)||m.relics.length!==4)return false;
  // Keep already-visited legacy two-item shelves stable; new shelves cover all slots.
  if(m.gear.length===3&&new Set(m.gear.map(o=>equipment[o.key]?.slot)).size!==3)return false;
  const all=[...m.gear,...m.relics];return new Set(all.map(o=>o.uid)).size===all.length&&all.every(o=>typeof o.uid==='string'&&typeof o.sold==='boolean'&&(o.kind==='gear'?m.gear.includes(o)&&equipment[o.key]:o.kind==='relic'&&m.relics.includes(o)&&relics[o.key])&&o.price===price(o.kind,o.key,equipment,relics));
 }
 const api={pools,install,drawBranch,choices,rarity,relicKey,price,stock,refreshPrice,validate};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HaffBranchMarket=api;
})(typeof window==='undefined'?globalThis:window);
