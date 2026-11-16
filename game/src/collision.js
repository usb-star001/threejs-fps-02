import {connectorSegment,floorHeight} from './facility-layout.js';
const applies=(obstacle,floor)=>floor===undefined||obstacle.floor===undefined||obstacle.floor==='both'||obstacle.floor===floor;
export function lineClear(ax,az,bx,bz,obstacles,fromFloor,toFloor=fromFloor){if(fromFloor!==undefined&&toFloor!==undefined&&fromFloor!==toFloor)return false;const dx=bx-ax,dz=bz-az,len2=dx*dx+dz*dz;for(const c of obstacles){if(!applies(c,fromFloor))continue;if(c.y!==undefined&&c.h!==undefined&&c.y-c.h/2>1.8)continue;if(c.r!==undefined){const t=len2?Math.max(0,Math.min(1,((c.x-ax)*dx+(c.z-az)*dz)/len2)):0;if(Math.hypot(ax+dx*t-c.x,az+dz*t-c.z)<c.r)return false;continue;}let t0=0,t1=1;for(const [p,q] of [[-dx,ax-(c.x-c.w/2)],[dx,(c.x+c.w/2)-ax],[-dz,az-(c.z-c.d/2)],[dz,(c.z+c.d/2)-az]]){if(Math.abs(p)<1e-9){if(q<0){t0=2;break;}}else{const t=q/p;if(p<0)t0=Math.max(t0,t);else t1=Math.min(t1,t);}}if(t0<=t1&&t0<=1&&t1>=0)return false;}return true;}
export function pointBlocked(x,z,obstacles,radius=.38,bounds=29,floor){if(Math.abs(x)>bounds||Math.abs(z)>23.5)return true;return obstacles.some(c=>{if(!applies(c,floor))return false;if(c.y!==undefined&&c.h!==undefined&&c.y-c.h/2>1.35)return false;return c.r!==undefined?Math.hypot(x-c.x,z-c.z)<c.r+radius:Math.abs(x-c.x)<c.w/2+radius&&Math.abs(z-c.z)<c.d/2+radius;});}
// Projectile collision shares the arena's box/cylinder collider descriptions but
// checks vertical overlap, so raised cover can be cleared by a low throw only
// when the projectile actually passes below it.
export function projectileBlocked(x,y,z,obstacles,radius=.2,floor){for(const c of obstacles){if(!applies(c,floor))continue;if(c.y!==undefined&&c.h!==undefined&&Math.abs(y-c.y)>c.h/2+radius)continue;if(c.r!==undefined){const dx=x-c.x,dz=z-c.z,reach=c.r+radius;if(dx*dx+dz*dz<reach*reach)return true;}else if(Math.abs(x-c.x)<c.w/2+radius&&Math.abs(z-c.z)<c.d/2+radius)return true;}return false;}
export function stepProjectile(g,dt,obstacles,step=1/60){
 g._stepRemainder=(g._stepRemainder||0)+dt;
 while(g._stepRemainder+1e-9>=step){
  g._stepRemainder-=step;
  const vx=g.vx,vy=g.vy,vz=g.vz,x0=g.x,y0=g.y,z0=g.z;
  const verticalTravel=Math.abs(vy*step)+4.9*step*step;
  const samples=Math.max(1,Math.ceil(Math.max(Math.abs(vx*step),Math.abs(vz*step),verticalTravel)/.08));
  let hitWall=false,hitFloor=false;
  for(let i=1;i<=samples;i++){
   const t=step*i/samples,nx=x0+vx*t,rawY=y0+vy*t-4.9*t*t,nz=z0+vz*t,segment=connectorSegment(nx,nz),sampleFloor=segment?.floor??g.floor,ground=floorHeight(nx,nz,sampleFloor)+.2;
   const floor=rawY<ground,ny=floor ? ground : rawY;
   if(projectileBlocked(nx,ny,nz,obstacles,.2,sampleFloor)){
    const hitX=projectileBlocked(nx,ny,g.z,obstacles,.2,sampleFloor),hitZ=projectileBlocked(g.x,ny,nz,obstacles,.2,sampleFloor);
    if(hitX)g.vx=-vx*.42;else g.x=nx;
    if(hitZ)g.vz=-vz*.42;else g.z=nz;
    if(!hitX&&!hitZ){g.vx=-vx*.42;g.vz=-vz*.42;}
    g.y=ny;g.floor=sampleFloor;hitWall=true;hitFloor=floor;break;
   }
   g.x=nx;g.y=ny;g.z=nz;g.floor=sampleFloor;
   if(floor){hitFloor=true;break;}
  }
  if(hitFloor){g.vy=Math.abs(vy-9.8*step)*.38;g.vx*=.72;g.vz*=.72;}
  else if(hitWall)g.vy=vy-9.8*step;
  else g.vy=vy-9.8*step;
 }
}
export function movePlayer(p,dx,dz,obstacles,bounds=29){for(const [mx,mz,axis] of [[dx,0,'x'],[0,dz,'z']]){const x=p.x+mx,z=p.z+mz,nextFloor=connectorSegment(x,z)?.floor??p.floor;if(!pointBlocked(x,z,obstacles,.38,bounds,nextFloor)){p.x=x;p.z=z;p.floor=nextFloor;}else if(axis==='x')p.vx=0;else p.vz=0;}p.y=floorHeight(p.x,p.z,p.floor);return p;}
export function moveBot(b,dx,dz,obstacles,bounds=29){const [x,z]=steerStep(b.x,b.z,dx,dz,obstacles,.38,b.id,bounds,b.floor);b.x=x;b.z=z;b.floor=connectorSegment(x,z)?.floor??b.floor;b.y=floorHeight(x,z,b.floor);return b;}
export function effectVisualY(floor,kind){return floorHeight(0,0,floor)+(kind==='fire'?.07:1.45);}
export function steerStep(x,z,dx,dz,obstacles,radius=.38,seed=0,bounds=29,floor){
 const tx=x+dx,tz=z+dz;if(!pointBlocked(tx,tz,obstacles,radius,bounds,floor))return [tx,tz];
 const len=Math.hypot(dx,dz);if(len<1e-8)return [x,z];const fx=dx/len,fz=dz/len,choices=[[fz,-fx],[-fz,fx],[fx*.7+fz*.7,fz*.7-fx*.7],[fx*.7-fz*.7,fz*.7+fx*.7]];let best=null,bestScore=Infinity;
 for(let i=0;i<choices.length;i++){const [vx,vz]=choices[i],cx=x+vx*len,cz=z+vz*len;if(pointBlocked(cx,cz,obstacles,radius,bounds,floor))continue;let clear=true;for(let k=1;k<=4;k++){const t=k/4;if(pointBlocked(x+(cx-x)*t,z+(cz-z)*t,obstacles,radius,bounds,floor)){clear=false;break;}}if(!clear)continue;const progress=(cx-x)*fx+(cz-z)*fz,d=Math.hypot(tx-cx,tz-cz),bias=((i+seed)%2)*.0001,score=d-progress*.3+bias;if(score<bestScore){best=[cx,cz];bestScore=score;}}
 return best||[x,z];
}
