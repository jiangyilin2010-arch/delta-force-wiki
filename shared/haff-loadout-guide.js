/* Read-only advice from this game's actual skills and item catalogue. */
(function (root) {
  'use strict';
  const Core = typeof module !== 'undefined' && module.exports ? require('./haff-war-core.js') : root.HaffWar;
  const Systems = typeof module !== 'undefined' && module.exports ? require('./haff-systems.js') : root.HaffSystems;
  const profiles = {
    shepherd: { lane:'back', reason:'后排减振光环保护全体前排，声波持续削弱敌人；可用手雷参与爆破构筑。', front:['capacitorM7','dualResetHelmet','bracedVest'], relics:['radio','lighter','watch'] },
    gizmo: { lane:'back', reason:'先用烟雾地雷覆盖全队并加盾，再布置母巢与寻猎蜘蛛；后排攻击受控敌人还有额外增伤。', front:['capacitorM7','dualResetHelmet','bracedVest'], relics:['experiment','radio','mechanical'] },
    raptor: { lane:'both', reason:'无人机与 EMP 能减防破盾；后排还可跟随前排射击，适合标记集火队。', front:['capacitorM7','rangefinderHelmet','bracedVest'], relics:['binoculars','radio','quantum'] },
    rover: { lane:'both', reason:'前排可手选针剂救援或压低敌人血线；后排自动净化，军犬追击吃攻击与增伤。', front:['poweredGripMP5','triageHelmet','rescueHarness'], relics:['scalpel','workerBee','radio'] },
    vyron: { lane:'both', reason:'前排可手动推进、控场；后排能跟随队友协同射击。', front:['wrappedM7','dualResetHelmet','mobilePlateVest'], back:['wrappedM7','dualCellHelmet','bracedVest'], relics:['lighter','radio','mechanical'] },
    dwolf: { lane:'front', reason:'前排便于衔接外骨骼与击杀续航；后排可提供击破治疗。', front:['steadySight416','dualCellHelmet','doubleWeaveVest'], back:['wrappedM7','reconHelmet','rescueVest'], relics:['workerBee','graphicsCard','rocketFuel'], backRelics:['lighter','caviar'] },
    tempest: { lane:'front', reason:'前排翻滚与锚点衔接连射；AKM 每发普攻叠加 8% 开战攻击，层数无上限，适配三连射与三星九连射。后排强化连射同样可叠层。', front:['stableM7','dualResetHelmet','mobilePlateVest'], back:['stableM7','dualResetHelmet','bracedVest'], relics:['bladeServer','mechanical','rocketFuel'] },
    sineva: { lane:'front', reason:'高生命、防护与防爆套装适合承伤；后排可将套装交给前排队友。', front:['poweredGripMP5','helmet5','bastionVest'], back:['poweredGripMP5','dualResetHelmet','cooledPlateVest'], relics:['carbonPlate','radio','watch'] },
    luna: { lane:'both', reason:'前排可手动选取电击与爆破目标；后排标记敌人并协同追击。', front:['capacitorM7','rangefinderHelmet','coolMeshVest'], relics:['radio','binoculars','experiment'] },
    nameless: { lane:'both', reason:'前排用潜袭增伤减伤；后排压制治疗，并对流血目标增伤。', front:['capacitorM7','dualResetHelmet','mobilePlateVest'], back:['capacitorM7','dualResetHelmet','bracedVest'], relics:['experiment','mechanical','radio'] },
    nitro: { lane:'both', reason:'前后排都能叠低温冻结；后排对低温目标还有额外增伤。', front:['capacitorM7','dualResetHelmet','conductiveVest'], relics:['robotVacuum','experiment','radio'] },
    echo: { lane:'back', reason:'后排能在敌人射击后自动标记、回能，持续提供侦察压制。', front:['poweredGripMP5','camoObserverHelmet','bracedVest'], relics:['radio','binoculars','quantum'] },
    butterfly: { lane:'back', reason:'后排每次支援前额外治疗并回能，适合持续救援与封烟。', front:['poweredGripMP5','triageHelmet','rescueHarness'], relics:['vein','caviar','scalpel'] },
    toxik: { lane:'both', reason:'毒雾配合露娜等持续伤害成员叠感染，大招引爆层数；后排还能治疗前排并推进技能冷却。', front:['poweredGripMP5','triageHelmet','rescueHarness'], relics:['tea','milRadio','scalpel'] },
    stinger: { lane:'back', reason:'后排额外治疗并可自动救起队友，充能装备还能加快补针。', front:['poweredGripMP5','dualCellHelmet','medicVest'], relics:['vein','caviar','scalpel'] },
    uluru: { lane:'back', reason:'后排驻守不占普通行动位，每轮建立掩体，满能量自动发射巡飞弹。', front:['wrappedM7','dualCellHelmet','cooledPlateVest'], back:['twinGas416','dualCellHelmet','rescueVest'], relics:['lighter','watch','experiment'], backRelics:['lighter','pulseCore'] },
    hackclaw: { lane:'back', reason:'后排驻守不占普通行动位，自动标记、协同飞刀并蓄力破译。', front:['poweredGripMP5','rangefinderHelmet','bracedVest'], back:['twinGas416','camoObserverHelmet','rescueVest'], relics:['binoculars','radio','quantum'], backRelics:['radio','binoculars','quantum'] }
  };
  const qualityNames = {green:'绿色',blue:'蓝色',purple:'紫色',gold:'金色',red:'红色'};
  const stats = {hp:'生命',attack:'攻击',armor:'防护',speed:'速度',energy:'初始能量',initialEnergy:'初始能量',chargeEfficiency:'充能效率',cooldownReduction:'技能冷却',critRate:'暴击率',critDamage:'暴击额外伤害'};
  function itemInfo(item) { return item?.kind==='gear'?Core.equipment[item.key]:item?.kind==='relic'?Systems.relics[item.key]:item?.kind==='component'?Systems.components[item.key]:null; }
  function describe(item) {
    const data=itemInfo(item);if(!data)return null;
    const values=item.kind==='gear'?data:data.bonus||{};
    const attributes=Object.entries(stats).filter(([key])=>values[key]).map(([key,label])=>({label,value:key==='cooldownReduction'?`−${values[key]} 次行动`:`${values[key]>0?'+':''}${values[key]}${['chargeEfficiency','critRate','critDamage'].includes(key)?'%':''}`}));
    if(data.supreme?.critRate) attributes.push({label:'暴击率',value:`+${data.supreme.critRate}%`});
    if(data.supreme?.critDamage) attributes.push({label:'暴击伤害',value:`+${data.supreme.critDamage}%`});
    return {name:data.name,quality:data.quality,qualityName:qualityNames[data.quality]||'',slot:item.kind==='gear'?data.firearmType||Core.equipmentSlots[data.slot]:item.kind==='relic'?'藏品':'配件',attributes,effect:item.kind==='relic'?data.effect:data.passive||'',acquisition:data.acquisition||''};
  }
  function status(item, owner, inventory) {
    if(!inventory)return {key:'reference',label:'配装参考'};
    const matching=inventory.filter(entry=>entry.kind===item.kind&&entry.key===item.key);
    if(matching.some(entry=>entry.owner===owner))return {key:'equipped',label:'已穿戴'};
    if(matching.some(entry=>!entry.owner))return {key:'available',label:'库存可用'};
    const other=matching.find(entry=>entry.owner);
    return other?{key:'other',label:`${Core.units[other.owner]?.name||'其他干员'}携带`}:{key:'missing',label:'尚未获得'};
  }
  function recommendationReason(item,id,lane) {
    const data=itemInfo(item),rule=item.kind==='relic'?data.link||data.rule:Systems.gearPassives[item.key];
    if (data.care) return data.care.cleanse ? '治疗附带净化、充能与技能减冷却' : data.care.overflow ? '过量治疗转为护盾，满血时仍能支援' : '强化主动治疗与后排持续救援';
    if(rule?.tag){
      const skills=Core.units[id].skills.filter(skill=>Systems.skillFamilies[rule.tag].actions.includes(skill.id) || skill.id==='aerosol' && Systems.skillFamilies[rule.tag].actions.includes('aerosolAid'));
      const usable=lane==='back'&&Core.rearPassives[id].mode==='reserve'?skills.filter(skill=>skill.ultimate):skills;
      return `联动${usable.map(skill=>skill.name).join('、')}`;
    }
    if(item.key==='poweredGripMP5'&&id==='stinger')return '常规支援回能转换为补针进度';
    if (item.kind === 'relic') return data.effect;
    return rule?.name || '适配当前站位';
  }
  function advice(id,position,inventory=null) {
    const profile=profiles[id];if(!profile)return null;
    const deployed=Core.Formation.validSlot(position);
    const lane=deployed?(!Core.Formation.frontSlot(position)?'back':'front'):profile.lane==='back'?'back':'front';
    const gear=lane==='back'?profile.back||profile.front:profile.front;
    const relics=lane==='back'?profile.backRelics||profile.relics:profile.relics;
    return {lane:profile.lane,label:{front:'更适合前排',back:'更适合后排',both:'前后排皆可'}[profile.lane],reason:profile.reason,
      context:`${deployed?'当前':'建议'}${lane==='back'?'后排':'前排'}配装`,items:[...gear.map(key=>({kind:'gear',key})),...relics.map(key=>({kind:'relic',key}))].filter(item=>itemInfo(item)).map(item=>({...item,reason:recommendationReason(item,id,lane),status:status(item,id,inventory)}))};
  }
  const api={profiles,itemInfo,describe,advice,status};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HaffLoadoutGuide=api;
})(typeof window==='undefined'?globalThis:window);
