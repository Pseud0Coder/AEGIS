(function(root,factory){
    const rules=factory();
    if(typeof module==='object'&&module.exports)module.exports=rules;
    else root.AegisRules=rules;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
    'use strict';
    const SETTINGS_VERSION=1;
    const DEFAULT_SETTINGS=Object.freeze({version:SETTINGS_VERSION,soundEnabled:true,reducedMotion:false});

    function parseHighScore(value){
        if(typeof value!=='number'&&typeof value!=='string')return 0;
        if(typeof value==='string'&&value.trim()==='')return 0;
        const number=typeof value==='number'?value:Number(value);
        return Number.isFinite(number)&&number>=0?Math.floor(number):0;
    }

    function normalizeSettings(value){
        let candidate=value;
        if(typeof candidate==='string'){
            try{candidate=JSON.parse(candidate)}catch(error){candidate=null}
        }
        if(!candidate||typeof candidate!=='object'||candidate.version!==SETTINGS_VERSION){
            return {...DEFAULT_SETTINGS};
        }
        return {
            version:SETTINGS_VERSION,
            soundEnabled:typeof candidate.soundEnabled==='boolean'?candidate.soundEnabled:DEFAULT_SETTINGS.soundEnabled,
            reducedMotion:typeof candidate.reducedMotion==='boolean'?candidate.reducedMotion:DEFAULT_SETTINGS.reducedMotion
        };
    }

    function enemySpeedMultiplier({overdrive=false,timeSlow=false,shielded=false}={}){
        let multiplier=overdrive&&!shielded?2:1;
        if(timeSlow)multiplier*=0.35;
        return multiplier;
    }

    function chaosSpawnMultiplier({chaos=false,shielded=false}={}){
        return chaos&&!shielded?3:1;
    }

    function deathCollisionScoreLoss(score,{active=false,shielded=false,maxLoss=500}={}){
        const safeScore=Number.isFinite(score)&&score>=0?score:0;
        const safeMax=Number.isFinite(maxLoss)&&maxLoss>=0?maxLoss:500;
        return active&&!shielded?Math.min(safeMax,safeScore):0;
    }

    return {SETTINGS_VERSION,DEFAULT_SETTINGS,parseHighScore,normalizeSettings,enemySpeedMultiplier,chaosSpawnMultiplier,deathCollisionScoreLoss};
});