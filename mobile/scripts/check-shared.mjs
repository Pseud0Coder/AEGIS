import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {sharedFiles} from './shared-files.mjs';

const mobileDir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const targets=[path.resolve(mobileDir,'../web'),path.resolve(mobileDir,'../public/game')];
const drift=[];

for(const target of targets){
    try{await stat(target)}catch(error){if(error.code==='ENOENT')continue;throw error}
    for(const file of sharedFiles){
        const canonical=await readFile(path.join(mobileDir,'src',file));
        let copy;
        try{copy=await readFile(path.join(target,file))}catch(error){if(error.code==='ENOENT'){drift.push(`${path.relative(mobileDir,target)}/${file} (missing)`);continue}throw error}
        if(!canonical.equals(copy))drift.push(`${path.relative(mobileDir,target)}/${file}`);
    }
}
if(drift.length){
    console.error(`Shared runtime drift detected:\n${drift.map(file=>`- ${file}`).join('\n')}\nRun npm run sync:shared.`);
    process.exitCode=1;
}else console.log('Shared runtime copies match mobile/src.');