import {colliders} from './world.js';
import {lineClear} from './collision.js';
export function traceVisible(ax,az,bx,bz){return lineClear(ax,az,bx,bz,colliders);}
