import {colliders} from './world.js';
import {lineClear} from './collision.js';
export function traceVisible(ax,az,bx,bz,fromFloor,toFloor=fromFloor){return lineClear(ax,az,bx,bz,colliders,fromFloor,toFloor);}
