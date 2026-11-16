import * as THREE from 'three';

function surface(color,kind='concrete'){
 const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');g.fillStyle=color;g.fillRect(0,0,256,256);let seed=73421;
 const rand=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 const stamp=(x,y,w,h,fill)=>{for(const ox of (x<3?[-256,0]:x+w>253?[0,-256]:[0]))for(const oy of (y<3?[-256,0]:y+h>253?[0,-256]:[0])){g.fillStyle=fill;g.fillRect(x+ox,y+oy,w,h);}};
 if(kind==='concrete'){for(let y=20;y<256;y+=40){g.fillStyle='rgba(24,34,34,.035)';g.fillRect(0,y,256,1);}for(let i=0;i<820;i++){const x=rand()*256,y=rand()*256,w=1+rand()*3,h=1+rand()*2;stamp(x,y,w,h,`rgba(225,226,210,${.025+rand()*.06})`);}g.strokeStyle='rgba(15,27,27,.2)';g.lineWidth=2;g.beginPath();g.moveTo(0,128);g.lineTo(256,128);g.moveTo(128,0);g.lineTo(128,128);g.stroke();}
 else if(kind==='hazard'){g.fillStyle='#d5a44c';g.fillRect(0,0,256,256);g.strokeStyle='rgba(31,43,39,.94)';g.lineWidth=13;for(let x=-256;x<=512;x+=32){g.beginPath();g.moveTo(x,0);g.lineTo(x+256,256);g.stroke();}}
 else{for(let i=0;i<42;i++){const y=rand()*256,h=1+rand()*2;stamp(0,y,256,h,`rgba(222,224,210,${.035+rand()*.06})`);}for(let i=0;i<34;i++){const x=rand()*256,y=rand()*256,w=1+rand()*2,h=4+rand()*9;stamp(x,y,w,h,'rgba(164,105,59,.16)');}}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return t;
}
const mats={concrete:new THREE.MeshStandardMaterial({map:surface('#687875','concrete'),color:'#d6dbd1',roughness:.94}),steel:new THREE.MeshStandardMaterial({map:surface('#354c4b','steel'),color:'#bdc9be',roughness:.66,metalness:.38}),worn:new THREE.MeshStandardMaterial({map:surface('#70533e','worn'),color:'#d0aa78',roughness:.7,metalness:.24}),hazard:new THREE.MeshStandardMaterial({map:surface('#d9a74d','hazard'),roughness:.84}),lamp:new THREE.MeshStandardMaterial({color:'#e6ab51',emissive:'#a55a1a',emissiveIntensity:.35,roughness:.35})};
const mat=(color,roughness=.82,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
export const palette={deep:mats.concrete,wall:mats.steel,slate:mats.steel,copper:mats.worn,worn:mats.worn,amber:mats.lamp,hazard:mats.hazard,water:mat('#245766',.28,.3),white:mat('#d5ddd0'),red:mat('#e87959'),green:mat('#72c0a3')};
export const colliders=[];
const boxGeo=new THREE.BoxGeometry(1,1,1);
function box(scene,x,y,z,w,h,d,material,solid=true){if(!material)throw new Error(`Missing world material at ${x},${y},${z}`);let own=material;if(material.map){own=material.clone();own.map=material.map.clone();own.map.repeat.set(Math.max(.4,w/3),Math.max(.4,d/3));}const m=new THREE.Mesh(boxGeo,own);m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=h>1;m.receiveShadow=true;scene.add(m);if(solid)colliders.push({x,y,z,w,d,h});return m;}
function cylinder(scene,x,y,z,r,h,material,segments=16,solid=true){if(!material)throw new Error(`Missing world material at ${x},${y},${z}`);const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,segments),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);if(solid)colliders.push({x,y,z,r,h});return m;}
function pipeZ(scene,x,y,z,r,length,material){if(!material)throw new Error(`Missing world material at ${x},${y},${z}`);const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,length,12),material);m.position.set(x,y,z);m.rotation.x=Math.PI/2;m.castShadow=true;m.receiveShadow=true;scene.add(m);colliders.push({x,y,z,w:r*2,d:length,h:r*2});return m;}
function label(scene,text,x,y,z,color='#ffbf62',size=.42){const c=document.createElement('canvas');c.width=512;c.height=128;const g=c.getContext('2d');g.fillStyle='#082326';g.fillRect(0,0,512,128);g.strokeStyle=color;g.lineWidth=5;g.strokeRect(5,5,502,118);g.font='bold 56px monospace';g.textAlign='center';g.textBaseline='middle';g.fillStyle=color;g.fillText(text,256,64);const t=new THREE.CanvasTexture(c);const m=new THREE.Mesh(new THREE.PlaneGeometry(size*4,size),new THREE.MeshBasicMaterial({map:t,transparent:true}));m.position.set(x,y,z);scene.add(m);return m;}
export function buildWorld(scene){
 scene.background=new THREE.Color('#19343a');scene.fog=new THREE.FogExp2('#29464a',.009);
 scene.add(new THREE.HemisphereLight('#d5e6da','#37413b',1.7));const moon=new THREE.DirectionalLight('#ffe0b0',2.6);moon.position.set(-14,24,9);moon.castShadow=true;moon.shadow.mapSize.set(1024,1024);scene.add(moon);
 box(scene,0,-.55,0,66,1,54,palette.deep,false);
 // Outer sea channel and the long, readable lanes of an active desalination harbor.
 box(scene,0,-1.1,-30,78,1,14,palette.water,false);box(scene,0,-1.1,30,78,1,14,palette.water,false);
 for(let x=-30;x<=30;x+=10){box(scene,x,0,-19,8,.3,7,palette.slate,false);box(scene,x,0,19,8,.3,7,palette.slate,false);}
 // Perimeter and cross-lane cover create deliberate peeks, rotations and alternate routes.
 box(scene,-32,3,0,2,6,54,palette.wall);box(scene,32,3,0,2,6,54,palette.wall);box(scene,0,3,-26,66,6,2,palette.wall);box(scene,0,3,26,66,6,2,palette.wall);
 box(scene,-19,1.5,-7,2,3,13,palette.slate);box(scene,-19,1.5,9,2,3,9,palette.slate);box(scene,18,1.5,6,2,3,15,palette.slate);
 box(scene,-6,1.25,1,7,2.5,2,palette.copper);box(scene,5,1.15,-9,8,2.3,2,palette.slate);box(scene,8,1.1,12,7,2.2,2,palette.copper);
 // Desalination tanks, pipework and amber work lamps are original silhouettes.
 for(const [x,z,r,h] of [[-25,16,3,7],[-27,8,2.1,5],[25,-14,3.5,9],[24,-5,2.2,5],[2,20,2.8,6]]){cylinder(scene,x,h/2,z,r,h,palette.slate,24);cylinder(scene,x,h*.78,z,r*1.025,.28,palette.copper,24);cylinder(scene,x,h*.48,z,r*1.03,.16,palette.copper,24);cylinder(scene,x,h*.56,z,r*1.034,.07,palette.hazard,24,false);}
 // Pipe galleries along the perimeter, with elbows, flanges and support shoes.
 for(const z of [-21,21]){box(scene,0,2.2,z,48,.32,.34,palette.worn,false);box(scene,0,2.55,z,48,.12,.5,palette.slate,false);for(let x=-22;x<=22;x+=5){box(scene,x,1.75,z,.18,1.1,.8,palette.slate);cylinder(scene,x,2.21,z,.31,.08,palette.copper,12,false);}}
 for(const x of [-29,29]){for(const y of [1.2,1.65,2.1])box(scene,x,y,0,.16,.12,48,palette.worn);for(let z=-20;z<=20;z+=5)box(scene,x,1.45,z,.16,1.25,.16,palette.slate);}
 // Service trunks and elbows use smaller cylinders; all are represented as circular collision volumes.
 for(const [x,y,z,r,h] of [[-14,1.2,-4,.24,12],[-14,1.2,8,.24,10],[15,1.25,-8,.28,12],[15,1.25,7,.28,13],[0,2.9,-12,.19,18]]){pipeZ(scene,x,y,z,r,h,palette.worn);for(const end of [-1,1])cylinder(scene,x,y,z+end*h/2,r*1.35,.14,palette.copper,12,false);cylinder(scene,x,y+.55,z+h/2-.35,r,.9,palette.worn,12,false);}
 // Elevated cable trays and compact service control stations.
 for(const z of [-16,16]){box(scene,0,3.3,z,38,.16,.75,palette.slate,false);for(let x=-18;x<=18;x+=3)box(scene,x,3.18,z,.1,.16,.68,palette.worn,false);}
 for(const [x,z] of [[-12,-20],[12,-19],[-12,20],[14,20],[0,0]]){box(scene,x,4,z,1.4,8,1.4,palette.copper);const l=new THREE.PointLight('#ffc676',7,12,2);l.position.set(x,7.4,z);scene.add(l);box(scene,x,7.4,z,.45,.18,.45,palette.amber,false);}
 for(let x=-27;x<=27;x+=9){box(scene,x,.15,-24,1.1,.3,.55,palette.hazard,false);box(scene,x,.15,24,1.1,.3,.55,palette.hazard,false);}
 // Side-wall maintenance panels with analog dials, toggles and restrained luminous indicators.
 for(const [x,z,side] of [[-19,-13,1],[-19,14,1],[19,-17,-1],[19,17,-1]]){box(scene,x,2.1,z,.25,1.55,1.35,palette.worn,false);const face=new THREE.Mesh(new THREE.PlaneGeometry(.95,1.05),new THREE.MeshStandardMaterial({color:'#19383a',roughness:.58,metalness:.18,emissive:'#071719'}));face.position.set(x+side*.14,2.12,z);face.rotation.y=side*Math.PI/2;scene.add(face);for(let q=0;q<3;q++){const dial=new THREE.Mesh(new THREE.CircleGeometry(.12,12),new THREE.MeshBasicMaterial({color:q===0?'#e1ac56':'#77b8a2'}));dial.position.set(x+side*.16,2.42-q*.28,z-.28+q*.28);dial.rotation.y=side*Math.PI/2;scene.add(dial);}}
 // Site markers / beacon.
 cylinder(scene,12,.15,0,2.35,.3,palette.copper,32);cylinder(scene,12,.33,0,1.65,.08,palette.amber,32,false);label(scene,'CORE / B',12,4,0,'#ffc368',.5);label(scene,'BRINEWORKS',-2,5,-24,'#c0d8cf',.42);
 // Catwalk bridges and rails.
 box(scene,-2,3.6,-14,16,.45,2,palette.copper,false);box(scene,1,4.2,-14,.22,1.1,2,palette.copper);box(scene,-5,4.2,-14,.22,1.1,2,palette.copper);
 // Gridded maintenance grates and three low, lane-side cover crates. Their exact footprints are collidable.
 for(const [x,z,w,d] of [[-12,0,3,4],[13,-11,3.5,3],[21,11,3,3]]){box(scene,x,.85,z,w,1.7,d,palette.slate);for(let y=0;y<4;y++)box(scene,x-w*.34+y*w*.22,1.74,z,d*.55,.045,.045,palette.worn,false);}
 for(const z of [-6,6]){box(scene,-3,.025,z,8,.04,.35,palette.hazard,false);for(let x=-6;x<=0;x+=1.2)box(scene,x,.05,z,.48,.045,.34,palette.deep,false);}
 // Drain grates, floor markings.
 for(let x=-29;x<=29;x+=2){box(scene,x,.015,0,.08,.025,20,x%4?palette.copper:palette.amber,false);}
 return {site:{x:12,z:0}};
}
