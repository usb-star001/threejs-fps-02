import {arsenal,categories,freshWeapon} from './weapons.js';
import {stepProjectile} from './collision.js';

export const state={phase:'buy',round:1,clock:12,score:{Rookline:0,Sumpguard:0},credits:1800,kills:0,health:100,vest:0,helmet:0,vestBought:false,helmetBought:false,utilities:{frag:0,molotov:0,smoke:0,flash:0},recoil:0,player:{x:-24,z:0,vx:0,vz:0,yaw:0,pitch:0,crouch:false,team:'Rookline'},weapon:freshWeapon(0),bots:[],core:null,grenade:null,fireZones:[],smokeZones:[],playerFlash:0,incomingHit:0,incomingFeedback:'',hitConfirmation:null,feed:[],roundWinner:null,planting:0,defusing:0,botObjective:{id:null,progress:0}};
export const utilityCatalog={frag:{label:'FRAG',cost:350},molotov:{label:'INCENDIARY',cost:450},smoke:{label:'SMOKE',cost:300},flash:{label:'FLASHBANG',cost:250}};
export const keys=new Set();
export const SITE={x:12,z:0};
const routes=[[-9,-16],[3,-7],[14,-1],[3,8],[-12,12],[19,15],[23,-10],[-3,17]];
let serial=0,effectSerial=0;
export const attackerTeamForRound=round=>round<=5?'Rookline':'Sumpguard';
export const opposingTeam=team=>team==='Rookline'?'Sumpguard':'Rookline';
export const roleForRound=(team,round)=>team===attackerTeamForRound(round)?'ATTACKING':'DEFENDING';
export function newBot(i,team='Rookline'){const [x,z]=routes[i%routes.length];return{id:++serial,team,kind:categories[(i*3+state.round)%categories.length],role:i%5===0?'Anchor':i%3===0?'Flanker':'Runner',x:x+(i%2)*1.6,z:z+(i%3)*1.2,hp:100,alive:true,route:(i*3)%routes.length,fire:0,alert:0,crouch:i%3===0,shots:0};}
export function beginRound(round=state.round){state.round=round;state.phase='live';state.clock=60;state.health=100;state.recoil=0;state.planting=0;state.defusing=0;state.core=null;state.grenade=null;state.fireZones=[];state.smokeZones=[];state.playerFlash=0;state.incomingHit=0;state.incomingFeedback='';state.hitConfirmation=null;state.roundWinner=null;state.botObjective={id:null,progress:0};state.player.team='Rookline';state.player.x=state.player.team===attackerTeamForRound(round)?-24:24;state.player.z=0;state.player.vx=state.player.vz=0;state.bots=[];const ally=state.player.team,foe=ally==='Rookline'?'Sumpguard':'Rookline';for(let i=0;i<9;i++)state.bots.push(newBot(i,i<4?ally:foe));state.weapon=freshWeapon(state.weapon.id);}
export function startRound(demo=''){beginRound(state.round);if(demo==='plant'){state.core={planted:true,x:SITE.x,z:SITE.z,timer:26};state.player.x=-2;state.player.z=2;}}
export function startBuy(){state.phase='buy';state.clock=12;state.core=null;state.health=100;state.vest=0;state.helmet=0;state.incomingHit=0;state.incomingFeedback='';state.hitConfirmation=null;state.vestBought=false;state.helmetBought=false;state.utilities={frag:0,molotov:0,smoke:0,flash:0};state.fireZones=[];state.smokeZones=[];state.grenade=null;state.bots=[];state.weapon=freshWeapon(state.weapon.id);}
export function seedArmoryPreview(){state.credits=2450;state.score={Rookline:4,Sumpguard:3};state.round=9;startBuy();}
export function buy(id){if(state.phase!=='buy')return false;const w=arsenal[id];if(!w)return false;if(state.weapon.id===id)return true;if(state.credits<w.cost)return false;state.credits-=w.cost;state.weapon=freshWeapon(id);return true;}
export function buyVest(){if(state.phase!=='buy'||state.vestBought||state.credits<650)return false;state.credits-=650;state.vest=100;state.vestBought=true;return true;}
export function buyHelmet(){if(state.phase!=='buy'||state.helmetBought||state.credits<350)return false;state.credits-=350;state.helmet=100;state.helmetBought=true;return true;}
export function buyUtility(type){const item=utilityCatalog[type];if(state.phase!=='buy'||!item||state.utilities[type]||Object.values(state.utilities).reduce((a,b)=>a+b,0)>=2||state.credits<item.cost)return false;state.credits-=item.cost;state.utilities[type]=1;return true;}
export function launchUtility(type,projectile){if(state.phase!=='live'||!utilityCatalog[type]||!state.utilities[type]||state.grenade)return false;state.utilities[type]=0;state.grenade={...projectile,type};return true;}
export function finishRound(winner,reason){if(state.phase!=='live')return false;state.phase='result';state.hitConfirmation=null;state.incomingHit=0;state.incomingFeedback='';state.roundWinner=winner;state.score[winner]++;state.credits+=winner===state.player.team?2800:1900;state.feed.unshift(`${winner} — ${reason}`);state.feed.length=Math.min(4,state.feed.length);return true;}
export function receiveBotHit(damage,{head=false,kind='Pistol'}={}){let vestAbsorbed=0,helmetAbsorbed=0;if(head){if(['Pistol','SMG','LMG'].includes(kind)){helmetAbsorbed=Math.min(state.helmet,damage*.5);state.helmet-=helmetAbsorbed;}}else{vestAbsorbed=Math.min(state.vest,damage*.5);state.vest-=vestAbsorbed;}const healthDamage=damage-vestAbsorbed-helmetAbsorbed;state.health-=healthDamage;state.incomingHit=.32;state.incomingFeedback=`${vestAbsorbed?`VEST −${Math.round(vestAbsorbed)}  `:''}${helmetAbsorbed?`HELM −${Math.round(helmetAbsorbed)}  `:''}HP −${Math.round(healthDamage)}`;return healthDamage;}
export function grenadeDamage(bot,g,visible=()=>true){if(!bot.alive||bot.team===state.player.team)return 0;const d=Math.hypot(bot.x-g.x,bot.z-g.z);if(d>=7||!visible(g.x,g.z,bot.x,bot.z))return 0;return Math.round(75*(1-d/7));}
export function visibleWithSmoke(ax,az,bx,bz,baseVisible=()=>true){if(!baseVisible(ax,az,bx,bz))return false;for(const cloud of state.smokeZones){const dx=bx-ax,dz=bz-az,l2=dx*dx+dz*dz,t=l2?Math.max(0,Math.min(1,((cloud.x-ax)*dx+(cloud.z-az)*dz)/l2)):0;if(Math.hypot(ax+t*dx-cloud.x,az+t*dz-cloud.z)<cloud.radius)return false;}return true;}
export function shouldShowMinimapBot(bot,player,visible){if(!bot.alive)return false;if(bot.team===player.team)return true;return typeof visible==='function'&&visible(player.x,player.z,bot.x,bot.z);}
export function chooseTarget(bot,bots,player,visible=()=>true){const candidates=bots.filter(o=>o.alive&&o.team!==bot.team),playerAlive=player===state.player?state.health>0:player.health===undefined||player.health>0;if(player.team!==bot.team&&playerAlive)candidates.push(player);return candidates.filter(o=>visible(bot.x,bot.z,o.x,o.z)).sort((a,b)=>Math.hypot(a.x-bot.x,a.z-b.z)-Math.hypot(b.x-bot.x,b.z-b.z))[0]||null;}
export function canPlant(){return state.phase==='live'&&state.player.team===attackerTeamForRound(state.round)&&!state.core&&Math.hypot(state.player.x-SITE.x,state.player.z-SITE.z)<4;}
export function canDefuse(){return state.phase==='live'&&state.player.team!==attackerTeamForRound(state.round)&&!!state.core?.planted&&Math.hypot(state.player.x-state.core.x,state.player.z-state.core.z)<4;}
export function requestPlant(){if(!canPlant())return false;state.planting=2.5;return true;}
export function requestDefuse(){if(!canDefuse())return false;state.defusing=4;return true;}
function eliminateBot(bot,cause){if(!bot.alive)return false;bot.alive=false;state.kills++;state.credits+=300;state.feed.unshift(`YOU  ›  ${bot.role} / ${cause}`);state.feed.length=Math.min(4,state.feed.length);return true;}
export function hitBot(bot,head=false){if(!bot.alive||bot.team===state.player.team)return 0;const damage=Math.min(bot.hp,head?state.weapon.head:state.weapon.damage);bot.hp-=damage;if(bot.hp<=0)eliminateBot(bot,head?'HEAD':'BODY');state.hitConfirmation={head,damage,time:.48};return damage;}
function resolveElimination(){const livingTeams=new Set(state.bots.filter(b=>b.alive).map(b=>b.team));if(state.health>0)livingTeams.add(state.player.team);const attackers=attackerTeamForRound(state.round),defenders=attackers==='Rookline'?'Sumpguard':'Rookline';if(!livingTeams.has(attackers))finishRound(defenders,'attackers eliminated');else if(!livingTeams.has(defenders))finishRound(attackers,'defenders eliminated');}
function detonateProjectile(g,ctx){if(!g.type||g.type==='frag'){for(const b of state.bots){const d=grenadeDamage(b,g,ctx.visible);if(d){b.hp-=d;if(b.hp<=0)eliminateBot(b,'GRENADE');}}}else if(g.type==='molotov'){state.fireZones.push({id:++effectSerial,x:g.x,z:g.z,radius:3.2,timer:5,elapsed:0});}else if(g.type==='smoke'){state.smokeZones.push({id:++effectSerial,x:g.x,z:g.z,radius:4.5,timer:8});}else if(g.type==='flash'){for(const b of state.bots){if(b.alive&&b.team!==state.player.team&&Math.hypot(b.x-g.x,b.z-g.z)<=9&&ctx.visible(g.x,g.z,b.x,b.z))b.blind=3.5;}if(Math.hypot(state.player.x-g.x,state.player.z-g.z)<=9&&ctx.visible(g.x,g.z,state.player.x,state.player.z))state.playerFlash=.35;}}
export function stepBotObjective(dt,ctx){
 const attackers=attackerTeamForRound(state.round),planting=attackers!==state.player.team&&!state.core,defusing=attackers===state.player.team&&!!state.core?.planted;
 if(!planting&&!defusing){state.botObjective={id:null,progress:0};return null;}
 const team=planting?attackers:opposingTeam(attackers),target=planting?SITE:state.core;
 const agents=state.bots.filter(b=>b.alive&&b.team===team&&!(b.blind>0)).sort((a,b)=>Math.hypot(a.x-target.x,a.z-target.z)-Math.hypot(b.x-target.x,b.z-target.z));
 for(const bot of agents){if(chooseTarget(bot,state.bots,state.player,ctx.visible))continue;const d=Math.hypot(target.x-bot.x,target.z-bot.z);if(d>3.1){state.botObjective={id:null,progress:0};ctx.moveBot?.(bot,(target.x-bot.x)/d*dt*1.45,(target.z-bot.z)/d*dt*1.45);return bot.id;}
  if(state.botObjective.id!==bot.id)state.botObjective={id:bot.id,progress:0};state.botObjective.progress+=dt;
  if(state.botObjective.progress>=(planting?2.5:4)){if(planting)state.core={planted:true,x:SITE.x,z:SITE.z,timer:26};else finishRound(team,'core defused by operator');state.botObjective={id:null,progress:0};}
  return bot.id;
 }
 state.botObjective={id:null,progress:0};return null;
}

export function liveStep(dt,ctx){
 if(state.phase==='buy'){state.clock-=dt;if(state.clock<=0)beginRound();return;}
 if(state.phase==='result'){state.clock-=dt;if(state.clock<=0){state.round++;startBuy();}return;}
 if(state.phase!=='live')return;
 state.clock-=dt;state.recoil=Math.max(0,state.recoil-dt*2.4);
 if(state.core?.planted){state.core.timer-=dt;if(state.core.timer<=0){finishRound(attackerTeamForRound(state.round),'core detonated');return;}}
 if(state.clock<=0&&!state.core){const a=attackerTeamForRound(state.round);finishRound(a==='Rookline'?'Sumpguard':'Rookline','no plant / time held');return;}
 state.playerFlash=Math.max(0,state.playerFlash-dt);state.incomingHit=Math.max(0,state.incomingHit-dt);if(state.hitConfirmation){state.hitConfirmation.time-=dt;if(state.hitConfirmation.time<=0)state.hitConfirmation=null;}if(state.grenade){const g=state.grenade;g.timer-=dt;stepProjectile(g,dt,ctx.colliders||[]);if(g.timer<=0){detonateProjectile(g,ctx);state.grenade=null;}}
 for(const smoke of state.smokeZones)smoke.timer-=dt;state.smokeZones=state.smokeZones.filter(s=>s.timer>0);
 for(const fire of state.fireZones){fire.timer-=dt;fire.elapsed+=dt;while(fire.elapsed>=.5){fire.elapsed-=.5;for(const b of state.bots){if(b.alive&&b.team!==state.player.team&&Math.hypot(b.x-fire.x,b.z-fire.z)<=fire.radius&&ctx.visible(fire.x,fire.z,b.x,b.z)){b.hp-=12;if(b.hp<=0)eliminateBot(b,'MOLOTOV');}}}}state.fireZones=state.fireZones.filter(f=>f.timer>0);
 const p=state.player,forward=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0),side=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0),c=Math.cos(p.yaw),s=Math.sin(p.yaw);let ax=forward*-s+side*c,az=forward*-c-side*-s,n=Math.hypot(ax,az)||1;ax/=n;az/=n;p.crouch=keys.has('ControlLeft')||keys.has('KeyC');const max=p.crouch?3.1:6.4;p.vx+=(ax*max-p.vx)*Math.min(1,dt*9);p.vz+=(az*max-p.vz)*Math.min(1,dt*9);if(!forward&&!side){p.vx*=Math.max(0,1-dt*7);p.vz*=Math.max(0,1-dt*7);}ctx.move(p,p.vx*dt,p.vz*dt);
 const w=state.weapon;w.cooldown=Math.max(0,w.cooldown-dt);if(w.reloading>0){w.reloading-=dt;if(w.reloading<=0){const take=Math.min(w.mag-w.ammo,w.stock);w.ammo+=take;w.stock-=take;}}if(keys.has('KeyR')&&w.reloading<=0&&w.stock>0&&w.ammo<w.mag)w.reloading=w.reload;
 const siteDist=Math.hypot(p.x-SITE.x,p.z-SITE.z);
 if(state.planting>0){if(!keys.has('KeyE')||p.team!==attackerTeamForRound(state.round)||siteDist>=4||state.core){state.planting=0;}else if((state.planting=Math.max(0,state.planting-dt))===0)state.core={planted:true,x:SITE.x,z:SITE.z,timer:26};}
 if(state.defusing>0){if(!keys.has('KeyE')||p.team===attackerTeamForRound(state.round)||!state.core||Math.hypot(p.x-state.core.x,p.z-state.core.z)>=4)state.defusing=0;else if((state.defusing=Math.max(0,state.defusing-dt))===0)finishRound(p.team,'core defused');}
 for(const b of state.bots)b.blind=Math.max(0,(b.blind||0)-dt);
 const objectiveBot=stepBotObjective(dt,ctx);
 for(const b of state.bots){if(!b.alive||b.id===objectiveBot||b.blind>0)continue;b.fire-=dt;const target=chooseTarget(b,state.bots,p,ctx.visible);if(target){const dx=target.x-b.x,dz=target.z-b.z,dist=Math.hypot(dx,dz);b.alert=Math.min(1,b.alert+dt*2);if(dist>9)ctx.moveBot?.(b,dx/dist*dt*(b.role==='Runner'?1.8:1.05),dz/dist*dt*(b.role==='Runner'?1.8:1.05));if(b.fire<=0&&dist<30&&ctx.visible(b.x,b.z,target.x,target.z)){b.fire=.8+(b.id%4)*.13;b.shots++;if((b.id*7+b.shots*3+state.round)%10<Math.max(1,Math.floor((.42-dist*.008)*10))){if(target===p){const head=(b.id*7+b.shots*3+state.round)%20===0,damage=head?(arsenal.find(w=>w.kind===b.kind)?.head??34):(b.role==='Anchor'?12:8);receiveBotHit(damage,{head,kind:b.kind});if(state.health<=0)finishRound(opposingTeam(p.team),'operator lost');}else{target.hp-=10;if(target.hp<=0)target.alive=false;}}}}else{b.alert=Math.max(0,b.alert-dt*.25);const [tx,tz]=routes[b.route],dd=Math.hypot(tx-b.x,tz-b.z);if(dd<1.2)b.route=(b.route+1)%routes.length;else ctx.moveBot?.(b,(tx-b.x)/dd*dt*1.35,(tz-b.z)/dd*dt*1.35);}}
 resolveElimination();
}
