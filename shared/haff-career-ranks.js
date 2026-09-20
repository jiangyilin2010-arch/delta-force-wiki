/* Persistent career rules; rank names reference Warfare, promotion adapts Currency Wars. */
(function(root){
'use strict';
const Hazards=typeof module!=='undefined'&&module.exports?require('./haff-rank-hazards.js'):root.HaffRankHazards;
const groups=[['列兵',3,'#93b7a0'],['上等兵',3,'#9ccba9'],['军士长',4,'#78c9c5'],['尉官',4,'#82b5f0'],['校官',5,'#c7a2eb'],['将军',5,'#ebc581'],['统帅',5,'#f29486']];
const roman=['','Ⅰ','Ⅱ','Ⅲ','Ⅳ','Ⅴ'];
const ranks=groups.flatMap(([name,count,color],group)=>Array.from({length:count},(_,i)=>({name:name+(count===1?'':roman[count-i]),group,color}))).map((r,index)=>({...r,index}));
const tracks={funding:{name:'行动预算',detail:'每级开局资金 +1 万',max:5},vitality:{name:'战地体能',detail:'每级全队生命 +10',max:5},recruitment:{name:'招募渠道',detail:'每级开局免费刷新 +1 次',max:5}};
const integer=n=>Number.isSafeInteger(n)&&n>=0;
const rankIndex=n=>Math.max(0,Math.min(ranks.length-1,Math.floor(Number(n)||0)));
function initialize(profile){
 if(!profile.career)profile.career={version:1,highest:Math.min(24,profile.wins),legacyWins:profile.wins,training:{funding:0,vitality:0,recruitment:0}};
 profile.career.promotionWins??=0;
 return profile.career;
}
function rank(profile){return ranks[initialize(profile).highest];}
function training(profile,level){const c=initialize(profile),spent=Object.values(c.training).reduce((a,b)=>a+b,0);return{levels:{...c.training},earned:Math.max(0,level-1),spent,available:Math.max(0,level-1-spent)};}
function train(profile,key,level){const info=training(profile,level),rule=tracks[key];if(!rule||info.available<1||info.levels[key]>=rule.max)throw new Error('训练点不足，或该项目已满级。');profile.career.training[key]++;return training(profile,level);}
function pressure(run){
 const index=rankIndex(run?.careerRun?.rank);
 // Freeze the old curve for runs already started before this revision.
 if(run?.careerRun?.difficultyVersion!==2)return{hp:1+index*.06,attack:1+index*.035,xp:1+index*.04};
 const hp=1.15+index*.08+Math.max(0,index-9)**2*.008+Math.max(0,index-23)**2*.2;
 return{hp:Math.round(hp*1000)/1000,attack:1+index*.035+Math.max(0,index-18)**2*.005,xp:1+index*.04};
}
function promotion(index){
 if(index>=ranks.length-1)return{wins:0,integrity:0,description:'已达统帅Ⅰ；可继续挑战并积累经验。'};
 if(index>=24){const wins=index-22,integrity=60+(index-24)*5;return{wins,integrity,description:`在当前最高职级连续 ${wins} 次实战通关三个位面，每次完整度 ≥${integrity}，晋升 1 阶。失利、完整度不足或使用直通会清空本阶进度；低职级练习不影响进度。职级不下降。`};}
 if(index>=19)return{wins:1,integrity:50,description:'在当前最高职级实战通关三个位面，完整度 ≥50，晋升 1 阶；使用直通不计晋升。职级不下降。'};
 return{wins:1,integrity:0,description:'通关当前最高职级：完整度 ≥70 升 3 阶，≥40 升 2 阶，其余升 1 阶；最多升至将军Ⅴ。失利不降级。'};
}
function promotionProgress(profile){const c=initialize(profile);return{...promotion(c.highest),current:c.promotionWins};}
function prepareRun(profile,run,selected){
 const c=initialize(profile),index=selected==null?c.highest:selected;
 if(!integer(index)||index>c.highest||index>=ranks.length)throw new Error('该职级尚未解锁。');
 if(run.careerRun)throw new Error('本次行动已领取战备加成。');
 run.careerRun={rank:index,training:{...c.training},difficultyVersion:2};
 Hazards.prepare(run);
 run.coins+=c.training.funding*10000;run.freeRefreshes+=c.training.recruitment;
 return run;
}
function record(profile,run,receipt){
 const c=initialize(profile),before=c.highest,challenge=run.careerRun?.rank??0;
 const rule=promotion(before),trialBefore=c.promotionWins,eligible=challenge===before&&before<ranks.length-1;
 const cleared=run.outcome==='extracted';
 const qualified=cleared&&run.integrity>=rule.integrity&&(before<19||[0,1,2].every(plane=>run.clearedBosses.includes(plane))&&!run.history.some(entry=>entry.bypassed));
 let gain=0;
 if(eligible&&before<19&&qualified)gain=Math.min(19-before,run.integrity>=70?3:run.integrity>=40?2:1);
 else if(eligible&&before>=19){c.promotionWins=qualified?trialBefore+1:0;if(c.promotionWins>=rule.wins){gain=1;c.promotionWins=0;}}
 c.highest=Math.min(ranks.length-1,before+gain);
 Object.assign(receipt,{rankBefore:before,rankAfter:c.highest,rankGain:c.highest-before,challengeRank:challenge,promotionVersion:1,trialBefore,trialAfter:c.promotionWins,trialQualified:qualified});
}
function validateRun(run){
 if(run.careerRun===undefined)return true;
 const c=run.careerRun;
 return !!c&&integer(c.rank)&&c.rank<ranks.length&&(c.difficultyVersion===2||c.difficultyVersion===undefined&&c.rank<=24)&&c.training&&Object.keys(c.training).length===3&&Object.keys(tracks).every(k=>integer(c.training[k])&&c.training[k]<=tracks[k].max)&&Hazards.validate(run);
}
function restore(profile,level){
 const c=initialize(profile);
 if(c.version!==1||!integer(c.highest)||c.highest>=ranks.length||!integer(c.legacyWins)||c.legacyWins>profile.wins||!c.training||Object.keys(c.training).length!==3||!Object.keys(tracks).every(k=>integer(c.training[k])&&c.training[k]<=tracks[k].max))throw new Error('职级或战备训练记录无效。');
 const receipts=Object.values(profile.awards),gain=receipts.reduce((sum,r)=>sum+(r.rankGain||0),0);
 if(receipts.some(r=>r.rankGain!==undefined&&(!integer(r.rankGain)||r.rankGain>3||!integer(r.rankBefore)||!integer(r.rankAfter)||r.rankAfter!==r.rankBefore+r.rankGain||r.rankAfter>=ranks.length||r.outcome==='failed'&&r.rankGain!==0))||c.highest!==Math.min(ranks.length-1,Math.min(24,c.legacyWins)+gain)||training(profile,level).spent>level-1)throw new Error('晋升或训练点记录无效。');
 let trial=0;
 for(const r of receipts.slice().sort((a,b)=>a.beforeXp-b.beforeXp)){
  if(r.promotionVersion===undefined)continue;
  if(r.promotionVersion!==1||!integer(r.challengeRank)||r.challengeRank>r.rankBefore||r.trialBefore!==trial||typeof r.trialQualified!=='boolean'||r.outcome==='failed'&&r.trialQualified)throw new Error('晋升试炼记录无效。');
  const rule=promotion(r.rankBefore),eligible=r.challengeRank===r.rankBefore&&r.rankBefore>=19&&r.rankBefore<ranks.length-1;
  if(eligible){trial=r.trialQualified?trial+1:0;const promoted=trial>=rule.wins;if(r.rankGain!==(promoted?1:0))throw new Error('晋升试炼进度无效。');if(promoted)trial=0;}
  else if(r.rankBefore>=19&&r.rankGain!==0)throw new Error('晋升试炼职级无效。');
  if(r.trialAfter!==trial)throw new Error('晋升试炼记录无效。');
 }
 if(!integer(c.promotionWins)||c.promotionWins!==trial)throw new Error('晋升试炼进度无效。');
 return profile;
}
const api={ranks,tracks,initialize,rank,training,train,pressure,promotion,promotionProgress,prepareRun,record,validateRun,restore};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HaffCareerRanks=api;
})(typeof window==='undefined'?globalThis:window);
