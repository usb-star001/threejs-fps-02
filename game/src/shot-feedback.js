// Pure, deterministic geometry/lifetime data for short-lived confirmed-hit feedback.
export function tracerState(start,end,elapsed,duration=.14){
 const t=Math.max(0,Math.min(1,elapsed/duration));
 return {start:{x:start.x,y:start.y,z:start.z},end:{x:end.x,y:end.y,z:end.z},opacity:1-t,alive:t<1};
}
