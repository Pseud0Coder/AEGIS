
const canvas=document.getElementById('game');const ctx=canvas.getContext('2d');let W,H;
function resize(){
    const rect=canvas.getBoundingClientRect();const dpr=Math.min(2,Math.max(1,window.devicePixelRatio||1));
    W=Math.max(1,rect.width);H=Math.max(1,rect.height);
    canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
}
window.resizeAegisGame=resize;
window.addEventListener('resize',resize);resize();
let audioCtx;
function initAudio(){if(!audioCtx){try{audioCtx=new(window.AudioContext||window.webkitAudioContext)()}catch(e){}}if(audioCtx&&audioCtx.state==='suspended')audioCtx.resume()}
function snd(freq,dur,type='sine',vol=0.1,pitchEnd=null){if(!audioCtx)return;const osc=audioCtx.createOscillator();const gain=audioCtx.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,audioCtx.currentTime);if(pitchEnd!==null)osc.frequency.exponentialRampToValueAtTime(Math.max(1,pitchEnd),audioCtx.currentTime+dur);gain.gain.setValueAtTime(vol,audioCtx.currentTime);gain.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+dur);osc.connect(gain);gain.connect(audioCtx.destination);osc.start();osc.stop(audioCtx.currentTime+dur)}
function sndKill(combo){const f=200+Math.min(combo,25)*20;snd(f,0.12,'square',0.06,f*0.4);snd(f*1.5,0.06,'sine',0.04)}
function sndHit(){snd(80,0.4,'sawtooth',0.15,30)}
function sndPwr(){snd(440,0.08,'sine',0.1,880);setTimeout(()=>snd(660,0.1,'sine',0.1,1320),60)}
function sndExplode(){snd(100,0.3,'sawtooth',0.12,40);snd(200,0.15,'square',0.08,60)}
function sndPulse(){snd(300,0.4,'sine',0.1,600);snd(150,0.5,'sine',0.08,50)}
function sndDeathWarning(){snd(440,0.15,'sawtooth',0.15,200);setTimeout(()=>snd(440,0.15,'sawtooth',0.15,200),200);setTimeout(()=>snd(440,0.15,'sawtooth',0.15,200),400)}
function sndDeathStart(){snd(60,1.0,'sawtooth',0.2,120);snd(120,0.8,'square',0.1,40)}
function sndDeathEnd(){snd(440,0.2,'sine',0.12,880);setTimeout(()=>snd(660,0.3,'sine',0.12,1320),150);setTimeout(()=>snd(880,0.4,'sine',0.12,1760),300)}
function sndThreshold(){snd(523,0.1,'sine',0.1,659);setTimeout(()=>snd(659,0.1,'sine',0.1,784),80);setTimeout(()=>snd(784,0.15,'sine',0.1,1047),160);setTimeout(()=>snd(1047,0.2,'sine',0.12,1568),240)}
function sndShield(){snd(200,0.1,'sine',0.08,400);setTimeout(()=>snd(400,0.1,'sine',0.08,600),60);setTimeout(()=>snd(600,0.15,'sine',0.08,800),120)}

let savedHighScore=0;try{savedHighScore=parseInt(localStorage.getItem('aegisHighScore')||'0')}catch(e){}

const game={
    state:'menu',score:0,highScore:savedHighScore,lives:3,combo:0,comboTimer:0,time:0,
    spawnTimer:1,powerupTimer:8,shake:0,flashAlpha:0,
    arms:1,maxArms:5,
    pulseLevel:0,pulseTimer:0,pulseCooldown:30,pulseActive:false,pulseRadius:0,
    pulseMaxRadius:[0,130,210,300],
    fieryTimer:0,magnetTimer:0,
    shields:0,maxShields:3,
    scoreDrain:0,
    deathLevel:{active:false,warning:0,timer:0,type:null,nextCheck:180,count:0,shielded:false,scoreLost:0},
    thresholdsHit:new Set(),
    thresholds:[
        {score:2000,type:'arm',text:'SECOND ARM',desc:'Dual blades engaged'},
        {score:5000,type:'pulse1',text:'PULSE SYSTEM',desc:'Auto-pulse every 30s'},
        {score:8000,type:'arm',text:'THIRD ARM',desc:'Triple blades online'},
        {score:14000,type:'pulse2',text:'PULSE UPGRADE',desc:'Pulse radius increased'},
        {score:20000,type:'arm',text:'FOURTH ARM',desc:'Quad blades online'},
        {score:28000,type:'pulse3',text:'PULSE MAX',desc:'Maximum pulse radius'},
        {score:35000,type:'arm',text:'FIFTH ARM',desc:'Pentagram defense'},
    ]
};

const player={x:0,y:0,vx:0,vy:0,radius:16,speed:290,energy:100,maxEnergy:100,energyRegen:38,invulnerable:0,pulseTime:0};
const blade={angle:0,baseSpeed:2.8,currentSpeed:2.8,boostMult:2.6,slowMult:0.12,length:115,width:7,hitFlash:0};
const armTrails=[[],[],[],[],[]];
const keys={};

window.addEventListener('keydown',e=>{
    if(game.state==='playing')keys[e.key.toLowerCase()]=true;
    if([' ','shift','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase()))e.preventDefault();
    initAudio();
});
window.addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false});

const enemies=[],particles=[],powerups=[],floatingTexts=[],stars=[],pulseRings=[];
for(let i=0;i<180;i++)stars.push({x:Math.random()*W,y:Math.random()*H,z:Math.random()*0.8+0.2,size:Math.random()*1.5+0.3});

const ENEMY_TYPES={
    walker:{r:13,sp:75,c:'#ff4488',hp:1,sc:10,sides:6},
    runner:{r:10,sp:165,c:'#ffaa44',hp:1,sc:15,sides:3},
    tank:{r:24,sp:42,c:'#aa44ff',hp:3,sc:35,sides:8},
    curver:{r:14,sp:85,c:'#44ffaa',hp:1,sc:20,sides:4},
    splitter:{r:19,sp:52,c:'#ffff44',hp:1,sc:25,sides:4},
    shielded:{r:16,sp:62,c:'#4488ff',hp:1,sc:30,sides:5},
    mini:{r:8,sp:110,c:'#ffff88',hp:1,sc:5,sides:6},
    explosive:{r:18,sp:58,c:'#ff6600',hp:1,sc:40,sides:5},
    magnet:{r:18,sp:55,c:'#cc44ff',hp:1,sc:35,sides:6}
};

class Enemy{
    constructor(type,x,y){
        const c=ENEMY_TYPES[type];this.type=type;this.radius=c.r;this.speed=c.sp;this.color=c.c;
        this.hp=c.hp;this.maxHp=c.hp;this.score=c.sc;this.sides=c.sides;
        if(x!==undefined){this.x=x;this.y=y}else{
            const edge=Math.floor(Math.random()*4);const m=50;
            if(edge===0){this.x=Math.random()*W;this.y=-m}
            else if(edge===1){this.x=W+m;this.y=Math.random()*H}
            else if(edge===2){this.x=Math.random()*W;this.y=H+m}
            else{this.x=-m;this.y=Math.random()*H}
        }
        const dx=player.x-this.x,dy=player.y-this.y;const d=Math.sqrt(dx*dx+dy*dy)||1;
        this.vx=(dx/d)*this.speed;this.vy=(dy/d)*this.speed;
        this.angle=Math.random()*Math.PI*2;this.rotSpeed=(Math.random()-0.5)*4;
        if(type==='shielded')this.shieldAngle=Math.atan2(-dy,-dx);
        this.hitFlash=0;this.hitCooldown=0;this.spawnTime=0;
    }
    update(dt,speedMod){
        this.spawnTime+=dt;
        if(this.type==='curver'){
            const dx=player.x-this.x,dy=player.y-this.y;const d=Math.sqrt(dx*dx+dy*dy)||1;
            this.vx+=((dx/d)*this.speed-this.vx)*dt*1.8;
            this.vy+=((dy/d)*this.speed-this.vy)*dt*1.8;
        }
        if(this.type==='shielded'){
            const dx=player.x-this.x,dy=player.y-this.y;const ta=Math.atan2(-dy,-dx);
            let diff=ta-this.shieldAngle;
            while(diff>Math.PI)diff-=Math.PI*2;while(diff<-Math.PI)diff+=Math.PI*2;
            this.shieldAngle+=diff*dt*1.8;
        }
        this.x+=this.vx*dt*speedMod;this.y+=this.vy*dt*speedMod;this.angle+=this.rotSpeed*dt;
        this.hitFlash=Math.max(0,this.hitFlash-dt*6);this.hitCooldown=Math.max(0,this.hitCooldown-dt);
    }
    draw(){
        ctx.save();ctx.translate(this.x,this.y);ctx.rotate(this.angle);
        ctx.globalAlpha=Math.min(1,this.spawnTime*2.5);
        ctx.shadowColor=this.color;ctx.shadowBlur=18;
        ctx.fillStyle=this.hitFlash>0.3?'#ffffff':this.color;
        ctx.strokeStyle=this.color;ctx.lineWidth=2;
        ctx.beginPath();
        for(let i=0;i<this.sides;i++){
            const a=(i/this.sides)*Math.PI*2;const px=Math.cos(a)*this.radius,py=Math.sin(a)*this.radius;
            if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
        }
        ctx.closePath();ctx.fill();ctx.stroke();
        if(this.type==='explosive'){
            ctx.fillStyle='#fff';ctx.font='bold 16px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
            ctx.rotate(-this.angle);ctx.fillText('!',0,0);
        }else if(this.type==='magnet'){
            ctx.fillStyle='#fff';ctx.font='bold 16px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
            ctx.rotate(-this.angle);ctx.fillText('U',0,0);
        }else if(this.maxHp>1){
            ctx.rotate(-this.angle);ctx.fillStyle='#fff';ctx.font='bold 13px monospace';
            ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(this.hp,0,0);
        }
        ctx.restore();
        if(this.type==='shielded'){
            ctx.save();ctx.translate(this.x,this.y);ctx.rotate(this.shieldAngle);
            ctx.shadowColor='#ffffff';ctx.shadowBlur=15;ctx.strokeStyle='#ffffff';ctx.lineWidth=5;
            ctx.beginPath();ctx.arc(0,0,this.radius+9,-1.0,1.0);ctx.stroke();ctx.restore();
        }
        ctx.globalAlpha=1;
    }
}

class Particle{
    constructor(x,y,vx,vy,color,size,life){this.x=x;this.y=y;this.vx=vx;this.vy=vy;this.color=color;this.size=size;this.life=life;this.maxLife=life}
    update(dt){this.x+=this.vx*dt;this.y+=this.vy*dt;this.vx*=0.94;this.vy*=0.94;this.life-=dt}
    draw(){const a=this.life/this.maxLife;ctx.globalAlpha=a;ctx.fillStyle=this.color;ctx.shadowColor=this.color;ctx.shadowBlur=12;ctx.beginPath();ctx.arc(this.x,this.y,this.size*a,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1}
}

class PowerUp{
    constructor(x,y,type){
        this.x=x;this.y=y;this.type=type;this.radius=15;this.life=14;this.angle=0;
        const colors={multiblade:'#00ffff',timeslow:'#aa88ff',energy:'#88ff88',frenzy:'#ff4488',shield:'#4488ff',fiery:'#ff6600',magnet:'#cc44ff'};
        const labels={multiblade:'T',timeslow:'T',energy:'E',frenzy:'F',shield:'S',fiery:'X',magnet:'M'};
        this.color=colors[type];this.label=labels[type];
    }
    update(dt){this.angle+=dt*2.5;this.life-=dt}
    draw(){
        const blink=this.life<3?(Math.sin(this.life*10)>0?1:0.3):1;
        ctx.save();ctx.translate(this.x,this.y);ctx.rotate(this.angle);
        ctx.globalAlpha=blink;ctx.shadowColor=this.color;ctx.shadowBlur=25;
        ctx.strokeStyle=this.color;ctx.fillStyle=this.color+'22';ctx.lineWidth=2;
        ctx.beginPath();
        for(let i=0;i<5;i++){
            const a=(i/5)*Math.PI*2-Math.PI/2;const px=Math.cos(a)*this.radius,py=Math.sin(a)*this.radius;
            if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
        }
        ctx.closePath();ctx.fill();ctx.stroke();
        ctx.rotate(-this.angle);ctx.fillStyle=this.color;ctx.font='bold 15px monospace';
        ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(this.label,0,0);
        ctx.restore();ctx.globalAlpha=1;
    }
}

function startGame(){
    initAudio();
    if(typeof clearGameInput==='function')clearGameInput();
    game.state='playing';game.score=0;game.lives=3;game.combo=0;game.comboTimer=0;game.time=0;
    game.spawnTimer=1;game.powerupTimer=8;game.shake=0;game.flashAlpha=0;
    game.arms=1;game.pulseLevel=0;game.pulseTimer=0;game.pulseActive=false;game.pulseRadius=0;
    game.fieryTimer=0;game.magnetTimer=0;game.shields=0;game.scoreDrain=0;
    timeslowTimer=0;frenzyTimer=0;
    game.deathLevel={active:false,warning:0,timer:0,type:null,nextCheck:180,count:0,shielded:false,scoreLost:0};
    game.thresholdsHit=new Set();
    player.x=W/2;player.y=H/2;player.vx=0;player.vy=0;player.energy=100;player.invulnerable=0;
    blade.angle=0;blade.currentSpeed=blade.baseSpeed;blade.hitFlash=0;
    for(let i=0;i<5;i++)armTrails[i]=[];
    enemies.length=0;particles.length=0;powerups.length=0;floatingTexts.length=0;pulseRings.length=0;
    document.getElementById('menuScreen').classList.add('hidden');
    document.getElementById('gameoverScreen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('powerupIndicators').classList.remove('hidden');
    document.getElementById('powerupIndicators').innerHTML='';
    document.getElementById('energyBar').classList.remove('hidden');
    document.getElementById('energyLabel').classList.remove('hidden');
    document.getElementById('pulseBar').classList.add('hidden');
    document.getElementById('deathWarningContainer').innerHTML='';
    document.getElementById('deathBannerContainer').innerHTML='';
    document.getElementById('thresholdContainer').innerHTML='';
    document.getElementById('pauseScreen').classList.add('hidden');
    document.getElementById('pauseBtn').classList.remove('hidden');
    if(window.syncTouchControls)window.syncTouchControls();
}

function gameOver(){
    game.state='gameover';
    if(typeof clearGameInput==='function')clearGameInput();
    if(window.syncTouchControls)window.syncTouchControls();
    const newRec=game.score>game.highScore;
    if(newRec){game.highScore=game.score;try{localStorage.setItem('aegisHighScore',Math.floor(game.score).toString())}catch(e){}}
    document.getElementById('finalScore').textContent=Math.floor(game.score);
    document.getElementById('highScoreDisplay').textContent=Math.floor(game.highScore);
    document.getElementById('dlSurvived').textContent=game.deathLevel.count;
    document.getElementById('newRecord').classList.toggle('hidden',!newRec);
    document.getElementById('gameoverScreen').classList.remove('hidden');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('powerupIndicators').classList.add('hidden');
    document.getElementById('powerupIndicators').innerHTML='';
    document.getElementById('deathWarningContainer').innerHTML='';
    document.getElementById('deathBannerContainer').innerHTML='';
    document.getElementById('thresholdContainer').innerHTML='';
    document.getElementById('energyBar').classList.add('hidden');
    document.getElementById('energyLabel').classList.add('hidden');
    document.getElementById('pulseBar').classList.add('hidden');
    document.getElementById('pauseScreen').classList.add('hidden');
    document.getElementById('pauseBtn').classList.add('hidden');
    snd(60,1.2,'sawtooth',0.2,25);
}

function spawnEnemy(){
    if(enemies.length>60)return;
    const t=game.time;const types=['walker'];
    if(t>8)types.push('walker','runner');
    if(t>20)types.push('curver');
    if(t>35)types.push('tank');
    if(t>50)types.push('splitter');
    if(t>65)types.push('shielded');
    if(t>40)types.push('explosive');
    if(t>55)types.push('magnet');
    if(t>80)types.push('runner','curver');
    if(t>100)types.push('tank','shielded','explosive');
    const type=types[Math.floor(Math.random()*types.length)];
    enemies.push(new Enemy(type));
}

function spawnPowerUp(){
    const r=Math.random();
    let type;
    if(r<0.06)type='shield';
    else if(r<0.18)type='fiery';
    else if(r<0.30)type='magnet';
    else if(r<0.50)type='energy';
    else if(r<0.70)type='timeslow';
    else type='frenzy';
    const m=120;
    powerups.push(new PowerUp(m+Math.random()*(W-m*2),m+Math.random()*(H-m*2),type));
}

function explode(x,y,color,count=15){
    count=Math.min(count,300-particles.length);
    for(let i=0;i<count;i++){
        const a=Math.random()*Math.PI*2;const s=Math.random()*220+50;
        particles.push(new Particle(x,y,Math.cos(a)*s,Math.sin(a)*s,color,Math.random()*4+2,Math.random()*0.7+0.3));
    }
}

function floatText(x,y,text,color,size=18){floatingTexts.push({x,y,text,color,size,life:1.2,maxLife:1.2,vy:-60})}

function applyPowerUp(type){
    sndPwr();
    if(type==='multiblade'){game.arms=Math.min(game.maxArms,game.arms+1);floatText(player.x,player.y-40,'+1 ARM','#00ffff');recalcArms()}
    else if(type==='timeslow'){timeslowTimer=5;floatText(player.x,player.y-40,'TIME SLOW','#aa88ff')}
    else if(type==='energy'){player.energy=player.maxEnergy;floatText(player.x,player.y-40,'ENERGY FULL','#88ff88')}
    else if(type==='frenzy'){frenzyTimer=8;floatText(player.x,player.y-40,'FRENZY','#ff4488')}
    else if(type==='shield'){if(game.shields<game.maxShields){game.shields++;sndShield();floatText(player.x,player.y-40,'SHIELD +1','#4488ff')}else{game.score+=500;floatText(player.x,player.y-40,'+500 BONUS','#4488ff')}}
    else if(type==='fiery'){game.fieryTimer=10;sndExplode();floatText(player.x,player.y-40,'FIERY BLADE','#ff6600')}
    else if(type==='magnet'){game.magnetTimer=6;floatText(player.x,player.y-40,'MAGNETIZE','#cc44ff')}
}

let timeslowTimer=0,frenzyTimer=0;

function recalcArms(){
    for(let i=0;i<5;i++)armTrails[i]=[];
}

function checkThresholds(){
    for(let th of game.thresholds){
        if(game.score>=th.score&&!game.thresholdsHit.has(th.score)){
            game.thresholdsHit.add(th.score);
            if(th.type==='arm'){game.arms=Math.min(game.maxArms,game.arms+1);recalcArms()}
            else if(th.type==='pulse1'){game.pulseLevel=1;document.getElementById('pulseBar').classList.remove('hidden')}
            else if(th.type==='pulse2')game.pulseLevel=2;
            else if(th.type==='pulse3')game.pulseLevel=3;
            sndThreshold();
            showThresholdAnnouncement(th.text,th.desc,th.type==='arm'?'#00ffff':'#aa88ff');
        }
    }
}

function showThresholdAnnouncement(title,desc,color){
    const c=document.getElementById('thresholdContainer');
    c.innerHTML=`<div class="threshold-announce"><div class="title" style="color:${color}">${title}</div><div class="desc">${desc}</div></div>`;
    setTimeout(()=>{c.innerHTML=''},2500);
}

// Death Level system
function triggerDeathLevelWarning(){
    const types=['inversion','overdrive','chaos'];
    game.deathLevel.type=types[Math.floor(Math.random()*types.length)];
    game.deathLevel.warning=3;
    game.deathLevel.shielded=game.shields>0;
    if(game.deathLevel.shielded){game.shields--;sndShield()}
    sndDeathWarning();
    const typeNames={inversion:'CONTROLS REVERSED',overdrive:'ENEMY OVERDRIVE',chaos:'SPAWN CHAOS'};
    const shieldText=game.deathLevel.shielded?'[ SHIELDED ]':typeNames[game.deathLevel.type];
    document.getElementById('deathWarningContainer').innerHTML=
        `<div class="death-warning"><div class="title">DEATH LEVEL</div><div class="subtype">${shieldText}</div><div class="countdown" id="deathCountdown">3</div></div>`;
}

function startDeathLevel(){
    game.deathLevel.active=true;game.deathLevel.timer=10;game.deathLevel.warning=0;game.deathLevel.count++;game.deathLevel.scoreLost=0;
    document.getElementById('deathWarningContainer').innerHTML='';
    sndDeathStart();game.shake=20;game.flashAlpha=0.5;
    const typeNames={inversion:'INVERSION',overdrive:'OVERDRIVE',chaos:'CHAOS'};
    const color=game.deathLevel.shielded?'#4488ff':'#ff0044';
    const label=game.deathLevel.shielded?'SHIELDED':typeNames[game.deathLevel.type];
    document.getElementById('deathBannerContainer').innerHTML=
        `<div class="death-active-banner" style="color:${color};border-color:${color}">${label}</div>`;
}

function endDeathLevel(){
    game.deathLevel.active=false;game.deathLevel.type=null;
    game.deathLevel.nextCheck=120+Math.random()*120;
    document.getElementById('deathBannerContainer').innerHTML='';
    sndDeathEnd();floatText(W/2,H/2,'SURVIVED','#00ffcc',32);
}

function checkDeathLevelTrigger(dt){
    const dl=game.deathLevel;
    if(dl.active||dl.warning>0)return;
    dl.nextCheck-=dt;
    if(dl.count===0&&game.score>=10000){triggerDeathLevelWarning();return}
    if(dl.nextCheck<=0){
        if(Math.random()<0.35)triggerDeathLevelWarning();
        dl.nextCheck=120;
    }
}

function updateDeathLevel(dt){
    const dl=game.deathLevel;
    if(dl.warning>0){
        dl.warning-=dt;
        const cd=Math.ceil(dl.warning);
        const el=document.getElementById('deathCountdown');
        if(el)el.textContent=cd;
        if(dl.warning<=0)startDeathLevel();
        return;
    }
    if(dl.active){
        dl.timer-=dt;
        if(!dl.shielded){
            const before=game.score;game.score=Math.max(0,game.score-20*dt);
            dl.scoreLost+=before-game.score;
        }
        if(dl.timer<=0)endDeathLevel();
    }
}

function distPointToSeg(px,py,x1,y1,x2,y2){
    const dx=x2-x1,dy=y2-y1;const len2=dx*dx+dy*dy;
    if(len2===0)return Math.sqrt((px-x1)**2+(py-y1)**2);
    let t=((px-x1)*dx+(py-y1)*dy)/len2;t=Math.max(0,Math.min(1,t));
    const cx=x1+t*dx,cy=y1+t*dy;return Math.sqrt((px-cx)**2+(py-cy)**2);
}

function getArmOffsets(){
    const count=game.arms;const offsets=[];
    for(let i=0;i<count;i++)offsets.push((i/count)*Math.PI*2);
    return offsets;
}

function getSpeedMult(){
    const extraArms=game.arms-1;
    return Math.max(0.3,1-0.12*extraArms);
}
function getBoostMult(){
    const extraArms=game.arms-1;
    return Math.max(1.2,blade.boostMult-0.2*extraArms);
}

// Chain explosion for fiery blade
function chainExplode(x,y,depth=0){
    if(depth>3)return;
    const radius=90;
    explode(x,y,'#ff6600',20);
    sndExplode();
    game.shake=Math.min(15,game.shake+3);
    for(let i=enemies.length-1;i>=0;i--){
        const e=enemies[i];
        if(e.x===x&&e.y===y)continue;
        const d=Math.sqrt((e.x-x)**2+(e.y-y)**2);
        if(d<radius){
            game.score+=e.score;
            floatText(e.x,e.y,'+'+e.score,'#ff6600',14);
            enemies.splice(i,1);
            if(e.type==='explosive'){chainExplode(e.x,e.y,depth+1)}
            else explode(e.x,e.y,e.color,10);
        }
    }
}

function hitEnemy(e,idx){
    e.hp--;e.hitFlash=1;e.hitCooldown=0.15;blade.hitFlash=0.15;
    for(let i=0;i<6;i++){
        const a=Math.random()*Math.PI*2;const s=Math.random()*250+80;
        particles.push(new Particle(e.x,e.y,Math.cos(a)*s,Math.sin(a)*s,'#ffffff',Math.random()*2.5+1,Math.random()*0.25+0.15));
    }
    if(e.hp<=0){
        game.combo++;game.comboTimer=2.5;
        const cm=1+Math.floor(game.combo/5)*0.4;
        const fm=frenzyTimer>0?2:1;
        const dp=Math.sqrt((e.x-player.x)**2+(e.y-player.y)**2);
        const nearMiss=dp<75&&dp>e.radius+player.radius;
        const points=Math.floor(e.score*cm*fm)+(nearMiss?10:0);
        game.score+=points;
        explode(e.x,e.y,e.color,18);
        floatText(e.x,e.y,'+'+points,nearMiss?'#ffff44':e.color);
        if(nearMiss)floatText(e.x,e.y-25,'NEAR MISS','#ffff44',14);
        sndKill(game.combo);
        game.shake=Math.min(12,game.shake+2.5);
        
        if(e.type==='splitter'){
            for(let i=0;i<2;i++){
                const a=Math.random()*Math.PI*2;const m=new Enemy('mini',e.x,e.y);
                m.vx=Math.cos(a)*m.speed;m.vy=Math.sin(a)*m.speed;enemies.push(m);
            }
        }
        if(e.type==='explosive'){
            game.fieryTimer=Math.max(game.fieryTimer,8);
            sndExplode();
            floatText(e.x,e.y-25,'FIERY!','#ff6600',16);
            chainExplode(e.x,e.y);
        }
        if(e.type==='magnet'){
            game.magnetTimer=Math.max(game.magnetTimer,5);
            floatText(e.x,e.y-25,'MAGNET!','#cc44ff',16);
        }
        if([10,25,50,75,100,150,200].includes(game.combo)){
            floatText(W/2,H/2-80,'COMBO x'+game.combo,'#ffaa44',28);
            game.shake=Math.max(game.shake,8);
            snd(440,0.3,'sine',0.15,880);
            if([25,50,100].includes(game.combo)&&frenzyTimer===0)applyPowerUp('frenzy');
        }
        enemies.splice(idx,1);
    }else{
        snd(550,0.05,'square',0.04);
    }
}

function checkShielded(e,x1,y1,x2,y2){
    if(e.type!=='shielded')return false;
    const dx=x2-x1,dy=y2-y1;const len2=dx*dx+dy*dy;
    if(len2===0)return false;
    let t=((e.x-x1)*dx+(e.y-y1)*dy)/len2;t=Math.max(0,Math.min(1,t));
    const cx=x1+t*dx,cy=y1+t*dy;const ab=Math.atan2(cy-e.y,cx-e.x);
    let diff=ab-e.shieldAngle;
    while(diff>Math.PI)diff-=Math.PI*2;while(diff<-Math.PI)diff+=Math.PI*2;
    return Math.abs(diff)<1.0;
}
