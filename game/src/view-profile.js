const MUZZLES={
 Pistol:{x:.39,y:-.31,z:-.99},
 SMG:{x:.35,y:-.29,z:-1.24},
 AR:{x:.34,y:-.29,z:-1.72},
 LMG:{x:.34,y:-.29,z:-1.88},
 Sniper:{x:.34,y:-.29,z:-2.08}
};
export function firstPersonViewProfile(kind,faction='Rookline'){
 if(!Object.hasOwn(MUZZLES,kind))return null;
 const team=faction==='Sumpguard'?'Sumpguard':'Rookline';
 return {kind,faction:team,key:kind==='AR'?(team==='Rookline'?'VANDAL-47':'SENTINEL-4'):`${team}-${kind}`,muzzle:{...MUZZLES[kind]}};
}
