import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(fileURLToPath(new URL('./game',import.meta.url)));
const portArg=process.argv.indexOf('--port');const port=portArg<0?8080:Number(process.argv[portArg+1]);
const mime:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
createServer((req,res)=>{let path:string;try{path=decodeURIComponent(new URL(req.url??'/','http://127.0.0.1').pathname);}catch{res.writeHead(400).end('bad request');return;}if(path.endsWith('/'))path+='index.html';const file=resolve(join(root,normalize(path)));if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403).end('forbidden');return;}try{if(!statSync(file).isFile())throw new Error();}catch{res.writeHead(404).end('not found');return;}res.writeHead(200,{'content-type':mime[extname(file)]??'application/octet-stream','cache-control':'no-store'});createReadStream(file).pipe(res);}).listen(Number.isInteger(port)&&port>0&&port<65536?port:8080,'127.0.0.1',()=>console.log(`game/ on 127.0.0.1:${port}`));
