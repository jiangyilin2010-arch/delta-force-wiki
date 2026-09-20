/* Full-bond combat engines. Reactions share the current transaction, never the action queue. */
(function(root){
  'use strict';
 const Formation = typeof module !== 'undefined' && module.exports ? require('./haff-formation-rules.js') : root.HaffFormation;
  const rules = {
    smoke:{name:'烟幕猎杀',icon:'≋',text:'质变 · 烟幕猎杀：烟幕或烟墙内，每次前排普攻都会指挥其他未被击倒的前排，各以 140% 攻击力集火同一目标；目标倒下后转火。适合普攻与高速阵容。'},
    demolition:{name:'无限殉爆',icon:'✹',text:'质变 · 无限殉爆：任意敌人倒下，向其余敌人引爆「倒下者最大生命的 15% + 120% 爆破成员攻击」伤害；新击杀继续引爆，每个敌人只殉爆一次。成员每使用 3 次爆破技能，追加 350% 攻击力全场轰炸，首领单体也有效。'},
    breach:{name:'交叉处决',icon:'ϟ',text:'质变 · 交叉处决：每次成员施放闪光技能，为全体敌人装填 3 次处决标记。此后每次友方行动命中该敌人，消耗 1 次标记，攻击最高的另一名未被击倒的闪光成员追加 250% 攻击力射击，后排也能参与。耗尽最后一次标记，再追加目标最大生命 20% 的基础伤害（不暴击）。多段攻击每目标只触发一次。'},
    defense:{name:'堡垒巨炮',icon:'⬡',text:'质变 · 堡垒巨炮：全体前排的掩体和护盾每吸收相当于前排总生命上限 20% 的伤害，自动向全体敌人开炮，基础伤害为该蓄能阈值的 300%。堆生命与护盾也能成为主输出。'},
    charge:{name:'生机过载',icon:'✚',text:'质变 · 生机过载：成员的实际治疗和溢出治疗均可蓄能；每累计前排总生命上限的 25%，释放该阈值 200% 基础伤害的全场脉冲。前排受到的溢出治疗还会转为等量护盾，满血也能发动治疗流输出。'},
    recon:{name:'灾变感染',icon:'☣',text:'2 名持续伤害成员开启感染：每次成员施放持续伤害技能，按敌人携带的持续伤害种类增加感染层数，并造成每层 20%/30%/40%/50%/60% 施法者攻击力的基础伤害（2/3/5/7/9 人），不暴击。感染无层数上限，敌人倒下后全部转移给生命最多的在场敌人。蛊的大招可消耗全体感染，每层造成蛊攻击力 150% 的基础伤害，保留持续效果。'}
  };
  const keys=Object.keys(rules);
  const totalFrontHp=state=>state.units.filter(u=>u.side==='ally'&&Formation.frontSlot(u.slot)).reduce((n,u)=>n+u.maxHp,0);
  const threshold=(state,key)=>Math.max(1,Math.round(totalFrontHp(state)*(key==='defense'?.2:.25)));
  function init(state){
    return state.buildcraftEngine ||= {shells:0,guard:0,vitality:0,exposed:{},infection:{},detonated:[],transferred:[],ledger:{}};
  }
  function credit(state,key,field,amount){
    if(state.buildcraftVersion!==2||!rules[key]||!(amount>0))return;
    const entry=init(state).ledger[key] ||= {damage:0,healing:0,shield:0,triggers:0};
    entry[field]+=amount;
  }
  function validate(state,bonds){
    const m=state.buildcraftEngine;
    const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
    const integer=(v,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
    if(!object(m))return false;
    const mastered=new Set(bonds.filter(b=>b.mastered).map(b=>b.key)),active=new Set(bonds.filter(b=>b.active).map(b=>b.key));
    const enemies=state.units.filter(u=>u.side==='enemy').map(u=>u.id);
    const map=(v,key,max)=>object(v)&&Object.entries(v).every(([id,n])=>enemies.includes(id)&&(key==='recon'?active:mastered).has(key)&&integer(n,max));
    const list=(v,key)=>Array.isArray(v)&&new Set(v).size===v.length&&v.every(id=>enemies.includes(id)&&state.units.find(u=>u.id===id).hp<=0&&(key==='recon'?active:mastered).has(key));
    return integer(m.shells,2)&&(!m.shells||mastered.has('demolition'))
      &&integer(m.guard,threshold(state,'defense')-1)&&(!m.guard||mastered.has('defense'))
      &&integer(m.vitality,threshold(state,'charge')-1)&&(!m.vitality||mastered.has('charge'))
      &&map(m.exposed,'breach',3)&&map(m.infection,'recon',8*(state.actions+1)*enemies.length)
      &&list(m.detonated,'demolition')&&list(m.transferred,'recon')
      &&object(m.ledger)&&Object.entries(m.ledger).every(([key,row])=>active.has(key)&&object(row)&&['damage','healing','shield','triggers'].every(field=>integer(row[field])))
      &&Object.values(m.ledger).reduce((n,row)=>n+row.damage,0)<=state.units.filter(u=>u.side==='ally').reduce((n,u)=>n+u.damage,0);
  }
  function afterAction({state,actor,event,resolvedAction,actionId,primaryEffects,activeBonds,triggers,bondHit,shield,stats,link}){
    if(state.buildcraftVersion!==2)return;
    const m=init(state),mastered=new Map(activeBonds.filter(b=>b.mastered).map(b=>[b.key,b]));
    const infectionBond=activeBonds.find(b=>b.key==='recon'&&b.active);
    const infectionPower = infectionBond ? ((state.bondRevision || 1) === 1 && infectionBond.mastered ? .6 : [0,.2,.3,.4,.5,.6][infectionBond.tier]) : 0;
    const incomingHeals=event.effects.filter(e=>e.type==='heal'),incomingOverflow=(event.overhealing||[]).slice();
    const allies=()=>state.units.filter(u=>u.side==='ally'&&u.hp>0);
    const front=()=>allies().filter(u=>Formation.frontSlot(u.slot));
    const foes=()=>state.units.filter(u=>u.side==='enemy'&&u.hp>0&&(!state.reinforcementVersion||u.entered&&!u.retired));
    const find=id=>state.units.find(u=>u.id===id);
    const member=(key,except,automatic=false)=>allies().filter(u=>mastered.get(key)?.present.includes(u.id)&&u.id!==except&&(automatic||!u.stun)).sort((a,b)=>b.attack-a.attack||a.slot-b.slot)[0];
    const canCast=resolvedAction&&actor.side==='ally'&&actor.hp>0;
    const casts=(key,category)=>canCast&&mastered.get(key)?.present.includes(actor.id)&&triggers[category].includes(actionId);
    const strike=(key,source,target,amount,explosive=true,canCrit=false)=>{
      if(!source||!target||target.hp<=0)return;
      bondHit(source,target,amount,explosive,canCrit,key);
      event.targets=[...new Set([...event.targets,target.id])];
    };
    const proc=(key,source,target,label,targets=[target])=>{
      if(!source||!target)return;
      stats(source.id).procs++;
      link(source,target,`质变 · ${label||rules[key].name}`,key);
      (event.bondBursts ||= []).push({bond:key,source:source.id,targets:targets.filter(Boolean).map(u=>u.id)});
    };
    if(!front().length)return;
    // Use only incoming action hits. Shots generated below cannot trigger other shots.
    if(canCast&&mastered.has('breach')){
      const victims=[...new Set(primaryEffects.filter(e=>e.type==='damage'&&e.value>0).map(e=>e.target))];
      for(const id of victims){
        const target=find(id),shooter=member('breach',actor.id);
        if(!m.exposed[id]||target?.side!=='enemy'||target.hp<=0||!shooter)continue;
        m.exposed[id]--;strike('breach',shooter,target,shooter.attack*2.5,false,true);
        if(!m.exposed[id])strike('breach',shooter,target,target.maxHp*.2);
        stats(shooter.id).followUps++;proc('breach',shooter,target,m.exposed[id]?'交叉处决':'处决终结');
      }
    }
    if(casts('breach','flash')){
      for(const enemy of foes())m.exposed[enemy.id]=3;
      if(foes().length)proc('breach',actor,foes()[0],'处决标记 ×3',foes());
    }
    if(canCast&&Formation.frontSlot(actor.slot)&&(actionId==='attack'||event.comboAttack)&&mastered.has('smoke')&&(state.smoke.ally||state.walls.ally)){
      for(const shooter of front().filter(u=>u!==actor&&!u.stun)){
        const target=foes().find(u=>u.id===event.primaryTarget)||foes()[0];if(!target)break;
        strike('smoke',shooter,target,shooter.attack*1.4,false,true);
        stats(shooter.id).followUps++;proc('smoke',shooter,target,'烟幕集火');
      }
    }
    if(casts('demolition','demolition')){
      m.shells++;
      if(m.shells===3){
        m.shells=0;const victims=foes();
        for(const enemy of victims)strike('demolition',actor,enemy,actor.attack*3.5,true,true);
        if(victims.length)proc('demolition',actor,victims[0],'饱和轰炸',victims);
      }
    }
    if(mastered.has('defense')){
      const blocked=primaryEffects.filter(e=>['shieldBlock','block'].includes(e.type)&&find(e.target)?.side==='ally'&&Formation.frontSlot(find(e.target).slot)).reduce((n,e)=>n+e.value,0);
      m.guard+=blocked;const limit=threshold(state,'defense'),volleys=Math.floor(m.guard/limit),gunner=member('defense',null,true);
      // The cannon is automatic, so crowd control on its owner does not suppress stored energy.
      m.guard%=limit;
      if(volleys&&gunner){const victims=foes();for(const enemy of victims)strike('defense',gunner,enemy,limit*3*volleys);
        if(victims.length)proc('defense',gunner,victims[0],`堡垒巨炮${volleys>1?' ×'+volleys:''}`,victims);}
    }
    if(mastered.has('charge')){
      // Snapshot healing before engine strikes: kill-healing generated here cannot feed this same pulse.
      const heals=incomingHeals.filter(e=>e.value>0&&mastered.get('charge').present.includes(e.source||actor.id));
      const overflow=incomingOverflow.filter(e=>mastered.get('charge').present.includes(e.source));
      const medic=member('charge',null,true);
      for(const e of overflow){const patient=find(e.target),owner=find(e.source);if(patient?.hp>0&&patient.side==='ally'&&Formation.frontSlot(patient.slot))shield(patient,e.value,owner,'charge');}
      m.vitality+=[...heals,...overflow].reduce((n,e)=>n+e.value,0);
      const limit=threshold(state,'charge'),pulses=Math.floor(m.vitality/limit);m.vitality%=limit;
      if(pulses&&medic){const victims=foes();for(const enemy of victims)strike('charge',medic,enemy,limit*2*pulses);
        if(victims.length)proc('charge',medic,victims[0],`生机过载${pulses>1?' ×'+pulses:''}`,victims);}
    }
    if(canCast&&infectionBond&&actor.id==='toxik'&&actionId==='firefly'){
      const victims=foes().filter(enemy=>m.infection[enemy.id]>0);
      // Clear the whole snapshot first: a detonation kill must not transfer spent stacks.
      const charges=victims.map(enemy=>({enemy,count:m.infection[enemy.id]}));
      for(const {enemy} of charges)delete m.infection[enemy.id];
      for(const {enemy,count} of charges)strike('recon',actor,enemy,actor.attack*1.5*count);
      if(victims.length)proc('recon',actor,victims[0],'流荧 · 感染引爆',victims);
    }
    if(canCast&&infectionBond?.present.includes(actor.id)&&triggers.dot.includes(actionId)){
      const victims=foes();let affected=false;
      for(const enemy of victims){
        const types=['burn','bleeding','shock','coldField','wireField','spiderMines','aerosolField','venom'].filter(key=>enemy[key]&&(key==='burn'||enemy[key].ticks>0)).length;
        if(!types)continue;affected=true;m.infection[enemy.id]=(m.infection[enemy.id]||0)+types;
        strike('recon',actor,enemy,actor.attack*infectionPower*m.infection[enemy.id]);
      }
      if(affected)proc('recon',actor,victims[0],'灾变感染',victims);
    }
    // A death can enqueue more deaths, but each roster ID explodes/transfers at most once per battle.
    // This also handles delayed DOT/bomb deaths and kills made by the other bond engines.
    for(let i=0;i<event.effects.length;i++){
      const e=event.effects[i],dead=find(e.target);
      if(e.type!=='down'||dead?.side!=='enemy'||dead.hp>0)continue;
      delete m.exposed[dead.id];
      if(infectionBond&&!m.transferred.includes(dead.id)){
        m.transferred.push(dead.id);const count=m.infection[dead.id]||0;delete m.infection[dead.id];
        const survivor=foes().sort((a,b)=>b.hp-a.hp||a.slot-b.slot)[0];
        if(survivor&&count){m.infection[survivor.id]=(m.infection[survivor.id]||0)+count;const owner=allies().filter(u=>infectionBond.present.includes(u.id)).sort((a,b)=>b.attack-a.attack)[0];if(owner)proc('recon',owner,survivor,`感染转移 +${count}`);}
      }
      if(mastered.has('demolition')&&!m.detonated.includes(dead.id)){
        m.detonated.push(dead.id);const bomber=member('demolition',null,true),victims=foes();
        if(bomber&&victims.length){for(const enemy of victims)strike('demolition',bomber,enemy,dead.maxHp*.15+bomber.attack*1.2);
          proc('demolition',bomber,victims[0],'连环殉爆',victims);}
      }
    }
  }
  function status(state,bonds){
    if(state?.buildcraftVersion!==2)return [];
    const m=state.buildcraftEngine||{},alive=state.units.filter(u=>u.side==='enemy'&&u.hp>0);
    return bonds.filter(b=>b.mastered||b.key==='recon'&&b.active).map(b=>{
      const rule=rules[b.key];let current=0,max=1,label='已激活';
      if(b.key==='smoke'){current=Math.max(state.smoke.ally,state.walls.ally);max=4;label=current?`齐射 · ${current}轮`:'等待烟幕';}
      if(b.key==='demolition'){current=m.shells||0;max=3;label=`轰炸 ${current}/3`;}
      if(b.key==='breach'){current=alive.reduce((n,u)=>n+(m.exposed?.[u.id]||0),0);max=Math.max(1,alive.length*3);label=`处决 ${current}次`;}
      if(b.key==='defense'||b.key==='charge'){current=m[b.key==='defense'?'guard':'vitality']||0;max=threshold(state,b.key);label=`${b.key==='defense'?'巨炮':'脉冲'} ${Math.floor(current/max*100)}%`;}
      if(b.key==='recon'){current=alive.reduce((n,u)=>n+(m.infection?.[u.id]||0),0);max=Math.max(1,current);label=`感染 ${current}层`;}
      return {key:b.key,name:rule.name,icon:rule.icon,color:b.color,label,current,max,damage:m.ledger?.[b.key]?.damage||0,detail:rule.text};
    });
  }
  function plan(state,actor,options,current,bonds,triggers,patient){
    if(state.buildcraftVersion!==2||current?.ultimate)return null;
    const mastered=new Set(bonds.filter(b=>b.mastered).map(b=>b.key));
    const pick=category=>options.find(a=>triggers[category].includes(a.id));
    // Preserve emergency treatment before optimizing offensive loops.
    if(patient?.hp<patient?.maxHp*.4&&current&&(triggers.healing.includes(current.id)||current.id==='aerosol'))return null;
    if(mastered.has('charge')&&pick('healing'))return pick('healing');
    if(mastered.has('defense')&&state.units.some(u=>u.side==='ally'&&Formation.frontSlot(u.slot)&&u.hp>0&&(u.gearState?.shield||0)<u.maxHp*.2)&&pick('defense'))return pick('defense');
    const foes=state.units.filter(u=>u.side==='enemy'&&u.hp>0);
    if(mastered.has('breach')&&foes.some(u=>!state.buildcraftEngine?.exposed?.[u.id])&&pick('flash'))return pick('flash');
    if(bonds.some(b=>b.key==='recon'&&b.active)&&pick('dot'))return pick('dot');
    if(mastered.has('smoke')){
      if(!(state.smoke.ally||state.walls.ally)&&pick('smoke'))return pick('smoke');
      if(Formation.frontSlot(actor.slot)&&(state.smoke.ally||state.walls.ally))return options.find(a=>a.id==='attack');
    }
    return null;
  }
  function target(state,actor,action,bonds,triggers){
    if(state.buildcraftVersion!==2||action.target!=='enemy')return null;
    const mastered=new Set(bonds.filter(b=>b.mastered).map(b=>b.key));
    const foes=state.units.filter(u=>u.side==='enemy'&&u.hp>0&&action.targets.includes(u.id)).sort((a,b)=>a.hp-b.hp);
    if(mastered.has('demolition')&&foes[0]?.hp<actor.attack*1.5)return foes[0].id;
    if(bonds.some(b=>b.key==='recon'&&b.active)&&triggers.dot.includes(action.id))return foes.at(-1)?.id;
    if(mastered.has('breach'))return foes.find(u=>state.buildcraftEngine?.exposed?.[u.id])?.id;
    return null;
  }
  const api={rules,keys,init,credit,validate,threshold,afterAction,status,plan,target};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HaffBondEngines=api;
})(typeof window==='undefined'?globalThis:window);
