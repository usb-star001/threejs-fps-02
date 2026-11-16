// Compact, mirrored navigation skeleton for both elevations of the decommissioned facility.
export const UPPER=0, LOWER=1;
export const SITES={A:{id:'A',floor:UPPER,x:0,z:-13},B:{id:'B',floor:LOWER,x:0,z:13}};
export const SPAWNS={Rookline:{floor:UPPER,x:-25,z:0},Sumpguard:{floor:UPPER,x:25,z:0}};
export const CONNECTORS=[
 {id:'west-stair',upper:{x:-8,z:2},lower:{x:-8,z:10},length:8,rampLength:10,width:4.2,railOffset:2,railWidth:.18,railHeight:1.2},
 {id:'east-stair',upper:{x:8,z:2},lower:{x:8,z:10},length:8,rampLength:10,width:4.2,railOffset:2,railWidth:.18,railHeight:1.2}
];
export const CONNECTOR_RAILS=CONNECTORS.flatMap(c=>{const dx=c.lower.x-c.upper.x,dz=c.lower.z-c.upper.z,len=Math.hypot(dx,dz),px=-dz/len,pz=dx/len,mx=(c.upper.x+c.lower.x)/2,mz=(c.upper.z+c.lower.z)/2;return [-1,1].map(side=>({connector:c.id,side,x:mx+px*side*c.railOffset,y:-3,z:mz+pz*side*c.railOffset,w:c.railWidth,h:c.railHeight,d:c.length,floor:'both'}));});
const N={
 tw:{floor:UPPER,x:-25,z:0},wu:{floor:UPPER,x:-16,z:0},wn:{floor:UPPER,x:-9,z:-9},aw:{floor:UPPER,x:-6,z:-13},a:{floor:UPPER,x:0,z:-13},ae:{floor:UPPER,x:6,z:-13},en:{floor:UPPER,x:9,z:-9},eu:{floor:UPPER,x:16,z:0},ce:{floor:UPPER,x:25,z:0},
 wc:{floor:UPPER,x:-8,z:2},ec:{floor:UPPER,x:8,z:2},
 wl:{floor:LOWER,x:-8,z:10},el:{floor:LOWER,x:8,z:10},bc:{floor:LOWER,x:0,z:13},bw:{floor:LOWER,x:-10,z:13},b:{floor:LOWER,x:0,z:13},be:{floor:LOWER,x:10,z:13}
};
export const NAV_NODES=N;
export const NAV_EDGES=[
 ['tw','wu'],['wu','wn'],['wn','aw'],['aw','a'],['a','ae'],['ae','en'],['en','eu'],['eu','ce'],
 ['wn','wc'],['wu','wc'],['wc','wl',8],['wl','bc'],['bc','b'],['bc','bw'],['bw','b'],['b','be'],['be','bc'],['bc','el'],['el','ec',8],['ec','en'],['eu','ec'],
 ['wu','wn'],['eu','en']
];
const adjacency=new Map(Object.keys(N).map(k=>[k,[]]));
for(const [a,b,cost] of NAV_EDGES){const A=N[a],B=N[b],d=cost??Math.hypot(A.x-B.x,A.z-B.z);adjacency.get(a).push([b,d]);adjacency.get(b).push([a,d]);}
export function shortestRoute(from,to){
 const dist=new Map([[from,0]]),prev=new Map(),open=new Set([from]);
 while(open.size){let at=null,best=Infinity;for(const id of open)if(dist.get(id)<best){at=id;best=dist.get(id);}open.delete(at);if(at===to)break;
  for(const [next,cost] of adjacency.get(at)||[]){const d=best+cost;if(d<(dist.get(next)??Infinity)){dist.set(next,d);prev.set(next,at);open.add(next);}}
 }
 if(!dist.has(to))return {distance:Infinity,nodes:[]};const nodes=[to];while(nodes[0]!==from)nodes.unshift(prev.get(nodes[0]));return {distance:dist.get(to),nodes};
}
export function connectorSegment(x,z,epsilon=1.52){
 for(const c of CONNECTORS){const a=c.upper,b=c.lower,dx=b.x-a.x,dz=b.z-a.z,l2=dx*dx+dz*dz,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/l2)),px=a.x+t*dx,pz=a.z+t*dz;
  if(Math.hypot(x-px,z-pz)<=epsilon)return {connector:c,t,height:-6*t,floor:t>=.5?LOWER:UPPER};
 }
 return null;
}
export function floorHeight(x,z,floor){return connectorSegment(x,z)?.height??(floor===LOWER?-6:0);}
