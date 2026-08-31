const test=require('node:test');
const assert=require('node:assert/strict');
const rules=require('../src/game-rules.js');

test('high scores are finite nonnegative integers',()=>{
    assert.equal(rules.parseHighScore('42.9'),42);
    for(const value of [NaN,Infinity,-1,'-5','NaN','Infinity','',null,undefined,{},[]]){
        assert.equal(rules.parseHighScore(value),0);
    }
});

test('settings normalize to a complete versioned object',()=>{
    assert.deepEqual(rules.normalizeSettings('{"version":1,"soundEnabled":false,"reducedMotion":true}'),{version:1,soundEnabled:false,reducedMotion:true});
    assert.deepEqual(rules.normalizeSettings({version:1,soundEnabled:'no',reducedMotion:1}),rules.DEFAULT_SETTINGS);
    for(const value of ['{bad',null,[],{version:99},{soundEnabled:false}]){
        assert.deepEqual(rules.normalizeSettings(value),rules.DEFAULT_SETTINGS);
    }
});

test('enemy speed composes overdrive, time slow, and shielding',()=>{
    assert.equal(rules.enemySpeedMultiplier({overdrive:true}),2);
    assert.equal(rules.enemySpeedMultiplier({overdrive:true,timeSlow:true}),0.7);
    assert.equal(rules.enemySpeedMultiplier({overdrive:true,timeSlow:true,shielded:true}),0.35);
});

test('chaos spawn multiplier is blocked by a shield',()=>{
    assert.equal(rules.chaosSpawnMultiplier({chaos:true}),3);
    assert.equal(rules.chaosSpawnMultiplier({chaos:true,shielded:true}),1);
    assert.equal(rules.chaosSpawnMultiplier(),1);
});

test('death collision loss validates score and respects shielding',()=>{
    assert.equal(rules.deathCollisionScoreLoss(900,{active:true}),500);
    assert.equal(rules.deathCollisionScoreLoss(125.8,{active:true}),125.8);
    assert.equal(rules.deathCollisionScoreLoss(-20,{active:true}),0);
    assert.equal(rules.deathCollisionScoreLoss(Infinity,{active:true}),0);
    assert.equal(rules.deathCollisionScoreLoss(900,{active:true,shielded:true}),0);
    assert.equal(rules.deathCollisionScoreLoss(900,{active:false}),0);
});