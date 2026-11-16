import {UPPER,floorHeight} from './facility-layout.js';

// Pure production targeting math shared by the live shoot() path and tests.
export function selectShotTarget({origin,yaw,pitch=0,spread=0,range=Infinity,team,bots,visible=()=>true}){
 const sy=Math.sin(yaw),cy=Math.cos(yaw);let best=null,bestDistance=Infinity,bestHead=false;
 for(const bot of bots){const floor=bot.floor??UPPER;if(!bot.alive||bot.team===team)continue;
  const dx=bot.x-origin.x,dz=bot.z-origin.z,distance=Math.hypot(dx,dz);if(distance>range)continue;
  const forward=-sy*dx-cy*dz,lateral=Math.abs(cy*dx-sy*dz);if(forward<=0||lateral>=.55+distance*spread*1.3)continue;
  if(floor!==(origin.floor??UPPER)||!visible(origin.x,origin.z,bot.x,bot.z,origin.floor??UPPER,floor))continue;
  const baseY=Number.isFinite(bot.y)?bot.y:floorHeight(bot.x,bot.z,floor),aimY=origin.y+Math.tan(pitch)*forward,vertical=Math.abs(aimY-(baseY+1.35));
  if(vertical>=1.1||distance>=bestDistance)continue;
  best=bot;bestDistance=distance;bestHead=vertical<.34;
 }
 return best?{bot:best,distance:bestDistance,head:bestHead}:null;
}
