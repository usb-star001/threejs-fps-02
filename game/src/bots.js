// Named route graph keeps bot intent legible and reproducible across runs.
export const patrols=[[-9,-16],[3,-7],[14,-1],[3,8],[-12,12],[19,15],[23,-10],[-3,17]];
export function traceVisible(ax,az,bx,bz){const dx=bx-ax,dz=bz-az;for(let i=1;i<20;i++){const t=i/20,x=ax+dx*t,z=az+dz*t;if((x>-20&&x<-18&&z>-13&&z<13)||(x>17&&x<19&&z>-2&&z<14)||(x>-10&&x<-2&&z>-.2&&z<2.2)||(x>1&&x<9&&z>-10.2&&z<-7.8))return false;}return true;}
