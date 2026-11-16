import * as THREE from 'three';
import {UPPER,LOWER,CONNECTORS,CONNECTOR_RAILS} from './facility-layout.js';
function surface(color,kind='concrete'){
 const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');g.fillStyle=color;g.fillRect(0,0,128,128);let seed=73421;const rand=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 for(let i=0;i<(kind==='hazard'?10:220);i++){const x=rand()*128,y=rand()*128;g.fillStyle=kind==='hazard'?(i%2?'#243433':'#d2a24c'):`rgba(220,225,210,${.025+rand()*.08})`;g.fillRect(x,y,kind==='hazard'?12:1+rand()*2,kind==='hazard'?128:1+rand()*2);}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return t;
}
const mats={concrete:new THREE.MeshStandardMaterial({map:surface('#596968'),color:'#d3d8cf',roughness:.94}),steel:new THREE.MeshStandardMaterial({map:surface('#40585a'),color:'#b9c5be',roughness:.66,metalness:.38}),worn:new THREE.MeshStandardMaterial({map:surface('#70533e'),color:'#c89e70',roughness:.7,metalness:.24}),hazard:new THREE.MeshStandardMaterial({map:surface('#d9a74d','hazard'),roughness:.84}),lamp:new THREE.MeshStandardMaterial({color:'#e6ab51',emissive:'#a55a1a',emissiveIntensity:.35,roughness:.35})};
const mat=(color,roughness=.82,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
export const palette={deep:mats.concrete,wall:mats.steel,slate:mats.steel,copper:mats.worn,worn:mats.worn,amber:mats.lamp,hazard:mats.hazard,water:mat('#245766',.28,.3),white:mat('#d5ddd0'),red:mat('#e87959'),green:mat('#72c0a3'),lower:mat('#35494d',.94),floorGlow:new THREE.MeshStandardMaterial({color:'#52757a',emissive:'#3994a3',emissiveIntensity:1.05,roughness:.5})};
export const colliders=[];const boxGeo=new THREE.BoxGeometry(1,1,1);
function box(scene,x,y,z,w,h,d,material,solid=true,floor=UPPER){const m=new THREE.Mesh(boxGeo,material);m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=h>1;m.receiveShadow=true;scene.add(m);if(solid)colliders.push({x,y,z,w,d,h,floor});return m;}
function cylinder(scene,x,y,z,r,h,material,segments=12,solid=true,floor=UPPER){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,segments),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);if(solid)colliders.push({x,y,z,r,h,floor});return m;}
function label(scene,text,x,y,z,color='#ffbf62',size=.42){const c=document.createElement('canvas');c.width=512;c.height=128;const g=c.getContext('2d');g.fillStyle='#082326';g.fillRect(0,0,512,128);g.strokeStyle=color;g.lineWidth=5;g.strokeRect(5,5,502,118);g.font='bold 56px monospace';g.textAlign='center';g.textBaseline='middle';g.fillStyle=color;g.fillText(text,256,64);const t=new THREE.CanvasTexture(c),m=new THREE.Mesh(new THREE.PlaneGeometry(size*4,size),new THREE.MeshBasicMaterial({map:t,transparent:true}));m.position.set(x,y,z);scene.add(m);return m;}
function ramp(scene,c,index){const upper=c.upper,lower=c.lower,midX=(upper.x+lower.x)/2,midZ=(upper.z+lower.z)/2;const angle=Math.atan2(6,c.length),r=new THREE.Mesh(new THREE.BoxGeometry(c.width,.28,c.rampLength||c.length),palette.slate);r.position.set(midX,-3,midZ);r.rotation.x=angle;r.receiveShadow=true;r.castShadow=true;scene.add(r);
}
export function buildWorld(scene){
 colliders.length=0;scene.background=new THREE.Color('#9b735c');scene.fog=new THREE.FogExp2('#71594c',.0065);
 scene.add(new THREE.HemisphereLight('#ffe0c2','#303b3c',1.02));const sun=new THREE.DirectionalLight('#ffd0a0',2.1);sun.position.set(-55,36,-48);sun.target.position.set(0,0,0);sun.castShadow=true;sun.shadow.mapSize.set(1536,1536);sun.shadow.camera.left=-34;sun.shadow.camera.right=34;sun.shadow.camera.top=30;sun.shadow.camera.bottom=-30;scene.add(sun,sun.target);
 // Restrained warm pools enter through the real west clerestory openings; these lights add no geometry or collision.
 for(const z of [-12,4,20]){const spot=new THREE.SpotLight('#ffd0a8',38,38,.48,.72,1.6);spot.position.set(-31,3.15,z);spot.target.position.set(-5,-.25,z);spot.castShadow=false;scene.add(spot,spot.target);}
 const siteAFill=new THREE.PointLight('#ffd0a8',24,20,1.5);siteAFill.position.set(-2,2.6,-13);scene.add(siteAFill);
 // Aboveground process hall: direct sunset enters the clerestory openings from the west/north.
 box(scene,0,-.35,0,58,.7,46,palette.deep,false,UPPER);box(scene,0,-6.35,0,58,.7,46,palette.lower,false,LOWER);
 for(const fl of [UPPER,LOWER]){const y=fl===UPPER?3:-3;box(scene,29,y,0,1,6,46,palette.wall,true,fl);box(scene,0,y,-23,58,6,1,palette.wall,true,fl);box(scene,0,y,23,58,6,1,palette.wall,true,fl);if(fl===LOWER)box(scene,-29,y,0,1,6,46,palette.wall,true,fl);}
 // Six real clerestory apertures: split the west upper wall into solid piers and leave each bay open.
 const bays=[-20,-12,-4,4,12,20],half=1.85;let cursor=-23;for(const z of bays){const left=z-half;if(left>cursor)box(scene,-29,3,(cursor+left)/2,1,6,left-cursor,palette.wall,true,UPPER);cursor=z+half;box(scene,-28.5,1.05,z,.9,.18,3.7,palette.copper,false,UPPER);box(scene,-28.5,4.95,z,.9,.18,3.7,palette.copper,false,UPPER);for(const side of [-1,1])box(scene,-28.5,3,z+side*half,.9,3.9,.16,palette.copper,false,UPPER);}if(cursor<23)box(scene,-29,3,(cursor+23)/2,1,6,23-cursor,palette.wall,true,UPPER);
 // Site A (upper) and Site B (sublevel) have mirrored, three-sided cover and clear plant pads.
 for(const [x,z,w,d] of [[-5,-13,1.1,7],[5,-13,1.1,7],[0,-18,8.9,1.1]])box(scene,x,1.1,z,w,2.2,d,palette.slate,true,UPPER);
 for(const [x,z,w,d] of [[-5,13,1.1,7],[5,13,1.1,7],[0,18,8.9,1.1]])box(scene,x,-5,z,w,2,d,palette.slate,true,LOWER);
 // Safe cover islands and machinery create crossfires without closing the mid rotations.
 for(const [x,z,w,d] of [[-16,2,4,3],[0,1,3,4],[16,-2,4,3]])box(scene,x,1,z,w,2,d,palette.copper,true,UPPER);
 for(const [x,z,w,d] of [[-16,-1,4,3],[0,-1,3,4],[16,1,4,3]])box(scene,x,-5,z,w,2,d,palette.copper,true,LOWER);
 // Two broad, symmetric ramps connect the floors. Their footprints are shared by traversal and nav.
 CONNECTORS.forEach((c,i)=>ramp(scene,c,i));CONNECTOR_RAILS.forEach(r=>box(scene,r.x,r.y,r.z,r.w,r.h,r.d,palette.copper,true,r.floor));
 // Floor-specific utility pipes run on the perimeter; hazard barrels are kept outside site pads and lanes.
 for(const fl of [UPPER,LOWER]){const y=fl===UPPER?2.25:-3.75;for(const z of [-19,19]){box(scene,0,y,z,43,.32,.34,palette.worn,false,fl);for(let x=-20;x<=20;x+=5)box(scene,x,y-.4,z,.18,.8,.6,palette.slate,true,fl);}
  for(const x of [-23,23])for(const z of [-16,16]){cylinder(scene,x,fl===UPPER?.55:-5.45,z,.65,1.1,palette.hazard,12,true,fl);cylinder(scene,x,fl===UPPER?1.12:-4.88,z,.67,.12,palette.copper,12,false,fl);}
  for(const x of [-20,-14,14,20])box(scene,x,fl===UPPER?.025:-5.975,0, .12,.045,3,palette.copper,false,fl);
 }
 // A-site beacon, B-site beacon, and conspicuous level identifiers.
 for(const [id,p] of [['A',{x:0,y:.2,z:-13,floor:UPPER}],['B',{x:0,y:-5.8,z:13,floor:LOWER}]]){cylinder(scene,p.x,p.y,p.z,2.1,.22,palette.copper,24,false,p.floor);cylinder(scene,p.x,p.y+.15,p.z,1.5,.08,palette.amber,24,false,p.floor);label(scene,`SITE ${id}`,p.x,p.y+3,p.z,'#ffc368',.48);}
 label(scene,'REACTOR LEVEL',-18,4,-21,'#d5ded2',.34);label(scene,'SERVICE LEVEL',-18,-2,-21,'#8fcbd0',.34);
 // Low mounted emissive fixtures and restrained cool point lights lift the lower floor.
 for(const [x,z] of [[-18,-15],[-18,0],[-18,15],[-8,9],[0,-4],[8,9],[18,-15],[18,0],[18,15]]){box(scene,x,-5.93,z,2.4,.08,.32,palette.floorGlow,false,LOWER);const siteFill=Math.abs(x)===8&&z===9,light=new THREE.PointLight('#83d3dc',siteFill?24:2.8,siteFill?18:8,siteFill?1.6:2);light.position.set(x,siteFill?-4.6:-4.95,z);scene.add(light);}
 return {sites:{A:{x:0,z:-13,floor:UPPER},B:{x:0,z:13,floor:LOWER}}};
}
