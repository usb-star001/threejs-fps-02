export const categories=['Pistol','SMG','AR','LMG','Sniper'];
export const arsenal=[
 {name:'KESTREL-12',kind:'Pistol',cost:0,damage:34,head:91,interval:.24,mag:15,reserve:75,reload:1.2,accuracy:92,spread:.0045,recoil:.24,range:43,color:'#e0bb77'},
 {name:'SILTSPRINT',kind:'SMG',cost:820,damage:22,head:60,interval:.075,mag:32,reserve:128,reload:1.65,accuracy:69,spread:.018,recoil:.72,range:39,color:'#70c3a3'},
 {name:'VANDAL-47',kind:'AR',cost:1420,damage:32,head:100,headHelmeted:100,interval:.105,mag:30,reserve:120,reload:1.7,accuracy:85,spread:.009,recoil:.48,range:58,color:'#e8a260',faction:'Rookline'},
 {name:'BREAKWALL',kind:'LMG',cost:1750,damage:27,head:74,interval:.09,mag:60,reserve:180,reload:2.8,accuracy:74,spread:.014,recoil:.86,range:52,color:'#a4ad91'},
 {name:'FOGPIERCE',kind:'Sniper',cost:2100,damage:76,head:178,interval:.78,mag:6,reserve:30,reload:2.2,accuracy:98,spread:.001,recoil:1.05,range:90,color:'#d28ba0'}
];
export const rifleVariants={Rookline:{name:'VANDAL-47',faction:'Rookline',damage:32,head:100,headHelmeted:100,color:'#d98258'},Sumpguard:{name:'SENTINEL-4',faction:'Sumpguard',damage:32,head:100,headHelmeted:90,color:'#62b8aa'}};
export const freshWeapon=(id=0,team='Rookline')=>{const base=arsenal[id],variant=id===2?rifleVariants[team]:null;return{...base,...variant,id,ammo:base.mag,stock:base.reserve,reloading:0,cooldown:0};};
export function weaponProfile(kind,team='Rookline'){const id=categories.indexOf(kind);if(id<0)return null;const base=arsenal[id];return {...base,...(id===2?rifleVariants[team]:null),id,faction:team};}
export function spreadForShot(w,{moving=false,crouched=false}={}){return Math.max(.0005,w.spread+(100-w.accuracy)*.00016+(moving?.027:0)+(crouched?-.003:0));}
export function recoilAngle(w,stack=0){return w.recoil*(.002+Math.min(2,stack)*.0025);}
