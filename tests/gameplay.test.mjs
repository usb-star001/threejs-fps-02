import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {state,receiveBotHit,buyVest,buyHelmet,buyUtility,launchUtility,utilityCatalog,visibleWithSmoke,grenadeDamage,newBot,chooseTarget,beginRound,startBuy,buy,finishRound,attackerTeamForRound,roleForRound,seedArmoryPreview,canPlant,canDefuse,requestPlant,requestDefuse,liveStep,keys,stepBotObjective} from '../game/src/simulation.js';
import {lineClear,pointBlocked,steerStep} from '../game/src/collision.js';
import {arsenal,categories,freshWeapon,spreadForShot,recoilAngle} from '../game/src/weapons.js';

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

test('?shot=3 armory seed is a buy state with object score, defending role, and all five categories',()=>{
 seedArmoryPreview();assert.equal(state.phase,'buy');assert.deepEqual(state.score,{Rookline:4,Sumpguard:3});assert.equal(Array.isArray(state.score),false);
 assert.equal(roleForRound(state.player.team,state.round),'DEFENDING');assert.equal(categories.length,5);
});

test('LOS is blocked by solid map cover but open lane remains visible',()=>{
 const walls=[{x:-19,z:0,w:2,d:13}];
 assert.equal(lineClear(-25,0,-12,0,walls),false);
 assert.equal(lineClear(-15,-17,15,-17,walls),true);
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
 beginRound(1);const foe=state.bots.find(b=>b.team==='Sumpguard');foe.x=0;foe.z=0;foe.hp=20;state.grenade={type:'molotov',x:0,y:.2,z:0,vx:0,vy:0,vz:0,timer:.01};const credits=state.credits,ctx={move(){},moveBot(){},visible:()=>true};liveStep(.02,ctx);assert.equal(state.fireZones[0].timer<5,true);
 liveStep(.5,ctx);liveStep(.5,ctx);assert.equal(foe.alive,false);assert.equal(state.credits,credits+300);assert.match(state.feed[0],/MOLOTOV/);assert.ok(state.fireZones[0].timer>3.9);
});

test('smoke cloud blocks line of sight across its 4.5-unit radius',()=>{
 beginRound(1);state.grenade={type:'smoke',x:0,y:.2,z:0,vx:0,vy:0,vz:0,timer:.01};const ctx={move(){},moveBot(){},visible:()=>true};liveStep(.02,ctx);
 assert.equal(state.smokeZones[0].timer<8,true);assert.equal(visibleWithSmoke(-4,0,4,0,()=>true),false);assert.equal(visibleWithSmoke(-4,6,4,6,()=>true),true);assert.equal(visibleWithSmoke(-4,0,4,0,()=>false),false);
});

test('flash projectile blinds visible hostiles and triggers brief player overlay only in range',()=>{
 beginRound(1);const foe=state.bots.find(b=>b.team==='Sumpguard');foe.x=4;foe.z=0;state.player.x=-24;state.player.z=0;state.grenade={type:'flash',x:0,y:.2,z:0,vx:0,vy:0,vz:0,timer:.01};const ctx={move(){},moveBot(){},visible:()=>true};liveStep(.02,ctx);assert.ok(foe.blind>3.4);assert.equal(state.playerFlash,0);
 state.player.x=1;state.player.z=0;state.grenade={type:'flash',x:0,y:.2,z:0,vx:0,vy:0,vz:0,timer:.01};liveStep(.02,ctx);assert.ok(state.playerFlash>0);assert.ok(state.playerFlash<=.35);
});

test('vest consumes durability while reducing body hits by half',()=>{
 state.health=100;state.vest=20;state.helmet=0;
 assert.equal(receiveBotHit(10,{head:false,kind:'Pistol'}),5);assert.equal(state.vest,15);assert.equal(state.health,95);
});

test('helmet halves Pistol, SMG, and LMG headshots but AR and Sniper remain lethal',()=>{
 for(const kind of ['Pistol','SMG','LMG']){state.health=100;state.helmet=100;receiveBotHit(80,{head:true,kind});assert.equal(state.health,60,`${kind} health`);assert.equal(state.helmet,60,`${kind} durability`);}
 state.health=100;state.helmet=100;receiveBotHit(arsenal.find(w=>w.kind==='AR').head,{head:true,kind:'AR'});assert.equal(state.health,0);assert.equal(state.helmet,100);
 state.health=100;state.helmet=100;receiveBotHit(arsenal.find(w=>w.kind==='Sniper').head,{head:true,kind:'Sniper'});assert.equal(state.health,-78);assert.equal(state.helmet,100);
});

test('bot fire deterministically applies an AR headshot through helmet protection',()=>{
 beginRound(1);state.player.x=0;state.player.z=0;state.health=100;state.helmet=100;state.vest=0;keys.clear();
 const shooter=state.bots.find(b=>b.team==='Sumpguard');shooter.kind='AR';shooter.role='Runner';shooter.x=0;shooter.z=5;shooter.fire=0;
 const threshold=Math.floor((.42-5*.008)*10);for(let n=0;n<20;n++)if((shooter.id*7+(n+1)*3+state.round)%10<threshold&&(shooter.id*7+(n+1)*3+state.round)%20===0){shooter.shots=n;break;}
 const ctx={move(){},moveBot(){},visible:(ax,az,bx,bz)=>ax===shooter.x&&az===shooter.z&&bx===state.player.x&&bz===state.player.z};
 liveStep(1/60,ctx);assert.equal(shooter.shots>0,true);assert.equal(state.health,0);assert.equal(state.helmet,100);assert.equal(state.phase,'result');
});
test('bots select only visible opponents, preferring the nearest among visible targets',()=>{
 const player={x:0,z:0,team:'Rookline',health:100},guard={...newBot(0),team:'Sumpguard',x:4,z:0},rook={...newBot(6),team:'Rookline',x:10,z:0};
 const distant={...newBot(1),team:'Sumpguard',x:18,z:0},friendly={...newBot(2),team:'Rookline',x:1,z:0};
 assert.equal(chooseTarget(guard,[guard,rook,distant],player),player);
 assert.equal(chooseTarget(rook,[guard,rook,distant],player),guard);
 assert.equal(chooseTarget(rook,[guard,rook,distant],player,(_x,_z,x)=>x>10),distant);
 assert.equal(chooseTarget(rook,[guard,rook,friendly],player),guard);
});
test('grenades damage only hostile targets in radius with clear line of sight and falloff',()=>{
 const g={x:0,z:0},clear=()=>true,blocked=()=>false;
 assert.equal(grenadeDamage({...newBot(0),team:'Sumpguard',x:1,z:0},g,clear),64);
 assert.equal(grenadeDamage({...newBot(0),team:'Rookline',x:1,z:0},g,clear),0);
 assert.equal(grenadeDamage({...newBot(0),team:'Sumpguard',x:1,z:0},g,blocked),0);
 assert.equal(grenadeDamage({...newBot(0),team:'Sumpguard',x:8,z:0},g,clear),0);
});

test('round six swaps the player between attack and defense roles and attacker faction; teams stay balanced',()=>{
 beginRound(5);assert.equal(state.player.team,'Rookline');assert.equal(attackerTeamForRound(5),'Rookline');
 beginRound(6);assert.equal(state.player.team,'Rookline');assert.equal(attackerTeamForRound(6),'Sumpguard');
 assert.equal(state.bots.filter(b=>b.team===state.player.team).length,4);
 assert.equal(state.bots.filter(b=>b.team!==state.player.team).length,5);
});

test('plant and defuse are restricted to the correct team and site proximity',()=>{
 beginRound(1);state.player.x=12;state.player.z=0;assert.equal(canPlant(),true);assert.equal(requestPlant(),true);
 state.player.x=0;assert.equal(canPlant(),false);
 beginRound(6);state.player.x=12;state.player.z=0;state.core={planted:true,x:12,z:0,timer:8};assert.equal(canDefuse(),true);assert.equal(requestDefuse(),true);
 beginRound(1);state.core={planted:true,x:12,z:0,timer:8};state.player.x=12;assert.equal(canDefuse(),false);
});

test('plant/defuse progress completes only while E is held; defuse awards defender round',()=>{
 const ctx={move(){},moveBot(){},visible:()=>false};
 beginRound(1);state.player.x=12;state.player.z=0;requestPlant();keys.add('KeyE');liveStep(2.5,ctx);assert.equal(state.core?.planted,true);keys.delete('KeyE');
 beginRound(6);state.player.x=12;state.player.z=0;state.core={planted:true,x:12,z:0,timer:20};requestDefuse();keys.add('KeyE');liveStep(4,ctx);keys.delete('KeyE');assert.equal(state.roundWinner,'Rookline');
});

test('objective timer detonates for attackers; unplanted clock awards defenders',()=>{
 const ctx={move(){},moveBot(){},visible:()=>false};
 beginRound(1);state.core={planted:true,x:12,z:0,timer:.05};liveStep(.1,ctx);assert.equal(state.roundWinner,'Rookline');
 beginRound(1);state.clock=.05;liveStep(.1,ctx);assert.equal(state.roundWinner,'Sumpguard');
});

test('attacker AI routes to site B and plants after uninterrupted interaction; visible fight interrupts it',()=>{
 const ctx={move(){},moveBot(b,dx,dz){const [x,z]=steerStep(b.x,b.z,dx,dz,[],.38,b.id);b.x=x;b.z=z;},visible:()=>false};
 beginRound(6);const bot=state.bots.find(b=>b.team==='Sumpguard');bot.x=12;bot.z=1;
 for(let i=0;i<25;i++)liveStep(.1,ctx);
 assert.equal(state.core?.planted,true);assert.equal(state.core.x,12);
 beginRound(6);const fighter=state.bots.find(b=>b.team==='Sumpguard');fighter.x=12;fighter.z=1;
 stepBotObjective(.1,{...ctx,visible:()=>true});assert.equal(state.core,null);assert.equal(state.botObjective.progress,0);
});

test('defender AI routes to an armed core and defuses only without a visible fight',()=>{
 const ctx={move(){},moveBot(b,dx,dz){const [x,z]=steerStep(b.x,b.z,dx,dz,[],.38,b.id);b.x=x;b.z=z;},visible:()=>false};
 beginRound(1);state.core={planted:true,x:12,z:0,timer:26};const defender=state.bots.find(b=>b.team==='Sumpguard');defender.x=12;defender.z=1;
 for(let i=0;i<40;i++)liveStep(.1,ctx);assert.equal(state.roundWinner,'Sumpguard');
 beginRound(1);state.core={planted:true,x:12,z:0,timer:26};const fighting=state.bots.find(b=>b.team==='Sumpguard');fighting.x=12;fighting.z=1;
 stepBotObjective(.1,{...ctx,visible:()=>true});assert.equal(state.roundWinner,null);assert.equal(state.botObjective.progress,0);
});

test('eliminating the opposing bots yields the attacker-side round win',()=>{
 beginRound(1);for(const b of state.bots)if(b.team!=='Rookline')b.alive=false;liveStep(1/60,{move(){},moveBot(){},visible:()=>false});assert.equal(state.roundWinner,'Rookline');
});
