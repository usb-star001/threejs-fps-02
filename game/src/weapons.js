export const arsenal=[
 {name:'TIDEMARK 9',kind:'rifle',cost:0,damage:34,head:94,rate:.115,mag:24,reserve:96,reload:1.55,spread:.009,range:54,color:'#ffbd64'},
 {name:'SILT-45',kind:'pistol',cost:250,damage:42,head:112,rate:.27,mag:12,reserve:48,reload:1.25,spread:.006,range:42,color:'#d7e4d6'},
 {name:'BREAKWATER',kind:'carbine',cost:1450,damage:31,head:88,rate:.085,mag:30,reserve:120,reload:1.8,spread:.012,range:60,color:'#81c9ae'},
 {name:'FOG CUTTER',kind:'marksman',cost:2100,damage:62,head:155,rate:.72,mag:8,reserve:40,reload:2.05,spread:.002,range:82,color:'#e58b6a'}
];
export const freshWeapon=(id=0)=>({...arsenal[id],id,ammo:arsenal[id].mag,stock:arsenal[id].reserve,reloading:0,cooldown:0});
