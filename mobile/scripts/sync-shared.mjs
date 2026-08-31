import {copyFile,mkdir,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {sharedFiles} from './shared-files.mjs';

const mobileDir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const targets=[path.resolve(mobileDir,'../web'),path.resolve(mobileDir,'../public/game')];

for(const target of targets){
    try{await stat(target)}catch(error){if(error.code==='ENOENT')continue;throw error}
    await mkdir(target,{recursive:true});
    for(const file of sharedFiles)await copyFile(path.join(mobileDir,'src',file),path.join(target,file));
    console.log(`Synced shared runtime to ${path.relative(mobileDir,target)}`);
}