import * as THREE from 'three';

const mat=(color,roughness=.82,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
export const palette={deep:mat('#102c30'),wall:mat('#294447'),slate:mat('#354c4c'),copper:mat('#9a6042',.55,.45),amber:mat('#ffb34f',.35,.2),water:mat('#123c46',.28,.3),white:mat('#d5ddd0'),red:mat('#e87959'),green:mat('#72c0a3')};
export const colliders=[];
const boxGeo=new THREE.BoxGeometry(1,1,1);
function box(scene,x,y,z,w,h,d,material,solid=true){const m=new THREE.Mesh(boxGeo,material);m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=h>1;m.receiveShadow=true;scene.add(m);if(solid)colliders.push({x,z,w,d,h});return m;}
function cylinder(scene,x,y,z,r,h,material,segments=16){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,segments),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;}
function label(scene,text,x,y,z,color='#ffbf62',size=.42){const c=document.createElement('canvas');c.width=512;c.height=128;const g=c.getContext('2d');g.fillStyle='#082326';g.fillRect(0,0,512,128);g.strokeStyle=color;g.lineWidth=5;g.strokeRect(5,5,502,118);g.font='bold 56px monospace';g.textAlign='center';g.textBaseline='middle';g.fillStyle=color;g.fillText(text,256,64);const t=new THREE.CanvasTexture(c);const m=new THREE.Mesh(new THREE.PlaneGeometry(size*4,size),new THREE.MeshBasicMaterial({map:t,transparent:true}));m.position.set(x,y,z);scene.add(m);return m;}
export function buildWorld(scene){
 scene.background=new THREE.Color('#09191e');scene.fog=new THREE.FogExp2('#10282d',.018);
 scene.add(new THREE.HemisphereLight('#a5c8c2','#162a28',1.45));const moon=new THREE.DirectionalLight('#b6d9d2',2.15);moon.position.set(-14,24,9);moon.castShadow=true;moon.shadow.mapSize.set(1024,1024);scene.add(moon);
 box(scene,0,-.55,0,66,1,54,palette.deep,false);
 // Outer sea channel and the long, readable lanes of an active desalination harbor.
 box(scene,0,-1.1,-30,78,1,14,palette.water,false);box(scene,0,-1.1,30,78,1,14,palette.water,false);
 for(let x=-30;x<=30;x+=10){box(scene,x,0,-19,8,.3,7,palette.slate,false);box(scene,x,0,19,8,.3,7,palette.slate,false);}
 // Perimeter and cross-lane cover create deliberate peeks, rotations and alternate routes.
 box(scene,-32,3,0,2,6,54,palette.wall);box(scene,32,3,0,2,6,54,palette.wall);box(scene,0,3,-26,66,6,2,palette.wall);box(scene,0,3,26,66,6,2,palette.wall);
 box(scene,-19,1.5,-7,2,3,13,palette.slate);box(scene,-19,1.5,9,2,3,9,palette.slate);box(scene,18,1.5,6,2,3,15,palette.slate);
 box(scene,-6,1.25,1,7,2.5,2,palette.copper);box(scene,5,1.15,-9,8,2.3,2,palette.slate);box(scene,8,1.1,12,7,2.2,2,palette.copper);
 // Desalination tanks, pipework and amber work lamps are original silhouettes.
 for(const [x,z,r,h] of [[-25,16,3,7],[-27,8,2.1,5],[25,-14,3.5,9],[24,-5,2.2,5],[2,20,2.8,6]]){cylinder(scene,x,h/2,z,r,h,palette.slate,24);cylinder(scene,x,h*.78,z,r*1.025,.28,palette.copper,24);cylinder(scene,x,h*.48,z,r*1.03,.16,palette.copper,24);}
 for(const [x,z] of [[-12,-20],[12,-19],[-12,20],[14,20],[0,0]]){box(scene,x,4,z,1.4,8,1.4,palette.copper);const l=new THREE.PointLight('#ffb254',12,15,2);l.position.set(x,7.4,z);scene.add(l);box(scene,x,7.4,z,.45,.18,.45,palette.amber,false);}
 for(let x=-27;x<=27;x+=9){box(scene,x,.15,-24,1.1,.3,.55,palette.amber,false);box(scene,x,.15,24,1.1,.3,.55,palette.amber,false);}
 // Site markers / beacon.
 cylinder(scene,12,.15,0,2.35,.3,palette.copper,32);cylinder(scene,12,.33,0,1.65,.08,palette.amber,32);label(scene,'CORE / B',12,4,0,'#ffc368',.5);label(scene,'BRINEWORKS',-2,5,-24,'#c0d8cf',.42);
 // Catwalk bridges and rails.
 box(scene,-2,3.6,-14,16,.45,2,palette.copper,false);box(scene,1,4.2,-14,.22,1.1,2,palette.copper,false);box(scene,-5,4.2,-14,.22,1.1,2,palette.copper,false);
 // Drain grates, floor markings.
 for(let x=-29;x<=29;x+=2){box(scene,x,.015,0,.08,.025,20,x%4?palette.copper:palette.amber,false);}
 return {site:{x:12,z:0}};
}
