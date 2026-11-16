import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {state,receiveBotHit,hitBot,buyVest,buyHelmet,buyUtility,launchUtility,utilityCatalog,visibleWithSmoke,grenadeDamage,newBot,chooseTarget,beginRound,startBuy,buy,finishRound,attackerTeamForRound,roleForRound,seedArmoryPreview,canPlant,canDefuse,requestPlant,requestDefuse,liveStep,keys,stepBotObjective,shouldShowMinimapBot,chooseStartingSide,applyBotFire,siteAt,SITE,previewStartSide,botFireInterval} from '../game/src/simulation.js';
import {lineClear,pointBlocked,steerStep,projectileBlocked,stepProjectile,movePlayer,moveBot,effectVisualY} from '../game/src/collision.js';
import {arsenal,categories,freshWeapon,spreadForShot,recoilAngle,rifleVariants,weaponProfile} from '../game/src/weapons.js';
import {tracerState} from '../game/src/shot-feedback.js';
import {UPPER,LOWER,SPAWNS,CONNECTORS,CONNECTOR_RAILS,NAV_NODES,SITES,shortestRoute,connectorSegment,floorHeight} from '../game/src/facility-layout.js';
import {selectShotTarget} from '../game/src/shot-target.js';
import {firstPersonViewProfile} from '../game/src/view-profile.js';


test('minimap contacts preserve allies and reveal only living currently visible enemies',()=>{
 const player={x:-4,z:0,team:'Rookline'},ally={x:0,z:0,team:'Rookline',alive:true},enemy={x:4,z:0,team:'Sumpguard',alive:true},dead={...enemy,alive:false};
 assert.equal(shouldShowMinimapBot(ally,player,()=>false),true);
 assert.equal(shouldShowMinimapBot(enemy,player,()=>true),true);
 const cover=[{x:0,z:0,w:1,d:5}];
 assert.equal(shouldShowMinimapBot(enemy,player,(ax,az,bx,bz)=>lineClear(ax,az,bx,bz,cover)),false);
 state.smokeZones=[{x:0,z:0,radius:2}];
 assert.equal(shouldShowMinimapBot(enemy,player,(ax,az,bx,bz)=>visibleWithSmoke(ax,az,bx,bz)),false);
 state.smokeZones=[];
 assert.equal(shouldShowMinimapBot(dead,player,()=>true),false);
 assert.equal(shouldShowMinimapBot(enemy,player),false);
});

test('lethal grenade grants one elimination reward and one GRENADE feed entry',()=>{
 beginRound(1);const bot=state.bots.find(b=>b.team==='Sumpguard');bot.x=0;bot.z=0;bot.hp=50;
 state.grenade={x:0,y:.2,z:0,vx:0,vy:0,vz:0,timer:.01};const credits=state.credits,kills=state.kills,feed=state.feed.length;
 liveStep(.02,{move(){},moveBot(){},visible:()=>true});
 assert.equal(bot.alive,false);assert.equal(state.kills,kills+1);assert.equal(state.credits,credits+300);
 assert.equal(state.feed.length,feed+1);assert.match(state.feed[0],/GRENADE/);
});

test('world material references all resolve to declared palette entries',()=>{
 const source=readFileSync(new URL('../game/src/world.js',import.meta.url),'utf8');
 const palette=source.match(/export const palette=\{([^}]+)\}/)?.[1];assert.ok(palette,'palette declaration should exist');
 const declared=new Set([...palette.matchAll(/([\w$]+):/g)].map(m=>m[1]));
 const used=new Set([...source.matchAll(/palette\.([\w$]+)/g)].map(m=>m[1]));
 assert.deepEqual([...used].filter(k=>!declared.has(k)),[]);
 assert.match(source,/worn:\s*mats\.worn/);
});

test('production shot selector resolves upper/lower head and body targets and rejects invalid candidates',()=>{
 const selector=(floor,aimY,target)=>selectShotTarget({origin:{x:0,y:aimY,z:0,floor},yaw:0,pitch:0,spread:0,range:20,team:'Rookline',bots:[target],visible:(ax,az,bx,bz,from,to)=>lineClear(ax,az,bx,bz,[],from,to)});
 const upper={x:0,z:-8,floor:UPPER,y:floorHeight(0,-8,UPPER),team:'Sumpguard',alive:true};assert.equal(selector(UPPER,1.65,upper)?.head,true);assert.equal(selector(UPPER,.85,upper)?.head,false);
 const lower={x:0,z:-8,floor:LOWER,y:floorHeight(0,-8,LOWER),team:'Sumpguard',alive:true};assert.equal(selector(LOWER,-4.35,lower)?.head,true);assert.equal(selector(LOWER,-5.15,lower)?.head,false);
 assert.equal(selector(LOWER,-4.35,upper),null,'cross-floor target is rejected');assert.equal(selector(UPPER,1.65,{...upper,alive:false}),null,'dead target is rejected');assert.equal(selector(UPPER,1.65,{...upper,team:'Rookline'}),null,'friendly target is rejected');
 assert.equal(selectShotTarget({origin:{x:0,y:1.65,z:0,floor:UPPER},yaw:0,spread:0,range:20,team:'Rookline',bots:[upper],visible:(ax,az,bx,bz,from,to)=>lineClear(ax,az,bx,bz,[{x:0,z:-4,w:2,d:1}],from,to)}),null,'solid blocker rejects LOS');assert.equal(selectShotTarget({origin:{x:0,y:1.65,z:0,floor:UPPER},yaw:0,spread:0,range:4,team:'Rookline',bots:[upper]}),null,'out-of-range target is rejected');
 const near={...upper,z:-5,y:0},far={...upper,z:-9,y:0};assert.equal(selectShotTarget({origin:{x:0,y:1.65,z:0,floor:UPPER},yaw:0,spread:0,range:20,team:'Rookline',bots:[far,near]})?.bot,near,'nearest valid target wins');
 const main=readFileSync(new URL('../game/src/main.js',import.meta.url),'utf8');assert.match(main,/selectShotTarget\(/,'shoot() uses the tested selector');
});

test('production lower-floor selector result applies exact T and CT AR head/body damage',()=>{
 const priorCredits=state.credits,priorKills=state.kills,priorFeed=state.feed.slice();
 const target=(team)=>({x:0,z:-8,floor:LOWER,y:floorHeight(0,-8,LOWER),team,alive:true,hp:100,helmet:100});
 const pick=(shooter,victim,aimY)=>selectShotTarget({origin:{x:0,y:aimY,z:0,floor:LOWER},yaw:0,pitch:0,spread:0,range:20,team:shooter,bots:[victim]});
 state.player.team='Rookline';state.weapon=freshWeapon(2,'Rookline');let victim=target('Sumpguard'),selected=pick('Rookline',victim,-4.35);assert.equal(selected?.head,true);assert.equal(hitBot(victim,selected.head),100);assert.equal(victim.alive,false,'T lower-floor headshot kills through helmet');
 state.player.team='Sumpguard';state.weapon=freshWeapon(2,'Sumpguard');victim=target('Rookline');selected=pick('Sumpguard',victim,-4.35);assert.equal(selected?.head,true);assert.equal(hitBot(victim,selected.head),90);assert.equal(victim.hp,10);assert.equal(victim.helmet,0,'CT lower-floor headshot depletes helmet and leaves 10 HP');
 victim=target('Rookline');selected=pick('Sumpguard',victim,-5.15);assert.equal(selected?.head,false);assert.equal(hitBot(victim,selected.head),32);assert.equal(victim.hp,68,'lower-floor body selection applies AR body damage');
 state.credits=priorCredits;state.kills=priorKills;state.feed=priorFeed;chooseStartingSide('Rookline');beginRound(1);
});

test('first-person view profiles distinguish every category and faction-specific AR without a free preview rifle',()=>{
 const profiles=['Pistol','SMG','AR','LMG','Sniper'].flatMap(kind=>['Rookline','Sumpguard'].map(team=>firstPersonViewProfile(kind,team)));
 assert.equal(new Set(profiles.map(p=>p.key)).size,10);assert.equal(firstPersonViewProfile('AR','Rookline').key,'VANDAL-47');assert.equal(firstPersonViewProfile('AR','Sumpguard').key,'SENTINEL-4');assert.ok(['Pistol','SMG','LMG','Sniper'].every(kind=>firstPersonViewProfile(kind,'Rookline').kind===kind));assert.equal(firstPersonViewProfile('unlisted','Rookline'),null);
 chooseStartingSide('Rookline');seedArmoryPreview();assert.equal(state.weapon.kind,'Pistol');assert.equal(firstPersonViewProfile(state.weapon.kind,state.player.team).kind,'Pistol');assert.equal(state.weapon.id,0);assert.equal(state.credits,2450);chooseStartingSide('Rookline');state.credits=1800;beginRound(1);
 const main=readFileSync(new URL('../game/src/main.js',import.meta.url),'utf8');assert.match(main,/viewModels\.set\(profile\.key,group\)/);assert.match(main,/firstPersonViewProfile\(state\.weapon\.kind,state\.player\.team\)/);assert.match(main,/gun\.localToWorld\(start\.set\(profile\.muzzle\.x,profile\.muzzle\.y,profile\.muzzle\.z\)\)/);
});

test('armory has exactly five distinct category loadouts with complete, materially different stats',()=>{
 assert.deepEqual(categories,['Pistol','SMG','AR','LMG','Sniper']);
 assert.deepEqual(arsenal.map(w=>w.kind),categories);
 for(const w of arsenal)for(const field of ['cost','damage','head','interval','mag','reserve','reload','accuracy','spread','range','recoil','color'])assert.ok(w[field]!==undefined,`${w.kind} missing ${field}`);
 for(const field of ['cost','damage','head','interval','mag','accuracy','spread','recoil','range'])assert.ok(new Set(arsenal.map(w=>w[field])).size>1,`${field} should vary`);
 assert.equal(arsenal[0].cost,0);assert.ok(arsenal[0].damage>=30&&arsenal[0].head>=85,'issued pistol remains viable');
 assert.ok(arsenal.every(w=>w.interval>0&&w.mag>0&&w.reserve>0));
 assert.ok(spreadForShot(arsenal[1])>spreadForShot(arsenal[4]),'weapon accuracy/spread affects shot cone');
 assert.ok(spreadForShot(arsenal[4],{moving:true})>spreadForShot(arsenal[4]));
 assert.ok(spreadForShot(arsenal[0],{crouched:true})<spreadForShot(arsenal[0]));
 assert.ok(recoilAngle(arsenal[3],1)>recoilAngle(arsenal[0],1),'recoil stat affects shot trajectory');
});

test('purchases require buy phase, charge correctly, and weapon plus earned credits persist across rounds',()=>{
 state.player.team='Rookline';state.phase='buy';state.credits=1800;state.weapon=freshWeapon(0);
 assert.equal(buy(4),false);assert.equal(state.credits,1800);
 assert.equal(buy(1),true);assert.equal(state.credits,980);assert.equal(state.weapon.id,1);
 state.phase='live';assert.equal(buy(2),false);assert.equal(state.credits,980);
 assert.equal(finishRound('Sumpguard','test loss'),true);assert.equal(state.credits,2880);
 startBuy();assert.equal(state.credits,2880);assert.equal(state.weapon.id,1);
 beginRound(2);assert.equal(state.weapon.id,1);assert.equal(state.credits,2880);
 finishRound('Rookline','test win');assert.equal(state.credits,5680);
 startBuy();assert.equal(state.credits,5680);assert.equal(state.weapon.id,1);
 assert.equal(buy(4),true);assert.equal(state.credits,3580);assert.equal(state.weapon.kind,'Sniper');
});

test('?shot=3 CT armory preview maps side and shows paid AR, vest, and helmet; T maps to Vandal',()=>{
 const saved=structuredClone(state);
 state.startSide=previewStartSide('CT',9);seedArmoryPreview();assert.equal(state.phase,'buy');assert.equal(state.startSide,'Rookline');assert.equal(state.player.team,'Sumpguard');assert.equal(roleForRound(state.player.team,state.round),'ATTACKING');assert.equal(state.weapon.kind,'Pistol');assert.equal(state.credits,2450);
 assert.equal(buy(2),true);assert.equal(state.weapon.id,2);assert.equal(state.weapon.name,rifleVariants.Sumpguard.name);assert.equal(state.credits,1030,'CT AR costs 1,420 credits');assert.equal(buyVest(),true);assert.equal(state.vest,100);assert.equal(state.credits,380,'vest costs 650 credits');assert.equal(buyHelmet(),true);assert.equal(state.helmet,100);assert.equal(state.credits,30,'helmet costs 350 credits');
 state.startSide=previewStartSide('T',9);seedArmoryPreview();assert.equal(state.startSide,'Sumpguard');assert.equal(state.player.team,'Rookline');assert.equal(state.weapon.kind,'Pistol');assert.equal(state.credits,2450);assert.equal(buy(2),true);assert.equal(state.weapon.name,rifleVariants.Rookline.name);assert.equal(state.credits,1030);
 assert.equal(categories.length,5);Object.assign(state,saved);
});

test('shot preview side mapping selects the displayed faction during halftime without issuing an AR',()=>{
 assert.equal(previewStartSide('T',9),'Sumpguard');assert.equal(previewStartSide('CT',9),'Rookline');assert.equal(previewStartSide('T',1),'Rookline');assert.equal(previewStartSide('CT',1),'Sumpguard');
 chooseStartingSide(previewStartSide('CT',9));seedArmoryPreview();assert.equal(state.player.team,'Sumpguard');assert.equal(state.weapon.kind,'Pistol');assert.equal(state.credits,2450);assert.equal(buy(2),true);assert.equal(state.weapon.name,rifleVariants.Sumpguard.name);assert.equal(state.credits,1030);chooseStartingSide('Rookline');state.credits=1800;state.weapon=freshWeapon(0,'Rookline');beginRound(1);
});

test('new bots carry an identity-matched faction weapon profile for their actual category',()=>{
 for(const team of ['Rookline','Sumpguard'])for(let i=0;i<10;i++){const bot=newBot(i,team),expected=weaponProfile(bot.kind,team);assert.equal(bot.weapon.name,expected.name);assert.equal(bot.rifleName,expected.name);assert.equal(bot.weapon.kind,bot.kind);assert.equal(bot.weapon.faction,team);if(bot.kind==='AR')assert.equal(bot.weapon.name,rifleVariants[team].name);}
});

test('bot repeat-fire interval is deterministic, bounded, and visibly follows category profiles',()=>{
 const bot=(kind,id)=>({id,kind,team:'Rookline',weapon:weaponProfile(kind,'Rookline')}),id=12;
 const smg=botFireInterval(bot('SMG',id)),ar=botFireInterval(bot('AR',id)),pistol=botFireInterval(bot('Pistol',id)),sniper=botFireInterval(bot('Sniper',id));
 assert.ok(smg<ar&&ar<pistol&&sniper>pistol);assert.equal(botFireInterval(bot('AR',id)),ar,'same profile and ID remain deterministic');
 const values=[];for(let i=0;i<50;i++)for(const kind of categories){const interval=botFireInterval(bot(kind,i));assert.ok(interval>=.55&&interval<=1.6);values.push(interval);}
 const average=values.reduce((sum,value)=>sum+value,0)/values.length;assert.ok(average>=.8&&average<=1.2,`average repeat interval ${average} stays near previous cadence`);
});

test('buy window and round result clear all objective and player flash transients',()=>{
 beginRound(1);state.planting=1.2;state.plantSite='B';state.defusing=2;state.botObjective={id:55,progress:1.7};state.playerFlash=.3;assert.equal(finishRound('Sumpguard','cleanup fixture'),true);assert.equal(state.planting,0);assert.equal(state.plantSite,null);assert.equal(state.defusing,0);assert.deepEqual(state.botObjective,{id:null,progress:0});assert.equal(state.playerFlash,0);
 beginRound(2);state.roundWinner='Rookline';state.planting=1;state.plantSite='A';state.defusing=3;state.botObjective={id:7,progress:2};state.playerFlash=.2;startBuy();assert.equal(state.roundWinner,null,'buy-window entry clears the prior result');assert.equal(state.planting,0);assert.equal(state.plantSite,null);assert.equal(state.defusing,0);assert.deepEqual(state.botObjective,{id:null,progress:0});assert.equal(state.playerFlash,0);beginRound(1);
});

test('LOS is blocked by solid map cover but open lane remains visible',()=>{
 const walls=[{x:-19,z:0,w:2,d:13}];
 assert.equal(lineClear(-25,0,-12,0,walls),false);
 assert.equal(lineClear(-15,-17,15,-17,walls),true);
 assert.equal(lineClear(-15,-17,15,-17,[{x:0,z:-17,w:2,d:2,floor:LOWER}],UPPER,UPPER),true);assert.equal(lineClear(-15,-17,15,-17,[{x:0,z:-17,w:2,d:2,floor:LOWER}],LOWER,LOWER),false);assert.equal(lineClear(-15,-17,15,-17,[],UPPER,LOWER),false);
 assert.equal(pointBlocked(-19,0,walls),true);
 assert.equal(pointBlocked(-15,0,walls),false);
 const tank=[{x:0,y:2,z:0,r:1.2,h:4}];
 assert.equal(lineClear(-3,0,3,0,tank),false);
 assert.equal(pointBlocked(1.2,0,tank,.38),true);
 assert.equal(pointBlocked(1.6,0,tank,.38),false);
 assert.equal(pointBlocked(0,0,[{x:0,y:4,z:0,r:2,h:1}]),false);
 const detour=steerStep(-2.5,0,1,0,walls,.38);
 assert.notDeepEqual(detour,[-2.5,0]);assert.equal(pointBlocked(...detour,walls,.38),false);
 let x=-3,z=0,steps=0;while(x<2&&steps++<500){const d=Math.hypot(3-x,-z);[x,z]=steerStep(x,z,(3-x)/d*.04,-z/d*.04,walls,.38,7);assert.equal(pointBlocked(x,z,walls,.38),false);}
 assert.ok(x>1.9,'deterministic steering should route around, not stall at, cover');
});
test('utility projectile collision respects box and cylinder height, blocks cover, and leaves open paths clear',()=>{
 const cover=[{x:0,y:1.5,z:0,w:2,d:2,h:3},{x:5,y:2,z:0,r:1,h:4}];
 assert.equal(projectileBlocked(0,1.5,0,cover),true,'box cover blocks at body height');
 assert.equal(projectileBlocked(5,2,0,cover),true,'cylindrical tank blocks at body height');
 assert.equal(projectileBlocked(0,4,0,cover),false,'high trajectory clears low box cover');
 assert.equal(projectileBlocked(-4,1.5,0,cover),false,'clear throw path remains open');
 assert.equal(projectileBlocked(0,1.5,0,[{x:0,y:1.5,z:0,w:2,d:2,h:3,floor:LOWER}],.2,UPPER),false);assert.equal(projectileBlocked(0,1.5,0,[{x:0,y:1.5,z:0,w:2,d:2,h:3,floor:LOWER}],.2,LOWER),true);
});
test('utility projectile advances deterministically along a clear path and bounces off cylindrical cover',()=>{
 const clearA={x:-4,y:2,z:0,vx:6,vy:0,vz:0},clearB={...clearA};
 stepProjectile(clearA,1/30,[],1/60);stepProjectile(clearB,1/60,[],1/60);stepProjectile(clearB,1/60,[],1/60);
 assert.ok(clearA.x>clearB.x-.00001&&clearA.x<clearB.x+.00001);assert.ok(clearA.y<2,'gravity advances on the fixed step');
 const g={x:-2,y:1.5,z:0,vx:10,vy:0,vz:0};for(let i=0;i<12;i++)stepProjectile(g,1/60,[{x:0,y:1.5,z:0,r:1,h:3}]);
 assert.ok(g.x<-.99,'projectile should bounce before passing through the cylindrical tank');
 const floor={x:0,y:.205,z:0,vx:2,vy:-1,vz:0};stepProjectile(floor,1/60,[]);assert.equal(floor.y,.2);assert.ok(floor.vy>0);assert.ok(floor.vx<2,'floor bounce retains the existing horizontal damping');
 const lowerFloor={x:0,y:-5.795,z:0,vx:0,vy:-1,vz:0,floor:LOWER};stepProjectile(lowerFloor,1/60,[]);assert.equal(lowerFloor.y,-5.8);assert.equal(lowerFloor.floor,LOWER);assert.ok(lowerFloor.vy>0,'lower-level surface applies the same bounce response');
 const rampProjectile={x:8,y:.4,z:2,vx:0,vy:0,vz:8,floor:UPPER};for(let i=0;i<30;i++)stepProjectile(rampProjectile,1/60,[]);assert.equal(rampProjectile.floor,LOWER,'projectile floor follows sampled connector position');
});

test('effect mesh height helper preserves floor-specific fire and smoke placement',()=>{
 assert.equal(effectVisualY(UPPER,'fire'),.07);assert.equal(effectVisualY(LOWER,'fire'),-5.93);assert.equal(effectVisualY(UPPER,'smoke'),1.45);assert.equal(effectVisualY(LOWER,'smoke'),-4.55);
 const main=readFileSync(new URL('../game/src/main.js',import.meta.url),'utf8');assert.match(main,/effectVisualY\(zone\.floor\?\?UPPER,kind\)/,'production zone rendering uses the shared floor-aware helper');
});

test('shared production player and bot movers traverse both connectors within the rail clearance',()=>{
 const rails=CONNECTOR_RAILS.map(({x,y,z,w,h,d,floor})=>({x,y,z,w,h,d,floor}));assert.equal(rails.length,CONNECTORS.length*2);assert.match(readFileSync(new URL('../game/src/world.js',import.meta.url),'utf8'),/CONNECTOR_RAILS\.forEach/,'world renders the shared tested rail specifications');assert.ok(connectorSegment(-6.5,6,1.52));assert.equal(connectorSegment(-6.47,6,1.52),null);
 for(const c of CONNECTORS)for(const direction of [1,-1]){
  const player={x:c.upper.x,z:direction>0?c.upper.z:c.lower.z,floor:direction>0?UPPER:LOWER,vx:0,vz:0};for(let i=0;i<80;i++)movePlayer(player,0,direction*.1,rails);assert.equal(player.floor,direction>0?LOWER:UPPER);assert.ok(Math.abs(player.z-(direction>0?c.lower.z:c.upper.z))<.02);assert.ok(!pointBlocked(player.x,player.z,rails,.38,29,player.floor));
  const bot={id:100+direction,x:c.upper.x,z:direction>0?c.upper.z:c.lower.z,floor:direction>0?UPPER:LOWER,y:direction>0?0:-6};for(let i=0;i<80;i++)moveBot(bot,0,direction*.1,rails);assert.equal(bot.floor,direction>0?LOWER:UPPER);assert.ok(Math.abs(bot.z-(direction>0?c.lower.z:c.upper.z))<.02);assert.ok(!pointBlocked(bot.x,bot.z,rails,.38,29,bot.floor));
 }
});
test('adaptive projectile steps cannot tunnel through thin high-speed box or cylinder cover',()=>{
 const box={x:-3,y:2,z:0,vx:360,vy:0,vz:0},cylinder={...box};
 stepProjectile(box,1/60,[{x:0,y:2,z:0,w:.02,d:2,h:4}]);
 stepProjectile(cylinder,1/60,[{x:0,y:2,z:0,r:.01,h:4}]);
 assert.ok(box.x<0&&box.vx<0,'thin box should stop and reflect the fast throw');
 assert.ok(cylinder.x<0&&cylinder.vx<0,'thin cylinder should stop and reflect the fast throw');
});
test('descending projectile preserves floor bounce on same-step wall/floor contact',()=>{
 const g={x:-.26,y:.205,z:0,vx:2,vy:-1.5,vz:0};
 stepProjectile(g,1/60,[{x:0,y:1,z:0,w:.1,d:2,h:2}]);
 assert.equal(g.y,.2);assert.ok(g.vy>0,'floor response should still bounce upward');assert.ok(g.vx<0,'wall response should still reflect horizontal motion');
});
test('descending projectile keeps downward velocity after wall-only contact',()=>{
 const g={x:-.26,y:1.5,z:0,vx:2,vy:-3,vz:0};
 stepProjectile(g,1/60,[{x:0,y:1,z:0,w:.1,d:2,h:2}]);
 assert.ok(g.x<0&&g.vx<0,'wall impact should reflect horizontal movement');assert.ok(g.y<1.5&&g.vy<0,'wall-only impact must retain falling motion');
});
test('tactical and armor HUD controls describe live actions and expose individual durability values',()=>{
 const ui=readFileSync(new URL('../game/src/ui.js',import.meta.url),'utf8');
 assert.match(ui,/PLANT AT A \/ B/);assert.match(ui,/DEFEND · HOLD A \/ B/);assert.match(ui,/map-floor/);
 for(const [name,id,fill,value] of [['Vest','vest-bar','vest-fill','vest'],['Helmet','helmet-bar','helmet-fill','helmet']]){assert.match(ui,new RegExp(`id="${id}" role="progressbar" aria-label="${name} durability"`));assert.match(ui,new RegExp(`\\$\\('${id}'\\)\\.setAttribute\\('aria-valuenow'`));assert.match(ui,new RegExp(`id="${fill}"`));assert.match(ui,new RegExp(`\\$\\('${fill}'\\)\\.style\\.width=.{0,12}${value}`));}
 assert.match(ui,/classList\.toggle\('hit',!!state\.hitConfirmation\)/);assert.match(ui,/setProperty\('\-\-reticle-rise'/);
});
test('vest and helmet purchases have exact costs, require buy phase, and reset only for next buy window',()=>{
 state.phase='buy';state.credits=1000;state.vest=0;state.helmet=0;
 assert.equal(buyVest(),true);assert.equal(state.credits,350);assert.equal(state.vest,100);
 assert.equal(buyHelmet(),true);assert.equal(state.credits,0);assert.equal(state.helmet,100);assert.equal(buyVest(),false);assert.equal(buyHelmet(),false);assert.equal(state.credits,0);
 state.phase='live';assert.equal(buyVest(),false);assert.equal(buyHelmet(),false);
 beginRound(1);assert.equal(state.vest,100);assert.equal(state.helmet,100);
 startBuy();assert.equal(state.vest,0);assert.equal(state.helmet,0);
});

test('utility stock starts empty; exact prices, buy restrictions, two slots, one each, and buy-window reset',()=>{
 startBuy();state.credits=2000;assert.deepEqual(state.utilities,{frag:0,molotov:0,smoke:0,flash:0});
 for(const [type,cost] of Object.entries({frag:350,molotov:450,smoke:300,flash:250})){state.utilities={frag:0,molotov:0,smoke:0,flash:0};state.credits=1000;assert.equal(utilityCatalog[type].cost,cost);assert.equal(buyUtility(type),true);assert.equal(state.credits,1000-cost);assert.equal(state.utilities[type],1);assert.equal(buyUtility(type),false);}
 state.utilities={frag:0,molotov:0,smoke:0,flash:0};state.credits=1000;assert.equal(buyUtility('frag'),true);assert.equal(buyUtility('smoke'),true);assert.equal(buyUtility('flash'),false);assert.equal(Object.values(state.utilities).reduce((a,b)=>a+b,0),2);
 state.phase='live';assert.equal(buyUtility('molotov'),false);assert.equal(state.credits,350);
 beginRound(1);assert.equal(state.utilities.frag,1);assert.equal(state.utilities.smoke,1);startBuy();assert.deepEqual(state.utilities,{frag:0,molotov:0,smoke:0,flash:0});
});

test('utility launch consumes only in live play with stock and no active projectile',()=>{
 startBuy();state.credits=1000;buyUtility('frag');const projectile={x:0,y:1,z:0,vx:0,vy:0,vz:0,timer:1};
 assert.equal(launchUtility('frag',projectile),false);assert.equal(state.utilities.frag,1);beginRound(1);
 assert.equal(launchUtility('frag',projectile),true);assert.equal(state.utilities.frag,0);assert.equal(launchUtility('smoke',projectile),false);state.utilities.smoke=1;
 state.grenade=null;assert.equal(launchUtility('smoke',projectile),true);assert.equal(state.utilities.smoke,0);
});

test('frag projectile preserves hostile-only radius damage and kill reward',()=>{
 beginRound(1);const foe=state.bots.find(b=>b.team==='Sumpguard'),ally=state.bots.find(b=>b.team==='Rookline');foe.x=0;foe.z=0;foe.hp=50;ally.x=0;ally.z=0;state.grenade={type:'frag',x:0,y:.2,z:0,vx:0,vy:0,vz:0,timer:.01};const credits=state.credits;
 liveStep(.02,{move(){},moveBot(){},visible:()=>true});assert.equal(foe.alive,false);assert.equal(ally.alive,true);assert.equal(state.credits,credits+300);assert.match(state.feed[0],/GRENADE/);
});

test('molotov makes a five-second deterministic fire zone that damages and credits hostile bots',()=>{
 beginRound(1);for(const bot of state.bots)bot.fire=10;const foe=state.bots.find(b=>b.team==='Sumpguard');foe.x=0;foe.z=0;foe.hp=20;state.grenade={type:'molotov',x:0,y:.2,z:0,vx:0,vy:0,vz:0,timer:.01};const credits=state.credits,ctx={move(){},moveBot(){},visible:()=>true};liveStep(.02,ctx);assert.equal(state.fireZones[0].timer<5,true);
 liveStep(.5,ctx);liveStep(.5,ctx);assert.equal(foe.alive,false);assert.equal(state.credits,credits+300);assert.match(state.feed[0],/MOLOTOV/);assert.ok(state.fireZones[0].timer>3.9);
});

test('smoke cloud blocks line of sight across its 4.5-unit radius',()=>{
 beginRound(1);state.grenade={type:'smoke',x:0,y:.2,z:0,vx:0,vy:0,vz:0,timer:.01};const ctx={move(){},moveBot(){},visible:()=>true};liveStep(.02,ctx);
 assert.equal(state.smokeZones[0].timer<8,true);assert.equal(visibleWithSmoke(-4,0,4,0,()=>true),false);assert.equal(visibleWithSmoke(-4,6,4,6,()=>true),true);assert.equal(visibleWithSmoke(-4,0,4,0,()=>false),false);state.smokeZones=[{x:0,z:0,radius:2,floor:LOWER}];assert.equal(visibleWithSmoke(-4,0,4,0,()=>true,UPPER,UPPER),true);assert.equal(visibleWithSmoke(-4,0,4,0,()=>true,LOWER,LOWER),false);assert.equal(visibleWithSmoke(-4,0,4,0,()=>true,UPPER,LOWER),false);state.smokeZones=[];
});

test('flash projectile blinds visible hostiles and triggers brief player overlay only in range',()=>{
 beginRound(1);for(const bot of state.bots)bot.fire=10;const foe=state.bots.find(b=>b.team==='Sumpguard');foe.x=4;foe.z=0;state.player.x=-24;state.player.z=0;state.grenade={type:'flash',x:0,y:.2,z:0,vx:0,vy:0,vz:0,timer:.01};const ctx={move(){},moveBot(){},visible:()=>true};liveStep(.02,ctx);assert.ok(foe.blind>3.4);assert.equal(state.playerFlash,0);
 state.player.x=1;state.player.z=0;state.grenade={type:'flash',x:0,y:.2,z:0,vx:0,vy:0,vz:0,timer:.01};liveStep(.02,ctx);assert.ok(state.playerFlash>0);assert.ok(state.playerFlash<=.35);
});

test('vest consumes durability while reducing body hits by half',()=>{
 state.health=100;state.vest=20;state.helmet=0;
 assert.equal(receiveBotHit(10,{head:false,kind:'Pistol'}),5);assert.equal(state.vest,15);assert.equal(state.health,95);assert.equal(state.incomingFeedback,'VEST −5  HP −5');assert.ok(state.incomingHit>0);
});

test('helmet halves Pistol, SMG, and LMG headshots but AR and Sniper remain lethal',()=>{
 for(const kind of ['Pistol','SMG','LMG']){state.health=100;state.helmet=100;receiveBotHit(80,{head:true,kind});assert.equal(state.health,60,`${kind} health`);assert.equal(state.helmet,60,`${kind} durability`);}
 state.health=100;state.helmet=100;receiveBotHit(arsenal.find(w=>w.kind==='AR').head,{head:true,kind:'AR',team:'Rookline'});assert.equal(state.health,0);assert.equal(state.helmet,100);
 state.health=100;state.helmet=100;receiveBotHit(arsenal.find(w=>w.kind==='Sniper').head,{head:true,kind:'Sniper'});assert.equal(state.health,-78);assert.equal(state.helmet,100);
});

test('bot fire deterministically applies an AR headshot through helmet protection',()=>{
 beginRound(1);state.player.x=0;state.player.z=0;state.health=100;state.helmet=100;state.vest=0;keys.clear();
 const shooter=state.bots.find(b=>b.team==='Sumpguard');shooter.kind='AR';shooter.weapon=weaponProfile('AR','Sumpguard');shooter.role='Runner';shooter.x=0;shooter.z=5;shooter.fire=0;
 const threshold=Math.floor((.42-5*.008)*10);for(let n=0;n<20;n++)if((shooter.id*7+(n+1)*3+state.round)%10<threshold&&(shooter.id*7+(n+1)*3+state.round)%20===0){shooter.shots=n;break;}
 const ctx={move(){},moveBot(){},visible:(ax,az,bx,bz)=>ax===shooter.x&&az===shooter.z&&bx===state.player.x&&bz===state.player.z};
 liveStep(1/60,ctx);assert.equal(shooter.shots>0,true);assert.equal(state.health,10);assert.equal(state.helmet,0);assert.equal(state.phase,'live');assert.equal(shooter.fire,botFireInterval(shooter),'repeat cadence uses the attached profile');
});

test('bot non-AR head damage uses its attached faction profile head value',()=>{
 const source={id:13,team:'Rookline',kind:'Pistol',role:'Runner',weapon:{...weaponProfile('Pistol','Rookline'),head:57}},target={team:'Sumpguard',hp:100,helmet:100,alive:true};
 assert.equal(applyBotFire(target,source,true),57);assert.equal(target.hp,43);assert.equal(target.helmet,100);
});
test('bots select only visible opponents, preferring the nearest among visible targets',()=>{
 const player={x:0,z:0,team:'Rookline',health:100},guard={...newBot(0),team:'Sumpguard',x:4,z:0},rook={...newBot(6),team:'Rookline',x:10,z:0};
 const distant={...newBot(1),team:'Sumpguard',x:18,z:0},friendly={...newBot(2),team:'Rookline',x:1,z:0};
 assert.equal(chooseTarget(guard,[guard,rook,distant],player),player);
 assert.equal(chooseTarget(rook,[guard,rook,distant],player),guard);
 assert.equal(chooseTarget(rook,[guard,rook,distant],player,(_x,_z,x)=>x>10),distant);
 assert.equal(chooseTarget(rook,[guard,rook,friendly],player),guard);
 distant.floor=LOWER;assert.equal(chooseTarget(rook,[guard,distant],player),guard,'bots must not acquire targets through another floor');
});

test('opposing bots begin with deterministic staggered fire delays and cannot volley on the first frame',()=>{
 chooseStartingSide('Rookline');beginRound(1);const delays=state.bots.map(bot=>bot.fire);assert.ok(delays.every(delay=>delay>=.6&&delay<=1.1));assert.equal(new Set(delays).size,state.bots.length,'each round bot has a distinct stagger');
 for(const bot of state.bots)if(bot.team!==state.player.team){bot.x=state.player.x+4;bot.z=state.player.z;}
 const ctx={move(){},moveBot(){},visible:()=>true};liveStep(1/60,ctx);assert.equal(state.health,100,'no visible hostile can fire during the first simulation frame');assert.ok(state.bots.every(bot=>bot.fire>0),'all staggered timers remain positive after the first frame');chooseStartingSide('Rookline');beginRound(1);
});
test('grenades damage only hostile targets in radius with clear line of sight and falloff',()=>{
 const g={x:0,z:0},clear=()=>true,blocked=()=>false;
 assert.equal(grenadeDamage({...newBot(0),team:'Sumpguard',x:1,z:0},g,clear),64);
 assert.equal(grenadeDamage({...newBot(0),team:'Rookline',x:1,z:0},g,clear),0);
 assert.equal(grenadeDamage({...newBot(0),team:'Sumpguard',x:1,z:0},g,blocked),0);
 assert.equal(grenadeDamage({...newBot(0),team:'Sumpguard',x:8,z:0},g,clear),0);
});
test('weapon hit confirmation reports actual applied damage and refuses friendly or dead targets',()=>{
 beginRound(1);const foe=state.bots.find(b=>b.team==='Sumpguard'),ally=state.bots.find(b=>b.team==='Rookline');state.weapon=freshWeapon(0);foe.hp=12;
 assert.equal(hitBot(ally,false),0);assert.equal(state.hitConfirmation,null);
 assert.equal(hitBot(foe,false),12);assert.equal(state.hitConfirmation.damage,12);assert.equal(state.hitConfirmation.head,false);assert.equal(hitBot(foe,false),0);
});
test('round result clears transient hit and incoming-damage feedback immediately',()=>{
 beginRound(1);const foe=state.bots.find(b=>b.team==='Sumpguard');state.weapon=freshWeapon(0);foe.hp=12;
 assert.equal(hitBot(foe,true),12);receiveBotHit(8,{head:false,kind:'Pistol'});
 assert.ok(state.hitConfirmation);assert.ok(state.incomingHit>0);assert.notEqual(state.incomingFeedback,'');
 assert.equal(finishRound('Rookline','last target eliminated'),true);
 assert.equal(state.hitConfirmation,null);assert.equal(state.incomingHit,0);assert.equal(state.incomingFeedback,'');
});

test('starting-side choice preserves the pistol, credits, purchase flow, and halftime faction swap',()=>{
 state.credits=1800;state.weapon=freshWeapon(0,'Rookline');chooseStartingSide('Sumpguard');assert.equal(state.credits,1800);assert.equal(state.weapon.id,0);assert.equal(state.weapon.kind,'Pistol');beginRound(1);assert.equal(state.player.team,'Sumpguard');assert.equal(state.weapon.id,0);assert.equal(state.credits,1800);
 startBuy();assert.equal(state.credits,1800);assert.equal(buy(2),true);assert.equal(state.credits,380);assert.equal(state.weapon.name,rifleVariants.Sumpguard.name);beginRound(6);assert.equal(state.player.team,'Rookline');assert.equal(state.weapon.name,rifleVariants.Rookline.name);assert.equal(state.credits,380);chooseStartingSide('Rookline');state.credits=1800;state.weapon=freshWeapon(0,'Rookline');beginRound(1);
});

test('both site routes are reachable from both faction spawns and balanced within 15 percent',()=>{
 for(const [spawn,start] of [['T','tw'],['CT','ce']])for(const site of ['a','b']){const route=shortestRoute(start,site);assert.ok(Number.isFinite(route.distance)&&route.nodes.length>1,`${spawn} reaches ${site}`);}
 for(const site of ['a','b']){const t=shortestRoute('tw',site).distance,ct=shortestRoute('ce',site).distance;assert.ok(Math.max(t,ct)/Math.min(t,ct)<=1.15,`${site}: T=${t}, CT=${ct}`);}
 const fromT_A=shortestRoute('tw','a').distance,fromT_B=shortestRoute('tw','b').distance,fromCT_A=shortestRoute('ce','a').distance,fromCT_B=shortestRoute('ce','b').distance;
 assert.ok(Math.max(fromT_A,fromT_B)/Math.min(fromT_A,fromT_B)<=1.15);assert.ok(Math.max(fromCT_A,fromCT_B)/Math.min(fromCT_A,fromCT_B)<=1.15);
 assert.equal(CONNECTORS.length,2);assert.equal(shortestRoute('a','b').nodes.length>1,true);
});

test('stair connectors are traversable and switch floor continuously between endpoints',()=>{
 for(const c of CONNECTORS){const mid=connectorSegment(c.upper.x,(c.upper.z+c.lower.z)/2);assert.ok(mid);assert.equal(mid.floor,LOWER);assert.equal(connectorSegment(c.upper.x,c.upper.z).floor,UPPER);assert.equal(connectorSegment(c.lower.x,c.lower.z).floor,LOWER);assert.ok(mid.height<0&&mid.height>-6);}
});

test('T and CT AR player hits resolve exact helmeted and unhelmeted headshot outcomes',()=>{
 chooseStartingSide('Rookline');beginRound(1);state.weapon=freshWeapon(2,'Rookline');let target=state.bots.find(b=>b.team==='Sumpguard');target.hp=100;target.helmet=100;assert.equal(hitBot(target,true),100);assert.equal(target.alive,false);assert.equal(target.helmet,100);
 beginRound(1);state.weapon=freshWeapon(2,'Rookline');target=state.bots.find(b=>b.team==='Sumpguard');target.helmet=0;assert.equal(hitBot(target,true),100);assert.equal(target.alive,false);
 chooseStartingSide('Sumpguard');beginRound(1);state.weapon=freshWeapon(2,'Sumpguard');target=state.bots.find(b=>b.team==='Rookline');target.hp=100;target.helmet=100;assert.equal(hitBot(target,true),90);assert.equal(target.hp,10);assert.equal(target.alive,true);assert.equal(target.helmet,0);
 beginRound(1);state.weapon=freshWeapon(2,'Sumpguard');target=state.bots.find(b=>b.team==='Rookline');target.helmet=0;assert.equal(hitBot(target,true),100);assert.equal(target.alive,false);chooseStartingSide('Rookline');
});

test('T and CT bot AR headshots apply exact helmet outcomes to players and bots',()=>{
 const shooter=(team)=>({team,kind:'AR',role:'Runner'});
 chooseStartingSide('Rookline');beginRound(1);state.health=100;state.helmet=100;assert.equal(applyBotFire(state.player,shooter('Rookline'),true),100);assert.equal(state.health,0);assert.equal(state.helmet,100);
 beginRound(1);state.health=100;state.helmet=0;assert.equal(applyBotFire(state.player,shooter('Rookline'),true),100);assert.equal(state.health,0);
 beginRound(1);state.health=100;state.helmet=100;assert.equal(applyBotFire(state.player,shooter('Sumpguard'),true),90);assert.equal(state.health,10);assert.equal(state.helmet,0);
 beginRound(1);state.health=100;state.helmet=0;assert.equal(applyBotFire(state.player,shooter('Sumpguard'),true),100);assert.equal(state.health,0);
 const t=newBot(0,'Sumpguard');t.hp=100;t.helmet=100;assert.equal(applyBotFire(t,shooter('Rookline'),true),100);assert.equal(t.hp,0);assert.equal(t.helmet,100);const tBare=newBot(3,'Sumpguard');tBare.hp=100;tBare.helmet=0;assert.equal(applyBotFire(tBare,shooter('Rookline'),true),100);assert.equal(tBare.hp,0);
 const ct=newBot(1,'Rookline');ct.hp=100;ct.helmet=100;assert.equal(applyBotFire(ct,shooter('Sumpguard'),true),90);assert.equal(ct.hp,10);assert.equal(ct.helmet,0);assert.equal(ct.alive,true);
 const noHelmet=newBot(2,'Rookline');noHelmet.hp=100;noHelmet.helmet=0;assert.equal(applyBotFire(noHelmet,shooter('Sumpguard'),true),100);assert.equal(noHelmet.hp,0);
 chooseStartingSide('Rookline');beginRound(1);
});

test('T and CT AR body damage is balanced at 32 HP for player and AI fire',()=>{
 for(const team of ['Rookline','Sumpguard']){const target=newBot(4,team==='Rookline'?'Sumpguard':'Rookline');target.hp=100;target.helmet=100;state.player.team=team;state.weapon=freshWeapon(2,team);assert.equal(hitBot(target,false),32);assert.equal(target.hp,68);assert.equal(target.helmet,100);
  const victim=newBot(5,team==='Rookline'?'Sumpguard':'Rookline');victim.hp=100;victim.helmet=100;assert.equal(applyBotFire(victim,{team,kind:'AR',role:'Runner'},false),32);assert.equal(victim.hp,68);assert.equal(victim.helmet,100);assert.equal(victim.faction,team==='Rookline'?'Sumpguard':'Rookline');assert.equal(victim.rifleName,weaponProfile(victim.kind,victim.team).name);
 }
 state.player.health=100;state.health=100;state.helmet=0;assert.equal(applyBotFire(state.player,{team:'Rookline',kind:'AR',role:'Runner'},false),32);assert.equal(state.health,68);chooseStartingSide('Rookline');beginRound(1);
});

test('player can plant and defenders can defuse at both sites only on that site’s floor',()=>{
 const ctx={move(){},moveBot(){},visible:()=>false};for(const site of [SITES.A,SITES.B]){chooseStartingSide('Rookline');beginRound(1);for(const b of state.bots)b.alive=false;state.player.x=site.x;state.player.z=site.z;state.player.floor=site.floor;assert.equal(siteAt(state.player.x,state.player.z,state.player.floor),site);assert.equal(canPlant(),true);assert.equal(requestPlant(),true);keys.add('KeyE');liveStep(2.5,ctx);keys.delete('KeyE');assert.equal(state.core.siteId,site.id);assert.equal(state.core.floor,site.floor);
  chooseStartingSide('Sumpguard');beginRound(6);for(const b of state.bots)b.alive=false;state.player.x=site.x;state.player.z=site.z;state.player.floor=site.floor;state.core={planted:true,...site,timer:20};assert.equal(canDefuse(),true);assert.equal(requestDefuse(),true);keys.add('KeyE');liveStep(4,ctx);keys.delete('KeyE');assert.equal(state.roundWinner,'Rookline');
 }
 chooseStartingSide('Rookline');beginRound(1);
});

test('round six swaps the player between attack and defense roles and attacker faction; teams stay balanced',()=>{
 beginRound(5);assert.equal(state.player.team,'Rookline');assert.equal(attackerTeamForRound(5),'Rookline');
 beginRound(6);assert.equal(state.player.team,'Sumpguard');assert.equal(attackerTeamForRound(6),'Sumpguard');
 assert.equal(state.bots.filter(b=>b.team===state.player.team).length,4);
 assert.equal(state.bots.filter(b=>b.team!==state.player.team).length,5);
 chooseStartingSide('Sumpguard');state.weapon=freshWeapon(2,'Sumpguard');beginRound(1);assert.equal(state.player.team,'Sumpguard');assert.equal(state.weapon.faction,'Sumpguard');beginRound(6);assert.equal(state.player.team,'Rookline');assert.equal(state.weapon.faction,'Rookline');chooseStartingSide('Rookline');
});

test('round-five result expiry enters round-six buy with the swapped team and matching AR already set',()=>{
 const saved=structuredClone(state);try{for(const startingSide of ['Rookline','Sumpguard']){chooseStartingSide(startingSide);state.weapon=freshWeapon(2,startingSide);beginRound(5);assert.equal(state.player.team,startingSide);assert.equal(finishRound(state.player.team,'transition fixture'),true);state.clock=.01;liveStep(.02,{move(){},moveBot(){},visible:()=>false});const expected=startingSide==='Rookline'?'Sumpguard':'Rookline';assert.equal(state.round,6);assert.equal(state.phase,'buy');assert.equal(state.player.team,expected);assert.equal(state.weapon.faction,expected);assert.equal(state.weapon.name,rifleVariants[expected].name);}}finally{Object.assign(state,saved);}
});

test('plant and defuse are restricted by side, site radius, and current floor',()=>{
 chooseStartingSide('Rookline');beginRound(1);state.player.x=SITES.A.x;state.player.z=SITES.A.z;state.player.floor=UPPER;assert.equal(canPlant(),true);assert.equal(requestPlant(),true);
 state.player.x=20;assert.equal(canPlant(),false);state.player.x=SITES.B.x;state.player.z=SITES.B.z;state.player.floor=UPPER;assert.equal(canPlant(),false);
 chooseStartingSide('Sumpguard');beginRound(6);state.player.x=SITES.B.x;state.player.z=SITES.B.z;state.player.floor=LOWER;state.core={planted:true,...SITES.B,timer:8};assert.equal(canDefuse(),true);assert.equal(requestDefuse(),true);
 state.player.floor=UPPER;assert.equal(canDefuse(),false);chooseStartingSide('Rookline');beginRound(1);state.core={planted:true,...SITES.A,timer:8};state.player.x=SITES.A.x;state.player.z=SITES.A.z;state.player.floor=UPPER;assert.equal(canDefuse(),false);chooseStartingSide('Rookline');
});

test('plant/defuse progress completes only while E is held; defuse awards defender round',()=>{
 const ctx={move(){},moveBot(){},visible:()=>false};chooseStartingSide('Rookline');
 beginRound(1);state.player.x=SITES.A.x;state.player.z=SITES.A.z;state.player.floor=UPPER;requestPlant();keys.add('KeyE');liveStep(2.5,ctx);assert.equal(state.core?.planted,true);assert.equal(state.core.siteId,'A');keys.delete('KeyE');
 chooseStartingSide('Sumpguard');beginRound(6);state.player.x=SITES.A.x;state.player.z=SITES.A.z;state.player.floor=UPPER;state.core={planted:true,...SITES.A,timer:20};requestDefuse();keys.add('KeyE');liveStep(4,ctx);keys.delete('KeyE');assert.equal(state.roundWinner,'Rookline');chooseStartingSide('Rookline');
});

test('objective timer detonates for attackers; unplanted clock awards defenders',()=>{
 const ctx={move(){},moveBot(){},visible:()=>false};
 beginRound(1);state.core={planted:true,x:12,z:0,timer:.05};liveStep(.1,ctx);assert.equal(state.roundWinner,'Rookline');
 beginRound(1);state.clock=.05;liveStep(.1,ctx);assert.equal(state.roundWinner,'Sumpguard');
});

test('attacker AI reaches lower Site B through a connector and plants after uninterrupted interaction',()=>{
 chooseStartingSide('Sumpguard');beginRound(6);const railColliders=CONNECTOR_RAILS.map(({x,y,z,w,h,d,floor})=>({x,y,z,w,h,d,floor}));const ctx={move(){},moveBot(b,dx,dz){moveBot(b,dx,dz,railColliders);},visible:()=>false};const bot=state.bots.find(b=>b.team==='Sumpguard');bot.objectiveSite='B';
 let crossed=false;for(let i=0;i<900&&!state.core;i++){stepBotObjective(.1,ctx);if(bot.floor===LOWER)crossed=true;}
 assert.equal(crossed,true);assert.equal(state.core?.planted,true);assert.equal(state.core.siteId,'B');assert.equal(state.core.floor,LOWER);
 beginRound(6);const fighter=state.bots.find(b=>b.team==='Sumpguard');fighter.x=SITES.B.x;fighter.z=SITES.B.z;fighter.floor=LOWER;state.player.x=SITES.B.x+1;state.player.z=SITES.B.z;state.player.floor=LOWER;stepBotObjective(.1,{...ctx,visible:()=>true});assert.equal(state.core,null);assert.equal(state.botObjective.progress,0);chooseStartingSide('Rookline');
});

test('defender AI retakes lower Site B through a connector and defuses only without a visible fight',()=>{
 chooseStartingSide('Rookline');beginRound(1);state.core={planted:true,...SITES.B,siteId:'B',timer:26};const railColliders=CONNECTOR_RAILS.map(({x,y,z,w,h,d,floor})=>({x,y,z,w,h,d,floor}));const ctx={move(){},moveBot(b,dx,dz){moveBot(b,dx,dz,railColliders);},visible:()=>false};let crossed=false;
 for(let i=0;i<900&&state.roundWinner===null;i++){const before=state.bots.find(b=>b.team==='Sumpguard')?.floor;stepBotObjective(.1,ctx);if(before!==LOWER&&state.bots.some(b=>b.team==='Sumpguard'&&b.floor===LOWER))crossed=true;}
 assert.equal(crossed,true,'a retaker must physically traverse into LOWER');assert.equal(state.roundWinner,'Sumpguard','retaker must complete defuse after arrival');
 beginRound(1);state.core={planted:true,...SITES.B,siteId:'B',timer:26};const fighting=state.bots.find(b=>b.team==='Sumpguard');fighting.x=SITES.B.x;fighting.z=SITES.B.z+1;fighting.floor=LOWER;state.player.x=SITES.B.x+1;state.player.z=SITES.B.z;state.player.floor=LOWER;stepBotObjective(.1,{...ctx,visible:()=>true});assert.equal(state.roundWinner,null);assert.equal(state.botObjective.progress,0);
 chooseStartingSide('Rookline');beginRound(1);
});

test('eliminating the opposing bots yields the attacker-side round win',()=>{
 beginRound(1);for(const b of state.bots)if(b.team!=='Rookline')b.alive=false;liveStep(1/60,{move(){},moveBot(){},visible:()=>false});assert.equal(state.roundWinner,'Rookline');
});

test('confirmed-hit tracer data is deterministic, fades linearly, clamps, and expires',()=>{
 const helper=tracerState;
 const a={x:1,y:2,z:3},b={x:4,y:5,z:6};
 assert.deepEqual(helper(a,b,0),{start:a,end:b,opacity:1,alive:true});
 assert.equal(helper(a,b,.07,.14).opacity,.5);
 assert.equal(helper(a,b,.2,.14).opacity,0);
 assert.equal(helper(a,b,.2,.14).alive,false);
 assert.equal(helper(a,b,-1,.14).opacity,1);
});
